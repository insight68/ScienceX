# Configure a Model Provider

Desktop users can usually configure a provider under **Settings → Providers**. This page is primarily for the source CLI, automation scripts, and low-level configuration troubleshooting.

You do not need model credentials to use local experiment design, data-quality analysis, or the 4PL teaching case in the Science workbench. For AI chat, you normally need only an authentication method, service endpoint, and model name; leave the remaining variables at their defaults unless your provider requires otherwise.

> **Remote-model data boundary:** When you use a remote model, the prompt, context, and tool results required for the request are sent to the service configured by `ANTHROPIC_BASE_URL`. `DISABLE_TELEMETRY=1` does not block these required model requests. Do not send sensitive data to a third-party service without authorization.

## Variables

| Variable | Required | Description |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Choose one authentication method | Sent through the `x-api-key` header; use it only when required by the provider |
| `ANTHROPIC_AUTH_TOKEN` | Choose one authentication method | Sent through the `Authorization: Bearer` header; use it only when required by the provider |
| `ANTHROPIC_BASE_URL` | No | Base URL of the model service; defaults to the official Anthropic endpoint |
| `ANTHROPIC_MODEL` | No | Default model name or provider-specific model ID |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | No | Model mapping for the Sonnet role |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | No | Model mapping for the Haiku role |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | No | Model mapping for the Opus role |
| `API_TIMEOUT_MS` | No | API request timeout; defaults to `600000` milliseconds (10 minutes) |
| `DISABLE_TELEMETRY` | No | Set to `1` to disable telemetry |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | No | Set to `1` to disable non-essential network traffic |
| `SCIENCEX_HOME` | No | ScienceX user-data root; defaults to `~/.sciencex` |
| `CLAUDE_CONFIG_DIR` | No | Embedded Claude-compatible runtime directory; defaults to `$SCIENCEX_HOME/claude` |

## Configuration methods

### Option 1: Project `.env` file

```bash
cp .env.example .env
```

Edit `.env`. The following example uses [MiniMax's Anthropic-compatible endpoint](https://platform.minimax.io/docs/api-reference/text-anthropic-api) only to demonstrate the fields. Use the endpoint and model IDs from your provider's current documentation.

```bash
# Select the authentication method required by the provider; do not leave both placeholders enabled
ANTHROPIC_API_KEY=your_api_key_here
# ANTHROPIC_AUTH_TOKEN=your_api_key_here

# Model-service endpoint
ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic

# Model names or IDs
ANTHROPIC_MODEL=MiniMax-M2.7
ANTHROPIC_DEFAULT_SONNET_MODEL=MiniMax-M2.7
ANTHROPIC_DEFAULT_HAIKU_MODEL=MiniMax-M2.7-highspeed
ANTHROPIC_DEFAULT_OPUS_MODEL=MiniMax-M2.7

# Optional: this example extends the timeout to 50 minutes; remove it to use the 10-minute default
API_TIMEOUT_MS=3000000

# Disable telemetry and non-essential network traffic
DISABLE_TELEMETRY=1
CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
```

### Option 2: Embedded runtime configuration

Edit `~/.sciencex/claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_API_KEY": "your_api_key_here",
    "ANTHROPIC_BASE_URL": "https://api.minimax.io/anthropic",
    "ANTHROPIC_MODEL": "MiniMax-M2.7"
  }
}
```

> Precedence: process environment variables > project `.env` file > `~/.sciencex/claude/settings.json`.

Never commit an `.env` or local settings file that contains real credentials. See [Configuration and data directories](./storage-layout.md) for the complete layout and legacy `.claude` migration rules. See [Connect a third-party model](./third-party-models.md) for other provider patterns.
