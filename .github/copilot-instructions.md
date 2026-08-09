# Copilot Instructions

Follow the root `AGENTS.md` and the nearest nested `AGENTS.md` for every change.

## Quality bar

- Add same-area tests with the production change. A bug fix needs a regression test; a feature needs behavior coverage.
- Preserve or improve the coverage ratchet. If `bun run check:impact` selects `coverage-checks`, the changed-line coverage threshold must not regress.
- Provider/auth/runtime-env/model-window/proxy changes require offline `bun run check:provider-contract` when selected.
- Chat transport, WebSocket lifecycle, or session changes require offline `bun run check:chat-contract` when selected.
- Desktop native, Electron packaging, or sidecar changes require `bun run check:native` when selected.
- E2E or agent-browser smoke is required when unit tests cannot prove a user-visible cross-process flow.
- Live smoke is trusted-maintainer evidence only and requires explicit authorization; finding credentials on the machine is not authorization.

## Reporting

When reporting completion, include changed files, tests added, commands actually run with pass/fail counts, checks not run, and remaining risk. Distinguish `passed`, `failed`, `skipped`, `blocked`, and `not run`.
