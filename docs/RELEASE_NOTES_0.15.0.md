# Beepster 0.15.0 — Hermes and OpenClaw approvals

Review agent approval requests inside their linked Telegram conversations on
Pebble Time 2. Both Hermes and OpenClaw use the same clearly highlighted controls:
up/down chooses a row, and holding center activates it. Opening a chat shows the
request first. Always approve appears only when supported and requires a second
confirmation. Scrolling never approves a request.

## Upgrade and setup

Install the latest [Organik Apps Pebble Connector](https://github.com/GeezusChrotch/organik-pebble-connector/releases/latest)
and Beepster 0.15.0. Preserve existing pairing and Beeper credentials. In Connector,
open Beepster's optional agent setup, enable the relevant integration and explicitly
link its session to the matching Beeper Telegram conversation. Enable pending agent
approvals in Beepster settings. Follow the [full agent guide](AGENT_APPROVALS.md).

OpenClaw Telegram change cards require an exact request ID and advertised text
commands. Connector provides a backed-up compatibility installer for OpenClaw
2026.9.1; unsupported versions fail closed. Restart OpenClaw when idle after
installation and generate a fresh request. Native Telegram permissions are unchanged.

## Other fixes

- Prevent action rows from loading the approval description over the selected choice.
- Handle a busy watch outbox before initial submission without duplicating decisions.
- Keep selected approval details stable during interaction and reject expired or changed requests.

## Validation and limits

The pre-version-bump build's approval focus/navigation was installed on a physical
Time 2 and confirmed fixed by its owner. Hermes and OpenClaw were exercised during
development; this is not a claim of coverage for every agent version or every setup.
Release packaging is separately checked; the final version-stamped artifact has not
had a new full physical-watch regression run.

Requires Mac, Beeper Desktop and private Tailscale connectivity. Agents are optional.
Agent setup currently targets default local installations. OpenClaw Telegram text
approvals are restricted to explicitly linked direct chats. “Sent” is transport
delivery, not proof the agent applied a change—check its response in the conversation.
Existing limits remain: Time 2/Emery only, static attachment previews, and iMessage
message deletion disabled while thread archiving remains available.

Please [report bugs or share feedback](https://github.com/GeezusChrotch/beepster/issues),
including app/Connector/agent versions and reproduction steps. Remove private messages,
tokens, contact details and tailnet addresses from screenshots or logs before sharing.
