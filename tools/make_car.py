"""Make a game-ready car GLB from a heavy car model (GLB from Blender etc.).

Usage:  python tools/make_car.py <in.glb> <out.glb> [paint hex] [target_triangles] [length_m] [--flip] [--glass=material,...]
- drops the ground plane and anything lying away from the car body (spare wheels, studio props),
- turns the car to face +z (the game's forward; the side with the headlights / the shorter overhang check),
- stands it on the ground, scales it to length_m, joins the parts by material and shrinks them,
- repaints the material called "body" (or "paint") with the paint colour.
"""
import sys, os, numpy as np, trimesh, pymeshlab

src, dst = sys.argv[1], sys.argv[2]
paint = sys.argv[3] if len(sys.argv) > 3 else ''
target = int(sys.argv[4]) if len(sys.argv) > 4 else 40000
length = float(sys.argv[5]) if len(sys.argv) > 5 else 4.6

scene = trimesh.load(src, force='scene')
parts = []
for node in scene.graph.nodes_geometry:
    T, gname = scene.graph[node]; g = scene.geometry[gname].copy(); g.apply_transform(T); parts.append(g)
# the body: the part with the material named body/paint, else the biggest
def mname(g): return (getattr(getattr(g.visual, 'material', None), 'name', '') or '').lower()
body = [g for g in parts if mname(g) in ('body', 'paint', 'carpaint')]
bb = trimesh.util.concatenate(body if body else [max(parts, key=lambda g: len(g.faces))]).bounds
pad = .15 * (bb[1] - bb[0]).max()
keep = []
for g in parts:
    e = g.extents
    if e.min() < 1e-3 * e.max() and e.max() > 3 * (bb[1] - bb[0]).max(): continue      # ground plane
    c = g.bounds.mean(0)
    if np.any(c < bb[0] - pad) or np.any(c > bb[1] + pad): continue                    # spare parts lying around
    keep.append(g)
print('kept', len(keep), 'of', len(parts), 'parts')
allv = np.concatenate([g.vertices for g in keep]); lo, hi = allv.min(0), allv.max(0); ext = hi - lo
up = 1; long_ax = 0 if ext[0] > ext[2] else 2
# put the length along z
M = np.eye(4)
if long_ax == 0: M = trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0])
for g in keep: g.apply_transform(M)
allv = np.concatenate([g.vertices for g in keep]); lo, hi = allv.min(0), allv.max(0)
# which end is the front: the windscreen/cabin sits nearer the back on most cars; the higher roof part's centre
top = allv[allv[:, 1] > lo[1] + .8 * (hi[1] - lo[1])]
mid_z = (lo[2] + hi[2]) / 2
front_is_neg = top[:, 2].mean() > mid_z          # cabin behind the middle -> the long nose is toward -z
if '--flip' in sys.argv: front_is_neg = not front_is_neg
if front_is_neg:
    R = trimesh.transformations.rotation_matrix(np.pi, [0, 1, 0])
    for g in keep: g.apply_transform(R)
allv = np.concatenate([g.vertices for g in keep]); lo, hi = allv.min(0), allv.max(0)
s = length / (hi[2] - lo[2])
T = trimesh.transformations.scale_and_translate(s, [-(lo[0] + hi[0]) / 2 * s, -lo[1] * s, -(lo[2] + hi[2]) / 2 * s])
for g in keep: g.apply_transform(T)
# join by material, shrink
bymat = {}
for g in keep: bymat.setdefault(mname(g) or 'mat', []).append(g)
total = sum(len(g.faces) for g in keep)
out = trimesh.Scene()
for name, gl in bymat.items():
    m = trimesh.util.concatenate(gl)
    want = max(200, int(target * len(m.faces) / total))
    if len(m.faces) > want:
        ms = pymeshlab.MeshSet(); ms.add_mesh(pymeshlab.Mesh(m.vertices, m.faces.astype(np.int32)))
        ms.meshing_remove_duplicate_vertices()
        ms.meshing_decimation_quadric_edge_collapse(targetfacenum=want, qualitythr=.5, preservenormal=True, optimalplacement=True)
        mat = getattr(m.visual, 'material', None); mm = ms.current_mesh()
        m = trimesh.Trimesh(mm.vertex_matrix(), mm.face_matrix(), process=False)
        if mat is not None: m.visual = trimesh.visual.TextureVisuals(material=mat)
    mat = getattr(m.visual, 'material', None)
    if paint and name in ('body', 'paint', 'carpaint') and mat is not None:
        rgb = [int(paint.lstrip('#')[i:i+2], 16) for i in (0, 2, 4)]
        try: mat.baseColorFactor = rgb + [255]; mat.baseColorTexture = None; mat.metallicFactor = .55; mat.roughnessFactor = .28
        except Exception: pass
    extra_glass = next((a.split('=', 1)[1].split(',') for a in sys.argv if a.startswith('--glass=')), [])
    if mat is not None and ('glass' in name or name in extra_glass):          # windows: dark tinted, see-through (--glass=name,... for windows with other names)
        try: mat.baseColorFactor = [20, 28, 34, 170]; mat.alphaMode = 'BLEND'; mat.baseColorTexture = None; mat.metallicFactor = .3; mat.roughnessFactor = .05
        except Exception: pass
    if mat is not None and any(k in name for k in ('wheel', 'tire', 'tyre', 'rubber')):   # tyres: black rubber
        try: mat.baseColorFactor = [24, 24, 26, 255]; mat.baseColorTexture = None; mat.metallicFactor = 0; mat.roughnessFactor = .9
        except Exception: pass
    # some exporters drop the colour of plain materials (they come out white): colour them by name
    NAMED = { 'black_m': ([18, 18, 20, 255], .2, .5), 'black': ([10, 10, 12, 255], 0, .5), 'silver': ([178, 182, 186, 255], .95, .3), 'red': ([150, 8, 14, 255], 0, .3), 'grey': ([90, 92, 95, 255], .3, .5), 'bottom': ([25, 25, 27, 255], 0, .8) }
    if mat is not None:
        try:
            key = next((k for k in NAMED if name.startswith(k)), None)
            base = list(getattr(mat, 'baseColorFactor', None) if getattr(mat, 'baseColorFactor', None) is not None else [255, 255, 255, 255])
            if key and (base[:3] in ([255, 255, 255], [1, 1, 1]) or True) and name not in ('body', 'paint', 'carpaint'):
                c, me, ro = NAMED[key]; mat.baseColorFactor = c; mat.metallicFactor = me; mat.roughnessFactor = ro
            elif key is None and getattr(mat, 'baseColorTexture', None) is None and list(base[:3]) in ([255, 255, 255], [1, 1, 1]) and 'glass' not in name and name not in ('body', 'paint', 'carpaint'):
                mat.baseColorFactor = [42, 42, 45, 255]
        except Exception as e: print('colour', name, e)
    out.add_geometry(m, node_name=name, geom_name=name); print(name, len(m.faces))
out.export(dst); print('saved', dst, os.path.getsize(dst) // 1024, 'KB; size', out.extents.round(2), '; front turned' if front_is_neg else '')
