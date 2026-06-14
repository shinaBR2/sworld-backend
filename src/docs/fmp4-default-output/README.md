# Epic: fMP4/CMAF as the default HLS output

**Goal.** Make every video-processing path emit **fMP4/CMAF** segments
(`init.mp4` + `.m4s`, `#EXT-X-MAP`) instead of MPEG-TS (`.ts`), so the codec
config is delivered explicitly in an init segment and the player never has to
reconstruct it on the fly.

This folder is our "Linear" for this epic. Each sub-feature is a folder; each
micro-PR is one markdown file (a "ticket"). Pick any ticket whose **Blocked by**
is satisfied and ship it in one small PR. **Status lives in the folder and file
names** — `ls` the tree to see where everything stands.

---

## The problem (grounded in a real incident)

The "Gosick" playlist played with **intermittent garbled/noise audio on desktop
Chrome** (hls.js), while the same files were byte-perfect and played fine on
iOS/Safari/native and in ffmpeg.

Root cause, established by isolation testing:

- In **MPEG-TS**, AAC audio is carried as **ADTS** frames; the full
  `AudioSpecificConfig` (profile, sample rate, channel config) is **not**
  delivered cleanly — the player must reconstruct it on the fly while demuxing.
  hls.js does this in JS as segments stream in, and the step **races** MSE
  SourceBuffer setup. When it loses, the audio decoder is configured with a
  broken profile (Chrome `media-internals` shows literally `codec: aac,
  profile: unknown … target_output_sample_format: Unknown sample format`) →
  the AAC bytes decode to noise, with **no hard error**. Re-buffering
  (pause/resume) sometimes lands a good parse, which is why it's flaky.
- ffmpeg shows the same fault when copying the same ADTS into MP4 without help:
  `Malformed AAC bitstream detected: use 'aac_adtstoasc'`.

**Why only some videos:** it's a timing race, so it's probabilistic — fragile
streams (e.g. HE-AAC from certain CDNs) trip it reliably; others usually dodge
it. Our passthrough paths copy the source `.ts` straight through, so whatever
the source does, we inherit.

## The fix (proven)

Serve **fMP4/CMAF**. The `AudioSpecificConfig` lives in the **init segment**
(`moov`/`esds`), delivered once, upfront — no live ADTS reconstruction, no race.
A single-instance hls.js test of the *same content* as fMP4 played clean on
desktop **and** mobile **and** device-emulation; as `.ts` it was noisy.

The remux is cheap: `-c:v copy` + a light audio step (`-c:a aac`, or
`-c copy -bsf:a aac_adtstoasc`) — **no video transcode**, so we keep most of the
passthrough performance.

The frontend needs **no change** — hls.js already plays fMP4. (PR #290's
`hls.js@1.5.20` pin is good hygiene but was not the fix.)

## ffmpeg recipe (reference)

```bash
ffmpeg -i <source> -c:v copy -c:a aac -b:a 128k -ac 2 -ar 44100 \
  -f hls -hls_time 6 -hls_playlist_type vod \
  -hls_segment_type fmp4 -hls_fmp4_init_filename init.mp4 \
  -hls_segment_filename "%d.m4s" playlist.m3u8
```

Produces `#EXT-X-VERSION:7`, `#EXT-X-MAP:URI="init.mp4"`, `.m4s` segments.

---

## Waves

| Wave | Folder | Tickets |
| - | - | - |
| Foundation | `00.todo.foundation` | **F1** — fMP4 packaging helper + playlist/init upload |
| Wire output paths (parallel, blocked by F1) | `01.todo.wire-output-paths` | **P1** convert · **P2** stream-hls · **P3** CLI |
| Verify | `02.todo.verify` | **V1** output tests |
| Deferred | `03.deferred.catalog-migration` | **G1** migrate existing `.ts` catalog |

Do F1 → P1/P2/P3 (parallel) → V1. **G1 is deferred** — existing `.ts` mostly
works; migrate only if other videos surface the same noise.

## Status

```
ls src/docs/fmp4-default-output/**/
```
