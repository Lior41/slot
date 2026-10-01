import { acceptStripePayment, verifyStripeEvent } from "@/server/payments";
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 65536)
    return Response.json({ error: "Payload too large" }, { status: 413 });
  let event;
  try {
    event = verifyStripeEvent(await request.text(), request.headers.get("stripe-signature") ?? "");
  } catch {
    return Response.json({ error: "Invalid Stripe test signature." }, { status: 400 });
  }
  try {
    await acceptStripePayment(event);
    return Response.json({ received: true });
  } catch (e) {
    console.error("Stripe test fulfillment failed", e instanceof Error ? e.message : "Unknown");
    return Response.json(
      { error: "Payment could not be fulfilled. Stripe may retry." },
      { status: 500 },
    );
  }
}
