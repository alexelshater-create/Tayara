// ================= modes =================
let state = 'menu', modeId = 'free', modeObj = {}, heroName = 'طيارة', shake = 0, runTime = 0;
function renderModes(){
  const has = SAVE.started || SAVE.m > 0;
  const M = curM();
  const list = [
    { id:'story', icon:'👑', name: has ? 'كمّل القصة' : 'القصة', desc: has ? (M ? `${CHAPS[M.ch][0]} · المهمة ${SAVE.m+1} من ${MS.length}: ${M.title} · ${egp(SAVE.money)}` : 'خلصت القصة! لف في الحتة براحتك.') : 'طيارة صبي قهوجي مفلس… شغل وإيجار، عدو بيلف وراه، حرامي ساندوتشات، ومطلوب اسمه شمس. قصة طويلة في ٧ فصول.' },
    { id:'ahwa', icon:'☕', name:'وردية قهوجي', desc:'دور سريع في قصر الملوك: حضّر الشاي والقهوة بإيدك ووزّع.' },
    { id:'domino', icon:'🎲', name:'دومنو مع عم سيد', desc:'ماتش لـ ١٠١ بالقواعد المصرية.' },
  ];
  $('modes').innerHTML = list.map(m => `<button class="mode" data-mode="${m.id}"><span class="ic">${m.icon}</span><span><b>${m.name}</b><span>${m.desc}</span></span></button>`).join('') + '<button class="mode ach" id="recBtn"><span class="ic">🎙️</span><span><b>سجّل أصوات الشخصيات</b><span>صحابك يسجّلوا الحوار بصوتهم… واللعبة تشغّله</span></span></button>' + '<button class="mode ach" id="achBtn"><span class="ic">🏆</span><span><b>الإنجازات</b><span>' + ACH.filter(a => PROG.ach[a.id]).length + '/' + ACH.length + ' إنجاز · ' + PROG.glasses.length + '/20 كوباية دهب</span></span></button>' + (has ? '<button class="mode reset" id="resetStory"><span class="ic">↺</span><span><b>ابدأ القصة من الأول</b><span id="resetHint">التقدم اللي فات هيتمسح</span></span></button>' : '');
  $('modes').querySelectorAll('[data-mode]').forEach(b => b.onclick = () => startMode(b.dataset.mode));
  $('achBtn').onclick = openAch;
  $('recBtn').onclick = () => { location.href = 'record.html'; };
  const rs = $('resetStory'); if (rs){ let armed = false; rs.onclick = () => { if (!armed){ armed = true; $('resetHint').textContent = 'دوس تاني عشان تأكد'; return; } SAVE = newStory(); store.set(STORY_KEY, JSON.stringify(SAVE)); applyAccessories(); renderModes(); }; }
}

const cashSpots = [];
{ let tries = 0; while (cashSpots.length < 15 && tries < 6000){ tries++; const onRoad = rng() < .55; let x, z; if (onRoad){ const r = pick(ROADS); const t = R(-HALF+4, HALF-4), o = R(-4.5,4.5); if (rng()<.5){ x=t; z=r+o; } else { x=r+o; z=t; } } else { x = R(-HALF+2, HALF-2); z = R(-HALF+2, HALF-2); } if (staticBlocked(x, z, 1.4)) continue; if (Math.hypot(x-SPOT.spawn.x, z-SPOT.spawn.z) < 14) continue; if (cashSpots.some(c => Math.hypot(c.x-x, c.z-z) < 20)) continue; cashSpots.push({ x, z, value: 100*Math.round(R(1,6)) }); } }
const billTex = makeTex(256,128,(g,w,h)=>{ const gr = g.createLinearGradient(0,0,w,h); gr.addColorStop(0,'#d9c98a'); gr.addColorStop(1,'#a88f4a'); g.fillStyle=gr; g.fillRect(0,0,w,h); g.strokeStyle='#5a4417'; g.lineWidth=6; g.strokeRect(8,8,w-16,h-16); arText(g,'٢٠٠',w/2,h/2+4,60,'#4a3510'); });
billTex.wrapS = billTex.wrapT = THREE.ClampToEdgeWrapping;
const billTop = new THREE.MeshStandardMaterial({ map: billTex, roughness: .7, emissive: 0x5a4a10, emissiveIntensity: .25 });
const billSide = new THREE.MeshStandardMaterial({ color: 0xe6dcb0, roughness: .8, emissive: 0x5a4a10, emissiveIntensity: .2 });
const stackGeo = new THREE.BoxGeometry(.9, .32, .45);
const beamGeo = new THREE.CylinderGeometry(.5, .5, 9, 20, 1, true); beamGeo.translate(0, 4.5, 0);
const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
const cash = cashSpots.map(c => { const g = new THREE.Group(); const st = new THREE.Mesh(stackGeo, [billSide,billSide,billTop,billTop,billSide,billSide]); st.position.y = 1; st.castShadow = true; g.add(st); g.add(new THREE.Mesh(beamGeo, beamMat)); g.position.set(c.x, 0, c.z); g.visible = false; scene.add(g); return { ...c, g, st, taken: false, pop: 0 }; });

// --- ahwa (coffee shop) data ---
const DRINKS = ['شاي','قهوة','ينسون','حلبة'];
const DRINK_ICON = { 'شاي':'🍵', 'قهوة':'☕', 'ينسون':'🌿', 'حلبة':'🥛' };
const SUGARS = ['سادة','مظبوط','زيادة'];
const sugarSpoons = (drink, s) => drink === 'قهوة' ? { 'سادة':0, 'مظبوط':1, 'زيادة':2 }[s] : { 'سادة':0, 'مظبوط':2, 'زيادة':3 }[s];
const sugarLabel = (drink, n) => SUGARS.find(s => sugarSpoons(drink, s) === n) || `${n} معلقة`;
const orderLabel = o => `${o.reg ? '⭐ ' : ''}${DRINK_ICON[o.drink]} ${o.drink} ${o.sugar}`;
const REGULARS = { 'الحاج محمود': { drink: 'شاي', sugar: 'زيادة' }, 'عم رجب': { drink: 'قهوة', sugar: 'سادة' }, 'زيزو': { drink: 'ينسون', sugar: 'مظبوط' }, 'أبو علي': { drink: 'شاي', sugar: 'سادة' }, 'مصطفى': { drink: 'قهوة', sugar: 'مظبوط' } };
const buzz = ms => { if (!isTouch || !navigator.vibrate || (navigator.userActivation && !navigator.userActivation.hasBeenActive)) return; try { navigator.vibrate(ms); } catch(e){} };
const trayGroup = new THREE.Group(); scene.add(trayGroup);
const trayMesh = new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.02,20), new THREE.MeshStandardMaterial({ color: 0xc0c4c8, metalness: .8, roughness: .3 })); trayGroup.add(trayMesh); trayGroup.visible = false;
function refreshTray(){
  const tr = modeObj.tray || [];
  while (trayGroup.children.length > 1) trayGroup.remove(trayGroup.children[1]);
  tr.forEach((d,i) => { const g = makeGlass(d.drink); g.scale.setScalar(1.3); g.position.set(-.13 + i*.13, .01, 0); trayGroup.add(g); });
  trayGroup.visible = tr.length > 0 && !ST.kind;
  $('tray').hidden = !tr.length || !!ST.kind;
  $('tray').textContent = 'الصينية: ' + tr.map(d => `${DRINK_ICON[d.drink]} ${d.drink} ${sugarLabel(d.drink, d.spoons)}`).join(' · ');
}

// --- foul data ---
const FOUL_PRICE = { 'فول': 6, 'فلافل': 6, 'بطاطس': 8, 'بيض': 8 };
const FOUL_ICON = { 'فول':'🥣', 'فلافل':'🧆', 'بطاطس':'🍟', 'بيض':'🥚' };
const sandKey = s => `${s.base}|${s.tahina?1:0}|${s.salad?1:0}`;
const sandLabel = s => `${FOUL_ICON[s.base]} ${s.base}${s.tahina ? ' + طحينة' : ''}${s.salad ? ' + سلطة' : ''}`;
const sandPrice = s => FOUL_PRICE[s.base] + (s.tahina?1:0) + (s.salad?1:0);
function updateFoul(dt){
  const m = modeObj; m.spawnT -= dt;
  const spots = [[SPOT.cart.x, SPOT.cart.z + 1.5], [SPOT.cart.x - .3, SPOT.cart.z + 3.0], [SPOT.cart.x + .3, SPOT.cart.z + 4.4], [SPOT.cart.x - .2, SPOT.cart.z + 5.8]];
  if (m.spawnT <= 0 && m.queue.length < 4){
    m.spawnT = R(7, 12) * (m.time < 80 ? .75 : 1);
    const n = m.pool.find(n => n.state === 'hidden');
    if (n){
      const k = 1 + (Math.random() < .55 ? 0 : Math.random() < .7 ? 1 : 2); const order = [];
      for (let i=0;i<k;i++) order.push({ base: rpick(Object.keys(FOUL_PRICE)), tahina: Math.random() < .5, salad: Math.random() < .4 });
      const c = { n, order, ready: false, patience: (70 + 25*k)*DIFF.pat, maxPat: (70 + 25*k)*DIFF.pat }; m.queue.push(c);
      n.g.visible = true; n.g.position.set(SPOT.cart.x + rpick([-8,8]), .15, SPOT.cart.z + 7); n.state = 'goto'; n.onArrive = null;
    }
  }
  m.queue.forEach((c,i) => {
    const sp = spots[Math.min(i, spots.length-1)];
    if (c.n.state === 'goto' || c.n.state === 'idle'){ c.n.tx = sp[0]; c.n.tz = sp[1]; if (Math.hypot(c.n.g.position.x - sp[0], c.n.g.position.z - sp[1]) > .2) c.n.state = 'goto'; else { c.n.state = 'idle'; c.n.yaw = Math.PI; } }
    if (i === 0 && c.n.state === 'idle' && !c.ready){ c.ready = true; say(c.n, c.order.length > 1 ? `عايز ${c.order.length} سندوتشات يا معلم` : 'سندوتش يا معلم!', 2.5); buzz(15); }
    if (c.ready){ c.patience -= dt; if (c.patience <= 0){ m.angry++; finishFoulCustomer(c, false); if (m.angry >= 3){ if (m.onFail) m.onFail(); else endMode('الزباين زعلوا 😤', `${heroName} باع ${m.served} طلب بس ٣ زباين مشيوا زعلانين.`, bestScore('foul', m.earned)); } } }
  });
}
function finishFoulCustomer(c, happy){
  const m = modeObj; m.queue.splice(m.queue.indexOf(c), 1);
  say(c.n, happy ? rpick(['تسلم إيدك','أحلى فول في مصر','الله عليك يا معلم']) : 'إيه التأخير ده! ماشي', 1.8, happy ? '' : 'angry');
  c.n.state = 'goto'; c.n.tx = SPOT.cart.x + rpick([-10,10]); c.n.tz = SPOT.cart.z + 8; c.n.onArrive = n2 => { n2.state = 'hidden'; n2.g.visible = false; };
}
