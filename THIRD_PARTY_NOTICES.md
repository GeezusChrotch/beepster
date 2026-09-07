# Third-party notices

## Pebble display palette

`gateway/src/pebble-image.cjs` uses room-light palette samples from
[czmanix/pebble-color-optimizer](https://github.com/czmanix/pebble-color-optimizer),
commit `d0609657e0a1d41241c84954855b19a7547ba9c6`, copyright 2026 czmanix (MIT).
The full license is retained in the module. Samples are endpoint-normalized and
combined with Organik tone adjustment and optional photo dithering; they are an
approximation for one lighting condition, not a factory display calibration.

## Twemoji graphics

The emoji artwork in `resources/images/emoji-atlas.png`,
`resources/images/emoji-chat-default.png`, and `gateway/assets/emoji/emoji-atlas-24.png` is adapted from
[Twemoji](https://github.com/jdecked/twemoji). The graphics are licensed under the
[Creative Commons Attribution 4.0 International license](https://creativecommons.org/licenses/by/4.0/).
The original SVG artwork was resized, arranged into a sprite atlas, and reduced to a Pebble-friendly
color palette for Beepster.

## Unicode emoji data

`gateway/assets/emoji/emoji-catalog.json` is generated from Unicode's `emoji-test.txt` data. The
Unicode data files and software are distributed under the
[Unicode License v3](https://www.unicode.org/license.txt). See the
[Unicode copyright and terms of use](https://www.unicode.org/copyright.html).
