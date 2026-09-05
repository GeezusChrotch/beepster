# Beepster 0.13.0 — First public release

Beepster is an independent, open-source Beeper client for Pebble Time 2, now available to everyone.

[Install Beepster](https://geezuschrotch.github.io/beepster/INSTALL) ·
[Share feedback](https://github.com/GeezusChrotch/beepster/issues/new/choose)

Read complete conversations, dictate replies, select quick replies and bitmap emoji, customize
themes and buttons, view photo previews, and archive conversations. Optional OpenClaw support
shows protected-action descriptions and one-time Approve/Deny choices inside the matching Telegram
agent conversation. No standing approval grants are offered.

This release includes the latest scrolling correction: message previews use actual font measurements,
and wrapped text and emoji stay inside the message body instead of running into the next sender line.

## Requirements and limitations

You need a Pebble Time 2, a Mac running Beeper Desktop, and Tailscale connected on the Mac and phone.
iPhone is the current tested phone setup; Android has not been validated. Setup uses a signed,
notarized Mac Connector and does not require Terminal or developer tools.

The Mac must remain awake and online. The Connector window can close after setup. Active views
refresh every 15 seconds. GIFs and videos display static posters; one attachment preview is shown
per message. Contact names and media availability vary by network.

Existing users can replace the Connector in Applications and update the watch app without clearing
settings or pairing. No invitation is needed. Please share bugs, suggestions, and successful setups
using the feedback link above, with private information removed.

Beepster is not affiliated with or endorsed by Beeper, Automattic, Pebble, or Core Devices.
