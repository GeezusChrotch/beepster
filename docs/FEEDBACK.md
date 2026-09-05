# Help improve Beepster

Beepster is now publicly available. Feedback, feature suggestions, and successful setup reports
are welcome—there is no invitation or testing commitment required.

[Install Beepster](INSTALL.md) · [Send feedback or report a bug](https://github.com/GeezusChrotch/beepster/issues/new/choose)

## A quick first-run check

1. Select **Test Everything** in Connector. All three status rows should be green.
2. Open a direct conversation and a group conversation. Check contact names and new messages.
3. Send a harmless dictated reply and a quick reply, then confirm receipt in Beeper Desktop.
4. Scroll a long message and older history, and view a photo preview.
5. Change a theme or button action in Settings and confirm it survives reopening the app.
6. Optionally test OpenClaw with a harmless approval request. Review its description before choosing
   the one-time Approve or Deny action in the matching Telegram conversation.

## What to include

Tell us your Beepster version, watch firmware, phone OS, macOS version, Beeper Desktop version,
and messaging service. Describe what you expected, what happened, and the steps to reproduce it.
For connection trouble, include the exact wording of the failing Connector status row.

Please remove private messages, names, phone numbers, email addresses, private hostnames, tokens,
pairing codes, and approval payloads from screenshots or logs. GitHub issues are public.
For security concerns, follow [the security policy](https://github.com/GeezusChrotch/beepster/blob/main/SECURITY.md)
instead of posting sensitive details in an issue.

## Known limitations

- Pebble Time 2 is the only supported watch. iPhone is the tested phone setup; Android is unverified.
- The Mac must stay awake and online with Beeper Desktop and Tailscale running. The Connector
  window can close; its background service keeps running.
- Active chats and the conversation list refresh every 15 seconds, with a battery/network cost.
- GIFs and videos show static posters, and only one attachment preview per message is displayed.
- Contact names and available media depend on what Beeper Desktop and the messaging network expose.
- The Threads Delete action archives conversations; Chat Delete removes a message for your user,
  not necessarily for everyone. Both require confirmation.
