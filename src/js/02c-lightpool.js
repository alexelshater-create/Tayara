// ================= a fixed set of lights for flashes and fires =================
// Adding or removing a light while playing makes three.js rebuild every material's shader: a 2.5 s freeze (the police
// helicopter, explosions, molotovs, fires). So these lights exist from the start, always in the scene, and are only
// switched on and off (intensity) and moved. lightGet() lends one (the oldest if all are busy), lightPut() gives it back.
const LPOOL = { pts: [], seq: 0 };
for (let i = 0; i < 4; i++){ const l = new THREE.PointLight(0xffffff, 0, 10, 2); l.userData.pooled = true; scene.add(l); LPOOL.pts.push({ l, busy: false, at: 0 }); }
function lightGet(color, intensity, distance, decay = 2){
  let e = LPOOL.pts.find(p => !p.busy); if (!e) e = LPOOL.pts.reduce((a, b) => a.at < b.at ? a : b);
  e.busy = true; e.at = ++LPOOL.seq; const l = e.l; l.color.set(color); l.intensity = intensity; l.distance = distance; l.decay = decay; return l;
}
function lightPut(l){ const e = LPOOL.pts.find(p => p.l === l); if (e){ e.busy = false; } if (l){ l.intensity = 0; } }
// the helicopter's searchlight, made now (its body is built when it first flies; the light follows it)
const HELI_SPOT = new THREE.SpotLight(0xfff4d0, 0, 70, .32, .6, 1.2); scene.add(HELI_SPOT, HELI_SPOT.target);
