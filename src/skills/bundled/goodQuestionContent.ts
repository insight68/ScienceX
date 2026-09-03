// Adapted from Rimagination/good-question v0.2.0 (MIT).
// Markdown files are inlined at build time via Bun's text loader.

import skillMd from './good-question/SKILL.md' with { type: 'text' }

export const GOOD_QUESTION_SKILL_MD: string = skillMd
