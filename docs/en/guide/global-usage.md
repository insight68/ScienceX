# Global Usage (Run from Any Directory)


If you want to run `sciencex` directly from any project directory, set up one of the following. Once configured, `sciencex` will automatically recognize your current working directory.

## macOS / Linux

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Option 1: Add to PATH (recommended)
export PATH="$HOME/path/to/ScienceX/bin:$PATH"

# Option 2: Alias
alias sciencex="$HOME/path/to/ScienceX/bin/sciencex"
```

Then reload the config:

```bash
source ~/.bashrc  # or source ~/.zshrc
```

## Windows (Git Bash)

Add to `~/.bashrc`:

```bash
export PATH="$HOME/path/to/ScienceX/bin:$PATH"
```

### Windows + WSL Toolchains

If `sciencex` runs on Windows / Git Bash but tools such as Node, Python, uv, or bun are installed inside WSL, call them through WSL explicitly:

```bash
wsl -e bash -lc 'node --version && python3 --version'
```

When sciencex detects `wsl` / `wsl.exe`, it automatically sets `MSYS2_ARG_CONV_EXCL=*` so Git Bash does not rewrite WSL paths such as `/home/...` into `C:/Program Files/Git/home/...`.

To route Bash tool commands through WSL by default, set this before startup:

```bash
export CLAUDE_CODE_SHELL_PREFIX='wsl -e bash -lc'
```

Computer Use still controls Windows desktop apps. CLI tools running inside WSL do not need to be added to `computer-use-config.json`. If you only need the WSL toolchain and do not need desktop control, disable Computer Use with `--no-computer-use` or the Settings > Computer Use switch.

## Verify

After setup, navigate to any project directory and test:

```bash
cd ~/your-other-project
sciencex
# Ask "What is the current directory?" — it should show ~/your-other-project
```
