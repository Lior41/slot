import { z } from "zod";
import { db } from "@/server/db";
import { createDemoWorkspace } from "@/server/demo";
import { checkOrigin, currentActor, issueSession, rateLimit } from "@/server/auth";
import { DomainError, friendlyError } from "@/server/errors";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (process.env.DEMO_MODE !== "true") throw new DomainError("Demo mode is not enabled.", 403);
    await rateLimit(`demo:${request.headers.get("x-forwarded-for") ?? "local"}`, 20, 3600);
    const data = z
      .object({ role: z.enum(["COACH", "CLIENT"]).optional(), reset: z.boolean().optional() })
      .parse(await request.json());
    const actor = await currentActor();
    let identity: { workspaceId: string; personId: string };
    if (actor?.demo && !data.reset) {
      const person = (
        await db.query(
          "SELECT id FROM people WHERE workspace_id=$1 AND role=$2 ORDER BY name LIMIT 1",
          [actor.workspaceId, data.role ?? "CLIENT"],
        )
      ).rows[0];
      identity = { workspaceId: actor.workspaceId, personId: person.id };
    } else {
      identity = await createDemoWorkspace();
      if (data.role === "COACH") {
        const p = (
          await db.query("SELECT id FROM people WHERE workspace_id=$1 AND role='COACH'", [
            identity.workspaceId,
          ])
        ).rows[0];
        identity.personId = p.id;
      }
    }
    await issueSession(identity.workspaceId, identity.personId);
    return Response.json({ ok: true });
  } catch (e) {
    const err =
      e instanceof z.ZodError
        ? { error: "Choose a valid demo role.", status: 400 }
        : friendlyError(e);
    return Response.json({ error: err.error }, { status: err.status });
  }
}
