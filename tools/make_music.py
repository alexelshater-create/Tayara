"""Cut the game's music clips from full songs: the strongest part of each song (where it is loudest on average,
which is usually the chorus), a few seconds of fade in and out, small MP3s.

Usage:  python tools/make_music.py <folder with the songs> assets/music
The list below says which song becomes which clip and how long the clip is.
"""
import sys, os, subprocess, numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
CLIPS = [
    # name in the game, file name starts with, seconds, kbps, where it plays
    ('cafe-1', 'الليل وسماه', 120, 80, 'القهوة'),
    ('cafe-2', 'الحب اللي كان', 110, 80, 'القهوة'),
    ('cafe-3', 'George Wassouf', 120, 80, 'القهوة'),
    ('love-1', 'Wegz - ElBakht', 80, 96, 'طيارة وشادية + الراديو'),
    ('radio-1', 'Wegz - El Hazz', 75, 96, 'الراديو'),
    ('chase-1', 'AFROTO - SUPREME', 75, 96, 'المطاردات + الراديو'),
    ('mahr-1', 'اركب الدبابه', 75, 96, 'الفرح والرقصة + الراديو'),
]
os.makedirs(OUT, exist_ok=True)
files = os.listdir(SRC)
def loudness(path, rate=8000):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(rate), '-f', 's16le', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    n = len(a) // rate
    return np.sqrt((a[:n * rate].reshape(n, rate) ** 2).mean(1))       # one value per second
for name, start, secs, kbps, where in CLIPS:
    src = next((f for f in files if f.startswith(start) and f.lower().endswith('.mp3')), None)
    if not src: print('missing', start); continue
    path = os.path.join(SRC, src); rms = loudness(path); n = len(rms)
    secs = min(secs, n)
    # the loudest stretch, not in the first 10 s or the last 8 s (intros and endings)
    best, bi = -1, 0
    for i in range(min(10, max(0, n - secs)), max(1, n - secs - 8)):
        m = rms[i:i + secs].mean()
        if m > best: best, bi = m, i
    out = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(bi), '-t', str(secs), '-i', path,
                    '-af', f'afade=t=in:d=2,afade=t=out:st={secs - 3}:d=3,loudnorm=I=-16:TP=-1.5:LRA=11',
                    '-ac', '2', '-ar', '44100', '-b:a', f'{kbps}k', out], check=True)
    print(f'{name:8s} {bi // 60}:{bi % 60:02d} → +{secs}s  {os.path.getsize(out) // 1024:5d} KB  ({where})  ← {src}')
