# Agent Monitor

A local dashboard for **Codex, Claude Code, Pi, and Hermes**. Explore agent trees, read traces, and track token usage and estimated costs. Traces stay on your machine.

![Agent graph](docs/images/agent-graph.png)

## Download

Get the latest macOS, Windows, and Linux builds from [Releases](https://github.com/donvito/agent-monitor/releases). The builds are not code-signed yet; the release notes explain how to open them.

## Run from source

Requires **Node.js 22.12+** and npm.

```sh
git clone https://github.com/donvito/agent-monitor.git
cd agent-monitor
npm install
npm run dev
```

Select a run from the sidebar to load its agents. Click an agent to inspect its trace, or use the icon on its node to open the trace in a tab. Click **Details** next to the token totals for the full breakdown.

Default sources:

| Provider | Local source |
| --- | --- |
| Codex | `$CODEX_HOME/sessions` or `~/.codex/sessions` |
| Claude Code | `$CLAUDE_CONFIG_DIR/projects` or `~/.claude/projects` |
| Pi | `$PI_CODING_AGENT_DIR/sessions` or `~/.pi/agent/sessions` |
| Hermes | `$HERMES_HOME/state.db`, `session-exports/traces`, and `sessions`, defaulting to `~/.hermes` |

## Trace view

Open any agent in a tab to read its conversation, tool calls, and results, with links to its parent and subagents.

![Trace view](docs/images/trace-view.png)

## Token breakdown

Token totals and estimated API cost per agent, with usage charts over time.

![Token usage and cost breakdown](docs/images/token-usage.png)

Switch to **By model** to see tokens and cost grouped by model.

![Token usage and cost by model](docs/images/token-usage-by-model.png)

*Screenshots use synthetic demo sessions.*

## More

- [Using the dashboard](docs/usage.md)
- [Discovery, configuration, and privacy](docs/discovery-and-privacy.md)
- [Development and production builds](docs/development.md)
- [Pricing sources and assumptions](docs/token-pricing.md)
- [Product specification](SPEC.md)

## Ubuntu 24.04+ installation (security preview)

If your AppImage reports *"refuses to start without the Chromium sandbox"*,
the Ubuntu AppArmor user-namespace restriction is blocking its startup.
Do **not** add `--no-sandbox` or disable AppArmor globally.

Download the fixed
[Ubuntu .deb or AppImage setup script](https://github.com/hugo-67/agent-monitor/releases/tag/ubuntu-sandbox-fix-20261013).
On Ubuntu, the `.deb` is recommended:
`sudo apt install ./agent-monitor-*.deb`.

If you prefer the portable AppImage, use
`bash setup-ubuntu-appimage.sh /absolute/path/to/agent-monitor-*.AppImage`
once before launching. It adds an AppArmor allowance for that exact file.
See [the development guide](docs/development.md).
