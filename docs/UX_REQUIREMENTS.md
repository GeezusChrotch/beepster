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

## Navigation and loading

- Select on a chat always opens that chat.
- Select on a message starts a confirmed voice reply.
- Long Select on a message labeled Photo, GIF, or Video opens its full-screen preview.
- A chat shows cached messages immediately when available.
- Every fetch ends in content, empty, timed-out, offline, or error state—never a blank view.
- Retry must be available without leaving the chat.

## Replies

- Confirm a voice transcript before transmission.
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
