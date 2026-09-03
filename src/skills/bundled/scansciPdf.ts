import { parseFrontmatter } from '../../utils/frontmatterParser.js'
import { registerBundledSkill } from '../bundledSkills.js'
import { SCANSCI_PDF_SKILL_MD } from './scansciPdfContent.js'

const { frontmatter, content: skillBody } = parseFrontmatter(
  SCANSCI_PDF_SKILL_MD,
)

const description =
  typeof frontmatter.description === 'string'
    ? frontmatter.description
    : 'Search, organize, cite, and retrieve academic papers with ScanSci PDF.'

export function registerScanSciPdfSkill(): void {
  registerBundledSkill({
    name: 'scansci-pdf',
    description,
    skillMarkdown: SCANSCI_PDF_SKILL_MD,
    userInvocable: true,
    async getPromptForCommand(args) {
      const sections = [skillBody.trimStart()]
      if (args) {
        sections.push(`## User Request\n\n${args}`)
      }
      return [{ type: 'text', text: sections.join('\n\n') }]
    },
  })
}
