# Hermes and OpenClaw approvals

This feature requires **Beepster 0.15.0** and the updated **Organik Apps Pebble
Connector 0.3.0 or newer** with native Agent Links and Telegram compatibility setup. It is not
included in the older standalone Connector. Update both components. Do not
reset Beeper access, phone pairing, or themes.

## Setup — no Terminal required

1. Open **Organik Apps Pebble Connector → Beepster → Optional: Hermes and OpenClaw approvals** on the Mac running your agent. Setup is native to Connector; no browser is required. Use **Check agent connections** to refresh status.
2. For **OpenClaw**, first use the Beepster page's **Pair OpenClaw access** button and
   approve the Beepster device in OpenClaw when requested. This retains the
   existing approval-scoped device credential.
3. For **Hermes**, use **Install / enable Hermes bridge** in Agent Links. The
   installer preserves a backup of an existing Beepster plugin. It supports
   Hermes's default local installation under your own home folder. Restart
   Hermes when its current work is finished; Beepster does not restart it.
4. For **OpenClaw**, Agent Links discovers existing local Telegram sessions from
   its session index (legacy JSON or current SQLite); no pending request is needed.
   For the first **Hermes** link, ask your agent in Telegram for a task that genuinely
   requires confirmation, then refresh while that request is pending. Select its **agent
   session** and the **same Beeper Telegram conversation**, then confirm the link.
   Group, topic and profile session identifiers are shown separately. You must
   choose the right conversation; Beepster does not guess from names or wording.
5. Enable **Show pending agent approvals** in Beepster's phone settings.
6. Open the linked chat on the watch. Pending approvals appear as action cards
   inside that conversation, followed by selectable **Approve once / Deny** rows.
   Scroll to a choice and hold center to select it, as the row indicates. Up/down
   still scroll; opening a chat starts at the request, not a decision.
   **Always approve** appears only for requests that advertise persistent permission.
   Read its scope, then select it and choose **Confirm always** (or **Back**).
   The selected choice has a black background, white text and a selection hint.
   The original Telegram notification remains ordinary message text.

Repeat for the other agent. **Disable link** immediately stops new decisions
for that link. Unlink before repurposing a bot or conversation. Refreshing the
setup page performs read-only connection checks; it never approves an action.

## Security and limits

OpenClaw Telegram approvals use the Telegram account's existing authorization:
in an explicitly linked direct chat, fresh structured approval cards supply
the exact request ID and allowed decisions. A menu choice sends
`/approve <exact-request-id> <decision>` through Beeper into that same chat.
Unscoped commands, self-authored cards, expired cards, and group chats are not
offered. OpenClaw validates the account, request and final decision itself.
“Sent” confirms command delivery, not execution; check OpenClaw's result in chat.
This path does not require granting the Connector administrator privileges.
Hermes continues to use its exact-request local bridge.

- A watch action carries a short-lived opaque ticket bound to the provider,
  source session, selected Beeper chat, request ID and displayed description.
  The gateway rechecks pending state before resolving; it rejects changed,
  expired, disabled, relinked and duplicate tickets. No automatic decision retry.
- No approve-all, generic `/approve` message, or bot-token sharing. The agent
  itself executes or blocks the action. Always uses the provider's persistent
  permission and requires a second confirmation; its scope is ticket-bound.
  Hermes slash confirmations (bridge 0.3.0) disable confirmation globally for
  ALL future `/clear`, `/new`, `/reset`, and `/undo` commands when Always is chosen.
  Re-enable `approvals.destructive_slash_confirm` in Hermes to restore prompts.
  Hermes tool approvals currently offer only once/deny. OpenClaw offers Always
  only when the request explicitly includes `allow-always` in `allowedDecisions`.
- Hermes uses an explicitly enabled plugin and a private same-user Unix socket;
  there is no extra network port or agent credential on the phone/watch.
  As with the rest of Connector, trusted software running as your Mac user is
  inside this boundary. Tailscale access alone does not replace gateway auth.
- Link administration is a separate loopback-only page with an unpredictable
  URL, same-origin POST checks and a ten-minute lifetime. The ordinary phone
  credential cannot configure links or install plugins.
- Requests without exact Telegram session metadata, or with descriptions too
  long to safely present, are not offered on the watch. Use the native agent UI.
- Hermes must provide `list_gateway_approvals` and a `request_id` parameter on
  `resolve_gateway_approval`, plus plugin hooks and unload support. Unsupported
  versions fail closed. The bridge becomes available after the first Telegram
  approval in that Hermes process; before then it reports not connected.
- This first implementation targets agents on the same Mac, with the default
  Hermes installation. Custom Hermes profiles/paths, remote machines and live
  watch-to-agent verification remain unvalidated. No personal paths, chat IDs,
  credentials or bot names are shipped.

## Troubleshooting

**OpenClaw change card has no choices:** in Connector's native Agent Links,
choose **Enable Telegram approval text**, then **Back up and install**. This
compatibility installer supports OpenClaw **2026.9.1** in the standard local
npm/Homebrew locations. It adds the exact request ID and supported `/approve`
reply choices to new Telegram change cards; it does not change authorization,
execution, or native Telegram buttons. Unsupported versions/layouts are refused.
Restart OpenClaw when its work is finished, then generate a fresh request.
Installation alone does not update a card already sent. The restart is currently
performed through your normal OpenClaw controls (or `openclaw gateway restart`).
No new watch build is needed if you already have the inline approval menu build.

The original renderer is backed up under
`~/Library/Application Support/Beepster/openclaw-renderer-backups/`, named with
its SHA-256 hash. Reinstalling the same patch is a no-op. After an OpenClaw
update, check compatibility again; do not copy an old patched renderer into a
new version. To undo on the same version, stop OpenClaw and restore that
version's matching backup to its original `dist/approval-handler.runtime-*.js`
location, then restart. A clean reinstall of that OpenClaw version also removes
this compatibility change. If the installation is not writable, Connector
reports an error; it does not request administrator privileges automatically.

**Hermes not connected:** confirm plugin installation, restart Hermes when safe,
then request an approval from Telegram and refresh. A request from its CLI is
not a Telegram request. Check Hermes's plugin status for unsupported-version
errors. Normal Telegram approvals still work without Beepster.

**OpenClaw requests have no Telegram identity:** use the native OpenClaw approval
UI. Beepster will not restore timestamp/keyword matching as a workaround.

**Nothing on the watch:** check the saved link, phone checkbox, current agent
connection and that the request is still pending. Both components must contain
the new feature. Older unscoped approval endpoints now return an update notice.

**Decision not confirmed:** check Hermes/OpenClaw before doing anything else.
The action may have expired or been answered elsewhere. Do not blindly repeat it.

## Developer checks

Run `npm test`, `python3 gateway/test/hermes-bridge_test.py`, `pebble build`, and
Swift type checking before packaging. These tests use synthetic actions only;
passing builds do not establish successful physical-watch or live-agent execution.
