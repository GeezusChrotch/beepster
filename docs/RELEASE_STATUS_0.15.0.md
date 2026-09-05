# 0.15.0 release verification

Publication verified September 5, 2026 on GitHub and the public Pebble storefront.

## Verified

- Source/tag: `cd3c930d72209bec07c5c2c14323152962bf301d`, `v0.15.0`.
- [GitHub release](https://github.com/GeezusChrotch/beepster/releases/tag/v0.15.0)
  published, public PBW downloaded and checked against the packaged artifact.
- PBW SHA-256:
  `e9def5ef2684d23d3eb4094eae7bb8cdb483ee5a664a70085d7fea504dc1ed9e`.
- Release checks: 157 JavaScript tests, two Hermes bridge tests, Swift checks,
  Emery build, and release-package private-data/source-map checks passed.
- GitHub Test and Pages deployment workflows succeeded; the public agent setup
  guide includes watch 0.15.0 and unified Connector 0.3.0 requirements.
- Official publisher accepted the upload. Its authenticated developer metadata
  reports app visibility enabled and latest release 0.15.0 with
  `is_published: true`, `has_pbw: true`, published at
  `2026-09-05T21:51:37.657`.
- The owner confirmed the preceding same-code physical-watch build's approval
  focus/navigation fix. The final version-stamped artifact has not received a
  new full physical-watch regression run.

## Public storefront verified

The coordinator confirmed the existing 0.15.0 release was Published in the
signed-in dashboard. The [public storefront](https://apps.repebble.com/d2ee8ca7db384c6ca9eefa57)
now displays 0.15.0. Its [watch package](https://appstore-api.repebble.com/api/assets/pbw/d2ee8ca7db384c6ca9eefa57/0.15.0/a978c73b-9032-4ccb-a5d1-39733f16bc34.pbw)
was independently downloaded: 230,691 bytes, matching the SHA-256 above exactly.
The initial stale 0.14.0 storefront state is resolved. No duplicate upload or
release visibility toggle was needed.

The listing description was updated and verified publicly with Hermes/OpenClaw
hold-center controls, explicit session/chat linking, the guarded OpenClaw
2026.9.1 text fallback, unified Connector 0.3.0 requirements and download link,
and the continuing iMessage message-deletion limitation. The public source link
is correct.

## Separate Connector release

The unified Connector is released separately by its owner. Its final Beepster
gateway/helper/plugin source input is the commit above; this status document
does not alter those inputs. Legacy standalone Connector packages are not part
of this release.

The Beepster storefront publication item is closed. This documentation update
does not change the tagged source or the verified release package.
