// Native OS notification channel — implements the core Notifier interface.

import { Notification } from "electron";
import { formatSlotsPlain } from "../core/index.ts";
import type { Notifier, Slot } from "../core/index.ts";

export class DesktopNotifier implements Notifier {
  async notify(newSlots: Slot[]): Promise<void> {
    if (newSlots.length === 0 || !Notification.isSupported()) return;
    const plural = newSlots.length > 1 ? "s" : "";
    const title = `ICBC: ${newSlots.length} earlier road-test slot${plural}`;
    // Drop the header line; show the first few slot lines as the body.
    const body = formatSlotsPlain(newSlots).split("\n").slice(1, 7).join("\n") || "Open ICBC to book.";
    new Notification({ title, body }).show();
  }
}
