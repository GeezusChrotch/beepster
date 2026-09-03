# Publishing Beepster

This is the maintainer checklist for the first public release. Do not upload the personal PBW from
`local/`; it contains a private setup URL. The universal artifact is produced in `dist/`.

## One-time release infrastructure

1. In GitHub repository settings, enable Pages from the `docs/` directory on `main`.
2. Confirm `https://geezuschrotch.github.io/beepster/setup/` loads the neutral Connect Beepster page.
3. Test the page in the Pebble mobile app: first run asks for the private gateway URL, later settings
   opens redirect directly to that saved gateway.
4. Create or verify the Pebble developer account and read the current distribution agreement,
   program policies, and trademark guidance.

The public bootstrap page does not receive the pairing code, gateway credential, Beeper token, or
messages. It only redirects the user's browser to the HTTPS gateway address entered by the user.

## Build the universal artifact

Set a Store-compatible `major.minor.0` version, update `CHANGELOG.md`, then run:

```sh
npm run release
```

The script runs all checks, validates the 25×25 launcher icon and public settings URL, scans the PBW
for credential markers and private tailnet addresses, and creates:

```text
dist/beepster-0.9.0.pbw
dist/SHA256SUMS
```

Install that exact artifact in Emery QEMU and on a physical Time 2. Exercise inbox refresh, long
message scrolling, older-history pagination, both dictation gestures, quick replies, confirmed send,
theme persistence, and an inline photo before publishing.

## Store artwork

- Launcher icon: `resources/images/beepster-menu-icon.png` (25×25, palettized PNG)
- Store icon: `assets/store/beepster-icon-144.png` (144×144 PNG)
- Header: `assets/store/beepster-header-1000x320.png` (1000×320 PNG)
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
- [ ] Universal PBW contains no `.ts.net` address or credential marker
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
