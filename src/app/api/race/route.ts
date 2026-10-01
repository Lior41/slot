import { randomUUID } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import { localInstant } from "@/lib/time";
import { checkOrigin, requireActor, rateLimit } from "@/server/auth";
import { db, transaction } from "@/server/db";
import { lockWorkspace, reserve } from "@/server/bookings";
import { DomainError, friendlyError } from "@/server/errors";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const a = await requireActor();
    if (!a.demo || process.env.DEMO_MODE !== "true")
      throw new DomainError("This exercise is only available in demo workspaces.", 403);
    await rateLimit(`race:${a.workspaceId}`, 5, 3600);
    const id = await transaction(async (c) => {
      await lockWorkspace(c, a.workspaceId);
      const last = (
        await c.query(
          "SELECT * FROM slots WHERE workspace_id=$1 ORDER BY blocked_until DESC LIMIT 1",
          [a.workspaceId],
        )
      ).rows[0];
      const service = (
        await c.query("SELECT * FROM services WHERE workspace_id=$1 AND capacity=1 LIMIT 1", [
          a.workspaceId,
        ])
      ).rows[0];
      const slotId = randomUUID(),
        start = new Date(
          localInstant(
            `${Temporal.Instant.from(new Date(last.blocked_until).toISOString()).toZonedDateTimeISO(a.timezone).toPlainDate().add({ days: 1 })}T08:00`,
            a.timezone,
          ),
        );
      await c.query(
        "INSERT INTO slots(id,workspace_id,service_id,coach_id,starts_at,ends_at,blocked_until,capacity,price) VALUES($1,$2,$3,$4,$5,$6,$7,1,$8)",
        [
          slotId,
          a.workspaceId,
          service.id,
          last.coach_id,
          start,
          new Date(start.getTime() + service.duration * 60000),
          new Date(start.getTime() + (service.duration + service.buffer) * 60000),
          service.price,
        ],
      );
      return slotId;
    });
    const clients = (
      await db.query(
        "SELECT id,name FROM people WHERE workspace_id=$1 AND role='CLIENT' ORDER BY name LIMIT 2",
        [a.workspaceId],
      )
    ).rows;
    const results = await Promise.allSettled(
      clients.map((p) => reserve({ ...a, id: p.id, name: p.name, role: "CLIENT" }, id)),
    );
    return Response.json({
      slotId: id,
      results: results.map((r, i) => ({
        name: clients[i].name,
        success: r.status === "fulfilled",
        message:
          r.status === "fulfilled" ? "Place held for 10 minutes" : friendlyError(r.reason).error,
      })),
    });
  } catch (e) {
    const err = friendlyError(e);
    return Response.json({ error: err.error }, { status: err.status });
  }
}
