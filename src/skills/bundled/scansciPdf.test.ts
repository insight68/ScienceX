import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { parseFrontmatter } from '../../utils/frontmatterParser.js'
import {
  clearBundledSkills,
  getBundledSkillFiles,
  getBundledSkills,
} from '../bundledSkills.js'
import { initBundledSkills } from './index.js'
import { registerScanSciPdfSkill } from './scansciPdf.js'

describe('ScanSci PDF bundled skill', () => {
  let originalMacro: unknown
  beforeEach(() => {
    originalMacro = Reflect.get(globalThis, 'MACRO')
    Reflect.set(globalThis, 'MACRO', { VERSION: 'test' })
    clearBundledSkills()
    registerScanSciPdfSkill()
  })

  afterEach(() => {
    clearBundledSkills()
    if (originalMacro === undefined) Reflect.deleteProperty(globalThis, 'MACRO')
    else Reflect.set(globalThis, 'MACRO', originalMacro)
  })

  it('registers a user-invocable skill with displayable upstream content', () => {
    expect(getBundledSkills()).toContainEqual(
      expect.objectContaining({
        name: 'scansci-pdf',
        source: 'bundled',
        loadedFrom: 'bundled',
        userInvocable: true,
      }),
    )

    const skillMarkdown = getBundledSkillFiles('scansci-pdf')?.['SKILL.md']
    expect(skillMarkdown).toBeDefined()

    const { frontmatter, content } = parseFrontmatter(skillMarkdown!)
    expect(frontmatter).toMatchObject({
      name: 'scansci-pdf',
      version: '1.14.0',
      metadata: {
        upstream: 'https://github.com/Rimagination/scansci-pdf',
        license: 'Apache-2.0',
      },
    })
    expect(content).toContain('use `legal_only`')
    expect(content).toContain('Do not assume the external ScanSci runtime')
  })

  it('is included in the default bundled skill initialization', () => {
    clearBundledSkills()
    initBundledSkills()

    expect(getBundledSkills()).toContainEqual(
      expect.objectContaining({ name: 'scansci-pdf' }),
    )
  })
})
