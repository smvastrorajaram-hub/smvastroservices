'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('smvDesktop', Object.freeze({
  navigate: (moduleId) => ipcRenderer.invoke('smv:navigate', moduleId),
  getState: () => ipcRenderer.invoke('smv:get-state'),
  onActiveModule: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, moduleId) => callback(moduleId);
    ipcRenderer.on('smv:active-module', listener);
    return () => ipcRenderer.removeListener('smv:active-module', listener);
  },
  onLoadError: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, details) => callback(details);
    ipcRenderer.on('smv:load-error', listener);
    return () => ipcRenderer.removeListener('smv:load-error', listener);
  }
}));
