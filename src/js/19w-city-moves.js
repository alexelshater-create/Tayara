// ================= stage 11: moving through the city =================
// Every building's roof can be stood on: run across the roofs of a block and jump the gaps between them. Grab and pull
// yourself up any edge that isn't too high (a wall, a kiosk, the next roof). Climb the drainpipes up to the roof. Every
// building door has a stair up to the roof (and the hut on the roof brings you back down). Hide from the police in a
// crowd, under a parked car, or on the roofs (they see less up there). (Shops: 19q decides how long you must wait.)
const CMOVE = { pipes: [], huts: [], hide: { car: null, crowd: false, crowdT: 0, roof: false }, tipRoof: false };
const roofTop = b => BASE + b.floors * 3.2 + .3;   // the walkable top of a building (the cap slab)

// ---------- the roofs: the building blocks get a height, so standing on top works (12b heroGround / heroBlockedAt) ----------
for (const o of obstacles) if (o.building && o.bref && o.h === undefined) o.h = roofTop(o.bref) - .15;
for (const r of roofBits) obstacles.push(r);   // the tanks and boxes on the roofs
OG.n = -1;   // rebuild the obstacle grid with the heights

// ---------- the stairwell huts on the roofs, and the drainpipes ----------
(() => {
  const hutP = [], pipeP = [], doorP = [];
  for (const b of buildings){
    if (!b.door || !b.floors) continue;
    const D = b.door, top = roofTop(b), out = { pz: [0, 1], nz: [0, -1], px: [1, 0], nx: [-1, 0] }[b.doorFace];
    const fx = D.x - out[0] * .15, fz = D.z - out[1] * .15;   // on the wall
    const deep = b.doorFace === 'pz' || b.doorFace === 'nz' ? b.d : b.w; if (deep < 6.5) continue;
    if (SHOPS.some(s => Math.hypot(s.out.x - D.x, s.out.z - D.z) < 2.2)) continue;   // that door is a shop's
    const hx = fx - out[0] * 2.1, hz = fz - out[1] * 2.1, HS = 1.25, HH = 2.6;
    box(hutP, HS * 2, HH, HS * 2, hx, top + HH / 2, hz, '#cfc6b4'); box(hutP, HS * 2 + .2, .14, HS * 2 + .2, hx, top + HH + .07, hz, '#9c9384');
    const dx = hx - out[0] * (HS + .03), dz = hz - out[1] * (HS + .03);
    box(doorP, out[0] ? .06 : 1.1, 2.05, out[0] ? 1.1 : .06, dx, top + 1.03, dz, '#4a3626');
    obstacles.push({ minX: hx - HS, maxX: hx + HS, minZ: hz - HS, maxZ: hz + HS, h: top + HH - .15 });
    const spot = { x: hx - out[0] * (HS + .8), y: top, z: hz - out[1] * (HS + .8) };
    CMOVE.huts.push({ b, top, street: { x: D.x + out[0] * .7, z: D.z + out[1] * .7 }, roof: spot, face: Math.atan2(-out[0], -out[1]) });
    // a drainpipe down one corner of the street face (about every third building)
    if (rng() < .38){
      const along = b.doorFace === 'pz' || b.doorFace === 'nz' ? b.w : b.d, u = (rng() < .5 ? -1 : 1) * (along / 2 - .55), side = [out[1], -out[0]];
      const mx = b.cx + out[0] * (b.w / 2 + .02), mz = b.cz + out[1] * (b.d / 2 + .02);   // the middle of the face, on the wall
      const px = mx + side[0] * u + out[0] * .12, pz = mz + side[1] * u + out[1] * .12;
      if (Math.hypot(px - D.x, pz - D.z) > 1.6){
        cyl(pipeP, .075, .075, top - .2, px, (top + .2) / 2, pz, '#5c5f63', 0, 8);
        for (let y = 1.5; y < top - .4; y += 2.6) box(pipeP, .3, .06, .3, px - out[0] * .08, y, pz - out[1] * .08, '#3d3f42');
        CMOVE.pipes.push({ x: px, z: pz, out, top, base: { x: px + out[0] * .45, z: pz + out[1] * .45 }, b });
      }
    }
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 });
  for (const P of [hutP, pipeP, doorP]) if (P.length){ const m = new THREE.Mesh(mergeGeometries(P), mat); m.castShadow = m.receiveShadow = true; scene.add(m); }
  OG.n = -1;
})();

// ---------- grabbing a ledge: something ahead whose top is a bit higher than the feet (called by 12b) ----------
function ledgeAt(p, dx, dz, maxUp = 3.5){
  if (HOUSE.inside || (Math.abs(dx) + Math.abs(dz) < .2)) return null;
  const l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l;
  for (const reach of [.55, .8]){
    const x = p.x + ux * reach, z = p.z + uz * reach, g0 = groundY(x, z); let top = -1;
    ogQuery(x, z, .05, o => { if (o.h !== undefined){ const t = g0 + o.h; if (t > top) top = t; } });
    const up = top - p.y; if (top < 0 || up < .5 || up > maxUp) continue;
    // a place to stand on top: a little further in, and nothing higher there
    const tx = p.x + ux * (reach + .55), tz = p.z + uz * (reach + .55); let over = -1;
    ogQuery(tx, tz, .3, o => { if (o.h !== undefined){ const t = groundY(tx, tz) + o.h; if (t > over) over = t; } else over = 1e9; });
    if (over > top + .3) continue;
    return { x: tx, y: top, z: tz, up };
  }
  return null;
}
function startLedgeClimb(L){ MOVE.climb = { from: hero.pos.clone(), to: new THREE.Vector3(L.x, L.y, L.z), t: 0, dur: .45 + L.up * .22 }; MOVE.air = false; MOVE.vy = 0; noise(.18, 700, .1); stepSfx(3); }

// ---------- the drainpipes ----------
function nearPipe(p){ let best = null, bd = 1.1; for (const P of CMOVE.pipes){ const d = Math.hypot(P.base.x - p.x, P.base.z - p.z); if (d < bd && p.y < groundY(p.x, p.z) + .5){ bd = d; best = P; } } return best; }
function startPipe(P){
  if (hero.veh) return; MOVE.pipe = { P, y: hero.pos.y }; hero.vel.set(0, 0, 0); MOVE.air = false;
  hero.pos.x = P.x + P.out[0] * .38; hero.pos.z = P.z + P.out[1] * .38; hero.d.faceYaw = null; hero.d.yaw = Math.atan2(-P.out[0], -P.out[1]);
}
// one frame of pipe climbing (12b calls it first; true = it moved the hero)
function pipeStep(dt){
  const C = MOVE.pipe; if (!C) return false; const p = hero.pos, P = C.P;
  if (MOVE.jumpReq > 0){ MOVE.jumpReq = 0; MOVE.pipe = null; MOVE.air = true; MOVE.vy = 0; MOVE.peak = p.y; hero.vel.set(P.out[0] * 2, 0, P.out[1] * 2); return false; }   // let go
  const up = (keys.KeyW || keys.ArrowUp || (joy.mag > .3) || runBtn) ? 3.4 : 1.9;   // it keeps climbing by itself; push to go faster
  p.y += dt * up; hero.stamina = Math.max(0, hero.stamina - dt * .05);
  p.x = P.x + P.out[0] * .38; p.z = P.z + P.out[1] * .38; hero.vel.set(0, 0, 0);
  hero.d.strike = { clip: 'climb', t: .35 + (runTime * 1.6 % .9) };
  if (Math.floor(p.y * 1.4) !== Math.floor((p.y - dt * up) * 1.4)) playS('metall', .25, .8);
  if (p.y >= P.top - 1.55){ MOVE.pipe = null; MOVE.climb = { from: p.clone(), to: new THREE.Vector3(P.x - P.out[0] * .9, P.top, P.z - P.out[1] * .9), t: 0, dur: .9 }; if (!CMOVE.tipRoof){ CMOVE.tipRoof = true; banner('السطوح كلها بتاعتك… اجري ونط من سطح لسطح', 'info', 2.6); } }
  return true;
}

// ---------- the stairs: a building door up to its roof, the roof hut back down ----------
function nearHutStreet(p){ for (const H of CMOVE.huts) if (Math.hypot(H.street.x - p.x, H.street.z - p.z) < 1.25 && p.y < groundY(p.x, p.z) + .6) return H; return null; }
function nearHutRoof(p){ for (const H of CMOVE.huts) if (Math.hypot(H.roof.x - p.x, H.roof.z - p.z) < 1.3 && Math.abs(p.y - H.top) < .6) return H; return null; }
function takeStairs(H, upward){
  if (hero.veh || hero.locked) return; hero.locked = true; playS('stepw', .5); playS('stepw', .4, 1, .3);
  fadeTo(() => {
    let to = H.roof; if (!upward){ const [sx, sz] = freeSpot(H.street.x, H.street.z); to = { x: sx, y: groundY(sx, sz), z: sz }; }
    hero.pos.set(to.x, to.y, to.z); hero.vel.set(0, 0, 0); hero.d.yaw = upward ? H.face : H.face + Math.PI;
    CAM.orbit = CAM.orbitSm = hero.d.yaw; lookAt.set(to.x, to.y + 1.2, to.z);   // the camera looks at him from the open side MOVE.air = false; MOVE.vy = 0; MOVE.climb = null; MOVE.pipe = null; MOVE.lx = hero.pos.x; MOVE.lz = hero.pos.z;
    hero.locked = false;
    if (upward && POL.on){ const watched = POL.seen && POL.cops.some(c => c.on && c.state !== 'down' && Math.hypot(c.pos.x - H.street.x, c.pos.z - H.street.z) < 25); if (!watched) POL.trackT = Math.min(POL.trackT, 1); banner(watched ? 'شافوك طالع… اجري على السطوح بعيد' : 'طلعت السطح… اجري على السطوح', 'info', 2); }
  });
}

// ---------- hiding ----------
const hideBtn = document.createElement('button'); hideBtn.id = 'hideBtn'; hideBtn.innerHTML = '<small>استخبى</small>'; hideBtn.hidden = true; document.body.appendChild(hideBtn);
hideBtn.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); toggleHideCar(); });
addEventListener('keydown', e => { if (state === 'play' && !e.repeat && e.code === 'KeyH') toggleHideCar(); });
function hideCarNear(){ if (hero.veh || hero.locked || !POL.on || MEL.atk || MOVE.pipe || MOVE.air || MOVE.climb || heroUpHigh()) return null; let best = null, bd = 2.6; for (const v of vehicles){ if (v.ai || v.wrecked || Math.abs(v.speed) > .5 || !['car', 'taxi', 'police'].includes(v.type)) continue; const d = Math.hypot(v.pos.x - hero.pos.x, v.pos.z - hero.pos.z); if (d < bd){ bd = d; best = v; } } return best; }
function toggleHideCar(){
  const H = CMOVE.hide;
  if (H.car){ const v = H.car, sx = Math.cos(v.yaw), sz = -Math.sin(v.yaw), [fx, fz] = freeSpot(v.pos.x + sx * 1.6, v.pos.z + sz * 1.6); hero.pos.set(fx, groundY(fx, fz), fz); H.car = null; hero.locked = false; hero.d.root.visible = true; playS('block', .4, .8); return; }
  const v = hideCarNear(); if (!v) return;
  H.car = v; H.foundT = 0; if (!POL.cops.some(c => c.on && c.state !== 'down' && Math.hypot(c.pos.x - v.pos.x, c.pos.z - v.pos.z) < 12)) POL.trackT = Math.min(POL.trackT, 1.5); hero.locked = true; hero.vel.set(0, 0, 0); hero.d.root.visible = false; hero.pos.set(v.pos.x, groundY(v.pos.x, v.pos.z), v.pos.z); playS('fall', .35, 1.2);
  banner('مستخبي تحت العربية', 'info', 2);
}
// how far the police can see you now (19q): under a car only right next to it; in a crowd or up on the roofs, much less
function polSightR(r){
  const H = CMOVE.hide;
  if (H.car) return 1.7;
  if (H.crowd) r = Math.min(r, 12);
  if (H.roof) r = Math.min(r, 28);
  return r;
}
const heroUpHigh = () => !hero.veh && hero.pos.y - groundY(hero.pos.x, hero.pos.z) > 2.5;
let crowdTag = null;
function cityMovesUpdate(dt){
  const H = CMOVE.hide, p = hero.pos;
  if (H.car){ const v = H.car; if (v.wrecked || Math.abs(v.speed) > .5 || hero.veh || state !== 'play' || !vehicles.includes(v)){ toggleHideCar(); } else { hero.pos.set(v.pos.x, groundY(v.pos.x, v.pos.z), v.pos.z); hero.d.root.visible = false; if (joy.mag > .6 || keys.KeyW || keys.KeyS || keys.KeyA || keys.KeyD) toggleHideCar();
    else if (POL.on && POL.cops.some(c => c.on && c.state !== 'down' && Math.hypot(c.pos.x - v.pos.x, c.pos.z - v.pos.z) < 2.4)){ H.foundT += dt; if (H.foundT > 1.2){ toggleHideCar(); banner('لقوك تحت العربية!', 'bad', 1.8); POL.trackT = Math.max(POL.trackT, 4); } } else H.foundT = 0; } }
  H.roof = heroUpHigh();
  H.crowdT -= dt;
  if (H.crowdT <= 0){ H.crowdT = .3;
    const sp = Math.hypot(hero.vel.x, hero.vel.z); let n = 0;
    if (!hero.veh && !H.roof && sp < 4.6 && !(GW.aimK > .3)) for (const q of npcs){ if (!q.g.visible || q.state === 'hidden' || q.state === 'down') continue; if (Math.hypot(q.g.position.x - p.x, q.g.position.z - p.z) < 5 && ++n >= 2) break; }
    H.crowd = n >= 2;
    if (!crowdTag){ crowdTag = document.createElement('div'); crowdTag.id = 'crowdTag'; crowdTag.textContent = 'وسط الزحمة'; document.body.appendChild(crowdTag); }
    crowdTag.classList.toggle('on', H.crowd && POL.on);
  }
  hideBtn.hidden = !(H.car || hideCarNear());
  hideBtn.classList.toggle('on', !!H.car);
}

// line of sight for the police: up on a roof, buildings no higher than you don't hide you
function polLOS(ax, az, bx, bz){
  if (!CMOVE.hide.roof) return lineOfSight(ax, az, bx, bz);
  const hy = hero.pos.y + .3;
  for (const o of obstacles) if (o.building && segHitsBox(ax, az, bx, bz, o, .3) && !(o.bref && roofTop(o.bref) <= hy)) return false;
  return true;
}

