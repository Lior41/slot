"use client";
import { useState } from "react";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
export function RaceDemo({ refresh }: { refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [results, setResults] = useState<{ name: string; success: boolean; message: string }[]>([]);
  async function run() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/race", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const v = await r.json();
      if (!r.ok) throw new Error(v.error);
      setResults(v.results);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not run the exercise.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="race-demo">
      <div>
        <p className="eyebrow">
          <ShieldCheck size={15} /> UNDER THE SURFACE
        </p>
        <h2>Two clients. One last place.</h2>
        <p>
          Send two simultaneous requests through the real booking service.
          <br />A fresh demonstration session is created in your workspace.
        </p>
      </div>
      <button className="button dark" onClick={run} disabled={busy}>
        {busy ? "Racing two requests…" : "Run the concurrency demo"}
        <ArrowUpRight size={18} />
      </button>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {results.length > 0 && (
        <div className="race-results" aria-live="polite">
          {results.map((r) => (
            <div key={r.name}>
              <span className={`badge ${r.success ? "confirmed" : "cancelled"}`}>
                {r.success ? "RESERVED" : "PROTECTED"}
              </span>
              <strong>{r.name}</strong>
              <p>{r.message}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
