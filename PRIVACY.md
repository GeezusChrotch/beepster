# Privacy

Beepster is designed for personal, self-hosted use.

- The Mac gateway reads recent chats and messages from the local Beeper Desktop API.
- After the watch confirms the newest conversation messages have loaded in its
  visible chat view, the gateway may mark that chat read through a specific message.
  Beeper and the connected network may propagate read receipts under their settings.
- Beeper credentials remain on the Mac.
- The release Connector contains an open-source Node.js runtime and the Beepster gateway; neither
  component downloads executable code or requires a developer toolchain after installation.
- The gateway does not include analytics, advertising, or telemetry.
- The public first-run page only redirects the browser to an address entered by the user. It does
  not receive the pairing code, Beeper token, gateway credential, contacts, or messages.
- The watch stores only a small recent cache needed for a usable inbox.
- Attachment previews are resized in a temporary Mac directory, deleted after conversion, and
  transferred directly to the watch; Beeper file paths are not sent to the phone or watch.
- No Beepster-operated cloud database or account is required.
- The eight-entry Mac preview cache is memory-only and disappears when the companion restarts.
- YouTube link cards prefer an image already available through Beeper. If none is available, the
  Mac requests the video's thumbnail from `i.ytimg.com`. YouTube receives the requested video ID
  and the Mac's public IP address, but no Beeper credentials, contact names or message body.
  Arbitrary link hosts and redirects are not fetched. Hide links disables these link cards.
- GIF animation conversion runs locally in a bounded worker; no external conversion service is used.
- Optional Apple Messages attachment access requires a user-granted macOS Full Disk Access
  permission for Beepster's stable background component. The Connector cannot grant this itself.
  Its readiness check only opens and closes the attachment directory without enumerating files;
  actual preview requests read the selected attachment. Errors record codes, not file paths or
  message content.
- The optional Contacts helper scans Contacts locally for normalized, exact phone-number and email
  matches to identifiers already supplied by Beeper. It returns matching display names and an
  opaque hash that identifies when two matches belong to the same local contact. It does not return
  the Contacts record identifier, modify contacts, send the address book to the watch, or upload data.
- Optional Apple-conversation aliases are stored in the Pebble app's phone-side local storage.
  Automatic and manual links combine existing chat IDs only in Beepster and do not merge or modify
  upstream conversations.

The messaging networks connected to Beeper remain subject to their own privacy policies.
