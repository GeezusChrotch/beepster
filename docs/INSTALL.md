# Install Beepster

Beepster's normal installation does not require Terminal, Git, Node.js, or an `imsg` bridge. The
Mac Connector contains the local gateway and everything needed to run it. Set it up once, then use
Beepster while the Mac, Beeper Desktop, Tailscale, and Pebble mobile app are connected.

The **Beepster Connector window does not need to stay open**. After setup, close it normally. Its
small background gateway starts at Mac login and continues independently. The Mac must remain awake,
Beeper Desktop must remain open and signed in, and Tailscale must remain connected.

## Before you start

You need:

1. A Pebble Time 2 paired with the Pebble mobile app.
2. A Mac with [Beeper Desktop](https://www.beeper.com/download) installed and signed in.
3. [Tailscale](https://tailscale.com/download) on the Mac and phone, signed into the same private
   tailnet.
4. The Beepster Connector DMG and the Beepster watch app from their official release pages.

Beepster requires a Mac because it uses Beeper Desktop's local API. It does not need Full Disk
Access, Accessibility, Screen Recording, direct Messages database access, or a separate iMessage
bridge.

## 1. Install Beepster Connector on the Mac

Download `Beepster-Connector.dmg` from the latest Beepster release. Open it, drag **Beepster
Connector** to **Applications**, eject the disk image, and open the app.

On first launch, macOS may ask you to confirm that you downloaded the app from the internet. The
public release must be Developer ID signed and notarized; do not bypass a warning that says the app
cannot be checked for malicious software.

Select **Set Up Beepster**. This one guided action installs or repairs the bundled gateway, asks for
the Beeper token only when it is missing, requests Contacts access when needed, starts the private
Tailscale route, restarts the service, and checks the result. Existing credentials, Contacts
permission, and phone pairing are preserved when you update or repair the Connector.

## 2. Connect Beeper

Keep Beeper Desktop open. In Beeper Desktop, open its developer or Desktop API settings and create
a separate access token for Beepster. The exact wording may change between Beeper releases; use the
authentication link in Beeper's current [Desktop API documentation](https://developers.beeper.com/desktop-api/).

The guided setup asks for this token only on the first setup or when it is missing. Paste it into the
concealed field and continue. It goes directly into the macOS login Keychain and is never placed in
the watch app, copied to the phone, or displayed again.

## 3. Enable names and the private connection

When prompted by guided setup, allow read-only Contacts access. This optional permission lets Apple
conversations show contact names instead of raw phone numbers or email addresses. If permission was
previously denied, expand **Advanced options**, select **Open Privacy Settings**, and enable
**Beepster Contacts**.

Open Tailscale on the Mac and phone and make sure both say connected. Guided setup starts the
Beepster Tailscale Serve route automatically. It remains private to your tailnet; never use
Tailscale Funnel or public port forwarding for the gateway.

The three status rows should now be green. Select **Test Everything** at any time to perform a real
bounded Beeper conversation request and verify that the private phone address reaches Beepster. If
a row needs attention, expand **Advanced options** for the individual repair controls.

## 4. Install the watch app

On the phone, open the Pebble mobile app, find **Beepster** in the Pebble Store, and tap **Add to
Watch**. Confirm that the developer is Joshua Bessom and the listing links to this repository.

The Mac Connector cannot silently install software over the phone's Bluetooth connection. This
single Store action is the intended, supported watch-installation step. It also lets future watch
updates arrive through the Pebble app.

During the prerelease period, the Store listing may not exist yet. Testers must install the PBW
manually; that development-only path is documented in [Contributing](../CONTRIBUTING.md) and is not
part of the final end-user installation.

## 5. Configure and pair once

On the Mac, select **Connect Phone**. The Connector copies the private address and shows the current
pairing code and phone instructions together. On the phone, open **Pebble → Beepster → Settings**:

1. Paste the copied private setup address when asked.
2. Enter the six-digit pairing code shown by the Connector.
3. Choose the services to include, a theme and font size, and up to eight text-or-emoji quick
   replies. The **Buttons** tab lets you customize all press and hold actions and the number of lines
   moved by each scroll action.
4. Beepster automatically combines Apple email and phone conversations that match the same Mac
   Contacts record. Under **Link Apple conversations**, you can give unmatched destinations the
   same alias as a manual fallback.
5. Tap **Test connection & pair**, then save.

The Mac and phone can share the copied address through Apple's Universal Clipboard. If that is not
enabled, the Connector also displays the address so it can be entered manually; no Terminal lookup
is needed. Use the complete address exactly as shown, including its HTTPS port when present.

The phone receives a narrow Beepster gateway credential, never the Beeper token. The one-time code
cannot be reused after successful pairing. Ordinary settings changes, Connector repairs, and app
updates do not require pairing again.

## 6. Confirm everything works

Open Beepster on the watch. It should open the newest end of the chat list. Open a conversation,
press Center, dictate a harmless reply, confirm it, and verify that Beepster returns to the thread
after delivery.

For help, open **Install Guide** in the Connector or use the symptom-based
[troubleshooting guide](TROUBLESHOOTING.md). No Terminal commands are required for the normal
install or readiness check.

## Updating

Install the newer Connector from its DMG and select **Install or Repair**. Update the watch app from
the Pebble Store. The dedicated Beeper token, private gateway credential, pairing, Contacts access,
themes, service filters, aliases, and quick replies should remain intact.

## Removing Beepster

Remove the watch app from the Pebble mobile app and quit Beepster Connector. A future release will
include guided removal of the login service and its Keychain items. Until then, advanced manual
cleanup instructions are in [Troubleshooting](TROUBLESHOOTING.md); Keychain data is deliberately
left in place during ordinary app removal so an accidental reinstall cannot destroy configuration.
