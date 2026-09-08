# Pebble Store update text — 0.20.0

Bitmap reactions now appear beneath messages with sender indicators. Photos, GIFs,
and thumbnails use the full chat width with correct proportions. Large-photo memory
fallbacks and preview cancellation fixes improve reliability. Supported GIFs play
short, reduced-detail loops; YouTube links can show thumbnail cards. Videos do not play.

Update Organik Apps Pebble Connector to 0.8.7 or newer and choose Beepster → Set up
service before updating the watch. Protected Apple Messages attachments have guided
permission setup in the Connector. Pairing, themes and saved replies are preserved.

GIF playback is bounded and may fall back to a still; only one attachment per message
is supported. iMessage message deletion remains disabled. The final media changes
passed automated/emulator checks; physical-watch media confirmation is still pending.

Feedback welcome: https://github.com/GeezusChrotch/beepster/issues/new/choose
