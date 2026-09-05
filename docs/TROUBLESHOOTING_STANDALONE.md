# Troubleshooting Beepster

Start by opening **Beepster Connector** on the Mac and selecting **Test Everything**. It tests
Contacts permission, a bounded live Beeper request, and the private Tailscale route without showing
credentials or message data. Select **Set Up Beepster** to repair the normal path in one guided
pass, or expand **Advanced options** for an individual repair control.

Source developers can run the more detailed private diagnostic in Terminal:

```sh
cd beepster
./scripts/doctor.sh
```

It never prints either token, message data, contacts, or your private URL.

## Settings will not open

- During the preview, follow the personal-PBW instructions in [Contributing](../CONTRIBUTING.md);
  the ordinary source build points to the not-yet-published public setup site.
- Confirm the phone has internet access for the public setup page.
- Confirm Tailscale is connected before the setup page redirects to the private Mac.
- The address must use `https://` and end in `/configure`.
- Use the complete address copied by the Connector, including the HTTPS port when present. Omitting
  it may open a different service running on the same Mac.

## Pairing code is rejected

- Select **Connect Phone** in the Connector immediately before pairing; it shows the current code
  and copies the private address together.
- A code is single-use. Reopen Settings only after generating or reinstalling the companion as
  instructed.
- Pairing again is not required for ordinary theme or quick-reply edits.

## Chats never finish loading

- Keep Beeper Desktop open and signed in.
- Select **Test Everything** in the Connector and resolve the first warning.
- Run **Set Up Beepster** again. If needed, use **Start Private Route** under Advanced options.
- Open `https://your-private-host/health` on the phone. It should show `ok: true` and
  `beeperConfigured: true` without asking for a token.
- If Beeper changed its local API port, restart the companion. Beepster also probes the supported
  local port range automatically after a connection refusal.

## A different thread or old content appears

Version 0.9.0 rejects late responses from a thread that is no longer active and discards unsent
detail/media packets after selection changes. Update both the watch app and companion before
reporting this symptom.

## An Apple chat shows an email address or phone number

Beeper sometimes supplies only the participant's network identifier. Run **Set Up Beepster** in the
Connector and allow read-only Contacts access, then test again and reopen Beepster.
Beepster falls back to the original Beeper label when there is no exact local match.

## One Apple contact appears as separate email and phone threads

Beeper gives Beepster separate chat IDs for these conversations. With Contacts access enabled,
Beepster automatically links identifiers that exactly match the same Mac Contacts record. Reopen
the inbox after enabling permission. If either identifier is absent from Contacts, open **Beepster
→ Settings → Link Apple conversations**, enter the same name beside both entries, then save.
Beepster shows one virtual thread containing both histories and routes replies through the most
recently active original chat. Manual aliases can override automatic linking; no Apple Messages
data is modified.

## A long message appears blank while scrolling

- Update to 0.9.0 or newer; full-message text measurements are cached instead of recalculated on
  every scroll frame.
- Press Back, reopen the thread, and retry once.
- Note the theme, font, text size, messaging service, and approximate message length in a bug report.
  Do not attach the private message unless you have redacted it.

## Reply remains pending or fails

- Check whether the reply appeared in Beeper Desktop before retrying.
- If Beepster offers **Press Select to retry**, use it: retries are idempotent and protected against
  duplicate submission.
- Some networks do not report a final delivery state promptly. Beepster reconciles against the
  outgoing message history before declaring failure.
- Confirm the conversation is writable in Beeper Desktop itself.

## Voice dictation does not start

- Pebble Time 2 and its mobile connection must expose dictation support.
- Try both a short and long Center press.
- Confirm the watch is connected to the phone; dictation is a Pebble system service.

## An OpenClaw approval is not identified in the Telegram chat

- Inline approval controls appear only while the protected action is still pending and its Telegram
  prompt is present in the loaded message history.
- In Beepster Connector, expand **Advanced options**, select **OpenClaw Approvals**, and
  confirm its optional status reads **ready**. If it says approval needed, review the device named
  **Beepster Connector** in the OpenClaw app and then select **Test Everything**.
- In the Pebble mobile app, open Beepster Settings and turn on **Show pending OpenClaw approvals**.
- Open the Telegram conversation that produced the request and wait for the next 15-second refresh.
  The approval prompt should be labeled **OpenClaw approval**; select it and press Center for
  **Approve** and **Deny**. There should not be a separate approval conversation.
- OpenClaw Gateway must be running on the same Mac. Telegram button metadata is not required;
  Beepster correlates the prompt with the exact pending action from the local OpenClaw Gateway.

## Photo preview is slow or unavailable

- First conversion is intentionally slower; revisiting one of the eight most recent previews reuses
  the Mac's bounded cache.
- Very large or unusual files may not produce a poster frame through macOS `sips`.
- GIFs and videos are static posters, not animations.
- Selecting another message cancels the obsolete transfer. Pause on the desired message while it
  loads.

## Logs for a bug report

Gateway logs are in `~/Library/Application Support/Beepster/logs`. Remove message text, contact data,
tokens, private hostnames, and account identifiers before sharing excerpts. Watch logs can be read
with `pebble logs --cloudpebble` while the developer connection is active.

Use the repository's [bug report form](https://github.com/GeezusChrotch/beepster/issues/new/choose)
for non-security bugs. Report security issues privately as described in [SECURITY.md](../SECURITY.md).
