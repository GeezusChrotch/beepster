# Store agent integration candidate

This is a source/test contract for the unified Connector Store migration, not a
published feature or evidence of App Store acceptance. Sandbox permission,
packaging, signed helper inheritance, agent activation and physical-watch tests
remain separate integration gates. Nothing here authorizes Connector to install
or patch an external agent.

## Connector configuration

Set `BEEPSTER_DISTRIBUTION=app-store` for the bundled gateway and native setup
process, and `BEEPSTER_STATE_DIR` to native FileManager's app-container Application
Support Beepster directory. Missing/relative state directories fail closed.
Its HOME, secrets, saved links, device identity and prompt editor store
must remain in the app container. Native code owns the permission UI and keeps
the security-scoped bookmark active while its child accesses a selected folder.

- `BEEPSTER_OPENCLAW_HOME`: explicit user-selected OpenClaw data folder, never an
  inferred host-home path. Session discovery reads JSON/SQLite routing metadata
  only; SQLite uses bundled Node's `node:sqlite` read-only API (Node 22+), not an
  external CLI. Existing authenticated WebSocket approval access and its current
  scopes are unchanged. Use the existing gateway URL/token/device-state settings.
- `BEEPSTER_HERMES_BRIDGE_URL`: exactly
  `http://127.0.0.1:PORT/v1/beepster`.
- `BEEPSTER_HERMES_BRIDGE_TOKEN`: 32 or more hexadecimal characters, generated
  randomly and saved through native Keychain UI. Pass in the child environment,
  never argv, URLs, logs or watch settings. Missing HTTP configuration in Store
  mode fails closed; it never falls back to a host Unix socket.

Store mode blocks agent CLI discovery, installation and renderer patching. DMG
mode retains its existing default transports and installers.

## Hermes agent-side setup

The user installs/updates `gateway/integrations/hermes/beepster` through Hermes'
own plugin workflow, outside the Store app. Candidate plugin version is 0.5.1.
Configure these environment variables in the environment that starts Hermes:

- `BEEPSTER_HERMES_BRIDGE_PORT`: an available port from 1024 through 65535.
- `BEEPSTER_HERMES_BRIDGE_TOKEN`: the same random secret entered in Connector.

Restart Hermes when idle. The opt-in HTTP listener binds only 127.0.0.1; it does
not expose a LAN service. Omitting the port retains the DMG Unix-socket mode.
The two modes are alternatives, not simultaneous listeners.

All requests are POST JSON to `/v1/beepster` with `Authorization: Bearer TOKEN`.
Origin headers, wrong Host, missing credentials and transfer encoding are rejected.
No CORS or redirects are supported. Requests are capped at 5 MiB, responses at
128,000 bytes, and socket/client waits at four seconds. Diagnostic responses omit
credentials, private requests and internal exception details.

| Method | Request fields | Response |
| --- | --- | --- |
| `sessions` | none | `{protocol:1,ok:true,items:[{provider:"hermes",sessionKey,label}]}` |
| `list` | none | existing exact pending-approval items |
| `resolve` | `id`, `sessionKey`, `decision` | confirmation only after existing exact-request resolver succeeds |
| `prompts.sync` | `prompts:[{sessionKey,chatID,text}]` | `{protocol:1,ok:true}` after atomic persistence |

Session choices come from agent-side routing metadata plus observed Telegram
sessions, not names guessed from Beeper. Prompt sync replaces the complete set of
enabled Hermes links. If the routing index is empty after a reset or migration,
exact keys from canonical Telegram session metadata remain discoverable with
`fromHistory:true`; these are known scopes, not proof of an active turn.
Prompt sync replaces the complete set of
enabled Hermes links, so disabling or relinking clears old instructions. It
accepts at most 100 distinct known sessions and 12,000 characters per prompt.
The plugin persists only those prompt rows in its private `store-prompts.json`;
it does not read the Store container. Prompts apply on the next Telegram turn.
Resolve still rejects stale IDs, wrong sessions and unsupported persistent grants;
decisions are never automatically retried.

## OpenClaw prompts

The user installs/updates `organik-thread-prompts` version 0.2.0 using OpenClaw's
own plugin workflow and enables its existing prompt-hook permissions. Connector
does not install executable files or alter agent configuration.

To opt the agent into Store prompt data, set
`BEEPSTER_OPENCLAW_PROMPT_TRANSPORT=store-file` in OpenClaw's environment. For a
non-default agent data location also set `BEEPSTER_OPENCLAW_HOME` on the agent to
that same location. Restart the agent when idle after updating its plugin.

Connector writes one non-secret atomic snapshot at
`<selected OpenClaw folder>/beepster/store-thread-prompts.json`. It contains only
enabled, explicitly linked OpenClaw session prompts. The plugin looks up the exact
session; missing/invalid Store data does not fall back to stale DMG prompts. An
empty snapshot disables all Store overrides. Without the explicit transport flag,
the plugin retains its original DMG prompt source.

The native editor retains its defaults, revisions and saved text. If transport
sync fails, setup reports that local settings were saved but the agent may still
have its previous prompt. Reconnect/regrant access and refresh to retry; a local
save is not an agent-side success receipt. A successful file sync also does not
prove the external OpenClaw plugin has been installed or activated.
