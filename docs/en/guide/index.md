# Get Started with ScienceX

For a first visit, install the desktop app and run the three-minute teaching case. It walks through a complete path from a research question and versioned data to analysis artifacts and replay verification.

## Choose your path

| Your goal | Start here |
| --- | --- |
| Use ScienceX directly | [Download the desktop app](../download.md) |
| Understand the research workflow | [Run the three-minute teaching case](../science/01-deployment-and-workflow.md#try-the-built-in-example-in-three-minutes) |
| Run the terminal app from source | [Run the ScienceX CLI from source](./quick-start.md) |
| Configure AI chat | [Configure a model provider](./env-vars.md) |
| Connect OpenAI, DeepSeek, or a local model | [Connect a third-party model](./third-party-models.md) |
| Contribute to ScienceX | [Contributing and quality gates](./contributing.md) |

## Recommended first session

1. Download and start the desktop app.
2. Open **Science** in the sidebar and run the built-in teaching case. It uses locally generated simulated data and does not require model credentials.
3. Inspect the research question, input version, run record, and generated artifacts.
4. Configure a model provider under **Settings → Providers** only when you want to use AI chat.
5. Create a project in your own research directory and begin with a task whose scope and expected output are easy to verify.

> **Local-first does not mean fully offline.** Local experiment analysis does not send table contents to a model. When you use a remote model, the prompt, context, and tool results required for the request are sent to the endpoint you configured. Review the provider's data policy and your authorization boundaries first.

## Continue learning

- [Science Workbench: deployment and experiment workflow](../science/01-deployment-and-workflow.md): move from the simulated case to table analysis, artifacts, and replay.
- [Configuration and data directories](./storage-layout.md): understand user data, project configuration, and migration rules.
- [Installation and provider troubleshooting](./faq.md): resolve common startup and protocol-configuration problems.
