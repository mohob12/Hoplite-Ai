#!/usr/bin/env python3
"""Builds a 1080x1920 30fps animatic: storyboard frames cut to the voice-over timeline.

Usage: python3 animatic.py <voiceover.wav> [out.mp4]
Scene boundaries come from the VO word timestamps (see SYNC-SHEET.md).
"""
import subprocess
import sys

VO = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else 'animatic.mp4'
FPS, FADE, LEAD = 30, 0.4, 0.2  # cuts land LEAD seconds before the spoken ordinal

SCENES = [  # (frame, VO start in seconds)
    ('scene-01-hook', 0.00),
    ('scene-02-intro', 1.86),
    ('scene-03-m01-content', 5.76),
    ('scene-04-m02-design', 15.46),
    ('scene-05-m03-video', 24.18),
    ('scene-06-m04-automation', 32.62),
    ('scene-07-m05-products', 41.96),
    ('scene-08-m06-freelance', 49.72),
    ('scene-09-m07-consulting', 58.66),
    ('scene-10-final', 66.72),
    ('scene-11-cta', 74.50),
]
END = 78.16

bounds = [0.0] + [max(0.0, s - LEAD) for _, s in SCENES[1:]] + [END]
args, filters = ['ffmpeg', '-y', '-loglevel', 'error'], []
for i, (name, _) in enumerate(SCENES):
    dur = bounds[i + 1] - bounds[i] + (FADE if i < len(SCENES) - 1 else 0)
    frames = int(round(dur * FPS))
    args += ['-loop', '1', '-framerate', str(FPS), '-t', f'{dur:.3f}', '-i', f'frames/{name}.png']
    # Pre-upscale before zoompan to avoid sub-pixel jitter; alternate push-in / pull-out.
    z = f"1+0.07*on/{frames}" if i % 2 == 0 else f"1.07-0.07*on/{frames}"
    filters.append(f"[{i}:v]scale=1620:2880,zoompan=z='{z}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2'"
                   f":d=1:s=1080x1920:fps={FPS},setsar=1,format=yuv420p[v{i}]")
prev = 'v0'
for i in range(1, len(SCENES)):
    trans = 'fadeblack' if i in (1, len(SCENES) - 1) else ('smoothleft' if i % 2 else 'zoomin')
    filters.append(f"[{prev}][v{i}]xfade=transition={trans}:duration={FADE}:offset={bounds[i]:.3f}[x{i}]")
    prev = f'x{i}'
filters.append(f"[{prev}]fade=t=out:st={END - 0.8:.2f}:d=0.8[vout]")
args += ['-i', VO, '-filter_complex', ';'.join(filters), '-map', '[vout]', '-map', f'{len(SCENES)}:a',
         '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
         '-c:a', 'aac', '-b:a', '192k', '-t', f'{END}', '-movflags', '+faststart', OUT]
subprocess.run(args, check=True)
print('wrote', OUT)
