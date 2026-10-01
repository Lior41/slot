import "dotenv/config";
import { z } from "zod";
import { hash } from "@node-rs/argon2";
import { createDemoWorkspace } from "../src/server/demo";
import { transaction, db } from "../src/server/db";
const env = z
  .object({
    STUDIO_NAME: z.string().min(3),
    COACH_NAME: z.string().min(2),
    COACH_EMAIL: z.email(),
    COACH_PASSWORD: z.string().min(12),
    CLIENT_NAME: z.string().min(2),
    CLIENT_EMAIL: z.email(),
    CLIENT_PASSWORD: z.string().min(12),
  })
  .safeParse(process.env);
if (!env.success) {
  console.error(
    "Set STUDIO_NAME, COACH_NAME, COACH_EMAIL, COACH_PASSWORD, CLIENT_NAME, CLIENT_EMAIL and CLIENT_PASSWORD. Passwords need at least 12 characters.",
  );
  process.exit(1);
}
const v = env.data,
  w = await createDemoWorkspace();
try {
  await transaction(async (c) => {
    await c.query("UPDATE workspaces SET name=$1,demo=false,expires_at=NULL WHERE id=$2", [
      v.STUDIO_NAME,
      w.workspaceId,
    ]);
    await c.query(
      "UPDATE people SET name=$1,email=$2,password_hash=$3 WHERE workspace_id=$4 AND role='COACH'",
      [v.COACH_NAME, v.COACH_EMAIL.toLowerCase(), await hash(v.COACH_PASSWORD), w.workspaceId],
    );
    await c.query("UPDATE people SET name=$1,email=$2,password_hash=$3 WHERE id=$4", [
      v.CLIENT_NAME,
      v.CLIENT_EMAIL.toLowerCase(),
      await hash(v.CLIENT_PASSWORD),
      w.personId,
    ]);
    await c.query("DELETE FROM people WHERE workspace_id=$1 AND role='CLIENT' AND id<>$2", [
      w.workspaceId,
      w.personId,
    ]);
  });
  console.log(
    `Studio ID: ${w.workspaceId}. Use /login. No email was sent. Edit the public fictional coach copy before a real pilot.`,
  );
} finally {
  await db.end();
}
