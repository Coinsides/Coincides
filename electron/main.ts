/**
 * Coincides Electron Main Process
 * 
 * Starts the Express backend server internally,
 * then opens the React frontend in a BrowserWindow.
 */
import { app, BrowserWindow, shell } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, copyFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Data Directory ──────────────────────────────────────────
// Store database and uploads in user's appData directory
// so they survive app updates.
const userDataPath = app.getPath('userData');
const dataDir = join(userDataPath, 'data');
const uploadsDir = join(userDataPath, 'uploads');

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

// Set environment variables BEFORE importing the server
process.env.DB_PATH = join(dataDir, 'coincides.db');
process.env.UPLOAD_DIR = uploadsDir;
process.env.PORT = '3001';

// ── Logging ─────────────────────────────────────────────────
console.log(`[Electron] User data: ${userDataPath}`);
console.log(`[Electron] Database: ${process.env.DB_PATH}`);
console.log(`[Electron] Uploads: ${uploadsDir}`);

let mainWindow: BrowserWindow | null = null;

async function startServer(): Promise<void> {
  // Dynamic import of the server — it will use the env vars we set above
  try {
    // The server's initDb() reads DB_PATH from env or uses default
    // We need to patch the server to accept DB_PATH env var
    const serverModule = await import('../server/src/index.js');
    console.log('[Electron] Server started successfully');
  } catch (err) {
    console.error('[Electron] Failed to start server:', err);
    throw err;
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Coincides',
    icon: join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Glassmorphism-friendly
    backgroundColor: '#0e0e24',
    show: false,
  });

  // Load the built frontend
  const clientPath = join(__dirname, '..', 'client', 'dist', 'index.html');
  if (existsSync(clientPath)) {
    mainWindow.loadFile(clientPath);
  } else {
    // Dev mode: connect to Vite dev server
    mainWindow.loadURL('http://localhost:5173');
  }

  // Show window when ready (avoid white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Open external links in default browser
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
