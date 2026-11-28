// ================= stage 18: the six friends join the city (their story roles come in the story stages) =================
// Each stands where his part of the story happens, in his own 3D model (tools/friends → assets/models, rigged like the others).
// They load after the game starts (not on the loading screen), one by one, and are only drawn when you are near.
const FRIENDS = [
  { m: 'ali-eslam', name: 'علي إسلام', line: 'الميكروباص ده بتاعي… كاوتش ماحدش يزاحمه', at: () => { const L = LM.list.find(l => l.k === 'misrst'); return L && [L.root.position.x - 22, L.root.position.z - 34]; } },
  { m: 'monzer', name: 'منذر', line: 'أنا محاسب في البنك… ماليش في المشاكل', at: () => SETS.bank && (p => [p.x, p.z])(SETS.bank.at(4, 12.5)) },
  { m: 'shater', name: 'عبدالرحمن الشاطر', line: 'مدير بنك الثغر… محتاج حاجة يا حبيبي؟', at: () => SETS.bank && (p => [p.x, p.z])(SETS.bank.at(-3, 12.2)) },
  { m: 'ataallah', name: 'عطا الله', line: 'عايز ورق؟ كله يتعمل في العطارين', at: () => { const d = CITY && CITY.districts.find(d => d.k === 'attarin'); return d && [d.x + 18, d.z + 8]; } },
  { m: 'ali-almany', name: 'علي الألماني', line: 'هي الدنيا فلوس وبس… وأنا عليا ديون', at: () => { const L = LM.list.find(l => l.k === 'ramlst'); return L && [L.root.position.x + 26, L.root.position.z + 10]; } },
  { m: 'ahmed', name: 'أحمد عبدالخالق', line: 'اللانش ده بيطير على المية… جرّب', at: () => { const L = LM.list.find(l => l.k === 'qaitbay'); return L && [QAIT_GATE[0] + 14, QAIT_GATE[1] - 12]; } },
];
(async () => {
  if (!CITY || store.get('chars2d') === '1') return;
  for (let i = 0; i < 300 && (typeof LM === 'undefined' || LM.list.length < 10); i++) await new Promise(r => setTimeout(r, 500));   // after the landmarks
  for (const F of FRIENDS){
    try {
      if (!MODELS3D[F.m]){ const r = await loadModel3D(F.m); if (!r) continue; MODELS3D[F.m] = r; }
      const p = F.at(); if (!p) continue;
      const [x, z] = freeSpot(p[0], p[1]); const n = makeNPC(); n.name = F.name; n.role = 'friend'; n.state = 'stand'; n.friend = F;
      n.g.position.set(x, groundY(x, z), z); n.yaw = Math.random() * 6.28; npcWear3D(n, F.m); F.n = n;
    } catch (e){ console.warn('friend', F.m, e); }
    await new Promise(r => setTimeout(r, 300));
  }
})();
let friendsT = 0;
function updateFriends(dt){
  friendsT -= dt; if (friendsT > 0) return; friendsT = .5;
  const h = heroAt();
  for (const F of FRIENDS){ const n = F.n; if (!n) continue;
    const d = Math.hypot(n.g.position.x - h.x, n.g.position.z - h.z), show = d < 140 && !HOUSE.inside;
    if (n.state === 'stand' || n.state === 'hidden'){ n.state = show ? 'stand' : 'hidden'; n.g.visible = show; }
    if (show && n.state === 'stand' && d < 7){ n.yaw = Math.atan2(h.x - n.g.position.x, h.z - n.g.position.z);
      if (!F.saidT || performance.now() - F.saidT > 14000){ F.saidT = performance.now(); say(n, `${F.name}: ${F.line}`, 3.2); } }
  }
}
{ const _ucF = updateCity; updateCity = function(px, pz){ _ucF(px, pz); try { updateFriends(1 / 60); } catch (e){} }; }

// ---------- stage 18: real people in the street (Sketchfab CC-BY, rigged by the game) ----------
const PEOPLE = ['p-casual-man-polo', 'p-young-man-jacket', 'p-man-galabeya', 'p-old-man-cap', 'p-woman-hijab-abaya', 'p-woman-hijab-suit', 'p-woman-headscarf-dress', 'p-teen-girl-hijab'];
(async () => {
  if (store.get('chars2d') === '1') return;
  for (let i = 0; i < 300 && FRIENDS.some(F => F.n === undefined && !F.failed) && i < 120; i++) await new Promise(r => setTimeout(r, 500));
  const have = [];
  for (const m of PEOPLE){ try { if (!MODELS3D[m]){ const r = await loadModel3D(m); if (r) MODELS3D[m] = r; } if (MODELS3D[m]) have.push(m); } catch (e){} await new Promise(r => setTimeout(r, 200)); }
  if (!have.length) return;
  // the street's walkers (not the story's people, not the ones already in the galabeya): a share of them become real people
  const pool = npcs.filter(n => !n.r3 && !n.friend && !n.thug && (!n.role || n.role === 'walker' || n.role === 'crowd')), want = Math.min(pool.length, LOW ? 8 : GFX === 'high' ? 22 : 14);
  for (let i = 0; i < want; i++){ const n = pool[Math.floor(i * pool.length / want)]; if (npcWear3D(n, have[i % have.length]) && n.r3) n.r3.mesh.castShadow = GFX === 'high'; }   // their shadows only on «عالي» (the soft blob stays)
})();
