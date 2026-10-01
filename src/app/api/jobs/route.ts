import { createHash, timingSafeEqual } from "node:crypto";
import { processEmails } from "@/server/email";
import { db } from "@/server/db";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    !timingSafeEqual(
      createHash("sha256")
        .update(request.headers.get("authorization") ?? "")
        .digest(),
      createHash("sha256").update(`Bearer ${secret}`).digest(),
    )
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const email = await processEmails();
    await db.query("DELETE FROM workspaces WHERE demo AND expires_at<now()-interval '1 day'");
    await db.query("DELETE FROM auth_sessions WHERE expires_at<now()");
    await db.query("DELETE FROM rate_limits WHERE reset_at<now()");
    return Response.json({ ok: true, email });
  } catch {
    return Response.json(
      { error: "Maintenance failed. Inspect deployment logs." },
      { status: 500 },
    );
  }
}
