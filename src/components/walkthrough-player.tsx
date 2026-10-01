"use client";

import { useRef, useState } from "react";
import styles from "./walkthrough-player.module.css";

type Props = {
  project: string;
  basePath?: string;
  initialLanguage?: "en" | "fr";
};

export function WalkthroughPlayer({
  project,
  basePath = "/demo/walkthrough",
  initialLanguage = "en",
}: Props) {
  const [language, setLanguage] = useState(initialLanguage);
  return (
    <section className={styles.player} aria-label={`${project} video presentation`}>
      <div className={styles.languages} role="group" aria-label="Video language">
        <button type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>
          English · 1 minute
        </button>
        <button type="button" aria-pressed={language === "fr"} onClick={() => setLanguage("fr")}>
          Français · 3 minutes
        </button>
      </div>
      <Video key={`${basePath}-${language}`} project={project} source={`${basePath}-${language}`} />
    </section>
  );
}

function Video({ project, source }: { project: string; source: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState("Ready. Press Play to start.");
  const [error, setError] = useState(false);

  async function toggle() {
    const video = ref.current;
    if (!video) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    setError(false);
    setMessage("Loading video…");
    try {
      await video.play();
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setError(true);
      setMessage(
        "Playback could not start. Retry, open the MP4 directly, or read the transcript below.",
      );
    }
  }

  function restart() {
    const video = ref.current;
    if (!video) return;
    video.pause();
    video.load();
    setError(false);
    setPlaying(false);
    setMessage("Ready. Press Play to start.");
  }

  return (
    <>
      <div className={styles.toolbar}>
        <button type="button" className={styles.play} onClick={toggle}>
          {playing ? "Pause video" : "Play video"}
        </button>
        <button type="button" onClick={restart}>
          {error ? "Retry video" : "Restart video"}
        </button>
        <span className={styles.status} role="status" aria-live="polite">
          {message}
        </span>
      </div>
      <video
        ref={ref}
        controls
        playsInline
        preload="metadata"
        poster={`${source}.jpg`}
        aria-label={`${project} captioned walkthrough`}
        className={styles.video}
        onPlaying={() => {
          setPlaying(true);
          setError(false);
          setMessage("Playing · captions are embedded · no audio track.");
        }}
        onPause={() => {
          setPlaying(false);
          setMessage("Paused. Press Play to continue.");
        }}
        onEnded={() => {
          setPlaying(false);
          setMessage("Finished. Replay or explore the application.");
        }}
        onWaiting={() => setMessage("Buffering video…")}
        onError={() => {
          setPlaying(false);
          setError(true);
          setMessage(
            "The video could not load. Retry, open the MP4 directly, or read the transcript below.",
          );
        }}
      >
        <source src={`${source}.mp4`} type="video/mp4" />
        Your browser cannot play this video. Use the MP4 or text links below.
      </video>
      <p className={styles.note}>
        Real application screenshots, edited into a captioned walkthrough. Silent video, with no
        voice-over. Demo data. This is not a continuous recording of interactions.
      </p>
      <div className={styles.links}>
        <a href={`${source}.mp4`} target="_blank" rel="noreferrer">
          Open MP4 directly ↗
        </a>
        <a href={`${source}.mp4`} download>
          Download video
        </a>
        <a href={`${source}.txt`}>Read the transcript</a>
        <a href={`${source}.vtt`} download>
          Download captions
        </a>
      </div>
    </>
  );
}
