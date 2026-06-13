// Types shared between the Electron main process, preload, and renderer.

import type { WatchConfig } from "../core/types.ts";

/** Everything the app needs to run a watch (config + scheduling + channels). */
export interface AppSettings extends WatchConfig {
  intervalSeconds: number;
  telegram: { enabled: boolean; botToken: string; chatId: string };
  launchAtLogin?: boolean;
}

export interface WatchdogStatus {
  running: boolean;
  configured: boolean;
  lastCheckAt: string | null;
  lastFound: number;
  lastError: string | null;
}

/** The safe API exposed to the renderer via contextBridge (see preload). */
export interface WatchdogApi {
  getStatus(): Promise<WatchdogStatus>;
  getSettings(): Promise<AppSettings | null>;
  saveSettings(settings: AppSettings): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  testTelegram(): Promise<{ ok: boolean; error?: string }>;
  openDataFolder(): Promise<string>;
  onStatus(cb: (status: WatchdogStatus) => void): void;
}
