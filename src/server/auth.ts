import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { DomainError } from "./errors";
import type { Actor } from "@/lib/types";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export async function issueSession(workspaceId: string, personId: string) {
  const jar = await cookies(),
    old = jar.get("slot_session")?.value;
  if (old) await db.query("DELETE FROM auth_sessions WHERE token_hash=$1", [hash(old)]);
  const token = randomBytes(32).toString("base64url");
  await db.query(
    "INSERT INTO auth_sessions(token_hash,workspace_id,person_id,expires_at) VALUES($1,$2,$3,now()+interval '8 hours')",
    [hash(token), workspaceId, personId],
  );
  jar.set("slot_session", token, {
    httpOnly: true,
    secure: process.env.APP_ORIGIN?.startsWith("https://") ?? false,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 3600,
  });
}
export async function currentActor(): Promise<Actor | null> {
  const token = (await cookies()).get("slot_session")?.value;
  if (!token) return null;
  const { rows } = await db.query<Actor>(
    'SELECT p.id,p.name,p.role,w.id AS "workspaceId",w.demo,w.timezone FROM auth_sessions a JOIN people p ON p.id=a.person_id AND p.workspace_id=a.workspace_id JOIN workspaces w ON w.id=a.workspace_id WHERE a.token_hash=$1 AND a.expires_at>now() AND (w.expires_at IS NULL OR w.expires_at>now())',
    [hash(token)],
  );
  return rows[0] ?? null;
}
export async function requireActor() {
  const a = await currentActor();
  if (!a) throw new DomainError("Please open your demo or sign in again.", 401);
  return a;
}
export function requireCoach(a: Actor) {
  if (a.role !== "COACH")
    throw new DomainError("Only the coach can change the studio schedule.", 403);
}
export function checkOrigin(request: Request) {
  const expected = process.env.APP_ORIGIN ?? new URL(request.url).origin;
  if (request.headers.get("origin") !== expected)
    throw new DomainError("This request did not come from the application.", 403);
}
export async function rateLimit(key: string, limit = 30, seconds = 60) {
  const { rows } = await db.query(
    "INSERT INTO rate_limits(key,hits,reset_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.reset_at<now() THEN 1 ELSE rate_limits.hits+1 END,reset_at=CASE WHEN rate_limits.reset_at<now() THEN excluded.reset_at ELSE rate_limits.reset_at END RETURNING hits",
    [hash(key), seconds],
  );
  if (rows[0].hits > limit) throw new DomainError("Too many requests. Please wait a moment.", 429);
}
export async function signOut() {
  const jar = await cookies(),
    t = jar.get("slot_session")?.value;
  if (t) await db.query("DELETE FROM auth_sessions WHERE token_hash=$1", [hash(t)]);
  jar.delete("slot_session");
}
