# Beepster and the unified Mac connector

The recommended Mac setup for the coordinated release is **Organik Apps Pebble Connector 0.2.0
or newer**. It is free MIT open-source software with pages for Notesy, Beepster, Reminderz and Pome.

[Source and guide](https://github.com/GeezusChrotch/organik-pebble-connector) · [Connector releases](https://github.com/GeezusChrotch/organik-pebble-connector/releases/latest)

## Move an existing setup

The unified app reuses Beepster’s existing LaunchAgent, Keychain credentials and private route. Quit the old setup window and disable its own login opening if enabled. Keep the Beepster background service installed and Beeper Desktop running. Do not recreate the Beeper token merely to migrate.

1. Install the unified connector in Applications and open it.
2. Select **Beepster** in the sidebar. Follow **Connect** and check **Requirements**.
3. Preserve existing addresses, credentials and phone settings. If pairing needs attention,
   use this page's phone connection controls and the app's existing Pebble settings.
4. Refresh Beepster on the watch and verify the expected content before removing an old setup app.
5. Use **Settings** for startup and visibility. Hiding a page preserves its service and pairing;
   it is not the same as stopping the service.

No watch protocol or UUID change is needed just to migrate. Keep the working watch app installed.
macOS may request permission or Keychain authorization for the new app. Do not clear phone storage
or reset Tailscale globally as a migration step.

## Daily use

Keep the Mac awake and the required source service and Tailscale connected. The connector window
can close. Notesy and Reminderz need the unified app running. Beepster keeps its own background
service, and Pome uses the separately running Itsyhome service.

Overview shows requirement lights and Fix for apps needing attention. Sidebar pages provide
**Requirements**, **Connect** and **Troubleshooting**. Some phone checks are user-confirmed;
a green Mac service light alone does not prove a physical-watch action succeeded.

PebClaw is removed from the unified connector. Tesla is hidden by default and marked Coming soon;
it supports an existing personal gateway, not public Tesla onboarding.

## Release timing

These changes are prepared for the coordinated release. Publish this guide only after the signed
connector installer is available at the release link. Existing standalone releases remain rollback
options; verify migration before removing a working setup.
