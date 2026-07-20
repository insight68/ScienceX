# Repository Instructions

This is the root routing guide for coding agents. Keep it concise and defer detailed workflow and quality policy to the linked documents below.

Rules closer to the code take precedence. Before editing `src/`, `desktop/`, `adapters/`, or `docs/`, read the nested `AGENTS.md` in that directory. Changes under `.github/`, root configuration, or `scripts/` follow this file and the deeper guides below.

## Start Here

- Run `git status --short`. Treat every existing change as user-owned; do not revert, restage, reformat, or overwrite unrelated work.
- Read the affected production path, its nearest tests, and the local implementation pattern. Inspect recent history when regression context matters.
- Define the smallest behavior change and the evidence that will prove it. For bugs, reproduce the failure or first add a regression test that fails for the intended reason; if neither is possible, state the limitation.
- Reuse existing utilities, stores, services, boundaries, and test harnesses. Stop and re-scope if the diff crosses an unplanned surface, adds a dependency, or outgrows the verified seam.
- For broad investigations, parallel read-only subagents are encouraged. Editing agents must have non-overlapping file ownership; the primary agent owns integration and final verification.
- Tool access is capability, not authorization. Do not create or switch branches, commit, push, open or merge a PR, publish a release, change repository settings, or spend live-provider quota unless the user explicitly requests that action.

## Repository Map

- `src/`: CLI, Ink UI, commands, services, tools, shared runtime utilities, and the local API/WebSocket server. Read `src/AGENTS.md`.
- `desktop/`: React UI, Electron host, native/sidecar resources, and desktop build scripts. Read `desktop/AGENTS.md`.
- `adapters/`: Telegram, Feishu, WeChat, DingTalk, and shared IM utilities. Read `adapters/AGENTS.md`.
- `docs/` and `docs/en/`: VitePress documentation. Read `docs/AGENTS.md` and keep existing Chinese/English counterparts aligned.
- `.github/workflows/`, `scripts/pr/`, and `scripts/quality-gate/`: CI routing and quality policy.
- `release-notes/`, `scripts/release.ts`, and `.github/workflows/release-desktop.yml`: desktop release automation.

## Implementation Rules

- Make narrow, owned diffs. Every changed line must trace to the request, a failing test, or a verified compatibility constraint.
- Executable production changes under `src/`, `desktop/src/`, or `adapters/` require a same-area regression test unless a maintainer explicitly approves an exception. Electron, sidecar, packaging, and build-script changes require focused native/package-smoke evidence selected by `check:impact`.
- Keep TypeScript ESM style: 2-space indentation, no semicolons, `PascalCase` components, and `camelCase` functions, hooks, and stores.
- Prefer structured parsers and existing boundaries over ad hoc string manipulation. Add comments only for non-obvious control flow or external constraints.
- Do not commit generated output such as `artifacts/`, coverage reports, `node_modules/`, build output, or Rust `target/` trees.
- When publishing is explicitly requested, use Conventional Commit subjects and product branch prefixes such as `fix/`, `feat/`, or `docs/`; do not create `codex/` branches in this repository.

## Verification

- Run the narrowest relevant test while iterating.
- Run `bun run check:impact`; every command it selects is part of the minimum handoff for the current diff.
- Run `bun run verify` only when full validation is requested or before claiming a change is PR-ready or push-ready.

Additional invariants:

- Required PR checks must be deterministic on an untrusted fork: no real models, public network, repository secrets, saved providers, or real user home/config. Use fake credentials, fixtures, mocked or loopback transports, temporary directories, and explicit cleanup.
- Provider/auth/proxy/runtime changes may select `bun run check:provider-contract`; desktop chat/WebSocket/session changes may select `bun run check:chat-contract`. These offline contracts supplement rather than replace their selected surface checks.
- Persisted JSON, `localStorage`, or app-config shape changes require a forward migration, unknown-field preservation, an old-fixture regression test, and `bun run check:persistence-upgrade`.
- User-visible desktop or cross-process behavior needs a real browser/desktop smoke path when unit tests cannot prove the workflow.
- Live-model checks are separate maintainer evidence. Run them only after deterministic checks pass and a maintainer explicitly authorizes quota use; finding credentials on the machine is not authorization.
- `bun run check:docs` runs `npm ci`; run it sequentially with checks that depend on root `node_modules`.

## User-State Safety

- Never read or mutate the developer's real `~/.claude`, keychain, tokens, transcripts, providers, or project settings in tests. Redirect every relevant path to a temporary directory.
- Treat `~/.claude/settings.json` as user-owned shared state: preserve unknown fields, merge additively, and never add a repository-owned global schema marker.
- Repair/Doctor flows may automatically change only explicitly allowlisted, regenerable desktop UI state; protected user data requires a reviewed, backup-first manual flow.

## Handoff

- Review `git diff --check`, `git diff`, and `git status --short` before reporting completion.
- Report changed files, tests added, commands actually run and their observed results, checks not run, blockers, and remaining risk.
- Distinguish `passed`, `failed`, `skipped`, `blocked`, and `not run`. A build is not E2E, a mock is not live-provider evidence, and evidence becomes stale after relevant edits.

## Deeper Guides

- Contributor workflow and quality lanes: `CONTRIBUTING.md` and `docs/guide/contributing.md`
- Package scripts and path routing: `package.json` and `scripts/pr/change-policy.ts`
- PR evidence contract: `.github/pull_request_template.md`
- Desktop release and auto-update runbook: `docs/desktop/10-release-auto-update.md`
