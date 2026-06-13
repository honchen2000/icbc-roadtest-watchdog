// Minimal, read-only client for ICBC's road-test (DEAS) JSON API.
//
// Only two calls are used, both observed in the official website's own traffic:
//   - PUT  /deas-api/v1/webLogin/webLogin            -> auth token (Authorization header)
//   - POST /deas-api/v1/web/getAvailableAppointments -> list of open slots
//
// This client NEVER books, holds, reschedules, or cancels anything.

import type { Credentials, LocationRef, Slot, WatchConfig } from "./types.ts";

const BASE = "https://onlinebusiness.icbc.com/deas-api/v1";
const LOGIN_URL = `${BASE}/webLogin/webLogin`;
const APPTS_URL = `${BASE}/web/getAvailableAppointments`;

const REQUEST_TIMEOUT_MS = 25_000; // so a hung request fails fast instead of stalling the watcher

// Look like the official website's browser request (the bare minimum a WAF expects).
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-CA,en;q=0.9",
};

/** Today's date as YYYY-MM-DD in ICBC's timezone. */
export function todayInVancouver(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Log in and return the bearer token from the Authorization response header. */
export async function login(creds: Credentials): Promise<string> {
  const res = await fetch(LOGIN_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...BROWSER_HEADERS },
    body: JSON.stringify({
      drvrLastName: creds.lastName,
      licenceNumber: creds.licenceNumber,
      keyword: creds.keyword,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`ICBC login failed: ${res.status} ${res.statusText}`);
  }
  const token = res.headers.get("authorization");
  if (!token) {
    throw new Error("ICBC login returned 200 but no Authorization header");
  }
  return token;
}

interface RawAppointment {
  appointmentDt?: { date?: string };
  startTm?: string;
}

export interface FetchResult {
  slots: Slot[];
  unauthorized: boolean;
}

/** Query open appointments for one location. */
export async function getAvailableAppointments(
  token: string,
  location: LocationRef,
  cfg: WatchConfig,
): Promise<FetchResult> {
  const res = await fetch(APPTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token, ...BROWSER_HEADERS },
    body: JSON.stringify({
      aPosID: location.id,
      examType: cfg.examTypeCode,
      examDate: cfg.searchFromDate?.trim() || todayInVancouver(),
      prfDaysOfWeek: cfg.daysOfWeek?.trim() || "[0,1,2,3,4,5,6]",
      prfPartsOfDay: cfg.partsOfDay?.trim() || "[0,1]",
      lastName: cfg.credentials.lastName,
      licenseNumber: cfg.credentials.licenceNumber,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (res.status === 401 || res.status === 403) {
    return { slots: [], unauthorized: true };
  }
  if (!res.ok) {
    throw new Error(`getAvailableAppointments ${location.name} (${location.id}): ${res.status}`);
  }

  const data = (await res.json().catch(() => null)) as RawAppointment[] | null;
  if (!Array.isArray(data)) {
    return { slots: [], unauthorized: false };
  }

  const slots: Slot[] = data
    .map((a) => ({
      posId: location.id,
      locationName: location.name,
      date: a.appointmentDt?.date ?? "",
      time: a.startTm ?? "",
    }))
    .filter((s) => s.date !== "");

  return { slots, unauthorized: false };
}
