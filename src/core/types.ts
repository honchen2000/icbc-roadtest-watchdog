// Shared types for the ICBC Road Test Watchdog core engine. UI-agnostic.

export interface Credentials {
  lastName: string;
  licenceNumber: string;
  keyword: string;
}

export interface LocationRef {
  id: number; // ICBC aPosID
  name: string;
}

export interface Slot {
  posId: number;
  locationName: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "9:00 AM"
}

export interface WatchConfig {
  credentials: Credentials;
  examTypeCode: string; // e.g. "6-R-1"
  locations: LocationRef[];
  /** Only treat slots on/before this date (YYYY-MM-DD) as interesting. Empty = no upper bound. */
  notifyBeforeDate?: string;
  /** examDate to search from (YYYY-MM-DD). Empty = today (America/Vancouver). */
  searchFromDate?: string;
  daysOfWeek?: string; // "[0,1,2,3,4,5,6]"
  partsOfDay?: string; // "[0,1]"
}

export interface WatchState {
  token: string | null;
  tokenTs: number; // epoch ms when the token was obtained
  seen: string[]; // already-notified slot keys
  primed: boolean; // true once a first successful cycle has established the baseline
}

export interface CheckResult {
  at: string; // ISO timestamp
  found: Slot[]; // everything returned across successfully-polled locations
  newSlots: Slot[]; // interesting slots not previously seen (empty on the baseline cycle)
  errors: string[];
  firstRun: boolean; // true on the baseline cycle (notifications intentionally suppressed)
}
