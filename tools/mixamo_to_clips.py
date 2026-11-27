"""Turn Mixamo animations (FBX, "without skin") into small JSON clips the game can put on its own characters.

Usage (Blender in the background):
  blender -b --factory-startup --python tools/mixamo_to_clips.py -- <folder with .fbx> <out folder> [fps]

The game's characters have their own skeleton (05b-rig3d.js: pelvis, spine, chest, neck, head, arms, legs) with no
rotation at rest. So a clip doesn't store Mixamo's bone rotations; it stores, for every frame:
  * for the body (pelvis, spine, chest, neck, head): how much each part has turned from Mixamo's rest pose (a quaternion),
  * for the arms and legs: the direction each bone points (a unit vector),
  * where the hips are, as a fraction of the rest hip height.
The game then turns its own bones to match, whatever the shape of the character. Axes are converted to the game's
(y up, the character facing +z). Numbers are rounded to 3 decimals.
"""
import bpy, sys, os, json, glob
from mathutils import Vector, Quaternion

args = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = args[0], args[1]
FPS = int(args[2]) if len(args) > 2 else 30
os.makedirs(OUT, exist_ok=True)

BODY = {'pelvis': 'Hips', 'spine': 'Spine', 'chest': 'Spine2', 'neck': 'Neck', 'head': 'Head'}
# limb bone -> (from bone, to bone); None = use the bone's own tail
LIMB = {
    'upperArmL': ('LeftArm', 'LeftForeArm'), 'lowerArmL': ('LeftForeArm', 'LeftHand'), 'handL': ('LeftHand', None),
    'upperArmR': ('RightArm', 'RightForeArm'), 'lowerArmR': ('RightForeArm', 'RightHand'), 'handR': ('RightHand', None),
    'upperLegL': ('LeftUpLeg', 'LeftLeg'), 'lowerLegL': ('LeftLeg', 'LeftFoot'), 'footL': ('LeftFoot', 'LeftToeBase'),
    'upperLegR': ('RightUpLeg', 'RightLeg'), 'lowerLegR': ('RightLeg', 'RightFoot'), 'footR': ('RightFoot', 'RightToeBase'),
}
# Blender world (z up, Mixamo faces -y) -> game (y up, faces +z)
cv = lambda v: (v.x, v.z, -v.y)
cq = lambda q: (q.x, q.z, -q.y, q.w)          # same axis change for a rotation (three.js order x, y, z, w)
r3 = lambda a: [round(x, 3) for x in a]

def find(arm, short):
    for pb in arm.pose.bones:
        if pb.name.split(':')[-1] == short or pb.name.endswith(short) and pb.name[-len(short) - 1] in ':_':
            return pb
    return None

report = []
for path in sorted(glob.glob(os.path.join(SRC, '*.fbx'))):
    key = os.path.splitext(os.path.basename(path))[0]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=False)
    arm = next((o for o in bpy.context.scene.objects if o.type == 'ARMATURE'), None)
    if not arm or not arm.animation_data or not arm.animation_data.action:
        report.append(f'{key}: no armature/action'); continue
    act = arm.animation_data.action
    f0, f1 = act.frame_range; src_fps = bpy.context.scene.render.fps / bpy.context.scene.render.fps_base
    W = arm.matrix_world
    bones = {k: find(arm, v) for k, v in BODY.items()}
    limbs = {k: (find(arm, a), find(arm, b) if b else None) for k, (a, b) in LIMB.items()}
    if not all(bones.values()) or not all(v[0] for v in limbs.values()):
        report.append(f'{key}: missing bones'); continue
    # rest: hips height and each body bone's rest rotation (world)
    rest_q = {k: (W @ pb.bone.matrix_local).to_quaternion() for k, pb in bones.items()}
    hips_rest = W @ bones['pelvis'].bone.head_local
    H = hips_rest.z
    tracks = {k: [] for k in list(BODY) + list(LIMB) + ['hipsP']}
    dur = (f1 - f0) / src_fps; n = max(2, int(round(dur * FPS)) + 1)
    for i in range(n):
        f = f0 + (f1 - f0) * i / (n - 1)
        bpy.context.scene.frame_set(int(f), subframe=f - int(f))
        for k, pb in bones.items():
            q = (W @ pb.matrix).to_quaternion() @ rest_q[k].inverted()
            tracks[k] += r3(cq(q))
        for k, (a, b) in limbs.items():
            h = W @ a.head
            t = (W @ b.head) if b else (W @ a.tail)
            d = (t - h); d.normalize(); tracks[k] += r3(cv(d))
        hp = W @ bones['pelvis'].head
        tracks['hipsP'] += r3([(hp.x - hips_rest.x) / H, hp.z / H, -(hp.y - hips_rest.y) / H])
    out = {'name': key, 'fps': FPS, 'frames': n, 'dur': round(dur, 3), 'tracks': tracks}
    with open(os.path.join(OUT, key + '.json'), 'w') as fh: json.dump(out, fh, separators=(',', ':'))
    report.append(f'{key}: {n} frames, {dur:.2f}s')
print('\n'.join(report))
