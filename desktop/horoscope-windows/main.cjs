'use strict';

const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  shell,
  session
} = require('node:electron');

const APP_NAME = 'SMV HOROSCOPE';
const APP_URL = 'https://horoscope.smvastroservices.in/';
const APP_HOSTS = new Set(['horoscope.smvastroservices.in']);
const SESSION_PARTITION = 'persist:smv-horoscope-windows';
const USER_PERMISSION_TYPES = new Set(['media', 'notifications', 'geolocation']);

let mainWindow = null;
let appSession = null;

function isHttps(value) {
  try { return new URL(value).protocol === 'https:'; }
  catch { return false; }
}

function isHoroscopeOrigin(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && APP_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function configureSession(targetSession) {
  targetSession.setPermissionRequestHandler((webContents, permission, callback, details = {}) => {
    const origin = details.requestingUrl || details.securityOrigin || webContents.getURL();
    callback(USER_PERMISSION_TYPES.has(permission) && isHoroscopeOrigin(origin));
  });
  targetSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    return USER_PERMISSION_TYPES.has(permission) && isHoroscopeOrigin(requestingOrigin);
  });
}

function configureWebContents(contents) {
  contents.setWindowOpenHandler(({ url }) => {
    if (!isHttps(url)) return { action: 'deny' };
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 1100,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        autoHideMenuBar: false,
        webPreferences: {
          session: appSession,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webSecurity: true
        }
      }
    };
  });
  contents.on('will-navigate', (event, url) => {
    if (!isHttps(url)) event.preventDefault();
  });
  contents.on('will-redirect', (event, url) => {
    if (!isHttps(url)) event.preventDefault();
  });
  contents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3 && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle(APP_NAME + ' — Connection unavailable');
    }
  });
}

function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: APP_NAME,
      submenu: [
        { role: 'reload', label: 'Reload SMV HOROSCOPE' },
        { role: 'forceReload', label: 'Refresh from Internet' },
        { type: 'separator' },
        {
          label: 'Open SMV HOROSCOPE in browser',
          click: () => { void shell.openExternal(APP_URL); }
        },
        { type: 'separator' },
        { role: 'quit', label: 'Exit SMV HOROSCOPE' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom', label: 'Reset zoom' },
        { role: 'zoomIn', label: 'Zoom in' },
        { role: 'zoomOut', label: 'Zoom out' },
        { role: 'togglefullscreen', label: 'Full screen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About SMV HOROSCOPE',
          click: () => {
            if (!mainWindow) return;
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About SMV HOROSCOPE',
              message: APP_NAME,
              detail: 'Windows Desktop Edition 0.1.0\\nIndependent SMV HOROSCOPE application.'
            });
          }
        }
      ]
    }
  ]));
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1000,
    minHeight: 680,
    show: false,
    backgroundColor: '#f8f3e9',
    title: APP_NAME,
    autoHideMenuBar: false,
    webPreferences: {
      session: appSession,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: true
    }
  });

  mainWindow.webContents.on('did-navigate', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setTitle(APP_NAME);
  });
  configureWebContents(mainWindow.webContents);

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  });
  mainWindow.on('closed', () => { mainWindow = null; });

  try {
    await mainWindow.loadURL(APP_URL);
  } catch (error) {
    dialog.showErrorBox(APP_NAME, 'இணையத்தில் SMV HOROSCOPE-ஐ திறக்க முடியவில்லை.\\n\\n' + (error?.message || 'இணைப்பைச் சரிபார்க்கவும்.'));
  }
}

app.setAppUserModelId('in.smvastroservices.horoscope.desktop');

app.on('web-contents-created', (_event, contents) => configureWebContents(contents));

app.whenReady().then(async () => {
  appSession = session.fromPartition(SESSION_PARTITION);
  configureSession(appSession);
  buildMenu();
  await createMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
  });
}).catch((error) => {
  dialog.showErrorBox(APP_NAME, error?.message || 'The desktop application could not start.');
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
