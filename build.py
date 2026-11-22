"""Build the game: joins src/js/*.js (in name order) into game.js and writes index.html.

Run from the repo root:  python build.py
The output (index.html, styles.css, game.js) is what Vercel serves and what goes into the APK.
"""
import os, glob, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')

def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()

parts = sorted(glob.glob(os.path.join(SRC, 'js', '*.js')))
game = '\n'.join(f'// ---- {os.path.basename(p)} ----\n' + read(p) for p in parts)
with open(os.path.join(ROOT, 'game.js'), 'w', encoding='utf-8') as f:
    f.write(game)
shutil.copyfile(os.path.join(SRC, 'styles.css'), os.path.join(ROOT, 'styles.css'))

html = f'''<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#0d0b09">
<title>طيارة الجامد</title>
<meta name="description" content="طيارة الجامد: لعبة 3D في شوارع مصر. قصة، سواقة، قهوة قصر الملوك، فول وفلافل ودومنو.">
<link rel="stylesheet" href="vendor/fonts/fonts.css">
<link rel="stylesheet" href="styles.css">
</head>
<body>
{read(os.path.join(SRC, 'body.html'))}
<script type="importmap">{{"imports":{{"three":"./vendor/three/three.module.min.js","three/addons/":"./vendor/three/addons/"}}}}</script>
<script type="module" src="game.js"></script>
</body>
</html>
'''
with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print(f'built index.html + game.js from {len(parts)} files ({len(game)//1024} KB)')
