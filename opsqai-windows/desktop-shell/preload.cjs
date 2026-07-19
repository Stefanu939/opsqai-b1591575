// Preload for OPSQAI Desktop Shell.
// Exposes a minimal, audit-friendly API to splash + error pages.
// The main app window (https://localhost) does NOT rely on this API —
// it uses its normal fetch() flows.

"use strict";
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("opsqai", {
  // Splash events
  onProgress: (cb) =>
    ipcRenderer.on("splash:progress", (_e, payload) => {
      try {
        cb(payload);
      } catch (_) {}
    }),
  onStatus: (cb) =>
    ipcRenderer.on("splash:status", (_e, text) => {
      try {
        cb(text);
      } catch (_) {}
    }),

  // Error / recovery
  getServices: () => ipcRenderer.invoke("shell:getServices"),
  startServices: () => ipcRenderer.invoke("shell:startServices"),
  retry: () => ipcRenderer.invoke("shell:retry"),
  openLogs: () => ipcRenderer.invoke("shell:openLogs"),
  runDoctor: () => ipcRenderer.invoke("shell:runDoctor"),
  quit: () => ipcRenderer.invoke("shell:quit"),
});
