const Main = imports.ui.main;
const {St, GLib} = imports.gi;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Me = imports.misc.extensionUtils.getCurrentExtension();

let myPopup;
let commands = [];

function reloadExtension() {
  myPopup.destroy();
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

const MyPopup = GObject.registerClass(
class MyPopup extends PanelMenu.Button {
  _init () {
    super._init(0);
    let icon = new St.Icon({
      gicon : Gio.icon_new_for_string( Me.dir.get_path() + '/icon.svg' ),
      style_class : 'system-status-icon',
    });
    this.add_child(icon);
    populateMenuItems(this.menu, commands);
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
    var [ok, contents, etag] = file.load_contents(null);
    if (ok) {
      commands = JSON.parse(contents);
    }
  } catch (e) {
    commands = [];
  }
  commands.push({
    type: 'separator'
  })
  commands.push({
    title: 'Edit .commands.json',
    command: "gnome-terminal -- bash -c 'nano " + GLib.get_home_dir() + "/" + filePath + "'",
  });
  
  myPopup = new MyPopup();
  Main.panel.addToStatusArea('myPopup', myPopup, 1);
}


function disable() {
  myPopup.destroy();
}
