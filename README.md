# 🐕 ICBC Road Test Watchdog

A free, open-source desktop app that **watches for earlier ICBC road-test
appointment slots** and notifies you the moment one opens up — so you can book it
yourself on the official site.

**Notify-only. Read-only. It never books for you.** See [DISCLAIMER](DISCLAIMER.md).

> ⚠️ Not affiliated with ICBC. Intended for personal use. It polls at a conservative
> interval (about every 90–120s) and enforces a minimum — please don't modify it to
> hammer ICBC. Your credentials stay on your device — see [PRIVACY](PRIVACY.md).

> 🚧 **Status:** under active development. See [PLAN.md](PLAN.md) for the roadmap.

---

## What it does

- Logs in with **your** ICBC credentials and checks road-test availability at the
  locations you pick (any class — 5, 6, 7, …).
- Alerts you (desktop notification + optional **Telegram**) when a slot appears
  **on or before a date you choose** (e.g. earlier than your current booking).
- You then book it yourself on ICBC's website. The app **does not** book, hold,
  reschedule, or cancel anything.

### Why it runs on your computer (not a website)

ICBC blocks requests coming from datacenter / cloud IP addresses, so a hosted
service can't check availability. Running on your own machine (a residential IP)
is what makes it work — and it means **your credentials never leave your device**.

---

## Install

> Signed installers for macOS / Windows / Linux will be published on the
> [Releases](../../releases) page. _(Coming with the first release.)_

Unsigned builds will show an "unidentified developer" (macOS) or SmartScreen
(Windows) warning — instructions to allow them will be in the release notes.

### Run from source (developers)

> 🚧 The Electron app isn't built yet (pre-M2 — see [PLAN.md](PLAN.md)); `npm start`
> currently just prints a status message. The steps below are the intended flow.

```bash
git clone <this-repo>
cd icbc-roadtest-watchdog
npm install
npm start          # (after M2) launches the Electron app
```

Requires Node.js 20.6+.

---

## Setup (in the app)

1. **ICBC login** — last name, driver's licence number, keyword (same as the
   ICBC website). A "Test login" button confirms it works.
2. **Exam** — pick your road-test class (Class 5 / 6 / 7 / …).
3. **Locations** — search by address or postal code and tick the offices to watch.
4. **Notify if on/before** — set this to your current booked test date to only
   hear about *earlier* openings. Leave blank to hear about everything.
5. **Notifications** — desktop notifications are on by default; Telegram is
   optional (see below).

---

## Telegram notifications (optional)

Desktop notifications work out of the box. Telegram is great for getting pinged
on your phone when you're away from the computer.

1. In Telegram, search for **@BotFather**, send `/newbot`, follow the prompts, and
   copy the **bot token** it gives you (looks like `123456789:AA...`).
2. **Send any message to your new bot** (e.g. "hi"). A bot can't message you until
   you've messaged it first.
3. Get your **chat id**: open this URL in a browser (paste your token):
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   and find `"chat":{"id": 123456789, ... "type":"private"}` — that number is your
   chat id.
4. Paste the **bot token** and **chat id** into the app and hit "Send test".

> Common mistake: the chat id is **your** id, **not** the number before the colon
> in the bot token (that's the bot's own id). If you see
> `Forbidden: the bot can't send messages to the bot`, you used the bot's id.

---

## How it works / API provenance

The app talks to ICBC's road-test booking API the same way the official website
does in your browser:

- `PUT /deas-api/v1/webLogin/webLogin` — log in, receive an auth token.
- `POST /deas-api/v1/web/getAvailableAppointments` — list open slots.
- `getNearestPos` — find offices near an address (for the location picker).

These endpoints, field names, and request shapes are **factual interoperability
information** the author observed in their **own browser's DevTools** while using
the official ICBC website. The implementation is the author's **own original work**
(adapted from their earlier prototype); **no source code was copied** from ICBC or
any third-party project. See [DISCLAIMER](DISCLAIMER.md).

---

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Please keep the
project read-only/notify-only and respect ICBC's Terms of Use.

## License

[MIT](LICENSE) © 2026 honchen2000
