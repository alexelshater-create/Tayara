// ================= time of day =================
// Hours run from 0 to 24. In the story one game hour lasts 40 real seconds; the other modes stay at 3 pm.
const HOUSE = { inside: false, room: { x0: -406.5, x1: -399.5, z0: -403, z1: -397 }, inRoom(x, z){ const r = this.room; return x > r.x0 + .35 && x < r.x1 - .35 && z > r.z0 + .35 && z < r.z1 - .35; } };
const TOD = { h: 15, last: -1 };
const nightAmount = h => (h >= 7 && h <= 17) ? 0 : (h >= 20 || h <= 4.5) ? 1 : h > 17 ? (h - 17)/3 : 1 - (h - 4.5)/2.5;
const duskAmount = h => Math.max(0, 1 - Math.abs(h - 18.2)/1.5, 1 - Math.abs(h - 6)/1.2);
const DAYC = { sun: new THREE.Color(0xffe3bd), dusk: new THREE.Color(0xff9a5a), moon: new THREE.Color(0x9fb4ff), fogDay: new THREE.Color(0xd8cbb3), fogDusk: new THREE.Color(0xd99a78), fogNight: new THREE.Color(0x182033), hemiDay: new THREE.Color(0xd9e4f0), hemiNight: new THREE.Color(0x3a4a78) };
const glowBase = new Map();
function applyTimeOfDay(h){
  TOD.h = ((h % 24) + 24) % 24; h = TOD.h;
  const n = nightAmount(h), d = duskAmount(h);
  const elev = Math.sin((h - 6)/12*Math.PI) * 62, az = 38 + (h - 12)*9;
  su.sunPosition.value.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elev), THREE.MathUtils.degToRad(az));
  // the shadow-casting light follows the sun by day and a high moon at night
  const lightElev = n > .5 ? 55 : Math.max(elev, 8);
  sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - lightElev), THREE.MathUtils.degToRad(n > .5 ? az + 180 : az));
  sun.color.copy(DAYC.sun).lerp(DAYC.dusk, d*.8).lerp(DAYC.moon, n);
  sun.intensity = (2.9 * (1 - d*.35)) * (1 - n) + .45 * n;
  hemi.intensity = .42 * (1 - n) + .2 * n; hemi.color.copy(DAYC.hemiDay).lerp(DAYC.hemiNight, n);
  renderer.toneMappingExposure = .86 - n*.16;
  scene.fog.color.copy(DAYC.fogDay).lerp(DAYC.fogDusk, d*.6).lerp(DAYC.fogNight, n);
  lampHeadMat.emissiveIntensity = .35 + n*2.8; lampPoolMat.opacity = n*.75;
  for (const s of glowSigns){ if (!glowBase.has(s)) glowBase.set(s, s.material.emissiveIntensity); s.material.emissiveIntensity = glowBase.get(s) + n*1.1; }
  headMat.emissiveIntensity = .7 + n*2.4; tailMat.emissiveIntensity = .7 + n*1.4; carLightMat.emissiveIntensity = .7 + n*2;
  for (const st of STOPS) st.g.userData.sign.material.emissiveIntensity = .2 + n*1.2;
}
function clockText(h=TOD.h){ const hh = Math.floor(h), mm = Math.floor((h - hh)*60/10)*10, ap = hh < 12 ? 'ص' : 'م', h12 = ((hh + 11) % 12) + 1; return `${h12}:${String(mm).padStart(2,'0')} ${ap}`; }
const isNight = () => nightAmount(TOD.h) > .6;
