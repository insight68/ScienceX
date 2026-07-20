import { beforeEach, describe, expect, it } from 'vitest'
import {
  isTemporaryWorkspacePath,
  normalizeProjectPath,
  useProjectContextStore,
} from './projectContextStore'

describe('projectContextStore', () => {
  beforeEach(() => {
    useProjectContextStore.setState({ activeProject: null, draftMode: 'none' })
  })

  it('keeps one normalized project context for new research sessions', () => {
    useProjectContextStore.getState().selectProject({
      key: 'research-1',
      projectId: 'research-1',
      name: 'Protein folding',
      rootDir: '/workspace/protein-folding/',
      source: 'research',
    })

    expect(useProjectContextStore.getState()).toMatchObject({
      draftMode: 'project',
      activeProject: {
        name: 'Protein folding',
        rootDir: '/workspace/protein-folding',
      },
    })
  })

  it('makes temporary research explicit and clears the active project', () => {
    useProjectContextStore.getState().selectProject({
      key: '/workspace/project',
      projectId: null,
      name: 'Project',
      rootDir: '/workspace/project',
      source: 'session',
    })

    useProjectContextStore.getState().startTemporaryResearch()

    expect(useProjectContextStore.getState()).toMatchObject({
      activeProject: null,
      draftMode: 'temporary',
    })
  })

  it('normalizes cross-platform paths and identifies managed temporary workspaces', () => {
    expect(normalizeProjectPath('C:\\Research\\Trial\\')).toBe('c:/research/trial')
    expect(isTemporaryWorkspacePath('/config/temporary-workspaces/session-1')).toBe(true)
    expect(isTemporaryWorkspacePath('/workspace/session-1')).toBe(false)
  })

  it('preserves the original path casing used to launch a project', () => {
    useProjectContextStore.getState().selectProject({
      key: 'C:\\Research\\Trial',
      projectId: null,
      name: 'Trial',
      rootDir: 'C:\\Research\\Trial\\',
      source: 'session',
    })

    expect(useProjectContextStore.getState().activeProject?.rootDir).toBe('C:\\Research\\Trial')
  })
})
