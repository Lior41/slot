import Link from "next/link";
export default function Page() {
  return <article className="wrap prose">
    <p className="eyebrow">A CLOSER LOOK</p>
    <h1>SLOT, explained.</h1>
    <p>Real application captures with written explanations. This is an edited, silent walkthrough, with captions embedded in the picture. It does not simulate a continuous screen recording.</p>
    <video controls playsInline preload="metadata" aria-label="SLOT captioned application walkthrough" style={{width:"100%",borderRadius:16,background:"#171b19"}}>
      <source src="/demo/walkthrough-en.mp4" type="video/mp4" />
      Your browser does not support embedded video.
    </video>
    <p><a href="/demo/walkthrough-en.txt">Read the text version</a> · <a href="/demo/walkthrough-en.vtt" download>Download captions</a></p>
    <Link className="button primary" href="/how-it-works">Explore the implementation ↗</Link>
  </article>;
}
