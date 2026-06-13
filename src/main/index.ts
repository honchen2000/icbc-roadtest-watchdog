// Electron main process: tray + window + scheduler + IPC. Read-only watcher.

import { app, BrowserWindow, ipcMain, Menu, nativeImage, session, shell, Tray } from "electron";
import { join } from "node:path";
import { MultiNotifier, TelegramNotifier } from "../core/index.ts";
import type { Notifier } from "../core/index.ts";
import type { AppSettings, WatchdogStatus } from "../shared/types.ts";
import { DesktopNotifier } from "./desktopNotifier.ts";
import { Scheduler } from "./scheduler.ts";
import { loadSettings, saveSettings, validateSettings } from "./settings.ts";
import { TRAY_ICON_DATA_URL } from "./trayIcon.ts";

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let scheduler: Scheduler | null = null;
let settings: AppSettings | null = null;

function buildNotifier(s: AppSettings): Notifier {
  const list: Notifier[] = [new DesktopNotifier()];
  if (s.telegram?.enabled && s.telegram.botToken && s.telegram.chatId) {
    list.push(new TelegramNotifier(s.telegram.botToken, s.telegram.chatId));
  }
  return new MultiNotifier(list);
}

function currentStatus(): WatchdogStatus {
  const s = scheduler?.getStatus();
  return {
    running: s?.running ?? false,
    configured: settings !== null,
    lastCheckAt: s?.lastCheckAt ?? null,
    lastFound: s?.lastFound ?? 0,
    lastError: s?.lastError ?? null,
  };
}

function pushStatus(): void {
  const st = currentStatus();
  win?.webContents.send("status", st);
  updateTray(st);
}

function ensureScheduler(): Scheduler | null {
  if (!settings) return null;
  if (!scheduler) {
    scheduler = new Scheduler(settings, buildNotifier(settings), () => pushStatus());
  }
  return scheduler;
}

function updateTray(st: WatchdogStatus): void {
  if (!tray) return;
  tray.setToolTip(`ICBC Road Test Watchdog — ${st.running ? "watching" : "stopped"}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: st.running ? "● Watching" : "○ Stopped", enabled: false },
      { type: "separator" },
      { label: "Start", enabled: st.configured && !st.running, click: () => ensureScheduler()?.start() },
      { label: "Stop", enabled: st.running, click: () => scheduler?.stop() },
      { label: "Open window", click: () => showWindow() },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          scheduler?.stop();
          app.exit(0);
        },
      },
    ]),
  );
}

function showWindow(): void {
  if (win) {
    win.show();
    win.focus();
    return;
  }
  win = new BrowserWindow({
    width: 720,
    height: 560,
    show: true,
    title: "ICBC Road Test Watchdog",
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.on("closed", () => {
    win = null;
  });
  // Harden: the renderer must not open new windows or navigate away from the app.
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  if (devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function createTray(): void {
  // Embedded data-URL icon so the tray is visible/clickable on macOS, Windows, and
  // Linux. A branded icon ships with packaging (M6).
  tray = new Tray(nativeImage.createFromDataURL(TRAY_ICON_DATA_URL));
  updateTray(currentStatus());
}

ipcMain.handle("get-status", () => currentStatus());
ipcMain.handle("get-settings", () => settings);
ipcMain.handle("save-settings", async (_e, next: unknown) => {
  const valid = validateSettings(next); // throws on malformed input → renderer promise rejects
  await saveSettings(valid);
  settings = valid;
  scheduler?.stop();
  scheduler = null; // rebuilt with new settings on next start
  pushStatus();
});
ipcMain.handle("start", () => {
  ensureScheduler()?.start();
});
ipcMain.handle("stop", () => {
  scheduler?.stop();
});
ipcMain.handle("open-data-folder", () => shell.openPath(app.getPath("userData")));
ipcMain.handle("test-telegram", async () => {
  const tg = settings?.telegram;
  if (!tg?.enabled || !tg.botToken || !tg.chatId) {
    return { ok: false, error: "Telegram is not configured." };
  }
  try {
    await new TelegramNotifier(tg.botToken, tg.chatId).sendTest();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
});

function installCsp(): void {
  const isDev = !!process.env["ELECTRON_RENDERER_URL"];
  const csp = isDev
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:* http://localhost:*; img-src 'self' data:"
    : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-src 'none'";
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, "Content-Security-Policy": [csp] } });
  });
}

async function bootstrap(): Promise<void> {
  installCsp();
  settings = await loadSettings();
  createTray();
  showWindow();
  if (settings) ensureScheduler()?.start(); // auto-start when already configured
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) showWindow();
  });
}

// Single instance only — two copies would double-poll and race the state file.
if (!app.requestSingleInstanceLock()) {
  app.exit(0);
} else {
  app.on("second-instance", () => showWindow());
  app.whenReady().then(bootstrap).catch((err) => console.error("startup failed:", err));
}

// Stay alive in the tray when the window is closed (don't quit).
app.on("window-all-closed", () => {});
