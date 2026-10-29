#!/usr/bin/env python3
"""Klavier-Sprite verkleinern: Mono, nur jeder zweite Halbton, 64 kbit/s.

Behält die Ganztöne (C D E Fis Gis Ais) jeder Oktave plus Cis5 und A5 am oberen
Rand; der Player verschiebt fehlende Töne um höchstens einen Halbton.
Aufruf (einmalig, braucht ffmpeg):
    python3 packages/sounds/scripts/slim-piano.py <alte piano.mp3> <alte piano.json> <zielordner>
"""
import json, subprocess, sys, wave, os, tempfile

src_mp3, src_json, out = sys.argv[1:4]
NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B']
KEEP_PC = {0, 2, 4, 6, 8, 10}
EXTRA = {'Cs5', 'A5'}
SR, STEP, LEN = 44100, 1650, 1600  # ms je Ton im neuen Sprite

sprite = json.load(open(src_json))['sprite']
def pc(name): return NAMES.index(name[:-1])
keep = sorted((n for n in sprite if pc(n) in KEEP_PC or n in EXTRA), key=lambda n: (int(n[-1]), pc(n)))

tmp = tempfile.mkdtemp()
wav_in = os.path.join(tmp, 'in.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src_mp3, '-ac', '1', '-ar', str(SR), '-sample_fmt', 's16', wav_in], check=True)
w = wave.open(wav_in); frames = w.readframes(w.getnframes()); w.close()
bps = 2
out_frames = bytearray()
new = {}
for k, name in enumerate(keep):
    start, dur = sprite[name]
    a = int(start / 1000 * SR) * bps
    seg = frames[a:a + int(LEN / 1000 * SR) * bps]
    seg = seg + b'\0' * (int(LEN / 1000 * SR) * bps - len(seg))
    new[name] = [k * STEP, LEN]
    out_frames += seg + b'\0' * (int((STEP - LEN) / 1000 * SR) * bps)
wav_out = os.path.join(tmp, 'out.wav')
w = wave.open(wav_out, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(out_frames)); w.close()
os.makedirs(out, exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav_out, '-codec:a', 'libmp3lame', '-b:a', '64k', '-ac', '1', os.path.join(out, 'piano.mp3')], check=True)
json.dump({'src': ['piano.mp3'], 'sprite': new}, open(os.path.join(out, 'piano.json'), 'w'), indent=1)
print(len(keep), 'Töne:', ' '.join(keep))
