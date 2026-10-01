import { z } from "zod";
import { verify } from "@node-rs/argon2";
import { db } from "@/server/db";
import { checkOrigin, issueSession, rateLimit } from "@/server/auth";
import { DomainError, friendlyError } from "@/server/errors";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await rateLimit(`login:${request.headers.get("x-forwarded-for") ?? "local"}`, 10, 900);
    const v = z
      .object({
        email: z.email().max(254),
        password: z.string().min(1).max(256),
        workspace: z.uuid(),
      })
      .parse(await request.json());
    const p = (
      await db.query(
        "SELECT p.id,p.password_hash FROM people p JOIN workspaces w ON w.id=p.workspace_id WHERE p.email=$1 AND p.workspace_id=$2 AND NOT w.demo",
        [v.email.toLowerCase(), v.workspace],
      )
    ).rows[0];
    if (!p?.password_hash || !(await verify(p.password_hash, v.password)))
      throw new DomainError("The email, password or studio ID is incorrect.", 401);
    await issueSession(v.workspace, p.id);
    return Response.json({ ok: true });
  } catch (e) {
    const err =
      e instanceof z.ZodError
        ? { error: "Enter a valid email, password and studio ID.", status: 400 }
        : friendlyError(e);
    return Response.json({ error: err.error }, { status: err.status });
  }
}
