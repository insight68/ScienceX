# 安装与模型接入排障

先根据症状判断问题属于哪一层：CLI 无法加载通常与本地依赖有关；能够启动但无法回复通常与认证、端点或模型 ID 有关；普通回复成功但工具失败通常属于模型能力或协议转换问题。

## 提示 `usage.input_tokens` 相关错误

```text
undefined is not an object (evaluating 'usage.input_tokens')
```

常见原因是 `ANTHROPIC_BASE_URL` 指向了错误路径，服务返回 HTML 或其他不符合 Anthropic Messages API 的内容。

Anthropic SDK 会在基础地址后追加 `/v1/messages`。例如：

- MiniMax：`ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic`
- OpenRouter：`ANTHROPIC_BASE_URL=https://openrouter.ai/api`
- OpenRouter 错误示例：`ANTHROPIC_BASE_URL=https://openrouter.ai/api/v1`，可能形成重复的 `/v1`

先核对提供商当前文档，再检查响应是否为结构化 JSON。不要仅通过延长 `API_TIMEOUT_MS` 掩盖端点错误。更多配置参见[接入第三方模型](./third-party-models.md)。

## 提示 `Cannot find package 'bundle'`

```text
error: Cannot find package 'bundle' from '.../ScienceX/src/entrypoints/cli.tsx'
```

这通常表示 Bun 版本不符合仓库要求。当前仓库在 `packageManager` 中固定为 `bun@1.3.12`，支持口径为 Bun 1.3.x。

```bash
bun --version
```

安装或切换到仓库声明的版本后，回到仓库根目录重新运行 `bun install`。不要只写“升级到最新版”，因为最新版可能超出当前验证范围。

## 如何接入 OpenAI、DeepSeek 或 Ollama

ScienceX 发出 Anthropic Messages API 请求：

- 提供商直接支持 `/v1/messages` 时，可以直连。
- 提供商只支持 OpenAI 兼容接口时，需要通过 LiteLLM 等代理执行 **Anthropic → OpenAI** 协议转换。
- 本机 Ollama 通常也需要一个向 ScienceX 暴露 Anthropic 兼容接口的本地代理。

完整步骤参见[接入第三方模型](./third-party-models.md)。

## 不配置模型，可以使用 Science 工作台吗

可以。本地实验设计、模拟教学案例、数据质量分析和内置 4PL 分析不需要模型凭据。只有使用 AI 对话或依赖模型的能力时，才需要配置提供商。

## 使用远程模型时，数据还只保存在本地吗

项目文件和运行记录可以保存在本机，但完成模型请求所需的提示词、上下文和工具结果会发送到你配置的远程端点。“本地优先”不等于所有功能完全离线。发送敏感数据前，请确认授权范围和提供商的数据处理政策。

## 配置和运行数据保存在哪里

用户级数据默认位于 `~/.sciencex`，项目级数据位于项目根目录下的 `.sciencex/`。凭据、可共享配置和迁移规则参见[配置与数据目录](./storage-layout.md)。
