// ================= ورشة الأسطى رضا: paint and upgrade طيارة's motorcycle and car =================
// Drive your own motorcycle or car onto the green circle at the workshop next to the market.
const GARAGE_POS = (() => { const [x, z] = freeSpot(104, -4.6); return new THREE.Vector3(x, 0, z); })();
const PAINTS = ['#b3121f', '#e8b21a', '#1565c0', '#1b1d20', '#f2f2f2', '#2e7d32', '#6a1b9a', '#ff6f00', '#00838f', '#c2185b'];
const PAINT_PRICE = 60;
const UPG = [
  { id: 'eng', name: '⚙️ موتور', max: 2, prices: [200, 450], text: l => `أسرع ${l*12}٪` },
  { id: 'turn', name: '🛞 عجل وفرامل', max: 2, prices: [120, 260], text: l => `لف أحسن +${l}` },
  { id: 'neon', name: '💡 نيون تحت العربية', max: 1, prices: [150], text: () => 'نور ملوّن تحت' },
  { id: 'gold', name: '✨ جنوط دهب', max: 1, prices: [300], text: () => 'جنوط دهب (للعربية)', car: true },
];
PROG.garage = PROG.garage || { moto: {}, car: {} };
const gSlot = v => PROG.garage[v === heroMoto ? 'moto' : 'car'];
const goldHub = new THREE.MeshStandardMaterial({ color: 0xffc83a, metalness: 1, roughness: .2 });
const neonTex = makeTex(128, 128, g => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
function repaint(v, color){
  const tmp = v.type === 'moto' ? makeMoto(color) : makeCar(color, v.type); scene.remove(tmp);
  const keep = v.mesh.children.filter(c => c.userData.keep);
  while (v.mesh.children.length) v.mesh.remove(v.mesh.children[0]);
  while (tmp.children.length) v.mesh.add(tmp.children[0]);
  keep.forEach(c => v.mesh.add(c));
}
function applyGarage(v){
  const s = gSlot(v); if (!v.base) v.base = { max: v.max, accel: v.accel, turn: v.turn, color: v.type === 'moto' ? '#b3121f' : '#e8b21a' };
  const color = s.color || v.base.color; if (v.paint !== color){ repaint(v, color); v.paint = color; v.neonMesh = null; }
  v.max = v.base.max * (1 + (s.eng || 0)*.12); v.accel = v.base.accel * (1 + (s.eng || 0)*.1); v.turn = v.base.turn + (s.turn || 0)*.18;
  if (s.neon && !v.neonMesh){ const m = new THREE.Mesh(new THREE.PlaneGeometry(v.type === 'moto' ? 1.4 : 3.2, v.type === 'moto' ? 2.2 : 5.4), new THREE.MeshBasicMaterial({ map: neonTex, color: new THREE.Color(color).offsetHSL(.5, 0, .1), transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.x = -Math.PI/2; m.position.y = .06; m.userData.keep = true; v.mesh.add(m); v.neonMesh = m; }
  if (s.gold && v.type !== 'moto') v.mesh.children.forEach(c => { if (c.material === hubMat) c.material = goldHub; });
}
function openGarage(){
  const v = hero.veh; if (!v) return; const s = gSlot(v); v.speed = 0;
  hero.locked = true; $('shop').hidden = false; $('shopTitle').textContent = `🔧 ورشة الأسطى رضا · ${v.type === 'moto' ? 'الموتوسيكل' : 'العربية'}`;
  $('shopMoney').textContent = `معاك ${egp(hero.money)}`;
  const cur = s.color || v.base.color;
  const sw = PAINTS.map(c => `<button class="swatch ${c === cur ? 'on' : ''}" data-paint="${c}" style="background:${c}" aria-label="لون"></button>`).join('');
  const rows = UPG.filter(u => !(u.car && v.type === 'moto')).map(u => { const l = s[u.id] || 0, done = l >= u.max, price = u.prices[l];
    return `<div class="sitem"><span>${u.name} <small style="color:var(--muted)">${l ? u.text(l) : ''}${u.max > 1 ? ` (${l}/${u.max})` : ''}</small></span>${done ? '<span class="owned">✓ متركّب</span>' : `<button data-upg="${u.id}" ${hero.money < price ? 'class="poor"' : ''}>ركّب · ${price} ج</button>`}</div>`; }).join('');
  $('shopItems').innerHTML = `<div class="sitem paintrow"><span>🎨 لون جديد · ${PAINT_PRICE} ج</span><div class="swatches">${sw}</div></div>${rows}`;
  $('shopItems').querySelectorAll('[data-paint]').forEach(b => b.onclick = () => { const c = b.dataset.paint; if (c === (s.color || v.base.color)) return; if (hero.money < PAINT_PRICE){ $('shopMoney').textContent = `محتاج ${egp(PAINT_PRICE - hero.money)} كمان`; buzz(40); return; } hero.money -= PAINT_PRICE; s.color = c; garageDone(v); });
  $('shopItems').querySelectorAll('[data-upg]').forEach(b => b.onclick = () => { const u = UPG.find(x => x.id === b.dataset.upg), l = s[u.id] || 0, price = u.prices[l]; if (hero.money < price){ $('shopMoney').textContent = `محتاج ${egp(price - hero.money)} كمان`; buzz(40); return; } hero.money -= price; s[u.id] = l + 1; garageDone(v); });
}
function garageDone(v){ saveProg(); applyGarage(v); stat('garage'); coin(); noise(.3, 2400, .25); buzz(25); if (modeId === 'story') saveStory(); openGarage(); }
// workshop sign + floor marker
const garageSign = signSprite('🔧', 'ورشة رضا'); garageSign.position.set(GARAGE_POS.x, 3.4, GARAGE_POS.z - 2.6);
const garageRing = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.8, 40), new THREE.MeshBasicMaterial({ color: 0x3cff6a, transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide })); garageRing.rotation.x = -Math.PI/2; garageRing.position.set(GARAGE_POS.x, .08, GARAGE_POS.z); scene.add(garageRing);
function garageAction(){
  const v = hero.veh; if (!v || (v !== heroMoto && v !== heroCar)) return null;
  if (modeId === 'story' && !SAVE.owned[v === heroMoto ? 'moto' : 'car']) return null;
  if (Math.hypot(v.pos.x - GARAGE_POS.x, v.pos.z - GARAGE_POS.z) > 4) return null;
  return { text: '🔧 دخّلها الورشة', fn: openGarage };
}
function updateGarage(t){ const on = modeId === 'story' || modeId === 'free'; garageSign.visible = garageRing.visible = on; if (on) garageRing.material.opacity = .35 + Math.sin(t*3)*.2; }
applyGarage(heroMoto); applyGarage(heroCar);
