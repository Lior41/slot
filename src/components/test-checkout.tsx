"use client";
import { useState } from "react";

export function TestCheckout({ id }: { id: string }) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function pay() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const url = new URL(data.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
        throw new Error("Unexpected checkout address. Please try again.");
      window.location.assign(url.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout is unavailable.");
      setPending(false);
    }
  }
  return (
    <div>
      <button className="button dark" disabled={pending} onClick={pay}>
        {pending ? "Opening Stripe…" : "Open Stripe test checkout"}
      </button>
      <small>Test card only. No real money.</small>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
    </div>
  );
}
