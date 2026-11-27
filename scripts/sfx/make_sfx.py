#!/usr/bin/env python3.10
"""Makes Pip's quirky sound effects from scratch (no samples, no licences): app/assets/sfx/*.m4a (and .wav while building).
Run: python3.10 -I scripts/sfx/make_sfx.py      (needs numpy, scipy, ffmpeg)

Every sound is synthesised: tuned sine partials for bells / marimba / xylophone, filtered noise for whooshes, paper and
crackle, pitch glides for boings and slide whistles. All get a soft room (short reverb), gentle fades and the same
loudness (-16 LUFS-ish peak normalisation), so they sit together. Keep them short and quiet: they ride on top of the app.
"""
import os, subprocess, numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '../../app/assets/sfx'))
rng = np.random.default_rng(7)

def t(sec): return np.arange(int(SR * sec)) / SR
def env(n, a=0.005, d=0.3, curve=4.0):
    """attack a s, then exponential decay with time constant d s"""
    x = np.arange(n) / SR
    e = np.exp(-x / max(d, 1e-4) * (curve / 4))
    att = np.clip(x / max(a, 1e-4), 0, 1)
    return e * att
def note(f): return 440 * 2 ** ((f - 69) / 12)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, order=2): return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)
def place(buf, x, at):
    i = int(at * SR); n = min(len(x), len(buf) - i)
    if n > 0: buf[i:i + n] += x[:n]
    return buf
def room(x, mix=0.18, size=0.9):
    """a small soft room: exponentially decaying filtered noise as an impulse response"""
    n = int(SR * size); ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR / (size / 5))
    ir = lp(ir, 6000); ir /= np.sqrt((ir ** 2).sum())
    wet = np.convolve(x, ir)[:len(x) + n]
    dry = np.concatenate([x, np.zeros(len(wet) - len(x))])
    return dry + mix * wet
def finish(x, peak=0.7, tail=0.02):
    x = x - np.mean(x)
    f = int(SR * tail); x[-f:] *= np.linspace(1, 0, f)
    x[:64] *= np.linspace(0, 1, 64)
    m = np.max(np.abs(x)) or 1
    return x / m * peak

# ---- instruments -------------------------------------------------------------------------------------------------
def marimba(f, dur=0.6, v=1.0):
    x = t(dur); y = np.sin(2 * np.pi * f * x) * env(len(x), 0.002, 0.28) + 0.35 * np.sin(2 * np.pi * f * 3.9 * x) * env(len(x), 0.001, 0.05)
    return v * y
def xylo(f, dur=0.45, v=1.0):
    x = t(dur); y = np.sin(2 * np.pi * f * x) * env(len(x), 0.001, 0.12) + 0.5 * np.sin(2 * np.pi * f * 3.0 * x) * env(len(x), 0.001, 0.04) + 0.25 * np.sin(2 * np.pi * f * 6.2 * x) * env(len(x), 0.001, 0.02)
    return v * y
def bell(f, dur=1.4, v=1.0):
    x = t(dur); parts = [(1, 1, 0.9), (2.0, 0.5, 0.6), (2.76, 0.35, 0.45), (5.4, 0.2, 0.25), (8.93, 0.1, 0.15)]
    return v * sum(a * np.sin(2 * np.pi * f * r * x) * env(len(x), 0.002, d) for r, a, d in parts)
def pluck(f, dur=0.5, v=1.0):   # harp-ish (Karplus-Strong)
    n = int(SR * dur); p = max(2, int(SR / f)); buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]; buf[i % p] = 0.996 * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return v * out * env(n, 0.001, dur * 0.6)
def glide(f0, f1, dur, vib=0.0, vibhz=6.0, shape='exp'):
    x = t(dur); u = x / dur
    f = f0 * (f1 / f0) ** u if shape == 'exp' else f0 + (f1 - f0) * u
    f = f * (1 + vib * np.sin(2 * np.pi * vibhz * x))
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def noise(sec): return rng.standard_normal(int(SR * sec))

# ---- the sounds --------------------------------------------------------------------------------------------------
S = {}
def pop():
    x = glide(1100, 260, 0.07) * env(int(SR * 0.07), 0.001, 0.03)
    c = hp(noise(0.01), 3000) * 0.3
    return room(place(np.zeros(int(SR * 0.12)), x, 0) + place(np.zeros(int(SR * 0.12)), c, 0), 0.12, 0.4)
S['pop'] = pop
def boing():
    x = t(0.55); f = 170 * (1 + 0.9 * np.exp(-x * 9)) * (1 + 0.12 * np.sin(2 * np.pi * 13 * x) * np.exp(-x * 4))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.003, 0.25)
    y += 0.3 * np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR) * env(len(x), 0.003, 0.12)
    return room(y, 0.15, 0.5)
S['boing'] = boing
def chime_up():
    b = np.zeros(int(SR * 1.0))
    for i, m in enumerate([72, 76, 79, 84]): place(b, marimba(note(m), 0.6, 0.8 + 0.1 * i), i * 0.075)
    return room(b, 0.25, 1.0)
S['chime-up'] = chime_up
def xylo_run():
    b = np.zeros(int(SR * 1.0))
    for i, m in enumerate([79, 81, 83, 84, 86, 88, 91]): place(b, xylo(note(m), 0.45, 0.6 + 0.06 * i), i * 0.045)
    return room(b, 0.22, 0.9)
S['xylo-run'] = xylo_run
def sparkle():
    b = np.zeros(int(SR * 1.3)); scale = [84, 86, 88, 91, 93, 96, 98, 100, 103]
    for i, m in enumerate(scale): place(b, bell(note(m), 0.9, 0.18 + 0.02 * i), i * 0.055 + rng.uniform(0, 0.01))
    return room(hp(b, 900), 0.35, 1.2)
S['sparkle'] = sparkle
def whoosh():
    n = noise(0.5); x = t(0.5); out = np.zeros_like(n)
    for k in range(10):     # sweep the band up in 10 slices
        a, z = int(k * len(n) / 10), int((k + 1) * len(n) / 10)
        f = 400 * (8 ** (k / 9)); seg = bp(n, f * 0.7, min(f * 1.4, 18000))[a:z]; out[a:z] = seg
    return room(out * np.sin(np.pi * x / 0.5) ** 1.5, 0.15, 0.5)
S['whoosh'] = whoosh
def swoosh_down():
    return whoosh()[::-1].copy()
S['swoosh-down'] = swoosh_down
def popper():   # party popper: snap + paper flutter + a few crackles
    b = np.zeros(int(SR * 1.1))
    place(b, hp(noise(0.03), 1500) * env(int(SR * 0.03), 0.0005, 0.008) * 1.2, 0)
    place(b, glide(160, 50, 0.12) * env(int(SR * 0.12), 0.001, 0.05) * 0.8, 0)
    paper = bp(noise(0.9), 2500, 9000) * np.exp(-t(0.9) * 4) * 0.25 * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t(0.9)))
    place(b, paper, 0.02)
    for _ in range(9): place(b, hp(noise(0.006), 4000) * 0.35 * rng.uniform(0.4, 1), rng.uniform(0.08, 0.7))
    return room(b, 0.2, 0.8)
S['popper'] = popper
def firework():
    b = np.zeros(int(SR * 2.0))
    place(b, glide(90, 35, 0.35) * env(int(SR * 0.35), 0.002, 0.15), 0)
    place(b, lp(noise(0.4), 900) * env(int(SR * 0.4), 0.002, 0.12) * 0.7, 0)
    for _ in range(55):
        at = 0.18 + rng.exponential(0.35); amp = 0.5 * np.exp(-(at - 0.18) * 1.6) * rng.uniform(0.3, 1)
        place(b, hp(noise(0.008), 2500) * amp, min(at, 1.9))
    return room(b, 0.3, 1.4)
S['firework'] = firework
def fire():
    n = noise(1.4); x = t(1.4)
    rumble = lp(n, 500) * 0.9 * (np.sin(np.pi * np.clip(x / 1.4, 0, 1)) ** 0.6)
    roar = bp(n, 700, 2500) * 0.25 * (np.sin(np.pi * np.clip(x / 1.4, 0, 1)))
    b = rumble + roar
    for _ in range(40): place(b, hp(noise(0.004), 3000) * rng.uniform(0.1, 0.5), rng.uniform(0.05, 1.3))
    return room(b, 0.15, 0.6)
S['fire'] = fire
def snow():
    b = np.zeros(int(SR * 2.2)); pent = [84, 86, 88, 91, 93, 96]
    wind = bp(noise(2.2), 300, 1200) * 0.08 * np.sin(np.pi * t(2.2) / 2.2) ** 2
    b += wind
    for i in range(9): place(b, bell(note(pent[rng.integers(len(pent))]), 1.2, rng.uniform(0.12, 0.25)), 0.1 + i * 0.2 + rng.uniform(-0.04, 0.04))
    return room(b, 0.4, 1.6)
S['snow'] = snow
def bubbles():
    b = np.zeros(int(SR * 0.9))
    for i in range(6):
        f0 = 380 + i * 90 + rng.uniform(-20, 20)
        place(b, glide(f0, f0 * 2.2, 0.06) * env(int(SR * 0.06), 0.002, 0.03) * 0.8, 0.05 + i * 0.11 + rng.uniform(0, 0.03))
    return room(b, 0.2, 0.6)
S['bubbles'] = bubbles
def slide_up():
    x = glide(420, 1400, 0.55, vib=0.025, vibhz=7)
    y = (x + 0.15 * np.sign(x) * np.abs(x) ** 3) * env(len(x), 0.03, 0.6, 1) * np.clip((0.55 - t(0.55)) / 0.08, 0, 1)
    return room(lp(y, 6000), 0.15, 0.5)
S['slide-up'] = slide_up
def slide_down():
    x = glide(1300, 380, 0.6, vib=0.025, vibhz=7)
    y = x * env(len(x), 0.03, 0.7, 1) * np.clip((0.6 - t(0.6)) / 0.08, 0, 1)
    return room(lp(y, 6000), 0.15, 0.5)
S['slide-down'] = slide_down
def tada():     # brassy two-note fanfare (detuned saws, filtered)
    def brass(f, dur):
        x = t(dur); y = sum(((x * f * d) % 1 - 0.5) for d in (0.996, 1.0, 1.004))
        y = lp(y, 2400) * np.clip(x / 0.03, 0, 1) * np.exp(-x * 0.8)
        y *= np.clip((dur - x) / 0.06, 0, 1); return y
    b = np.zeros(int(SR * 1.3))
    place(b, brass(note(67), 0.16) * 0.8, 0); place(b, brass(note(72), 0.9), 0.17)
    place(b, brass(note(76), 0.9) * 0.6, 0.17); place(b, brass(note(79), 0.9) * 0.45, 0.17)
    return room(b, 0.3, 1.2)
S['tada'] = tada
def drumroll():
    b = np.zeros(int(SR * 1.9))
    for i in range(36):
        at = i * 0.025; amp = 0.15 + 0.6 * (i / 36) ** 1.6
        place(b, bp(noise(0.03), 1500, 7000) * env(int(SR * 0.03), 0.0005, 0.012) * amp, at)
    crash = hp(noise(1.0), 4000) * env(int(SR * 1.0), 0.001, 0.35) * 0.9
    place(b, crash, 0.92); place(b, glide(120, 60, 0.2) * env(int(SR * 0.2), 0.001, 0.08) * 0.8, 0.92)
    return room(b, 0.25, 1.0)
S['drumroll'] = drumroll
def boop():
    x = glide(880, 520, 0.13) * env(int(SR * 0.13), 0.004, 0.06)
    return room(x + 0.2 * glide(1760, 1040, 0.13) * env(int(SR * 0.13), 0.004, 0.03), 0.15, 0.4)
S['boop'] = boop
def zip_up():
    x = glide(300, 2400, 0.16) * env(int(SR * 0.16), 0.002, 0.2, 1)
    return room(x * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 90 * t(0.16)))), 0.12, 0.4)
S['zip'] = zip_up
def harp():
    b = np.zeros(int(SR * 1.6)); scale = [60, 64, 67, 71, 72, 76, 79, 83, 84, 88]
    for i, m in enumerate(scale): place(b, pluck(note(m), 1.0, 0.35), i * 0.045)
    return room(lp(b, 7000), 0.35, 1.4)
S['harp'] = harp
def tick():
    x = bp(noise(0.03), 900, 2200) * env(int(SR * 0.03), 0.0005, 0.008) + 0.6 * np.sin(2 * np.pi * 1300 * t(0.03)) * env(int(SR * 0.03), 0.0005, 0.01)
    return room(x, 0.1, 0.3)
S['tick'] = tick
def ding():
    return room(bell(note(88), 1.4, 0.9), 0.3, 1.2)
S['ding'] = ding
def kiss():     # a soft "mwah" lip pop for hearts (no voice): a quick low-high blip + pop
    b = np.zeros(int(SR * 0.3))
    place(b, glide(300, 900, 0.05) * env(int(SR * 0.05), 0.002, 0.03) * 0.7, 0)
    place(b, hp(noise(0.006), 2000) * 0.4, 0.05)
    return room(b, 0.2, 0.4)
S['heart-blip'] = kiss
def snore():    # a tiny sleepy "zzz" for night / see you tomorrow (soft filtered noise, two breaths)
    b = np.zeros(int(SR * 1.6))
    for k in range(2):
        seg = lp(noise(0.55), 700) * np.sin(np.pi * t(0.55) / 0.55) ** 2 * (1 + 0.5 * np.sin(2 * np.pi * 28 * t(0.55)))
        place(b, seg * 0.4, 0.1 + k * 0.75)
    return room(b, 0.2, 0.6)
S['sleepy'] = snore

def main():
    os.makedirs(OUT, exist_ok=True)
    for name, fn in S.items():
        x = finish(fn()); wav = os.path.join(OUT, name + '.wav'); m4a = os.path.join(OUT, name + '.m4a')
        pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
        import wave
        with wave.open(wav, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '96k', m4a], check=True)
        os.remove(wav)
        print(f'{name:12s} {len(x) / SR:.2f}s  {os.path.getsize(m4a) // 1024} kB')

if __name__ == '__main__':
    main()
