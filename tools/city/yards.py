# The railway yards (Qabbari / Misr station sidings): their tracks and gravel, for the game (assets/city/yards.json)
import sys, os, json
import build_city as B
from shapely.geometry import LineString
from shapely.ops import unary_union
lines = []
for e in B.load('rail'):
    t = e.get('tags', {})
    if e['type'] == 'way' and 'geometry' in e and t.get('railway') == 'rail':
        ln = LineString(B.PL(e['geometry'])).intersection(B.WORLD.buffer(-40))
        for g in (ln.geoms if hasattr(ln, 'geoms') else [ln]):
            if g.geom_type == 'LineString' and g.length > 8: lines.append(g)
land = B.coast_land()
yard = unary_union([l.buffer(3.2, cap_style=2) for l in lines]).intersection(land).buffer(0)
V = []; I = []
for p in B.iter_polys(yard):
    v, i = B.tri_ok(p.simplify(.3))
    base = len(V); V.extend([[round(x, 1), round(z, 1)] for x, z in v]); I.extend([base + k for k in i])
out = {'lines': [[[round(x, 1), round(z, 1)] for x, z in l.simplify(.4).coords] for l in lines], 'ground': {'v': V, 'i': I}}
json.dump(out, open(os.path.join(B.OUT, 'yards.json'), 'w'), separators=(',', ':'))
print('rail lines', len(lines), 'km', round(sum(l.length for l in lines) / 1000, 1), 'ground tris', len(I) // 3)
