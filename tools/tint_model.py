"""Recolour the light, plain parts of a model's clothes in a height band (for example a white shirt -> pink).

Usage:  python tools/tint_model.py <in.glb> <out.glb> <y_from> <y_to> <hex colour> [min_brightness] [max_saturation]
  y_from / y_to are heights as a share of the model height (0 = feet, 1 = top of the head).
Works on GLBs written by tools/shrink_model.py (one mesh, one JPEG texture). Shading is kept: each pixel
keeps its brightness and only takes on the new colour, so folds and shadows still show.
"""
import sys, json, struct, io
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src, dst, y0, y1, hexc = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
min_v = float(sys.argv[6]) if len(sys.argv) > 6 else .55
max_s = float(sys.argv[7]) if len(sys.argv) > 7 else .22
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

# which texture pixels belong to triangles in the height band
H = pos[:, 1].max() - pos[:, 1].min(); lo = pos[:, 1].min()
cy = (pos[idx][:, :, 1].mean(1) - lo) / H
mask = Image.new('L', (W, Hh), 0); dr = ImageDraw.Draw(mask)
for tri in idx[(cy >= y0) & (cy <= y1)]:
    dr.polygon([(uv[k, 0] * W, uv[k, 1] * Hh) for k in tri], fill=255)
mask = np.asarray(mask.filter(ImageFilter.MaxFilter(5))) > 0

px = np.asarray(img).astype(np.float32) / 255
mx, mn = px.max(2), px.min(2); sat = (mx - mn) / np.maximum(mx, 1e-4)
pick = mask & (mx >= min_v) & (sat <= max_s)
lum = (px * [.299, .587, .114]).sum(2, keepdims=True)
out = px.copy(); out[pick] = np.clip(lum[pick] / .93 * tint, 0, 1)
print(f'recoloured {pick.sum()} of {mask.sum()} pixels in the band')
jb = io.BytesIO(); Image.fromarray((out * 255).astype(np.uint8)).save(jb, 'JPEG', quality=86, optimize=True); jb = jb.getvalue()

# rewrite: same buffers, image last and resized
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
