// Spacing is pure CSS (stylesheet.css). The only logic here moves the clock out of the
// centre of the top bar, so the right side gets the width the centre box would take.
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class RoomyPanel extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._clock = Main.panel.statusArea.dateMenu.container;
        this._home = this._clock.get_parent();
        this._homeIndex = this._home.get_children().indexOf(this._clock);
        this._settings.connectObject('changed::clock-position', () => this._placeClock(), this);
        this._placeClock();
    }

    disable() {
        this._settings.disconnectObject(this);
        this._moveClock(this._home, this._homeIndex);
        this._settings = null;
        this._clock = null;
        this._home = null;
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
