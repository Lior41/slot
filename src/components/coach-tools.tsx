"use client";
import { useState } from "react";
import type { StudioData, Service } from "@/lib/types";
import { formatDay, formatTime, money } from "@/lib/time";
import type { Execute } from "./studio-shell";
import { Reservations } from "./reservations";
export function CoachTools({
  data,
  execute,
  busy,
}: {
  data: StudioData;
  execute: Execute;
  busy: boolean;
}) {
  const [day, setDay] = useState("all"),
    [tab, setTab] = useState("schedule"),
    [edit, setEdit] = useState<Service | null>(null);
  const next = data.slots.filter((s) => !s.cancelled && Date.parse(s.starts_at) > data.now);
  const mins = (v: string) => {
    const [h, m] = v.split(":").map(Number);
    return h * 60 + m;
  };
  return (
    <>
      <div className="metrics">
        <div>
          <span>Upcoming sessions</span>
          <strong>{next.length}</strong>
        </div>
        <div>
          <span>Confirmed reservations</span>
          <strong>{data.bookings.filter((b) => b.status === "CONFIRMED").length}</strong>
        </div>
        <div>
          <span>Active services</span>
          <strong>{data.services.filter((s) => s.active).length}</strong>
        </div>
        <div>
          <span>Working windows</span>
          <strong>{data.availability.length}</strong>
          <small>Manage hours in Availability</small>
        </div>
      </div>
      <div className="tabs local-tabs" aria-label="Coach sections">
        {["schedule", "reservations", "services", "availability", "activity"].map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === "schedule" && (
        <div className="coach-grid">
          <section className="panel">
            <h2>Your timetable</h2>
            <label>
              View day
              <select value={day} onChange={(e) => setDay(e.target.value)}>
                <option value="all">All upcoming days</option>
                {[...new Set(next.map((s) => formatDay(s.starts_at, data.actor.timezone)))].map(
                  (d) => (
                    <option value={d} key={d}>
                      {d}
                    </option>
                  ),
                )}
              </select>
            </label>
            {next
              .filter((s) => day === "all" || formatDay(s.starts_at, data.actor.timezone) === day)
              .map((s) => (
                <article className="compact-session" key={s.id}>
                  <div>
                    <small>
                      {formatDay(s.starts_at, data.actor.timezone)} ·{" "}
                      {formatTime(s.starts_at, data.actor.timezone)}
                    </small>
                    <h3>{s.name}</h3>
                    <span>
                      {s.capacity - s.remaining}/{s.capacity} reserved · {money(s.price)}
                    </span>
                  </div>
                  <button
                    className="danger-link"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm("Cancel this session and its reservations?"))
                        void execute({ action: "cancelSlot", id: s.id });
                    }}
                  >
                    Cancel session
                  </button>
                </article>
              ))}
          </section>
          <form
            className="panel form-panel"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await execute({ action: "slot", serviceId: f.get("service"), local: f.get("local") });
            }}
          >
            <p className="eyebrow">MAKE ROOM</p>
            <h2>Publish a session</h2>
            <label>
              Service
              <select name="service" required>
                {data.services
                  .filter((s) => s.active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Date & time · {data.actor.timezone}
              <input type="datetime-local" name="local" required />
            </label>
            <p className="muted">
              The full session and its buffer must fit inside a working window. Overlapping sessions
              are rejected.
            </p>
            <button className="button primary" disabled={busy}>
              Publish session ↗
            </button>
          </form>
        </div>
      )}
      {tab === "reservations" && <Reservations data={data} execute={execute} busy={busy} />}
      {tab === "services" && (
        <div className="coach-grid">
          <section className="panel">
            <h2>Your services</h2>
            {data.services.map((s) => (
              <article className="compact-session" key={s.id}>
                <div>
                  <h3>{s.name}</h3>
                  <p>
                    {s.duration} min + {s.buffer} min buffer · {s.capacity} places
                  </p>
                  <small>
                    {money(s.price)} · {s.active ? "Active" : "Hidden from new scheduling"}
                  </small>
                </div>
                <button onClick={() => setEdit(s)}>Edit</button>
              </article>
            ))}
            <button className="text-link" onClick={() => setEdit(null)}>
              + Create a service
            </button>
          </section>
          <form
            key={edit?.id ?? "new"}
            className="panel form-panel"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await execute({
                  action: "service",
                  service: {
                    ...(edit ? { id: edit.id } : {}),
                    name: f.get("name"),
                    description: f.get("description"),
                    duration: Number(f.get("duration")),
                    buffer: Number(f.get("buffer")),
                    capacity: Number(f.get("capacity")),
                    price: Math.round(Number(f.get("price")) * 100),
                    active: f.get("active") === "on",
                  },
                })
              )
                setEdit(null);
            }}
          >
            <h2>{edit ? "Edit service" : "New service"}</h2>
            <label>
              Name
              <input name="name" required minLength={3} maxLength={80} defaultValue={edit?.name} />
            </label>
            <label>
              Description
              <textarea name="description" maxLength={240} defaultValue={edit?.description} />
            </label>
            <div className="form-row">
              <label>
                Minutes
                <input
                  name="duration"
                  type="number"
                  min={15}
                  max={120}
                  required
                  defaultValue={edit?.duration ?? 45}
                />
              </label>
              <label>
                Buffer minutes
                <input
                  name="buffer"
                  type="number"
                  min={0}
                  max={60}
                  required
                  defaultValue={edit?.buffer ?? 15}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Capacity
                <input
                  name="capacity"
                  type="number"
                  min={1}
                  max={20}
                  required
                  defaultValue={edit?.capacity ?? 1}
                />
              </label>
              <label>
                Price · ILS
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min={0}
                  max={1000}
                  required
                  defaultValue={edit ? edit.price / 100 : 100}
                />
              </label>
            </div>
            <label className="checkbox">
              <input type="checkbox" name="active" defaultChecked={edit?.active ?? true} />{" "}
              Available for new sessions
            </label>
            <small>Existing sessions keep their price, duration and capacity.</small>
            <button className="button primary" disabled={busy}>
              Save service
            </button>
          </form>
        </div>
      )}
      {tab === "availability" && (
        <div className="coach-grid">
          <section className="panel">
            <h2>Working windows</h2>
            <p className="muted">
              Gaps between windows are breaks. Times use {data.actor.timezone}.
            </p>
            {data.availability.map((w) => (
              <div className="window-row" key={w.id}>
                <strong>
                  {
                    [
                      "",
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                      "Sunday",
                    ][w.weekday]
                  }
                </strong>
                <span>
                  {String(Math.floor(w.start_min / 60)).padStart(2, "0")}:
                  {String(w.start_min % 60).padStart(2, "0")} –{" "}
                  {String(Math.floor(w.end_min / 60)).padStart(2, "0")}:
                  {String(w.end_min % 60).padStart(2, "0")}
                </span>
              </div>
            ))}
            <h3>Absences</h3>
            {data.absences.length ? (
              data.absences.map((a) => (
                <p key={a.id}>
                  {a.reason} · {formatDay(a.starts_at)} {formatTime(a.starts_at)} —{" "}
                  {formatDay(a.ends_at)} {formatTime(a.ends_at)}
                </p>
              ))
            ) : (
              <p className="muted">No absences scheduled.</p>
            )}
          </section>
          <div>
            <form
              className="panel form-panel"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                await execute({
                  action: "availability",
                  weekday: Number(f.get("weekday")),
                  start: mins(String(f.get("start"))),
                  end: mins(String(f.get("end"))),
                });
              }}
            >
              <h2>Set a working day</h2>
              <p className="muted">
                Replaces this day’s windows with one continuous window. Conflicting sessions must be
                cancelled first.
              </p>
              <label>
                Day
                <select name="weekday">
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((d, i) => (
                    <option value={i + 1} key={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-row">
                <label>
                  From
                  <input name="start" type="time" required defaultValue="07:00" />
                </label>
                <label>
                  Until
                  <input name="end" type="time" required defaultValue="20:00" />
                </label>
              </div>
              <button disabled={busy} className="button dark">
                Update working day
              </button>
            </form>
            <form
              className="panel form-panel"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                await execute({
                  action: "absence",
                  start: f.get("start"),
                  end: f.get("end"),
                  reason: f.get("reason"),
                });
              }}
            >
              <h2>Add a break or absence</h2>
              <label>
                From
                <input name="start" type="datetime-local" required />
              </label>
              <label>
                Until
                <input name="end" type="datetime-local" required />
              </label>
              <label>
                Reason
                <input
                  name="reason"
                  minLength={2}
                  maxLength={100}
                  required
                  placeholder="Personal time"
                />
              </label>
              <button disabled={busy} className="button dark">
                Save absence
              </button>
            </form>
          </div>
        </div>
      )}
      {tab === "activity" && (
        <section className="panel">
          <h2>Studio activity</h2>
          {data.audit.length ? (
            data.audit.map((a) => (
              <div className="window-row" key={a.id}>
                <span>{a.action}</span>
                <small>
                  {formatDay(a.created_at)} · {formatTime(a.created_at)}
                </small>
              </div>
            ))
          ) : (
            <p className="empty">Your studio actions will appear here.</p>
          )}
        </section>
      )}
    </>
  );
}
