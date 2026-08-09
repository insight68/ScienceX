import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

type WorkflowJob = {
  env?: Record<string, string>
  needs?: string | string[]
  steps?: Array<{
    if?: string
    name?: string
    run?: string
    env?: Record<string, string>
  }>
}

function workflowJobs(workflow: string) {
  return (parse(workflow) as { jobs: Record<string, WorkflowJob> }).jobs
}

describe('PR quality workflow', () => {
  test('builds scope before routing independent quality jobs', () => {
    const workflow = readFileSync('.github/workflows/pr-quality.yml', 'utf8')

    expect(workflow).toContain('scope-plan:')
    expect(workflow).toContain('--plan-only')
    expect(workflow).toContain("if: needs.scope-plan.outputs.desktop_checks == 'true'")
    expect(workflow).toContain("if: needs.scope-plan.outputs.server_checks == 'true'")
    expect(workflow).toContain("if: needs.scope-plan.outputs.provider_contract_checks == 'true'")
    expect(workflow).toContain("if: needs.scope-plan.outputs.chat_contract_checks == 'true'")
    expect(workflow).toContain("if: needs.scope-plan.outputs.persistence_checks == 'true'")
    expect(workflow).toContain("if: needs.scope-plan.outputs.adapter_checks == 'true'")
    expect(workflow).toContain("if: needs.scope-plan.outputs.desktop_native_checks == 'true'")
    expect(workflow).toContain("if: needs.scope-plan.outputs.docs_checks == 'true'")
    expect(workflow).toContain("if: needs.scope-plan.outputs.coverage_checks == 'true'")
    expect(workflow).toContain('SCIENCEX_CI_BEFORE_SHA: ${{ github.event.before }}')
    expect(workflow).toContain('bun run scripts/pr/changed-files.ts --ci-output changed-files.txt')
    expect(workflow).not.toContain('git diff --name-only HEAD~1')
  })

  test('installs frozen dependencies before policy regressions without blocking product routing', () => {
    const workflow = readFileSync('.github/workflows/pr-quality.yml', 'utf8')
    const jobs = workflowJobs(workflow)
    const policySteps = jobs['policy-enforcement'].steps ?? []
    const installIndex = policySteps.findIndex((step) => step.name === 'Install root dependencies')
    const regressionIndex = policySteps.findIndex((step) => step.name === 'Run policy regression tests')

    expect(jobs['policy-enforcement'].needs).toBe('scope-plan')
    expect(installIndex).toBeGreaterThanOrEqual(0)
    expect(installIndex).toBeLessThan(regressionIndex)
    for (const jobId of [
      'desktop-checks',
      'server-checks',
      'provider-contract-checks',
      'chat-contract-checks',
      'adapter-checks',
      'desktop-native-checks',
      'persistence-checks',
      'docs-checks',
      'coverage-checks',
    ]) {
      expect(jobs[jobId].needs).toBe('scope-plan')
    }
    expect(workflow).toContain('bun-version: 1.3.12')
  })

  test('prepares the pinned ripgrep asset before native packaging checks', () => {
    const workflow = readFileSync('.github/workflows/pr-quality.yml', 'utf8')
    const steps = workflowJobs(workflow)['desktop-native-checks'].steps ?? []
    const prepareIndex = steps.findIndex(step => step.name === 'Prepare bundled ripgrep')
    const nativeCheckIndex = steps.findIndex(step => step.name === 'Run native checks')
    const prepareStep = steps[prepareIndex]

    expect(prepareIndex).toBeGreaterThanOrEqual(0)
    expect(prepareIndex).toBeLessThan(nativeCheckIndex)
    expect(prepareStep?.run).toContain('bun run prepare:ripgrep')
    expect(prepareStep?.env?.SIDECAR_TARGET_TRIPLE).toBe('aarch64-apple-darwin')
  })

  test('keeps docs checks isolated from native dependency install scripts', () => {
    const workflow = readFileSync('.github/workflows/pr-quality.yml', 'utf8')
    const deployWorkflow = readFileSync('.github/workflows/deploy-docs.yml', 'utf8')
    const docsSteps = workflowJobs(workflow)['docs-checks'].steps ?? []
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      packageManager?: string
      scripts?: Record<string, string>
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const docsPackageJson = JSON.parse(readFileSync('docs/package.json', 'utf8')) as {
      packageManager?: string
      devDependencies?: Record<string, string>
    }
    const docsLockfile = readFileSync('docs/bun.lock', 'utf8')

    expect(docsSteps.some(step => step.name === 'Install root dependencies')).toBe(false)
    expect(docsSteps.find(step => step.name === 'Run docs checks')?.run).toBe(
      'bun run check:docs',
    )
    expect(packageJson.scripts?.['docs:install']).toBe(
      'cd docs && bun install --frozen-lockfile --ignore-scripts',
    )
    expect(packageJson.scripts?.['check:docs']).toContain('bun run docs:install')
    expect(packageJson.scripts?.['check:docs']).not.toContain('npm')
    expect(packageJson.scripts?.['docs:build']).toBe('bun run check:docs')
    expect(docsPackageJson.packageManager).toBe('bun@1.3.12')
    expect(docsPackageJson.packageManager).toBe(packageJson.packageManager)
    expect(docsLockfile).toContain('"name": "sciencex-docs"')
    for (const dependency of [
      'medium-zoom',
      'mermaid',
      'vitepress',
      'vitepress-plugin-mermaid',
      'vue',
    ]) {
      expect(docsPackageJson.devDependencies?.[dependency]).toBeDefined()
      expect(packageJson.dependencies?.[dependency]).toBeUndefined()
      expect(packageJson.devDependencies?.[dependency]).toBeUndefined()
    }
    expect(deployWorkflow).toContain("- 'package.json'")
    expect(deployWorkflow).toContain('bun-version: 1.3.12')
    expect(deployWorkflow).toContain('run: bun run check:docs')
    expect(deployWorkflow).not.toContain('run: bun install --frozen-lockfile')
  })

  test('keeps coverage artifacts observable in CI', () => {
    const workflow = readFileSync('.github/workflows/pr-quality.yml', 'utf8')
    const coverageJob = workflowJobs(workflow)['coverage-checks']
    const coverageSteps = coverageJob.steps ?? []
    const gateStep = coverageSteps.find(step => step.name === 'Run coverage gate')
    const uploadStep = coverageSteps.find(step => step.name === 'Upload coverage artifacts')

    expect(coverageJob.env?.COVERAGE_BASE_REF).toContain("github.event_name == 'pull_request'")
    expect(coverageJob.env?.COVERAGE_BASE_REF).toContain("|| 'HEAD^'")
    expect(gateStep?.run).toContain('bun run check:coverage || coverage_status=$?')
    expect(gateStep?.run).toContain('cat "$latest_report"')
    expect(gateStep?.run).toContain('cat "$latest_report" >> "$GITHUB_STEP_SUMMARY"')
    expect(gateStep?.run).toContain('Coverage gate did not produce coverage-report.md')
    expect(gateStep?.run).toContain('exit "$coverage_status"')
    expect(uploadStep?.if).toBe('always()')
    expect(workflow).toContain('uses: actions/upload-artifact@v4')
    expect(workflow).toContain('path: artifacts/coverage/')
    expect(workflow).toContain('retention-days: 14')
  })

  test('keeps required PR checks deterministic and secret-free', () => {
    const workflow = readFileSync('.github/workflows/pr-quality.yml', 'utf8')

    expect(workflow).not.toContain('--allow-live')
    expect(workflow).not.toContain('QUALITY_GATE_PROVIDER_API_KEY')
    expect(workflow).not.toContain('secrets.')
    expect(workflow).not.toContain('pull_request_target')
    expect(workflow.match(/uses: actions\/checkout@v4/g)?.length).toBeGreaterThan(0)
    expect(workflow.match(/persist-credentials: false/g)?.length).toBe(
      workflow.match(/uses: actions\/checkout@v4/g)?.length,
    )
  })

  test('exposes a single required gate job for branch protection', () => {
    const workflow = readFileSync('.github/workflows/pr-quality.yml', 'utf8')

    expect(workflow).toContain('pr-quality-gate:')
    expect(workflow).toContain('name: pr-quality-gate')
    expect(workflow).toContain('if: always()')
    expect(workflow).toContain('require_success "scope-plan" "${{ needs.scope-plan.result }}"')
    expect(workflow).toContain('require_success "policy-enforcement" "${{ needs.policy-enforcement.result }}"')
    expect(workflow).toContain('require_selected "provider-contract-checks"')
    expect(workflow).toContain('require_selected "chat-contract-checks"')
    expect(workflow).toContain('require_selected "coverage-checks"')
  })
})
