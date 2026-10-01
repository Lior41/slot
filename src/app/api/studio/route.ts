import { requireActor } from "@/server/auth";
import { studioData } from "@/server/queries";
import { friendlyError } from "@/server/errors";
export async function GET() {
  try {
    return Response.json(await studioData(await requireActor()), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    const err = friendlyError(e);
    return Response.json({ error: err.error }, { status: err.status });
  }
}
