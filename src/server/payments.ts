import Stripe from "stripe";
import { db, transaction } from "./db";
import { DomainError } from "./errors";
import { lockWorkspace, audit } from "./bookings";
import type { Actor } from "@/lib/types";
function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_"))
    throw new DomainError(
      "Stripe test checkout is not configured. Use the simulated demo payment.",
      503,
    );
  return new Stripe(key);
}
export async function checkout(a: Actor, id: string) {
  const stripe = stripeClient();
  const b = (
    await db.query(
      "SELECT b.*,v.name FROM bookings b JOIN slots s ON s.id=b.slot_id JOIN services v ON v.id=s.service_id WHERE b.id=$1 AND b.workspace_id=$2 AND b.person_id=$3 AND b.status='HOLD' AND b.expires_at>now()",
      [id, a.workspaceId, a.id],
    )
  ).rows[0];
  if (!b) throw new DomainError("This reservation hold is no longer available.", 409);
  const origin = process.env.APP_ORIGIN;
  if (!origin) throw new DomainError("Checkout URL is not configured.", 503);
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: { currency: "ils", unit_amount: b.price, product_data: { name: b.name } },
        },
      ],
      metadata: { bookingId: b.id },
      success_url: `${origin}/my-sessions?checkout=returned`,
      cancel_url: `${origin}/my-sessions`,
      expires_at: Math.floor(Date.now() / 1000) + 1800,
    },
    { idempotencyKey: `slot-checkout-${id}` },
  );
  await db.query("UPDATE bookings SET stripe_session=$1 WHERE id=$2 AND workspace_id=$3", [
    session.id,
    id,
    a.workspaceId,
  ]);
  return session.url;
}
export async function acceptStripePayment(event: Stripe.Event) {
  if (event.livemode) throw new DomainError("Only Stripe test events are accepted.", 400);
  if (event.type !== "checkout.session.completed") return;
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return;
  const id = session.metadata?.bookingId;
  if (!id) throw new DomainError("Payment has no booking reference.");
  await transaction(async (c) => {
    const ref = (await c.query("SELECT workspace_id FROM bookings WHERE id=$1", [id])).rows[0];
    if (!ref) throw new DomainError("Payment reference is unknown.", 404);
    // Serialize even if a demo has expired: late payment must still be recorded.
    await c.query("SELECT id FROM workspaces WHERE id=$1 FOR UPDATE", [ref.workspace_id]);
    const inserted = await c.query(
      "INSERT INTO payment_events(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id",
      [event.id],
    );
    if (!inserted.rowCount) return;
    const b = (await c.query("SELECT * FROM bookings WHERE id=$1", [id])).rows[0];
    if (b.price !== session.amount_total || session.currency !== "ils")
      throw new DomainError("Payment amount does not match the reservation.");
    if (b.stripe_session && b.stripe_session !== session.id)
      throw new DomainError("Payment session mismatch.");
    if (b.payment === "STRIPE_PAID" || b.payment === "REFUND_REQUIRED" || b.payment === "REFUNDED")
      return;
    const valid = b.status === "HOLD" && new Date(b.expires_at).getTime() > Date.now();
    await c.query(
      "UPDATE bookings SET status=$1,payment=$2,stripe_session=$3,updated_at=now() WHERE id=$4",
      [
        valid ? "CONFIRMED" : b.status === "HOLD" ? "EXPIRED" : b.status,
        valid ? "STRIPE_PAID" : "REFUND_REQUIRED",
        session.id,
        id,
      ],
    );
    await c.query("INSERT INTO audit(workspace_id,action,resource_id) VALUES($1,$2,$3)", [
      ref.workspace_id,
      valid ? "Stripe test payment confirmed" : "Late test payment: refund required",
      id,
    ]);
  });
}
export async function refund(a: Actor, id: string) {
  if (a.role !== "COACH") throw new DomainError("Only the coach can refund a payment.", 403);
  const stripe = stripeClient();
  const b = (
    await db.query(
      "SELECT * FROM bookings WHERE id=$1 AND workspace_id=$2 AND payment='REFUND_REQUIRED'",
      [id, a.workspaceId],
    )
  ).rows[0];
  if (!b?.stripe_session) throw new DomainError("No refund is due for this reservation.");
  const session = await stripe.checkout.sessions.retrieve(b.stripe_session);
  if (typeof session.payment_intent !== "string")
    throw new DomainError("Payment intent unavailable.", 409);
  const result = await stripe.refunds.create(
    { payment_intent: session.payment_intent },
    { idempotencyKey: `slot-refund-${id}` },
  );
  if (result.status !== "succeeded")
    throw new DomainError("The test refund is still pending. Retry later.", 409);
  await transaction(async (c) => {
    await lockWorkspace(c, a.workspaceId);
    await c.query("UPDATE bookings SET payment='REFUNDED',updated_at=now() WHERE id=$1", [id]);
    await audit(c, a, "Stripe test payment refunded", id);
  });
}
export function verifyStripeEvent(body: string, signature: string) {
  return stripeClient().webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET ?? "",
  );
}
