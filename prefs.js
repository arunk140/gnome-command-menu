const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Gio = imports.gi.Gio;

function getSettings () {
  let GioSSS = Gio.SettingsSchemaSource;
  let schemaSource = GioSSS.new_from_directory(
    Me.dir.get_child("schemas").get_path(),
    GioSSS.get_default(),
    false
  );
  let schemaObj = schemaSource.lookup(
    'org.gnome.shell.extensions.commandmenu', true);
  if (!schemaObj) {
    throw new Error('cannot find schemas');
  }
  return new Gio.Settings({ settings_schema : schemaObj });
}

function init () {
}

function buildPrefsWidget () {
  let widget = new MyPrefsWidget();
  widget.show();
  return widget;
}

const MyPrefsWidget = new GObject.Class({
  Name : "CommandMenu.Prefs.Widget",
  GTypeName : "CommandMenuPrefsWidget",
  Extends : Gtk.Box,
  _init : function (params) {
    this.parent(params);
    this.margin = 20;
    this.set_spacing(15);
    this.set_orientation(Gtk.Orientation.VERTICAL);

    let myLabel = new Gtk.Label({
      label: "Translated Text"    
    });
    const linkBtn = new Gtk.LinkButton({
      label: "Examples (~/.commands.json)",
      uri: 'https://github.com/arunk140/gnome-command-menu/tree/main/examples',
      halign: Gtk.Align.END,
      valign: Gtk.Align.CENTER,
      hexpand: true,
  });
    
    var settings = getSettings();

    let reloadBtn = new Gtk.Button({
      label: "Reload Extension"
    });
    reloadBtn.connect("clicked", function () {
      var rc = settings.get_int('restart-counter');
      settings.set_int('restart-counter', rc+1);
    });

    let editAction = new Gtk.Button({
      label: "Edit Commands"
    });
    editAction.connect("clicked", function () {
      var ed = settings.get_int('edit-counter');
      settings.set_int('edit-counter', ed+1);
    });


    const toggles = [
      {
        label: "Hide/Show 'Edit Commands' Button in Menu",
        key: "edit-button-visible"
      },
      {
        label: "Hide/Show 'Reload' Button in Menu",
        key: "reload-button-visible"
      }
    ]

    toggles.forEach((toggle) => {
      let hbox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 20
      });
      let label = new Gtk.Label({
        label: toggle.label,
        xalign: 0
      });
      let switcher = new Gtk.Switch({
        active: settings.get_boolean(toggle.key)
      });
      switcher.connect('notify::active', function (button) {
        settings.set_boolean(toggle.key, button.active);
        settings.set_int('restart-counter', settings.get_int('restart-counter') + 1);
      });
      hbox.append(label, true, true, 0);
      hbox.append(switcher);
      this.append(hbox);
    });

    let hBox = new Gtk.Box();
    hBox.set_orientation(Gtk.Orientation.HORIZONTAL);
    hBox.prepend(linkBtn, false, false, 0);

    this.append(reloadBtn, false, false, 0);
    this.append(editAction, false, false, 0);
    this.append(hBox);
  }
});

