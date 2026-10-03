import { expect, type Locator } from "@playwright/test";

/** Catch missing or silent voice tracks, including videos that otherwise play successfully. */
export async function expectAudibleNarration(video: Locator) {
  const audio = await video.evaluate(async (element: HTMLVideoElement) => {
    const context = new AudioContext();
    try {
      const response = await fetch(element.currentSrc);
      if (!response.ok) throw new Error(`Media request failed: ${response.status}`);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      const samples = buffer.getChannelData(0);
      let energy = 0;
      for (const sample of samples) energy += sample * sample;
      return {
        duration: buffer.duration,
        rms: Math.sqrt(energy / samples.length),
        muted: element.muted,
        volume: element.volume,
      };
    } finally {
      await context.close();
    }
  });
  expect(audio.muted, "Narration starts unmuted").toBe(false);
  expect(audio.volume, "Playback volume is enabled").toBeGreaterThan(0);
  expect(audio.duration, "A complete narration track is embedded").toBeGreaterThan(30);
  expect(audio.rms, "The audio track contains audible signal, not silence").toBeGreaterThan(0.001);
}
