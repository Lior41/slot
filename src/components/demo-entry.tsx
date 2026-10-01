"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ShieldCheck, CalendarDays, Users } from "lucide-react";
export function DemoEntry() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  async function enter(role: "CLIENT" | "COACH") {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      router.push(role === "COACH" ? "/coach" : "/book");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the demo.");
      setBusy(false);
    }
  }
  return (
    <section className="wrap demo-page">
      <p className="eyebrow">YOUR PRIVATE STUDIO PLAYGROUND</p>
      <h1>
        A little time.
        <br />
        The whole experience.
      </h1>
      <p className="lead">
        Try both sides of a booking. Your demo is isolated from other visitors and expires after 24
        hours.
      </p>
      <div className="demo-choices">
        <button disabled={busy} onClick={() => enter("CLIENT")}>
          <CalendarDays size={30} />
          <h2>I’m here to train</h2>
          <p>Choose a session, reserve a place and try the simulated checkout.</p>
          <strong>
            {busy ? "Opening your studio…" : "Explore as a client"} <ArrowUpRight />
          </strong>
        </button>
        <button disabled={busy} onClick={() => enter("COACH")}>
          <Users size={30} />
          <h2>I’m the coach</h2>
          <p>Manage the timetable, edit services and check every reservation.</p>
          <strong>
            {busy ? "Opening your studio…" : "Explore as a coach"} <ArrowUpRight />
          </strong>
        </button>
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <p className="muted inline">
        <ShieldCheck size={18} /> Fictional people. No real charges. Real database safeguards.
      </p>
    </section>
  );
}
