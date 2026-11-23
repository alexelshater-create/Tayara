// ================= street jobs: pizza delivery for عزوز and tuktuk driver =================
const pizzaMoto = addVehicle('moto', 112, 43.3, Math.PI/2, '#c62828'); pizzaMoto.jobOnly = 'pizza'; pizzaMoto.home.y = 0;
const tukVeh = addVehicle('tuk', 128, -3.6, Math.PI/2, '#2e7d32'); tukVeh.jobOnly = 'tuk'; tukVeh.home.y = 0;
const pizzaBox = new THREE.Mesh(new THREE.BoxGeometry(.55,.38,.55), new THREE.MeshStandardMaterial({ map: makeTex(128,128,(g,w,h)=>{ g.fillStyle='#c62828'; g.fillRect(0,0,w,h); g.fillStyle='#fff3c4'; g.font='900 40px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('🍕',w/2,h/2); }), roughness: .7 }));
pizzaBox.position.set(0, 1.05, -.62); pizzaMoto.mesh.add(pizzaBox); pizzaBox.visible = false;
const JOB = { kind: null, order: null, pax: null, count: 0, earned: 0, nextT: 0 };
const TUK_LINES = ['على المحطة يا أسطى','وديني السوق بسرعة','أنا متأخر على الشغل!','بالراحة يا عم أنا معايا بيض','على الكورنيش لو سمحت','هات الباقي فكة'];
function pickDoorTarget(from, minD, maxD){
  for (let i=0;i<200;i++){ const d = pick(doors); const ox = Math.sin(d.ry)*1.7, oz = Math.cos(d.ry)*1.7; const p = new THREE.Vector3(d.x + ox, .15, d.z + oz); const dist = p.distanceTo(from); if (dist > minD && dist < maxD && inWorld(p.x, p.z) && !staticBlocked(p.x, p.z, .4)) return p; }
  return randomSidewalkPoint(minD, from);
}
function startPizzaJob(){
  if (JOB.kind) return; JOB.kind = 'pizza'; JOB.count = 0; JOB.earned = 0; pizzaBox.visible = true; newPizzaOrder();
  banner('🍕 اركب موتوسيكل عزوز ووصّل البيتزا قبل ما تبرد', 'info', 3.5); $('jobEnd').hidden = false;
}
function newPizzaOrder(){
  const to = pickDoorTarget(SPOT.azzouz, 45, 230), d = to.distanceTo(SPOT.azzouz), t = (d / 8 + 25) * (DIFF.pat > 1 ? 1.3 : 1);
  JOB.order = { pos: to, t, total: t, box: 100, area: DISTRICT_NAMES[districtAt(to.x, to.z)] };
}
function startTukJob(){
  if (JOB.kind) return; JOB.kind = 'tuk'; JOB.count = 0; JOB.earned = 0; newPassenger();
  if (hero.veh !== tukVeh && !hero.veh) enterVehicle(tukVeh);
  banner('🛺 روح خد الزبون من العلامة الصفرا', 'info', 3); $('jobEnd').hidden = false;
}
function newPassenger(){
  const n = npcs.find(x => x.state === 'hidden' && !x.role); if (!n){ JOB.pax = null; return; }
  const from = randomSidewalkPoint(35, hero.veh ? hero.veh.pos : hero.pos); n.role = 'pax'; n.g.visible = true; n.state = 'idle'; n.g.position.copy(from); n.yaw = 0;
  JOB.pax = { n, from, to: null, t: 0, total: 0, onboard: false, line: rpick(TUK_LINES) };
  say(n, JOB.kind === 'taxi' ? 'تاكسي! 🙋' : JOB.kind === 'micro' ? 'رايح الرمل؟ 🙋' : 'توكتوك! 🙋', 3);
}
function endJob2(silent){
  if (!JOB.kind) return; const k = JOB.kind;
  if (JOB.pax){ const n = JOB.pax.n; n.state = 'hidden'; n.g.visible = false; n.role = null; }
  JOB.kind = null; JOB.order = null; JOB.pax = null; pizzaBox.visible = false; $('jobEnd').hidden = true;
  if (!silent) banner(`خلصت الشغل 👏 ${k === 'pizza' ? 'وصّلت' : 'وصّلت'} ${JOB.count} · كسبت ${egp(JOB.earned)}`, 'ok', 3.5);
  if (hero.veh && hero.veh.jobOnly) exitVehicle(true);
  if (typeof saveStory === 'function') saveStory();
}
$('jobEnd').onclick = () => endJob2(false);
function payJob(base, tip, label){ const pay = Math.round(base + tip); hero.money += pay; JOB.earned += pay; JOB.count++; stat(JOB.kind); coin(); buzz(25); banner(`${label} +${pay} جنيه${tip >= 1 ? ' (بقشيش ' + Math.round(tip) + ')' : ''}`, 'ok', 2.2); if (typeof SAVE !== 'undefined'){ SAVE.cnt[JOB.kind] = (SAVE.cnt[JOB.kind]||0) + 1; } }
function onVehicleCrash(v, sp){ if (JOB.kind === 'pizza' && JOB.order){ JOB.order.box = Math.max(0, JOB.order.box - (sp > 14 ? 35 : 20)); banner('🍕 العلبة اتخبطت!', 'bad', 1.2); } }
function updateJobs(dt){
  if (!JOB.kind) return;
  const f = hero.veh ? hero.veh.pos : hero.pos;
  if (JOB.kind === 'pizza' && JOB.order){
    const o = JOB.order; o.t -= dt;
    if (f.distanceTo(o.pos) < 4.5){
      const heat = clamp(o.t / o.total, 0, 1), tip = heat * 14 * (o.box/100);
      payJob(12, tip, heat > 0 ? '🍕 سلّمت البيتزا سخنة' : '🍕 البيتزا وصلت باردة');
      JOB.order = null; JOB.nextT = 1.6;
    }
  } else if (JOB.kind === 'pizza'){ JOB.nextT -= dt; if (JOB.nextT <= 0){ newPizzaOrder(); banner(`🍕 طلب جديد في ${JOB.order.area}`, 'info', 2); } }
  if (JOB.kind === 'tuk' || JOB.kind === 'taxi' || JOB.kind === 'micro'){
    const tukVeh = JOB_VEH[JOB.kind], p = JOB.pax; if (!p){ JOB.nextT -= dt; if (JOB.nextT <= 0) newPassenger(); return; }
    if (!p.onboard){
      if (hero.veh === tukVeh && f.distanceTo(p.n.g.position) < 5 && Math.abs(tukVeh.speed) < 4){
        p.onboard = true; p.n.g.visible = false; p.to = randomSidewalkPoint(60, f); const d = p.to.distanceTo(f); p.total = p.t = (d / 7 + 20) * (DIFF.pat > 1 ? 1.3 : 1);
        banner(`🛺 «${p.line}» · وصّله ${DISTRICT_NAMES[districtAt(p.to.x, p.to.z)]}`, 'info', 3); speak(p.line);
      }
    } else {
      p.t -= dt;
      if (f.distanceTo(p.to) < 5.5 && Math.abs(tukVeh.speed) < 5){
        const n = p.n; n.g.visible = true; n.g.position.set(p.to.x + 1.6, .15, p.to.z); n.state = 'hidden'; say(n, rpick(['تسلم يا أسطى','الله يكرمك','أسرع توكتوك في مصر!']), 2);
        setTimeout(() => { n.g.visible = false; n.role = null; }, 2200);
        payJob(JOB.kind === 'taxi' ? 18 : JOB.kind === 'micro' ? 14 : 10, clamp(p.t / p.total, 0, 1) * 8, `${JOB_NAME[JOB.kind].split(' ')[0]} وصّلت الزبون`); JOB.pax = null; JOB.nextT = 2;
      }
    }
  }
}
function jobTarget(){
  if (JOB.kind === 'pizza' && JOB.order) return JOB.order.pos;
  if ((JOB.kind === 'tuk' || JOB.kind === 'taxi' || JOB.kind === 'micro') && JOB.pax) return JOB.pax.onboard ? JOB.pax.to : JOB.pax.n.g.position;
  return null;
}
function jobHud(){
  if (JOB.kind === 'pizza'){ if (!JOB.order) return '🍕 طلب جديد جاي…'; const o = JOB.order, h = clamp(o.t/o.total, 0, 1); return `🍕 وصّل البيتزا لـ ${o.area} (★)<br>حرارة البيتزا: ${'🔥'.repeat(Math.ceil(h*5)) || '🧊'} · العلبة: ${o.box}%<br>وصّلت ${JOB.count} · كسبت ${egp(JOB.earned)}`; }
  if (JOB.kind === 'tuk' || JOB.kind === 'taxi' || JOB.kind === 'micro'){ const p = JOB.pax, [ic, nm] = JOB_NAME[JOB.kind].split(' '); if (!p) return `${ic} مستني زبون…`; return p.onboard ? `${ic} وصّل الزبون (★) · فاضل ${Math.max(0, Math.ceil(p.t))} ثانية<br>وصّلت ${JOB.count} · كسبت ${egp(JOB.earned)}` : `${ic} روح خد الزبون من العلامة (★)${hero.veh === JOB_VEH[JOB.kind] ? '' : '<br>لازم تكون راكب ' + nm}`; }
  return '';
}
