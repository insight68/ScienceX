# Connect a Third-Party Model

ScienceX currently uses the Anthropic Messages API as its model-runtime interface. Connect directly when a provider implements that interface. When a provider exposes only an OpenAI-compatible API, use a gateway such as LiteLLM to translate the protocol.

A text response alone does not prove compatibility. Reliable use also depends on streaming, tool calling, context length, and handling of parameters such as `thinking` and `cache_control`. Follow the provider's current documentation and verify the actual workflow.

> **Data and credential boundary:** A remote model or proxy receives the prompt, context, and tool results required to complete the request. It also uses the API key you configure. Review the service's retention, logging, and credential-handling policies before connecting it. A local Ollama deployment and a remote service do not have the same data boundary.

## Choose a connection pattern

| Provider capability | Connection pattern |
| --- | --- |
| Exposes an Anthropic-compatible `/v1/messages` endpoint | Configure `ANTHROPIC_BASE_URL` directly |
| Exposes only an OpenAI-compatible endpoint | Use LiteLLM or another gateway for Anthropic → OpenAI translation |
| Runs locally through Ollama or a similar runtime | Expose an Anthropic-compatible endpoint through a local gateway |

```text
ScienceX ── Anthropic Messages ──▶ Compatible service
         └─ Anthropic Messages ──▶ Protocol gateway ── OpenAI-compatible ──▶ Target model
```

## Option 1: Connect through LiteLLM

[LiteLLM](https://docs.litellm.ai/docs/proxy/quick_start) can receive Anthropic Messages requests and route them to different model services. Every model name below is a placeholder example; replace it with a model ID supported by the provider today.

### 1. Install LiteLLM

```bash
pip install 'litellm[proxy]'
```

### 2. Create a configuration file

Create `litellm_config.yaml`:

```yaml
model_list:
  - model_name: sciencex-main
    litellm_params:
      model: openai/your-model-id
      api_key: os.environ/OPENAI_API_KEY

litellm_settings:
  # Drop Anthropic-specific parameters that the target interface does not support
  drop_params: true
```

For DeepSeek, replace the model and credential fields:

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

For local Ollama, configure a local model:

```yaml
model_list:
  - model_name: sciencex-main
    litellm_params:
      model: ollama/your-local-model
      api_base: http://127.0.0.1:11434

litellm_settings:
  drop_params: true
```

### 3. Start the proxy

```bash
# Set the credential required by your target service
export OPENAI_API_KEY=your_api_key_here

litellm --config litellm_config.yaml --port 4000
```

The proxy listens on `http://127.0.0.1:4000` and exposes an Anthropic-compatible interface to ScienceX.

### 4. Configure ScienceX

Add the following to the project `.env`:

```bash
ANTHROPIC_AUTH_TOKEN=local-proxy-token
ANTHROPIC_BASE_URL=http://127.0.0.1:4000
ANTHROPIC_MODEL=sciencex-main
ANTHROPIC_DEFAULT_SONNET_MODEL=sciencex-main
ANTHROPIC_DEFAULT_HAIKU_MODEL=sciencex-main
ANTHROPIC_DEFAULT_OPUS_MODEL=sciencex-main
```

If local LiteLLM has no `master_key`, `ANTHROPIC_AUTH_TOKEN` only satisfies the client authentication field. The proxy uses the provider credential from `litellm_config.yaml` when forwarding the request. Never commit a real provider key to a public repository.

### 5. Verify text and tool calling

```bash
./bin/sciencex
```

First send a simple message that does not call a tool to verify authentication, the model ID, and streaming. Then run one read-only tool call. Both steps must succeed before the model can be considered compatible with the basic ScienceX workflow.

## Option 2: Connect directly to an Anthropic-compatible service

### OpenRouter

OpenRouter currently documents `https://openrouter.ai/api` as the Anthropic SDK base URL; the SDK appends `/v1/messages`. Copy a current model ID from the [OpenRouter integration guide](https://openrouter.ai/docs/guides/coding-agents/claude-code-integration).

```bash
ANTHROPIC_AUTH_TOKEN=your_openrouter_api_key
ANTHROPIC_BASE_URL=https://openrouter.ai/api
ANTHROPIC_MODEL=provider/model-id
ANTHROPIC_DEFAULT_SONNET_MODEL=provider/model-id
ANTHROPIC_DEFAULT_HAIKU_MODEL=provider/model-id
ANTHROPIC_DEFAULT_OPUS_MODEL=provider/model-id
```

### MiniMax

MiniMax exposes an Anthropic-compatible endpoint. The field structure below matches the repository's `.env.example`, but model availability and names may change. Check the current [MiniMax compatibility documentation](https://platform.minimax.io/docs/api-reference/text-anthropic-api) before use.

```bash
ANTHROPIC_API_KEY=your_minimax_api_key
ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic
ANTHROPIC_MODEL=MiniMax-M2.7
ANTHROPIC_DEFAULT_SONNET_MODEL=MiniMax-M2.7
ANTHROPIC_DEFAULT_HAIKU_MODEL=MiniMax-M2.7-highspeed
ANTHROPIC_DEFAULT_OPUS_MODEL=MiniMax-M2.7
```

## Checklist for any other proxy

ScienceX does not maintain or implicitly trust third-party community proxies. Before connecting one, confirm that it:

1. Has reviewable source code, version history, and an active maintenance status.
2. Clearly documents whether it logs request bodies, tool results, or API keys.
3. Correctly handles Anthropic `/v1/messages`, streaming events, and `tool_use`.
4. Returns structured errors instead of HTML pages or truncated responses.
5. Passes text-response and read-only tool-call checks with non-sensitive data.

## Compatibility notes

### `thinking` and prompt caching

A directly connected Anthropic-compatible service may support these capabilities. A route translated through an OpenAI-compatible interface may drop or degrade them. Do not assume that every third-party model supports them—or that none do. Verify the selected service and model independently.

### Tool calling

Core ScienceX workflows depend on `tool_use`. The model must reliably produce structured tool arguments and consume tool results. Parameter count or brand alone does not prove compatibility; use an actual task check.

### Request timeout

Long contexts and repeated tool calls can require more time. Increase `API_TIMEOUT_MS` only after confirming that the request is still progressing. A timeout can also indicate an incorrect endpoint, a network failure, or an upstream rejection and should not always be solved by waiting longer.

## Troubleshooting

### LiteLLM reports that `/v1/responses` is missing

Some OpenAI-compatible services expose only `/v1/chat/completions`. You can try this LiteLLM setting:

```yaml
litellm_settings:
  use_chat_completions_url_for_anthropic_messages: true
```

This is LiteLLM behavior. Recheck its official documentation after upgrading LiteLLM.

### What is the difference between `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN`?

- `ANTHROPIC_API_KEY` is sent through the `x-api-key` header.
- `ANTHROPIC_AUTH_TOKEN` is sent through the `Authorization: Bearer` header.

Choose the method required by the provider instead of inferring it only from the key prefix.
