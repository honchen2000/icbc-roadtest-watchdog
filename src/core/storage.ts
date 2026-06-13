// Pluggable persistence for the watcher's state (token cache + already-seen slots).
// The CLI uses FileStore; the Electron app (M2) can provide its own implementation.

import { readFile, rename, writeFile } from "node:fs/promises";
import type { WatchState } from "./types.ts";

export interface StateStore {
  load(): Promise<WatchState>;
  save(state: WatchState): Promise<void>;
}

function empty(): WatchState {
  return { token: null, tokenTs: 0, seen: [], primed: false };
}

export class FileStore implements StateStore {
  readonly path: string;

  constructor(path: string) {
    this.path = path;
  }

  async load(): Promise<WatchState> {
    try {
      const parsed = JSON.parse(await readFile(this.path, "utf8")) as Partial<WatchState>;
      return {
        token: parsed.token ?? null,
        tokenTs: parsed.tokenTs ?? 0,
        seen: Array.isArray(parsed.seen) ? parsed.seen : [],
        primed: parsed.primed === true,
      };
    } catch {
      return empty();
    }
  }

  async save(state: WatchState): Promise<void> {
    // The state file holds the cached auth token, so keep it owner-only (0600),
    // and write atomically (temp file + rename) so a crash/concurrent write can't
    // leave a truncated JSON that would silently reset the baseline.
    const data = JSON.stringify(state, null, 2);
    const tmp = `${this.path}.tmp`;
    await writeFile(tmp, data, { mode: 0o600 });
    await rename(tmp, this.path);
  }
}

export class MemoryStore implements StateStore {
  private state: WatchState = empty();
  async load(): Promise<WatchState> {
    return this.state;
  }
  async save(state: WatchState): Promise<void> {
    this.state = state;
  }
}
