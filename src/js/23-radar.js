// ================= radar =================
const radar = $('radar'), rctx = radar.getContext('2d'); const RW = 150, RSPAN = 2*HALF + 20;
const rx = x => (x + RSPAN/2) / RSPAN * RW, rz = z => (z + RSPAN/2) / RSPAN * RW;
const radarBase = document.createElement('canvas'); radarBase.width = radarBase.height = RW;
{ const g = radarBase.getContext('2d'); g.fillStyle = '#1a1712'; g.fillRect(0,0,RW,RW); g.fillStyle = '#3d3a35'; g.fillRect(rx(-HALF-6), rz(-HALF-6), rx(HALF+6)-rx(-HALF-6), rz(HALF+6)-rz(-HALF-6));
  blocksInfo.forEach(b => { g.fillStyle = b.type==='park' ? '#3d5a2b' : '#857a68'; g.fillRect(rx(b.cx-BW/2), rz(b.cz-BW/2), rx(b.cx+BW/2)-rx(b.cx-BW/2), rz(b.cz+BW/2)-rz(b.cz-BW/2)); });
  g.fillStyle = '#2a251f'; obstacles.filter(o=>o.building).forEach(o => g.fillRect(rx(o.minX), rz(o.minZ), rx(o.maxX)-rx(o.minX), rz(o.maxZ)-rz(o.minZ)));
  g.fillStyle = '#ffd34d'; g.font = '10px sans-serif'; g.fillText('☕', rx(17)-5, rz(30)+4); }
function dot(x, z, r, c){ rctx.fillStyle = c; rctx.beginPath(); rctx.arc(rx(x), rz(z), r, 0, 7); rctx.fill(); }
function drawRadar(t){
  rctx.drawImage(radarBase, 0, 0);
  if (modeId === 'cash') cash.forEach(c => { if (!c.taken) dot(c.x, c.z, 3, '#ffd34d'); });
  if (chaser.active) dot(chaserCar.position.x, chaserCar.position.z, 4, Math.floor(t*6)%2 ? '#ff3347' : '#3a6bff');
  if (enemy.active) dot(enemy.pos.x, enemy.pos.z, 3.5, '#ff8a3d');
  if (thief.active && !thief.caught) dot(thief.pos.x, thief.pos.z, 4, Math.floor(t*5)%2 ? '#ff4d4d' : '#ffd34d');
  if (wanted.active && !wanted.caught) dot(wanted.pos.x, wanted.pos.z, 4.5, Math.floor(t*4)%2 ? '#ff2020' : '#ffffff');
  if (modeId === 'story'){ dot(SHOP.pos.x, SHOP.pos.z, 3, '#b48cff'); if (missionMark.visible){ rctx.fillStyle = Math.floor(t*3)%2 ? '#ffc94a' : '#fff3c4'; rctx.font = 'bold 14px sans-serif'; rctx.textAlign = 'center'; rctx.fillText('★', rx(missionMark.position.x), rz(missionMark.position.z)+5); } }
  if (modeObj.vehicles){ dot(heroCar.pos.x, heroCar.pos.z, 2.5, '#e8b21a'); dot(heroMoto.pos.x, heroMoto.pos.z, 2.5, '#ff5a5a'); dot(copCar.pos.x, copCar.pos.z, 2.5, '#6ea8ff'); }
  const f = hero.veh ? hero.veh.pos : hero.pos; rctx.fillStyle = '#fff'; rctx.strokeStyle = '#000'; rctx.lineWidth = 1.5; rctx.beginPath(); rctx.arc(rx(f.x), rz(f.z), 4, 0, 7); rctx.fill(); rctx.stroke();
}
