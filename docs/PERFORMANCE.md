# Performance and reliability notes

Beepster 0.9.0 keeps the full 0.8.3 feature set and changes where repeated work happens.

## Implemented optimizations

- **Cached text layout:** Pebble's full paragraph measurement is expensive. A selected long message
  is now measured once per content/theme change, then reused for drawing, row sizing, and every
  two-line scroll step. Short previews are also cached per message.
- **Theme packets only when changed:** Earlier builds attached the complete theme to every loading,
  ready, and reply state. That repeatedly persisted colors, reloaded fonts, and rebuilt menu layout.
  The phone now sends theme data at startup and only after an actual settings change.
- **Scoped chat completion:** Background inbox refresh uses a dedicated `chats_ready` packet instead
  of a generic state that could turn an open thread into a loading screen.
- **Stale-response rejection:** A slow response for an abandoned thread or history page is ignored
  after a newer thread request begins.
- **Queue supersession:** When the selected message changes, unsent detail and image chunks for the
  old selection are removed while preserving the packet already in flight.
- **Bounded preview cache:** The Mac retains the eight most recently converted watch previews and
  coalesces simultaneous requests for the same attachment. Source URLs still never leave the Mac.

## Current resource envelope

The 0.9.0 Emery build uses about 102 KB of flash resources and 60 KB of static/runtime footprint,
leaving about 71 KB of reported heap. Most flash usage is the 25 combinations of five fonts and five
sizes; removing them would directly reduce theming functionality, so they remain.

## Deliberately deferred

- Binary phone preview transport could eliminate base64 overhead, but must first be verified against
  the older PebbleKit JavaScript runtimes on supported iOS and Android clients.
- Beeper's WebSocket events could reduce polling latency, but reconnection, background execution, and
  watch batching need reliability tests before replacing the current bounded REST flow.
- Removing the legacy detail-window implementation would save some source and runtime objects, but
  its shared buffers must first be separated from the inline full-message reader.
- Optional font packs could reduce PBW size, but would fragment theme compatibility and complicate
  installation.

Performance changes must preserve complete messages, delivery confirmation, theme stability, media,
emoji fallbacks, and explicit error states. See [UX requirements](UX_REQUIREMENTS.md).
