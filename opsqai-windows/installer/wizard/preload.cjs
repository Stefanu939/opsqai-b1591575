"use strict";
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("opsqai", {
  cancel: () => ipcRenderer.invoke("wizard:cancel"),
  openExternal: (url) => ipcRenderer.invoke("wizard:openExternal", url),
  validatePort: (p) => ipcRenderer.invoke("wizard:validatePort", p),
  pickLicenseFile: () => ipcRenderer.invoke("wizard:pickLicenseFile"),
  validateLicense: (contents) => ipcRenderer.invoke("wizard:validateLicense", contents),
  testSmtp: (cfg) => ipcRenderer.invoke("wizard:testSmtp", cfg),
  runSystemChecks: () => ipcRenderer.invoke("wizard:runSystemChecks"),
  testDatabase: (cfg) => ipcRenderer.invoke("wizard:testDatabase", cfg),
  install: (cfg) => ipcRenderer.invoke("wizard:install", cfg),
  onInstallLog: (fn) => ipcRenderer.on("wizard:install-log", (_e, line) => fn(line)),
  finish: (launch) => ipcRenderer.invoke("wizard:finish", launch),
});
