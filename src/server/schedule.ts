import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Actor } from "@/lib/types";
import { localInstant, timeParts } from "@/lib/time";
import { transaction } from "./db";
import { requireCoach } from "./auth";
import { DomainError } from "./errors";
import { audit, lockWorkspace } from "./bookings";
export const serviceSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(240),
  duration: z.number().int().min(15).max(120),
  buffer: z.number().int().min(0).max(60),
  capacity: z.number().int().min(1).max(20),
  price: z.number().int().min(0).max(100000),
  active: z.boolean().default(true),
});
export async function saveService(a: Actor, input: z.infer<typeof serviceSchema>) {
  requireCoach(a);
  const s = serviceSchema.parse(input);
  return transaction(async (c) => {
    await lockWorkspace(c, a.workspaceId);
    const id = s.id ?? randomUUID();
    if (s.id) {
      const r = await c.query(
        "UPDATE services SET name=$1,description=$2,duration=$3,buffer=$4,capacity=$5,price=$6,active=$7 WHERE id=$8 AND workspace_id=$9 RETURNING id",
        [
          s.name,
          s.description,
          s.duration,
          s.buffer,
          s.capacity,
          s.price,
          s.active,
          id,
          a.workspaceId,
        ],
      );
      if (!r.rowCount) throw new DomainError("Service not found.", 404);
    } else
      await c.query(
        "INSERT INTO services(id,workspace_id,name,description,duration,buffer,capacity,price,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          id,
          a.workspaceId,
          s.name,
          s.description,
          s.duration,
          s.buffer,
          s.capacity,
          s.price,
          s.active,
        ],
      );
    await audit(c, a, "Service saved — existing sessions keep their terms", id);
  });
}
export async function createSlot(a: Actor, serviceId: string, local: string) {
  requireCoach(a);
  let start: string;
  try {
    start = localInstant(local, a.timezone);
  } catch {
    throw new DomainError("This local time is ambiguous or does not exist. Choose another time.");
  }
  if (Date.parse(start) <= Date.now()) throw new DomainError("Choose a future date and time.");
  return transaction(async (c) => {
    await lockWorkspace(c, a.workspaceId);
    const s = (
      await c.query("SELECT * FROM services WHERE id=$1 AND workspace_id=$2 AND active", [
        serviceId,
        a.workspaceId,
      ])
    ).rows[0];
    if (!s) throw new DomainError("Choose an active service.");
    const end = new Date(Date.parse(start) + s.duration * 60000).toISOString(),
      blocked = new Date(Date.parse(end) + s.buffer * 60000).toISOString();
    const p = timeParts(start, a.timezone),
      q = timeParts(blocked, a.timezone);
    const window = await c.query(
      "SELECT id FROM availability WHERE workspace_id=$1 AND coach_id=$2 AND weekday=$3 AND start_min<=$4 AND end_min>=$5",
      [a.workspaceId, a.id, p.weekday, p.minutes, q.minutes],
    );
    if (p.date !== q.date || !window.rowCount)
      throw new DomainError("The session and its buffer must fit within one working window.");
    const away = await c.query(
      "SELECT id FROM absences WHERE workspace_id=$1 AND coach_id=$2 AND starts_at<$3 AND ends_at>$4",
      [a.workspaceId, a.id, blocked, start],
    );
    if (away.rowCount) throw new DomainError("This time overlaps a coach absence.");
    const id = randomUUID();
    await c.query(
      "INSERT INTO slots(id,workspace_id,service_id,coach_id,starts_at,ends_at,blocked_until,capacity,price) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [id, a.workspaceId, serviceId, a.id, start, end, blocked, s.capacity, s.price],
    );
    await audit(c, a, "Session published", id);
  });
}
export async function cancelSlot(a: Actor, id: string) {
  requireCoach(a);
  return transaction(async (c) => {
    await lockWorkspace(c, a.workspaceId);
    const s = (
      await c.query(
        "SELECT id FROM slots WHERE id=$1 AND workspace_id=$2 AND coach_id=$3 AND starts_at>now()",
        [id, a.workspaceId, a.id],
      )
    ).rows[0];
    if (!s) throw new DomainError("Upcoming session not found.", 404);
    await c.query(
      "UPDATE bookings SET status='CANCELLED',payment=CASE WHEN payment='STRIPE_PAID' THEN 'REFUND_REQUIRED' ELSE payment END,updated_at=now() WHERE slot_id=$1 AND status IN ('HOLD','CONFIRMED')",
      [id],
    );
    await c.query("UPDATE slots SET cancelled=true WHERE id=$1", [id]);
    await audit(c, a, "Session cancelled; reservations released", id);
  });
}
export async function setAvailability(a: Actor, weekday: number, start: number, end: number) {
  requireCoach(a);
  if (start >= end) throw new DomainError("End time must be after start time.");
  return transaction(async (c) => {
    await lockWorkspace(c, a.workspaceId);
    const upcoming = (
      await c.query(
        "SELECT starts_at,blocked_until FROM slots WHERE workspace_id=$1 AND coach_id=$2 AND NOT cancelled AND starts_at>now()",
        [a.workspaceId, a.id],
      )
    ).rows;
    for (const s of upcoming) {
      const p = timeParts(s.starts_at.toISOString(), a.timezone),
        q = timeParts(s.blocked_until.toISOString(), a.timezone);
      if (p.weekday === weekday && (p.minutes < start || q.minutes > end || p.date !== q.date))
        throw new DomainError("Cancel or move sessions outside the new working window first.");
    }
    await c.query("DELETE FROM availability WHERE workspace_id=$1 AND coach_id=$2 AND weekday=$3", [
      a.workspaceId,
      a.id,
      weekday,
    ]);
    const id = randomUUID();
    await c.query(
      "INSERT INTO availability(id,workspace_id,coach_id,weekday,start_min,end_min) VALUES($1,$2,$3,$4,$5,$6)",
      [id, a.workspaceId, a.id, weekday, start, end],
    );
    await audit(c, a, "Working window updated", id);
  });
}
export async function addAbsence(a: Actor, startLocal: string, endLocal: string, reason: string) {
  requireCoach(a);
  let start: string, end: string;
  try {
    start = localInstant(startLocal, a.timezone);
    end = localInstant(endLocal, a.timezone);
  } catch {
    throw new DomainError("Choose unambiguous local times.");
  }
  if (end <= start) throw new DomainError("End must follow start.");
  return transaction(async (c) => {
    await lockWorkspace(c, a.workspaceId);
    const overlap = await c.query(
      "SELECT id FROM slots WHERE workspace_id=$1 AND coach_id=$2 AND NOT cancelled AND starts_at<$3 AND blocked_until>$4",
      [a.workspaceId, a.id, end, start],
    );
    if (overlap.rowCount)
      throw new DomainError("Cancel overlapping sessions before adding this absence.");
    const id = randomUUID();
    await c.query(
      "INSERT INTO absences(id,workspace_id,coach_id,starts_at,ends_at,reason) VALUES($1,$2,$3,$4,$5,$6)",
      [id, a.workspaceId, a.id, start, end, reason],
    );
    await audit(c, a, "Coach absence added", id);
  });
}
