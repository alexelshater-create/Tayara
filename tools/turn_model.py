"""Turn a model made by tools/shrink_model.py to face +z (the game's forward), if it faces backwards.

Usage:  python tools/turn_model.py <in.glb> <out.glb> [force]
Checks the feet: the toes stick out in front of the ankles. If they point to -z, the model is turned 180 degrees
around the vertical axis (x and z flip for positions and normals). "force" turns it without checking.
"""
import sys, json, struct
import numpy as np

src, dst = sys.argv[1], sys.argv[2]; force = len(sys.argv) > 3 and sys.argv[3] == 'force'
raw = bytearray(open(src, 'rb').read())
jl, = struct.unpack_from('<I', raw, 12); j = json.loads(raw[20:20+jl]); base = 28 + jl
prim = j['meshes'][0]['primitives'][0]
def view(name):
    a = j['accessors'][prim['attributes'][name]]; v = j['bufferViews'][a['bufferView']]
    off = base + v['byteOffset']; return np.frombuffer(raw, np.float32, a['count'] * 3, off).reshape(-1, 3).copy(), off
pos, po = view('POSITION'); nor, no = view('NORMAL')
H = pos[:, 1].max() - pos[:, 1].min(); lo = pos[:, 1].min()
feet = pos[pos[:, 1] < lo + .04 * H]; shins = pos[(pos[:, 1] > lo + .1 * H) & (pos[:, 1] < lo + .2 * H)]
forward = feet[:, 2].max() - shins[:, 2].mean(), shins[:, 2].mean() - feet[:, 2].min()   # how far the shoes reach to +z and to -z
backwards = force or forward[1] > forward[0] * 1.3
print(f'toes reach +z {forward[0]:.3f}, -z {forward[1]:.3f} ->', 'turning around' if backwards else 'already faces +z')
if backwards:
    pos[:, [0, 2]] *= -1; nor[:, [0, 2]] *= -1
    raw[po:po + pos.nbytes] = pos.astype(np.float32).tobytes(); raw[no:no + nor.nbytes] = nor.astype(np.float32).tobytes()
    a = j['accessors'][prim['attributes']['POSITION']]; a['min'] = pos.min(0).tolist(); a['max'] = pos.max(0).tolist()
    js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * ((-len(js)) % 4)
    bl, = struct.unpack_from('<I', raw, 20 + jl); binary = raw[28 + jl:28 + jl + bl]
    raw = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(binary)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(binary), 0x004E4942) + bytes(binary)
open(dst, 'wb').write(raw); print('saved', dst)
