# Roadmap

## 0.1 — Readable inbox foundation

- Native Pebble Time 2 build
- Classic, Dark, Ocean, and high-contrast theme model
- Native supported emoji with readable fallbacks for unsupported emoji
- Recent chats with resolved contact names, network, preview, and unread count
- Recent message history
- Loading, empty, setup, cached, and error states
- Private authenticated Mac gateway

## 0.2 — Reliable replies

- [x] Up to eight configurable canned replies with text and emoji
- [x] Voice dictation with transcript confirmation
- [x] Pending, sent, retryable-failed, and permanently-failed delivery states
- [x] Retry without losing dictated text
- [x] Duplicate-send protection

Replies use Pebble's configured speech-recognition provider. Beepster does not report a reply as
sent until Beeper resolves the pending message with a successful send status.

## 0.3 — Daily-driver polish

- Unread-first and recency sorting options
- Mark read/unread
- [x] Saved custom themes with colors, fonts, text size, and preview
- [x] Settings persistence without re-pairing
- Offline cache freshness indicator
- Basalt, Chalk, Diorite, Flint, and Gabbro evaluation

## 0.4 — Media previews

- [x] Opaque attachment IDs keep Beeper source paths off the phone and watch
- [x] Mac-side resize and 64-color Time 2 conversion
- [x] Full-screen photo previews from message history
- [x] Static GIF and video poster previews
- [ ] Animated GIF playback
- [ ] Multiple attachments in one message

## 0.4.1 — Complete message reading

- [x] Clean multiline previews with a protected metadata strip
- [x] Scrollable full-message view with 30 KB UTF-8 chunk transport
- [x] Select a message to read it; Select again to choose voice or a saved reply
- [x] Disable Pebble's dithered scroll shadows that resemble overlapping text

## 0.4.2 — Rich-message cleanup

- [x] Convert Instagram paragraph, emphasis, link, and quote markup to readable plain text
- [x] Decode HTML entities without exposing tracking URLs
- [x] Strip script, style, and unknown markup before watch transport

## 0.5 — Reply chooser

- [x] Long-press controls in the complete-message view open voice dictation and saved replies
- [x] Canned replies send their original phone-side text, preserving configured emoji
- [x] Watch-friendly labels persist locally for fast access and offline display

## 0.5.1 — Thread history

- [x] Open every thread with the newest message selected at the bottom
- [x] Keep messages in chronological order so Up always moves into older history
- [x] Fetch older messages in cursor-based pages up to a 60-message watch window

## 0.5.2 — Reply controls and recovery

- [x] Holding the center button starts confirmed voice dictation directly
- [x] Holding the bottom button opens only the configured quick replies
- [x] Delivery-status transport failures leave Sending and become retryable errors

## 0.6 — Pome typography

- [x] Bundle Pome's five Time 2 font families under their SIL Open Font Licenses
- [x] Offer the same 14, 18, 22, 26, and 30 point sizes in saved themes
- [x] Fall back to Pebble Gothic for text containing native emoji glyphs

## 0.6.1 — Reliable replies and message scrolling

- [x] Treat a pending Beeper ID that resolves to a message as delivered when optional `sendStatus` is absent
- [x] Deduplicate concurrent and retried reply requests while they are still in flight
- [x] Reuse the same request ID when retrying so recovery cannot create a duplicate send
- [x] Restore normal Up/Down full-message scrolling
- [x] Move dictation to hold Select and quick replies to hold Down

## 0.6.2 — Verified sending and marquee labels

- [x] Send watch text as a fallback when phone and watch quick-reply lists differ
- [x] Return an explicit reply failure instead of leaving Sending when phone gateway settings are missing
- [x] Add privacy-safe reply-path diagnostics to phone logs
- [x] Verify the complete emulator-to-phone-to-gateway-to-Beeper path against Note to self
- [x] Marquee oversized selected chat names, message senders, and quick replies using Pome's timing

## 0.6.3 — Physical iOS reply diagnosis

- [x] Prove the physical watch command reaches phone JavaScript
- [x] Prove physical PebbleKit iOS stalls on POST even after removing its JSON body
- [x] Keep the gateway backward-compatible while testing a physical transport replacement

## 0.6.4 — PebbleKit iOS method compatibility

- [x] Route watch sends through a dedicated authenticated, no-store GET action because physical iOS stalls on POST
- [x] Keep reply text in encrypted headers and out of request URLs
- [x] Retain request-ID deduplication and the conventional POST endpoint

## 0.6.5 — End-to-end reply recovery

- [x] Use the canonical authenticated JSON POST first
- [x] Fall back after five seconds using the same idempotent request ID
- [x] Retry temporary pending-message lookup failures
- [x] Guarantee that the watch leaves the sending state and offers a safe retry
- [x] Log reply transport and outcome without message text, chat IDs, tokens, or raw request IDs

## 0.6.6 — Companion resilience

- [x] Discover Beeper Desktop when it selects a fallback local API port after restart
- [x] Validate a candidate through Beeper's local `/v1/info` identity endpoint
- [x] Keep explicit custom API URLs fixed rather than silently replacing them
- [x] Reconcile missing iMessage pending IDs against newly observed outgoing history
- [x] Require an exact outgoing text and post-request timestamp match before reporting success
- [x] Return automatically to the refreshed thread after confirmed reply delivery

## 0.7.0 — Inline threads

- [x] Expand the selected message to its complete text inside the chronological thread
- [x] Scroll oversized messages with short Up/Down presses before changing selection
- [x] Keep hold Select for dictation and hold Down for saved replies directly in the thread
- [x] Automatically load the selected photo, GIF poster, or video poster inline
- [x] Tag chunked text and media packets so late responses cannot overwrite another selected message
- [x] Stream one preview directly into its bitmap to stay within Time 2 memory limits

## 0.7.1 — Long-message scroll stability

- [x] Stop stale scroll animations before expanding or collapsing dynamic message rows
- [x] Clamp manual thread offsets to the MenuLayer's current content bounds
- [x] Re-anchor newly selected rows after their heights change

## 0.7.2 — Compact chat list

- [x] Size each chat row from the content it actually contains
- [x] Collapse empty preview and unread regions instead of leaving dead vertical space
- [x] Keep preview and unread metadata aligned beneath the chat title when present

## 0.7.3 — Bounded message viewport

- [x] Never give Pebble's MenuLayer a message cell taller than the screen
- [x] Scroll complete message content inside a stable screen-height thread row
- [x] Limit unselected previews to three lines while retaining complete selected text
- [x] Keep overlap between viewport steps so readers do not lose their place

## 0.8.0 — Messaging service icons

- [x] Draw compact theme-colored icons before inbox titles and message senders
- [x] Cover every currently supported Beeper network plus Beeper/Matrix and unknown fallbacks
- [x] Preserve marquee behavior and readable text width beside the icon
- [x] Avoid bitmap-resource overhead with native integer-coordinate Pebble drawing

## 0.8.1 — Simple thread scrolling

- [x] Move exactly two text-line heights per short Up or Down press
- [x] Move to an adjacent message only after reaching the current message boundary

## 0.8.2 — Stable thread theming

- [x] Keep every thread row on the saved background and body-text colors
- [x] Indicate selection with only the sender and service-icon accent
- [x] Normalize smart punctuation without changing message meaning
- [x] Match Pebble emoji fallback fonts to the nearest configured text size

## 0.8.3 — Thread button controls

- [x] Keep short Up and Down presses for two-line thread scrolling
- [x] Open saved quick replies by holding Up
- [x] Start dictation with either a short or long Select press
- [x] Jump directly to the newest message by holding Down

## 0.9.0 — Public release candidate

- [x] Add original brand, launcher, Store, and header artwork
- [x] Add a universal first-run setup handoff with no private URL in the public PBW
- [x] Document installation, controls, troubleshooting, performance, privacy, and publishing
- [x] Add a private Mac health checker and reproducible release packaging
- [x] Cache repeated watch text layout and Mac preview conversion
- [x] Prevent stale chat responses and obsolete detail/media queue backlog
- [x] Let users choose which messaging services appear without re-pairing
- [x] Add read-only macOS Contacts enrichment for raw Apple message identifiers
- [ ] Enable and test the public GitHub Pages setup URL in the Pebble mobile webview
- [x] Capture Store screenshots using synthetic data
- [ ] Complete a physical-watch release-candidate smoke test
- [ ] Publish GitHub and Pebble Store releases
