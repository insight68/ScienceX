// Adapted from Rimagination/scansci-pdf v1.14.0 (Apache-2.0).
// Markdown files are inlined at build time via Bun's text loader.

import skillMd from './scansci-pdf/SKILL.md' with { type: 'text' }

export const SCANSCI_PDF_SKILL_MD: string = skillMd
