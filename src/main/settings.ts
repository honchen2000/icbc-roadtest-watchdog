// App settings + watch-state file locations (in Electron's userData dir), plus a
// validator for untrusted settings (from disk hand-edits or, later, the M3 form).
// Both files can hold credentials/token, so they are written owner-only (0600) and
// atomically (temp + rename).

import { app } from "electron";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AppSettings } from "../shared/types.ts";

function settingsPath(): string {
  return join(app.getPath("userData"), "settings.json");
}

/** Watch-state file (token cache + seen slots) — consumed by core's FileStore. */
export function statePath(): string {
  return join(app.getPath("userData"), "state.json");
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function reqStr(v: unknown, name: string): string {
  if (typeof v !== "string" || v.trim() === "") {
    throw new Error(`settings.${name} must be a non-empty string`);
  }
  return v;
}

function optDate(v: unknown, name: string): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string" || !DATE_RE.test(v)) {
    throw new Error(`settings.${name} must be YYYY-MM-DD or empty`);
  }
  return v;
}

/** Validate + normalise an untrusted settings object. Throws on malformed input. */
export function validateSettings(input: unknown): AppSettings {
  if (typeof input !== "object" || input === null) throw new Error("settings must be an object");
  const o = input as Record<string, unknown>;

  const c = (o.credentials ?? {}) as Record<string, unknown>;
  const credentials = {
    lastName: reqStr(c.lastName, "credentials.lastName"),
    licenceNumber: reqStr(c.licenceNumber, "credentials.licenceNumber"),
    keyword: reqStr(c.keyword, "credentials.keyword"),
  };

  if (!Array.isArray(o.locations) || o.locations.length === 0) {
    throw new Error("settings.locations must be a non-empty array");
  }
  const locations = (o.locations as unknown[]).map((entry, i) => {
    const loc = (entry ?? {}) as Record<string, unknown>;
    const id = Number(loc.id);
    if (!Number.isInteger(id)) throw new Error(`settings.locations[${i}].id must be an integer`);
    return { id, name: reqStr(loc.name, `locations[${i}].name`) };
  });

  const tg = (o.telegram ?? {}) as Record<string, unknown>;
  const telegram = {
    enabled: tg.enabled === true,
    botToken: typeof tg.botToken === "string" ? tg.botToken : "",
    chatId: typeof tg.chatId === "string" ? tg.chatId : "",
  };
  if (telegram.enabled && (telegram.botToken === "" || telegram.chatId === "")) {
    throw new Error("settings.telegram requires botToken and chatId when enabled");
  }

  const intervalRaw = Number(o.intervalSeconds);
  const intervalSeconds = Number.isFinite(intervalRaw) ? Math.max(60, Math.trunc(intervalRaw)) : 120;

  return {
    credentials,
    examTypeCode: reqStr(o.examTypeCode, "examTypeCode"),
    locations,
    notifyBeforeDate: optDate(o.notifyBeforeDate, "notifyBeforeDate"),
    searchFromDate: optDate(o.searchFromDate, "searchFromDate"),
    daysOfWeek: typeof o.daysOfWeek === "string" ? o.daysOfWeek : undefined,
    partsOfDay: typeof o.partsOfDay === "string" ? o.partsOfDay : undefined,
    intervalSeconds,
    telegram,
    launchAtLogin: o.launchAtLogin === true,
  };
}

export async function loadSettings(): Promise<AppSettings | null> {
  let raw: string;
  try {
    raw = await readFile(settingsPath(), "utf8");
  } catch {
    return null; // not configured yet
  }
  try {
    return validateSettings(JSON.parse(raw));
  } catch (err) {
    console.error("settings.json is invalid:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const target = settingsPath();
  await mkdir(dirname(target), { recursive: true });
  const tmp = `${target}.tmp`;
  await writeFile(tmp, JSON.stringify(settings, null, 2), { mode: 0o600 });
  await rename(tmp, target);
}
