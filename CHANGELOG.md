# Changelog

## 0.13.0 — First public release

- Published Beepster for everyone, with a guided installation page and open feedback forms.

- Measure inactive message previews using the actual font so the last line is not
  sliced off above the next sender. Keep wrapped emoji and text inside the body
  when a word or emoji crosses the final visible line.

## 0.12.0 — Archive actions and inline OpenClaw approvals

- Added a configurable Delete action for both views. In Threads it safely archives the selected
  Beeper conversation; in Chat it deletes the selected message for the current user. Repeating the
  configured Delete gesture within six seconds confirms the operation.
- Combined Apple threads archive all of their linked Beeper conversations, while message deletion
  is routed to the exact underlying conversation and message.
- Removed the obsolete separate message-reading window; complete messages continue to expand and
  scroll directly in the chat, freeing enough Pebble executable space for deletion support.
- Added optional OpenClaw protected-action review directly inside the matching Telegram agent
  conversation. Selecting the correlated approval shows its full sanitized action description and
  a dedicated Approve or Deny menu.
- Added OpenClaw's system-agent approval registry alongside exec and plugin approvals, with exact
  pending-ID revalidation and only one-time approval or denial decisions.
- Added Connector-led OpenClaw setup, a separate scoped device identity stored only on the Mac,
  watch Settings opt-in, live approval polling, tests, and end-user documentation.

## 0.11.0 — Privacy-clean invitation beta

- Removed development source maps and absolute local build paths from distributed watch and Mac
  artifacts, and added release-time checks that prevent them from returning.
- Changed release checksum files to contain portable artifact names rather than local filesystem
  paths.

## 0.10.0 — Invitation beta

- Added a complete 3,944-entry Unicode Emoji 17.0/Twemoji library to the Mac Connector, a visual
  Settings picker for 15 reorderable emoji replies, and compact on-demand watch atlases.
- Chat messages now replace emoji—including skin tones, flags, and joined family sequences—with
  inline bitmap artwork instead of relying on Pebble's limited emoji font.
- Prevented recurring macOS Keychain prompts by allowing authorization requests
  to finish instead of killing the helper after five seconds and restarting it.
- Fixed **Copy Phone Setup** to include the exact Tailscale Serve HTTPS port assigned to Beepster,
  preventing Settings from opening another service on the same Mac.
- Paired watches now open Settings directly on their saved private gateway instead of visiting the
  public first-run fallback.
- Personal builds now migrate an existing saved gateway origin to their embedded private Connector
  address while preserving the paired credential, recovering cleanly when the Tailscale port moves.
- Settings now detects an expired gateway credential and reveals the pairing-code field instead of
  leaving the watch on a generic connection error.
- Fixed macOS contact enrichment by recognizing file-based lookup launches and waiting for the
  background Contacts helper's response; raw Apple identifiers can now resolve reliably.
- Contacts authorization now runs a real background AppKit lifecycle while macOS presents the
  permission sheet, instead of leaving the access request without a UI-capable app lifecycle.
- The hardened Contacts helper now includes the required macOS Address Book entitlement.
- Apple email and phone destinations matched to the same Mac Contacts record are now combined
  automatically on the watch, including their history, unread count, and newest reply route.
- Reply delivery now retries the eligible routes behind a combined conversation while preserving
  the original Beeper chat identifiers.
- Open chats and the visible conversation list now refresh every 15 seconds while Beepster is in
  use, without interrupting reading or scrolling.
- Guided setup now includes the exact Beeper Desktop token path and checks the sensitive-action
  permission required for sending replies.
- The Connector now detects Tailscale Serve routes reliably when launched from Finder and explains
  whether its window, background gateway, Beeper Desktop, and Tailscale need to remain running.
- Removed the repeated button-customization notice from message views.
- Group chats now keep the user's messages visually consistent while assigning stable,
  theme-complementary colors to other participants.

All notable changes to Beepster are documented here.

## 0.9.0 — Release candidate

- Add original Beepster brand artwork, 25×25 watch launcher icon, Store icon, and header.
- Add a universal first-run setup handoff so a public PBW does not embed a user's private URL.
- Add complete install, user, troubleshooting, performance, and publishing guides.
- Cache full-message and preview text layout to reduce work during two-line scrolling.
- Send theme/font packets only at startup or after an actual theme change.
- Prevent background chat refresh from replacing an open thread's state.
- Reject late responses from abandoned chats and discard obsolete queued detail/media chunks.
- Cache and coalesce the eight most recent Mac-side media previews.
- Add a credential-safe Mac health checker and reproducible release packaging script.
- Add a synthetic-data demo build for privacy-safe Store screenshots.
- Add a persistent included-services checklist with all networks enabled by default.
- Add optional read-only macOS Contacts enrichment for Apple chats that expose only an identifier.
- Add user-controlled linking of Apple email and phone destinations into one combined watch thread.
- Add a native Beepster Connector readiness app with permission, gateway, Tailscale, and pairing checks.
- Explain every Connector action inline with its purpose and why it is needed.
- Expand the watch inbox from 12 to 30 recent conversations.
- Package a universal self-contained Mac Connector with bundled Node runtime and local gateway.
- Add a no-Terminal Connector installer that preserves credentials and permission identities on updates.
- Add one-click copying and a selectable fallback display of the private phone setup address.
- Add reproducible Developer ID signing, notarization, DMG, and checksum packaging support.
- Rotate a successfully consumed pairing code in Keychain so it cannot return after a gateway restart.
- Add persistent inbox pinning: hold Center to pin or unpin, with pinned chats sorted first and
  marked by a theme-aware `PIN` badge.

## 0.8.3

- Move quick replies to long Top.
- Start dictation with either short or long Center.
- Move jump-to-newest to long Bottom while retaining two-line short-button scrolling.

Earlier development milestones are recorded in [ROADMAP.md](ROADMAP.md).
