// Tiny CLI to exercise/validate the core engine before the Electron GUI exists.
//
//   npm run cli            # loop, polling every config.intervalSeconds
//   npm run cli -- --once  # single check then exit
//   npm run cli -- ./my-config.json --once
//
// Reads config from config.local.json (copy from config.example.json). State is
// kept in state.local.json (both are git-ignored).

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Watcher } from "./core/watcher.ts";
import { FileStore } from "./core/storage.ts";
import { ConsoleNotifier, MultiNotifier, TelegramNotifier } from "./core/notify.ts";
import type { Notifier } from "./core/notify.ts";
import type { WatchConfig } from "./core/types.ts";

interface CliConfig extends WatchConfig {
  intervalSeconds?: number;
  telegram?: { enabled?: boolean; botToken?: string; chatId?: string };
}

const MIN_INTERVAL_S = 60;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function validate(cfg: CliConfig): void {
  const c = cfg.credentials;
  if (!c || !c.lastName || !c.licenceNumber || !c.keyword) {
    fail("config.credentials.lastName / licenceNumber / keyword are all required.");
  }
  if (!cfg.examTypeCode) fail('config.examTypeCode is required (e.g. "6-R-1").');
  if (!Array.isArray(cfg.locations) || cfg.locations.length === 0) {
    fail("config.locations must list at least one { id, name }.");
  }
  if (cfg.telegram?.enabled && (!cfg.telegram.botToken || !cfg.telegram.chatId)) {
    fail("telegram.enabled is true but telegram.botToken / chatId are missing.");
  }
}

function buildNotifier(cfg: CliConfig): Notifier {
  const notifiers: Notifier[] = [new ConsoleNotifier()];
  if (cfg.telegram?.enabled && cfg.telegram.botToken && cfg.telegram.chatId) {
    notifiers.push(new TelegramNotifier(cfg.telegram.botToken, cfg.telegram.chatId));
  }
  return new MultiNotifier(notifiers);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const once = args.includes("--once");
  const cfgPath = resolve(args.find((a) => !a.startsWith("--")) ?? "config.local.json");

  let cfg: CliConfig;
  try {
    cfg = JSON.parse(await readFile(cfgPath, "utf8")) as CliConfig;
  } catch (e) {
    fail(
      `Could not read config "${cfgPath}". Copy config.example.json to config.local.json and fill it in.\n  ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }

  validate(cfg);

  const watcher = new Watcher(cfg, new FileStore(resolve("state.local.json")));
  const notifier = buildNotifier(cfg);
  const intervalS = Math.max(MIN_INTERVAL_S, cfg.intervalSeconds ?? 120);

  const runOnce = async (): Promise<void> => {
    const r = await watcher.check();
    console.log(
      JSON.stringify({
        at: r.at,
        found: r.found.length,
        new: r.newSlots.length,
        firstRun: r.firstRun,
        errors: r.errors,
      }),
    );
    if (r.firstRun) {
      console.log("Baseline established (first run) — you'll be alerted only when NEW slots appear afterwards.");
    }
    if (r.newSlots.length > 0) {
      try {
        await notifier.notify(r.newSlots);
      } catch (e) {
        console.error("notify error:", e instanceof Error ? e.message : String(e));
      }
    }
  };

  if (once) {
    await runOnce();
    return;
  }

  console.log(`Watching every ${intervalS}s — read-only, never books. Ctrl+C to stop.`);
  for (;;) {
    try {
      await runOnce();
    } catch (e) {
      console.error("check failed:", e instanceof Error ? e.message : String(e));
    }
    const jitter = 0.85 + Math.random() * 0.3; // ±15% so polling isn't perfectly periodic
    await sleep(Math.round(intervalS * 1000 * jitter));
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack : String(e));
  process.exit(1);
});
