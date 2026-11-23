"""Make the street cars from auta.glb (a red sedan and an American police car, low poly).

Usage:  python tools/make_auta.py tools/models/props/auta.glb assets/props/auta-cars.glb

Writes one GLB with these meshes (colours are stored per vertex, so each car is only a few draw calls in the game):
  sedan_body, sedan_roof  the paint below and above the windows (the game paints them; a taxi gets a black body and a yellow roof)
  sedan_rest              glass, tyres, bumpers, trim
  sedan_lights            head lights (white, front) and tail lights (red, back)
  police_rest             the police car in Egyptian colours: white with navy panels; tyres stay black, the star becomes a gold badge
  police_lights           head and tail lights
  police_red, police_blue the two halves of the light bar (the game flashes them)
Both cars face +z, stand on y = 0, are 4.4 m long and a bit lower than the model (it is very tall).
"""
import sys, numpy as np, trimesh

src, dst = sys.argv[1], sys.argv[2]
LENGTH, SQUASH = 4.4, .85
scene = trimesh.load(src, force='scene')
cars = {'police': [], 'sedan': []}
for node in scene.graph.nodes_geometry:
    T, gname = scene.graph[node]; g = scene.geometry[gname].copy(); g.apply_transform(T)
    vis = g.visual
    if hasattr(vis, 'material'):
        m = vis.material; c = getattr(m, 'baseColorFactor', None); name = m.name
        col = np.array(c[:3], float) / 255 if c is not None else np.array([1., 1., 1.])
    else:
        name = 'vc'; col = np.array(vis.vertex_colors[0][:3], float) / 255
    cars['police' if node.startswith('police') else 'sedan'].append((name, col, g))

def srgb(h): h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float) / 255

GLASS, NAVY, GOLD, AMBER = srgb('#22343e'), srgb('#14306b'), srgb('#d8a630'), srgb('#ff9a1a')
out = trimesh.Scene()

def place(meshes):
    """Turn (front was -x, now +z), centre, stand on the ground, scale."""
    allv = np.vstack([g.vertices for _, _, g in meshes])
    lo, hi = allv.min(0), allv.max(0); s = LENGTH / (hi[0] - lo[0])
    cx, cz, y0 = (lo[0] + hi[0]) / 2, (lo[2] + hi[2]) / 2, lo[1]
    for _, _, g in meshes:
        v = g.vertices.copy()
        x, y, z = v[:, 0] - cx, v[:, 1] - y0, v[:, 2] - cz
        g.vertices = np.c_[z * s, y * s * SQUASH, -x * s]   # x' = z, z' = -x: the front (-x) goes to +z
    return s

def wheel_mask(g, wheels, r):
    c = g.triangles_center
    return np.any([np.hypot(c[:, 2] - wz, c[:, 1] - wy) < r for wz, wy in wheels], axis=0)

def colored_mesh(parts, name):
    """parts: list of (mesh, face mask, rgb per face or one rgb)"""
    vs, fs, cs, n = [], [], [], 0
    for g, mask, rgb in parts:
        idx = np.where(mask)[0]
        if not len(idx): continue
        sub = g.submesh([idx], append=True)
        fc = rgb[idx] if np.ndim(rgb) == 2 else np.tile(rgb, (len(idx), 1))
        # one colour per face: unshare the vertices
        tri = sub.vertices[sub.faces].reshape(-1, 3)
        vs.append(tri); fs.append(np.arange(len(tri)).reshape(-1, 3) + n); cs.append(np.repeat(fc, 3, axis=0)); n += len(tri)
    if not vs: return None
    m = trimesh.Trimesh(np.vstack(vs), np.vstack(fs), process=False)
    lin = np.clip(np.vstack(cs), 0, 1) ** 2.2                                       # glTF vertex colours are linear
    rgba = np.c_[lin * 255, np.full(n, 255)].round().astype(np.uint8)
    m.visual = trimesh.visual.ColorVisuals(m, vertex_colors=rgba)
    out.add_geometry(m, geom_name=name, node_name=name)
    return m

for car, meshes in cars.items():
    place(meshes)
    allv = np.vstack([g.vertices for _, _, g in meshes]); L = allv[:, 2].max()
    # wheels: the rims (mid grey 66) sit in two groups, front and back
    rims = np.vstack([g.triangles_center for nm, col, g in meshes if abs(col[0] - 66 / 255) < .02 and col[0] == col[1]])
    low = rims[rims[:, 1] < np.percentile(rims[:, 1], 60)]
    wz = [low[low[:, 2] < 0][:, 2].mean(), low[low[:, 2] > 0][:, 2].mean()]
    wy = np.median(low[:, 1]); wr = (allv[:, 1].min() * -1 + wy) + .08          # radius: from the ground to the centre, plus a bit
    wheels = [(z, wy) for z in wz]
    body, roof, rest, lights, red, blue = [], [], [], [], [], []
    glass_y = min(g.vertices[:, 1].min() for nm, col, g in meshes if np.allclose(col, [100 / 255, 204 / 255, 181 / 255], atol=.02))
    for nm, col, g in meshes:
        F = len(g.faces); every = np.ones(F, bool); c = g.triangles_center
        front = c[:, 2] > 0
        if np.allclose(col, [100 / 255, 204 / 255, 181 / 255], atol=.02):          # glass
            rest.append((g, every, GLASS)); continue
        if nm == 'Material.006' or nm == 'vc' and car == 'sedan':                     # lamps
            lights.append((g, every, np.where(front[:, None], [1, .97, .9], [1, .1, .1]))); continue
        if abs(col[0] - 251 / 255) < .02 and abs(col[1] - 75 / 255) < .02:             # orange: indicators (and the sheriff star)
            ends = np.abs(c[:, 2]) > L - .45
            if car == 'police':
                lights.append((g, ends, np.where(front[:, None], [1, .97, .9], [1, .1, .1])))
                rest.append((g, ~ends, GOLD))
            else: rest.append((g, every, AMBER))
            continue
        if car == 'police' and col[0] > .7 and col[1] < .1:  red.append((g, every, [1, .15, .15])); continue
        if car == 'police' and col[2] > .7 and col[0] < .1:  blue.append((g, every, [.2, .35, 1])); continue
        if car == 'sedan' and col[0] > .5 and col[1] < .05:                            # the paint
            up = c[:, 1] > glass_y - .02
            roof.append((g, up, [1, 1, 1])); body.append((g, ~up, [1, 1, 1])); continue
        if car == 'police' and col.max() < .05:                                        # black: tyres stay, panels go navy
            tyre = wheel_mask(g, wheels, wr)
            rest.append((g, tyre, [.06, .06, .06])); rest.append((g, ~tyre, NAVY)); continue
        rest.append((g, every, col))
    pre = car + '_'
    if car == 'sedan':
        colored_mesh(body, pre + 'body'); colored_mesh(roof, pre + 'roof')
    colored_mesh(rest, pre + 'rest'); colored_mesh(lights, pre + 'lights')
    if car == 'police': colored_mesh(red, pre + 'red'); colored_mesh(blue, pre + 'blue')
    tyres = np.vstack([g.triangles_center for nm, col, g in meshes if col.max() < .05])
    tyres = tyres[tyres[:, 1] < .7]
    print('   tyres: z', np.round([tyres[tyres[:, 2] < 0][:, 2].mean(), tyres[tyres[:, 2] > 0][:, 2].mean()], 2), 'x', np.round(np.abs(tyres[:, 0]).max(), 2), 'y', np.round(tyres[:, 1].max(), 2))
    print(car, 'wheels z', np.round(wz, 2), 'y', round(float(wy), 2), 'r', round(float(wr), 2), 'size', np.round(allv.max(0) - allv.min(0), 2))
out.export(dst, include_normals=True)   # flat normals (each face keeps its own vertices)
for n, g in out.geometry.items(): print(' ', n, len(g.faces), 'faces')
