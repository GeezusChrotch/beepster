# Security policy

Please report security issues privately to the maintainer instead of opening a public issue.

Beepster's security boundary keeps the Beeper Desktop API token on the Mac gateway. The watch and
phone receive only a narrowly scoped Beepster gateway credential. Production gateways should be
exposed only over private HTTPS, such as Tailscale Serve, and must reject unauthenticated requests.
Never expose the gateway with Tailscale Funnel or a public port-forward. The public setup page is a
static redirector and must never proxy, log, or store private setup values.

Never include live tokens, message bodies, contact identifiers, or private network addresses in a
security report unless the maintainer explicitly requests them through a secure channel.

Release PBWs must be produced with `scripts/package-release.sh`, which scans for credential markers
and private `.ts.net` addresses before creating the distributable artifact.

Public Connector DMGs must be built from a clean checkout, signed with the maintainer's Developer
ID Application identity, submitted to Apple's notarization service, stapled, and verified before
publication. Connector upgrades must preserve the installed Keychain and Contacts helper identities
so macOS does not silently invalidate access or rotate user credentials.

Pairing codes are single-use. A successful exchange rotates the stored code before returning the
narrow gateway credential, so restarting the gateway cannot make a consumed code valid again.

OpenClaw integration is opt-in and uses a separate Ed25519 device identity with only
`operator.approvals`. Its private key and device token remain
in a mode-0700 Beepster application-support directory with mode-0600 files. The phone and watch see
only sanitized summaries and opaque pending IDs. Before resolution, the gateway re-lists pending
approvals and requires the exact ID; accepted decisions are limited in code to `allow-once` and
`deny`. Beepster must never add `allow-always` or broader OpenClaw scopes without an explicit
security review and a new user consent flow.
