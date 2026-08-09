import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_AGENT_PROMPT,
  computeEnvInfo,
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
        expect(brandedPrompt).toContain(
          'If asked who or what you are, answer that you are ScienceX.',
        )
        expect(brandedPrompt).toContain('Do not identify yourself as Claude')
        expect(brandedPrompt).not.toContain("Anthropic's official CLI")
        expect(brandedPrompt).not.toContain('You are Claude Code')
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
    expect(envInfo).toContain(
      'This runtime model metadata does not change your ScienceX product identity.',
    )
    expect(envInfo).not.toContain('Claude Code is available')
    expect(envInfo).not.toContain('Fast mode for Claude Code')
  })

  test('keeps product identity separate from detailed runtime model metadata', async () => {
    const [knownModelEnv, customModelEnv] = await Promise.all([
      computeEnvInfo('claude-sonnet-4-6'),
      computeEnvInfo('test-model'),
    ])

    expect(knownModelEnv).toContain(
      'ScienceX is powered by the underlying model named Sonnet 4.6.',
    )
    expect(customModelEnv).toContain(
      'ScienceX is powered by the underlying model test-model.',
    )
    for (const envInfo of [knownModelEnv, customModelEnv]) {
      expect(envInfo).toContain(
        'This runtime model metadata does not change your ScienceX product identity.',
      )
      expect(envInfo).not.toContain('You are powered by the model')
    }
  })
})
