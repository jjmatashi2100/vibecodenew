import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import {
  initializeDatabase,
  createProject,
  loadProject,
  saveStageData,
  listProjects,
  updateProject,
  updateContext,
  saveLLMConfig,
  getActiveLLMConfig
} from './ipc/database';
import { setupLLMHandlers } from './ipc/llm';
import { createApplicationMenu } from './utils/menu';

let mainWindow: BrowserWindow | null = null;
let dbPath: string;

/* --------------------------------------------------------------
   Dev-only helper: find a running Vite dev server we can load.
-------------------------------------------------------------- */
async function resolveDevServerUrl(): Promise<string> {
  const candidates = [
    process.env.VITE_DEV_SERVER_URL,
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://localhost:3000',
  ].filter(Boolean) as string[];

  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) return url;
    } catch {
      /* try next candidate */
    }
  }
  // fallback
  return 'http://127.0.0.1:3000';
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    const documentsPath = app.getPath('documents');
    const appDataPath = path.join(documentsPath, 'VibeCodeSystem');
    dbPath = path.join(appDataPath, 'database.db');

    fs.mkdirSync(appDataPath, { recursive: true });

    initializeDatabase(dbPath);

    mainWindow = new BrowserWindow({
      width: 1600,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
      titleBarStyle: 'default',
      backgroundColor: '#1e1e1e',
    });

    Menu.setApplicationMenu(createApplicationMenu(mainWindow));

    if (process.env.NODE_ENV === 'development') {
      // Dynamically locate the running Vite dev server (3001 > 3000 fallback)
      const devUrl = await resolveDevServerUrl();

      console.log('[electron] NODE_ENV=development');
      console.log('[electron] using dev server:', devUrl);

      mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
        console.error('[electron] did-fail-load', { code, desc, url });
      });
      mainWindow.webContents.on('did-finish-load', () => {
        console.log('[electron] did-finish-load', mainWindow?.webContents.getURL());
      });

      await mainWindow.loadURL(devUrl);
      mainWindow.webContents.openDevTools();
    } else {
      // In production, resolve the renderer HTML relative to the compiled
      // dist-electron folder (one level up from current file).
      mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    }

    setupIPCHandlers();
    setupLLMHandlers();
  });
}

function setupIPCHandlers() {
  ipcMain.handle('project:create', async (_event, data) => createProject(data));
  ipcMain.handle('project:load', async (_event, id) => loadProject(id));
  ipcMain.handle('project:list', async () => listProjects());
  ipcMain.handle('stage:save', async (_event, data) => saveStageData(data));
  ipcMain.handle('project:update', async (_event, { id, data }) => updateProject(id, data));

  ipcMain.handle('dialog:export', async (_event, data) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'JSON', extensions: ['json'] },
        { name: 'Text', extensions: ['txt'] }
      ],
      defaultPath: `${data.projectName}-export`
    });

    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, data.content);
      return { success: true, path: result.filePath };
    }
    return { success: false };
  });

  ipcMain.handle('app:version', async () => app.getVersion());

  // LLM configuration persistence
  ipcMain.handle('llmConfig:getActive', async () => getActiveLLMConfig());
  ipcMain.handle('llmConfig:save', async (_event, cfg) => saveLLMConfig(cfg));

  // Context aggregation/persistence
  ipcMain.handle('context:update', async (_event, { projectId, data }) =>
    updateContext(projectId, data)
  );
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
