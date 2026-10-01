"use client";
import { useState } from "react";
import { TestCheckout } from "./test-checkout";
import { ArrowRight, Clock3, Users, CheckCircle2 } from "lucide-react";
import type { StudioData, Slot } from "@/lib/types";
import { formatDay, formatTime, money } from "@/lib/time";
import type { Execute } from "./studio-shell";
export function BookingCalendar({
  data,
  execute,
  busy,
}: {
  data: StudioData;
  execute: Execute;
  busy: boolean;
}) {
  const [service, setService] = useState("all"),
    [day, setDay] = useState(""),
    [selected, setSelected] = useState<Slot | null>(null),
    [held, setHeld] = useState<string | null>(null),
    [confirmed, setConfirmed] = useState(false);
  const available = data.slots.filter((s) => !s.cancelled && Date.parse(s.starts_at) > data.now),
    days = [...new Set(available.map((s) => formatDay(s.starts_at, data.actor.timezone)))],
    chosen = day || days[0];
  const slots = available.filter(
    (s) =>
      formatDay(s.starts_at, data.actor.timezone) === chosen &&
      (service === "all" || s.service_id === service),
  );
  async function reserve() {
    if (!selected) return;
    const r = await execute({ action: "reserve", slotId: selected.id });
    if (r?.id) setHeld(r.id);
  }
  async function confirm() {
    if (!held) return;
    const r = await execute({ action: "confirm", id: held });
    if (r) setConfirmed(true);
  }
  return (
    <div className="booking-layout">
      <section>
        <div className="filter-row">
          <h2>Find your session</h2>
          <label className="sr-only" htmlFor="service-filter">
            Filter by service
          </label>
          <select id="service-filter" value={service} onChange={(e) => setService(e.target.value)}>
            <option value="all">All sessions</option>
            {data.services
              .filter((s) => s.active)
              .map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
        <div className="day-picker" aria-label="Choose a day">
          {days.map((d) => (
            <button key={d} aria-pressed={chosen === d} onClick={() => setDay(d)}>
              {d.split(" ")[0]}
              <strong>{d.split(" ")[1]}</strong>
              <small>{d.split(" ")[2]}</small>
            </button>
          ))}
        </div>
        <div className="slot-list">
          {slots.length === 0 ? (
            <div className="empty">No sessions here yet. Try another day or service.</div>
          ) : (
            slots.map((s) => (
              <button
                className={`slot-card ${selected?.id === s.id ? "selected" : ""}`}
                key={s.id}
                onClick={() => {
                  setSelected(s);
                  setHeld(null);
                  setConfirmed(false);
                }}
                disabled={s.remaining === 0 || busy || (!!held && !confirmed)}
                aria-pressed={selected?.id === s.id}
              >
                <div className="slot-time">
                  <strong>{formatTime(s.starts_at, data.actor.timezone)}</strong>
                  <small>{formatTime(s.ends_at, data.actor.timezone)}</small>
                </div>
                <div className="slot-info">
                  <span className="session-type">
                    {s.capacity === 1 ? "ONE TO ONE" : "SMALL GROUP"}
                  </span>
                  <h3>{s.name}</h3>
                  <span>{s.coach} · Forma Studio</span>
                </div>
                <div className="slot-price">
                  <strong>{money(s.price)}</strong>
                  <small className={s.remaining === 1 ? "last-place" : ""}>
                    {s.remaining === 0
                      ? "Fully booked"
                      : `${s.remaining} ${s.remaining === 1 ? "place" : "places"} left`}
                  </small>
                </div>
                <ArrowRight size={18} />
              </button>
            ))
          )}
        </div>
      </section>
      <aside className="booking-summary">
        <p className="eyebrow">YOUR NEXT CHAPTER</p>
        {confirmed ? (
          <>
            <CheckCircle2 className="orange" size={40} />
            <h2>You’re on the list.</h2>
            <p>Your demo booking is confirmed. No money was charged.</p>
            <a className="button primary" href="/my-sessions">
              View my sessions <ArrowRight size={18} />
            </a>
            <button
              className="text-link"
              onClick={() => {
                setSelected(null);
                setHeld(null);
                setConfirmed(false);
              }}
            >
              Choose another session
            </button>
          </>
        ) : selected ? (
          <>
            <h2>{selected.name}</h2>
            <p>{selected.description}</p>
            <div className="summary-lines">
              <span>
                {formatDay(selected.starts_at, data.actor.timezone)}
                <strong>{formatTime(selected.starts_at, data.actor.timezone)}</strong>
              </span>
              <span>
                <Clock3 size={16} />{" "}
                {Math.round(
                  (Date.parse(selected.ends_at) - Date.parse(selected.starts_at)) / 60000,
                )}{" "}
                minutes
              </span>
              <span>
                <Users size={16} />{" "}
                {selected.capacity === 1
                  ? "Personal coaching"
                  : `Up to ${selected.capacity} people`}
              </span>
              <span>
                Total<strong>{money(selected.price)}</strong>
              </span>
            </div>
            {held ? (
              <>
                <div className="notice">
                  Your place is held for 10 minutes. Use the available test checkout below. No real
                  payment is accepted.
                </div>
                {data.actor.demo && (
                  <button className="button primary" disabled={busy} onClick={confirm}>
                    {busy ? "Confirming…" : "Confirm demo payment"} <ArrowRight size={18} />
                  </button>
                )}
                {data.stripeEnabled && <TestCheckout id={held} />}
                {!data.actor.demo && !data.stripeEnabled && (
                  <p>Stripe test checkout is not configured. Please contact your coach.</p>
                )}
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={async () => {
                    if (await execute({ action: "cancel", id: held })) setHeld(null);
                  }}
                >
                  Release this place
                </button>
              </>
            ) : (
              <button
                className="button primary"
                disabled={busy || data.actor.role !== "CLIENT"}
                onClick={reserve}
              >
                {busy
                  ? "Reserving…"
                  : data.actor.role === "CLIENT"
                    ? "Reserve my place"
                    : "Switch to client to book"}
                <ArrowRight size={18} />
              </button>
            )}
            <small>Times shown in {data.actor.timezone}. Cancel before the session starts.</small>
          </>
        ) : (
          <>
            <div className="summary-art" aria-hidden="true">
              <span>↗</span>
            </div>
            <h2>
              Make room
              <br />
              for progress.
            </h2>
            <p>Select a session to see the details and reserve your place.</p>
            <div className="summary-lines">
              <span>
                <CheckCircle2 size={16} /> Flexible demo cancellation
              </span>
              <span>
                <CheckCircle2 size={16} /> Your place, safely reserved
              </span>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
