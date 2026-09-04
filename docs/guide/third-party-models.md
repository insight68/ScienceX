# 接入第三方模型

ScienceX 当前以 Anthropic Messages API 作为模型运行时接口。提供商直接支持该接口时可以直连；只提供 OpenAI 兼容接口时，需要通过 LiteLLM 等网关转换协议。

能否稳定使用不只取决于“能否返回文字”，还取决于流式输出、工具调用、上下文长度以及 `thinking`、`cache_control` 等参数的兼容性。请以提供商当前文档和实际验证结果为准。

> **数据与凭据边界**：远程模型和远程代理会接收完成请求所需的提示词、上下文和工具结果。API Key 也会交给你配置的服务或本地代理使用。接入前请检查服务的数据保留、日志和凭据处理政策。本地 Ollama 与远程服务的数据边界不同，不要混为一谈。

## 先选择接入方式

| 提供商能力 | 接入方式 |
| --- | --- |
| 提供 Anthropic 兼容的 `/v1/messages` 接口 | 直接配置 `ANTHROPIC_BASE_URL` |
| 只提供 OpenAI 兼容接口 | 使用 LiteLLM 等代理执行 Anthropic → OpenAI 转换 |
| 本机运行 Ollama 等模型 | 通过本地代理暴露 Anthropic 兼容接口 |

```text
ScienceX ── Anthropic Messages ──▶ 兼容服务
         └─ Anthropic Messages ──▶ 协议代理 ── OpenAI-compatible ──▶ 目标模型
```

## 方式一：通过 LiteLLM 接入

[LiteLLM](https://docs.litellm.ai/docs/proxy/quick_start) 可以接收 Anthropic Messages 请求，并将请求转发到不同模型服务。下面的模型名称都是占位示例，使用前必须替换为提供商当前支持的模型 ID。

### 1. 安装 LiteLLM

```bash
pip install 'litellm[proxy]'
```

### 2. 创建配置文件

新建 `litellm_config.yaml`：

```yaml
model_list:
  - model_name: sciencex-main
    litellm_params:
      model: openai/your-model-id
      api_key: os.environ/OPENAI_API_KEY

litellm_settings:
  # 丢弃目标接口不支持的 Anthropic 专有参数
  drop_params: true
```

使用 DeepSeek 时，将 `model` 和凭据替换为对应配置：

```yaml
model_list:
  - model_name: sciencex-main
    litellm_params:
      model: deepseek/deepseek-chat
      api_key: os.environ/DEEPSEEK_API_KEY
      api_base: https://api.deepseek.com

litellm_settings:
  drop_params: true
```

使用本机 Ollama 时，可配置本地模型：

```yaml
model_list:
  - model_name: sciencex-main
    litellm_params:
      model: ollama/your-local-model
      api_base: http://127.0.0.1:11434

litellm_settings:
  drop_params: true
```

### 3. 启动代理

```bash
# 按配置设置目标服务的凭据
export OPENAI_API_KEY=your_api_key_here

litellm --config litellm_config.yaml --port 4000
```

代理启动后监听 `http://127.0.0.1:4000`，并向 ScienceX 提供 Anthropic 兼容接口。

### 4. 配置 ScienceX

在项目 `.env` 中添加：

```bash
ANTHROPIC_AUTH_TOKEN=local-proxy-token
ANTHROPIC_BASE_URL=http://127.0.0.1:4000
ANTHROPIC_MODEL=sciencex-main
ANTHROPIC_DEFAULT_SONNET_MODEL=sciencex-main
ANTHROPIC_DEFAULT_HAIKU_MODEL=sciencex-main
ANTHROPIC_DEFAULT_OPUS_MODEL=sciencex-main
```

本地 LiteLLM 未配置 `master_key` 时，`ANTHROPIC_AUTH_TOKEN` 只是满足客户端认证字段；代理真正转发请求时使用 `litellm_config.yaml` 中配置的提供商凭据。不要把真实提供商 Key 写进公开仓库。

### 5. 验证文字与工具调用

```bash
./bin/sciencex
```

先发送一条不调用工具的简单消息，确认认证、模型 ID 和流式输出正常；再执行一次只读工具调用。只有两步都成功，才能说明该模型适合 ScienceX 的基本工作流。

## 方式二：直连 Anthropic 兼容服务

### OpenRouter

OpenRouter 当前为 Anthropic SDK 提供的基础地址是 `https://openrouter.ai/api`；SDK 会在后面追加 `/v1/messages`。模型 ID 请从 [OpenRouter 当前文档](https://openrouter.ai/docs/guides/coding-agents/claude-code-integration)复制。

```bash
ANTHROPIC_AUTH_TOKEN=your_openrouter_api_key
ANTHROPIC_BASE_URL=https://openrouter.ai/api
ANTHROPIC_MODEL=provider/model-id
ANTHROPIC_DEFAULT_SONNET_MODEL=provider/model-id
ANTHROPIC_DEFAULT_HAIKU_MODEL=provider/model-id
ANTHROPIC_DEFAULT_OPUS_MODEL=provider/model-id
```

### MiniMax

MiniMax 提供 Anthropic 兼容端点。以下字段结构与仓库 `.env.example` 一致，但模型可用性和名称可能调整，请在使用前核对 [MiniMax 官方兼容接口文档](https://platform.minimax.io/docs/api-reference/text-anthropic-api)。

```bash
ANTHROPIC_API_KEY=your_minimax_api_key
ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic
ANTHROPIC_MODEL=MiniMax-M2.7
ANTHROPIC_DEFAULT_SONNET_MODEL=MiniMax-M2.7
ANTHROPIC_DEFAULT_HAIKU_MODEL=MiniMax-M2.7-highspeed
ANTHROPIC_DEFAULT_OPUS_MODEL=MiniMax-M2.7
```

## 使用其他代理前的检查清单

ScienceX 不维护也不默认信任第三方社区代理。接入前至少确认：

1. 有可审查的源码、版本记录和维护状态。
2. 明确是否记录请求正文、工具结果或 API Key。
3. 能正确处理 Anthropic `/v1/messages`、流式事件和 `tool_use`。
4. 失败时返回结构化错误，而不是 HTML 页面或被截断的响应。
5. 已用非敏感数据完成文字回复和只读工具调用验证。

## 兼容性说明

### `thinking` 与提示词缓存

直连的 Anthropic 兼容服务可能支持这些能力；经过 OpenAI 兼容接口转换时，也可能被代理丢弃或降级。不要笼统假设“第三方模型一定支持”或“一定不支持”，应分别验证所选服务和模型。

### 工具调用

ScienceX 的核心工作流依赖 `tool_use`。模型需要稳定地产生结构化工具参数，并正确处理工具结果。参数量或模型品牌不能单独证明兼容性，以实际任务验证为准。

### 请求超时

长上下文或多次工具调用可能需要更长时间。只有确认请求确实在持续运行时才调大 `API_TIMEOUT_MS`；超时也可能来自错误端点、网络失败或上游拒绝，不应一律通过延长时间解决。

## 常见问题

### LiteLLM 报错 `/v1/responses` 找不到

部分 OpenAI 兼容服务只支持 `/v1/chat/completions`。可以在 LiteLLM 配置中尝试：

```yaml
litellm_settings:
  use_chat_completions_url_for_anthropic_messages: true
```

该设置属于 LiteLLM 行为，升级 LiteLLM 后请重新核对其官方文档。

### `ANTHROPIC_API_KEY` 和 `ANTHROPIC_AUTH_TOKEN` 有什么区别

- `ANTHROPIC_API_KEY` 通过 `x-api-key` 请求头发送。
- `ANTHROPIC_AUTH_TOKEN` 通过 `Authorization: Bearer` 请求头发送。

请按提供商要求选择，不要仅凭 Key 的字符串前缀判断。
