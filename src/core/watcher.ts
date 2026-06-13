// The watch cycle: log in (cached token), query each location, filter to the
// notify window, diff against already-seen slots, persist, return the result.
//
// Key correctness rules:
//  - The "seen" set is self-pruned ONLY for locations that were polled successfully
//    this cycle; an errored location keeps its prior keys, so a transient failure
//    never causes its slots to re-fire as "new" when it recovers.
//  - The first successful cycle establishes the baseline silently (no flood of
//    already-available slots — we only alert on slots that appear afterwards).
//  - Only slots in [today, notifyBeforeDate] are interesting (no past-dated slots).

import { getAvailableAppointments, login, todayInVancouver } from "./icbc.ts";
import type { StateStore } from "./storage.ts";
import type { CheckResult, Slot, WatchConfig, WatchState } from "./types.ts";

const TOKEN_TTL_MS = 25 * 60 * 1000; // ICBC token lives ~30 min; refresh a little early

export function slotKey(s: Slot): string {
  return `${s.posId}|${s.date}|${s.time}`;
}

export function posIdOfKey(key: string): number {
  return Number(key.split("|")[0]);
}

export interface DiffInput {
  found: Slot[]; // slots from successfully-polled locations only
  polledPosIds: number[]; // locations that returned OK this cycle
  priorSeen: string[];
  today: string; // YYYY-MM-DD inclusive lower bound
  cutoff?: string; // YYYY-MM-DD inclusive upper bound; empty = no upper bound
}

export interface DiffResult {
  interesting: Slot[];
  newSlots: Slot[];
  nextSeen: string[];
}

/** Pure, network-free diff — unit-tested in test/core.test.ts. */
export function diffSlots(input: DiffInput): DiffResult {
  const cutoff = input.cutoff?.trim();
  const interesting = input.found.filter(
    (s) => s.date >= input.today && (cutoff ? s.date <= cutoff : true),
  );
  const prior = new Set(input.priorSeen);
  const newSlots = interesting.filter((s) => !prior.has(slotKey(s)));

  // Self-prune only for locations actually polled this cycle; carry the rest forward.
  const polled = new Set(input.polledPosIds);
  const carried = input.priorSeen.filter((k) => !polled.has(posIdOfKey(k)));
  const nextSeen = [...new Set([...carried, ...interesting.map(slotKey)])];

  return { interesting, newSlots, nextSeen };
}

export class Watcher {
  readonly cfg: WatchConfig;
  readonly store: StateStore;

  constructor(cfg: WatchConfig, store: StateStore) {
    this.cfg = cfg;
    this.store = store;
  }

  private async getToken(state: WatchState, forceRefresh: boolean): Promise<string> {
    if (!forceRefresh && state.token && Date.now() - state.tokenTs < TOKEN_TTL_MS) {
      return state.token;
    }
    const token = await login(this.cfg.credentials);
    state.token = token;
    state.tokenTs = Date.now();
    return token;
  }

  /** Run one poll cycle. */
  async check(): Promise<CheckResult> {
    const state = await this.store.load();
    const errors: string[] = [];
    const found: Slot[] = [];
    const polledPosIds: number[] = [];

    let token = await this.getToken(state, false);

    for (const loc of this.cfg.locations) {
      try {
        let result = await getAvailableAppointments(token, loc, this.cfg);
        if (result.unauthorized) {
          token = await this.getToken(state, true);
          result = await getAvailableAppointments(token, loc, this.cfg);
        }
        if (result.unauthorized) {
          // Still unauthorized after a fresh login → the token is bad. Invalidate it so
          // the next cycle re-logs in, and treat this location as failed (don't prune it).
          state.token = null;
          state.tokenTs = 0;
          errors.push(`${loc.name} (${loc.id}): unauthorized after token refresh`);
          continue;
        }
        polledPosIds.push(loc.id);
        found.push(...result.slots);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    const { newSlots: fresh, nextSeen } = diffSlots({
      found,
      polledPosIds,
      priorSeen: state.seen,
      today: todayInVancouver(),
      cutoff: this.cfg.notifyBeforeDate,
    });

    const firstRun = !state.primed && polledPosIds.length > 0;
    const newSlots = firstRun ? [] : fresh; // baseline cycle: establish seen, don't alert
    if (polledPosIds.length > 0) state.primed = true;
    state.seen = nextSeen;
    await this.store.save(state);

    return { at: new Date().toISOString(), found, newSlots, errors, firstRun };
  }
}
