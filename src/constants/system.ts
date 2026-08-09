// Critical system constants extracted to break circular dependencies

import { getFeatureValue_CACHED_MAY_BE_STALE } from '../services/analytics/growthbook.js'
import { logForDebugging } from '../utils/debug.js'
import { isEnvDefinedFalsy } from '../utils/envUtils.js'
import { getAPIProvider } from '../utils/model/providers.js'
import { getWorkload } from '../utils/workloadContext.js'
import { formatClaudeCodeBillingHeader } from './claudeCodeCompatibility.js'

export const SCIENCEX_IDENTITY_PROMPT = `You are ScienceX, an independent open-source AI agent and research workbench. ScienceX is your product identity, regardless of which model or provider powers this session. If asked who or what you are, answer that you are ScienceX. Do not identify yourself as Claude, ChatGPT, or an official product of a model provider. If specifically asked which model powers you, name the underlying model separately while making clear that you are still ScienceX.`

const DEFAULT_PREFIX = SCIENCEX_IDENTITY_PROMPT
const AGENT_SDK_CLAUDE_CODE_PRESET_PREFIX = `${SCIENCEX_IDENTITY_PROMPT} You are running within the Claude Agent SDK.`
const AGENT_SDK_PREFIX = `${SCIENCEX_IDENTITY_PROMPT} You are running as an agent within the Claude Agent SDK.`

const CLI_SYSPROMPT_PREFIX_VALUES = [
  DEFAULT_PREFIX,
  AGENT_SDK_CLAUDE_CODE_PRESET_PREFIX,
  AGENT_SDK_PREFIX,
] as const

export type CLISyspromptPrefix = (typeof CLI_SYSPROMPT_PREFIX_VALUES)[number]

/**
 * All possible CLI sysprompt prefix values, used by splitSysPromptPrefix
 * to identify prefix blocks by content rather than position.
 */
export const CLI_SYSPROMPT_PREFIXES: ReadonlySet<string> = new Set(
  CLI_SYSPROMPT_PREFIX_VALUES,
)

export function getCLISyspromptPrefix(options?: {
  isNonInteractive: boolean
  hasAppendSystemPrompt: boolean
}): CLISyspromptPrefix {
  const apiProvider = getAPIProvider()
  if (apiProvider === 'vertex') {
    return DEFAULT_PREFIX
  }

  if (options?.isNonInteractive) {
    if (options.hasAppendSystemPrompt) {
      return AGENT_SDK_CLAUDE_CODE_PRESET_PREFIX
    }
    return AGENT_SDK_PREFIX
  }
  return DEFAULT_PREFIX
}

/**
 * Check if attribution header is enabled.
 * Enabled by default, can be disabled via env var or GrowthBook killswitch.
 */
function isAttributionHeaderEnabled(): boolean {
  if (isEnvDefinedFalsy(process.env.CLAUDE_CODE_ATTRIBUTION_HEADER)) {
    return false
  }
  return getFeatureValue_CACHED_MAY_BE_STALE('tengu_attribution_header', true)
}

/**
 * Get attribution header for API requests.
 * Returns a header string with cc_version (including fingerprint) and cc_entrypoint.
 * Enabled by default, can be disabled via env var or GrowthBook killswitch.
 *
 * Includes a `cch=00000` placeholder. Before the request is sent,
 * signClaudeCodeCCHBody overwrites the zeros with a computed hash.
 * The server verifies this token to confirm the request came from a real
 * ScienceX client.
 */
export function getAttributionHeader(fingerprint: string): string {
  if (!isAttributionHeaderEnabled()) {
    return ''
  }

  const entrypoint = process.env.CLAUDE_CODE_ENTRYPOINT ?? 'unknown'

  // cc_workload: turn-scoped hint so the API can route e.g. cron-initiated
  // requests to a lower QoS pool. Absent = interactive default. Safe re:
  // fingerprint (computed from msg chars + version only) and cch signature
  // (placeholder overwritten in serialized body bytes after this string is
  // built). Server _parse_cc_header tolerates unknown extra fields so old API
  // deploys silently ignore this.
  const header = formatClaudeCodeBillingHeader({
    fingerprint,
    entrypoint,
    workload: getWorkload(),
  })

  logForDebugging(`attribution header ${header}`)
  return header
}
