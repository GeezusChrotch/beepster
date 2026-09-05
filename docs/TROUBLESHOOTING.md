# Beepster troubleshooting

Open **Organik Apps Pebble Connector → Beepster → Requirements**. Use **Connect** for setup and
**Troubleshooting** for repair controls. Check the exact wording of an unmet requirement.

- Keep the Mac awake, the source service running, and Tailscale connected on both Mac and phone.
- Open Pebble on the phone and verify the watch is connected. Save settings and refresh the watch.
- Preserve the complete private address, including its port. Request fresh pairing details if expired.
- Review [migration requirements](UNIFIED_CONNECTOR.md) if moving from a standalone connector.
- Never solve a service conflict by globally resetting Tailscale or deleting stored credentials.

For an older standalone installation, see [legacy troubleshooting](TROUBLESHOOTING_STANDALONE.md).
Its button names apply to that older app. Include versions, the exact error and reproduction steps
in a bug report, without private addresses, tokens, pairing codes or personal content.
