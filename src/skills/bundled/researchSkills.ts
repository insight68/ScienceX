import { registerGoodQuestionSkill } from './goodQuestion.js'
import { registerScanSciPdfSkill } from './scansciPdf.js'
import { registerTashanResearchSkills } from './tashanResearchSkills.js'

// Shared by CLI and desktop startup without loading CLI-only commands or setup.
export function registerResearchSkills(): void {
  registerScanSciPdfSkill()
  registerGoodQuestionSkill()
  registerTashanResearchSkills()
}
