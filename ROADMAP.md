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

- [ ] Canned replies
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
- [x] Select a message to read it; Select again to start voice reply
- [x] Disable Pebble's dithered scroll shadows that resemble overlapping text

## 0.4.2 — Rich-message cleanup

- [x] Convert Instagram paragraph, emphasis, link, and quote markup to readable plain text
- [x] Decode HTML entities without exposing tracking URLs
- [x] Strip script, style, and unknown markup before watch transport
