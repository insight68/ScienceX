import { describe, expect, test } from 'bun:test'
import { getCoordinatorSystemPrompt } from './coordinatorMode.js'

describe('coordinator identity', () => {
  test('identifies the coordinator as ScienceX', () => {
    const prompt = getCoordinatorSystemPrompt()

    expect(prompt).toStartWith('You are ScienceX')
    expect(prompt).not.toContain('You are ScienceX')
  })
})
