# Beepster user guide

## Thread controls

| Button | Short press | Long press |
| --- | --- | --- |
| Top | Scroll up two text lines; at the top, select the previous message | Open quick replies |
| Center | Start voice dictation | Start voice dictation |
| Bottom | Scroll down two text lines; at the bottom, select the next message | Jump to newest message |
| Back | Return to the chat list or close the current screen | — |

Opening a thread always selects its newest message. The selected message expands in place; there is
no separate reading screen. Near the oldest loaded message, Beepster fetches another page without
jumping back to the bottom. The watch keeps at most 60 messages at once.

## Voice replies

Press or hold Center anywhere in a ready thread. Speak after Pebble opens dictation, then review the
transcript before confirming it. Beepster distinguishes four stages: sending to the Mac, accepted by
Beeper, confirmed by the messaging network, and failed/retryable.

After confirmed delivery, Beepster returns to the thread automatically. If confirmation is lost,
press Center to retry safely; the gateway uses the same request identifier to prevent a duplicate
send.

## Quick replies

Hold Top in a thread, then select one of up to eight saved replies. Quick replies may contain text or
emoji. Beepster sends the original saved reply even when the watch must display an unsupported emoji
as a readable fallback.

Edit replies in **Pebble mobile app → Beepster → Settings**. Blank slots are omitted.

## Themes and accessibility

Settings includes six presets and saved custom themes. A custom theme controls background, body,
muted, accent, and accent-text colors; Inter, Roboto, Open Sans, Montserrat, or Poppins; and 14, 18,
22, 26, or 30 point text.

Use **High Contrast** for maximum readability. Very large text intentionally shows fewer words per
screen but retains the complete message. A theme should remain stable while scrolling; report any
mid-thread color or size change as a bug.

## Emoji and rich messages

Pebble's font engine has limited emoji coverage. Supported symbols render natively. Unsupported
emoji become meaningful short labels such as `[thinking]`, `[rocket]`, or `[flag]` so content is not
silently lost. Instagram-style HTML is converted into readable paragraphs before reaching the watch.

## Photos, GIFs, and video

Selecting a message with media automatically requests one private preview. The Mac downloads or
opens the asset locally, scales it to watch-safe dimensions, converts it into Pebble's 64-color
format, deletes temporary files, and transfers only pixels plus an opaque identifier.

Photos display inline. GIFs and videos currently show a static poster frame; animation and multiple
attachments per message are not yet supported. Moving to another message cancels obsolete queued
preview chunks so the current content gets priority.

## Normal operating requirements

The Mac must be awake with Beeper Desktop and the Beepster companion running. Tailscale must be
connected on both Mac and phone. The Pebble mobile app provides the phone-to-watch transport. Cached
gateway data may remain readable briefly during a Beeper interruption, but sending requires all
parts of the path.
