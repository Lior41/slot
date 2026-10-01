import { z } from "zod";
import { checkOrigin, requireActor, rateLimit } from "@/server/auth";
import { checkout } from "@/server/payments";
import { friendlyError } from "@/server/errors";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const a = await requireActor();
    await rateLimit(`checkout:${a.id}`, 10);
    const { id } = z.object({ id: z.uuid() }).parse(await request.json());
    return Response.json({ url: await checkout(a, id) });
  } catch (e) {
    const err =
      e instanceof z.ZodError ? { error: "Invalid reservation.", status: 400 } : friendlyError(e);
    return Response.json({ error: err.error }, { status: err.status });
  }
}
