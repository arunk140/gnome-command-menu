const Main = imports.ui.main;
const {St, GLib} = imports.gi;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Me = imports.misc.extensionUtils.getCurrentExtension();

let commandMenuPopup;
let commands = [];

function reloadExtension() {
  commandMenuPopup.destroy();
  enable();
}

function populateMenuItems(menu, cmds) {
  cmds.forEach((cmd) => {
    if (cmd.type === 'separator') {
      menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      return;
    }
    if (!cmd.title) { return; }
    if (cmd.type === 'submenu') {
      let submenu;
      if (!cmd.submenu) { return; }
      submenu = new PopupMenu.PopupSubMenuMenuItem(cmd.title);
      populateMenuItems(submenu.menu, cmd.submenu);
      menu.addMenuItem(submenu);
      return;
    }
    if (!cmd.command) { return; }
    let item;
    if (cmd.icon) {
      item = new PopupMenu.PopupImageMenuItem(
        cmd.title,
        cmd.icon
      );
    } else {
      item = new PopupMenu.PopupMenuItem(cmd.title);
    }
    item.connect('activate', () => {
      GLib.spawn_command_line_async(cmd.command);
    });
    menu.addMenuItem(item);
  })
}

const CommandMenuPopup = GObject.registerClass(
class CommandMenuPopup extends PanelMenu.Button {
  _init () {
    super._init(0);
    let icon = new St.Icon({
      gicon : Gio.icon_new_for_string( Me.dir.get_path() + '/icon.svg' ),
      style_class : 'system-status-icon',
    });
    this.add_child(icon);
    populateMenuItems(this.menu, commands);
    
    let editBtn = new PopupMenu.PopupMenuItem('Edit Commands');
    editBtn.connect('activate', () => {
      // Check if ~/.commands.json exsists (if not create it)
      let file = Gio.file_new_for_path(GLib.get_home_dir() + '/.commands.json');
      if (!file.query_exists(null)) {
        file.replace_contents(JSON.stringify(commands), null, false, 0, null);
      }
      // Edit ~/.commands.json
      Gio.AppInfo.launch_default_for_uri('file://' + GLib.get_home_dir() + '/.commands.json', null).launch(null, null);
    });
    this.menu.addMenuItem(editBtn);

    let reloadBtn = new PopupMenu.PopupMenuItem('Reload');
    reloadBtn.connect('activate', () => {
      reloadExtension();
    });
    this.menu.addMenuItem(reloadBtn);
  }
});

function init() {
}

function enable() {
  var filePath = ".commands.json";
  var file = Gio.file_new_for_path(GLib.get_home_dir() + "/" + filePath);
  try {
    var [ok, contents, _] = file.load_contents(null);
    if (ok) {
      commands = JSON.parse(contents);
    }
  } catch (e) {
    commands = [];
  }
  commands.push({
    type: 'separator'
  });
  commandMenuPopup = new CommandMenuPopup();
  Main.panel.addToStatusArea('commandMenuPopup', commandMenuPopup, 1);
}

function disable() {
  commandMenuPopup.destroy();
  commandMenuPopup = null;
  commands = [];
}
