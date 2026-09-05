# Beepster 0.14.0 — Archiving, readability, and safer deletion

[Install or update](https://geezuschrotch.github.io/beepster/INSTALL) ·
[Feedback and bug reports](https://github.com/GeezusChrotch/beepster/issues/new/choose)

## Fixed

- Archiving preserves your place in the conversation list, including older pages. The next
  conversation is selected, or the previous one if you archived the last item.
- Message bodies keep the selected font. Unicode characters no longer switch the entire message
  to a different font; fallback is limited to individual glyphs. Line spacing and scrolling agree.
- Successful empty Beeper responses no longer produce a false 502 after archive/delete actions.
- Action confirmations take priority over queued media. Deletion invalidates stale refreshes and
  the watch stops waiting indefinitely if confirmation is lost. It never automatically retries deletion.
- Unavailable cached photos and unconfirmed deletions show clearer explanations.

## Temporary limitation: Apple message deletion

**iMessage message deletion is disabled**, both on the phone and in the Mac gateway. Beeper's
Apple Messages automation has failed to verify deletion targets reliably. Thread archiving still
works, including iMessage conversations. Deletion on other services remains dependent on Beeper
and network support. Beepster does not silently hide messages or substitute delete-for-everyone.

We plan to revisit Apple message deletion when a reliable supported path is available.

## Updating

Update **both** the watch app and Mac Connector to 0.14.0. Replace the Connector in Applications,
open it, run **Set Up Beepster** to update the bundled gateway, and select **Test Everything**.
Keep existing settings and pairing; do not reset them. The Connector window may close afterward,
but the Mac must stay awake and online with Beeper Desktop and Tailscale running.

Requires Pebble Time 2, a Mac, Beeper Desktop, and Tailscale on Mac and phone. iPhone is the tested
phone setup; Android remains unvalidated. GIF/video previews remain static, with one attachment
preview per message.

Feedback is welcome—bugs, suggestions, and successful setups. Remove private messages, contacts,
tokens, pairing codes, and private hostnames before posting. The Mac installer is Developer ID
signed and Apple-notarized; no Terminal or developer tools are needed.
