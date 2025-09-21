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
import { setupSecretHandlers } from './ipc/secrets';
import { createApplicationMenu } from './utils/menu';

let mainWindow: BrowserWindow | null = null;
let dbPath: string;

/* --------------------------------------------------------------
   Dev-only helper: find a running Vite dev server we can load.
-------------------------------------------------------------- */
async function resolveDevServerUrl(): Promise<string> {
  /* If the caller already provided a dev-server URL, trust it first. */
  if (process.env.VITE_DEV_SERVER_URL) {
    return process.env.VITE_DEV_SERVER_URL;
  }

  const candidates = [
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

    // If the app isn't packaged we assume we're in a dev environment and try the Vite
    // dev server; otherwise we load the built files shipped with the app.
    if (!app.isPackaged) {
      // Dynamically locate the running Vite dev server (3001 > 3000 fallback)
      const devUrl = await resolveDevServerUrl();

      console.log('[electron] using dev server:', devUrl);

      mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
        console.error('[electron] did-fail-load', { code, desc, url });
      });
      mainWindow.webContents.on('did-finish-load', () => {
        console.log('[electron] did-finish-load', mainWindow?.webContents.getURL());
      });

      try {
        await mainWindow.loadURL(devUrl);
      } catch (e) {
        console.error('[electron] loadURL error:', e);
        /* ----------------------------------------------------
           Dev server unreachable – fall back to production
           build so the UI still appears.
        ---------------------------------------------------- */
        try {
          console.warn('[electron] Falling back to built index.html');
          await mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
        } catch (fallbackErr) {
          console.error('[electron] Fallback loadFile failed:', fallbackErr);
        }
      }
      mainWindow.webContents.openDevTools();
    } else {
      // In production, resolve the renderer HTML relative to the compiled
      // dist-electron folder (one level up from current file).
      mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    }

    setupIPCHandlers();
    setupSecretHandlers(); // expose secure API-key management handlers
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
