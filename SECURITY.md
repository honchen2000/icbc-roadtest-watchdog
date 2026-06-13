# Security Policy

This app handles your ICBC login locally. If you discover a security vulnerability —
especially anything that could expose credentials or send data off-device — **please
report it privately** rather than opening a public issue.

- Open a GitHub **private security advisory** on this repository, or
- contact the maintainer via their GitHub profile.

Please include steps to reproduce and the affected version. We'll acknowledge and
work on a fix as soon as we can.

## Good to know

- Credentials are stored locally (OS keychain where available) and are sent only to
  ICBC's official servers over HTTPS, and — if you enable it — to Telegram's API.
- There is no backend and no telemetry.
