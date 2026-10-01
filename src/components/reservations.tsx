"use client";
import { useState } from "react";
import { TestCheckout } from "./test-checkout";
import Link from "next/link";
import type { StudioData } from "@/lib/types";
import { formatDay, formatTime, money } from "@/lib/time";
import type { Execute } from "./studio-shell";
export function Reservations({
  data,
  execute,
  busy,
}: {
  data: StudioData;
  execute: Execute;
  busy: boolean;
}) {
  const [moving, setMoving] = useState(""),
    [target, setTarget] = useState(""),
    [cancel, setCancel] = useState("");
  return (
    <section className="reservation-list">
      <div className="filter-row">
        <h2>{data.actor.role === "COACH" ? "Client reservations" : "Your reservations"}</h2>
        <Link href="/book" className="text-link">
          Find another session ↗
        </Link>
      </div>
      {!data.bookings.length && (
        <div className="empty">
          <h3>Your next chapter is still open.</h3>
          <p>Choose a session and your reservation will appear here.</p>
          <Link className="button dark" href="/book">
            Explore sessions
          </Link>
        </div>
      )}
      {data.bookings.map((b) => (
        <article className="reservation" key={b.id}>
          <div>
            <span className={`badge ${b.status.toLowerCase()}`}>
              {b.status.replaceAll("_", " ")}
            </span>
            <h3>{b.name}</h3>
            <p>
              {formatDay(b.starts_at, data.actor.timezone)} ·{" "}
              {formatTime(b.starts_at, data.actor.timezone)} · {money(b.price)}
            </p>
            {data.actor.role === "COACH" && <p>Client: {b.client}</p>}
            <small>
              Payment: {b.payment.replaceAll("_", " ")}
              {b.status === "HOLD" && b.expires_at
                ? ` · Hold until ${formatTime(b.expires_at, data.actor.timezone)}`
                : ""}
            </small>
          </div>
          <div className="reservation-actions">
            {b.status === "HOLD" && data.actor.demo && data.actor.role === "CLIENT" && (
              <button
                disabled={busy}
                className="button dark"
                onClick={() => execute({ action: "confirm", id: b.id })}
              >
                Confirm demo payment
              </button>
            )}
            {b.status === "HOLD" && data.stripeEnabled && data.actor.role === "CLIENT" && (
              <TestCheckout id={b.id} />
            )}{" "}
            {b.payment === "REFUND_REQUIRED" && data.actor.role === "COACH" && (
              <button disabled={busy} onClick={() => execute({ action: "refund", id: b.id })}>
                Refund test payment
              </button>
            )}
            {b.status === "CONFIRMED" && Date.parse(b.starts_at) > data.now && (
              <button
                disabled={busy}
                onClick={() => {
                  setMoving(moving === b.id ? "" : b.id);
                  setTarget("");
                }}
              >
                Reschedule
              </button>
            )}
            {["HOLD", "CONFIRMED"].includes(b.status) && (
              <button disabled={busy} className="danger-link" onClick={() => setCancel(b.id)}>
                Cancel reservation
              </button>
            )}
            {data.actor.role === "COACH" &&
              ["CONFIRMED", "ATTENDED", "NO_SHOW"].includes(b.status) &&
              new Date(b.starts_at).getTime() < data.now && (
                <>
                  <button
                    disabled={busy}
                    onClick={() => execute({ action: "attendance", id: b.id, present: true })}
                  >
                    Mark attended
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => execute({ action: "attendance", id: b.id, present: false })}
                  >
                    Mark absent
                  </button>
                </>
              )}
          </div>
          {cancel === b.id && (
            <div className="inline-form notice">
              <p>Release this place? You can make a new reservation afterwards.</p>
              <button
                disabled={busy}
                className="button dark"
                onClick={async () => {
                  if (await execute({ action: "cancel", id: b.id })) setCancel("");
                }}
              >
                Yes, cancel
              </button>
              <button onClick={() => setCancel("")}>Keep reservation</button>
            </div>
          )}
          {moving === b.id && (
            <div className="inline-form">
              <label htmlFor={`move-${b.id}`}>Choose another time for the same service</label>
              <select
                id={`move-${b.id}`}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Select a session</option>
                {data.slots
                  .filter(
                    (s) =>
                      s.id !== b.slot_id &&
                      s.name === b.name &&
                      s.price === b.price &&
                      !s.cancelled &&
                      s.remaining > 0 &&
                      Date.parse(s.starts_at) > data.now,
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatDay(s.starts_at, data.actor.timezone)}{" "}
                      {formatTime(s.starts_at, data.actor.timezone)}
                    </option>
                  ))}
              </select>
              <button
                disabled={busy || !target}
                className="button dark"
                onClick={async () => {
                  if (await execute({ action: "move", id: b.id, slotId: target })) setMoving("");
                }}
              >
                Confirm new time
              </button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
