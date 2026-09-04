# 配置模型提供商

桌面端用户通常可以在 **设置 → Providers** 中完成配置。本页主要供源码 CLI、自动化脚本和需要排查底层配置的用户使用。

只使用 Science 工作台的本地实验设计、数据质量分析或 4PL 教学案例时，不需要配置模型凭据。使用 AI 对话时，通常只需设置认证方式、服务端点和模型名称，其余变量可以保持默认。

> **远程模型的数据边界**：使用远程模型时，请求所需的提示词、上下文和工具结果会发送到 `ANTHROPIC_BASE_URL` 指向的服务。`DISABLE_TELEMETRY=1` 不会阻止这类必要的模型请求。请勿把未经授权的敏感数据发送给第三方服务。

## 变量说明

| 变量 | 是否必需 | 说明 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | 认证方式二选一 | 通过 `x-api-key` 请求头发送；是否使用取决于提供商 |
| `ANTHROPIC_AUTH_TOKEN` | 认证方式二选一 | 通过 `Authorization: Bearer` 请求头发送；是否使用取决于提供商 |
| `ANTHROPIC_BASE_URL` | 否 | 模型服务的基础地址；不设置时使用 Anthropic 官方端点 |
| `ANTHROPIC_MODEL` | 否 | 默认模型名称或提供商要求的模型 ID |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | 否 | Sonnet 角色使用的模型映射 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | 否 | Haiku 角色使用的模型映射 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | 否 | Opus 角色使用的模型映射 |
| `API_TIMEOUT_MS` | 否 | API 请求超时；默认 `600000` 毫秒（10 分钟） |
| `DISABLE_TELEMETRY` | 否 | 设为 `1`，禁用遥测 |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | 否 | 设为 `1`，禁用非必要网络请求 |
| `SCIENCEX_HOME` | 否 | ScienceX 用户数据根目录；默认 `~/.sciencex` |
| `CLAUDE_CONFIG_DIR` | 否 | 内嵌 Claude 兼容运行时目录；默认 `$SCIENCEX_HOME/claude` |

## 配置方式

### 方式一：项目 `.env` 文件

```bash
cp .env.example .env
```

编辑 `.env`。以下示例使用 [MiniMax 的 Anthropic 兼容端点](https://platform.minimax.io/docs/api-reference/text-anthropic-api)，仅用于说明字段；请以提供商当前文档中的端点和模型 ID 为准。

```bash
# 按提供商要求选择一种认证方式；不要同时保留两个占位值
ANTHROPIC_API_KEY=your_api_key_here
# ANTHROPIC_AUTH_TOKEN=your_api_key_here

# 模型服务端点
ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic

# 模型名称或 ID
ANTHROPIC_MODEL=MiniMax-M2.7
ANTHROPIC_DEFAULT_SONNET_MODEL=MiniMax-M2.7
ANTHROPIC_DEFAULT_HAIKU_MODEL=MiniMax-M2.7-highspeed
ANTHROPIC_DEFAULT_OPUS_MODEL=MiniMax-M2.7

# 可选：此示例延长为 50 分钟；删除该行可使用默认的 10 分钟
API_TIMEOUT_MS=3000000

# 禁用遥测和非必要网络请求
DISABLE_TELEMETRY=1
CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
```

### 方式二：内嵌运行时配置

编辑 `~/.sciencex/claude/settings.json`：

```json
{
  "env": {
    "ANTHROPIC_API_KEY": "your_api_key_here",
    "ANTHROPIC_BASE_URL": "https://api.minimax.io/anthropic",
    "ANTHROPIC_MODEL": "MiniMax-M2.7"
  }
}
```

> 配置优先级：进程环境变量 > 项目 `.env` 文件 > `~/.sciencex/claude/settings.json`。

不要提交包含真实凭据的 `.env` 或本地设置文件。完整目录结构和旧 `.claude` 迁移规则参见[配置与数据目录](./storage-layout.md)。其他模型的连接方式参见[接入第三方模型](./third-party-models.md)。
