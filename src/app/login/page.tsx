"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function Page() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <section className="wrap narrow">
      <p className="eyebrow">WELCOME BACK</p>
      <h1>
        Your time.
        <br />
        Your studio.
      </h1>
      <form
        className="panel form-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget);
          try {
            const r = await fetch("/api/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(Object.fromEntries(f)),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            router.push("/book");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to connect.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Email
          <input type="email" name="email" required autoComplete="username" />
        </label>
        <label>
          Password
          <input type="password" name="password" required autoComplete="current-password" />
        </label>
        <label>
          Studio ID
          <input name="workspace" required placeholder="Provided by your studio administrator" />
        </label>
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p>
          No studio account?{" "}
          <Link className="text-link" href="/demo">
            Explore the isolated demo
          </Link>
        </p>
      </form>
    </section>
  );
}
