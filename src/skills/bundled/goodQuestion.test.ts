import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { parseFrontmatter } from '../../utils/frontmatterParser.js'
import {
  clearBundledSkills,
  getBundledSkillFiles,
  getBundledSkills,
} from '../bundledSkills.js'
import { registerGoodQuestionSkill } from './goodQuestion.js'
import { initBundledSkills } from './index.js'

describe('Good Question bundled skill', () => {
  beforeEach(() => {
    clearBundledSkills()
    registerGoodQuestionSkill()
  })

  afterEach(() => {
    clearBundledSkills()
  })

  it('registers a user-invocable skill with displayable upstream content', () => {
    expect(getBundledSkills()).toContainEqual(
      expect.objectContaining({
        name: 'good-question',
        source: 'bundled',
        loadedFrom: 'bundled',
        userInvocable: true,
      }),
    )

    const skillMarkdown = getBundledSkillFiles('good-question')?.['SKILL.md']
    expect(skillMarkdown).toBeDefined()

    const { frontmatter, content } = parseFrontmatter(skillMarkdown!)
    expect(frontmatter).toMatchObject({
      name: 'good-question',
      version: '0.2.0',
      metadata: {
        upstream: 'https://github.com/Rimagination/good-question',
        'upstream-tag': 'v0.2.0',
        license: 'MIT',
      },
    })
    expect(content).toContain('## Information sufficiency gate')
    expect(content).toContain('## 好问题卡')
  })

  it('is included in the default bundled skill initialization', () => {
    clearBundledSkills()
    initBundledSkills()

    expect(getBundledSkills()).toContainEqual(
      expect.objectContaining({ name: 'good-question' }),
    )
  })

  it('loads the workflow and preserves invocation arguments', async () => {
    const command = getBundledSkills().find(
      (candidate) => candidate.name === 'good-question',
    )
    if (!command || command.type !== 'prompt') {
      throw new Error('good-question prompt command was not registered')
    }

    const blocks = await command.getPromptForCommand(
      '帮我评审一个 AI4Science 研究方向',
      {} as never,
    )
    expect(blocks).toContainEqual(
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('## Information sufficiency gate'),
      }),
    )
    expect(blocks).toContainEqual(
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining(
          '## User Request\n\n帮我评审一个 AI4Science 研究方向',
        ),
      }),
    )
  })
})
