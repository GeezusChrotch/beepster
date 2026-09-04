# Beepster 0.10.0 Beta Release Checklist

This checklist prepares a small invitation-only beta. It does not make the final public Store
listing discoverable.

## Artifacts

- [ ] `dist/beepster-0.10.0.pbw` passes the credential, private-host, local-path, and source-map scan
- [ ] The release PBW passes the physical Pebble Time 2 smoke test
- [ ] `dist/Beepster-Connector-0.10.0.dmg` is universal, Developer ID signed, notarized, stapled,
      and accepted by Gatekeeper
- [ ] Published downloads match `dist/SHA256SUMS` and the Connector `.sha256` sidecar
- [ ] No PBW, screenshot, log, issue, or documentation contains a private hostname or credential

## Private distribution

1. Enable GitHub Pages from `docs/` on `main` and verify the neutral setup page at
   `https://geezuschrotch.github.io/beepster/setup/`. The universal watch app uses this only to
   collect the tester's private Connector address on first setup; it receives no credential or
   message data.
2. Create a GitHub **prerelease** named `Beepster 0.10.0 Beta`; attach the DMG, PBW, and checksum
   files, and link to [Beta Testing](BETA_TESTING.md). The repository and prerelease are public, so
   they must contain no private tester or network information.
3. In the Pebble developer portal, upload the same PBW and choose **Publish Privately**. Share its
   direct Store link only with invited testers. This gives testers a normal **Add to Watch** flow
   without requiring the Pebble SDK or command line.
4. Send each tester the invitation text below with the private Store link and GitHub prerelease link.

## Tester invitation

> Want to beta test Beepster, an open-source Beeper client for Pebble Time 2? Setup takes about
> 10–15 minutes and requires a Mac running Beeper Desktop plus Tailscale on the Mac and phone. No
> Terminal or developer tools are required. Start with the Beepster beta guide: [BETA GUIDE LINK].
> Install the Mac Connector here: [CONNECTOR LINK], then add the watch app here: [PRIVATE PEBBLE
> STORE LINK]. Please do not share those beta links or include private messages, contacts, tokens,
> pairing codes, or Tailscale addresses in feedback.

## Before inviting anyone

- [ ] Complete the five-minute smoke test in [Beta Testing](BETA_TESTING.md) on the exact artifacts
- [ ] GitHub Pages setup URL opens successfully inside the Pebble mobile app
- [ ] Test a new Connector install on a Mac or macOS account that has never run Beepster
- [ ] Test Connector upgrade/repair on the current working installation without losing pairing
- [ ] Confirm the private Store link installs version 0.10.0 from both iPhone and Android if both
      platforms will be invited
- [ ] Confirm issue forms are enabled and labels exist or can be created automatically
- [ ] Start with two or three trusted testers, resolve setup blockers, then widen the group

## Exit criteria for public release

- At least one fresh install and one update install complete without Terminal
- Dictation and quick replies deliver on direct and group conversations
- Contact-name fallback, scrolling, active refresh, settings persistence, and photo previews pass
- No unresolved setup, credential, pairing, or reply-delivery blocker remains
- Known limitations and support links are included in the public Store listing
