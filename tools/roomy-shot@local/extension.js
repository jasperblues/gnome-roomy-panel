// Test helper for tools/nested-shot.sh: adds ROOMY_SHOT_ICONS fake tray icons to the right side
// of the top bar (default 14), screenshots the panel, and logs where the clock ended up.
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

Gio._promisify(Shell.Screenshot.prototype, 'screenshot');
const OUT = GLib.getenv('ROOMY_SHOT_DIR');
const wait = ms => new Promise(r => GLib.timeout_add(0, ms, () => { r(); return GLib.SOURCE_REMOVE; }));
const ICONS = ['face-smile-symbolic', 'mail-unread-symbolic', 'weather-clear-symbolic',
    'folder-symbolic', 'starred-symbolic', 'user-available-symbolic', 'camera-photo-symbolic'];

async function shot(name) {
    const stream = Gio.File.new_for_path(`${OUT}/${name}.png`).replace(null, false, Gio.FileCreateFlags.NONE, null);
    await new Shell.Screenshot().screenshot(false, stream);
    stream.close(null);
}

export default class extends Extension {
    enable() {
        const n = Number(GLib.getenv('ROOMY_SHOT_ICONS') ?? 14);
        for (let i = 0; i < n; i++) {
            const button = new PanelMenu.Button(0.5, `fake${i}`, true);
            button.add_child(new St.Icon({icon_name: ICONS[i % ICONS.length], style_class: 'system-status-icon'}));
            Main.panel.addToStatusArea(`roomy-fake-${i}`, button, 0, 'right');
        }
        (async () => {
            try {
                await wait(9000);
                Main.overview.hide();
                await wait(2500);
                const clock = Main.panel.statusArea.dateMenu.container;
                const [x] = clock.get_transformed_position();
                console.log(`ROOMYSHOT clockRight=${x + clock.width} panel=${Main.panel.width} ` +
                    `left=${Main.panel._leftBox.allocation.x2} right.x1=${Main.panel._rightBox.allocation.x1}`);
                const hidden = Object.entries(Main.panel.statusArea)
                    .filter(([, i]) => i && !i.container.visible).map(([r]) => r);
                for (const [r, i] of Object.entries(Main.panel.statusArea).filter(([r]) => r.startsWith('appindicator-')))
                    console.log(`ROOMYSHOT tray ${r} visible=${i.visible} cvisible=${i.container.visible} id=${i._indicator?.id} name=${i.accessible_name} title=${i._indicator?.title}`);
                console.log(`ROOMYSHOT hidden=${hidden.join(',')}`);
                await shot('panel');
                // Un-hide everything at runtime, as the preferences switches do.
                const roomy = Main.extensionManager.lookup('roomy-panel@jasperblues.github.io');
                if (roomy) {
                    const settings = roomy.stateObj.getSettings();
                    settings.set_strv('hidden-items', []);
                    const still = Object.entries(Main.panel.statusArea)
                        .filter(([, i]) => i && !i.container.visible).map(([r]) => r);
                    console.log(`ROOMYSHOT after-unhide hidden=${still.join(',')}`);
                }
                console.log('ROOMYSHOT done');
            } catch (e) {
                console.error('ROOMYSHOT', e);
            }
        })();
    }

    disable() {}
}
