// Renderer: settings form + live status. Talks to main only through window.api
// (contextBridge). No Node, no direct network.

import type { LocationRef } from "../../core/types.ts";
import type { AppSettings, WatchdogApi, WatchdogStatus } from "../../shared/types.ts";

const api = (window as unknown as { api: WatchdogApi }).api;

// Last-loaded settings, so a Save preserves fields the form doesn't expose yet.
let loaded: AppSettings | null = null;

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
}

const statusEl = el("status");
const msgEl = el("msg");
const examType = el<HTMLSelectElement>("examType");
const examTypeCustom = el<HTMLInputElement>("examTypeCustom");

const KNOWN_EXAM_TYPES = ["5-R-1", "6-R-1", "7-R-1"];

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderStatus(s: WatchdogStatus): void {
  const head = s.running ? "● Watching" : "○ Stopped";
  const cfg = s.configured ? "configured" : "not configured yet";
  const err = s.lastError ? `<br /><span class="err">last error: ${escapeHtml(s.lastError)}</span>` : "";
  statusEl.innerHTML =
    `<b>${head}</b> · ${cfg}<br />last check: ${s.lastCheckAt ? escapeHtml(s.lastCheckAt) : "—"} · found: ${Number(s.lastFound) || 0}${err}`;
}

function setMsg(text: string, ok: boolean): void {
  msgEl.textContent = text;
  msgEl.className = ok ? "ok" : "err";
}

function syncExamCustom(): void {
  examTypeCustom.classList.toggle("hidden", examType.value !== "__custom");
}
examType.addEventListener("change", syncExamCustom);

function parseLocations(text: string): LocationRef[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [idPart, ...rest] = line.split(":");
      const id = Number((idPart ?? "").trim());
      return { id, name: rest.join(":").trim() || `Location ${id}` };
    })
    .filter((loc) => Number.isInteger(loc.id));
}

function populate(s: AppSettings | null): void {
  loaded = s;
  syncExamCustom();
  if (!s) return;
  el<HTMLInputElement>("lastName").value = s.credentials.lastName ?? "";
  el<HTMLInputElement>("licenceNumber").value = s.credentials.licenceNumber ?? "";
  el<HTMLInputElement>("keyword").value = s.credentials.keyword ?? "";

  if (KNOWN_EXAM_TYPES.includes(s.examTypeCode)) {
    examType.value = s.examTypeCode;
  } else {
    examType.value = "__custom";
    examTypeCustom.value = s.examTypeCode;
  }
  syncExamCustom();

  el<HTMLTextAreaElement>("locations").value = s.locations.map((l) => `${l.id}:${l.name}`).join("\n");
  el<HTMLInputElement>("notifyBeforeDate").value = s.notifyBeforeDate ?? "";
  el<HTMLInputElement>("intervalSeconds").value = String(s.intervalSeconds ?? 120);

  el<HTMLInputElement>("tgEnabled").checked = s.telegram.enabled;
  el<HTMLInputElement>("tgChatId").value = s.telegram.chatId ?? "";
  // The token is blanked by main; if Telegram is already enabled, a token is saved.
  const tokenField = el<HTMLInputElement>("tgBotToken");
  tokenField.value = "";
  tokenField.placeholder = s.telegram.enabled ? "saved — leave blank to keep" : "";

  el<HTMLInputElement>("launchAtLogin").checked = s.launchAtLogin === true;
}

function gather(): AppSettings {
  const code = examType.value === "__custom" ? examTypeCustom.value.trim() : examType.value;
  const intervalRaw = Number(el<HTMLInputElement>("intervalSeconds").value);
  return {
    credentials: {
      lastName: el<HTMLInputElement>("lastName").value.trim(),
      licenceNumber: el<HTMLInputElement>("licenceNumber").value.trim(),
      keyword: el<HTMLInputElement>("keyword").value,
    },
    examTypeCode: code,
    locations: parseLocations(el<HTMLTextAreaElement>("locations").value),
    notifyBeforeDate: el<HTMLInputElement>("notifyBeforeDate").value || undefined,
    // Preserve fields the form doesn't expose yet so a Save never wipes them.
    searchFromDate: loaded?.searchFromDate,
    daysOfWeek: loaded?.daysOfWeek,
    partsOfDay: loaded?.partsOfDay,
    intervalSeconds: Number.isFinite(intervalRaw) ? intervalRaw : 120,
    telegram: {
      enabled: el<HTMLInputElement>("tgEnabled").checked,
      botToken: el<HTMLInputElement>("tgBotToken").value, // blank = keep existing (merged in main)
      chatId: el<HTMLInputElement>("tgChatId").value.trim(),
    },
    launchAtLogin: el<HTMLInputElement>("launchAtLogin").checked,
  };
}

async function save(): Promise<boolean> {
  try {
    await api.saveSettings(gather());
    return true;
  } catch (err) {
    setMsg(`Save failed: ${err instanceof Error ? err.message : String(err)}`, false);
    return false;
  }
}

el<HTMLFormElement>("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg("Saving…", true);
  if (await save()) {
    setMsg("Saved ✓", true);
    renderStatus(await api.getStatus());
  }
});

el<HTMLButtonElement>("start").addEventListener("click", () => void api.start());
el<HTMLButtonElement>("stop").addEventListener("click", () => void api.stop());

el<HTMLButtonElement>("tgTest").addEventListener("click", async () => {
  setMsg("Saving + sending test…", true);
  if (!(await save())) return;
  try {
    const r = await api.testTelegram();
    setMsg(r.ok ? "Telegram test sent ✓ — check your app" : `Telegram failed: ${r.error ?? "unknown"}`, r.ok);
  } catch (err) {
    setMsg(`Failed: ${err instanceof Error ? err.message : String(err)}`, false);
  }
});

el("folderLink").addEventListener("click", (e) => {
  e.preventDefault();
  void api.openDataFolder();
});

api.onStatus(renderStatus);
void (async () => {
  populate(await api.getSettings());
  renderStatus(await api.getStatus());
})();
