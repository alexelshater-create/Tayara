"""Give an OBJ without its .mtl/textures plain colours per material, as one mesh with a small palette texture
(so tools/shrink_model.py can take it like any generated model).

Usage:  python tools/color_obj.py <in.obj> <out.glb> material=#hex [material=#hex ...] [default=#hex] [--hide=body:clothes]
"""
import sys, numpy as np, trimesh
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
opts = [a for a in sys.argv[3:] if a.startswith('--')]
cols = dict(a.split('=', 1) for a in sys.argv[3:] if not a.startswith('--'))
default = cols.pop('default', '#9a9a9a')
V, F, cur = [], {}, None
with open(src, encoding='utf-8', errors='replace') as f:
    for line in f:
        if line.startswith('v '): V.append(list(map(float, line.split()[1:4])))
        elif line.startswith('usemtl'): cur = line.split(None, 1)[1].strip()
        elif line.startswith('f '):
            idx = [int(p.split('/')[0]) for p in line.split()[1:]]
            F.setdefault(cur, []).extend([idx[0], idx[i], idx[i + 1]] for i in range(1, len(idx) - 1))
V = np.array(V)
# --hide=inner:outer drops the faces of material inner that lie inside the clothes outer (a body under a robe would poke through)
for o in opts:
    if not o.startswith('--hide='): continue
    inner, outer = o[7:].split(':'); fi = np.array(F[inner]) - 1; fo = np.array(F[outer]) - 1
    H = V[:, 1].max() - V[:, 1].min(); y0 = V[:, 1].min(); ov = V[np.unique(fo.ravel())]; cx = np.median(ov[:, 0])
    bands = np.linspace(ov[:, 1].min(), ov[:, 1].max(), 60); keep = []
    for tri in fi:
        c = V[tri].mean(0); b = ov[np.abs(ov[:, 1] - c[1]) < .012 * H]
        if len(b) < 8 or c[1] < ov[:, 1].min() + .01 * H or c[1] > ov[:, 1].max() - .005 * H: keep.append(tri); continue
        inside = (np.abs(c[0] - cx) < np.abs(b[:, 0] - cx).max() - .004 * H) and (b[:, 2].min() + .002 * H < c[2] < b[:, 2].max() - .002 * H)
        if not inside: keep.append(tri)
    print(f'{inner}: hid {len(fi) - len(keep)} of {len(fi)} triangles under {outer}'); F[inner] = list((np.array(keep) + 1).tolist())
names = list(F); n = len(names); cell = 16; grid = int(np.ceil(np.sqrt(n)))
pal = Image.new('RGB', (grid * cell, grid * cell), default)
verts, faces, uvs = [], [], []; off = 0
for k, name in enumerate(names):
    hexc = cols.get(name, default).lstrip('#'); rgb = tuple(int(hexc[i:i+2], 16) for i in (0, 2, 4))
    cx, cy = k % grid, k // grid; pal.paste(Image.new('RGB', (cell, cell), rgb), (cx * cell, cy * cell))
    fa = np.array(F[name]) - 1; u, inv = np.unique(fa.ravel(), return_inverse=True)
    verts.append(V[u]); faces.append(inv.reshape(-1, 3) + off); off += len(u)
    uvs.append(np.tile([(cx + .5) / grid, 1 - (cy + .5) / grid], (len(u), 1)))
    print(name, len(fa), 'triangles ->', '#' + hexc)
mat = trimesh.visual.material.PBRMaterial(baseColorTexture=pal, metallicFactor=0, roughnessFactor=.85)
mesh = trimesh.Trimesh(np.concatenate(verts), np.concatenate(faces), visual=trimesh.visual.TextureVisuals(uv=np.concatenate(uvs), material=mat), process=False)
mesh.export(dst); print('saved', dst)
