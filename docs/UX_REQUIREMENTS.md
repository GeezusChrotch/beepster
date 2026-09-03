# UX requirements

## Contact names

For a direct chat, resolve the display label in this order:

1. Non-self participant `fullName`
2. Merged Beeper contact name
3. Read-only macOS Contacts match by normalized phone number or email
4. Beeper chat title
5. Network handle or `Unknown contact`

Stable chat IDs, never display names, are used for navigation and replies.

## Readability

- Render natively for Emery at 200×228.
- Use high-contrast system fonts at 18 px or larger for primary information.
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

- Preserve Pebble's documented native emoji subset in Gothic 18/24 fonts.
- Never truncate between UTF-16 surrogate halves.
- Remove presentation selectors and skin-tone modifiers that Pebble cannot render independently.
- Convert common unsupported emoji to meaningful aliases such as `[thinking]` or `[rocket]`.
- Use `[emoji]` only when no useful alias exists; never silently delete message content.
- Evaluate a compact optional bitmap atlas later for high-frequency unsupported emoji.

## Rich message text

- Convert network-provided HTML to readable plain text at the Mac gateway boundary.
- Preserve paragraphs, line breaks, quote boundaries, link labels, and image alternative text.
- Decode safe named and numeric entities, including emoji code points.
- Never send HTML tags, scripts, styles, source URLs, or anchor tracking URLs to the watch.

## Navigation and loading

- Select on a chat always opens that chat.
- Opening a chat selects its newest message at the bottom of a chronological timeline.
- Moving upward near the oldest loaded message fetches an earlier page without jumping back to the
  newest message; keep up to 60 messages available on the watch.
- Select on a message opens its complete text in a dedicated scrolling view.
- Select in the complete-message view starts confirmed voice dictation directly.
- Down in the complete-message view opens up to eight configured canned replies.
- Up advances through long message text; reopening the message returns to its beginning.
- Long Select on a message labeled Photo, GIF, or Video opens its full-screen preview.
- A chat shows cached messages immediately when available.
- Every fetch ends in content, empty, timed-out, offline, or error state—never a blank view.
- Retry must be available without leaving the chat.
- Message-list previews reserve a separate metadata strip so body text cannot collide with time or
  attachment labels.

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
