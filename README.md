# Roomy Panel

A tiny GNOME Shell extension that gives the top bar macOS-style breathing room.

![Top bar before (top) and after (bottom)](docs/before-after.png)

## Why

GNOME packs the right side of the top bar tightly: the Wi-Fi, Bluetooth and battery icons sit only 4px apart, and every panel button gets 12px of padding. Next to the macOS menu bar, where items sit roughly 16–20px apart, it looks cramped, especially once you add a few extension indicators and tray icons.

Roomy Panel is mostly CSS. The code moves the clock, lets the right side of the bar use empty space, and hides items you don't want up there; nothing runs in the background. Because it ships as an extension rather than an edited theme, it survives GNOME and theme updates and is easy to turn off.

| | GNOME default | Roomy Panel |
|---|---|---|
| Gap between system status icons (Wi-Fi, Bluetooth, battery…) | 4px | 16px |
| Panel button padding (natural / minimum) | 12px / 6px | 16px / 8px |
| Battery icon to battery percentage | 0px | 4px |

The wider button padding applies to everything in the top bar: extension indicators, tray icons, the clock and so on.

### The clock moves to the right

GNOME centres the clock and gives the left and right sides of the bar equal width. The left side is usually close to empty, while the right side fills up with tray icons. When the right side runs out of room, GNOME cuts off text labels such as the battery percentage ("8…"). Moving the clock to the far right, after the status icons as on a Mac, empties the centre.

GNOME still caps the right side at half the bar's width, though, so with enough tray icons the last items, including the clock, get pushed off the screen edge while the rest of the bar sits empty. Roomy Panel lets the right side grow leftwards into any space the left and centre sections aren't using, stopping a small gap short of them. This works with the clock in any position.

To put it back in the centre, or over on the left:

```sh
schemas=~/.local/share/gnome-shell/extensions/roomy-panel@jasperblues.github.io/schemas
gsettings --schemadir $schemas set org.gnome.shell.extensions.roomy-panel clock-position center   # or left, right (default)
```

This takes effect straight away.

### Hide items you don't need

Plenty of apps put an icon in the top bar that just repeats what the dock already shows. Open Roomy Panel's preferences (in the Extensions app) and turn off whatever you don't want. The app keeps running and its icon comes back if you switch it on again. It's like the Menu Bar page in macOS System Settings.

This works for tray icons (through the [AppIndicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) extension) and for other extensions' indicators. Items are remembered by a stable name, such as the app's tray ID (`tray:discord_status_icon_1`) or the extension's UUID, so your choices survive restarts. An item appears in the list once it has been in the top bar. The clock, the system menu, and the screen-recording and screen-sharing indicators can't be hidden.

From the command line:

```sh
gsettings --schemadir $schemas get org.gnome.shell.extensions.roomy-panel known-items    # what's been seen
gsettings --schemadir $schemas set org.gnome.shell.extensions.roomy-panel hidden-items "['tray:discord_status_icon_1']"
```

## Install

```sh
git clone https://github.com/jasperblues/gnome-roomy-panel.git \
  ~/.local/share/gnome-shell/extensions/roomy-panel@jasperblues.github.io
```

Compile the settings schema:

```sh
glib-compile-schemas ~/.local/share/gnome-shell/extensions/roomy-panel@jasperblues.github.io/schemas
```

Log out and back in (GNOME on Wayland only discovers new extensions at login), then:

```sh
gnome-extensions enable roomy-panel@jasperblues.github.io
```

Supports GNOME Shell 50 and 51.

## Tuning

All the spacing numbers are in [`stylesheet.css`](stylesheet.css). Edit them to taste, then log out and back in. GNOME doesn't reload an extension's stylesheet while it's running.

## Testing

`tools/nested-shot.sh` runs the extension in a throwaway headless GNOME Shell with a deliberately overfilled top bar and saves `tools/out/panel.png`. Pass `--off` to run without Roomy Panel for comparison, and set `ROOMY_SHOT_ICONS` to change the number of fake tray icons (default 14). It needs `mutter-devkit` and doesn't touch your real settings.

## See also

- [Headroom](https://github.com/jasperblues/gnome-headroom): AI plan limits in the top bar (shown in the screenshot).
- [Polite Focus](https://github.com/jasperblues/gnome-polite-focus): macOS-style focus for windows that ask for attention, with a mute list.

## License

MIT. See [LICENSE](LICENSE).
