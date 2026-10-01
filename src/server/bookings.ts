import { randomUUID } from "node:crypto";
import type { DbClient } from "./db";
import type { Actor } from "@/lib/types";
import { transaction } from "./db";
import { DomainError } from "./errors";
import { requireCoach } from "./auth";
export async function lockWorkspace(c: DbClient, id: string) {
  const r = await c.query(
    "SELECT id FROM workspaces WHERE id=$1 AND (expires_at IS NULL OR expires_at>now()) FOR UPDATE",
    [id],
  );
  if (!r.rowCount) throw new DomainError("This demo has expired. Start a fresh workspace.", 401);
  await c.query(
    "UPDATE bookings SET status='EXPIRED',updated_at=now() WHERE workspace_id=$1 AND status='HOLD' AND expires_at<=now()",
    [id],
  );
}
export async function audit(c: DbClient, a: Actor, action: string, id: string) {
  await c.query("INSERT INTO audit(workspace_id,actor_id,action,resource_id) VALUES($1,$2,$3,$4)", [
    a.workspaceId,
    a.id,
    action,
    id,
  ]);
}
export async function reserve(a: Actor, slotId: string) {
  if (a.role !== "CLIENT")
    throw new DomainError("Switch to the client demo to make a reservation.", 403);
  return transaction(async (c) => {
    await lockWorkspace(c, a.workspaceId);
    const { rows } = await c.query(
      "SELECT * FROM slots WHERE id=$1 AND workspace_id=$2 AND NOT cancelled AND starts_at>now()",
      [slotId, a.workspaceId],
    );
    const slot = rows[0];
    if (!slot) throw new DomainError("This session is no longer available.", 409);
    const collision = await c.query(
      "SELECT b.id FROM bookings b JOIN slots s ON s.id=b.slot_id WHERE b.workspace_id=$1 AND b.person_id=$2 AND (b.status='CONFIRMED' OR(b.status='HOLD' AND b.expires_at>now())) AND s.starts_at<$3 AND s.ends_at>$4",
      [a.workspaceId, a.id, slot.ends_at, slot.starts_at],
    );
    if (collision.rowCount)
      throw new DomainError("You already have a reservation at this time.", 409);
    const id = randomUUID();
    await c.query(
      "INSERT INTO bookings(id,workspace_id,slot_id,person_id,status,payment,expires_at,price) VALUES($1,$2,$3,$4,'HOLD','PENDING',now()+interval '10 minutes',$5)",
      [id, a.workspaceId, slotId, a.id, slot.price],
    );
    await audit(c, a, "Reservation held for 10 minutes", id);
    return id;
  });
}
export async function confirmDemo(a: Actor, id: string) {
  if (!a.demo || process.env.DEMO_MODE !== "true")
    throw new DomainError("Simulated checkout is only available in the demo.", 403);
  return transaction(async (c) => {
    await lockWorkspace(c, a.workspaceId);
    const r = await c.query(
      "SELECT * FROM bookings WHERE id=$1 AND workspace_id=$2 AND person_id=$3",
      [id, a.workspaceId, a.id],
    );
    const b = r.rows[0];
    if (!b) throw new DomainError("Reservation not found.", 404);
    if (b.status === "CONFIRMED") return;
    if (b.status !== "HOLD")
      throw new DomainError("This hold has expired or was cancelled. Please book again.", 409);
    await c.query(
      "UPDATE bookings SET status='CONFIRMED',payment='DEMO_PAID',updated_at=now() WHERE id=$1",
      [id],
    );
    await audit(c, a, "Demo payment confirmed — no money moved", id);
  });
}
export async function cancelBooking(a: Actor, id: string) {
  return transaction(async (c) => {
    await lockWorkspace(c, a.workspaceId);
    const { rows } = await c.query(
      "SELECT b.*,s.starts_at FROM bookings b JOIN slots s ON s.id=b.slot_id WHERE b.id=$1 AND b.workspace_id=$2",
      [id, a.workspaceId],
    );
    const b = rows[0];
    if (!b || (a.role !== "COACH" && b.person_id !== a.id))
      throw new DomainError("Reservation not found.", 404);
    if (b.status === "CANCELLED") return;
    if (!["HOLD", "CONFIRMED"].includes(b.status) || new Date(b.starts_at).getTime() <= Date.now())
      throw new DomainError("Only upcoming reservations can be cancelled.", 409);
    await c.query(
      "UPDATE bookings SET status='CANCELLED',payment=CASE WHEN payment='STRIPE_PAID' THEN 'REFUND_REQUIRED' ELSE payment END,updated_at=now() WHERE id=$1",
      [id],
    );
    await audit(c, a, "Reservation cancelled", id);
  });
}
export async function reschedule(a: Actor, id: string, target: string) {
  return transaction(async (c) => {
    await lockWorkspace(c, a.workspaceId);
    const b = (
      await c.query(
        "SELECT b.*,s.service_id,s.starts_at FROM bookings b JOIN slots s ON s.id=b.slot_id WHERE b.id=$1 AND b.workspace_id=$2",
        [id, a.workspaceId],
      )
    ).rows[0];
    if (!b || (a.role !== "COACH" && b.person_id !== a.id))
      throw new DomainError("Reservation not found.", 404);
    if (b.status !== "CONFIRMED" || new Date(b.starts_at).getTime() <= Date.now())
      throw new DomainError("Only confirmed upcoming sessions can be moved.", 409);
    const s = (
      await c.query(
        "SELECT * FROM slots WHERE id=$1 AND workspace_id=$2 AND NOT cancelled AND starts_at>now()",
        [target, a.workspaceId],
      )
    ).rows[0];
    if (!s || s.service_id !== b.service_id || s.price !== b.price)
      throw new DomainError("Choose the same service at the same price.", 409);
    const collision = await c.query(
      "SELECT b.id FROM bookings b JOIN slots s ON s.id=b.slot_id WHERE b.workspace_id=$1 AND b.person_id=$2 AND b.id<>$3 AND (b.status='CONFIRMED' OR (b.status='HOLD' AND b.expires_at>now())) AND s.starts_at<$4 AND s.ends_at>$5",
      [a.workspaceId, b.person_id, id, s.ends_at, s.starts_at],
    );
    if (collision.rowCount)
      throw new DomainError("This client already has a reservation at this time.", 409);
    await c.query("UPDATE bookings SET slot_id=$1,updated_at=now() WHERE id=$2", [target, id]);
    await audit(c, a, "Reservation rescheduled", id);
  });
}
export async function attendance(a: Actor, id: string, present: boolean) {
  requireCoach(a);
  return transaction(async (c) => {
    await lockWorkspace(c, a.workspaceId);
    const r = await c.query(
      "UPDATE bookings b SET status=$1,updated_at=now() FROM slots s WHERE b.slot_id=s.id AND b.id=$2 AND b.workspace_id=$3 AND b.status IN ('CONFIRMED','ATTENDED','NO_SHOW') AND s.starts_at<=now() RETURNING b.id",
      [present ? "ATTENDED" : "NO_SHOW", id, a.workspaceId],
    );
    if (!r.rowCount)
      throw new DomainError("Attendance can be recorded after a confirmed session starts.", 409);
    await audit(c, a, present ? "Attendance recorded" : "Absence recorded", id);
  });
}
