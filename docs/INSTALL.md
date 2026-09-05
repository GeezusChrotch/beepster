# Install Beepster

Use the free **Organik Apps Pebble Connector** on macOS 14 or newer.

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
