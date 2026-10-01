import { beforeAll, afterAll, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { db } from "../src/server/db";
import { createDemoWorkspace } from "../src/server/demo";
import { reserve, cancelBooking } from "../src/server/bookings";
import { acceptStripePayment } from "../src/server/payments";
import type { Actor } from "../src/lib/types";
let actor: Actor;
let workspace: string;
const events: string[] = [];
beforeAll(async () => {
  const w = await createDemoWorkspace();
  workspace = w.workspaceId;
  actor = {
    id: w.personId,
    workspaceId: workspace,
    role: "CLIENT",
    name: "Alex",
    demo: true,
    timezone: "Asia/Jerusalem",
  };
});
afterAll(async () => {
  await db.query("DELETE FROM workspaces WHERE id=$1", [workspace]);
  for (const id of events) await db.query("DELETE FROM payment_events WHERE id=$1", [id]);
  await db.end();
});
async function held(index: number) {
  const s = (
    await db.query("SELECT * FROM slots WHERE workspace_id=$1 ORDER BY starts_at", [workspace])
  ).rows[index];
  const id = await reserve(actor, s.id);
  return { id, price: s.price };
}
function payment(b: { id: string; price: number }, amount = b.price): Stripe.Event {
  const id = `evt_${randomUUID()}`;
  events.push(id);
  return {
    id,
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: `cs_test_${b.id}`,
        payment_status: "paid",
        amount_total: amount,
        currency: "ils",
        metadata: { bookingId: b.id },
      },
    },
  } as unknown as Stripe.Event;
}
it("records a duplicate event once and never confirms a cancelled reservation", async () => {
  const b = await held(0),
    event = payment(b);
  await acceptStripePayment(event);
  await acceptStripePayment(event);
  expect(
    (await db.query("SELECT payment,status FROM bookings WHERE id=$1", [b.id])).rows[0],
  ).toMatchObject({ payment: "STRIPE_PAID", status: "CONFIRMED" });
  await cancelBooking(actor, b.id);
  await acceptStripePayment(payment(b));
  expect((await db.query("SELECT status FROM bookings WHERE id=$1", [b.id])).rows[0].status).toBe(
    "CANCELLED",
  );
});
it("records a late payment for refund without claiming capacity", async () => {
  const b = await held(1);
  await db.query("UPDATE bookings SET expires_at=now()-interval '1 minute' WHERE id=$1", [b.id]);
  await acceptStripePayment(payment(b));
  expect(
    (await db.query("SELECT status,payment FROM bookings WHERE id=$1", [b.id])).rows[0],
  ).toMatchObject({ status: "EXPIRED", payment: "REFUND_REQUIRED" });
});
it("rolls back a mismatched amount and rejects live mode", async () => {
  const b = await held(2);
  await expect(acceptStripePayment(payment(b, b.price + 1))).rejects.toThrow("amount");
  expect((await db.query("SELECT status FROM bookings WHERE id=$1", [b.id])).rows[0].status).toBe(
    "HOLD",
  );
  await expect(acceptStripePayment({ ...payment(b), livemode: true })).rejects.toThrow(
    "Only Stripe test",
  );
});
