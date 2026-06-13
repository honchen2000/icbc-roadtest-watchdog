# Project Plan — ICBC Road Test Watchdog

## Decisions (locked)

- **Scope:** road tests only (any class: 5 / 6 / 7 / …). Knowledge tests are **out
  of scope** — they use a different system (ICBC Qmatic web booking), and Class 5–8
  knowledge tests can now be taken online at home anyway.
- **Model:** notify-only, read-only. No booking / holding / rescheduling.
- **Framework:** **Electron** (JS-only, reuses the author's existing original
  polling code, mature cross-platform packaging).
- **License:** MIT.
- **Notifications:** native desktop (default) + Telegram (with full in-repo setup
  tutorial).
- **Distribution:** GitHub Releases via CI; unsigned at first (documented bypass),
  paid code-signing optional later.

## Non-negotiable constraints (proven during development)

- Must run on the user's **residential IP** — ICBC returns 403 to datacenter/cloud
  IPs. So this is a **local desktop app**, never a hosted service.
- LINE Notify is discontinued (2025-03-31) → use desktop + Telegram.

## Architecture

```
icbc-roadtest-watchdog/
├─ src/
│  ├─ core/        # original TS (author's own): login, getNearestPos,
│  │               #   getAvailableAppointments, diff/dedup, notification dispatch.
│  ├─ main/        # Electron main process (tray, autostart, scheduler, IPC)
│  └─ renderer/    # UI (setup wizard + dashboard)
├─ build/          # icons, packaging assets
├─ .github/workflows/  # CI: cross-platform build + release
├─ LICENSE  DISCLAIMER.md  PRIVACY.md  README.md  PLAN.md
```

- Polling runs in Electron's main process on a timer; UI is the renderer.
- Settings + credentials stored locally (OS keychain via `keytar`/`safeStorage`).
- Exam-type catalog: Class 5 = `5-R-1`, Class 6 = `6-R-1`, Class 7 = `7-R-1`,
  plus an "advanced: custom code" field.

## Security & ethics

- Credentials local-only, encrypted; sent only to ICBC over HTTPS.
- Default poll interval 90–120s with an enforced minimum; read-only.
- Clear "this does not book for you" messaging.

## Milestones

- **M0 — Foundation** (this step): new public repo, MIT LICENSE, DISCLAIMER,
  PRIVACY, README skeleton (incl. Telegram tutorial), this PLAN. Archive the old
  private prototype repo.
- **M1 — Core engine:** original TS module (the author's own work, adapted from the
  prior prototype) — login + getNearestPos + getAvailableAppointments + diff +
  notify abstraction. Validate via a tiny CLI on macOS + Windows from a residential
  IP.
- **M2 — Electron shell:** main process, tray, scheduler, IPC; wire in core;
  native desktop notifications working.
- **M3 — GUI:** setup wizard + dashboard; encrypted settings persistence;
  start/stop; minimize-to-tray; run-at-login.
- **M4 — Telegram channel:** in-app setup + "send test"; finalize README tutorial
  with screenshots.
- **M5 — Location & exam catalog:** address/postal search via getNearestPos;
  exam-type dropdown + custom code.
- **M6 — Packaging & release:** electron-builder bundles (mac/win/linux),
  GitHub Actions release pipeline, docs polish, code-signing decision.

## Roadmap (later)

- i18n (English / 繁體中文).
- More notification channels (email, Discord).
- (Maybe) a separate "Qmatic" provider for knowledge tests / other DL-office
  services — requires its own research; only if there's demand.
