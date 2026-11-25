#!/usr/bin/env bash
# Run Roomy Panel in a throwaway headless GNOME Shell with an overfilled top bar and save
# tools/out/panel.png. Your real GNOME settings are not touched. Needs mutter-devkit.
#
# Usage: tools/nested-shot.sh [--off]     --off runs without Roomy Panel, for comparison
# Also starts two real tray icons (tools/fake-tray.py) through the AppIndicator extension
# when it is installed, named tray:fake-chat and tray:fake-sync.
# Env:   ROOMY_SHOT_ICONS=n                number of fake tray icons (default 14)
#        ROOMY_HIDE="'roomy-fake-0', ..."   items to put in hidden-items
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
repo=$(dirname "$here")
out="$here/out"
uuids="'roomy-shot@local'"
appind=appindicatorsupport@rgcjonas.gmail.com
[[ -d /usr/share/gnome-shell/extensions/$appind ]] && uuids+=", '$appind'"
[[ ${1:-} == --off ]] || uuids="'roomy-panel@jasperblues.github.io', $uuids"

glib-compile-schemas "$repo/schemas"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$out" "$tmp/data/gnome-shell/extensions" "$tmp/config" "$tmp/runtime"
chmod 700 "$tmp/runtime"
rm -f "$out/panel.png" "$out/tray.log"
ext="$tmp/data/gnome-shell/extensions"
ln -s "$repo" "$ext/roomy-panel@jasperblues.github.io"
ln -s "$here/roomy-shot@local" "$ext/roomy-shot@local"

cat > "$tmp/inner.sh" <<INNER
#!/bin/bash
dconf write /org/gnome/shell/enabled-extensions "[$uuids]"
echo "ROOMYSHOT enabled=[$uuids]"
dconf write /org/gnome/desktop/interface/color-scheme "'prefer-dark'"
dconf write /org/gnome/shell/welcome-dialog-last-shown-version "'999'"
dconf write /org/gnome/shell/extensions/roomy-panel/hidden-items "[${ROOMY_HIDE:-}]"
(sleep 6; python3 -I "$here/fake-tray.py" fake-chat 'Fake Chat' mail-unread-symbolic 2>>"$out/tray.log" &
 python3 -I "$here/fake-tray.py" fake-sync 'Fake Sync' folder-remote-symbolic 2>>"$out/tray.log" &) &
(sleep 20; echo "ROOMYSHOT known=\$(dconf read /org/gnome/shell/extensions/roomy-panel/known-items)") &
timeout 30 gnome-shell --headless --virtual-monitor 1440x900 --wayland --no-x11 > "$out/shell.log" 2>&1
true
INNER
chmod +x "$tmp/inner.sh"
env -u WAYLAND_DISPLAY -u DISPLAY XDG_DATA_HOME="$tmp/data" XDG_CONFIG_HOME="$tmp/config" \
    XDG_RUNTIME_DIR="$tmp/runtime" ROOMY_SHOT_DIR="$out" dbus-run-session -- "$tmp/inner.sh" 2>/dev/null
grep -E 'ROOMYSHOT|JS ERROR|roomy' "$out/shell.log" || true
ls "$out"/*.png
