# Install Beepster

Use the free **Organik Apps Pebble Connector** on macOS 14 or newer.

For Beepster **0.19.0**, update to **Connector 0.8.2 or newer** first. The Connector
delivers the matching photo conversion and link-display settings; updating only
the watch app does not update the Mac gateway. Existing pairing and settings are retained.
After updating the Connector, existing users must select **Beepster → Set up
service** to refresh the managed gateway, then reopen Beepster's phone settings.
Replacing the Mac app alone does not update an existing background service.

1. Download the [unified connector](https://github.com/GeezusChrotch/organik-pebble-connector/releases/latest), drag it into Applications and open it.
2. Install Tailscale on the Mac and paired phone and sign both into the same private network.
3. Select **Beepster** in the sidebar, follow **Connect**, and resolve unmet **Requirements**.
4. Install Beepster from its listing in the phone's Pebble app, or open the watch PBW from this app's
   official GitHub release on the phone.
5. Follow this page's phone connection controls, save settings in Pebble, and refresh the watch.

Keep Beeper Desktop open and signed in. In Beeper Settings → Integrations, allow connections and
create an access token with the permissions required for reading and sending. Paste it only into
the Mac connector’s concealed field. Optional Contacts permission improves conversation names.
Beepster retains its background service. Use the connection page to obtain its pairing code and
private setup address; enter these in Pebble → Beepster → Settings → Test connection & pair.


The Mac must remain awake with Tailscale connected. iPhone is the tested setup. You can close
the connector window. Configure startup and visibility in the connector’s Settings.

Existing users should follow [migration instructions](UNIFIED_CONNECTOR.md). No watch protocol
change is required. Older standalone setup details remain in [the legacy guide](INSTALL_STANDALONE.md),
including their version-specific controls. The unified connector’s current guide takes precedence
for its setup, repair and permission controls.

For optional Hermes/OpenClaw approval controls, update both the watch app to 0.19.0
and the unified Connector, then follow [agent setup](AGENT_APPROVALS.md). Ordinary
messaging does not require either agent. Existing pairing and themes can be retained.
