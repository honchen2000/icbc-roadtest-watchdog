// Pure-logic tests for the core engine — no network. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { diffSlots, posIdOfKey, slotKey } from "../src/core/watcher.ts";
import { formatSlotsHtml, formatSlotsPlain } from "../src/core/notify.ts";
import type { Slot } from "../src/core/types.ts";

const TODAY = "2026-06-13";

function slot(date: string, time: string, posId = 9, locationName = "Test"): Slot {
  return { posId, locationName, date, time };
}

test("diffSlots keeps only slots within [today, cutoff]", () => {
  const found = [slot("2026-07-01", "9:00 AM"), slot("2026-09-01", "9:00 AM")];
  const { interesting } = diffSlots({
    found,
    polledPosIds: [9],
    priorSeen: [],
    today: TODAY,
    cutoff: "2026-08-01",
  });
  assert.equal(interesting.length, 1);
  assert.equal(interesting[0]?.date, "2026-07-01");
});

test("diffSlots excludes past-dated slots (lower bound = today)", () => {
  const found = [slot("2020-01-01", "9:00 AM"), slot("2026-07-01", "9:00 AM")];
  const { interesting } = diffSlots({ found, polledPosIds: [9], priorSeen: [], today: TODAY });
  assert.equal(interesting.length, 1);
  assert.equal(interesting[0]?.date, "2026-07-01");
});

test("diffSlots returns only NEW slots vs the seen set", () => {
  const a = slot("2026-07-01", "9:00 AM");
  const b = slot("2026-07-02", "10:00 AM");
  const { newSlots } = diffSlots({ found: [a, b], polledPosIds: [9], priorSeen: [slotKey(a)], today: TODAY });
  assert.equal(newSlots.length, 1);
  assert.equal(newSlots[0]?.date, "2026-07-02");
});

test("diffSlots self-prunes a polled location's now-gone slots", () => {
  const a = slot("2026-07-01", "9:00 AM");
  const b = slot("2026-07-02", "9:00 AM");
  // both previously seen at posId 9; this cycle posId 9 polled OK but only b remains
  const { newSlots, nextSeen } = diffSlots({
    found: [b],
    polledPosIds: [9],
    priorSeen: [slotKey(a), slotKey(b)],
    today: TODAY,
  });
  assert.equal(newSlots.length, 0);
  assert.deepEqual(nextSeen, [slotKey(b)]);
});

test("diffSlots carries forward seen keys for locations that were NOT polled (errored)", () => {
  const a = slot("2026-07-01", "9:00 AM", 9, "A"); // posId 9 polled OK
  const bKey = slotKey(slot("2026-07-05", "9:00 AM", 11, "B")); // posId 11 errored this cycle
  const { newSlots, nextSeen } = diffSlots({
    found: [a],
    polledPosIds: [9],
    priorSeen: [slotKey(a), bKey],
    today: TODAY,
  });
  assert.equal(newSlots.length, 0); // a already seen; B not re-evaluated
  assert.ok(nextSeen.includes(bKey)); // B's key preserved despite not being polled
  assert.ok(nextSeen.includes(slotKey(a)));
});

test("posIdOfKey extracts the posId from a slot key", () => {
  assert.equal(posIdOfKey("11|2026-07-01|9:00 AM"), 11);
});

test("formatSlotsPlain caps at 20 and notes the overflow", () => {
  const many: Slot[] = Array.from({ length: 25 }, (_, i) =>
    slot(`2026-07-${String((i % 27) + 1).padStart(2, "0")}`, "9:00 AM"),
  );
  const out = formatSlotsPlain(many);
  assert.match(out, /and 5 more/);
});

test("formatSlotsHtml escapes and links to the booking site", () => {
  const out = formatSlotsHtml([slot("2026-07-01", "9:00 AM", 9, "A & B")]);
  assert.match(out, /A &amp; B/);
  assert.match(out, /webdeas-ui/);
});
