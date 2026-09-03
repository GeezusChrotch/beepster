# Architecture

```text
Pebble watch (C)
    ⇅ AppMessage
PebbleKit JS on phone
    ⇅ private HTTPS with Beepster gateway credential
Beepster gateway on Mac
    ⇅ localhost with Beeper Desktop token
Beeper Desktop API
```

The gateway subscribes to or queries the official Beeper Desktop API and returns a deliberately
small watch-oriented payload. It is responsible for contact resolution, opaque-cursor pagination,
reply delivery tracking, bounded stale-data fallback, an eight-entry memory-only preview cache,
credential protection, and temporary attachment conversion. Attachment
source URLs never cross the gateway boundary: the phone receives an opaque ID and a bounded stream
of watch-native pixels.

The phone component is a transport adapter. It must not contain the Beeper Desktop token. The watch
owns presentation and interaction state and must remain understandable when transport is unavailable.

The public first-run page contains no backend and no Beepster credential. It accepts a private HTTPS
gateway address in the browser and redirects directly to that Mac's `/configure` page. The dynamic
gateway page performs the one-time pairing exchange and returns settings to PebbleKit JS.
