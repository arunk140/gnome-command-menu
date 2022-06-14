const Main = imports.ui.main;
const {St, GLib} = imports.gi;
const GObject = imports.gi.GObject;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Me = imports.misc.extensionUtils.getCurrentExtension();

let commandMenuPopup;
let commands = {};

function reloadExtension() {
  commandMenuPopup.destroy();
  enable();
}

function populateMenuItems(menu, cmds, level) {
  cmds.forEach((cmd) => {
    if (cmd.type === 'separator') {
      menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      return;
    }
    if (!cmd.title) { return; }
    if (cmd.type === 'submenu' && level === 0) { // Stop submenu from being added after the first level
      let submenu;
      if (!cmd.submenu) { return; }
      submenu = new PopupMenu.PopupSubMenuMenuItem(cmd.title);
      populateMenuItems(submenu.menu, cmd.submenu, level + 1);
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
    let menuTitle = commands.title && commands.title.length > 0 ? commands.title : "";
    let box = new St.BoxLayout();
    if (commands.showIcon !== false || (menuTitle === "")) {
      var menuIcon = commands.icon && commands.icon.length > 0 ? {
        icon_name: commands.icon,
        style_class: 'system-status-icon' 
      } : {
        gicon : Gio.icon_new_for_string( Me.dir.get_path() + '/icon.svg' ),
        style_class : 'system-status-icon',
      };
      let icon = new St.Icon(menuIcon);
      box.add(icon);
    }

    let toplabel = new St.Label({
      text: menuTitle,
      y_expand: true,
      y_align: Clutter.ActorAlign.CENTER
    });
    box.add(toplabel);
    this.add_child(box);
    let level = 0;
    populateMenuItems(this.menu, commands.menu, level);
    
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
      var jsonContent = JSON.parse(contents);
      if (jsonContent instanceof Array) {
        commands['menu'] = jsonContent;
      } else if (jsonContent instanceof Object && jsonContent.menu instanceof Array) {
        commands = jsonContent;
      }
    }
  } catch (e) {
    commands = {
      menu: []
    };
  }
  commands.menu.push({
    type: 'separator'
  });
  commandMenuPopup = new CommandMenuPopup();
  Main.panel.addToStatusArea('commandMenuPopup', commandMenuPopup, 1);
}

function disable() {
  commandMenuPopup.destroy();
  commandMenuPopup = null;
  commands = {};
}
