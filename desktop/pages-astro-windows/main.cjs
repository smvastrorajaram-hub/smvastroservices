'use strict';

const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  shell,
  session
} = require('electron');

const APP_NAME = 'SMV ASTRO';
const APP_URL = 'https://smvastroservices.pages.dev/';
const APP_HOST = 'smvastroservices.pages.dev';
const SESSION_PARTITION = 'persist:smv-astro-pages-windows';
const APP_ID = 'in.smvastroservices.pages.astro.desktop';
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/' + process.versions.chrome + ' Safari/537.36';
const USER_PERMISSION_TYPES = new Set(['media', 'notifications', 'geolocation']);

let mainWindow = null;
let appSession = null;
let offlineMode = false;

function isHttps(value) {
  try { return new URL(value).protocol === 'https:'; }
  catch { return false; }
}

function isTrustedPagesOrigin(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.hostname.toLowerCase() === APP_HOST;
  } catch {
    return false;
  }
}

function updateWindowTitle() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setTitle(APP_NAME + (offlineMode ? ' — Offline' : ''));
  }
}

function setOfflineMode(enabled) {
  offlineMode = Boolean(enabled);
  if (!appSession) return;
  if (offlineMode) {
    appSession.enableNetworkEmulation({
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0
    });
  } else {
    appSession.disableNetworkEmulation();
  }
  updateWindowTitle();
}

function configureSession(targetSession) {
  targetSession.setUserAgent(DESKTOP_UA, 'en-US,en;q=0.9', 'Win32');
  targetSession.setPermissionRequestHandler((webContents, permission, callback, details = {}) => {
    const origin = details.requestingUrl || details.securityOrigin || webContents.getURL();
    callback(USER_PERMISSION_TYPES.has(permission) && isTrustedPagesOrigin(origin));
  });
  targetSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    return USER_PERMISSION_TYPES.has(permission) && isTrustedPagesOrigin(requestingOrigin);
  });
}

function configureWebContents(contents) {
  contents.setWindowOpenHandler(({ url }) => {
    if (!isHttps(url)) return { action: 'deny' };
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 1280,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        autoHideMenuBar: false,
        backgroundColor: '#24103f',
        webPreferences: {
          session: appSession,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webSecurity: true,
          spellcheck: true
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
  const template = [
    {
      label: APP_NAME,
      submenu: [
        { role: 'reload', label: 'Reload ' + APP_NAME },
        { role: 'forceReload', label: 'Refresh from Pages.dev' },
        { type: 'separator' },
        {
          label: 'Open this PWA in browser (Chrome install)',
          click: () => { void shell.openExternal(APP_URL); }
        },
        { type: 'separator' },
        {
          label: 'Work offline (use previously cached files)',
          type: 'checkbox',
          checked: false,
          click: (item) => setOfflineMode(item.checked)
        },
        { type: 'separator' },
        {
          label: 'About ' + APP_NAME,
          click: () => {
            if (!mainWindow) return;
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About ' + APP_NAME,
              message: APP_NAME,
              detail: 'Pages.dev Windows Desktop Edition 0.1.0\\nDesktop Chrome rendering, persistent PWA cache, and an optional offline test mode.'
            });
          }
        },
        { type: 'separator' },
        { role: 'quit', label: 'Exit ' + APP_NAME }
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
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    useContentSize: true,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    backgroundColor: '#24103f',
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

  mainWindow.webContents.setUserAgent(DESKTOP_UA);
  mainWindow.webContents.on('did-navigate', updateWindowTitle);
  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  });
  mainWindow.on('closed', () => { mainWindow = null; });

  try {
    await mainWindow.loadURL(APP_URL);
  } catch (error) {
    dialog.showErrorBox(
      APP_NAME,
      'Pages.dev-ல் ' + APP_NAME + ' திறக்க முடியவில்லை.\\n\\n' +
      (error && error.message ? error.message : 'இணைப்பைச் சரிபார்க்கவும்.')
    );
  }
}

app.setAppUserModelId(APP_ID);
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
  dialog.showErrorBox(APP_NAME, error && error.message ? error.message : 'The desktop application could not start.');
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
