const Main = imports.ui.main;
const {St, GLib} = imports.gi;
const GObject = imports.gi.GObject;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
var Me = imports.misc.extensionUtils.getCurrentExtension();

let commandMenuPopup;
let commandMenuSettings;
let commands = {};
let commandMenuSettingsId = [];

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

function reloadExtension() {
  commands = {};
  commandMenuPopup.destroy();
  addCommandMenu();
}

function editCommandsFile () {
  // Check if ~/.commands.json exsists (if not create it)
  let file = Gio.file_new_for_path(GLib.get_home_dir() + '/.commands.json');
  if (!file.query_exists(null)) {
    file.replace_contents(JSON.stringify(commands), null, false, 0, null);
  }
  // Edit ~/.commands.json
  Gio.AppInfo.launch_default_for_uri('file://' + GLib.get_home_dir() + '/.commands.json', null).launch(null, null);
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

function redrawMenu (popUpMenu) {
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
  popUpMenu.add_child(box);
  let level = 0;
  populateMenuItems(popUpMenu.menu, commands.menu, level);
  
  if (commandMenuSettings.get_boolean('edit-button-visible')) {
    let editBtn = new PopupMenu.PopupMenuItem('Edit Commands');
    editBtn.connect('activate', () => {
      editCommandsFile();
    });
    popUpMenu.menu.addMenuItem(editBtn);
  }

  if (commandMenuSettings.get_boolean('reload-button-visible')) {
    let reloadBtn = new PopupMenu.PopupMenuItem('Reload');
    reloadBtn.connect('activate', () => {
      reloadExtension();
    });
    popUpMenu.menu.addMenuItem(reloadBtn);
  }
}

const CommandMenuPopup = GObject.registerClass(
class CommandMenuPopup extends PanelMenu.Button {
  _init () {
    super._init(0.5);
    redrawMenu(this);
  }
});

function init() {
}

function addCommandMenu () {
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

function enable() {
  commandMenuSettings = getSettings();
  addCommandMenu();
  commandMenuSettingsId.push(commandMenuSettings.connect('changed::restart-counter', () => {
    reloadExtension();
  }));
  commandMenuSettingsId.push(commandMenuSettings.connect('changed::edit-counter', () => {
    editCommandsFile();
  }));
}

function disable() {
  commandMenuSettingsId.forEach(id => {
    commandMenuSettings.disconnect(id);
  });
  commandMenuSettingsId = null;
  commandMenuSettings = null;
  commandMenuPopup.destroy();
  commandMenuPopup = null;
  commands = {};
}
