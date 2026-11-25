import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const CLOCK_POSITIONS = [['left', 'Left'], ['center', 'Centre'], ['right', 'Right, after the status icons']];

export default class RoomyPanelPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();
        window.add(page);

        const clockGroup = new Adw.PreferencesGroup({title: 'Clock'});
        page.add(clockGroup);
        const clockRow = new Adw.ComboRow({
            title: 'Position',
            model: Gtk.StringList.new(CLOCK_POSITIONS.map(([, label]) => label)),
        });
        const syncClock = () => {
            clockRow.selected = Math.max(0,
                CLOCK_POSITIONS.findIndex(([key]) => key === settings.get_string('clock-position')));
        };
        syncClock();
        clockRow.connect('notify::selected', () =>
            settings.set_string('clock-position', CLOCK_POSITIONS[clockRow.selected][0]));
        settings.connect('changed::clock-position', syncClock);
        clockGroup.add(clockRow);

        let itemsGroup = null;
        const buildItems = () => {
            if (itemsGroup)
                page.remove(itemsGroup);
            itemsGroup = new Adw.PreferencesGroup({
                title: 'Show in Top Bar',
                description: 'Turn off items you don\'t need up there. The apps keep running. ' +
                    'Items appear here once they have been in the top bar.',
            });
            page.add(itemsGroup);
            const known = settings.get_value('known-items').deep_unpack();
            const entries = Object.entries(known).sort(([, a], [, b]) => a.localeCompare(b));
            for (const [name, label] of entries) {
                const row = new Adw.SwitchRow({
                    title: label,
                    subtitle: name === label ? '' : name,
                    active: !settings.get_strv('hidden-items').includes(name),
                });
                row.connect('notify::active', () => {
                    const hidden = new Set(settings.get_strv('hidden-items'));
                    if (row.active)
                        hidden.delete(name);
                    else
                        hidden.add(name);
                    settings.set_strv('hidden-items', [...hidden].sort());
                });
                itemsGroup.add(row);
            }
        };
        buildItems();
        settings.connect('changed::known-items', buildItems);
    }
}
