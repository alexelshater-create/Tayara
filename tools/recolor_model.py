"""Fix colours on part of a model made by tools/shrink_model.py (one mesh, one JPEG texture).

Usage:
  python tools/recolor_model.py <in.glb> <out.glb> <y_from> <y_to> <hue_from> <hue_to> <hex colour> [min_saturation] [keep_hands] [min_brightness]
    Pixels in the height band (share of the height, 0 = feet, 1 = top) whose hue is between hue_from and hue_to
    (degrees; hue_from > hue_to wraps through 0) and whose saturation is at least min_saturation take on the new
    colour; their brightness is kept, so folds and shadows stay.
    keep_hands = 1 leaves the area around the hands alone (for skin-coloured stains on a dress next to the hands).
Examples:
  purple jacket -> royal blue:   recolor_model.py kamel.glb kamel.glb .45 .85 220 300 "#1f3fd0" .2
  skin stains on a black dress:  recolor_model.py bride.glb bride.glb .04 .62 330 50 "#161414" .12 1 .3
"""
import sys, json, struct, io, colorsys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
y0, y1, h0, h1 = map(float, sys.argv[3:7]); hexc = sys.argv[7]
smin = float(sys.argv[8]) if len(sys.argv) > 8 else .15
keep_hands = len(sys.argv) > 9 and sys.argv[9] == '1'
vmin = float(sys.argv[10]) if len(sys.argv) > 10 else 0     # only pixels at least this bright (stains on a dark dress are light)
tint = np.array([int(hexc.lstrip('#')[i:i+2], 16) for i in (0, 2, 4)], np.float32) / 255

raw = open(src, 'rb').read()
jl, = struct.unpack_from('<I', raw, 12); j = json.loads(raw[20:20+jl]); bl, = struct.unpack_from('<I', raw, 20+jl); binary = bytearray(raw[28+jl:28+jl+bl])
def acc(i, dt, n):
    a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]
    return np.frombuffer(binary, dt, a['count'] * n, v['byteOffset']).reshape(-1, n) if n > 1 else np.frombuffer(binary, dt, a['count'], v['byteOffset'])
prim = j['meshes'][0]['primitives'][0]
pos = acc(prim['attributes']['POSITION'], np.float32, 3); uv = acc(prim['attributes']['TEXCOORD_0'], np.float32, 2)
ia = j['accessors'][prim['indices']]; idx = acc(prim['indices'], np.uint16 if ia['componentType'] == 5123 else np.uint32, 1).reshape(-1, 3)
iv = j['bufferViews'][j['images'][0]['bufferView']]
img = Image.open(io.BytesIO(bytes(binary[iv['byteOffset']:iv['byteOffset'] + iv['byteLength']]))).convert('RGB'); W, Hh = img.size

H = pos[:, 1].max() - pos[:, 1].min(); lo = pos[:, 1].min()
cen = pos[idx].mean(1); cy = (cen[:, 1] - lo) / H
pick_tri = (cy >= y0) & (cy <= y1)
if keep_hands:   # the hands are the furthest points to each side in the A-pose
    for side in (-1, 1):
        k = np.argmax(pos[:, 0] * side); tip = pos[k]
        pick_tri &= np.linalg.norm(cen - tip, axis=1) > .12 * H
mask = Image.new('L', (W, Hh), 0); dr = ImageDraw.Draw(mask)
for tri in idx[pick_tri]:
    dr.polygon([(uv[k, 0] * W, uv[k, 1] * Hh) for k in tri], fill=255)
mask = np.asarray(mask.filter(ImageFilter.MaxFilter(3))) > 0

px = np.asarray(img).astype(np.float32) / 255
mx, mn = px.max(2), px.min(2); sat = (mx - mn) / np.maximum(mx, 1e-4)
r, g, b = px[..., 0], px[..., 1], px[..., 2]; d = np.maximum(mx - mn, 1e-4)
hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
inhue = (hue >= h0) & (hue <= h1) if h0 <= h1 else (hue >= h0) | (hue <= h1)
pick = mask & inhue & (sat >= smin) & (mx >= vmin)
lum = (px * [.299, .587, .114]).sum(2, keepdims=True)
med = float(np.median(lum[pick])) if pick.any() else 1.0     # the typical brightness of what is recoloured becomes the new colour; lighter and darker spots stay lighter and darker
out = px.copy(); out[pick] = np.clip(tint * (lum[pick] / max(med, .02)) ** .7, 0, 1)
print(f'recoloured {pick.sum()} of {mask.sum()} pixels in the band')
jb = io.BytesIO(); Image.fromarray((out * 255).astype(np.uint8)).save(jb, 'JPEG', quality=88, optimize=True); jb = jb.getvalue()

views = j['bufferViews']; keep = [k for k in range(len(views)) if k != j['images'][0]['bufferView']]
nb = bytearray()
for k in keep:
    v = views[k]; data = bytes(binary[v['byteOffset']:v['byteOffset'] + v['byteLength']])
    nb.extend(b'\x00' * ((-len(nb)) % 4)); v['byteOffset'] = len(nb); nb.extend(data)
nb.extend(b'\x00' * ((-len(nb)) % 4)); v = views[j['images'][0]['bufferView']]; v['byteOffset'] = len(nb); v['byteLength'] = len(jb); nb.extend(jb)
nb.extend(b'\x00' * ((-len(nb)) % 4)); j['buffers'][0]['byteLength'] = len(nb)
js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * ((-len(js)) % 4)
out_b = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(nb)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(nb), 0x004E4942) + bytes(nb)
open(dst, 'wb').write(out_b); print('saved', dst, len(out_b) // 1024, 'KB')
