/**
 * Coincides Electron Main Process
 * 
 * Starts the Express backend as a child process,
 * then opens the React frontend in a BrowserWindow.
 */
import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { fork, ChildProcess } from 'child_process';

// ── Data Directory ──────────────────────────────────────────
const userDataPath = app.getPath('userData');
const dataDir = join(userDataPath, 'data');
const uploadsDir = join(userDataPath, 'uploads');

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

const DB_PATH = join(dataDir, 'coincides.db');
const PORT = '3001';

console.log(`[Electron] User data: ${userDataPath}`);
console.log(`[Electron] Database: ${DB_PATH}`);

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

// ── Start Server as Child Process ───────────────────────────

function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverEntry = join(__dirname, '..', 'server', 'src', 'index.ts');

    serverProcess = fork(serverEntry, [], {
      cwd: join(__dirname, '..', 'server'),
      env: {
        ...process.env,
        DB_PATH,
        UPLOAD_DIR: uploadsDir,
        PORT,
        NODE_OPTIONS: '--import jiti/register',
      },
      stdio: 'pipe',
    });

    serverProcess.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      console.log(`[Server] ${msg}`);
      if (msg.includes('running on')) {
        resolve();
      }
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      console.error(`[Server Error] ${data.toString().trim()}`);
    });

    serverProcess.on('error', (err) => {
      console.error('[Electron] Server process error:', err);
      reject(err);
    });

    serverProcess.on('exit', (code) => {
      console.log(`[Electron] Server process exited with code ${code}`);
      serverProcess = null;
    });

    setTimeout(() => resolve(), 15000);
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

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
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
  } catch (err) {
    console.error('[Electron] Fatal error during startup:', err);
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
