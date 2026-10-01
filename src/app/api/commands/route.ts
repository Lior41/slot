import { z } from "zod";
import { checkOrigin, requireActor, rateLimit, signOut } from "@/server/auth";
import { reserve, confirmDemo, cancelBooking, reschedule, attendance } from "@/server/bookings";
import {
  saveService,
  serviceSchema,
  createSlot,
  cancelSlot,
  setAvailability,
  addAbsence,
} from "@/server/schedule";
import { refund } from "@/server/payments";
import { friendlyError } from "@/server/errors";
const command = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reserve"), slotId: z.uuid() }),
  z.object({ action: z.literal("confirm"), id: z.uuid() }),
  z.object({ action: z.literal("cancel"), id: z.uuid() }),
  z.object({ action: z.literal("move"), id: z.uuid(), slotId: z.uuid() }),
  z.object({ action: z.literal("attendance"), id: z.uuid(), present: z.boolean() }),
  z.object({ action: z.literal("service"), service: serviceSchema }),
  z.object({ action: z.literal("slot"), serviceId: z.uuid(), local: z.string().max(40) }),
  z.object({ action: z.literal("cancelSlot"), id: z.uuid() }),
  z.object({
    action: z.literal("availability"),
    weekday: z.number().int().min(1).max(7),
    start: z.number().int().min(0).max(1439),
    end: z.number().int().min(1).max(1440),
  }),
  z.object({
    action: z.literal("absence"),
    start: z.string().max(40),
    end: z.string().max(40),
    reason: z.string().trim().min(2).max(100),
  }),
  z.object({ action: z.literal("refund"), id: z.uuid() }),
  z.object({ action: z.literal("logout") }),
]);
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const a = await requireActor();
    await rateLimit(a.id, 60);
    const input = command.parse(await request.json());
    let result: unknown = { ok: true };
    switch (input.action) {
      case "reserve":
        result = { id: await reserve(a, input.slotId) };
        break;
      case "confirm":
        await confirmDemo(a, input.id);
        break;
      case "cancel":
        await cancelBooking(a, input.id);
        break;
      case "move":
        await reschedule(a, input.id, input.slotId);
        break;
      case "attendance":
        await attendance(a, input.id, input.present);
        break;
      case "service":
        await saveService(a, input.service);
        break;
      case "slot":
        await createSlot(a, input.serviceId, input.local);
        break;
      case "cancelSlot":
        await cancelSlot(a, input.id);
        break;
      case "availability":
        await setAvailability(a, input.weekday, input.start, input.end);
        break;
      case "absence":
        await addAbsence(a, input.start, input.end, input.reason);
        break;
      case "refund":
        await refund(a, input.id);
        break;
      case "logout":
        await signOut();
        break;
    }
    return Response.json(result);
  } catch (e) {
    const err =
      e instanceof z.ZodError
        ? { error: "Please check the form values.", status: 400 }
        : friendlyError(e);
    if (err.status === 500)
      console.error("SLOT command failed", e instanceof Error ? e.message : "Unknown error");
    return Response.json({ error: err.error }, { status: err.status });
  }
}
