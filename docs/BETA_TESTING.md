# Beepster 0.10.0 Beta Testing

Thanks for helping test Beepster before its public Pebble Store release. The normal setup is guided
and does not require Terminal, Git, Node.js, or developer tools. Allow about 10–15 minutes.

## What you need

- A Pebble Time 2 paired with the current Pebble mobile app
- A Mac with Beeper Desktop installed, open, and signed in
- Tailscale installed and connected on both the Mac and phone using the same account
- The private Beepster Store link and Connector download link supplied with your invitation

Beepster uses Beeper Desktop's local API, so the Mac must remain awake and online while you use the
watch app. Beeper Desktop and Tailscale must remain running. The Beepster Connector window may be
closed after setup; its small background gateway continues at Mac login.

## Install and connect

1. Download the signed `Beepster-Connector-0.10.0.dmg`, open it, and drag **Beepster Connector** to
   **Applications**. Open the installed app.
2. Select **Set Up Beepster**. Follow each item in the guided list.
3. If asked for a Beeper token, open **Beeper Desktop → Settings → Integrations**. Turn on
   **Allow connections**, select **+** under **Approved connections**, name it **Beepster**, choose
   **Never**, turn on **Allow sensitive actions**, and create the token. Paste it into Connector's
   concealed field and select **Save and Continue**.
4. Allow Contacts access when prompted. This read-only permission replaces Apple phone numbers and
   email addresses with names where possible.
5. Make sure Tailscale says connected on both devices. Back in Connector, select **Test Everything**.
   All three status rows should be green.
6. Open the private Pebble Store link from the invitation on your phone and select **Add to Watch**.
7. In Connector, select **Connect Phone**. On the phone, open **Pebble → Beepster → Settings**, paste
   the copied private setup address, enter the six-digit pairing code, select **Test connection &
   pair**, and save.

The Beeper token stays in the Mac login Keychain. The phone and watch receive only a narrow Beepster
gateway credential. Do not send anyone your token, pairing code, or private Tailscale address.

## Five-minute smoke test

1. Open Beepster and confirm the newest conversations appear with names where available.
2. Open a direct chat and a group chat; wait up to 15 seconds and confirm new messages appear.
3. Press Center, dictate a harmless reply, confirm it, and verify delivery and the automatic return
   to the thread.
4. Hold Top, choose a quick reply or bitmap emoji, and verify delivery.
5. Scroll through a long message and older history. Open a conversation containing a photo and
   confirm its preview appears.
6. Open Settings and change a theme, one quick reply, or a button action. Save, reopen Beepster, and
   confirm the choice persists.

## What is expected in this beta

- Pebble Time 2 (`emery`) is the only supported watch target.
- Beepster refreshes the visible inbox and open chat every 15 seconds while the app is active. This
  makes conversation updates feel live, with some battery and network cost.
- GIF and video attachments display a static poster, not animation or playback.
- One attachment preview per message is shown. Some networks expose media or sender names
  differently through Beeper Desktop.
- The Connector window can close, but the Mac must stay awake with Beeper Desktop and Tailscale
  running.

## Send useful, private feedback

First select **Test Everything** in Connector and record the exact wording of any red status row.
Then use the repository's **Beta feedback** or **Bug report** issue form. Include:

- Beepster version 0.10.0
- Pebble firmware, phone model and OS, macOS version, Beeper Desktop version, and messaging service
- The exact steps, expected result, and actual result
- A screenshot only after hiding contact names, phone numbers, messages, private hostnames, and codes

Never post a Beeper access token, pairing code, gateway credential, private Tailscale hostname, or
unredacted conversation. For full setup details, see the [installation guide](INSTALL.md); for
symptom-based help, see [troubleshooting](TROUBLESHOOTING.md).
