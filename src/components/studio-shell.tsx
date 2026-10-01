"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { StudioData } from "@/lib/types";
import { BookingCalendar } from "./booking-calendar";
import { Reservations } from "./reservations";
import { CoachTools } from "./coach-tools";
import { RaceDemo } from "./race-demo";
import { ArrowUpRight, RefreshCw, CalendarDays, LogOut } from "lucide-react";
export type Execute = (body: Record<string, unknown>) => Promise<{ id?: string } | null>;
export function StudioShell({
  initial,
  view,
}: {
  initial: StudioData;
  view: "book" | "sessions" | "coach";
}) {
  const [data, setData] = useState(initial),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false);
  const router = useRouter();
  const refresh = useCallback(async () => {
    const r = await fetch("/api/studio", { cache: "no-store" });
    if (!r.ok) throw new Error("Your session may have expired. Reopen the demo.");
    setData(await r.json());
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setInterval(async () => {
      try {
        const r = await fetch("/api/studio", { signal: controller.signal });
        if (r.ok) setData(await r.json());
      } catch {
        /* Explicit actions surface network errors; background refresh is best effort. */
      }
    }, 15000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, []);
  const execute: Execute = async (body) => {
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const r = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      if (body.action === "logout") {
        router.push("/");
        router.refresh();
        return result;
      }
      await refresh();
      setMessage("Saved. Your studio is up to date.");
      return result;
    } catch (e) {
      setFailed(true);
      setMessage(e instanceof Error ? e.message : "Connection lost. Please try again.");
      return null;
    } finally {
      setBusy(false);
    }
  };
  async function switchRole(reset = false) {
    setBusy(true);
    try {
      const role = data.actor.role === "CLIENT" ? "COACH" : "CLIENT";
      const r = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, reset }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      router.push(reset ? "/book" : role === "COACH" ? "/coach" : "/book");
      router.refresh();
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not switch roles.");
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  const coach = data.actor.role === "COACH";
  return (
    <div className="studio wrap">
      <div className="demo-banner">
        <span>
          <span className="dot" /> {data.actor.demo ? "ISOLATED DEMO" : "STUDIO"} ·{" "}
          {data.actor.name} · {coach ? "Coach" : "Client"}
        </span>
        <div>
          {data.actor.demo && (
            <>
              <button disabled={busy} onClick={() => switchRole()}>
                Switch to {coach ? "client" : "coach"} <ArrowUpRight size={14} />
              </button>
              <button
                disabled={busy}
                onClick={() => switchRole(true)}
                aria-label="Start a new private demo"
              >
                <RefreshCw size={15} /> New demo
              </button>
            </>
          )}
          <button
            disabled={busy}
            onClick={() => execute({ action: "logout" })}
            aria-label="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
      <div className="studio-heading">
        <div>
          <p className="eyebrow">FORMA TRAINING CLUB</p>
          <h1>
            {view === "coach"
              ? "Your studio, in motion."
              : view === "sessions"
                ? "Your next steps."
                : "A little time for you."}
          </h1>
          <p>
            {view === "coach"
              ? "Manage the details. Make room for the people."
              : "Find a session that fits your rhythm."}
          </p>
        </div>
        <div className="timezone">
          <CalendarDays size={18} />
          <div>
            Studio timezone<strong>{data.actor.timezone}</strong>
          </div>
        </div>
      </div>
      <nav className="tabs" aria-label="Studio">
        <Link className={view === "book" ? "active" : ""} href="/book">
          Book a session
        </Link>
        <Link className={view === "sessions" ? "active" : ""} href="/my-sessions">
          My sessions
        </Link>
        {coach && (
          <Link className={view === "coach" ? "active" : ""} href="/coach">
            Coach workspace
          </Link>
        )}
      </nav>
      {message && (
        <p
          className={failed ? "error-message" : "success-message"}
          role={failed ? "alert" : "status"}
        >
          {message}
        </p>
      )}
      {view === "book" && <BookingCalendar data={data} execute={execute} busy={busy} />}
      {view === "sessions" && <Reservations data={data} execute={execute} busy={busy} />}
      {view === "coach" && coach && <CoachTools data={data} execute={execute} busy={busy} />}
      {data.actor.demo && <RaceDemo refresh={refresh} />}
      <p className="muted studio-note">
        Email delivery is not configured in this demo. Booking confirmations are stored in My
        sessions. Payments marked “Demo” are simulated.
      </p>
    </div>
  );
}
