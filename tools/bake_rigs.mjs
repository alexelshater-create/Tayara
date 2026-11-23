// Save every 3D character's rig next to its model, so the game doesn't have to work it out on the phone.
// Usage (with the game served at the URL, e.g. python -m http.server 8766 in the repo):
//   node tools/bake_rigs.mjs [http://localhost:8766]
// Runs tools/bake_rigs.html in headless Edge (or Chrome: set BROWSER=path) and writes assets/models/<name>.rig.json.
// Run it again whenever a model in assets/models changes (the game checks the vertex count and re-rigs if they differ).
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const base = process.argv[2] || 'http://localhost:8766';
const here = dirname(fileURLToPath(import.meta.url)), out = join(here, '..', 'assets', 'models');
const BROWSER = process.env.BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const port = 9300 + Math.floor(Math.random() * 500), prof = mkdtempSync(join(tmpdir(), 'bake-'));
const br = spawn(BROWSER, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pend = new Map();
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
try {
  let ver; for (let k = 0; k < 50 && !ver; k++){ try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(200); } }
  ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)){ const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.navigate', { url: `${base}/tools/bake_rigs.html` }, sessionId);
  const ev = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true }, sessionId)).result.value;
  const t0 = Date.now(); while (Date.now() - t0 < 180000 && !(await ev('!!window.__done').catch(() => false))) await sleep(500);
  console.log(await ev("document.getElementById('log').textContent"));
  const names = await ev('Object.keys(window.__rigs || {})') || [];
  for (const n of names){ const json = await ev(`window.__rigs[${JSON.stringify(n)}]`); writeFileSync(join(out, `${n}.rig.json`), json); console.log('saved', `${n}.rig.json`, Math.round(json.length / 1024), 'KB'); }
} catch (e){ console.error('bake failed:', e.message); process.exitCode = 1; }
finally { try { ws && ws.close(); } catch {} br.kill(); }
process.exit(process.exitCode || 0);
