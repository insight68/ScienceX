# Installation and Provider Troubleshooting

Start by identifying the failing layer. A CLI that cannot load usually indicates a local dependency problem. A CLI that starts but cannot answer usually indicates authentication, endpoint, or model-ID configuration. If ordinary replies work but tools fail, investigate model capability or protocol translation.

## An error mentions `usage.input_tokens`

```text
undefined is not an object (evaluating 'usage.input_tokens')
```

A common cause is an incorrect `ANTHROPIC_BASE_URL`. The service returns HTML or another response that does not match the Anthropic Messages API.

The Anthropic SDK appends `/v1/messages` to the base URL. For example:

- MiniMax: `ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic`
- OpenRouter: `ANTHROPIC_BASE_URL=https://openrouter.ai/api`
- Incorrect OpenRouter example: `ANTHROPIC_BASE_URL=https://openrouter.ai/api/v1`, which can duplicate the `/v1` segment

Check the provider's current documentation, then confirm that the response is structured JSON. Do not hide an endpoint error by only increasing `API_TIMEOUT_MS`. See [Connect a third-party model](./third-party-models.md) for configuration patterns.

## `Cannot find package 'bundle'`

```text
error: Cannot find package 'bundle' from '.../ScienceX/src/entrypoints/cli.tsx'
```

This usually means that the Bun version does not match the repository requirement. The current repository pins `bun@1.3.12` in `packageManager` and documents Bun 1.3.x as the supported line.

```bash
bun --version
```

Install or switch to the repository-declared version, return to the repository root, and run `bun install` again. Avoid a generic “upgrade to latest” instruction because the latest release may be outside the currently verified range.

## How do I connect OpenAI, DeepSeek, or Ollama?

ScienceX sends Anthropic Messages API requests:

- Connect directly when the provider supports `/v1/messages`.
- When the provider exposes only an OpenAI-compatible interface, use LiteLLM or another proxy for **Anthropic → OpenAI** translation.
- A local Ollama runtime usually also needs a local gateway that exposes an Anthropic-compatible interface to ScienceX.

See [Connect a third-party model](./third-party-models.md) for the complete setup.

## Can I use the Science workbench without a model provider?

Yes. Local experiment design, the simulated teaching case, data-quality analysis, and the built-in 4PL analysis do not require model credentials. Configure a provider only for AI chat and other model-dependent capabilities.

## Does data stay local when I use a remote model?

Project files and run records can remain on your machine, but the prompt, context, and tool results required for a model request are sent to the configured remote endpoint. “Local-first” does not mean that every feature is fully offline. Confirm authorization and the provider's data policy before sending sensitive data.

## Where are configuration and run data stored?

User-level data is stored under `~/.sciencex` by default, while project-level data lives in `.sciencex/` at the project root. See [Configuration and data directories](./storage-layout.md) for credentials, shareable settings, and migration rules.
