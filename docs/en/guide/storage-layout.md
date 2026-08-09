# Configuration and data directories

ScienceX stores application data under `~/.sciencex` by default. Project configuration lives in `.sciencex/` at the project root. Legacy `.claude/` paths are compatibility read sources and are no longer the default write targets.

## User-level layout

```text
~/.sciencex/
├── config/          # Providers, desktop settings, and IM adapter config
├── credentials/     # OAuth and other credentials
├── state/           # Window, terminal, scheduled-task, and session-map state
├── data/            # Indexes, traces, downloads, and the Science project registry
├── diagnostics/     # Diagnostic reports
├── runtime/         # Temporary runtime files
└── claude/          # Embedded Claude-compatible runtime
    ├── settings.json
    ├── skills/
    ├── agents/
    ├── projects/
    ├── teams/
    └── tasks/
```

The `claude/` subtree is the compatibility boundary for the embedded runtime. It keeps the expected Claude configuration shape without occupying `~/.claude` in the user's home directory.

## Project-level layout

```text
<project>/.sciencex/
├── settings.json
├── settings.local.json
├── scheduled_tasks.json
├── skills/
├── agents/
├── rules/
├── output-styles/
└── worktrees/
```

`settings.local.json`, `scheduled_tasks.json`, `worktrees/`, and SQLite temporary files should normally stay out of version control. Shared `settings.json`, skills, agents, and rules may be committed when appropriate.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `SCIENCEX_HOME` | Overrides the user-level ScienceX root; defaults to `~/.sciencex` |
| `CLAUDE_CONFIG_DIR` | Overrides only the embedded Claude-compatible runtime; legacy launchers remain supported |
| `SCIENCEX_LEGACY_CONFIG_DIR` | Selects the legacy source for one-time migration; normally unset |

Selecting a custom data directory in the desktop app is equivalent to setting `SCIENCEX_HOME`; the compatible runtime is placed in its `claude/` subtree automatically.

## Migrating from `.claude`

On first use of the new layout, ScienceX copies known legacy data with these safeguards:

1. A legacy entry is copied only when its new target is missing; existing `.sciencex` content always wins.
2. Copies use a temporary path and atomic rename, so a failure does not publish a partial target.
3. Symbolic links are not followed, and unknown credential files are not copied.
4. Existing `.claude` content is never deleted, renamed, or modified.
5. Project compatibility is per category: a `.claude` file or directory is read only when the corresponding `.sciencex` entry is absent, and subsequent writes go to `.sciencex`.

Run the new layout long enough to verify providers, sessions, skills, agents, and scheduled tasks before manually archiving the old directory. ScienceX never deletes it automatically.

