# Changelog

## 0.21.0 — Safer dictation and stable conversation position

- Own status/error strings instead of retaining temporary phone-message buffers.
- Guard repeated dictation starts, handle failed starts, and defer sending until
  the dictation callback returns. Keep the original recipient and discard a
  pending transcript if navigation changes it. Pause view refresh/read requests
  while dictating and add diagnostics without logging transcript text.
- Preserve the selected conversation and its screen position when unread counts
  or background list refreshes change rows, including reordered/removed rows.
- Correct unread-count change detection. Add bounded read-through requests when
  the newest messages are displayed; never mark older history or approval cards
  read simply because they were fetched.
- Automatic read-through requires a matching updated gateway. Released Connector
  0.8.7 supports the other fixes but does not contain the new read route.
- Retain 0.20.0 reactions, full-width photos, short GIF previews and thumbnails.

See [compatibility and validation](docs/RELEASE_NOTES_0.21.0.md).

## 0.20.0 — Reactions and full-width media

- Show Beeper-supplied reactions beneath messages, grouped by sender with bitmap
  emojis and matching sender indicators, including Apple Messages reactions.
- Fill the message width with photos, GIFs, and video thumbnails while preserving
  aspect ratio. Retry smaller bitmap allocations under memory pressure instead of
  losing large photos, and preserve useful allocation errors.
- Play bounded six-frame GIF previews, with reduced-frame or still fallback on
  memory-constrained watches. Fix filename-only GIF detection, animation repaint
  scheduling, and neighboring text prefetch canceling active media.
- Add YouTube thumbnails, retrying a constrained public thumbnail when Beeper's
  cached image expires. Hide links also hides these cards.
- Replace media-only empty-text errors with clean captions; allow tapping failed
  media to retry. Add a managed-runtime Apple Messages permission probe and clear
  access-denied errors for the unified Connector's guided permission setup.
- Require Connector 0.8.7 or newer for the matching gateway and permission UI.

See [update instructions, privacy notes, and validation](docs/RELEASE_NOTES_0.20.0.md).

## 0.19.0 — Larger icons and clearer sender indicators

- Double the sender stripe from 3 to 6 pixels without reducing message text width.
- Enlarge service icons from 14 to 18 pixels and reserve matching space beside names.
- Enlarge chat emoji from 18 to 24 pixels and emoji replies from 20 to 26 pixels.
  Rebuild bundled fallback artwork to match downloaded emoji sizes.
- Update inline measurement, wrapping, and bounded atlas handling for the larger
  emoji. Preserve existing themes, button assignments, pairing, and reply choices.

See [update instructions and validation](docs/RELEASE_NOTES_0.19.0.md).

## 0.18.0 — Clearer photos and lighter conversation browsing

- Add Natural, High contrast and Original photo modes in phone settings, with
  display-aware palette matching and light dithering. Support transparent and
  opaque 32-bit macOS bitmap conversion as well as 24-bit input.
- Use 12-conversation rolling batches with one shared boundary conversation.
  Keep the previous list visible while receiving an entire replacement batch;
  remove full-screen loading between conversation batches.
- Match Notesy's centered swipe selection and automatic boundary paging. Retain
  older-page position when returning from an open chat; explicit Jump to newest
  still reloads the newest inbox. Touch cannot decide agent approvals.
- Show HTML/Markdown links as labels and bare URLs as site names. Add Hide links
  to phone settings without changing outgoing replies or approval descriptions.
- Prioritize reply status packets over queued content and increase full-message
  chunk size, reducing transfer overhead. Retry paging blocked by an active refresh.
- Require unified Connector 0.8.0 or newer for matching image/link modules.

See [release notes and validation limits](docs/RELEASE_NOTES_0.18.0.md).

## 0.17.0 — Smooth scrolling, reliable refresh, and simpler controls

- Use a continuous, finger-following chat timeline with clipped, recycled visible
  cells, measured message heights, and bounded full-text caching. Fix overlapping
  senders, cut-off message bottoms, blank gaps and drawing corruption at the edges.
- Keep text layout and content hydration stable during dragging. Button scrolling
  moves one text line; remove the obsolete configurable scroll-distance setting.
- Swipe right from a chat to return to the conversation list. Tapping a message
  only focuses it; remove tap-to-dictate while keeping approvals physical-button-only.
- Default long presses in both views: Top quick reply, Middle dictate, Bottom
  delete/archive with confirmation. Short Middle opens a chat in the list and does
  nothing in a chat. Double Back defaults to the top of the newest conversation list.
- Keep all button assignments configurable. Migrate unchanged old defaults while
  preserving custom mappings, pairing, themes and reply choices.
- Retry dropped view-state signals so chat refresh can resume after a busy watch
  connection. Include real messages in change detection even behind approval rows.
- Retain the default 15-second live-refresh delay, service filters, bitmap emoji,
  static photo previews, and optional linked Hermes/OpenClaw approval controls.

See [release notes and validation limits](docs/RELEASE_NOTES_0.17.0.md).

## 0.16.0 — Two-step touch and consistent settings

- Tap a different menu row to highlight it and read its scrolling title; tap the
  highlighted row again to activate. This is not a timed double-tap gesture.
- Tap a highlighted ordinary message to dictate a reply, with dictation confirmation.
- Keep approval requests and choices tap-inert, including Always confirmation;
  physical-button decisions remain available. Preserve swipe scrolling and button bindings.
- Unify phone settings into Setup, Themes, Shortcuts and Replies with palette and
  preview controls, preserving existing saved themes, pairing and save payloads.
- Include Connector-owned Telegram discovery and per-linked-thread prompt setup updates.
- Retain emoji-label capacity using heap storage to fit the watch's static-size limit.

## 0.15.0 — Hermes and OpenClaw approval controls

- Add opt-in Hermes bridge and Connector-led agent/session-to-Telegram-chat linking
  for Hermes and OpenClaw. Local Mac setup, enablement and unlinking require no Terminal.
- Replace timestamp/keyword guessing with scoped approval cards inside the chosen chat.
- Bind one-use, short-lived decisions to the agent, session, conversation and request;
  reject changed, expired, disabled and duplicate approvals. Retire unscoped endpoints.
- Freeze the selected approval while its watch menu is open, preserve literal command
  text, and prevent approval cards from falling back to canned replies or deletion.
- Add high-contrast selected action rows, one-choice up/down navigation and hold-center
  activation. Chats open at the request, not a decision; Always requires confirmation.
- Send exact-ID OpenClaw Telegram reply commands with advertised decisions. Provide
  a backed-up, version-guarded text fallback installer for OpenClaw 2026.9.1 change cards.
- Preserve Hermes Telegram confirmation behavior and distinguish command delivery
  from the agent's final result. Wait for a busy watch outbox before initial submission.
- Retain the 512-byte reply buffer using heap storage to fit Pebble's static-image limit.
- Physical watch approval-menu test confirmed; see [setup and limits](docs/AGENT_APPROVALS.md).

## 0.14.0 — Archiving, readability, and safer deletion

- Archiving keeps the loaded conversation page and selects the next conversation (or previous
  when archiving the last one), instead of jumping to the newest inbox page.

- Temporarily block iMessage message deletion in the phone and gateway while retaining thread
  archiving. Other services retain deletion support; unidentified services fail closed.

- Encode delete-for-me explicitly as an empty query value to avoid Beeper's REST
  boolean coercion interpreting the string "false" as delete-for-everyone.

- Accept empty successful Beeper responses for archive and delete instead of reporting a false 502.
- Explain missing cached photos and unconfirmed deletions instead of showing only HTTP error codes.
- Prioritize deletion confirmations over queued media, ignore stale refresh responses after deletion,
  preserve remaining history, and time out the watch's pending-action screen without automatic retries.
- Keep the chosen font throughout message bodies, fall back only for individual Unicode glyphs,
  and use consistent measured line spacing for layout and scrolling.

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
