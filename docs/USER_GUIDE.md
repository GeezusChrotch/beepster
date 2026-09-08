# Beepster user guide

Beepster 0.19.0 uses larger 18-pixel service icons, 24-pixel chat emoji and
26-pixel emoji replies, plus a wider 6-pixel sender stripe. Update Connector to
0.8.2 or newer and choose Beepster → Set up service for matching downloaded emoji.

The inbox keeps a rolling window of up to 12 conversations on the watch while the phone pages
through the complete selected Beeper inboxes. Pinned chats appear first, followed by recent chats.
Service filters are applied while fetching, so excluded services do not leave the watch page half
empty.

## Inbox controls

These are the default controls. Open **Beepster Settings → Buttons** to assign any available action
to each Top, Center, and Bottom press or hold independently for the Threads and Chat views.

| Button | Short press | Long press |
| --- | --- | --- |
| Top | Move to the previous chat | Quick reply |
| Center | Open the selected chat | Dictate |
| Bottom | Move to the next chat | Archive (repeat to confirm) |
| Back | Close Beepster | — |

Scrolling beyond the last loaded conversation automatically loads the next page;
scrolling above an older page loads the newer page. There are no visible paging
labels and no extra Center press is needed. The current list stays visible while
the next batch arrives, then switches as a complete batch with the boundary chat
still selected. Navigation briefly pauses during the transfer. The phone caches
fetched conversations; each watch batch contains up to 12, with one shared
conversation between adjacent batches. Initial startup can still show Loading.

A pinned conversation moves into the pinned group at the top and displays a clear **PIN** badge.
The most recently pinned conversation appears first. Hold Center on it again to unpin it. Pins are
stored by stable chat ID on the phone and survive normal refreshes and app restarts.

## Thread controls

### Message reactions

Reactions supplied by Beeper appear beneath their original message, grouped by
person with that sender's color stripe, name and bitmap emoji. Reaction changes
are included in live refresh. Hidden bridge tapback notices are not shown as
separate messages; ordinary visible replies are not guessed to be reactions.
Long reaction groups can wrap. If a message exceeds the watch's compact reaction
budget, an explicit “+ more reactions” line is shown. Custom network reaction
images without a supported emoji use their reaction label instead.


These defaults are customizable in the **Buttons** tab. Scroll actions always move
one text line per button press; scroll distance is not configurable.

| Button | Short press | Long press |
| --- | --- | --- |
| Top | Scroll up one text line | Open quick replies |
| Center | No action | Start voice dictation |
| Bottom | Scroll down one text line | Delete selected message (repeat to confirm) |
| Back | Return to the chat list or close the current screen | — |

In the conversation list, the same long presses open quick replies, dictate, and
archive the selected conversation (with confirmation). Short Center opens the chat.
Double-press Back in either view to return to the top of the newest conversation
list. Unchanged old defaults migrate; customized mappings are preserved.

Opening a thread always selects its newest message. The selected message expands in place; there is
no separate reading screen. Near the oldest loaded message, Beepster fetches another page without
jumping back to the bottom. The watch keeps at most 60 messages at once.

## Voice replies

Hold Center on an ordinary message in a ready thread. Speak after Pebble opens dictation, then review the
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

The phone **Shortcuts** tab contains 14 independent assignments: press and hold for Top, Center, and Bottom
in both the Threads list and an open Chat, plus Double Back for each view. Double Back means two quick presses and defaults to Top of conversation list. Single Back still returns; approval rows permit this safe navigation action but ignore other custom Double Back actions. Theme and button settings live on the phone. Available actions include Top of conversation list, Scroll up, Scroll down, Open
selected chat, Dictate reply, Quick reply, Pin / unpin, and Jump to newest. Jump to newest works in
both views. Delete is also available: in Threads it archives the selected conversation, while in
Chat it deletes the selected message for you. Repeat the configured Delete gesture within six
seconds to confirm; using another action or waiting cancels it. Message deletion depends on the
underlying network's Beeper capability and may be refused. Button choices persist
on the phone and watch.

**iMessage message deletion is temporarily disabled** because Beeper's Apple Messages automation
has failed to verify its deletion target reliably. Delete in the Threads view still archives the
conversation. No messages are silently hidden or deleted for everyone as a substitute.

## Included messaging services

Open Beepster Settings and use **Included services** to choose which networks appear in the watch
inbox. All services are enabled by default. You can select any combination—including only Apple
Messages—and save without pairing again. Unknown or newly added Beeper networks are controlled by
**Other services**.

Use **Inbox sections** to include Primary, Low Priority, or Archived conversations. Primary is the
default. When multiple sections are enabled, Beepster pages through them in that order.

## Optional Hermes and OpenClaw approvals

### Touch navigation

With touch enabled, tap an ordinary message in an open chat to focus it.
Tapping again does not start dictation; use the configurable physical buttons.
Drag vertically to scroll the continuous chat timeline: text follows your finger
while it is down and stays where you leave it. Physical Up/Down scrolling moves
by one text line per press, including across message boundaries. Swipe right to
return from the chat to the thread list. Visible
neighbors load their full text too; a small `…` indicator distinguishes a temporary
preview from a complete message. Taps on approval requests or decision controls do not
dictate or approve anything; leave approval selection before starting a reply.
Taps also do not retry a failed send or interrupt an in-progress send. This local
behavior requires watch version 0.17.0. Approval requests and decisions remain
tap-inert even when highlighted; use the physical buttons for approval actions.

Follow [agent setup](AGENT_APPROVALS.md) in the unified Connector and enable
**Show pending agent approvals** in phone settings. Link the agent session explicitly
to the matching Beeper Telegram conversation. Requests and choices appear inside
that chat; no separate approval thread is required.

Read the request, then use Up/Down to select **Approve once**, **Deny**, or supported
**Always approve**. The selected control has a black background and white text.
Hold Center to activate; scrolling and a short Center press do not approve anything.
Always requires a second confirmation. You can scroll back to the request at any time.
Beepster rechecks the exact request before sending a decision. Check the agent's
response in chat: **Sent** means command delivery, not proof a change was applied.

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

Open **Organik Apps Pebble Connector → Beepster**. Requirements shows setup status, Connect
provides guided setup and phone pairing, and Troubleshooting holds individual repairs and optional
OpenClaw setup. Keep Beeper Desktop running. The Beeper token stays on the Mac; use only the
provided private setup address and pairing code on your phone.

The connector window can close. Beepster keeps its own background service. Existing users can
[migrate without resetting pairing](UNIFIED_CONNECTOR.md). The old standalone UI is documented
in [legacy installation](INSTALL_STANDALONE.md).

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

Photos display inline. Photos, GIFs, and video thumbnails fill the available message width
while preserving their aspect ratio; taller images scroll with the conversation. Enlarging
the display does not require a larger image buffer. GIF files can play a short, reduced-detail
loop: up to six frames, four frames per second, and 72 source pixels on the longest side.
If a full-resolution preview cannot fit in watch memory, Beepster retries with a smaller
pixel buffer while keeping the same full-width display and aspect ratio.
The current preview animates; it pauses while dragging or viewing another screen. Long GIFs show the first 1.5 seconds.
Large, unsupported, or visually static GIFs fall back to a still image, as does animation when
the watch cannot allocate even a two-frame loop. Under memory pressure Beepster first tries
fewer frames sampled across the loop instead of immediately switching to a still. Video-based GIFs and ordinary videos retain a poster
frame; this is not video playback. Multiple attachments per message are not yet supported.
Moving to another message cancels obsolete queued preview chunks so current content gets priority.

Apple Messages keeps some attachments in a macOS-protected folder. If a preview reports blocked
Mac media access, open the unified Connector's **Beepster** page and its optional Apple Messages
attachment-access step. Open the access settings, add/enable the highlighted Beepster background
component (`node`) in Full Disk Access, then use **Restart and recheck**. macOS requires you to
grant this permission yourself. The check runs in the background gateway, not just the Connector
window, and does not list attachment names or read message contents. Other messaging services
and public YouTube thumbnails do not require this Apple Messages folder permission.

YouTube links show the video title and a thumbnail when available, including watch, youtu.be,
Shorts and live-video links. The Connector prefers Beeper's local preview. Otherwise it fetches
only the recognized video's thumbnail from YouTube's image host, without sending Beeper credentials
or message text. Missing thumbnails leave the title readable. The existing Hide links setting
also hides these link cards; normal attached photos are unaffected.

## Normal operating requirements

The Mac must be awake with Beeper Desktop and the Beepster companion running. Tailscale must be
connected on both Mac and phone. The Pebble mobile app provides the phone-to-watch transport. Cached
gateway data may remain readable briefly during a Beeper interruption, but sending requires all
parts of the path.
# Photos and touch selection

Phone settings now include Photo appearance: Natural (default), High contrast,
and Original. Reopen a chat after changing the setting to reload its photos.
The conversion runs on the Mac; it does not increase watch image dimensions or
transfer size. Natural and High contrast use approximate display-aware colors.

Swiping the conversation list moves the highlighted conversation one row and
keeps it centered, matching Notesy. Tap once to focus a row and again
to open it. Reaching an available page edge automatically loads the adjacent
batch of 12 after a short pause. The current list stays visible while that batch
arrives; there is no full-screen loading page between batches. The boundary conversation is retained and selected
on the new page, so you can open it or continue scrolling without skipping it.
