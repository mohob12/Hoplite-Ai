#!/usr/bin/env python3
"""Synthesises the sound design for the ad.

Reads build/cues.json (exported by render.mjs from the visual timeline) and writes:
  build/sfx.wav    every visual event's sound effect, placed at its exact frame time
  build/music.wav  original electronic bed (96 BPM, A minor) whose sections follow the edit
Requires numpy only.
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
ROOT = Path(__file__).resolve().parent
rng = np.random.default_rng(7)


def tt(d):
    return np.arange(int(d * SR)) / SR


def noise(d):
    return rng.uniform(-1, 1, int(d * SR))


def svf(x, f, q=0.7, mode='bp'):
    """Chamberlin state-variable filter with per-sample cutoff."""
    F = 2 * np.sin(np.pi * np.minimum(np.broadcast_to(f, x.shape), SR / 6) / SR)
    low = band = 0.0
    y = np.empty_like(x)
    for i in range(len(x)):
        high = x[i] - low - q * band
        band += F[i] * high
        low += F[i] * band
        y[i] = band if mode == 'bp' else (low if mode == 'lp' else high)
    return y


def lp_fft(x, fc):
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (fr / fc) ** 4)
    return np.fft.irfft(X, len(x))


def chirp(f0, f1, d, k=None):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t * (k or 5 / d))
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def bell(n, peak=.6, p=2.0):
    x = np.linspace(0, 1, n)
    return np.where(x < peak, (x / peak) ** p, ((1 - x) / (1 - peak)) ** (p * .8))


def norm(x, peak=1.0):
    return x / (np.max(np.abs(x)) + 1e-9) * peak


def stereo(x, pan=0.0):
    return np.stack([x * np.sqrt((1 - pan) / 2), x * np.sqrt((1 + pan) / 2)], 1) * 1.414


def pan_sweep(x, a=-.6, b=.6):
    p = np.linspace(a, b, len(x))
    return np.stack([x * np.sqrt((1 - p) / 2), x * np.sqrt((1 + p) / 2)], 1) * 1.414


# ---------------- sound effects ----------------
def s_whoosh(d=.62):
    n = int(d * SR); b = bell(n, .62, 1.6)
    return pan_sweep(norm(svf(noise(d), 280 + 2600 * b, .55) * b ** 1.4, .9), -.7, .7)


def s_swish(d=.3):
    n = int(d * SR); b = bell(n, .45, 1.4)
    return pan_sweep(norm(svf(noise(d), 1400 + 5200 * b, .5) * b, .8), .5, -.5)


def s_impact():
    d = 1.1; t = tt(d)
    sub = chirp(95, 38, d, 9) * np.exp(-t * 4.2)
    body = lp_fft(noise(d), 900) * np.exp(-t * 22) * 3
    click = noise(d) * np.exp(-t * 320) * .6
    return stereo(norm(np.tanh(1.8 * (sub + .6 * body + click)), .95))


def s_boom():
    d = 1.8; t = tt(d)
    sub = chirp(62, 27, d, 4) * np.exp(-t * 2.3)
    rum = lp_fft(noise(d), 140) * np.exp(-t * 2.8) * 6
    return stereo(norm(np.tanh(1.4 * (sub + .5 * rum)), .95))


def s_pop():
    d = .2; t = tt(d)
    return stereo(norm(chirp(1100, 230, d, 45) * np.exp(-t * 32) + noise(d) * np.exp(-t * 600) * .25, .8))


def s_click():
    d = .05; t = tt(d)
    return stereo(norm(np.sin(2 * np.pi * 3300 * t) * np.exp(-t * 220) + svf(noise(d), 5000, .5) * np.exp(-t * 700), .7))


def s_tick():
    d = .07; t = tt(d)
    return stereo(norm(np.sin(2 * np.pi * 1850 * t) * np.exp(-t * 110) + .35 * np.sin(2 * np.pi * 3700 * t) * np.exp(-t * 160), .7))


def s_type(d=.5):
    out = np.zeros(int((d + .1) * SR)); t0 = 0.0
    while t0 < d:
        k = tt(.04); f = 2600 + rng.uniform(-500, 600)
        c = (np.sin(2 * np.pi * f * k) * np.exp(-k * 260) + rng.uniform(-1, 1, len(k)) * np.exp(-k * 900) * .5) * rng.uniform(.55, 1)
        i = int(t0 * SR); out[i:i + len(c)] += c[:len(out) - i]
        t0 += rng.uniform(.05, .095)
    return stereo(norm(out, .6))


def s_ding():
    d = 1.6; t = tt(d)
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, a, k in [(1318.5, 1, 3), (1975.5, .5, 4), (2637, .25, 6), (1322, .4, 3)])
    return stereo(norm(x * np.minimum(1, t / .003), .7))


def s_sparkle():
    out = np.zeros(int(.8 * SR))
    for i in range(8):
        k = tt(.25); f = 2400 + i * 380 + rng.uniform(-120, 120)
        c = np.sin(2 * np.pi * f * k) * np.exp(-k * 22) * (1 - i * .07)
        j = int(i * .045 * SR); out[j:j + len(c)] += c
    return pan_sweep(norm(out, .55), -.6, .6)


def s_glitch():
    d = .32; out = np.zeros(int(d * SR)); i = 0
    while i < len(out):
        L = int(rng.uniform(.012, .04) * SR); k = np.arange(L) / SR
        if rng.random() < .75:
            seg = np.sign(np.sin(2 * np.pi * rng.uniform(150, 1800) * k)) * .6 + np.round(rng.uniform(-1, 1, L) * 4) / 4 * .4
            out[i:i + L] = seg[:len(out) - i]
        i += L
    return pan_sweep(norm(out, .55), .4, -.4)


def s_scratch():
    d = .24; n = int(d * SR)
    jit = np.repeat(rng.uniform(.4, 1, n // 240 + 1), 240)[:n]
    x = svf(noise(d), np.linspace(1800, 3200, n), .45) * jit * bell(n, .15, 1.2)
    return stereo(norm(x, .7), .15)


def s_riser(d=1.8):
    n = int(d * SR); t = tt(d); e = (t / d) ** 2.2
    f = 300 * (16 ** (t / d))
    x = svf(noise(d), f, .45) * e + .25 * lp_fft(2 * ((np.cumsum(110 * 2 ** (2 * t / d)) / SR) % 1) - 1, 2500) * e
    x[-int(.02 * SR):] *= np.linspace(1, 0, int(.02 * SR))
    return pan_sweep(norm(x, .8), -.3, .3)


def s_send():
    n = int(.4 * SR); b = bell(n, .35, 1.3)
    x = svf(noise(.4), 900 + 7000 * np.linspace(0, 1, n), .5) * b
    return pan_sweep(norm(x, .7), -.2, .8) + np.pad(s_pop() * .5, ((0, n - int(.2 * SR)), (0, 0)))


def s_shimmer():
    d = 1.6; n = int(d * SR); t = tt(d); b = bell(n, .3, 1.5)
    x = svf(noise(d), 7500, .4) * b * .6 + sum(np.sin(2 * np.pi * f * t) * a for f, a in [(2637, .25), (3951, .15)]) * b
    return pan_sweep(norm(x, .5), -.8, .8)


SOUNDS = {k[2:]: v for k, v in globals().items() if k.startswith('s_')}
BASE_GAIN = {'whoosh': .55, 'swish': .45, 'impact': .9, 'boom': .9, 'pop': .5, 'click': .45, 'tick': .5, 'type': .35,
             'ding': .35, 'sparkle': .4, 'glitch': .45, 'scratch': .5, 'riser': .5, 'send': .5, 'shimmer': .4}


def build_sfx(cues, total):
    out = np.zeros((int(total * SR) + SR * 2, 2))
    cache = {}
    for c in cues:
        n, d = c['n'], c.get('d')
        key = (n, round(d, 2) if d else None)
        if key not in cache:
            cache[key] = SOUNDS[n](d) if d else SOUNDS[n]()
        x = cache[key] * BASE_GAIN[n] * c['g']
        i = max(0, int(c['t'] * SR))
        out[i:i + len(x)] += x[:len(out) - i]
    # short room to glue the effects
    ir_t = tt(.9)
    ir = rng.uniform(-1, 1, len(ir_t)) * np.exp(-ir_t * 7)
    wet = np.stack([np.fft.irfft(np.fft.rfft(out[:, k], len(out) + len(ir)) * np.fft.rfft(ir, len(out) + len(ir)))[:len(out)] for k in (0, 1)], 1)
    out = out + norm(wet, np.max(np.abs(out))) * .12
    return out[:int(total * SR)]


# ---------------- music ----------------
def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


def build_music(total):
    bar, beat = 2.5, .625            # 96 BPM
    first = 4.83 - 2 * bar           # aligns a downbeat with the first logo (video time 4.83)
    N = int(total * SR) + SR
    out = np.zeros((N, 2))
    prog = [(45, [57, 60, 64]), (41, [53, 57, 60]), (48, [55, 60, 64]), (43, [55, 59, 62])]  # Am F C G

    def add(x, t, pan=0.0, g=1.0):
        i = int(t * SR)
        if i >= N or i + len(x) <= 0:
            return
        if i < 0:
            x, i = x[-i:], 0
        s = stereo(x, pan) if x.ndim == 1 else x
        out[i:i + len(s)] += s[:N - i] * g

    def section(t):
        if t < 4.83: return 'intro'
        if 14.83 <= t < 19.83: return 'dark'
        if 27.33 <= t < 29.83: return 'break'
        if t >= 51.6: return 'end'
        return 'full'

    k_t = tt(.4)
    kick = np.sin(2 * np.pi * np.cumsum(45 + 95 * np.exp(-k_t * 28)) / SR) * np.exp(-k_t * 7.5) + noise(.4) * np.exp(-k_t * 400) * .2
    s_t = tt(.25)
    clap = svf(noise(.25), 1700, .6) * np.exp(-s_t * 20) * 2.5 + np.sin(2 * np.pi * 190 * s_t) * np.exp(-s_t * 30) * .4
    h_t = tt(.08)
    hat = svf(noise(.08), 9000, .5, 'hp') * np.exp(-h_t * 70)

    nb = int((total - first) / bar) + 2
    for b in range(nb):
        t0 = first + b * bar
        root, tones = prog[b % 4]
        sec = section(t0 + .01)
        if t0 + bar < 0:
            continue
        # pad: detuned saws, slow swell
        d = bar + .6; pt = tt(d)
        env = np.minimum(1, pt / .45) * np.minimum(1, (d - pt) / .6)
        for j, m in enumerate(tones):
            for det, pan in ((-.006, -.5), (.006, .5), (0, 0)):
                f = midi(m) * (1 + det)
                saw = 2 * ((f * pt + rng.random()) % 1) - 1
                add(saw * env * (.05 if sec != 'dark' else .035), t0, pan)
        # bass on 8ths, ducked on every beat
        for e8 in range(8):
            te = t0 + e8 * beat / 2
            if sec in ('intro', 'break', 'end') or (sec == 'dark' and e8 % 2):
                continue
            bt = tt(beat / 2)
            f = midi(root - 12 + (12 if e8 in (3, 7) and sec == 'full' else 0))
            x = (np.sin(2 * np.pi * f * bt) + .25 * np.sin(4 * np.pi * f * bt)) * np.minimum(1, bt / .008) * np.exp(-bt * 3)
            add(x * (.22 if e8 % 2 else .14), te)
        for q in range(4):
            tq = t0 + q * beat
            if sec == 'full' or (sec == 'dark' and q in (0, 2)):
                add(kick * .55, tq)
            if sec == 'full' and q in (1, 3):
                add(clap * .16, tq, .1)
            if sec == 'full':
                add(hat * .14, tq + beat / 2, .35)
                add(hat * .06, tq + beat / 4, -.35)
                add(hat * .06, tq + 3 * beat / 4, -.35)
        # pluck arpeggio on 16ths with a dotted-8th echo
        if sec in ('intro', 'full', 'end'):
            pat = [0, 1, 2, 1, 0, 2, 1, 2] * 2
            for i16, ix in enumerate(pat):
                ts = t0 + i16 * beat / 4
                if sec == 'end' and ts > 51.6 + 1.2:
                    continue
                pt2 = tt(.3); f = midi(tones[ix] + 12)
                x = (np.sin(2 * np.pi * f * pt2) + .3 * np.sin(6 * np.pi * f * pt2) / 3) * np.exp(-pt2 * 16)
                g = .05 if sec != 'intro' else .04
                add(x * g, ts, .3 if i16 % 2 else -.3)
                add(x * g * .35, ts + .47, -.5 if i16 % 2 else .5)
    # final chord ring-out
    pt = tt(3.2); env = np.minimum(1, pt / .05) * np.exp(-pt * 1.1)
    for m in (45, 57, 60, 64, 69):
        add(np.sin(2 * np.pi * midi(m) * pt) * env * .09, 51.6)
    # gentle overall lowpass + fade out
    out = np.stack([lp_fft(out[:, k], 9000) for k in (0, 1)], 1)[:int(total * SR)]
    fade = np.ones(len(out)); fi = int((total - 1.2) * SR); fade[fi:] = np.linspace(1, 0, len(out) - fi)
    return norm(out * fade[:, None], .9)


def write(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())


if __name__ == '__main__':
    cues = json.loads((ROOT / 'build/cues.json').read_text())
    total = cues['totalFrames'] / cues['meta']['FPS']
    write(ROOT / 'build/sfx.wav', norm(build_sfx(cues['sfx'], total), .89))
    write(ROOT / 'build/music.wav', build_music(total))
    print(f"wrote sfx ({len(cues['sfx'])} cues) and music, {total:.2f}s")
