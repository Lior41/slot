import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { createDemoWorkspace } from "../src/server/demo";
import { db } from "../src/server/db";
import { reserve, confirmDemo, cancelBooking, reschedule } from "../src/server/bookings";
import { saveService, createSlot } from "../src/server/schedule";
import type { Actor } from "../src/lib/types";
let a: Actor, b: Actor, coach: Actor;
let slots: { id: string; service_id: string }[];
let workspace: string;
beforeAll(async () => {
  process.env.DEMO_MODE = "true";
  const w = await createDemoWorkspace();
  workspace = w.workspaceId;
  const people = (
    await db.query("SELECT * FROM people WHERE workspace_id=$1 ORDER BY name", [workspace])
  ).rows;
  const actor = (p: (typeof people)[number]): Actor => ({
    id: p.id,
    workspaceId: workspace,
    name: p.name,
    role: p.role,
    demo: true,
    timezone: "Asia/Jerusalem",
  });
  [a, b] = people.filter((p) => p.role === "CLIENT").map(actor);
  coach = actor(people.find((p) => p.role === "COACH")!);
  slots = (
    await db.query<{ id: string; service_id: string }>(
      "SELECT id,service_id FROM slots WHERE workspace_id=$1 AND capacity=1 ORDER BY starts_at",
      [workspace],
    )
  ).rows;
});
afterAll(async () => {
  if (workspace) await db.query("DELETE FROM workspaces WHERE id=$1", [workspace]);
  await db.end();
});
describe("booking transactions", () => {
  it("accepts exactly one of two concurrent reservations for the final place", async () => {
    const r = await Promise.allSettled([reserve(a, slots[0].id), reserve(b, slots[0].id)]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(r.filter((x) => x.status === "rejected")).toHaveLength(1);
    expect(
      Number(
        (
          await db.query("SELECT count(*) AS n FROM bookings WHERE slot_id=$1 AND status='HOLD'", [
            slots[0].id,
          ])
        ).rows[0].n,
      ),
    ).toBe(1);
  });
  it("confirms payment idempotently, reschedules atomically and cancels", async () => {
    const id = await reserve(a, slots[1].id);
    await confirmDemo(a, id);
    await confirmDemo(a, id);
    await reschedule(a, id, slots[2].id);
    expect((await db.query("SELECT slot_id FROM bookings WHERE id=$1", [id])).rows[0].slot_id).toBe(
      slots[2].id,
    );
    await cancelBooking(a, id);
    expect((await db.query("SELECT status FROM bookings WHERE id=$1", [id])).rows[0].status).toBe(
      "CANCELLED",
    );
  });
  it("releases abandoned holds before accepting a new reservation", async () => {
    const id = await reserve(a, slots[3].id);
    await db.query("UPDATE bookings SET expires_at=now()-interval '1 minute' WHERE id=$1", [id]);
    await expect(confirmDemo(a, id)).rejects.toThrow();
    await expect(reserve(b, slots[3].id)).resolves.toBeTypeOf("string");
  });
  it("denies client access to coach operations", async () => {
    await expect(
      saveService(a, {
        name: "Forbidden",
        description: "",
        duration: 45,
        buffer: 15,
        capacity: 1,
        price: 100,
        active: true,
      }),
    ).rejects.toThrow("Only the coach");
  });
  it("does not allow another client to cancel a booking", async () => {
    const id = await reserve(a, slots[4].id);
    await expect(cancelBooking(b, id)).rejects.toThrow("not found");
  });
  it("rejects sessions inside the seeded lunch break", async () => {
    await expect(createSlot(coach, slots[0].service_id, "2030-10-07T12:30")).rejects.toThrow(
      "working window",
    );
  });
  it("does not expose another workspace through a known slot ID", async () => {
    const w = await createDemoWorkspace();
    try {
      await expect(reserve({ ...a, workspaceId: w.workspaceId }, slots[5].id)).rejects.toThrow(
        "no longer available",
      );
    } finally {
      await db.query("DELETE FROM workspaces WHERE id=$1", [w.workspaceId]);
    }
  });
});
