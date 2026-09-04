# Run the ScienceX CLI from Source

This page is for users who want to run the terminal version of ScienceX from source. If you only want the desktop research workbench, [download the desktop app](../download.md) instead. Local experiment analysis in the desktop app does not require model credentials.

By the end of this guide, you will be able to start the terminal interface from the repository and verify that your model configuration works.

## 1. Prepare the environment

- [Git](https://git-scm.com/downloads)
- [Bun](https://bun.sh/) 1.3.x; the repository currently pins `bun@1.3.12`

Install Bun:

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# macOS (Homebrew)
brew install bun

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

> On minimal Linux images, install `unzip` first if the Bun installer reports `unzip is required`, then run the installer again.

## 2. Get the source and install dependencies

```bash
git clone https://github.com/insight68/ScienceX.git
cd ScienceX
bun install
```

If you already have a checkout, enter its repository root before running `bun install`.

## 3. Configure a model provider

AI chat in the terminal app requires at least one valid model authentication method:

```bash
cp .env.example .env
# Edit .env and set either an API key or an auth token as required by your provider
```

Do not leave both placeholder credentials enabled. See [Configure a model provider](./env-vars.md) for variable definitions, precedence, and data-transmission boundaries.

## 4. Start and verify

### macOS / Linux

```bash
./bin/sciencex                          # Interactive terminal interface (TUI)
./bin/sciencex -p "your prompt here"    # One-shot mode without the interactive UI
./bin/sciencex --help                   # Show all options
```

### Windows

Start through Bun in PowerShell or cmd:

```powershell
bun --env-file=.env ./src/entrypoints/cli.tsx
```

Alternatively, run this in Git Bash:

```bash
./bin/sciencex
```

Run `--help` first to confirm that the CLI loads, then send a simple message to verify the model connection. If ordinary messages work but tool calls fail, check whether the selected model supports streaming and tool calling.

## 5. Run from any directory (optional)

To use another project directory as the current working directory, see [Run the CLI from any directory](./global-usage.md). Replace every example path with the absolute ScienceX path on your machine before updating PATH.

## 6. If the terminal interface does not render correctly

Use the basic command-line interface to isolate terminal compatibility problems:

```bash
CLAUDE_CODE_FORCE_RECOVERY_CLI=1 ./bin/sciencex
```

This mode helps diagnose terminal rendering. It does not fix model-endpoint or authentication errors; see [Installation and provider troubleshooting](./faq.md) for those problems.
