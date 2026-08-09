# GitHub CI / Policy Instructions

These rules apply to `.github/` changes in addition to the root instructions.

- `scripts/pr/change-policy.ts` is the source of truth for PR scope routing. The `scope-plan` job in `pr-quality.yml` runs it with `--plan-only` so blocked scopes still publish their selected-check outputs without preventing product routing.
- `pr-quality.yml` uses `pull_request` (not `pull_request_target`) and never references `secrets.` — required PR checks must be deterministic and secret-free.
- `pr-triage.yml` uses `pull_request_target` to post a comment only; it never checks out PR code, installs dependencies, or executes untrusted content.
- The required gate job is `pr-quality-gate`; it is the single required check for branch protection.
- Release workflows (`release-desktop.yml`, `build-desktop.yml`) are maintainer-owned and never run `bun run verify` or the PR-quality gate.
- CODEOWNERS keeps workflows, AGENTS.md files, scripts/pr/, scripts/quality-gate/, and cross-process boundaries (`conversationService`, `proxy`, `ws`, `openaiAuth`, `model`, `websocket`, `persistenceMigrations`) under maintainer review.
