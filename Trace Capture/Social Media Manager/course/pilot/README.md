# Lesson 1 pilot: The whole system

Status: Dave approved the pilot on 2026-11-07 and authorized production of the remaining lessons. This is not evidence of a published course or completed paywall.

## Open the lesson

- [Interactive HTML presentation](presentation.html): 13 scenes, keyboard-accessible controls, individual Brian narration clips and captions, reduced-motion support, no autoplay.
- [Video: Lesson 1](lesson-01.mp4): continuous narrated video, 7:13, 1280 × 720 H.264/AAC with an embedded English subtitle track.
- [Separate English captions](captions.vtt) and [text transcript](transcript.md).
- [Lesson plan, canonical lecture, exercise, and self-check](../lessons/01.html).
- [Scene timing and descriptions](cues.json).

The presentation is editable HTML/CSS/JavaScript. Its live browser view animates entry of the cards and connector. The video uses still captures of those same HTML scenes, a continuous gentle camera zoom for each scene, and cuts between scenes; it does not reproduce the HTML entry animation. Captions are optional in the video player and are also provided as a separate WebVTT track.

## Narration and rights

The voice is ElevenLabs Brian via fal.ai's multilingual-v2 TTS endpoint. It was generated from 13 consecutive paragraphs (6,921 characters) in the canonical Lesson 1 lecture, using the user's existing configured service. No raw service response or credentials are included. The provider returned character alignment, retained under `alignment/`, from which captions were constructed; the normalized alignment text matches all 13 source paragraphs. Actual service charges were not exposed by the generation response. [fal states](https://fal.ai/elevenlabs) that ElevenLabs content generated through its API may be used commercially; the account's applicable terms and any voice-specific restrictions should still be confirmed before selling or publishing.

The diagram illustrations are original inline SVG/CSS created for this pilot; no third-party image or music assets were used. A listener still needs to review pronunciation, voice quality, script-to-audio parity, caption wording/timing, and the overall pacing. The measured 7:13 duration is shorter than the proposed 8–15 minute range and should be reviewed for fit, not silently called compliant.

## Reproduce

`../lessons/01.html` is the canonical lecture. `build-pilot.cjs` reads the 13 paragraphs in `#lecture-script` and maps them to presentation scenes. It expects Node.js, FFmpeg with `h264_videotoolbox`, FFprobe, and Playwright/Chromium available in the parent project. It retains the approved audio, so rendering does not invoke the paid service:

```sh
node course/pilot/build-pilot.cjs render
```

Run from the Social Media Manager directory. This regenerates scene data, transcript, scene screenshots, timed cues, WebVTT captions, intermediate video segments, and the final captioned MP4 from retained source audio. `frames/` and `segments/` are generated intermediates and need not be distributed.

Generating new speech is a paid external action. The optional `synthesize` command reads an existing `FAL_KEY` from the environment or the configured local ShortFactory account. It skips already-complete audio/alignment pairs. If a request fails or times out, determine whether it was charged or completed before trying again; the provider call has no automatic retry or idempotency guarantee. Never include keys in the output or repository.

## Local verification

- FFprobe reports H.264 1280 × 720 video, AAC audio, and an English `mov_text` subtitle stream; duration is 433.365 seconds and size 38,785,530 bytes.
- All 13 provider alignment records contain timing data; their text matches the canonical lecture after Unicode/case/punctuation normalization.
- Source frame 01 was visually inspected for layout and readable text. Full human voice, caption, and continuous-playback review remains outstanding; browser/device coverage and exact provider billing are not yet established.
- Rendering uses 15 fps and approximately 650 kb/s video with 96 kb/s AAC to keep the sample shareable. The cues and captions are generated from retained clip durations and alignment; review actual synchronization in a player.
