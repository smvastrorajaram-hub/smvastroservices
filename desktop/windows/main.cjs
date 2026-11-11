'use strict';

const path = require('node:path');
const {
  app,
  BrowserWindow,
  Menu,
  WebContentsView,
  dialog,
  ipcMain,
  session,
  shell
} = require('electron');

const PRODUCT_NAME = 'SMV ASTRO';
const PARTITION = 'persist:smv-astro-desktop';
const HEADER_HEIGHT = 82;

const MODULES = Object.freeze({
  home: { label: 'Home', url: null },
  astro: { label: 'SMV ASTRO', url: 'https://smvastroservices.in/' },
  horoscope: { label: 'SMV HOROSCOPE', url: 'https://horoscope.smvastroservices.in/' },
  calendar: { label: 'SMV CALENDAR', url: 'https://calendar.smvastroservices.in/' }
});

const TRUSTED_SMV_HOSTS = new Set([
  'smvastroservices.in',
  'www.smvastroservices.in',
  'horoscope.smvastroservices.in',
  'calendar.smvastroservices.in'
]);
const USER_PERMISSION_TYPES = new Set(['media', 'notifications', 'geolocation']);

let mainWindow = null;
let remoteView = null;
let remoteViewAttached = false;
let activeModule = 'home';
let smvSession = null;

function isSecureUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isTrustedSmvOrigin(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && TRUSTED_SMV_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function moduleIdForUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    if (hostname === 'smvastroservices.in' || hostname === 'www.smvastroservices.in') return 'astro';
    if (hostname === 'horoscope.smvastroservices.in') return 'horoscope';
    if (hostname === 'calendar.smvastroservices.in') return 'calendar';
  } catch {
    return null;
  }
  return null;
}

function isHubRenderer(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents || !event.senderFrame) return false;
  try {
    const frameUrl = new URL(event.senderFrame.url);
    return frameUrl.protocol === 'file:' &&
      decodeURIComponent(frameUrl.pathname).replace(/\\/g, '/').endsWith('/ui/index.html');
  } catch {
    return false;
  }
}

function configureSession(targetSession) {
  targetSession.setPermissionRequestHandler((webContents, permission, callback, details = {}) => {
    const origin = details.requestingUrl || details.securityOrigin || webContents.getURL();
    const allowed = USER_PERMISSION_TYPES.has(permission) && isTrustedSmvOrigin(origin);
    callback(allowed);
  });

  targetSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    return USER_PERMISSION_TYPES.has(permission) && isTrustedSmvOrigin(requestingOrigin);
  });
}

function layoutRemoteView() {
  if (!mainWindow || !remoteView || !remoteViewAttached) return;
  const { width, height } = mainWindow.getContentBounds();
  remoteView.setBounds({
    x: 0,
    y: HEADER_HEIGHT,
    width,
    height: Math.max(0, height - HEADER_HEIGHT)
  });
}

function configureRemoteWebContents(webContents) {
  webContents.setWindowOpenHandler(({ url }) => {
    if (!isSecureUrl(url)) return { action: 'deny' };

    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 1180,
        height: 820,
        minWidth: 840,
        minHeight: 620,
        autoHideMenuBar: false,
        webPreferences: {
          session: smvSession,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webSecurity: true,
          spellcheck: true
        }
      }
    };
  });

  webContents.on('will-navigate', (event, url) => {
    if (!isSecureUrl(url)) event.preventDefault();
  });

  webContents.on('will-redirect', (event, url) => {
    if (!isSecureUrl(url)) event.preventDefault();
  });
}

async function navigateTo(moduleId) {
  if (!Object.prototype.hasOwnProperty.call(MODULES, moduleId)) {
    throw new Error('Unknown SMV ASTRO section.');
  }

  activeModule = moduleId;

  if (moduleId === 'home') {
    if (remoteView && remoteViewAttached) {
      mainWindow.contentView.removeChildView(remoteView);
      remoteViewAttached = false;
    }
    mainWindow.webContents.send('smv:active-module', activeModule);
    return;
  }

  if (!remoteView) {
    remoteView = new WebContentsView({
      webPreferences: {
        session: smvSession,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        spellcheck: true
      }
    });
    configureRemoteWebContents(remoteView.webContents);
    remoteView.webContents.on('did-navigate', (_event, url) => {
      const detectedModule = moduleIdForUrl(url);
      if (detectedModule) {
        activeModule = detectedModule;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('smv:active-module', activeModule);
        }
      }
    });
    remoteView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (isMainFrame && errorCode !== -3 && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('smv:load-error', {
          moduleId: activeModule,
          message: 'இந்த சேவையை இப்போது திறக்க முடியவில்லை. இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.'
        });
      }
    });
  }

  if (!remoteViewAttached) {
    mainWindow.contentView.addChildView(remoteView);
    remoteViewAttached = true;
  }

  layoutRemoteView();
  mainWindow.webContents.send('smv:active-module', activeModule);

  try {
    await remoteView.webContents.loadURL(MODULES[moduleId].url);
  } catch {
    mainWindow.webContents.send('smv:load-error', {
      moduleId,
      message: 'இணைப்பு தோல்வியடைந்தது. இணையத்தைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.'
    });
  }
}

function buildApplicationMenu() {
  const navigateItem = (label, moduleId, accelerator) => ({
    label,
    accelerator,
    click: () => { void navigateTo(moduleId); }
  });

  const template = [
    {
      label: 'SMV ASTRO',
      submenu: [
        navigateItem('Home', 'home', 'Alt+0'),
        { type: 'separator' },
        { role: 'quit', label: 'Exit SMV ASTRO' }
      ]
    },
    {
      label: 'Services',
      submenu: [
        navigateItem('SMV ASTRO Services', 'astro', 'Alt+1'),
        navigateItem('SMV HOROSCOPE', 'horoscope', 'Alt+2'),
        navigateItem('SMV CALENDAR', 'calendar', 'Alt+3')
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload current section' },
        { role: 'forceReload', label: 'Force reload current section' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Reset zoom' },
        { role: 'zoomIn', label: 'Zoom in' },
        { role: 'zoomOut', label: 'Zoom out' },
        { role: 'togglefullscreen', label: 'Toggle full screen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Open SMV ASTRO website in browser',
          click: () => { void shell.openExternal(MODULES.astro.url); }
        },
        {
          label: 'About SMV ASTRO',
          click: () => {
            if (mainWindow) {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'About SMV ASTRO',
                message: PRODUCT_NAME,
                detail: 'Windows Desktop Edition 0.1.0\nSMV ASTRO • SMV HOROSCOPE • SMV CALENDAR'
              });
            }
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerIpcHandlers() {
  ipcMain.handle('smv:get-state', (event) => {
    if (!isHubRenderer(event)) throw new Error('Unauthorized desktop UI request.');
    return { activeModule, version: app.getVersion(), platform: process.platform };
  });

  ipcMain.handle('smv:navigate', async (event, moduleId) => {
    if (!isHubRenderer(event)) throw new Error('Unauthorized desktop navigation request.');
    await navigateTo(moduleId);
    return { activeModule };
  });
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1460,
    height: 940,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#f8f3e9',
    title: PRODUCT_NAME,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.on('resize', layoutRemoteView);
  mainWindow.on('closed', () => {
    const closingRemoteView = remoteView;
    mainWindow = null;
    remoteView = null;
    remoteViewAttached = false;
    if (closingRemoteView && !closingRemoteView.webContents.isDestroyed()) {
      closingRemoteView.webContents.close();
    }
  });

  await mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow && mainWindow.show());
  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('smv:active-module', activeModule);
    }
  });
}

app.setAppUserModelId('in.smvastroservices.desktop');

app.whenReady().then(async () => {
  smvSession = session.fromPartition(PARTITION);
  configureSession(smvSession);
  registerIpcHandlers();
  buildApplicationMenu();
  await createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
  });
}).catch((error) => {
  dialog.showErrorBox(PRODUCT_NAME, error?.message || 'The desktop application could not start.');
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
