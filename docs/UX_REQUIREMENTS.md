# UX requirements

## Contact names

For a direct chat, resolve the display label in this order:

1. Non-self participant `fullName`
2. Merged Beeper contact name
3. Read-only macOS Contacts match by normalized phone number or email
4. Beeper chat title
5. Network handle or `Unknown contact`

Stable chat IDs, never display names, are used for navigation and replies.
Apple email and phone destinations that match the same exact Mac Contacts record are represented by
one virtual watch thread. Display-name equality alone must never trigger a merge.

## Readability

- Render natively for Emery at 200×228.
- Offer Pome's Time 2 font families—Inter, Roboto, Open Sans, Montserrat, and Poppins—at 14, 18,
  22, 26, and 30 points, with 22 points as the readable default.
- Use Pebble Gothic as a per-string fallback when a bundled ASCII font would hide a native emoji.
- Treat 14 px text as optional metadata only.
- Respect the user's content-size preference before increasing information density.
- Never rely on color alone to communicate selection or status.

## Themes

Beepster ships with six semantic presets and saved custom themes. Layout and delivery behavior remain identical across them:

- `Classic`: white background, black text, Pebble blue selection
- `Dark`: black background, white text, cyan selection
- `Ocean`: deep blue background, white text, bright blue selection
- `Contrast`: white background, black text, black selection
- `Plum`: deep plum background, light text, purple selection
- `Forest`: deep green background, light text, green selection

Theme colors are applied through semantic roles (`background`, `text`, `muted`, `accent`, and
`accentText`) rather than scattered color constants. Every preset must pass an emulator screenshot
review, and information must remain understandable without color.

## Emoji

- Offer all fully qualified Unicode Emoji 17.0 choices in the Mac-hosted Settings picker, using
  consistently licensed Twemoji artwork.
- Let users choose and order exactly 15 bitmap emoji beneath saved quick replies; send the original
  Unicode sequence rather than the display bitmap.
- Replace emoji in chat text with inline bitmap cells, including variation selectors, skin tones,
  flags, and zero-width-joiner sequences.
- Keep the complete catalog off the watch. Generate and transfer only bounded atlases for the chosen
  reply set and current chat so Pebble RAM and AppMessage traffic remain predictable.
- Use `[emoji]` when the bounded current-chat cache is exceeded; never silently delete content.

## Rich message text

- Convert network-provided HTML to readable plain text at the Mac gateway boundary.
- Preserve paragraphs, line breaks, quote boundaries, link labels, and image alternative text.
- Decode safe named and numeric entities, including emoji code points.
- Never send HTML tags, scripts, styles, source URLs, or anchor tracking URLs to the watch.

## Navigation and loading

- Prefix chat titles and message senders with a compact, theme-colored service icon. Cover Discord,
  Google Messages, Google Chat, Google Voice, Instagram, LinkedIn, Signal, Slack, Telegram, X,
  WhatsApp, Messenger, iMessage, LINE, Beeper/Matrix, and an unknown-network fallback.
- Settings expose an included-services checklist. All services are enabled by default, the selection
  persists without re-pairing, and unknown networks are controlled by an `Other services` option.
- Ship with Select opening a chat and Hold Select pinning or unpinning it as defaults. Settings must
  expose press and hold for all three buttons independently in Threads and Chat, for 12 bindings.
  Available actions are scroll up, scroll down, open selected chat, dictate, quick reply, pin/unpin,
  and jump to newest. Jump to newest must work in both views. Pinned chats sort above recent chats,
  display a text label rather than relying on color alone, and persist by stable chat ID on the phone.
- Keep at most 30 chats resident on the watch. Show explicit older/newer navigation rows backed by
  opaque Beeper cursors so all enabled Primary, Low Priority, and Archived chats remain reachable.
- Opening a chat selects its newest message at the bottom of a chronological timeline.
- Reaching an Older or Newer conversations boundary by scrolling starts that page load immediately;
  pagination never requires a separate confirmation press and always shows a loading state.
- Moving upward near the oldest loaded message fetches an earlier page without jumping back to the
  newest message; keep up to 60 messages available on the watch.
- The selected message expands to its complete text directly in the chronological thread; there is
  no separate message-reading screen.
- By default, Press or Hold Select in a thread starts confirmed voice dictation, Hold Up opens quick
  replies, and Hold Down jumps to the newest message.
- Settings expose a one-to-eight lines-per-scroll value, defaulting to two. Each configured scroll
  action moves that many text-line heights within an oversized selected
  message; at its beginning or end, the same button moves to the adjacent message.
- Thread backgrounds and body text always use the saved theme colors; selection may accent the
  sender and service icon but must never invert an entire message or change its text color.
- Normalize smart punctuation to watch-safe equivalents so it does not force an otherwise ordinary
  message into Pebble's emoji fallback font.
- Automatically load a selected Photo, GIF poster, or Video poster inline. Keep one decoded preview
  in watch memory at a time and show an explicit loading or failure label while it is unavailable.
- A chat shows cached messages immediately when available.
- Every fetch ends in content, empty, timed-out, offline, or error state—never a blank view.
- Retry must be available without leaving the chat.
- Thread rows reserve a separate metadata strip so body text and inline media cannot collide with time.
- Oversized selected chat names, sender names, and quick replies marquee after a short pause; moving
  selection resets the label to its beginning.

## Replies

- Confirm a voice transcript before transmission.
- Send a selected canned reply immediately, using the exact phone-side text so configured emoji are
  preserved even when the watch label needs a glyph-safe fallback.
- Allow zero to eight canned replies and persist their watch labels across app restarts.
- Show `Sending` while queued or awaiting Beeper.
- Show `Sent` only after Beeper accepts the message.
- Preserve failed text and offer Retry and Cancel.
- Use a client-generated operation ID to prevent duplicate sends during retries.

## Attachments

- Show a visible media label in the message row; never replace text with a blank row.
- Keep media source URLs and local file paths on the Mac gateway.
- Bound previews to 180×180 and preserve aspect ratio for the 200×228 Time 2 display.
- Report loading, unsupported, incomplete-transfer, and memory failures in text.
- Label GIF and video poster frames honestly until animated playback is implemented.
