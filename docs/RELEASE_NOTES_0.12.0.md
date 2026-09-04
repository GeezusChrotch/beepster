# Beepster 0.12.0 Beta

This invitation beta adds two carefully bounded power features while preserving the existing
terminal-free setup and messaging experience.

## New in this beta

- **Archive conversations:** assign Delete to any Threads-view press or hold action. Repeat the
  same gesture within six seconds to move the selected conversation to Beeper's Archive.
- **Delete a message for yourself:** assign Delete in Chat and repeat it within six seconds on a
  disposable message. Beepster targets the exact underlying message, including in linked Apple
  conversations.
- **OpenClaw approvals inside Telegram:** optional protected actions now appear in the Telegram
  conversation with the agent that requested them. Select the labeled approval, review its full
  sanitized description, and choose **Approve** or **Deny**. There is no separate approval inbox
  and no standing-permission option.
- **Complete approval coverage:** Beepster now recognizes OpenClaw exec, plugin, and system-agent
  approval registries.

## Safety notes

- OpenClaw integration remains off by default and requires opt-in on both the Mac Connector and
  phone settings.
- Approve applies only to the exact pending action once. The Connector rechecks its opaque ID just
  before resolving it.
- Beeper and OpenClaw credentials remain in the Mac login Keychain or Connector state and are never
  included in the public watch package.
- Conversation deletion is implemented as Beeper Archive. Message deletion is limited to the
  selected message for the current user.

New testers should begin with the [beta testing guide](BETA_TESTING.md). Existing testers can install
the new watch package and replace the Connector app without re-pairing or re-entering saved settings.
