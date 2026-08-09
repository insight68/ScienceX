import { describe, expect, test } from 'bun:test'
import {
  getAttributionHeader,
  getCLISyspromptPrefix,
} from './system.js'

describe('getAttributionHeader', () => {
  test('uses ScienceX compatibility version and always includes CCH placeholder', () => {
    const originalEntrypoint = process.env.CLAUDE_CODE_ENTRYPOINT
    process.env.CLAUDE_CODE_ENTRYPOINT = 'cli'

    try {
      expect(getAttributionHeader('abc')).toBe(
        'x-anthropic-billing-header: cc_version=2.1.92.abc; cc_entrypoint=cli; cch=00000;',
      )
    } finally {
      if (originalEntrypoint === undefined) delete process.env.CLAUDE_CODE_ENTRYPOINT
      else process.env.CLAUDE_CODE_ENTRYPOINT = originalEntrypoint
    }
  })
})

describe('getCLISyspromptPrefix', () => {
  test('identifies every ScienceX runtime mode without claiming to be an Anthropic CLI', () => {
    const providerVariables = [
      'CLAUDE_CODE_USE_BEDROCK',
      'CLAUDE_CODE_USE_VERTEX',
      'CLAUDE_CODE_USE_FOUNDRY',
      'CLAUDE_CODE_USE_AZURE_OPENAI',
    ] as const
    const originalValues = new Map(
      providerVariables.map(name => [name, process.env[name]]),
    )

    try {
      for (const name of providerVariables) delete process.env[name]

      const prefixes = [
        getCLISyspromptPrefix(),
        getCLISyspromptPrefix({
          isNonInteractive: true,
          hasAppendSystemPrompt: true,
        }),
        getCLISyspromptPrefix({
          isNonInteractive: true,
          hasAppendSystemPrompt: false,
        }),
      ]

      for (const prefix of prefixes) {
        expect(prefix).toContain('ScienceX')
        expect(prefix).toContain(
          'If asked who or what you are, answer that you are ScienceX.',
        )
        expect(prefix).toContain('Do not identify yourself as Claude')
        expect(prefix).not.toContain("Anthropic's official CLI")
        expect(prefix).not.toContain('You are Claude Code')
      }
    } finally {
      for (const [name, value] of originalValues) {
        if (value === undefined) delete process.env[name]
        else process.env[name] = value
      }
    }
  })
})
