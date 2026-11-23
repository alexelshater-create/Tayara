"""Flatten a rigged/multi-material character (Character Creator, Mixamo...) into one mesh with one texture,
ready for tools/shrink_model.py.

Usage:  python tools/flatten_character.py <in.glb> <out.glb> [texture_px] [--drop=material,material]
  (hair made of thousands of thin cards is better dropped: --drop=hair keeps the painted hair cap)
- the mesh is taken in its rest pose with the node transforms applied (the skeleton is dropped: the game rigs it again),
- see-through eye layers (cornea, eye occlusion, tear line) and eyelashes are left out: they would bake as dark smudges,
- every part's colour (texture or plain colour) is put into one texture atlas,
- the character is stood up (+y), scaled to its own height, and saved.
"""
import sys, os, io, numpy as np, trimesh
from PIL import Image

args = [a for a in sys.argv[1:] if not a.startswith('--')]
src, dst = args[0], args[1]; tpx = int(args[2]) if len(args) > 2 else 1024
DROP = set(next((a.split('=', 1)[1].lower().split(',') for a in sys.argv if a.startswith('--drop=')), []))   # parts to leave out by exact material name, e.g. --drop=hair,std_tongue
SKIP = ('cornea', 'occlusion', 'tearline', 'tear_line', 'eyelash', 'eyelashes')
scene = trimesh.load(src, force='scene')
parts = []
for node in scene.graph.nodes_geometry:
    T, gname = scene.graph[node]; g = scene.geometry[gname]
    mat = getattr(g.visual, 'material', None); name = (getattr(mat, 'name', '') or '').lower()
    if any(k in name for k in SKIP) or name in DROP: print('skip', name); continue
    g = g.copy(); g.apply_transform(T)
    # one image per part: its texture (made smaller) or a swatch of its plain colour
    img = None
    if mat is not None:
        img = getattr(mat, 'baseColorTexture', None) or getattr(mat, 'image', None)
    uv = getattr(g.visual, 'uv', None)
    if img is None or uv is None:
        col = getattr(mat, 'baseColorFactor', None) if mat is not None else None
        col = tuple(int(c) for c in (col[:3] if col is not None else (200, 200, 200)))
        img = Image.new('RGB', (8, 8), col); uv = np.full((len(g.vertices), 2), .5)
    img = img.convert('RGB'); img.thumbnail((tpx, tpx))
    parts.append((g, uv, img, name))
print(len(parts), 'parts')
# pack the images side by side in a grid atlas
n = len(parts); cols = int(np.ceil(np.sqrt(n))); rows = int(np.ceil(n / cols)); cell = tpx
atlas = Image.new('RGB', (cols * cell, rows * cell), (128, 128, 128))
V, F, UV = [], [], []; off = 0
for i, (g, uv, img, name) in enumerate(parts):
    cx, cy = i % cols, i // cols; im = img.resize((cell, cell)); atlas.paste(im, (cx * cell, cy * cell))
    u = np.clip(np.mod(uv[:, 0], 1.0), 0, 1); v = np.clip(np.mod(uv[:, 1], 1.0), 0, 1)
    # glTF/trimesh UVs: v up from the bottom of the image
    UV.append(np.stack([(cx + .002 + u * .996) / cols, 1 - (cy + .002 + (1 - v) * .996) / rows], 1))
    V.append(g.vertices); F.append(g.faces + off); off += len(g.vertices)
V = np.concatenate(V); F = np.concatenate(F); UV = np.concatenate(UV)
ry = next((float(a.split('=', 1)[1]) for a in sys.argv if a.startswith('--roty=')), 0)   # turn around the vertical axis (degrees), e.g. arms along z -> along x
if ry: c, s_ = np.cos(np.radians(ry)), np.sin(np.radians(ry)); V = V @ np.array([[c, 0, -s_], [0, 1, 0], [s_, 0, c]])
lo, hi = V.min(0), V.max(0); ext = hi - lo
if ext[2] > ext[1] * 1.2: V = V[:, [0, 2, 1]] * [1, 1, -1]; print('stood up (z was up)')
mat = trimesh.visual.material.PBRMaterial(baseColorTexture=atlas, metallicFactor=0, roughnessFactor=.85)
mesh = trimesh.Trimesh(V, F, visual=trimesh.visual.TextureVisuals(uv=UV, material=mat), process=False)
mesh.export(dst); print('saved', dst, os.path.getsize(dst) // 1024, 'KB;', len(F), 'triangles; atlas', atlas.size)
