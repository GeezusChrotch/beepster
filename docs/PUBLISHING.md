# Publishing Beepster

This is the maintainer checklist for beta and public releases. Do not upload the personal PBW from
`local/`; it contains a private setup URL. The universal artifact is produced in `dist/`.

For a small tester group, follow [the beta release checklist](BETA_RELEASE_CHECKLIST.md). Upload the
universal PBW using the Pebble developer portal's
[**Publish Privately** option](https://developer.rebble.io/guides/appstore-publishing/publishing-an-app/)
and distribute its direct Store link. That retains the normal phone installation flow without
making the listing discoverable or requiring testers to install developer tools.

## One-time release infrastructure

1. In GitHub repository settings, enable Pages from the `docs/` directory on `main`.
2. Confirm `https://geezuschrotch.github.io/beepster/setup/` loads the neutral Connect Beepster page.
3. Test the page in the Pebble mobile app: first run asks for the private gateway URL, later settings
   opens redirect directly to that saved gateway.
4. Create or verify the Pebble developer account and read the current distribution agreement,
   program policies, and trademark guidance.

The public bootstrap page does not receive the pairing code, gateway credential, Beeper token, or
messages. It only redirects the user's browser to the HTTPS gateway address entered by the user.

## Build the watch artifact

Set a Store-compatible `major.minor.0` version, update `CHANGELOG.md`, then run:

```sh
npm run release
```

The script runs all checks, validates the 25×25 launcher icon and public settings URL, removes
development source maps, scans the PBW for credentials, private tailnet addresses, and absolute
local paths, and creates:

```text
dist/beepster-0.11.0.pbw
dist/SHA256SUMS
```

Install that exact artifact in Emery QEMU and on a physical Time 2. Exercise inbox refresh, long
message scrolling, older-history pagination, both dictation gestures, quick replies, confirmed send,
theme persistence, and an inline photo before publishing.

## Build the signed Mac Connector

The Connector release is a universal DMG containing arm64 and x86_64 Connector executables, the
local gateway, both Node.js runtimes, the Keychain helper, the Contacts helper app, and open-source
license notices. Configure a Developer ID Application certificate and a `notarytool` Keychain
profile, then run:

```sh
BEEPSTER_CODESIGN_IDENTITY='Developer ID Application: …' \
BEEPSTER_NOTARY_PROFILE='beepster-notary' \
./scripts/package-mac-app.sh
```

This produces `dist/Beepster-Connector-0.11.0.dmg` and a SHA-256 sidecar. The script refuses to
notarize without a signing identity, waits for Apple's result, staples the ticket, and validates it.
A run without those variables is an ad-hoc development package and must never be published.

Before release, mount the exact DMG on a Mac that has never had the source installer. Drag the app
to Applications and verify guided setup, Contacts permission, token storage, Tailscale Serve,
combined phone setup, Test Everything, pairing, login restart, repair/update preservation, the
Advanced options fallback, and Gatekeeper acceptance.

## Store artwork

- Launcher icon: `resources/images/beepster-menu-icon.png` (25×25, palettized PNG)
- Large Store icon: `assets/store/beepster-icon-144.png` (144×144 PNG)
- Small Store icon: `assets/store/beepster-icon-48.png` (48×48 PNG)
- App Store banner: `assets/store/beepster-banner-720x320.png` (720×320 PNG)
- Repository header: `assets/store/beepster-header-1000x320.png` (1000×320 PNG)
- Editable mark: `assets/brand/beepster-mark.svg`
- Synthetic screenshots: `assets/store/screenshots/`

Build the synthetic-data PBW with `scripts/build-demo.sh`, install `local/beepster-demo.pbw` in Emery
QEMU, and capture at least three screenshots: chat list, a complete-message thread, and quick replies
or dictation. Never publish screenshots containing a real contact, phone number, message, private
hostname, or pairing code. Never upload the demo PBW as the release artifact.

## Suggested Store listing

**Name:** Beepster

**Short description:** Read and reply to your Beeper chats from Pebble Time 2.

**Description:**

> Beepster is an independent, open-source Beeper client built for Pebble Time 2. Read complete
> messages, scroll recent history, dictate replies, choose up to eight quick replies, customize
> themes and fonts, and view private photo or GIF/video poster previews. Requires a Mac running
> Beeper Desktop, the open-source Beepster companion, and a private Tailscale connection. Beepster
> is not affiliated with or endorsed by Beeper, Automattic, Pebble, or Core Devices.

**Support:** `https://github.com/GeezusChrotch/beepster/issues`

**Source:** `https://github.com/GeezusChrotch/beepster`

**Privacy:** `https://github.com/GeezusChrotch/beepster/blob/main/PRIVACY.md`

## Final checklist

- [ ] GitHub Pages setup URL works from the Pebble mobile webview
- [ ] `npm run release` passes from a clean checkout
- [ ] Connector DMG is universal, Developer ID signed, notarized, stapled, and Gatekeeper accepted
- [ ] Fresh-Mac Connector install and existing-user repair both pass without Terminal
- [ ] Beepster and Node.js license notices are present in the Connector bundle
- [ ] Universal PBW contains no source maps, absolute local paths, `.ts.net` address, or credential marker
- [ ] Store PBW and GitHub Release PBW have the same SHA-256 digest
- [ ] Physical Time 2 smoke test passes
- [ ] Screenshots contain only synthetic data
- [ ] Description clearly states Mac, Beeper Desktop, and Tailscale requirements
- [ ] Privacy, support, source, license, and independence links are present
- [ ] Release notes mention limitations: Emery only, static GIF/video posters, one attachment preview
- [ ] Git tag, GitHub Release, PBW, checksum, and source archive use the same version
- [ ] The Store entry itself is moved from draft/release to published state

Pebble's current developer docs require a 25×25 launcher icon resource, distinguish the Store icon
from the watch launcher icon, and warn against misleading listings or confusing third-party marks.
Use the original Beepster artwork and compatibility wording already supplied here.
