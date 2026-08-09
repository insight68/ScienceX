import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_AGENT_PROMPT,
  computeSimpleEnvInfo,
  getSystemPrompt,
} from './prompts.js'

describe('ScienceX prompt identity', () => {
  test('uses the ScienceX identity in the simple system prompt and default agent prompt', async () => {
    const originalSimpleMode = process.env.CLAUDE_CODE_SIMPLE
    process.env.CLAUDE_CODE_SIMPLE = '1'

    try {
      const prompt = await getSystemPrompt([], 'test-model')
      const brandedPrompts = [prompt[0] ?? '', DEFAULT_AGENT_PROMPT]

      for (const brandedPrompt of brandedPrompts) {
        expect(brandedPrompt).toContain('ScienceX')
        expect(brandedPrompt).not.toContain("Anthropic's official CLI")
        expect(brandedPrompt).not.toContain('You are ScienceX')
      }
    } finally {
      if (originalSimpleMode === undefined) {
        delete process.env.CLAUDE_CODE_SIMPLE
      } else {
        process.env.CLAUDE_CODE_SIMPLE = originalSimpleMode
      }
    }
  })

  test('describes the ScienceX surfaces and fast mode in environment context', async () => {
    const envInfo = await computeSimpleEnvInfo('test-model')

    expect(envInfo).toContain(
      'ScienceX is available as a CLI and as a desktop app for macOS, Windows, and Linux.',
    )
    expect(envInfo).toContain('Fast mode for ScienceX')
    expect(envInfo).not.toContain('ScienceX is available')
    expect(envInfo).not.toContain('Fast mode for ScienceX')
  })
})
