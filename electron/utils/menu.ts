import { BrowserWindow, Menu, MenuItemConstructorOptions, shell } from 'electron';

export function createApplicationMenu(mainWindow: BrowserWindow) {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => { await shell.openExternal('https://vibecode.example'); }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  return menu;
}
