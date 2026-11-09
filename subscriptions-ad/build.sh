#!/usr/bin/env bash
# Full build: frames -> sound design -> mix -> final MP4 (1080x1920, 30 fps).
# Usage: ./build.sh "<voiceover.wav>" [out.mp4]
set -euo pipefail
cd "$(dirname "$0")"
VO="${1:?voice-over wav required}"
OUT="${2:-build/subscriptions-ad.mp4}"
PY="${PYTHON:-python3}"

[ -d node_modules/puppeteer-core ] || npm install --no-audit --no-fund
if [ -z "${SKIP_RENDER:-}" ]; then rm -rf build/frames
  node render.mjs --workers="${WORKERS:-4}"; fi
"$PY" audio.py

OFFSET_MS=$(jq -r '.meta.OFFSET * 1000 | round' build/cues.json)
DUR=$(jq -r '.totalFrames / .meta.FPS' build/cues.json)

# VO normalised to -16 LUFS; music ducks under the voice; SFX sit between the two.
ffmpeg -loglevel error -y \
  -framerate 30 -i build/frames/f%05d.jpg \
  -i "$VO" -i build/music.wav -i build/sfx.wav \
  -filter_complex "\
[1:a]aresample=48000,aformat=channel_layouts=mono,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,loudnorm=I=-16:TP=-2:LRA=9,aresample=48000,pan=stereo|c0=c0|c1=c0,adelay=${OFFSET_MS}|${OFFSET_MS},apad[vo];\
[vo]asplit=2[vo1][vosc];\
[2:a]volume=${MUSIC_DB:--9}dB[mus];\
[mus][vosc]sidechaincompress=threshold=0.02:ratio=6:attack=20:release=380:makeup=1[musd];\
[3:a]volume=${SFX_DB:--6}dB[sfx];\
[vo1][musd][sfx]amix=inputs=3:normalize=0:duration=longest,alimiter=limit=0.89:level=disabled[a]" \
  -map 0:v -map "[a]" -t "$DUR" \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -r 30 \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart "$OUT"
echo "wrote $OUT"
