# Privacy

Beepster is designed for personal, self-hosted use.

- The Mac gateway reads recent chats and messages from the local Beeper Desktop API.
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
- The optional Contacts helper scans Contacts locally for normalized, exact phone-number and email
  matches to identifiers already supplied by Beeper. It returns matching display names and an
  opaque hash that identifies when two matches belong to the same local contact. It does not return
  the Contacts record identifier, modify contacts, send the address book to the watch, or upload data.
- Optional Apple-conversation aliases are stored in the Pebble app's phone-side local storage.
  Automatic and manual links combine existing chat IDs only in Beepster and do not merge or modify
  upstream conversations.

The messaging networks connected to Beeper remain subject to their own privacy policies.
