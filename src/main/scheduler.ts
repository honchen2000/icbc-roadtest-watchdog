// Runs the watch loop in the main process: Watcher.check() on a jittered interval,
// firing notifications for new slots and emitting status updates.

import { FileStore, Watcher } from "../core/index.ts";
import type { Notifier } from "../core/index.ts";
import type { AppSettings } from "../shared/types.ts";
import { statePath } from "./settings.ts";

export interface SchedulerStatus {
  running: boolean;
  lastCheckAt: string | null;
  lastFound: number;
  lastError: string | null;
}

const MIN_INTERVAL_S = 60;

export class Scheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private status: SchedulerStatus = { running: false, lastCheckAt: null, lastFound: 0, lastError: null };
  private readonly settings: AppSettings;
  private readonly notifier: Notifier;
  private readonly onUpdate: (status: SchedulerStatus) => void;

  constructor(settings: AppSettings, notifier: Notifier, onUpdate: (status: SchedulerStatus) => void) {
    this.settings = settings;
    this.notifier = notifier;
    this.onUpdate = onUpdate;
  }

  getStatus(): SchedulerStatus {
    return { ...this.status };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.status.running = true;
    this.onUpdate(this.getStatus());
    void this.tick();
  }

  stop(): void {
    this.running = false;
    this.status.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.onUpdate(this.getStatus());
  }

  private intervalMs(): number {
    const base = Math.max(MIN_INTERVAL_S, this.settings.intervalSeconds ?? 120);
    const jitter = 0.85 + Math.random() * 0.3; // ±15% so polling isn't perfectly periodic
    return Math.round(base * 1000 * jitter);
  }

  private async tick(): Promise<void> {
    if (!this.running) return;
    try {
      const watcher = new Watcher(this.settings, new FileStore(statePath()));
      const result = await watcher.check();
      if (!this.running) return; // stopped while the network call was in flight
      this.status.lastCheckAt = result.at;
      this.status.lastFound = result.found.length;
      this.status.lastError = result.errors[0] ?? null;
      if (result.newSlots.length > 0) {
        await this.notifier.notify(result.newSlots);
      }
    } catch (err) {
      this.status.lastError = err instanceof Error ? err.message : String(err);
    }
    this.onUpdate(this.getStatus());
    if (this.running) {
      this.timer = setTimeout(() => void this.tick(), this.intervalMs());
    }
  }
}
