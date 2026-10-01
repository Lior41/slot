import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, MoveUpRight, Clock3, MapPin, Check } from "lucide-react";
export default function Home() {
  return (
    <>
      <section className="hero wrap">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="dot" /> FORMA TRAINING CLUB · TEL AVIV
          </p>
          <h1>
            Make time.
            <br />
            Make <em>progress.</em>
          </h1>
          <p className="lead">
            Good coaching. A little consistency.
            <br />A stronger version of you.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/demo">
              Find your next session <ArrowUpRight size={21} />
            </Link>
            <a className="text-link" href="#sessions">
              Meet your rhythm <ArrowRight size={17} />
            </a>
          </div>
          <div className="hero-details">
            <span>
              <Check size={16} /> Small groups. Real attention.
            </span>
            <span>
              <MapPin size={16} /> Studio & outdoor sessions
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <Image
            src="/training.jpg"
            alt="Athlete training in a sunlit gym"
            fill
            priority
            sizes="(max-width: 800px) 100vw, 50vw"
          />
          <span className="vertical-label">MOVE WITH PURPOSE</span>
          <div className="photo-label">
            <span>
              YOUR NEXT CHAPTER
              <br />
              <strong>Starts with showing up.</strong>
            </span>
            <MoveUpRight size={32} />
          </div>
          <div className="studio-stamp">
            F
            <span>
              FORMA
              <br />
              TRAINING CLUB
            </span>
          </div>
        </div>
      </section>
      <div className="ticker" aria-label="Training principles">
        <span>STRONGER TOGETHER</span>
        <span>↗</span>
        <span>PROGRESS OVER PERFECT</span>
        <span>↗</span>
        <span>MAKE SPACE TO MOVE</span>
        <span>↗</span>
      </div>
      <section id="sessions" className="wrap section">
        <div className="section-head">
          <div>
            <p className="eyebrow">01 / FIND YOUR RHYTHM</p>
            <h2>
              A session for
              <br />
              where you are.
            </h2>
          </div>
          <p>
            Choose your focus. We’ll take care of the structure.
            <br />
            All levels welcome, always.
          </p>
        </div>
        <div className="service-grid">
          {[
            {
              n: "01",
              name: "Personal training",
              tag: "YOUR GOALS. YOUR PACE.",
              text: "One coach. One clear focus. Build strength with a session shaped around you.",
              time: "50 min",
              price: "₪220",
              cls: "personal",
            },
            {
              n: "02",
              name: "Strength club",
              tag: "A LITTLE TEAM ENERGY.",
              text: "Foundational strength in a small group. Show up, support each other, get stronger.",
              time: "45 min",
              price: "₪85",
              cls: "strength",
            },
            {
              n: "03",
              name: "Mobility reset",
              tag: "ROOM TO MOVE BETTER.",
              text: "Slow things down. Work on balance, control and a little more freedom of movement.",
              time: "40 min",
              price: "₪65",
              cls: "mobility",
            },
          ].map((s) => (
            <Link href="/demo" className={`service-card ${s.cls}`} key={s.n}>
              <div className="service-top">
                <span>{s.n}</span>
                <ArrowUpRight />
              </div>
              <div className="abstract-bars" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <p className="eyebrow">{s.tag}</p>
              <h3>{s.name}</h3>
              <p>{s.text}</p>
              <div className="service-bottom">
                <span>
                  <Clock3 size={15} />
                  {s.time}
                </span>
                <strong>
                  {s.price}
                  <small> / session</small>
                </strong>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="coach-section wrap">
        <div>
          <p className="eyebrow">02 / A HUMAN APPROACH</p>
          <h2>
            Less pressure.
            <br />
            More possibility.
          </h2>
        </div>
        <div>
          <p className="quote">
            “Your training should fit your life.
            <br />
            Let’s find a rhythm you can keep.”
          </p>
          <p>Noa Ben-Ami · Your demo coach</p>
          <small>
            Forma and its coach are fictional. Reservations use real application logic in your own
            isolated demo.
          </small>
          <Link href="/demo" className="button dark">
            Step inside the studio <ArrowUpRight size={20} />
          </Link>
        </div>
      </section>
    </>
  );
}
