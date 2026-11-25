#!/usr/bin/env python3
"""Minimal StatusNotifierItem (tray icon) for tests: fake-tray.py ID TITLE ICON-NAME.
Registers with the StatusNotifierWatcher (the AppIndicator extension) and runs until killed."""
import sys
from gi.repository import Gio, GLib

ID, TITLE, ICON = sys.argv[1:4]
XML = """<node><interface name="org.kde.StatusNotifierItem">
<property name="Category" type="s" access="read"/><property name="Id" type="s" access="read"/>
<property name="Title" type="s" access="read"/><property name="Status" type="s" access="read"/>
<property name="IconName" type="s" access="read"/><property name="ItemIsMenu" type="b" access="read"/>
<method name="Activate"><arg type="i" direction="in"/><arg type="i" direction="in"/></method>
</interface></node>"""
PROPS = {'Category': GLib.Variant('s', 'ApplicationStatus'), 'Id': GLib.Variant('s', ID),
         'Title': GLib.Variant('s', TITLE), 'Status': GLib.Variant('s', 'Active'),
         'IconName': GLib.Variant('s', ICON), 'ItemIsMenu': GLib.Variant('b', False)}

bus = Gio.bus_get_sync(Gio.BusType.SESSION)
bus.register_object('/StatusNotifierItem', Gio.DBusNodeInfo.new_for_xml(XML).interfaces[0],
                    lambda *a: a[-1].return_value(None), lambda c, s, p, i, prop: PROPS[prop], None)

def register():
    try:
        bus.call_sync('org.kde.StatusNotifierWatcher', '/StatusNotifierWatcher', 'org.kde.StatusNotifierWatcher',
                      'RegisterStatusNotifierItem', GLib.Variant('(s)', (bus.get_unique_name(),)),
                      None, 0, -1, None)
        print(f'fake-tray {ID}: registered', file=sys.stderr, flush=True)
        return False
    except GLib.Error as e:
        print(f'fake-tray {ID}: {e.message}', file=sys.stderr, flush=True)
        return True  # watcher not up yet; retry

GLib.timeout_add_seconds(1, register)
GLib.MainLoop().run()
