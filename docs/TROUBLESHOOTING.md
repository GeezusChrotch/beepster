# Beepster troubleshooting

Open **Organik Apps Pebble Connector → Beepster → Requirements**. Use **Connect** for setup and
**Troubleshooting** for repair controls. Check the exact wording of an unmet requirement.

- Keep the Mac awake, the source service running, and Tailscale connected on both Mac and phone.
- Open Pebble on the phone and verify the watch is connected. Save settings and refresh the watch.
- Preserve the complete private address, including its port. Request fresh pairing details if expired.
- Review [migration requirements](UNIFIED_CONNECTOR.md) if moving from a standalone connector.
- Never solve a service conflict by globally resetting Tailscale or deleting stored credentials.

## Photos, GIFs, and YouTube cards

- Use Beepster 0.20.0 with Connector 0.9.0 or newer. After updating the Mac app,
  choose **Beepster → Set up service** to refresh its managed gateway.
- For blocked Apple Messages attachments, use **Allow attachment access** in the
  optional **Apple Messages photos/GIFs** step, grant the highlighted background
  component Full Disk Access, and choose **Restart and recheck**. The Overview
  attachment light reports the running gateway's access, not just the window's access.
- A static GIF is not always an error: large or unsupported files, video-based GIFs,
  and insufficient animation memory use a still preview. Supported GIFs play only
  a short, reduced-detail loop. Animation pauses during dragging and other screens.
- Missing Beeper cache files may require opening the attachment in Beeper first.
  Tap a failed preview to retry. Only one attachment per message is displayed.
- YouTube cards need either a cached Beeper thumbnail or access from the Mac to
  YouTube's thumbnail host. **Hide links** disables these cards. Videos do not play.

For an older standalone installation, see [legacy troubleshooting](TROUBLESHOOTING_STANDALONE.md).
Its button names apply to that older app. Include versions, the exact error and reproduction steps
in a bug report, without private addresses, tokens, pairing codes or personal content.
