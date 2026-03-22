/**
 * Coincides Electron Main Process
 * 
 * Starts the Express backend as a child process,
 * then opens the React frontend in a BrowserWindow.
 */
import { app, BrowserWindow, shell, dialog } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { fork, ChildProcess } from 'child_process';

// ── Path Resolution ─────────────────────────────────────────
// In packaged app: app.getAppPath() = .../resources/app
// In dev: __dirname = .../dist-electron
const appRoot = app.isPackaged
  ? app.getAppPath()          // .../resources/app
  : join(__dirname, '..');    // project root

const serverDir = join(appRoot, 'server');
const serverEntry = join(serverDir, 'src', 'index.ts');
const clientDist = join(appRoot, 'client', 'dist');

// ── Data Directory ──────────────────────────────────────────
const userDataPath = app.getPath('userData');
const dataDir = join(userDataPath, 'data');
const uploadsDir = join(userDataPath, 'uploads');

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

const DB_PATH = join(dataDir, 'coincides.db');

// Load .env from userData if it exists (for API keys)
const userEnvPath = join(userDataPath, '.env');
if (existsSync(userEnvPath)) {
  const envContent = require('fs').readFileSync(userEnvPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
  console.log('[Electron] Loaded .env from userData');
}
const PORT = '3001';

console.log(`[Electron] Packaged: ${app.isPackaged}`);
console.log(`[Electron] App root: ${appRoot}`);
console.log(`[Electron] Server entry: ${serverEntry}`);
console.log(`[Electron] Client dist: ${clientDist}`);
console.log(`[Electron] Database: ${DB_PATH}`);

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

// ── Start Server ────────────────────────────────────────────

function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!existsSync(serverEntry)) {
      const msg = `Server entry not found: ${serverEntry}`;
      console.error(`[Electron] ${msg}`);
      dialog.showErrorBox('Coincides', msg);
      reject(new Error(msg));
      return;
    }

    // Find jiti in server's node_modules
    const jitiPath = join(serverDir, 'node_modules', 'jiti', 'register.mjs');
    const nodeOptions = existsSync(jitiPath)
      ? `--import ${jitiPath}`
      : '--import jiti/register';

    console.log(`[Electron] Starting server with NODE_OPTIONS: ${nodeOptions}`);

    serverProcess = fork(serverEntry, [], {
      cwd: serverDir,
      env: {
        ...process.env,
        DB_PATH,
        UPLOAD_DIR: uploadsDir,
        PORT,
        NODE_OPTIONS: nodeOptions,
      },
      stdio: 'pipe',
    });

    let started = false;

    serverProcess.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      console.log(`[Server] ${msg}`);
      if (!started && msg.includes('running on')) {
        started = true;
        resolve();
      }
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      console.error(`[Server Error] ${msg}`);
      // If server crashes on startup, show error to user
      if (!started && (msg.includes('Error') || msg.includes('error'))) {
        console.error(`[Electron] Server startup error detected`);
      }
    });

    serverProcess.on('error', (err) => {
      console.error('[Electron] Server process error:', err);
      if (!started) reject(err);
    });

    serverProcess.on('exit', (code) => {
      console.log(`[Electron] Server process exited with code ${code}`);
      if (!started) {
        reject(new Error(`Server exited with code ${code} before starting`));
      }
      serverProcess = null;
    });

    // Timeout — if server doesn't start in 20s, try to open window anyway
    setTimeout(() => {
      if (!started) {
        console.warn('[Electron] Server start timeout, opening window anyway...');
        started = true;
        resolve();
      }
    }, 20000);
  });
}

// ── Create Window ───────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Coincides',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#0e0e24',
    show: false,
  });

  // Load from the Express server (which serves client/dist as static)
  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Retry loading if server isn't ready yet
  mainWindow.webContents.on('did-fail-load', () => {
    console.log('[Electron] Page load failed, retrying in 2s...');
    setTimeout(() => {
      mainWindow?.loadURL(`http://localhost:${PORT}`);
    }, 2000);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── App Lifecycle ───────────────────────────────────────────

app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
  } catch (err: any) {
    console.error('[Electron] Fatal error:', err);
    dialog.showErrorBox('Coincides - Startup Error', err?.message || String(err));
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
