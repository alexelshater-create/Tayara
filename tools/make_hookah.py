"""Turn the plain shisha OBJ (one grey mesh) into a small coloured GLB for the game.

Usage:  python tools/make_hookah.py <hookah.obj> <out.glb> [target_triangles] [height_m]
The parts are told apart by where they are: the glass jar at the bottom, the brass stem, the metal tray,
the clay bowl on top and the hose that hangs out to the side; each gets its own material.
"""
import sys, numpy as np, trimesh, pymeshlab, os, tempfile

src, dst = sys.argv[1], sys.argv[2]
target = int(sys.argv[3]) if len(sys.argv) > 3 else 9000
height = float(sys.argv[4]) if len(sys.argv) > 4 else .85

ms = pymeshlab.MeshSet(); ms.load_new_mesh(src)
ms.meshing_remove_duplicate_vertices()
ms.meshing_decimation_quadric_edge_collapse(targetfacenum=target, qualitythr=.5, preservenormal=True, optimalplacement=True, planarquadric=True)
v = ms.current_mesh().vertex_matrix().copy(); f = ms.current_mesh().face_matrix()
lo = v.min(0); v[:, 1] -= lo[1]; H = v[:, 1].max()
mid = v[(v[:, 1] > .5 * H) & (v[:, 1] < .7 * H)]; ax, az = np.median(mid[:, 0]), np.median(mid[:, 2])   # the stem's axis
v[:, 0] -= ax; v[:, 2] -= az; v *= height / H; H = height
c = v[f].mean(1); r = np.hypot(c[:, 0], c[:, 2]); y = c[:, 1] / H
# the jar's outline: its widest radius at each height near the bottom
jar_r = np.interp(y, [0, .08, .18, .28, .34], [.13, .13, .12, .07, .045]) * H
part = np.full(len(f), 'brass', object)
part[(y < .34) & (r < jar_r)] = 'glass'
part[(y > .82) & (r > .05 * H)] = 'tray'
part[y > .9] = 'clay'
part[(y > .9) & (r > .07 * H)] = 'tray'
hose = ((y > .05) & (y < .8) & (r > .085 * H) & (part != 'glass')) | ((y <= .05) & (r > .14 * H))
part[hose] = 'hose'
mats = {
    'glass': trimesh.visual.material.PBRMaterial(name='glass', baseColorFactor=[40, 120, 110, 150], metallicFactor=.1, roughnessFactor=.08, alphaMode='BLEND', doubleSided=True),
    'brass': trimesh.visual.material.PBRMaterial(name='brass', baseColorFactor=[200, 150, 60, 255], metallicFactor=.9, roughnessFactor=.3),
    'tray':  trimesh.visual.material.PBRMaterial(name='tray', baseColorFactor=[190, 190, 195, 255], metallicFactor=.9, roughnessFactor=.25),
    'clay':  trimesh.visual.material.PBRMaterial(name='clay', baseColorFactor=[140, 70, 40, 255], metallicFactor=0, roughnessFactor=.8),
    'hose':  trimesh.visual.material.PBRMaterial(name='hose', baseColorFactor=[110, 25, 30, 255], metallicFactor=0, roughnessFactor=.6),
}
scene = trimesh.Scene()
for k, m in mats.items():
    sel = f[part == k]
    if not len(sel): continue
    used, inv = np.unique(sel.ravel(), return_inverse=True)
    mesh = trimesh.Trimesh(v[used], inv.reshape(-1, 3), process=False)
    mesh.visual = trimesh.visual.TextureVisuals(material=m)
    scene.add_geometry(mesh, node_name=k, geom_name=k)
    print(k, len(sel), 'triangles')
scene.export(dst); print('saved', dst, os.path.getsize(dst) // 1024, 'KB, height', height)
