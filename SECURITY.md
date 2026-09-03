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
