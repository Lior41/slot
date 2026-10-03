# Narrated demo media

These videos show real application interactions captured from a dedicated browser tab, edited into a guided tour. They use synthetic narration, embedded captions, and fictional demonstration data. They replace the earlier silent screenshot walkthroughs.

## Capture and editing

Application frames were acquired through browser screenshots during real clicks, typing, scrolling and animations. Acquisition cadence varies by take (roughly 3–10 frames per second); timestamps are preserved when encoding. Frames are duplicated for video compatibility, without invented motion or reconstructed application states. These are edited, sampled interaction recordings, not continuous native 30 fps screen recordings. Waiting time may be shortened. The French and English edits use the same observed interactions.

SLOT was recorded locally with its real booking service, an isolated demonstration workspace and simulated payment. LABSPACE was recorded on its public deployment. SIGNBRIDGE demonstrates a prewritten interface scenario, not ASL inference. No personal camera footage, credentials or unrelated browser tabs are included. Selecting a file was not demonstrated successfully in this recording, and the narration does not claim otherwise.

## Narration credits

The voice is synthesized, not the project owner's voice. No voice cloning or paid speech service was used.

- [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), hexgrad, Apache 2.0 model.
- [Kokoro ONNX](https://github.com/thewh1teagle/kokoro-onnx), MIT wrapper.
- Voices: `ff_siwis` (French), `af_heart` (English). [Official voice notes](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md).
- French voice source attribution: Yamagishi, Junichi; Honnet, Pierre-Edouard; Garner, Philip; Lazaridis, Alexandros (2017), _The SIWIS French Speech Synthesis Database, 2016_, University of Edinburgh, Centre for Speech Technology Research. [Dataset and CC BY attribution](https://doi.org/10.7488/ds/1705). No source dataset recordings are bundled.

## Playback checks

The output is MP4 with H.264 video and AAC audio. The rendering process decodes the final audio and measures its level; selected spoken passages were also checked by local speech transcription. This is not a claim of human listening review. Browser tests require an audio track that decodes, lasts over 30 seconds, has nonzero volume and RMS above 0.001, then exercise mute/unmute. Captions and text transcripts remain available separately.
