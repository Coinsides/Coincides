/**
 * Coincides Electron Main Process
 * 
 * Starts the Express backend as a child process,
 * then opens the React frontend in a BrowserWindow.
 */
import { app, BrowserWindow, shell, dialog } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { spawn, ChildProcess } from 'child_process';

// ── Path Resolution ─────────────────────────────────────────
const appRoot = app.isPackaged
  ? app.getAppPath()
  : join(__dirname, '..');

const serverDir = join(appRoot, 'server');
const serverEntry = join(serverDir, 'src', 'index.ts');

// ── Data Directory ──────────────────────────────────────────
const userDataPath = app.getPath('userData');
const dataDir = join(userDataPath, 'data');
const uploadsDir = join(userDataPath, 'uploads');

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

const DB_PATH = join(dataDir, 'coincides.db');
const PORT = '3001';

// Load .env from userData if it exists (for API keys)
const userEnvPath = join(userDataPath, '.env');
const envVars: Record<string, string> = {};
if (existsSync(userEnvPath)) {
  const envContent = readFileSync(userEnvPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      envVars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
  console.log('[Electron] Loaded .env from userData');
}

// Also try loading from server/.env (dev mode)
const serverEnvPath = join(serverDir, '.env');
if (existsSync(serverEnvPath)) {
  const envContent = readFileSync(serverEnvPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      if (!envVars[key]) envVars[key] = trimmed.slice(idx + 1).trim();
    }
  }
  console.log('[Electron] Loaded .env from server dir');
}

console.log(`[Electron] Packaged: ${app.isPackaged}`);
console.log(`[Electron] App root: ${appRoot}`);
console.log(`[Electron] Server entry: ${serverEntry}`);
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

    // Use spawn with explicit node and jiti register path
    const jitiRegister = join(serverDir, 'node_modules', 'jiti', 'register.cjs');
    const nodeExecutable = process.execPath; // Electron's bundled Node

    console.log(`[Electron] Node: ${nodeExecutable}`);
    console.log(`[Electron] Jiti: ${jitiRegister} (exists: ${existsSync(jitiRegister)})`);

    // Use --require instead of --import for CJS compatibility
    serverProcess = spawn(nodeExecutable, [
      '--require', jitiRegister,
      serverEntry,
    ], {
      cwd: serverDir,
      env: {
        ...process.env,
        ...envVars,
        DB_PATH,
        UPLOAD_DIR: uploadsDir,
        PORT,
        ELECTRON_RUN_AS_NODE: '1', // Tell Electron's node to act as plain Node.js
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
      if (msg) console.error(`[Server] ${msg}`);
    });

    serverProcess.on('error', (err) => {
      console.error('[Electron] Server process error:', err);
      if (!started) {
        dialog.showErrorBox('Coincides', `Server failed to start: ${err.message}`);
        reject(err);
      }
    });

    serverProcess.on('exit', (code) => {
      console.log(`[Electron] Server exited with code ${code}`);
      if (!started) {
        const msg = `Server exited with code ${code} before starting`;
        dialog.showErrorBox('Coincides - Startup Error', msg);
        reject(new Error(msg));
      }
      serverProcess = null;
    });

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

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

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
