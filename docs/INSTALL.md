# Install Beepster

This guide deliberately spells out every component. You set it up once; normal use afterward is
opening Beepster on the watch while the Mac, Beeper Desktop, and Tailscale are running.

## Before you start

You need:

1. A Pebble Time 2 paired with the Pebble mobile app.
2. A Mac with [Beeper Desktop](https://www.beeper.com/download) installed and signed in.
3. [Tailscale](https://tailscale.com/download) installed on the Mac and phone, with both devices in
   the same tailnet.
4. Node.js 20 or newer. `node --version` should print `v20` or later.
5. The Beepster source, downloaded from a GitHub release or cloned with Git.

Beeper recommends its Desktop API for personal use. Beepster only fetches local data at ordinary
watch-sized rates and does not automate bulk messaging.

## Permission checklist

Beepster intentionally needs very little system access:

- **Mac Contacts — optional but recommended:** used read-only to replace Apple email addresses and
  phone numbers with names. Beepster Connector can request and verify it.
- **Tailscale VPN configuration — required:** accept Tailscale's normal macOS and phone prompts so
  the phone can reach the Mac privately.
- **Pebble mobile connection — required:** allow the Pebble app's normal Bluetooth/background
  access and keep the watch connected. Follow any dictation prompt shown by Pebble when using voice
  reply for the first time.

Beepster does **not** need Full Disk Access, Accessibility, Screen Recording, Messages database
access, or an `imsg` bridge. The Connector checks all Mac-side requirements it actually uses.

## 1. Download Beepster on the Mac

```sh
git clone https://github.com/GeezusChrotch/beepster.git
cd beepster
```

If you downloaded a release ZIP, open Terminal, type `cd ` with a trailing space, drag the extracted
Beepster folder into the Terminal window, and press Return.

## 2. Create a dedicated Beeper token

Keep Beeper Desktop open. In Beeper Desktop, open **Settings → Integrations** and create a separate
access token for Beepster. The exact button wording can change with Beeper releases; its current
[Desktop API documentation](https://developers.beeper.com/desktop-api/) links to the authentication
instructions.

Do not paste this token into a source file, chat, screenshot, or `.env` file. The installer below
accepts it with hidden terminal input and stores it in your login Keychain.

## 3. Install the Mac companion

```sh
./scripts/install-companion.sh
```

The installer opens **Beepster Connector**. Select **Set Beeper Token**, paste the dedicated token
into the concealed field, and save. The app stores it in your login Keychain and restarts the
gateway. Terminal users can instead run `./scripts/set-beeper-token.sh`; its input is hidden.

macOS will also ask whether Beepster may access Contacts. Allowing read-only access lets Apple
message threads show the same contact names you use on the Mac instead of email addresses or phone
numbers. If you skip it, messaging still works and you can grant access later with:

```sh
./scripts/install-contact-helper.sh
```

The companion is a small background service, not another full messaging app. It starts whenever you
sign into the Mac and listens only on `127.0.0.1:8794`.

## 4. Make the gateway privately reachable

Open Tailscale on both the Mac and phone and confirm both are connected. In Beepster Connector,
select **Start Private Route**. Terminal users can instead run:

```sh
tailscale serve --bg 8794
```

Tailscale prints a private HTTPS address similar to:

```text
https://your-mac.your-tailnet.ts.net
```

Keep that address private. Use Tailscale **Serve**, not Funnel: Serve restricts access to your
tailnet, while Funnel would expose the gateway publicly. If `tailscale` is not on your PATH, use:

```sh
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg 8794
```

Verify the complete Mac side without exposing any credential:

```sh
./scripts/doctor.sh
```

Every line should say `PASS`.

The installer also adds **Beepster Connector** to `~/Applications`. Open it whenever you want a
plain-language readiness screen, a Contacts permission button, Beeper-token setup, Tailscale route
setup, or the current pairing code. The Terminal diagnostic remains available for detailed
troubleshooting.

## 5. Install the watch app

### After the Pebble Store release

Install **Beepster** from the Pebble Store in the mobile app. Check that the developer is Joshua
Bessom and that the listing links to this repository.

### During the public preview

The public Store listing and setup site are not live yet. Build a private test bundle with your
Tailscale address:

```sh
./scripts/build-personal.sh 'https://your-mac.your-tailnet.ts.net/configure'
```

This creates `local/beepster-personal.pbw`. Transfer that file to the phone and open it with the
Pebble mobile app, or use Pebble Tool while the phone's developer connection is enabled:

```sh
pebble install --cloudpebble local/beepster-personal.pbw
```

The private URL is the only personalized value in this PBW. The Beeper token and gateway credential
are never bundled.

## 6. Pair once

On the Mac, display the current one-time code:

```sh
./scripts/show-pairing-code.sh
```

In the Pebble mobile app, open **Beepster → Settings**.

1. If asked, enter your private Tailscale address ending in `/configure`.
2. Enter the one-time pairing code.
3. Choose a theme, font size, refresh interval, and up to eight quick replies.
4. Under **Link Apple conversations**, enter the same contact name beside any email and phone
   conversations that belong to one person. Beepster combines those histories on the watch and
   sends replies through the most recently active destination. It does not alter the original
   conversations in Beeper or Apple Messages.
5. Tap **Test connection & pair**.

The settings page receives a narrow Beepster gateway credential, not the Beeper Desktop token.
Later settings changes do not require pairing again.

## 7. Confirm the watch

Open Beepster. You should see recent chats. Open one, press the center button, dictate a harmless
test reply, confirm the transcript, and verify that Beepster returns to the thread after delivery.

If anything fails, run `./scripts/doctor.sh`, then use the [troubleshooting guide](TROUBLESHOOTING.md).

## Updating

```sh
cd beepster
git pull --ff-only
./scripts/install-companion.sh
./scripts/set-beeper-token.sh
./scripts/doctor.sh
```

Reinstall the new PBW from the Store or release. Re-running the companion installer rotates the
gateway credential and pairing code, so pair the phone again after reinstalling it. Ordinary app
updates do not require rotating the Beeper token.

## Uninstalling

Remove Beepster from the Pebble mobile app. To stop the private proxy run `tailscale serve reset`.
The Mac companion can be unloaded with:

```sh
launchctl bootout "gui/$(id -u)/org.beepster.gateway"
```

The LaunchAgent and Keychain values are intentionally left in place to avoid destructive cleanup.
Remove them manually only if you understand what will be deleted.
