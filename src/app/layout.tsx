import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "SLOT — Make time. Make progress.", template: "%s · SLOT" },
  description:
    "A thoughtful booking experience for independent coaches. Explore a working, isolated training studio demo.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="header">
          <Link className="brand" href="/" aria-label="SLOT home">
            SLOT
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/book">Find a session</Link>
            <Link href="/my-sessions">My sessions</Link>
            <Link href="/how-it-works">How it works</Link>
          </nav>
          <Link className="nav-cta" href="/demo">
            Explore the demo <ArrowUpRight size={17} />
          </Link>
        </header>
        <main id="main">{children}</main>
        <footer>
          <Link className="brand" href="/">
            SLOT
          </Link>
          <p>Space for your next chapter.</p>
          <div>
            <Link href="/how-it-works">Built with intention</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/login">Studio sign in</Link>
          </div>
          <small>Portfolio demonstration · Fictional studio · No real charges</small>
        </footer>
      </body>
    </html>
  );
}
