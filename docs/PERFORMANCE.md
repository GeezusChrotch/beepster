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
- **Active-chat polling:** While a chat is visible, the phone checks its newest message page every
  15 seconds. Unchanged results send no AppMessage traffic to the watch, and polling pauses whenever
  the chat is covered or closed.
- **Stale-response rejection:** A slow response for an abandoned thread or history page is ignored
  after a newer thread request begins.
- **Queue supersession:** When the selected message changes, unsent detail and image chunks for the
  old selection are removed while preserving the packet already in flight.
- **Bounded preview cache:** The Mac retains the eight most recently converted watch previews and
  coalesces simultaneous requests for the same attachment. Source URLs still never leave the Mac.
- **Rolling chat window:** The phone follows Beeper's opaque chat cursors and caches fetched pages,
  while the watch holds at most 30 conversations. This exposes older, Low Priority, and optional
  Archived chats without consuming unbounded Pebble memory or flooding AppMessage.
- **On-demand emoji atlases:** The Connector stores the full 3,944-entry Unicode/Twemoji catalog,
  but crops and sends only the 15 chosen reply icons or the bounded set needed by the current chat.
  Reply bitmaps are released when the chooser closes, keeping them from competing with message media.

## Current resource envelope

The current Emery build uses 104,658 bytes of flash resources and a 65,232-byte static/runtime
footprint, leaving 65,840 bytes of reported heap. Most flash usage is the 25 combinations of five
fonts and five sizes; removing them would directly reduce theming functionality, so they remain.

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
