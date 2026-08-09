import { create } from 'zustand'

export type ProjectContextSource = 'research' | 'session'

export type ActiveProjectContext = {
  key: string
  projectId: string | null
  name: string
  rootDir: string
  source: ProjectContextSource
}

export type ProjectDraftMode = 'none' | 'project' | 'temporary'

type ProjectContextStore = {
  activeProject: ActiveProjectContext | null
  draftMode: ProjectDraftMode
  selectProject: (project: ActiveProjectContext) => void
  clearProject: () => void
  startTemporaryResearch: () => void
}

function cleanProjectPath(value: string | null | undefined): string {
  if (!value) return ''
  if (/^[A-Z]:[\\/]$/i.test(value)) return value
  return value.replace(/[\\/]+$/, '')
}

export function normalizeProjectPath(value: string | null | undefined): string {
  const normalized = cleanProjectPath(value).replace(/\\/g, '/')
  return /^[A-Z]:/i.test(normalized) ? normalized.toLowerCase() : normalized
}

export function projectNameFromPath(value: string | null | undefined): string {
  const normalized = normalizeProjectPath(value)
  return normalized.split('/').filter(Boolean).pop() || ''
}

export function isTemporaryWorkspacePath(value: string | null | undefined): boolean {
  const normalized = normalizeProjectPath(value)
  return normalized.includes('/temporary-workspaces/')
}

function sameProject(left: ActiveProjectContext | null, right: ActiveProjectContext): boolean {
  return left?.key === right.key &&
    left.projectId === right.projectId &&
    left.name === right.name &&
    normalizeProjectPath(left.rootDir) === normalizeProjectPath(right.rootDir) &&
    left.source === right.source
}

export const useProjectContextStore = create<ProjectContextStore>((set, get) => ({
  activeProject: null,
  draftMode: 'none',

  selectProject: project => {
    const rootDir = cleanProjectPath(project.rootDir)
    if (!rootDir) return
    const normalizedProject = { ...project, rootDir }
    if (sameProject(get().activeProject, normalizedProject) && get().draftMode === 'project') return
    set({ activeProject: normalizedProject, draftMode: 'project' })
  },

  clearProject: () => {
    if (!get().activeProject && get().draftMode === 'none') return
    set({ activeProject: null, draftMode: 'none' })
  },

  startTemporaryResearch: () => {
    if (!get().activeProject && get().draftMode === 'temporary') return
    set({ activeProject: null, draftMode: 'temporary' })
  },
}))
