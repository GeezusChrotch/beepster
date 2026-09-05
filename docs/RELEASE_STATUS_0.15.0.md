# 0.15.0 release verification

Status checked September 5, 2026. This records the release operation, not a
guarantee that the storefront has refreshed since the check.

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

## Still pending

The [public storefront](https://apps.repebble.com/d2ee8ca7db384c6ca9eefa57)
still displayed 0.14.0 and supplied the older PBW when checked after backend
publication. Public catalog propagation or release selection remains unresolved;
do not claim that its download has been verified as 0.15.0. No duplicate release
was uploaded. The coordinator is arranging existing-account dashboard sign-in
to inspect this discrepancy and update the older listing description.

The unified Connector is released separately by its owner. Its final Beepster
gateway/helper/plugin source input is the commit above; this status document
does not alter those inputs. Legacy standalone Connector packages are not part
of this release.

Before closing the storefront item, verify that the public version and download
both show 0.15.0, download that PBW, and compare it to the SHA-256 above. Retain
the existing release rather than uploading another copy to force refresh.
