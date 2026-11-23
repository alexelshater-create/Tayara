"""Split one long narration recording (all lines read in order) into one file per line.

Usage:  python tools/split_voice.py <in.mp3> <out_dir> <lines.json>
lines.json: [{ "id": "kamel_00_1", "text": "..." }, ...] in the order they were read.
Text-to-speech often leaves only short pauses between lines, about as long as the pauses inside a sentence,
so the longest gaps alone don't find the line ends. Instead: each line's length in letters gives its expected
duration, and the cuts are chosen among the quiet gaps so that every piece is as close as possible to its
expected duration, preferring longer gaps (a small dynamic programme). Each piece is saved as <id>.mp3 with a
little silence kept at both ends, and a report shows expected vs actual length to spot a bad cut.
"""
import sys, os, re, json, subprocess, numpy as np

src, out, linesf = sys.argv[1], sys.argv[2], sys.argv[3]
lines = json.load(open(linesf, encoding='utf-8'))
def letters(t): return len(re.sub(r'\[[^\]]*\]|[^\w]', '', t))       # audio tags and punctuation don't take time
def pauses(t): return t.count('…') + t.count('،') + t.count('.') + t.count('؟') + .5 * t.count('[')
L = len(lines)
sr = 16000; hop = sr // 50
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768; n = len(x) // hop
db = 20 * np.log10(np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1) + 1e-10))
speech, floor = np.percentile(db, 90), np.percentile(db, 5); quiet = db < floor + (speech - floor) * .25
gaps, i = [], 0
while i < n:
    if quiet[i]:
        j = i
        while j < n and quiet[j]: j += 1
        if i > 0 and j < n and j - i >= 4: gaps.append((i, j))          # at least 80 ms
        i = j
    else: i += 1
G = len(gaps); mids = np.array([(a + b) / 2 for a, b in gaps]); glen = np.array([b - a for a, b in gaps], float)
# expected durations: letters plus pauses, scaled to the whole recording
w = np.array([letters(l['text']) + 6 * pauses(l['text']) for l in lines], float); exp = w / w.sum() * n
# dp[k][g]: best cost with line k ending at gap g
INF = 1e18; dp = np.full((L, G), INF); back = np.zeros((L, G), int)
def cost(k, d): return ((d - exp[k]) / max(exp[k], 25)) ** 2
for g in range(G): dp[0][g] = cost(0, mids[g]) - .02 * glen[g]
for k in range(1, L - 1):
    for g in range(k, G):
        prev = dp[k - 1][:g] + np.array([cost(k, mids[g] - mids[p]) for p in range(g)])
        p = int(np.argmin(prev)); dp[k][g] = prev[p] - .02 * glen[g]; back[k][g] = p
last = [dp[L - 2][g] + cost(L - 1, n - mids[g]) for g in range(G)]
g = int(np.argmin(last)); cuts = [g]
for k in range(L - 2, 0, -1): g = back[k][g]; cuts.append(g)
cuts = cuts[::-1]
bounds = [0] + [int(mids[c]) for c in cuts] + [n]
os.makedirs(out, exist_ok=True); report = []
for k, l in enumerate(lines):
    s, e = bounds[k], bounds[k + 1]; seg = np.where(~quiet[s:e])[0]
    s2, e2 = (s + max(0, seg[0] - 8), s + min(e - s, seg[-1] + 8)) if len(seg) else (s, e)
    t0, t1 = s2 * hop / sr, e2 * hop / sr
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t0:.3f}', '-to', f'{t1:.3f}', '-i', src, '-c:a', 'libmp3lame', '-b:a', '96k', os.path.join(out, l['id'] + '.mp3')], check=True)
    ratio = (e - s) / exp[k]; flag = '  <-- check' if ratio < .7 or ratio > 1.4 else ''
    report.append(f"{k+1:02d} {l['id']:<14} {t0:7.2f}-{t1:7.2f}  {t1-t0:5.2f}s  expected {exp[k]*hop/sr:5.2f}s{flag}")
print('\n'.join(report))
json.dump([{'id': l['id'], 'start': round(bounds[k] * hop / sr, 2), 'end': round(bounds[k + 1] * hop / sr, 2)} for k, l in enumerate(lines)], open(os.path.join(out, 'cuts.json'), 'w'), indent=1)
