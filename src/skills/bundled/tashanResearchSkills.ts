import { stringify } from 'yaml'
import { parseFrontmatter } from '../../utils/frontmatterParser.js'
import { registerBundledSkill } from '../bundledSkills.js'
import integrationNotes from './tashan/SCIENCEX.md' with { type: 'text' }
import provenance from './tashan/UPSTREAM.json'
import { TASHAN_RESEARCH_SKILL_FILES } from './tashanResearchSkillContent.js'

const runtimeNotes: Record<string, string> = {
  'academic-writing': 'The current upstream entrypoint is academic-writing. ScienceX also accepts the screenshot name /marjorie-academic-writing as an alias; it is not a second installed skill.',
  'manim-agent': 'The Manim Agent repository and its Python/Manim/FFmpeg/provider runtime are separate prerequisites; only the workflow and environment-check helper are bundled here.',
  'mcp-criticagent': 'The full MCP-CriticAgent CLI (src.main / pyproject.toml) is not included in this skill directory. Ask for a reviewed runtime location before using its CLI; do not execute those commands in the current ScienceX repository.',
  'skill-criticagent': 'The deterministic grading kernel and scripts are bundled. The upstream uv run python -m src.main compliance command needs a separately available MCP-CriticAgent CLI; do not assume ScienceX provides that Python module.',
  'find-science-skills': 'Catalogs are pinned upstream snapshots, not live installation or safety attestations. Catalog maintenance/evaluation utilities unrelated to discovery are not bundled.',
}

export function registerTashanResearchSkills(): void {
  for (const name of provenance.skills) {
    const upstreamFiles = TASHAN_RESEARCH_SKILL_FILES[name]!
    const originalMarkdown = upstreamFiles['SKILL.md']!
    const { frontmatter, content } = parseFrontmatter(originalMarkdown)
    const description = String(frontmatter.description)
    const body = [integrationNotes.trim(), runtimeNotes[name], content.trim()]
      .filter(Boolean)
      .join('\n\n')
    const skillMarkdown = `---\n${stringify({
      ...frontmatter,
      name,
      version: '2026.08.06+9a3001b',
      metadata: {
        upstream: provenance.repository,
        'upstream-commit': provenance.commit,
        license: provenance.license,
      },
    })}---\n\n${body}\n`

    registerBundledSkill({
      name,
      description,
      aliases: name === 'academic-writing' ? ['marjorie-academic-writing'] : undefined,
      skillMarkdown,
      files: {
        ...upstreamFiles,
        'SKILL.md': skillMarkdown,
        'UPSTREAM-SKILL.md': originalMarkdown,
        'SCIENCEX.md': integrationNotes,
      },
      userInvocable: true,
      async getPromptForCommand(args) {
        const sections = [body]
        if (args) sections.push(`## User Request\n\n${args}`)
        return [{ type: 'text', text: sections.join('\n\n') }]
      },
    })
  }
}
