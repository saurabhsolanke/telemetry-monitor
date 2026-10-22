const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#090d16',
    title: 'TelemetryOS — Mission Monitor',
    titleBarStyle: 'hiddenInset', // Mac traffic lights inset nicely
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = 'http://localhost:4200';
  const prodPath = path.join(__dirname, '../dist/telemetry-monitor/browser/index.html');

  // If running in development with Angular dev server active, load localhost, else load built files
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL(devUrl).catch(() => {
      if (fs.existsSync(prodPath)) {
        mainWindow.loadFile(prodPath);
      }
    });
  } else {
    mainWindow.loadFile(prodPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handler for Native File Export
ipcMain.handle('save-file', async (event, { defaultFilename, content, format, isBase64 }) => {
  if (!mainWindow) return { canceled: true };

  const extensions = format === 'xlsx' ? ['xlsx'] : ['csv'];
  const name = format === 'xlsx' ? 'Excel Spreadsheet' : 'CSV Document';

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: `Export Telemetry Data (${format.toUpperCase()})`,
    defaultPath: defaultFilename,
    filters: [
      { name, extensions },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  try {
    if (isBase64) {
      const buffer = Buffer.from(content, 'base64');
      await fs.promises.writeFile(filePath, buffer);
    } else {
      await fs.promises.writeFile(filePath, content, 'utf8');
    }
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();

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
