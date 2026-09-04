# 从源码启动 ScienceX CLI

本页适合希望从源码运行终端版 ScienceX 的用户。只想使用桌面科研工作台时，建议直接[下载桌面版](../download.md)；桌面端的本地实验分析不需要模型凭据。

完成本页后，你将能够在仓库目录中启动终端交互界面，并验证模型配置是否生效。

## 1. 准备环境

- [Git](https://git-scm.com/downloads)
- [Bun](https://bun.sh/) 1.3.x；仓库当前固定使用 `bun@1.3.12`

安装 Bun：

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# macOS (Homebrew)
brew install bun

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

> 精简版 Linux 如提示 `unzip is required`，请先安装 `unzip`，再重新执行 Bun 安装命令。

## 2. 获取源码并安装依赖

```bash
git clone https://github.com/insight68/ScienceX.git
cd ScienceX
bun install
```

如果你已经有仓库副本，请先进入该仓库根目录，再运行 `bun install`。

## 3. 配置模型提供商

终端版的 AI 对话需要至少一种有效的模型认证方式：

```bash
cp .env.example .env
# 编辑 .env，按模型提供商要求填写 API Key 或 Auth Token
```

不要同时保留示例中的两个占位凭据。变量含义、配置优先级和数据发送边界请参见[配置模型提供商](./env-vars.md)。

## 4. 启动并验证

### macOS / Linux

```bash
./bin/sciencex                          # 终端交互界面（TUI）
./bin/sciencex -p "your prompt here"    # 单次命令模式，不进入交互界面
./bin/sciencex --help                   # 查看所有选项
```

### Windows

在 PowerShell 或 cmd 中直接通过 Bun 启动：

```powershell
bun --env-file=.env ./src/entrypoints/cli.tsx
```

也可以在 Git Bash 中运行：

```bash
./bin/sciencex
```

先运行 `--help` 确认 CLI 可以加载，再发送一条简单消息验证模型连接。若普通消息成功但工具调用失败，请继续检查模型是否支持流式输出和工具调用。

## 5. 在任意目录运行（可选）

需要让 ScienceX 以其他项目目录作为当前工作目录时，请参见[在任意目录运行 CLI](./global-usage.md)。配置 PATH 前，请把示例路径替换为你机器上的 ScienceX 绝对路径。

## 6. 终端界面无法正常显示

如果终端交互界面出现渲染异常，可以先用基础命令行界面排查：

```bash
CLAUDE_CODE_FORCE_RECOVERY_CLI=1 ./bin/sciencex
```

该模式用于定位终端兼容问题，不会修复模型端点或认证错误。相关错误请参见[安装与模型接入排障](./faq.md)。
