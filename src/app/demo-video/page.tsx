import Link from "next/link";
import { WalkthroughPlayer } from "@/components/walkthrough-player";

export default function Page() {
  return (
    <article className="wrap prose">
      <p className="eyebrow">A CLOSER LOOK</p>
      <h1>SLOT, explained.</h1>
      <p>
        Choose a language, then press Play for a spoken explanation of the demo. Captions are
        included.
      </p>
      <WalkthroughPlayer project="SLOT" />
      <p>
        <a href="https://lior-labspace.vercel.app/project-room">Watch all three projects ↗</a>
      </p>
      <Link className="button primary" href="/how-it-works">
        Explore the implementation ↗
      </Link>
    </article>
  );
}
