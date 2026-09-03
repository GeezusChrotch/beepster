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

- [x] Select in the complete-message view opens voice dictation and saved replies
- [x] Canned replies send their original phone-side text, preserving configured emoji
- [x] Watch-friendly labels persist locally for fast access and offline display

## 0.5.1 — Thread history

- [x] Open every thread with the newest message selected at the bottom
- [x] Keep messages in chronological order so Up always moves into older history
- [x] Fetch older messages in cursor-based pages up to a 60-message watch window

## 0.5.2 — Reply controls and recovery

- [x] Center button starts confirmed voice dictation directly
- [x] Bottom button opens only the configured quick replies
- [x] Delivery-status transport failures leave Sending and become retryable errors

## 0.6 — Pome typography

- [x] Bundle Pome's five Time 2 font families under their SIL Open Font Licenses
- [x] Offer the same 14, 18, 22, 26, and 30 point sizes in saved themes
- [x] Fall back to Pebble Gothic for text containing native emoji glyphs
