# Beepster 0.18.0 — Clearer photos and lighter browsing

## What's new

- **Better photos:** Natural (default), High contrast, and Original modes in
  phone settings. Display-aware color matching and light dithering improve small
  previews; Original retains the prior conversion. Transparent PNG conversion is
  handled correctly. Source attachments are never modified.
- **Smaller inbox batches:** 12 conversations per batch instead of 30. The current
  list stays visible while the next batch arrives and is replaced only when complete.
  One conversation overlaps between batches, keeping your place at the boundary.
- **Notesy-style navigation:** swipes move the centered selection; reaching a
  boundary automatically requests the adjacent batch. No separate paging button or
  loading screen between conversation batches. Returning from a message keeps an
  older inbox page in place. Jump to newest still intentionally returns to the top.
- **Readable links:** HTML/Markdown links show their labels; bare web addresses
  show the site name. An optional Hide links setting removes link labels/addresses
  without changing surrounding text, outgoing replies, or agent approval descriptions.
- **Less transfer overhead:** larger full-message chunks and prioritized reply
  status packets reduce unnecessary waiting behind queued message/media content.

## Updating

Update [Organik Apps Pebble Connector to 0.8.0 or newer](https://github.com/GeezusChrotch/organik-pebble-connector/releases/latest)
on the Mac, then install Beepster 0.18.0 on the watch. Both are required for the new
image modes and link settings. Pairing, custom buttons, themes and saved replies
are preserved. Choose Photo appearance in Beepster's phone settings, then reopen
the chat to reload its photos. No terminal setup is required for normal installation.

Requires Pebble Time 2, macOS 14 or newer, Beeper Desktop, and Tailscale on the Mac
and paired phone. Keep the Mac awake, Beeper signed in, and the background gateway
running. iPhone is the tested phone setup. See the
[installation guide](https://geezuschrotch.github.io/beepster/INSTALL) and
[user guide](https://github.com/GeezusChrotch/beepster/blob/main/docs/USER_GUIDE.md).

## Validation and limits

The pre-release image changes received positive owner feedback on the physical
watch. The latest small-batch candidate was installed successfully, but has not
received a separate owner acceptance report for its final paging behavior. The
0.18.0 release is a version-restamped build of that candidate, not a new full
physical-watch regression run. Automated tests, build and package privacy checks
are separate gates.

- Paging is bounded, not an unlimited in-memory list. Navigation briefly pauses
  while a batch transfers; initial startup and message loading can still show Loading.
- Browsing older conversation pages retains their snapshot rather than silently
  resetting to the newest page. Use Jump to newest to refresh the newest inbox.
- Color matching approximates one lighting condition; actual appearance varies
  with lighting and backlight. GIFs remain static previews, not animation.
- Up to 60 messages are loaded per chat window; text and media caches remain bounded.
- iMessage message deletion remains disabled; conversation archiving is available.
- Hermes/OpenClaw remain optional, explicitly linked integrations. Approval
  delivery is not proof that the agent completed the requested action.

## Feedback welcome

[Report a bug or suggest an improvement](https://github.com/GeezusChrotch/beepster/issues/new/choose).
Include watch/Connector versions, theme, reproduction steps, and expected versus
actual behavior. Remove private messages, contact details, credentials and private
network addresses before sharing screenshots or logs.
