// Spacing is mostly CSS (stylesheet.css). The code here does three things:
//  - moves the clock out of the centre of the top bar (clock-position setting);
//  - lets the right side of the bar grow left into unused space. GNOME caps each side at
//    half the bar's width (around the centre box), so a full tray gets cut off at the
//    screen edge even when the rest of the bar is empty;
//  - hides the top-bar items named in the hidden-items setting (chosen in the preferences).
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// Never offered for hiding: the clock and system menu, and the screen-recording and
// screen-sharing indicators, which are there for privacy.
const NEVER_HIDE = new Set(['activities', 'dateMenu', 'quickSettings', 'screenRecording', 'screenSharing']);

// A name for a top-bar item that stays the same across logins. Tray icons (from the
// AppIndicator extension) are registered under IDs containing D-Bus names or PIDs, so use
// the app's own tray ID, or the window class for old-style (XEmbed) tray icons. Returns
// null for a tray icon that hasn't said who it is yet.
function itemName(role, indicator) {
    if (!role.startsWith('appindicator-'))
        return role;
    const id = indicator._indicator?.id || indicator._icon?.wm_class;
    return id ? `tray:${id}` : null;
}

function itemLabel(indicator, name) {
    return indicator.accessible_name || indicator._indicator?.title || name.replace(/^tray:/, '');
}

// Gap kept between the grown right side and whatever is to its left, in logical pixels.
const GAP = 12;

// Layout for the panel's right box: when its contents are wider than the space the panel
// gave it, extend it leftwards (children get negative x) up to the end of the left and
// centre boxes, instead of letting the rightmost items fall off the screen edge.
const GrowLeftLayout = GObject.registerClass(
class GrowLeftLayout extends Clutter.BoxLayout {
    vfunc_allocate(container, box) {
        const panel = Main.panel;
        const width = box.x2 - box.x1;
        const [, natural] = container.get_preferred_width(-1);
        if (natural > width && container.get_text_direction() !== Clutter.TextDirection.RTL) {
            const gap = GAP * St.ThemeContext.get_for_stage(global.stage).scale_factor;
            const limit = Math.max(
                panel._leftBox.allocation.x2,
                panel._centerBox.get_n_children() > 0 ? panel._centerBox.allocation.x2 : 0) + gap;
            const room = container.allocation.x1 - limit;
            if (room > 0) {
                box = box.copy();
                box.x1 -= Math.min(natural - width, room);
            }
        }
        super.vfunc_allocate(container, box);
    }
});

export default class RoomyPanel extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._clock = Main.panel.statusArea.dateMenu.container;
        this._home = this._clock.get_parent();
        this._homeIndex = this._home.get_children().indexOf(this._clock);
        this._settings.connectObject('changed::clock-position', () => this._placeClock(), this);
        this._placeClock();

        const rightBox = Main.panel._rightBox;
        this._rightLayout = rightBox.layout_manager;
        const layout = new GrowLeftLayout({orientation: Clutter.Orientation.HORIZONTAL});
        layout.spacing = this._rightLayout.spacing;
        rightBox.layout_manager = layout;

        // Hiding items (hidden-items setting). Boxes gain children whenever an app or
        // extension adds an indicator, so re-apply then.
        this._hidden = new Map(); // container -> visibility before we hid it
        this._labelWatched = new Set();
        for (const box of [Main.panel._leftBox, Main.panel._centerBox, Main.panel._rightBox]) {
            box.connectObject(
                'child-added', () => this._refreshItems(),
                'child-removed', () => this._refreshItems(), this);
        }
        this._settings.connectObject('changed::hidden-items', () => this._refreshItems(), this);
        this._refreshItems();
    }

    disable() {
        for (const box of [Main.panel._leftBox, Main.panel._centerBox, Main.panel._rightBox])
            box.disconnectObject(this);
        for (const [container, wasVisible] of this._hidden)
            container.visible = wasVisible;
        this._hidden = null;
        const live = new Set(Object.values(Main.panel.statusArea));
        for (const indicator of this._labelWatched) {
            if (live.has(indicator))
                indicator.disconnectObject(this);
        }
        this._labelWatched = null;

        Main.panel._rightBox.layout_manager = this._rightLayout;
        this._rightLayout = null;
        this._settings.disconnectObject(this);
        this._moveClock(this._home, this._homeIndex);
        this._settings = null;
        this._clock = null;
        this._home = null;
    }

    // Hide the items named in hidden-items, un-hide the rest, and record every item seen
    // in known-items so the preferences window can list them.
    _refreshItems() {
        const hidden = new Set(this._settings.get_strv('hidden-items'));
        const known = this._settings.get_value('known-items').deep_unpack();
        let knownChanged = false;
        const nowHidden = new Map();
        for (const [role, indicator] of Object.entries(Main.panel.statusArea)) {
            if (!indicator || NEVER_HIDE.has(role))
                continue;
            if (!this._labelWatched.has(indicator)) {
                // Tray icons often learn their ID and name, and show themselves, after being added.
                this._labelWatched.add(indicator);
                indicator.connectObject(
                    'notify::accessible-name', () => this._refreshItems(),
                    'notify::visible', () => this._refreshItems(), this);
            }
            const name = itemName(role, indicator);
            if (!name)
                continue;
            // List only items that have actually been shown, not built-in menus that are
            // usually invisible (Accessibility, Keyboard and so on).
            const label = itemLabel(indicator, name);
            if ((indicator.visible || known[name] !== undefined) && known[name] !== label) {
                known[name] = label;
                knownChanged = true;
            }
            if (hidden.has(name)) {
                const {container} = indicator;
                nowHidden.set(container, this._hidden.get(container) ?? container.visible);
                container.visible = false;
            }
        }
        const liveIndicators = new Set(Object.values(Main.panel.statusArea).filter(Boolean));
        for (const indicator of this._labelWatched) {
            if (!liveIndicators.has(indicator))
                this._labelWatched.delete(indicator); // destroyed; its signals went with it
        }
        const live = new Set([...liveIndicators].map(i => i.container));
        for (const [container, wasVisible] of this._hidden) {
            if (!nowHidden.has(container) && live.has(container))
                container.visible = wasVisible;
        }
        this._hidden = nowHidden;
        if (knownChanged)
            this._settings.set_value('known-items', new GLib.Variant('a{ss}', known));
    }

    _placeClock() {
        switch (this._settings.get_string('clock-position')) {
        case 'left':
            this._moveClock(Main.panel._leftBox, -1);
            break;
        case 'right':
            // Far right, after the status area, as in the macOS menu bar.
            this._moveClock(Main.panel._rightBox, -1);
            break;
        default:
            this._moveClock(this._home, this._homeIndex);
        }
    }

    _moveClock(box, index) {
        const parent = this._clock.get_parent();
        if (parent === box)
            return;
        parent?.remove_child(this._clock);
        box.insert_child_at_index(this._clock, index);
    }
}
