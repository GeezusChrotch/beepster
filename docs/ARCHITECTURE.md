# Architecture

```text
Pebble watch (C)
    ⇅ AppMessage
PebbleKit JS on phone
    ⇅ private HTTPS with Beepster gateway credential
Beepster gateway on Mac
    ⇅ localhost with separate Mac-only credentials
Beeper Desktop API          OpenClaw Gateway (optional approvals)
```

The gateway subscribes to or queries the official Beeper Desktop API and returns a deliberately
small watch-oriented payload. It is responsible for contact resolution, opaque-cursor pagination,
reply delivery tracking, bounded stale-data fallback, an eight-entry memory-only preview cache,
emoji tokenization and atlas generation, credential protection, and temporary attachment conversion. Attachment
source URLs never cross the gateway boundary: the phone receives an opaque ID and a bounded stream
of watch-native pixels.

The Connector bundles the complete Unicode Emoji 17.0 metadata and a quantized Twemoji atlas. Its
settings page uses the full catalog for visual search and ordering. For watch display, the gateway
crops only the requested reply or current-chat cells into a compact 8-bit Pebble atlas; the phone
streams that atlas and maps message tokens to stable local slots. The complete atlas and catalog are
never loaded into watch memory.

For an Apple message participant that Beeper exposes only as an email address or phone number, the
gateway can invoke the local `beepster-contacts` helper. The helper scans macOS Contacts locally for
a normalized, exact match and returns the display name plus an opaque hash of the matching Contacts
record identifier. The raw record identifier never leaves the helper. Successful matches are cached
for six hours and misses for fifteen minutes.

The gateway also keeps a bounded cache of recent chat participants and resolved display names.
When Beeper omits a message's optional sender name or returns a raw identifier, direct messages use
the resolved conversation contact. Group messages match the sender ID against Beeper participants
and account contacts, then use an exact email or phone match from macOS Contacts when available.
A readable sender name supplied by Beeper remains authoritative.

When Beeper exposes one Apple contact as separate email and phone chat IDs, matching opaque contact
hashes link them automatically. A user can assign the same local alias when an identifier is not in
Contacts. PebbleKit JS constructs a virtual chat ID, combines and sorts bounded message pages from
the underlying chats, and routes replies to the most recently active member. The alias map stays in
Pebble app storage; the gateway and upstream chats are unchanged.

The phone component is a transport adapter. It must not contain the Beeper Desktop token. The watch
owns presentation and interaction state and must remain understandable when transport is unavailable.

The public first-run page contains no backend and no Beepster credential. It accepts a private HTTPS
gateway address in the browser and redirects directly to that Mac's `/configure` page. The dynamic
gateway page performs the one-time pairing exchange and returns settings to PebbleKit JS.

When explicitly enabled, the gateway also owns a separate Ed25519 identity for the local OpenClaw
Gateway. It requests only `operator.approvals`. Pending exec and plugin approvals are converted to
sanitized watch messages in a synthetic conversation; raw unmodeled
payload fields never cross the gateway boundary. Resolution accepts only `allow-once` or `deny` and
rechecks the exact opaque ID against the current pending list immediately before sending
the matching OpenClaw approval resolver.
