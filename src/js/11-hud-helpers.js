// ================= HUD helpers =================
let bannerT = 0;
function banner(text, cls='info', dur=2.5){ const b = $('banner'); b.textContent = text; b.className = 'banner show ' + cls; bannerT = dur; }
function setObjective(title, html){ $('objTitle').textContent = title; $('objText').innerHTML = html; }
function flash(){ $('flash').style.opacity = 1; setTimeout(() => $('flash').style.opacity = 0, 180); }
function updateHud(){
  $('hpBar').style.width = clamp(hero.hp,0,100) + '%';
  $('stBar').style.width = (hero.stamina*100).toFixed(0) + '%'; $('stWrap').classList.toggle('tired', hero.tired);
  $('money').textContent = egp(hero.money);
}
function heroDamage(n, why){
  if (hero.inv > 0 || state !== 'play' || CUT.on || HOUSE.inside) return;
  hero.hp -= n; hero.hurtT = 0; flash(); thwack(); shake = Math.max(shake, .35);
  if (hero.hp <= 0){ hero.hp = 0; modeObj.onKO ? modeObj.onKO(why) : knockout(why); }
}
function knockout(why){
  banner(why === 'car' ? 'عربية خبطتك… فوقت في القهوة' : 'اتبهدلت… فوقت في القهوة', 'bad', 3);
  hero.hp = 100; hero.money = Math.max(0, hero.money - 20); if (hero.veh) exitVehicle(true);
  hero.pos.copy(SPOT.spawn); hero.inv = 2;
}
