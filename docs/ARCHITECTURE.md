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
small watch-oriented payload. It is responsible for contact resolution, opaque-cursor pagination, reply delivery
tracking, bounded caching, credential protection, and temporary attachment conversion. Attachment
source URLs never cross the gateway boundary: the phone receives an opaque ID and a bounded stream
of watch-native pixels.

The phone component is a transport adapter. It must not contain the Beeper Desktop token. The watch
owns presentation and interaction state and must remain understandable when transport is unavailable.
