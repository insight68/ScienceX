import { parseFrontmatter } from '../../utils/frontmatterParser.js'
import { registerBundledSkill } from '../bundledSkills.js'
import { GOOD_QUESTION_SKILL_MD } from './goodQuestionContent.js'

const { frontmatter, content: skillBody } = parseFrontmatter(
  GOOD_QUESTION_SKILL_MD,
)

const description =
  typeof frontmatter.description === 'string'
    ? frontmatter.description
    : 'Turn rough research ideas into important, testable questions.'

export function registerGoodQuestionSkill(): void {
  registerBundledSkill({
    name: 'good-question',
    description,
    skillMarkdown: GOOD_QUESTION_SKILL_MD,
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
