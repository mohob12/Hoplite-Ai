#!/usr/bin/env bash
# Renders every storyboard style frame (1080x1920) with headless Chrome, then a contact sheet.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p frames
rm -f frames/*.png frames/*.jpg

render() {
  google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
    --allow-file-access-from-files --window-size=1080,1920 --virtual-time-budget=4000 \
    --screenshot="frames/$2.png" "file://$PWD/frames.html#$1" >/dev/null 2>&1
}

render 1  scene-01-hook
render 2  scene-02-intro
render 3  scene-03-m01-content
render 4  scene-04-m02-design
render 5  scene-05-m03-video
render 6  scene-06-m04-automation
render 7  scene-07-m05-products
render 8  scene-08-m06-freelance
render 9  scene-09-m07-consulting
render 10 scene-10-final
render 11 scene-11-cta
render m  alt-marketing
render w  alt-websites

ffmpeg -loglevel error -y -pattern_type glob -i 'frames/scene-*.png' \
  -vf "scale=300:-1,tile=6x2:padding=10:color=0x05060a" -frames:v 1 frames/contact-sheet.jpg
ls frames
