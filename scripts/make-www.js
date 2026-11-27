// Copies the built game into www/ (the folder Capacitor packs into the APK).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
for (const f of ['index.html', 'record.html', 'game.js', 'boot.js', 'styles.css', 'music.mp3']) if (fs.existsSync(path.join(root, f))) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const d of ['assets', 'vendor']) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
console.log('www ready');
