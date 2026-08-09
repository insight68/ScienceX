import { afterEach, describe, expect, test } from 'bun:test'
import {
  setIsInteractive,
} from '../../bootstrap/state.js'
import {
  areExplorePlanAgentsEnabled,
  getBuiltInAgents,
} from './builtInAgents.js'

const originalDisableBuiltIns =
  process.env.CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS
const originalEntrypoint = process.env.CLAUDE_CODE_ENTRYPOINT

afterEach(() => {
  if (originalDisableBuiltIns === undefined) {
    delete process.env.CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS
  } else {
    process.env.CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS =
      originalDisableBuiltIns
  }

  if (originalEntrypoint === undefined) {
    delete process.env.CLAUDE_CODE_ENTRYPOINT
  } else {
    process.env.CLAUDE_CODE_ENTRYPOINT = originalEntrypoint
  }

  setIsInteractive(false)
})

describe('built-in agents', () => {
  test('enables public built-in agents in external builds', () => {
    setIsInteractive(true)

    expect(areExplorePlanAgentsEnabled()).toBe(true)

    const agentTypes = getBuiltInAgents().map(agent => agent.agentType)

    expect(agentTypes).toContain('Explore')
    expect(agentTypes).toContain('Plan')
    expect(agentTypes).toContain('verification')
  })

  test('identifies ScienceX built-in agents without an Anthropic CLI claim', () => {
    setIsInteractive(true)

    const brandedAgentTypes = new Set([
      'general-purpose',
      'statusline-setup',
      'Explore',
      'Plan',
    ])
    const agents = getBuiltInAgents().filter(agent =>
      brandedAgentTypes.has(agent.agentType),
    )

    expect(agents.map(agent => agent.agentType).sort()).toEqual(
      Array.from(brandedAgentTypes).sort(),
    )

    for (const agent of agents) {
      const prompt = agent.getSystemPrompt({
        toolUseContext: { options: {} as never },
      })
      expect(prompt).toContain('ScienceX')
      expect(prompt).not.toContain("Anthropic's official CLI")
      expect(prompt).not.toContain('You are ScienceX')
    }
  })

  test('preserves SDK opt-out in noninteractive sessions', () => {
    setIsInteractive(false)
    process.env.CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS = 'true'

    expect(getBuiltInAgents()).toEqual([])
  })
})
