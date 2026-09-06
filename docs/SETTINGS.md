# Beepster phone settings

The settings page follows the shared Organik layout based on Pome: **Setup, Themes, Shortcuts, Replies**.

Setup retains pairing, service and inbox filters, refresh interval, Apple conversation links, and agent approvals. Replies contains quick replies and the emoji picker. Shortcuts retains thread/chat button bindings and scroll distance.

## Themes

Choose a built-in preset or adjust the available colors, font, and size. Color swatches open the 64-color Pebble palette, with Pome's watch-color approximation. The watch preview updates while editing. Only fonts and sizes supported by this app are offered; preview fonts can fall back to a similar browser font.

The existing saved-theme library and its apply/delete behavior are preserved. Built-in themes cannot be deleted. Use the page’s save/apply action to send the selected theme to the watch.

Switching tabs keeps unsaved edits. Save applies the app's settings together, including connection details and app-specific controls. Closing without saving discards edits. No new pairing is required solely for this layout update.

## Implementation and validation

The dependency-free shared UI is vendored inside the page generator between `BEGIN ORGANIK SETTINGS UI` / `END ORGANIK SETTINGS UI` markers. The app's original controls remain the source of truth and its existing save handler produces the Pebble callback. Coordinate shared UI updates across the other Organik Pebble apps.

Verified with generated-page browser checks on 320px and 390px viewports, Time/Time 2 configuration variants, palette interactions, and before/after save-payload comparisons. New custom theme libraries were checked through phone storage and reopening. Hardware installation and public release are separate from these source changes.

## Basic touch navigation

In watch version 0.16.0, tap a different menu row to highlight it and read its
scrolling title, then tap the highlighted row to activate it. This is not a timed
double tap. In a chat, activating an ordinary message starts dictation with
confirmation. Swipe vertically through messages and long expanded text. Approval
requests and decisions ignore taps; use their physical-button controls. Touch
does not run custom button bindings. Enable touch under Settings → Display → Touch
and wake the watch first. Physical-button controls remain available.

Use Organik Apps Pebble Connector 0.5.0 or newer for this settings layout. Existing
connections and saved themes do not require resetting.
