const { app, BrowserWindow, session, Menu, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow = null;
let updaterReady = false;

function createWindow() {
  const appVersion = app.getVersion();
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#090b0a',
    title: 'VOX-BERNIE',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload-entry.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--bernie-app-version=${appVersion}`]
    }
  });
  mainWindow.loadFile('index.html');
}

function setupAutoUpdater() {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  updaterReady = true;

  autoUpdater.on('update-available', info => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { state: 'downloading', version: info.version });
    }
  });

  autoUpdater.on('update-not-available', info => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { state: 'current', version: info.version || app.getVersion() });
    }
  });

  autoUpdater.on('download-progress', progress => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { state: 'progress', percent: Math.round(progress.percent || 0) });
    }
  });

  autoUpdater.on('update-downloaded', async info => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { state: 'ready', version: info.version });
    }
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['Restart & Install', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'VOX-BERNIE Update Ready',
      message: `VOX-BERNIE ${info.version} is ready to install.`,
      detail: 'Restart VOX-BERNIE now to install the new version.'
    });
    if (result.response === 0) autoUpdater.quitAndInstall(false, true);
  });

  autoUpdater.on('error', error => {
    console.error('Auto-update error:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { state: 'error', message: error.message || String(error) });
    }
  });
}

ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged || !updaterReady) {
    return { ok: false, state: 'unavailable', message: 'Updates are available in the installed Windows app.' };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    const latest = result?.updateInfo?.version || app.getVersion();
    const current = app.getVersion();
    if (latest === current) return { ok: true, state: 'current', version: current };
    return { ok: true, state: 'downloading', version: latest };
  } catch (error) {
    return { ok: false, state: 'error', message: error.message || String(error) };
  }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'media');
  });
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => permission === 'media');
  createWindow();
  setupAutoUpdater();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
