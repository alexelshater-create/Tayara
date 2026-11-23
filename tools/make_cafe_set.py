"""Make the café furniture GLB (one chair + one table) from the bistro dining set OBJ.

Usage:  python tools/make_cafe_set.py <Dining_set.obj> <out.glb>
The set has a square table (top + pedestal) and four chairs set diagonally around it, in millimetres, with
placeholder colours. We keep one chair turned to face +z (its back to -z, as the game places chairs), the table
at café height, shrink them, and give them real colours: dark green metal chairs, white marble top, iron base.
"""
import sys, os, numpy as np, trimesh, pymeshlab

src, dst = sys.argv[1], sys.argv[2]
s = trimesh.load(src, force='scene', group_material=False)
parts = list(s.geometry.values())
def simplify(mesh, target):
    if len(mesh.faces) <= target: return mesh
    ms = pymeshlab.MeshSet(); ms.add_mesh(pymeshlab.Mesh(mesh.vertices.astype(np.float64), mesh.faces.astype(np.int32)))
    ms.meshing_remove_duplicate_vertices()
    ms.meshing_decimation_quadric_edge_collapse(targetfacenum=target, qualitythr=.5, preservenormal=True, optimalplacement=True)
    m = ms.current_mesh(); return trimesh.Trimesh(m.vertex_matrix(), m.face_matrix(), process=False)

top = max(parts, key=lambda g: g.extents[0] * g.extents[2] / max(g.extents[1], 1e-6))          # the flat square top
chairs = [g for g in parts if g is not top and g.extents[1] > 800]
base = [g for g in parts if g is not top and g not in chairs][0]
# one chair: it faces the table centre; turn it to face +z around its own centre
ch = chairs[0].copy(); c = ch.centroid
yaw = np.arctan2(-c[0], -c[2])                                   # the direction it faces (toward the table centre)
ch.apply_translation([-c[0], 0, -c[2]]); ch.apply_transform(trimesh.transformations.rotation_matrix(-yaw, [0, 1, 0]))
ch.apply_scale(.001); ch.apply_translation([0, -ch.bounds[0][1], 0])
ch = simplify(ch, 3000)
# the table: lower to café height (top at 0.73 m) and make the top 1 m across
tb = trimesh.util.concatenate([top.copy(), base.copy()]); k = 1000 / max(tb.extents[0], tb.extents[2])
S = np.diag([.001 * k, .001 * .73 / (tb.bounds[1][1] / 1000), .001 * k, 1])
toptm = top.copy(); toptm.apply_transform(S); basetm = simplify(base.copy(), 2500); basetm.apply_transform(S)
for m in (toptm, basetm): m.apply_translation([-(tb.centroid[0] * S[0, 0]), 0, -(tb.centroid[2] * S[2, 2])])

PBR = trimesh.visual.material.PBRMaterial
mats = { 'chair': PBR(name='chair', baseColorFactor=[46, 74, 52, 255], metallicFactor=.6, roughnessFactor=.45),
         'table_top': PBR(name='marble', baseColorFactor=[236, 232, 222, 255], metallicFactor=0, roughnessFactor=.25),
         'table_base': PBR(name='iron', baseColorFactor=[40, 40, 40, 255], metallicFactor=.7, roughnessFactor=.45) }
out = trimesh.Scene()
for name, m in (('chair', ch), ('table_top', toptm), ('table_base', basetm)):
    m.visual = trimesh.visual.TextureVisuals(material=mats[name]); out.add_geometry(m, node_name=name, geom_name=name)
    print(name, len(m.faces), 'triangles, size', m.extents.round(3), 'min y', round(m.bounds[0][1], 3))
out.export(dst); print('saved', dst, os.path.getsize(dst) // 1024, 'KB; chair turned by', round(np.degrees(yaw)), 'degrees')
