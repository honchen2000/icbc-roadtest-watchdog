// Preload: expose a minimal, typed, safe API to the renderer via contextBridge.
// No Node or ipcRenderer is leaked directly to the page.

import { contextBridge, ipcRenderer } from "electron";
import type { AppSettings, WatchdogApi, WatchdogStatus } from "../shared/types.ts";

const api: WatchdogApi = {
  getStatus: () => ipcRenderer.invoke("get-status"),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke("save-settings", settings),
  start: () => ipcRenderer.invoke("start"),
  stop: () => ipcRenderer.invoke("stop"),
  testTelegram: () => ipcRenderer.invoke("test-telegram"),
  openDataFolder: () => ipcRenderer.invoke("open-data-folder"),
  onStatus: (cb: (status: WatchdogStatus) => void) => {
    ipcRenderer.on("status", (_e, status: WatchdogStatus) => cb(status));
  },
};

contextBridge.exposeInMainWorld("api", api);
