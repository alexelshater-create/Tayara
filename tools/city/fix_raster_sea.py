# The raster draws the land polygon with PIL, which mis-fills where the coastline ring pinches (Stanley bay came out as land).
# This re-checks every plain-land pixel (value 2) against the real land polygon and turns the ones outside it back into sea.
import sys, os, json, numpy as np, shapely
from PIL import Image
import build_city as B
from shapely.geometry import box
L = B.coast_land()
I = json.load(open(os.path.join(B.OUT, 'index.json'), encoding='utf-8'))
for r in I.get('remote', []):
    x0 = -96 + r['j0'] * 48 + r['dx']; x1 = -96 + (r['j1'] + 1) * 48 + r['dx']; z0 = -96 + r['k0'] * 48 + r['dz']; z1 = -96 + (r['k1'] + 1) * 48 + r['dz']
    L = L.union(box(x0, z0, x1, z1).buffer(4))
L = L.union(B.PATCH).buffer(1.0); shapely.prepare(L)
changed = 0
for f in sorted(os.listdir(os.path.join(B.OUT, 'r'))):
    if not f.endswith('.png'): continue
    ti, tk = map(int, f[:-4].split('_')); p = os.path.join(B.OUT, 'r', f)
    a = np.array(Image.open(p)); ys, xs = np.nonzero(a == 2)
    if not len(xs): continue
    X = B.X0 + ti * 256 + xs + .5; Z = B.Z0 + tk * 256 + ys + .5
    inside = shapely.contains_xy(L, X, Z)
    bad = ~inside
    if bad.any():
        a[ys[bad], xs[bad]] = 0; changed += int(bad.sum()); Image.fromarray(a).save(p, optimize=True)
print('pixels made sea', changed)
