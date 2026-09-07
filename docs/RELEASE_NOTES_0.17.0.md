# Beepster 0.17.0 — Smooth scrolling and simpler controls

## What's improved

- Chat scrolling follows your finger continuously instead of jumping between
  messages. Fixes address cut-off message bottoms, overlapping sender lines, blank
  space and jumbled drawing near timeline edges.
- Up/Down button scrolling moves one line. Font layout and full-text loading remain
  stable during a drag. Swipe right to return to the conversation list.
- Tapping a message only focuses it. It no longer starts dictation.
- Live refresh retries dropped view-state signals, and new agent replies are no
  longer hidden from change detection by unchanged approval-menu rows. The default
  is a 15-second delay between completed checks; network and watch transfer time can
  add latency. Slower and manual refresh settings remain available.

## Default controls

| Gesture | Conversation list | Open chat |
| --- | --- | --- |
| Hold Top | Quick reply | Quick reply |
| Hold Middle | Dictate | Dictate |
| Hold Bottom | Archive conversation | Delete message |
| Short Middle | Open conversation | No action |
| Double Back | Top of newest conversation list | Return to top of newest conversation list |

Delete/archive still requires repeating the gesture to confirm. Approval rows
retain their dedicated physical-button decisions; taps cannot approve anything.
All shortcuts remain configurable. Unchanged old defaults migrate; custom mappings
are preserved. Pairing, themes, service filters and saved replies are retained.

## Update and requirements

Install Beepster 0.17.0 and
[Organik Apps Pebble Connector 0.7.0 or newer](https://github.com/GeezusChrotch/organik-pebble-connector/releases/latest)
to get the matching phone settings, including the new Top of conversation list
action. The Mac settings module is delivered by the unified Connector, not the PBW.

Requires Pebble Time 2, a Mac running Beeper Desktop, and private Tailscale access
on Mac and phone. iPhone is the tested phone setup. See the
[installation guide](https://geezuschrotch.github.io/beepster/INSTALL),
[controls guide](https://github.com/GeezusChrotch/beepster/blob/main/docs/USER_GUIDE.md),
and [optional agent setup](https://github.com/GeezusChrotch/beepster/blob/main/docs/AGENT_APPROVALS.md).

## Validation and known limitations

The owner confirmed the scrolling/clipping fix on the physical watch. The subsequent
candidate containing swipe-back, live-refresh repairs and new button defaults was
installed successfully, but those newest behaviors have not received a separate
owner acceptance report. This release is a version-stamped rebuild, not a claim of
an additional full hardware regression run. Automated source tests, watch build and
public-package privacy checks are separate release checks.

- Up to 30 conversations per rolling page and 60 messages in a loaded chat; text
  and media caches are bounded by watch memory.
- Photos use static previews; GIF animation is not supported.
- iMessage message deletion remains disabled. Conversation archiving is available.
- Hermes/OpenClaw are optional and require explicit agent/session/chat links.
  Approval delivery is not proof that an agent completed its requested change.

## Feedback welcome

[Report bugs or share feedback](https://github.com/GeezusChrotch/beepster/issues/new/choose).
Include watch/Connector versions, theme, steps and expected versus actual behavior.
Please remove private messages, contact information, credentials and private network
addresses from screenshots and logs.
