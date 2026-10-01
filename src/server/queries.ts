import { db } from "./db";
import type { Actor, StudioData } from "@/lib/types";
export async function studioData(a: Actor): Promise<StudioData> {
  const [services, slots, bookings, availability, absences, audit] = await Promise.all([
    db.query("SELECT * FROM services WHERE workspace_id=$1 ORDER BY price DESC", [a.workspaceId]),
    db.query(
      "SELECT s.id,s.service_id,v.name,v.description,s.starts_at,s.ends_at,s.capacity,s.price,s.cancelled,p.name AS coach,s.capacity-(SELECT count(*) FROM bookings b WHERE b.slot_id=s.id AND (b.status IN ('CONFIRMED','ATTENDED','NO_SHOW') OR (b.status='HOLD' AND b.expires_at>now())))::int AS remaining FROM slots s JOIN services v ON v.id=s.service_id JOIN people p ON p.id=s.coach_id WHERE s.workspace_id=$1 AND s.starts_at>now()-interval '1 day' ORDER BY s.starts_at LIMIT 250",
      [a.workspaceId],
    ),
    db.query(
      "SELECT b.id,b.slot_id,b.person_id,p.name AS client,v.name,s.starts_at,s.ends_at,CASE WHEN b.status='HOLD' AND b.expires_at<=now() THEN 'EXPIRED' ELSE b.status END AS status,b.payment,b.price,b.expires_at FROM bookings b JOIN slots s ON s.id=b.slot_id JOIN services v ON v.id=s.service_id JOIN people p ON p.id=b.person_id WHERE b.workspace_id=$1 AND ($2='COACH' OR b.person_id=$3) ORDER BY s.starts_at DESC LIMIT 100",
      [a.workspaceId, a.role, a.id],
    ),
    db.query(
      "SELECT id,weekday,start_min,end_min FROM availability WHERE workspace_id=$1 ORDER BY weekday,start_min",
      [a.workspaceId],
    ),
    db.query(
      "SELECT id,starts_at,ends_at,reason FROM absences WHERE workspace_id=$1 ORDER BY starts_at",
      [a.workspaceId],
    ),
    a.role === "COACH"
      ? db.query(
          "SELECT id,action,created_at FROM audit WHERE workspace_id=$1 ORDER BY id DESC LIMIT 15",
          [a.workspaceId],
        )
      : Promise.resolve({ rows: [] }),
  ]);
  return JSON.parse(
    JSON.stringify({
      stripeEnabled: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ?? false,
      now: Date.now(),
      actor: a,
      services: services.rows,
      slots: slots.rows,
      bookings: bookings.rows,
      availability: availability.rows,
      absences: absences.rows,
      audit: audit.rows,
    }),
  ) as StudioData;
}
