# 在任意目录运行 ScienceX CLI

本页只适用于从源码运行的终端版。配置完成后，你可以在任意项目目录执行 `sciencex`，ScienceX 会把启动位置识别为当前工作目录。

> 启动前请确认自己位于预期的项目目录。ScienceX 获得授权后可能读取或修改该目录中的文件。

## macOS / Linux

在 `~/.bashrc` 或 `~/.zshrc` 中添加：

先把 `/absolute/path/to/ScienceX` 替换为本机仓库的真实绝对路径：

```bash
# 方式一：添加 PATH（推荐）
export PATH="/absolute/path/to/ScienceX/bin:$PATH"

# 方式二：alias
alias sciencex="/absolute/path/to/ScienceX/bin/sciencex"
```

然后重新加载配置：

```bash
source ~/.bashrc  # 或 source ~/.zshrc
```

## Windows (Git Bash)

在 `~/.bashrc` 中添加：

```bash
export PATH="/absolute/path/to/ScienceX/bin:$PATH"
```

同样需要先替换为 Git Bash 可以访问的真实仓库路径。

### 排查 Windows 与 WSL 工具链

如果 `sciencex` 运行在 Windows / Git Bash，但 Node、Python、uv、bun 等工具主要安装在 WSL 里，可以显式通过 WSL 调用：

```bash
wsl -e bash -lc 'node --version && python3 --version'
```

ScienceX 会在检测到 `wsl` / `wsl.exe` 调用时自动设置 `MSYS2_ARG_CONV_EXCL=*`，避免 Git Bash 把 `/home/...` 这类 WSL 路径错误转换成 `C:/Program Files/Git/home/...`。

如果你想让 Bash 工具默认进入 WSL，可以在启动前设置：

```bash
export CLAUDE_CODE_SHELL_PREFIX='wsl -e bash -lc'
```

桌面操作（Computer Use）仍然控制 Windows 应用；WSL 内的 CLI 工具不需要写入 `computer-use-config.json`。如果只使用 WSL 工具链、不需要桌面控制，建议使用 `--no-computer-use`，或在 **设置 → Computer Use** 中关闭该能力。

## 验证

配置完成后，进入任意项目目录测试：

```bash
cd ~/your-other-project
sciencex
# 启动后询问「当前目录是什么？」，应显示 ~/your-other-project
```

如果返回的目录不符合预期，请先退出，再进入正确的项目目录重新启动。不要在包含无关或敏感文件的上级目录中进行功能验证。
