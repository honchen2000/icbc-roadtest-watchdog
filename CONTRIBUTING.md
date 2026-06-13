# Contributing

Thanks for your interest! A few ground rules keep this project healthy and
responsible:

- **Keep it read-only / notify-only.** This project must never book, hold,
  reschedule, or cancel appointments. PRs that automate bookings won't be merged.
- **Respect ICBC.** Keep polling intervals conservative; don't add features that
  hammer ICBC's servers or attempt to evade their protections.
- **No secrets.** Never commit real credentials. `.env`, local config, and state
  files are git-ignored — keep it that way.
- **Privacy first.** Credentials stay on the user's device; don't add telemetry,
  analytics, or any phone-home behavior.

## Dev setup

```bash
git clone https://github.com/honchen2000/icbc-roadtest-watchdog.git
cd icbc-roadtest-watchdog
npm install
# (the Electron app lands in milestone M2 — see PLAN.md)
```

Please open an issue first for anything substantial so we can align on approach.
Thanks!
