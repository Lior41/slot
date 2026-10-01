import { transaction, db } from "./db";
import { z } from "zod";
import { formatDay, formatTime } from "@/lib/time";

export function emailText(input: {
  name: string;
  service: string;
  start: string;
  timezone: string;
  kind: string;
}) {
  const subject =
    input.kind === "REMINDER"
      ? "Your training session is coming up"
      : input.kind === "CANCELLATION"
        ? "Your session was cancelled"
        : input.kind === "CHANGE"
          ? "Your session time has changed"
          : "Your session is confirmed";
  return {
    subject: `SLOT · ${subject}`,
    text: `Hi ${input.name},\n\n${subject}.\n${input.service}\n${formatDay(input.start, input.timezone)} at ${formatTime(input.start, input.timezone)} (${input.timezone}).\n\nOpen My sessions in SLOT to review your booking.\nThis studio currently accepts test payments only.`,
  };
}

/** Called by a protected scheduler. Demo addresses are never sent to a provider. */
export async function processEmails() {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return { configured: false, sent: 0 };
  await db.query(`INSERT INTO email_outbox(id,workspace_id,booking_id,slot_id,kind)
 SELECT b.id::text||':REMINDER:'||s.id::text,b.workspace_id,b.id,s.id,'REMINDER'
 FROM bookings b JOIN slots s ON s.id=b.slot_id JOIN workspaces w ON w.id=b.workspace_id
 WHERE NOT w.demo AND b.status='CONFIRMED' AND NOT s.cancelled AND s.starts_at>now() AND s.starts_at<=now()+interval '24 hours'
 ON CONFLICT DO NOTHING`);
  let sent = 0;
  for (let i = 0; i < 5; i++) {
    const result = await transaction(async (c) => {
      const item = (
        await c.query(
          "SELECT * FROM email_outbox WHERE status='PENDING' AND next_attempt_at<=now() ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED",
        )
      ).rows[0];
      if (!item) return "empty";
      const b = (
        await c.query(
          "SELECT b.status,b.slot_id,p.name,p.email,v.name AS service,s.starts_at,w.timezone,w.demo FROM bookings b JOIN people p ON p.id=b.person_id JOIN slots s ON s.id=b.slot_id JOIN services v ON v.id=s.service_id JOIN workspaces w ON w.id=b.workspace_id WHERE b.id=$1",
          [item.booking_id],
        )
      ).rows[0];
      const current =
        b &&
        !b.demo &&
        b.slot_id === item.slot_id &&
        (item.kind === "CANCELLATION"
          ? b.status === "CANCELLED"
          : b.status === "CONFIRMED" && new Date(b.starts_at).getTime() > Date.now());
      if (!current || !z.email().safeParse(b.email).success) {
        await c.query("UPDATE email_outbox SET status='SKIPPED' WHERE id=$1", [item.id]);
        return "skipped";
      }
      // Provider idempotency has a finite lifetime. Ambiguous deliveries older than
      // 23 hours are held for manual review instead of risking duplicate messages.
      if (
        item.attempts >= 5 ||
        (item.first_attempt_at && Date.now() - new Date(item.created_at).getTime() > 23 * 3600000)
      ) {
        await c.query("UPDATE email_outbox SET status='FAILED' WHERE id=$1", [item.id]);
        return "failed";
      }
      await c.query(
        "UPDATE email_outbox SET attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()) WHERE id=$1",
        [item.id],
      );
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `slot/${item.id}`,
          },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            from: process.env.EMAIL_FROM,
            to: [b.email],
            ...emailText({
              name: b.name,
              service: b.service,
              start: new Date(b.starts_at).toISOString(),
              timezone: b.timezone,
              kind: item.kind,
            }),
          }),
        });
        if (!response.ok) throw new Error("Delivery not accepted");
        await c.query("UPDATE email_outbox SET status='SENT',sent_at=now() WHERE id=$1", [item.id]);
        return "sent";
      } catch {
        await c.query(
          "UPDATE email_outbox SET next_attempt_at=now()+interval '5 minutes' WHERE id=$1",
          [item.id],
        );
        return "retry";
      }
    });
    if (result === "empty") break;
    if (result === "sent") sent++;
  }
  return { configured: true, sent };
}
