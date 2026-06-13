// Minimal renderer for the M2 shell — shows status and Start/Stop.
// The full setup wizard lands in M3.

import type { WatchdogApi, WatchdogStatus } from "../../shared/types.ts";

const api = (window as unknown as { api: WatchdogApi }).api;
const statusEl = document.getElementById("status") as HTMLDivElement;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function render(s: WatchdogStatus): void {
  const head = s.running ? "● Watching" : "○ Stopped";
  const cfg = s.configured ? "configured" : "not configured — add settings.json";
  const err = s.lastError
    ? `<br /><span style="color:#dc2626">error: ${escapeHtml(s.lastError)}</span>`
    : "";
  statusEl.innerHTML = `<b>${head}</b> · ${cfg}<br />last check: ${
    s.lastCheckAt ? escapeHtml(s.lastCheckAt) : "—"
  } · found: ${s.lastFound}${err}`;
}

api.onStatus(render);
void api.getStatus().then(render);

(document.getElementById("start") as HTMLButtonElement).addEventListener("click", () => void api.start());
(document.getElementById("stop") as HTMLButtonElement).addEventListener("click", () => void api.stop());
(document.getElementById("folder") as HTMLButtonElement).addEventListener("click", () => void api.openDataFolder());
