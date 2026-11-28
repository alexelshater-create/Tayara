# Distance from the coast for every sea pixel (4 m a pixel): the water shader uses it for the turquoise shallows and the foam line.
import os, json, numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'city')
I = json.load(open(os.path.join(OUT, 'index.json'), encoding='utf-8'))
W, H = int(I['x1'] - I['x0']), int(I['z1'] - I['z0'])
land = np.zeros((H, W), bool)
for f in os.listdir(os.path.join(OUT, 'r')):
    ti, tk = map(int, f[:-4].split('_')); t = np.array(Image.open(os.path.join(OUT, 'r', f)))
    land[tk * 256:tk * 256 + t.shape[0], ti * 256:ti * 256 + t.shape[1]] = t > 0
S = 4
small = land[:H // S * S, :W // S * S].reshape(H // S, S, W // S, S).max(axis=(1, 3))
d = distance_transform_edt(~small) * S          # metres to the nearest land
img = np.clip(d * 4, 0, 255).astype(np.uint8)    # 0..64 m
Image.fromarray(img).save(os.path.join(OUT, 'shore.png'), optimize=True)
print(img.shape, os.path.getsize(os.path.join(OUT, 'shore.png')) // 1024, 'KB')
