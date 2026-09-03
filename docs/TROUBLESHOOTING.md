# Troubleshooting Beepster

Start with the private diagnostic script on the Mac:

```sh
cd beepster
./scripts/doctor.sh
```

It checks dependencies, the LaunchAgent, local gateway health, Beeper-token presence, Tailscale, and
the Serve route. It never prints either token, message data, contacts, or your private URL.

## Settings will not open

- During the preview, install a personal PBW created by `scripts/build-personal.sh`; the ordinary
  source build points to the not-yet-published public setup site.
- Confirm the phone has internet access for the public setup page.
- Confirm Tailscale is connected before the setup page redirects to the private Mac.
- The address must use `https://` and end in `/configure`.

## Pairing code is rejected

- Run `./scripts/show-pairing-code.sh` immediately before pairing.
- A code is single-use. Reopen Settings only after generating or reinstalling the companion as
  instructed.
- Pairing again is not required for ordinary theme or quick-reply edits.

## Chats never finish loading

- Keep Beeper Desktop open and signed in.
- Run `./scripts/doctor.sh` and resolve the first failure.
- Run `tailscale serve status`; it should forward to `http://127.0.0.1:8794`.
- Open `https://your-private-host/health` on the phone. It should show `ok: true` and
  `beeperConfigured: true` without asking for a token.
- If Beeper changed its local API port, restart the companion. Beepster also probes the supported
  local port range automatically after a connection refusal.

## A different thread or old content appears

Version 0.9.0 rejects late responses from a thread that is no longer active and discards unsent
detail/media packets after selection changes. Update both the watch app and companion before
reporting this symptom.

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
