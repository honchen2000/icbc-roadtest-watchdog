// Notification abstraction. The core only depends on the Notifier interface;
// concrete channels (console, Telegram, and later a desktop notifier in Electron)
// plug in behind it.

import type { Slot } from "./types.ts";

export interface Notifier {
  notify(newSlots: Slot[]): Promise<void>;
}

const MAX_SHOWN = 20; // a single Telegram message caps at 4096 chars

function sortSlots(slots: Slot[]): Slot[] {
  return [...slots].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function groupByLocation(slots: Slot[]): Map<string, Slot[]> {
  const map = new Map<string, Slot[]>();
  for (const s of slots) {
    const list = map.get(s.locationName) ?? [];
    list.push(s);
    map.set(s.locationName, list);
  }
  return map;
}

export function formatSlotsPlain(slots: Slot[]): string {
  const shown = sortSlots(slots).slice(0, MAX_SHOWN);
  const lines: string[] = ["ICBC road test — new slot(s):"];
  for (const [loc, arr] of groupByLocation(shown)) {
    lines.push(`  ${loc}`);
    for (const s of arr) lines.push(`    - ${s.date} ${s.time}`);
  }
  if (slots.length > shown.length) lines.push(`  …and ${slots.length - shown.length} more`);
  return lines.join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatSlotsHtml(slots: Slot[]): string {
  const shown = sortSlots(slots).slice(0, MAX_SHOWN);
  const lines: string[] = ["\u{1F6A8} <b>ICBC road test — new slot(s)!</b>", ""];
  for (const [loc, arr] of groupByLocation(shown)) {
    lines.push(`\u{1F4CD} <b>${escapeHtml(loc)}</b>`);
    for (const s of arr) lines.push(`   • ${escapeHtml(s.date)} ${escapeHtml(s.time)}`);
    lines.push("");
  }
  if (slots.length > shown.length) {
    lines.push(`… +${slots.length - shown.length} more`);
    lines.push("");
  }
  lines.push('\u{1F449} <a href="https://onlinebusiness.icbc.com/webdeas-ui/home">ICBC booking site</a>');
  return lines.join("\n");
}

export class ConsoleNotifier implements Notifier {
  async notify(newSlots: Slot[]): Promise<void> {
    console.log("\n" + formatSlotsPlain(newSlots) + "\n");
  }
}

export class TelegramNotifier implements Notifier {
  readonly botToken: string;
  readonly chatId: string;

  constructor(botToken: string, chatId: string) {
    this.botToken = botToken;
    this.chatId = chatId;
  }

  async send(text: string): Promise<void> {
    const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: this.chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Telegram sendMessage failed: ${res.status} ${body.slice(0, 200)}`);
    }
  }

  async notify(newSlots: Slot[]): Promise<void> {
    await this.send(formatSlotsHtml(newSlots));
  }

  async sendTest(): Promise<void> {
    await this.send("✅ <b>ICBC Road Test Watchdog</b>\nTelegram test — it works!");
  }
}

/** Fan out to several notifiers; throws if any fail (after trying all). */
export class MultiNotifier implements Notifier {
  readonly notifiers: Notifier[];

  constructor(notifiers: Notifier[]) {
    this.notifiers = notifiers;
  }

  async notify(newSlots: Slot[]): Promise<void> {
    const results = await Promise.allSettled(this.notifiers.map((n) => n.notify(newSlots)));
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failed.length > 0) {
      throw new Error(failed.map((r) => String(r.reason?.message ?? r.reason)).join("; "));
    }
  }
}
