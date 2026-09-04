# Beepster user guide

The inbox keeps a rolling window of up to 30 conversations on the watch while the phone pages
through the complete selected Beeper inboxes. Pinned chats appear first, followed by recent chats.
Service filters are applied while fetching, so excluded services do not leave the watch page half
empty.

## Inbox controls

These are the default controls. Open **Beepster Settings → Buttons** to assign any available action
to each Top, Center, and Bottom press or hold independently for the Threads and Chat views.

| Button | Short press | Long press |
| --- | --- | --- |
| Top | Move to the previous chat | Move to the previous chat |
| Center | Open the selected chat | Pin or unpin the selected chat |
| Bottom | Move to the next chat | Move to the next chat |
| Back | Close Beepster | — |

An **Older conversations >** row appears after the last loaded chat when more history is available.
Scrolling onto it automatically loads the next page; no extra Center press is needed. Scrolling onto
**< Newer conversations** at the top of an older page automatically goes back. Beepster displays its
loading notice during the page change. The phone caches fetched pages while the watch retains only
its current 30-chat window.

A pinned conversation moves into the pinned group at the top and displays a clear **PIN** badge.
The most recently pinned conversation appears first. Hold Center on it again to unpin it. Pins are
stored by stable chat ID on the phone and survive normal refreshes and app restarts.

## Thread controls

These defaults are also customizable in the **Buttons** tab. **Lines per scroll** can be set from
one to eight; it defaults to two.

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

Below the saved replies, the **Emoji replies** section offers 15 crisp bitmap icons. In Settings,
select any slot to search or browse the complete emoji catalog, then use the arrow controls to put
the choices in your preferred order. Selecting one on the watch sends the real Unicode emoji; the
image is only its watch display. This section remains available even when no saved replies are
configured.

Edit replies and emoji slots in **Pebble mobile app → Beepster → Settings**. Blank quick-reply slots
are omitted; all 15 emoji slots remain available.

## Custom button controls

The **Buttons** tab contains 12 independent assignments: press and hold for Top, Center, and Bottom
in both the Threads list and an open Chat. Available actions are Scroll up, Scroll down, Open
selected chat, Dictate reply, Quick reply, Pin / unpin, and Jump to newest. Jump to newest works in
both views. Delete is also available: in Threads it archives the selected conversation, while in
Chat it deletes the selected message for you. Repeat the configured Delete gesture within six
seconds to confirm; using another action or waiting cancels it. Message deletion depends on the
underlying network's Beeper capability and may be refused. Button choices and the lines-per-scroll
value persist on the phone and watch.

## Included messaging services

Open Beepster Settings and use **Included services** to choose which networks appear in the watch
inbox. All services are enabled by default. You can select any combination—including only Apple
Messages—and save without pairing again. Unknown or newly added Beeper networks are controlled by
**Other services**.

Use **Inbox sections** to include Primary, Low Priority, or Archived conversations. Primary is the
default. When multiple sections are enabled, Beepster pages through them in that order.

## Optional OpenClaw approvals

After enabling and pairing **OpenClaw Approvals** in **Beepster Connector → Advanced options**, turn on **Show
pending OpenClaw approvals** in phone Settings. A synthetic **OpenClaw Approvals** conversation
appears at the top only while one or more protected actions are pending. Each row contains a
sanitized description supplied by the local OpenClaw Gateway.

Select the exact approval, open Quick replies (the configured Dictate action also opens this menu
inside the approvals conversation), and choose **Allow once** or **Deny**. Beepster rechecks that the
same opaque approval ID is still pending immediately before resolving it. There is deliberately no
Allow always choice. The OpenClaw identity and scoped token stay on the Mac; the phone and watch
receive only sanitized summaries and opaque pending IDs.

## Linking split Apple conversations

Apple Messages may appear through Beeper as separate email and phone conversations even when the
Messages app presents them as one person. When both identifiers match the same Mac Contacts record,
Beepster combines them automatically. The watch shows one thread with both histories in
chronological order, and replies use the most recently active underlying conversation.

For group threads whose Beeper title is only a list of phone numbers or email addresses, Beepster
builds a readable title from resolved participant names and adds a compact `+N` when some members
cannot be named. Meaningful group titles supplied by Beeper are kept unchanged.

If an identifier is missing from Contacts, use **Link Apple conversations** in Settings and enter
the same contact name beside both entries. Beepster uses exact contact identity or an explicit
alias; it never guesses from display names and never changes the source conversations.

## Mac Connector

Open **Beepster Connector** from Applications and select **Set Up Beepster** for the complete guided
Mac setup. **Connect Phone** puts the private address and pairing code in one place, and **Test
Everything** verifies Contacts, a live Beeper request, and the private phone route. Individual
install, token, permission, route, and documentation controls remain under **Advanced options**.
No Beeper or gateway token is shown or copied, and normal use requires no Terminal commands.

The Connector window is only for setup, status checks, and repairs; it does not need to stay open.
Closing its window quits the Connector app without stopping the separate Beepster background
service. Keep the Mac awake, Beeper Desktop open and signed in, and Tailscale connected while using
Beepster.

## Themes and accessibility

Settings includes six presets and saved custom themes. A custom theme controls background, body,
muted, accent, and accent-text colors; Inter, Roboto, Open Sans, Montserrat, or Poppins; and 14, 18,
22, 26, or 30 point text.

Use **High Contrast** for maximum readability. Very large text intentionally shows fewer words per
screen but retains the complete message. A theme should remain stable while scrolling; report any
mid-thread color or size change as a bug.

## Emoji and rich messages

The Mac Connector includes the complete Unicode Emoji 17.0 catalog and matching Twemoji artwork.
Emoji in the active part of a chat are sent as a small Pebble-ready bitmap atlas, so faces, skin
tones, flags, families, and other joined sequences no longer depend on Pebble's limited fonts. The
watch keeps a bounded set of current emoji images in memory; if an unusually emoji-heavy loaded
history exceeds that cache, additional symbols use a visible `[emoji]` fallback rather than being
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
