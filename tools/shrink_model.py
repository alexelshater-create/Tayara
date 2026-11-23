"""Make a phone-friendly copy of a generated character model.

Usage:  python tools/shrink_model.py <input.glb> <output.glb> [target_triangles] [texture_px]

Image-to-3D sites export one heavy mesh (~300k triangles) whose texture layout is cut into
thousands of tiny islands, so shrinking it directly smears the colours. Instead:
  1. shrink the shape only (quadric edge collapse),
  2. lay out a fresh, tidy UV atlas with xatlas,
  3. bake the colours from the original high-detail model onto the new layout (MeshLab transfer),
then stand it on the ground (feet at y = 0), scale it to 1.8 m and save a GLB with a JPEG texture.
Needs:  pip install trimesh pymeshlab xatlas networkx pillow
"""
import os, sys, tempfile, json, struct, io
import numpy as np
import trimesh, pymeshlab, xatlas
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
target = int(sys.argv[3]) if len(sys.argv) > 3 else 20000
tpx = int(sys.argv[4]) if len(sys.argv) > 4 else 2048
tmp = tempfile.mkdtemp()

scene = trimesh.load(src, force='scene')
mesh = trimesh.util.concatenate(list(scene.dump()))
mat = mesh.visual.material
tex = getattr(mat, 'baseColorTexture', None) or getattr(mat, 'image', None)
print('input:', len(mesh.faces), 'triangles; texture', tex.size)

# 1) the original, textured, as OBJ (so MeshLab reads the UV of every triangle corner)
tex.convert('RGB').save(os.path.join(tmp, 'tex.png'))
with open(os.path.join(tmp, 'm.mtl'), 'w') as f: f.write('newmtl mat0\nKd 1 1 1\nmap_Kd tex.png\n')
with open(os.path.join(tmp, 'm.obj'), 'w') as f:
    f.write('mtllib m.mtl\nusemtl mat0\n')
    f.writelines(f'v {x:.6f} {y:.6f} {z:.6f}\n' for x, y, z in mesh.vertices)
    f.writelines(f'vt {u:.6f} {v:.6f}\n' for u, v in mesh.visual.uv)
    f.writelines(f'f {a}/{a} {b}/{b} {c}/{c}\n' for a, b, c in mesh.faces + 1)

# where the face and hands are (in the source's own units): they keep more triangles and more texture
lo3, hi3 = mesh.vertices.min(0), mesh.vertices.max(0); Hs = hi3[1] - lo3[1]; cx = (lo3[0] + hi3[0]) / 2
headY = lo3[1] + .82 * Hs; hw = .12 * Hs   # the head: high up AND near the middle (in a T-pose the arms are up there too)
inhead = (mesh.vertices[:, 1] > headY) & (np.abs(mesh.vertices[:, 0] - cx) < hw); hz = mesh.vertices[inhead][:, 2].mean(); handX = .78 * np.abs(mesh.vertices[:, 0] - cx).max()

ms = pymeshlab.MeshSet()
ms.load_new_mesh(os.path.join(tmp, 'm.obj'))                     # mesh 0: source with texture
# 2) a shrunk copy of the shape: the face counts 3x, the back of the head 1.3x, the hands 2x, so they keep their detail
ms.generate_copy_of_current_mesh()                                 # mesh 1
ms.meshing_remove_duplicate_vertices()
ms.compute_scalar_by_function_per_vertex(q=f'((y > {headY:.5f}) && (abs(x - {cx:.5f}) < {hw:.5f})) ? ((z > {hz:.5f}) ? 3 : 1.3) : ((abs(x - {cx:.5f}) > {handX:.5f}) ? 2 : 1)')
ms.meshing_decimation_quadric_edge_collapse(targetfacenum=target, qualitythr=0.4, preservenormal=True, optimalplacement=True, planarquadric=True, qualityweight=True)
lo_v = ms.current_mesh().vertex_matrix(); lo_f = ms.current_mesh().face_matrix()
fc = lo_v[lo_f].mean(1); print('shape:', len(lo_f), 'triangles,', int(((fc[:, 1] > headY) & (np.abs(fc[:, 0] - cx) < hw)).sum()), 'of them in the head')
# 3) a tidy UV atlas; the head is laid out at 1.9x size (hands 1.4x) so it gets more of the texture
lay = lo_v.copy(); hd = (lay[:, 1] > headY - .02 * Hs) & (np.abs(lay[:, 0] - cx) < hw); hc = lay[hd].mean(0); lay[hd] = hc + (lay[hd] - hc) * 1.9
hn = (np.abs(lay[:, 0] - cx) > handX) & ~hd
for sgn in (-1, 1):
    m_ = hn & (np.sign(lay[:, 0] - cx) == sgn)
    if m_.any(): c_ = lay[m_].mean(0); lay[m_] = c_ + (lay[m_] - c_) * 1.4
vmap, idx, uvs = xatlas.parametrize(lay, lo_f)
nm = pymeshlab.Mesh(vertex_matrix=lo_v[vmap].astype(np.float64), face_matrix=idx.astype(np.int32), v_tex_coords_matrix=uvs.astype(np.float64))
ms.add_mesh(nm, 'atlas')                                           # mesh 2
ms.compute_texcoord_transfer_vertex_to_wedge()
# 4) bake the colours from mesh 0 onto mesh 2
ms.transfer_attributes_to_texture_per_vertex(sourcemesh=0, targetmesh=2, attributeenum='Texture Color', textname='baked.png', textw=tpx, texth=tpx, overwrite=False, pullpush=True)
ms.save_current_mesh(os.path.join(tmp, 'baked.obj'), save_wedge_texcoord=True)
baked_png = next(os.path.join(tmp, n) for n in os.listdir(tmp) if n.startswith('baked') and n.endswith('.png'))

# 5) ground, scale, and write a clean GLB: positions, smooth normals (computed before the UV cut, so no seams), UVs, indices, one JPEG
lo_n = trimesh.Trimesh(lo_v, lo_f, process=False).vertex_normals
v = lo_v[vmap].astype(np.float64); lo, hi = v.min(0), v.max(0)
v[:, 0] -= (lo[0] + hi[0]) / 2; v[:, 2] -= (lo[2] + hi[2]) / 2; v[:, 1] -= lo[1]; v *= 1.8 / (hi[1] - lo[1])
pos = v.astype(np.float32); nor = lo_n[vmap].astype(np.float32)
uv = uvs.astype(np.float32).copy(); uv[:, 1] = 1 - uv[:, 1]                       # MeshLab UVs start at the bottom, glTF at the top
idx = idx.astype(np.uint16 if len(pos) < 65536 else np.uint32).ravel()
from PIL import ImageFilter
img = Image.open(baked_png).convert('RGB').filter(ImageFilter.UnsharpMask(radius=1.4, percent=45, threshold=2))
jb = io.BytesIO(); img.save(jb, 'JPEG', quality=88, optimize=True); jb = jb.getvalue()
binary, views = bytearray(), []
def add(data, target=None):
    binary.extend(b'\x00' * ((-len(binary)) % 4)); off = len(binary); binary.extend(data)
    v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
    if target: v['target'] = target
    views.append(v); return len(views) - 1
bp, bn, bu, bi, bimg = add(pos.tobytes(), 34962), add(nor.tobytes(), 34962), add(uv.tobytes(), 34962), add(idx.tobytes(), 34963), add(jb)
binary.extend(b'\x00' * ((-len(binary)) % 4))
j = {'asset': {'version': '2.0', 'generator': 'tayara shrink_model.py'}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0, 'name': 'body'}],
     'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2}, 'indices': 3, 'material': 0}]}],
     'materials': [{'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0.0, 'roughnessFactor': 0.85}}],
     'textures': [{'source': 0, 'sampler': 0}], 'samplers': [{'magFilter': 9729, 'minFilter': 9987}], 'images': [{'bufferView': bimg, 'mimeType': 'image/jpeg'}],
     'accessors': [
        {'bufferView': bp, 'componentType': 5126, 'count': len(pos), 'type': 'VEC3', 'min': pos.min(0).tolist(), 'max': pos.max(0).tolist()},
        {'bufferView': bn, 'componentType': 5126, 'count': len(nor), 'type': 'VEC3'},
        {'bufferView': bu, 'componentType': 5126, 'count': len(uv), 'type': 'VEC2'},
        {'bufferView': bi, 'componentType': 5123 if idx.dtype == np.uint16 else 5125, 'count': len(idx), 'type': 'SCALAR'}],
     'bufferViews': views, 'buffers': [{'byteLength': len(binary)}]}
js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * ((-len(js)) % 4)
out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(binary)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(binary), 0x004E4942) + bytes(binary)
open(dst, 'wb').write(out)
print('saved', dst, len(out) // 1024, 'KB ·', len(pos), 'vertices ·', len(idx) // 3, 'triangles · texture', img.size)
