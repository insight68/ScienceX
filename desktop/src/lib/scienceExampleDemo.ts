import { scienceApi } from '../api/science'
import type { ScienceProject, ScienceExampleScenarioId } from '../types/science'

export async function runScienceExampleDemo(
  project: ScienceProject,
  locale: string,
  onScenario: (id: ScienceExampleScenarioId) => void,
) {
  if (!project.example || project.example.projectId !== project.id) throw new Error('Select a valid example project')
  for (const scenario of project.example.scenarios) {
    onScenario(scenario.id)
    const previousRuns = scenario.id === 'missing-well' ? await scienceApi.listRuns(project.id) : []
    try {
      const result = await scienceApi.createDoseResponseRun({
        projectId: project.id,
        experimentId: scenario.experimentId,
        wellColumn: 'well',
        signalColumn: 'signal',
      })
      if (scenario.id === 'missing-well') throw new Error('The missing-well demonstration unexpectedly completed')
      if (scenario.id === 'success' || scenario.id === 'version-change') {
        await scienceApi.replayRun(result.run.id)
      }
    } catch (error) {
      if (scenario.id !== 'missing-well') throw error
      const runs = await scienceApi.listRuns(project.id)
      const rejected = runs.find(run => run.experimentId === scenario.experimentId &&
        !previousRuns.some(previous => previous.id === run.id) && run.status === 'failed' &&
        run.errorMessage === 'Linked table is missing 1 assigned wells: A4')
      if (!rejected) throw error
    }
  }
  return scienceApi.exampleReport(project.id, locale)
}
