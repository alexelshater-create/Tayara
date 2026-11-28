# The street people (assets/models/people, Sketchfab CC-BY) → the game's character format (assets/models/p-<name>.glb):
# one plain (unskinned) mesh in its rest pose, feet on y = 0, facing +z, so the game's own auto-rig (05b-rig3d.js) can rig it.
import os, sys, numpy as np, trimesh
SRC = 'assets/models/people'; OUT = 'assets/models'
for f in sorted(os.listdir(SRC)):
    if not f.endswith('.glb'): continue
    s = trimesh.load(os.path.join(SRC, f), force='scene')
    meshes = list(s.dump())
    m = meshes[0] if len(meshes) == 1 else trimesh.util.concatenate(meshes)
    m.apply_transform(trimesh.transformations.rotation_matrix(np.pi, [0, 1, 0]))   # −z → +z
    m.vertices[:, 1] -= m.bounds[0][1]
    c = m.bounds.mean(axis=0); m.vertices[:, 0] -= c[0]; m.vertices[:, 2] -= c[2]
    out = os.path.join(OUT, 'p-' + f); m.export(out)
    print(f, len(m.faces), np.round(m.bounds, 2).tolist(), os.path.getsize(out) // 1024, 'KB')
