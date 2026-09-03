import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createHash } from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { parseFrontmatter } from '../../utils/frontmatterParser.js'
import { getBundledSkillsRoot, getClaudeTempDir } from '../../utils/permissions/filesystem.js'
import { clearBundledSkills, getBundledSkillFiles, getBundledSkills } from '../bundledSkills.js'
import { initBundledSkills } from './index.js'
import provenance from './tashan/UPSTREAM.json'
import { TASHAN_RESEARCH_SKILL_FILES } from './tashanResearchSkillContent.js'

const expectedNames = [
  'find-science-skills',
  'giiisp-paper-search-apis',
  'sci-employee-deep-research',
  'scispark',
  'experiment-design',
  'research-baseline-builder',
  'academic-writing',
  'scientific-humanization',
  'giiisp-scientific-image-generation',
  'visual-deck-builder',
  'manim-agent',
  'practical-course-producer',
  'thesis-audit-reviewer',
  'papercheck',
  'cognitive-profile',
  'world-threads-entry',
  'mcp-criticagent',
  'skill-criticagent',
]

describe('Tashan research bundled skills', () => {
  let originalMacro: unknown
  let originalTmp: string | undefined
  let temporaryRoot: string

  beforeEach(async () => {
    originalMacro = Reflect.get(globalThis, 'MACRO')
    Reflect.set(globalThis, 'MACRO', { VERSION: 'test' })
    originalTmp = process.env.CLAUDE_CODE_TMPDIR
    temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sciencex-tashan-test-'))
    process.env.CLAUDE_CODE_TMPDIR = temporaryRoot
    getClaudeTempDir.cache.clear?.()
    getBundledSkillsRoot.cache.clear?.()
    clearBundledSkills()
  })

  afterEach(async () => {
    clearBundledSkills()
    if (originalMacro === undefined) Reflect.deleteProperty(globalThis, 'MACRO')
    else Reflect.set(globalThis, 'MACRO', originalMacro)
    if (originalTmp === undefined) delete process.env.CLAUDE_CODE_TMPDIR
    else process.env.CLAUDE_CODE_TMPDIR = originalTmp
    getClaudeTempDir.cache.clear?.()
    getBundledSkillsRoot.cache.clear?.()
    await fs.rm(temporaryRoot, { recursive: true, force: true })
  })

  it('makes exactly the 18 requested workflows discoverable without granting tool permissions', () => {
    clearBundledSkills()
    initBundledSkills()
    const commands = getBundledSkills()

    for (const name of expectedNames) {
      const command = commands.find(candidate => candidate.name === name)
      expect(command).toMatchObject({
        type: 'prompt',
        source: 'bundled',
        loadedFrom: 'bundled',
        userInvocable: true,
        disableModelInvocation: false,
        allowedTools: [],
      })
      const files = getBundledSkillFiles(name)
      expect(files?.['SKILL.md']).toBeDefined()
      expect(files?.['LICENSE']).toContain('MIT License')
      const { frontmatter } = parseFrontmatter(files!['SKILL.md']!)
      expect(frontmatter.name).toBe(name)
      expect(typeof frontmatter.description).toBe('string')
      expect(frontmatter.description!.trim().length).toBeGreaterThan(0)
      expect(frontmatter.description!.length).toBeLessThanOrEqual(1024)
      expect(frontmatter.metadata).toMatchObject({
        upstream: 'https://github.com/TashanGKD/tashan-research-skills',
        'upstream-commit': '9a3001b329778e68faa045da2d8ec5abe90f2ae0',
      })
    }

    expect(commands.find(command => command.name === 'academic-writing')?.aliases)
      .toContain('marjorie-academic-writing')
    expect(commands.some(command => command.name === 'statistical-analysis')).toBe(false)
    expect(commands.some(command => command.name === 'research-dream')).toBe(false)
    expect(commands.some(command => command.name === 'scansci-pdf')).toBe(true)
    expect(commands.some(command => command.name === 'good-question')).toBe(true)
    for (const name of ['scansci-pdf', 'good-question']) {
      expect(parseFrontmatter(getBundledSkillFiles(name)!['SKILL.md']!).frontmatter.name).toBe(name)
    }
  })

  it('preserves the pinned resource manifest and omits out-of-scope deployment payloads', () => {
    expect(Object.keys(TASHAN_RESEARCH_SKILL_FILES).sort()).toEqual([...expectedNames].sort())
    for (const [file, recorded] of Object.entries(provenance.files)) {
      const separator = file.indexOf('/')
      const name = file.slice(0, separator)
      const relative = file.slice(separator + 1)
      const contents = TASHAN_RESEARCH_SKILL_FILES[name]![relative]!
      expect(createHash('sha256').update(contents).digest('hex')).toBe(recorded.bundledSha256)
    }
    expect(TASHAN_RESEARCH_SKILL_FILES.papercheck!['assets/paperchecker-rules/scripts/deploy_cite.sh']).toBeUndefined()
  })

  it('keeps one command per name when CLI and desktop initialization repeat', () => {
    initBundledSkills()
    const firstCommands = getBundledSkills()
    initBundledSkills()
    const repeatedCommands = getBundledSkills()
    expect(repeatedCommands).toHaveLength(firstCommands.length)
    for (const command of firstCommands) {
      expect(repeatedCommands.find(candidate => candidate.name === command.name)).toBe(command)
    }
    clearBundledSkills()
    initBundledSkills()
    expect(getBundledSkills().map(command => command.name)).toEqual(firstCommands.map(command => command.name))
  })

  it('extracts every workflow with its supporting files only when invoked', async () => {
    initBundledSkills()
    expect(await fs.readdir(temporaryRoot)).toEqual([])
    for (const name of expectedNames) {
      const command = getBundledSkills().find(candidate => candidate.name === name)
      if (!command || command.type !== 'prompt' || !command.skillRoot) throw new Error(`Missing ${name}`)
      const blocks = await command.getPromptForCommand('Review only; do not call external services.', {} as never)
      expect(blocks[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining(`Base directory for this skill: ${command.skillRoot}`),
      })
      for (const [relative, contents] of Object.entries(getBundledSkillFiles(name)!)) {
        expect(await fs.readFile(path.join(command.skillRoot, relative), 'utf8')).toBe(contents)
      }
    }
  })
})
