# Run the ScienceX CLI from Any Directory

This page applies only to the terminal app running from source. After setup, you can invoke `sciencex` from any project directory, and ScienceX treats the launch location as the current working directory.

> Confirm that you are in the intended project directory before starting. Once authorized, ScienceX may read or modify files in that directory.

## macOS / Linux

Add to `~/.bashrc` or `~/.zshrc`:

Replace `/absolute/path/to/ScienceX` with the actual absolute path of your checkout first:

```bash
# Option 1: Add to PATH (recommended)
export PATH="/absolute/path/to/ScienceX/bin:$PATH"

# Option 2: Alias
alias sciencex="/absolute/path/to/ScienceX/bin/sciencex"
```

Then reload the config:

```bash
source ~/.bashrc  # or source ~/.zshrc
```

## Windows (Git Bash)

Add to `~/.bashrc`:

```bash
export PATH="/absolute/path/to/ScienceX/bin:$PATH"
```

Replace the placeholder with the actual checkout path that Git Bash can access.

### Troubleshoot Windows and WSL toolchains

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

If the reported directory is not the one you expected, exit, enter the correct project directory, and start again. Do not test from a parent directory that contains unrelated or sensitive files.
