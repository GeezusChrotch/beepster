# Changelog

All notable changes to Beepster are documented here.

## 0.9.0 — Release candidate

- Add original Beepster brand artwork, 25×25 watch launcher icon, Store icon, and header.
- Add a universal first-run setup handoff so a public PBW does not embed a user's private URL.
- Add complete install, user, troubleshooting, performance, and publishing guides.
- Cache full-message and preview text layout to reduce work during two-line scrolling.
- Send theme/font packets only at startup or after an actual theme change.
- Prevent background chat refresh from replacing an open thread's state.
- Reject late responses from abandoned chats and discard obsolete queued detail/media chunks.
- Cache and coalesce the eight most recent Mac-side media previews.
- Add a credential-safe Mac health checker and reproducible release packaging script.
- Add a synthetic-data demo build for privacy-safe Store screenshots.

## 0.8.3

- Move quick replies to long Top.
- Start dictation with either short or long Center.
- Move jump-to-newest to long Bottom while retaining two-line short-button scrolling.

Earlier development milestones are recorded in [ROADMAP.md](ROADMAP.md).
