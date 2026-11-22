// ---- 00-setup.js ----
import * as THREE from 'three';
import { Sky } from 'three/addons/Sky.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';

const CH = await (await fetch('assets/chars.json')).json();
const $ = id => document.getElementById(id);
const store = { get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch(e){} } };
document.querySelectorAll('[data-face]').forEach(e => e.style.backgroundImage = `url(${CH.hero.img.face})`);
$('imgHero').src = CH.hero.img.full; $('imgEnemy').src = CH.enemy.img.full; $('imgWanted').src = CH.wanted.img.full; $('imgIslam').src = CH.islam.img.full; $('imgYoussef').src = CH.youssef.img.full;
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');
const LOW = isTouch || (navigator.hardwareConcurrency||8) <= 4; const WALKERS = LOW ? 10 : 16;
if (store.get('ty_name')) $('nameIn').value = store.get('ty_name');
try { await Promise.race([document.fonts.load('900 40px Cairo'), new Promise(r => setTimeout(r, 1800))]); } catch(e){}

// ---- 01-helpers.js ----
// ================= helpers =================
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const rng = mulberry32(777);
const R = (a,b) => a + (b-a)*rng();
const pick = arr => arr[Math.floor(rng()*arr.length)];
const rpick = arr => arr[Math.floor(Math.random()*arr.length)];
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const damp = (k, dt) => 1 - Math.exp(-k*dt);
const lerpAngle = (a,b,t) => { let d = ((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI; return a + d*t; };
const fmtTime = t => `${Math.floor(t/60)}:${String(Math.max(0,Math.floor(t%60))).padStart(2,'0')}`;
const DIFFS = { easy: { pat: 1.6, dmg: .55, enemySpd: .85, spill: 1.1, heat: .75, fry: 1.45, race: 1.3 }, normal: { pat: 1, dmg: 1, enemySpd: 1, spill: 1.02, heat: 1, fry: 1, race: 1 } };
let diffKey = store.get('ty_diff') === 'normal' ? 'normal' : 'easy', DIFF = DIFFS[diffKey];
const egp = n => `${Math.round(n).toLocaleString('en-US')} جنيه`;

// ---- 02-renderer.js ----
// ================= renderer =================
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1.25 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.86;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd8cbb3, 60, 230);
const camera = new THREE.PerspectiveCamera(46, innerWidth/innerHeight, 0.1, 900);
const sky = new Sky(); sky.scale.setScalar(4000); scene.add(sky);
const su = sky.material.uniforms;
su.turbidity.value = 9; su.rayleigh.value = 1.1; su.mieCoefficient.value = 0.006; su.mieDirectionalG.value = 0.82;
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90-33), THREE.MathUtils.degToRad(38));
su.sunPosition.value.copy(sunDir);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
scene.add(new THREE.HemisphereLight(0xd9e4f0, 0x7a6650, 0.42));
const sun = new THREE.DirectionalLight(0xffe3bd, 2.9);
sun.castShadow = true; sun.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left:-45, right:45, top:45, bottom:-45, near:1, far:280 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

// ---- 03-textures.js ----
// ================= textures =================
function makeTex(w,h,draw,rep){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h, c);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso;
  if (rep) t.repeat.set(rep[0], rep[1]);
  return t;
}
function grain(g,w,h,n,a){ for (let i=0;i<n;i++){ g.fillStyle = Math.random()<.5 ? `rgba(0,0,0,${Math.random()*a})` : `rgba(255,255,255,${Math.random()*a})`; const s = Math.random()*2+.5; g.fillRect(Math.random()*w, Math.random()*h, s, s); } }
function arText(g, text, x, y, size, color, weight=900, align='center'){ g.direction='rtl'; g.textAlign=align; g.textBaseline='middle'; g.font = `${weight} ${size}px Cairo, Tahoma, sans-serif`; g.fillStyle = color; g.fillText(text, x, y); }
const texLoader = new THREE.TextureLoader();
const dataTex = src => { const t = texLoader.load(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t; };

const asphaltTex = makeTex(512,512,(g,w,h)=>{
  g.fillStyle='#4a4846'; g.fillRect(0,0,w,h); grain(g,w,h,26000,.22);
  for (let i=0;i<22;i++){ g.fillStyle=`rgba(${Math.random()<.5?'30,28,26':'110,104,96'},.14)`; g.beginPath(); g.ellipse(Math.random()*w,Math.random()*h,20+Math.random()*70,10+Math.random()*40,Math.random()*3,0,7); g.fill(); }
  g.strokeStyle='rgba(20,20,20,.35)'; g.lineWidth=1.2; for (let i=0;i<6;i++){ g.beginPath(); let x=Math.random()*w, y=Math.random()*h; g.moveTo(x,y); for (let k=0;k<6;k++){ x+=Math.random()*40-20; y+=Math.random()*40-20; g.lineTo(x,y); } g.stroke(); }
}, [21,21]);
const grassTex = makeTex(256,256,(g,w,h)=>{ g.fillStyle='#7d7a4c'; g.fillRect(0,0,w,h); for (let i=0;i<9000;i++){ g.fillStyle=`hsla(${50+Math.random()*40},${25+Math.random()*25}%,${28+Math.random()*24}%,.6)`; g.fillRect(Math.random()*w,Math.random()*h,1,2+Math.random()*3); } }, [140,140]);
const parkTex = makeTex(256,256,(g,w,h)=>{ g.fillStyle='#4f6e33'; g.fillRect(0,0,w,h); for (let i=0;i<9000;i++){ g.fillStyle=`hsla(${80+Math.random()*30},${35+Math.random()*25}%,${20+Math.random()*24}%,.6)`; g.fillRect(Math.random()*w,Math.random()*h,1,2+Math.random()*3); } }, [6,6]);
const paveTex = makeTex(256,256,(g,w,h)=>{
  const cols=['#a0705c','#8f8c86','#a87a64','#8a8780'];
  for (let y=0;y<8;y++) for (let x=0;x<8;x++){ g.fillStyle = cols[((x+y)%2)*2 + (Math.random()<.2?1:0)]; g.fillRect(x*32,y*32,32,32); }
  grain(g,w,h,9000,.18); g.strokeStyle='rgba(40,34,30,.5)'; g.lineWidth=2;
  for (let i=0;i<=8;i++){ g.beginPath(); g.moveTo(i*32,0); g.lineTo(i*32,h); g.stroke(); g.beginPath(); g.moveTo(0,i*32); g.lineTo(w,i*32); g.stroke(); }
}, [12,12]);
const curbTex = makeTex(64,16,(g)=>{ g.fillStyle='#f2f0ea'; g.fillRect(0,0,32,16); g.fillStyle='#1d1d1d'; g.fillRect(32,0,32,16); }, [18,1]);
curbTex.colorSpace = THREE.SRGBColorSpace;
const roofTex = makeTex(256,256,(g,w,h)=>{ g.fillStyle='#8a8378'; g.fillRect(0,0,w,h); grain(g,w,h,9000,.22); g.fillStyle='rgba(0,0,0,.12)'; for(let i=0;i<10;i++){ g.beginPath(); g.ellipse(Math.random()*w,Math.random()*h,10+Math.random()*30,8+Math.random()*20,0,0,7); g.fill(); } });
const lotTex = makeTex(512,512,(g,w,h)=>{ g.fillStyle='#57544f'; g.fillRect(0,0,w,h); grain(g,w,h,20000,.2); }, [3,3]);

const FSTY = [
  {wall:'#cfa977', trim:'#ead9b6', sh:'#5d7a4a'}, {wall:'#d8c39d', trim:'#f1e6cf', sh:'#7a4b2a'},
  {wall:'#c38d76', trim:'#ebcdbd', sh:'#4c6670'}, {wall:'#dccd94', trim:'#f5ecd0', sh:'#6b4a33'},
  {wall:'#a4a19a', trim:'#d2cfc8', sh:'#3f5a45'}, {wall:'#9a5a3e', trim:'#b7b0a4', sh:'#55402e', brick:true},
];
const facadeTex = FSTY.map(S => makeTex(512,512,(g,w,h)=>{
  const bw=128, fh=128;
  g.fillStyle=S.wall; g.fillRect(0,0,w,h); grain(g,w,h,14000,.13);
  if (S.brick){
    g.strokeStyle='rgba(50,22,12,.35)'; g.lineWidth=1;
    for (let y=0;y<h;y+=8){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); for (let x=((y/8)%2)*9;x<w;x+=18){ g.beginPath(); g.moveTo(x,y); g.lineTo(x,y+8); g.stroke(); } }
    g.fillStyle='#b8b1a5'; for (let fy=0;fy<4;fy++) g.fillRect(0,fy*fh+fh-12,w,12); for (let bx=0;bx<=4;bx++) g.fillRect(bx*bw-6,0,12,h);
  }
  for (let fy=0;fy<4;fy++) for (let bx=0;bx<4;bx++){
    const x=bx*bw, y=fy*fh, wx=x+30, wy=y+26, ww=bw-60, wh=fh-48;
    g.fillStyle=S.trim; g.fillRect(wx-6,wy-6,ww+12,wh+12);
    const r = Math.random();
    if (r < .42){ // closed wooden shutters (شيش)
      g.fillStyle=S.sh; g.fillRect(wx,wy,ww,wh); g.strokeStyle='rgba(0,0,0,.35)'; g.lineWidth=1.5;
      for (let k=wy+4;k<wy+wh;k+=5){ g.beginPath(); g.moveTo(wx+2,k); g.lineTo(wx+ww-2,k); g.stroke(); }
      g.fillStyle='rgba(0,0,0,.4)'; g.fillRect(wx+ww/2-1,wy,2,wh);
    } else {
      const gr=g.createLinearGradient(wx,wy,wx+ww*.6,wy+wh); gr.addColorStop(0,'#5f7480'); gr.addColorStop(1,'#1f2830'); g.fillStyle=gr; g.fillRect(wx,wy,ww,wh);
      if (Math.random()<.5){ g.fillStyle=`rgba(${190+Math.random()*60|0},${150+Math.random()*80|0},${120+Math.random()*80|0},.9)`; g.fillRect(wx,wy,ww*.35,wh); g.fillRect(wx+ww*.65,wy,ww*.35,wh); }
      if (r > .75){ g.fillStyle=S.sh; g.fillRect(wx-14,wy,12,wh); g.fillRect(wx+ww+2,wy,12,wh); }
      g.fillStyle=S.trim; g.fillRect(wx+ww/2-2,wy,4,wh);
    }
    // dirt streak under window
    const st=g.createLinearGradient(0,wy+wh,0,wy+wh+40); st.addColorStop(0,'rgba(40,30,20,.22)'); st.addColorStop(1,'rgba(40,30,20,0)'); g.fillStyle=st; g.fillRect(wx,wy+wh+6,ww,40);
  }
}));
// ground-floor shops: 3 bays of 4m, 3.6m tall
const bandTex = makeTex(768,232,(g,w,h)=>{
  g.fillStyle='#5b544b'; g.fillRect(0,0,w,h); grain(g,w,h,9000,.15);
  for (let b=0;b<3;b++){
    const x=b*256;
    g.fillStyle='#3a332c'; g.fillRect(x+8,46,240,176);
    if (b===0){ // rolling shutter
      g.fillStyle='#8d8f91'; g.fillRect(x+12,50,232,172); g.strokeStyle='rgba(0,0,0,.35)'; for (let y=54;y<222;y+=6){ g.beginPath(); g.moveTo(x+12,y); g.lineTo(x+244,y); g.stroke(); }
      g.fillStyle='rgba(30,30,30,.4)'; g.fillRect(x+12,212,232,10);
    } else if (b===1){ // open shop with shelves
      const gr=g.createLinearGradient(0,50,0,222); gr.addColorStop(0,'#f3e3b8'); gr.addColorStop(1,'#a8895a'); g.fillStyle=gr; g.fillRect(x+12,50,232,172);
      for (let s=0;s<4;s++){ g.fillStyle='#6b4a2a'; g.fillRect(x+16,80+s*36,224,5); for (let k=0;k<14;k++){ g.fillStyle=`hsl(${Math.random()*360},60%,${40+Math.random()*25}%)`; g.fillRect(x+20+k*16,62+s*36,12,18); } }
      g.fillStyle='rgba(255,255,255,.1)'; g.fillRect(x+12,50,232,172);
    } else { // glass door shop
      g.fillStyle='#24323a'; g.fillRect(x+12,50,232,172); g.fillStyle='rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(x+30,50); g.lineTo(x+90,50); g.lineTo(x+40,222); g.lineTo(x+12,222); g.fill();
      g.fillStyle='#c9c1b0'; g.fillRect(x+126,50,4,172);
    }
  }
  g.fillStyle='#2b2723'; g.fillRect(0,0,w,44);
});
const shopNames = [['سوبر ماركت الأمانة','#1f6f43'],['صيدلية الشفاء','#1e5aa8'],['حلاق الجامد','#7a1f2b'],['عصير قصب الحرية','#2d7a1f'],['كشري التحرير','#a33a12'],['موبايلات طيارة','#202a6e'],['بقالة الحاج محمود','#6e4a1e'],['مكوجي النور','#4b2a6e'],['مخبز العيش البلدي','#8a5a12'],['عطارة الأصول','#5a3a1a']];
const signTex = shopNames.map(([t,c]) => makeTex(640,100,(g,w,h)=>{
  g.fillStyle=c; g.fillRect(0,0,w,h); g.strokeStyle='#ffd34d'; g.lineWidth=6; g.strokeRect(4,4,w-8,h-8);
  arText(g, t, w/2, h/2+3, 50, '#fff7df');
}));
signTex.forEach(t => { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; });
const noEntryTex = makeTex(512,170,(g,w,h)=>{
  g.fillStyle='#fbfaf6'; g.fillRect(0,0,w,h); g.strokeStyle='#d0101e'; g.lineWidth=12; g.strokeRect(6,6,w-12,h-12);
  arText(g,'ممنوع دخول',w/2,58,54,'#d0101e'); arText(g,'يوسف إبراهيم',w/2,122,48,'#151515');
});
noEntryTex.wrapS = noEntryTex.wrapT = THREE.ClampToEdgeWrapping;
const doorTex = makeTex(128,224,(g,w,h)=>{
  g.fillStyle='#5a3a22'; g.fillRect(0,0,w,h); grain(g,w,h,3000,.2);
  g.strokeStyle='rgba(0,0,0,.45)'; g.lineWidth=4; g.strokeRect(14,14,w-28,90); g.strokeRect(14,118,w-28,92);
  g.fillStyle='#d6b25a'; g.beginPath(); g.arc(w-24,h/2+8,6,0,7); g.fill();
});
const posterCanvas = document.createElement('canvas'); posterCanvas.width = 300; posterCanvas.height = 400;
const posterTex = new THREE.CanvasTexture(posterCanvas); posterTex.colorSpace = THREE.SRGBColorSpace;
{ const g = posterCanvas.getContext('2d');
  g.fillStyle='#efe3c4'; g.fillRect(0,0,300,400); grain(g,300,400,4000,.12);
  g.strokeStyle='#5b3b17'; g.lineWidth=6; g.strokeRect(8,8,284,384);
  arText(g,'مطلوب',150,52,62,'#b3121f'); g.font='900 26px Georgia'; g.direction='ltr'; g.fillStyle='#3b2410'; g.textAlign='center'; g.fillText('WANTED',150,96);
  arText(g,'مكافأة ٥٠٬٠٠٠ جنيه',150,360,30,'#3b2410');
  const img = new Image(); img.onload = () => { g.fillStyle='#222'; g.fillRect(58,116,184,214); g.drawImage(img,60,118,180,210); g.fillStyle='rgba(120,80,30,.15)'; g.fillRect(60,118,180,210); posterTex.needsUpdate = true; }; img.src = CH.wanted.img.face;
}
const cafeSignTex = makeTex(1024,180,(g,w,h)=>{
  const gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#0f4a33'); gr.addColorStop(1,'#08301f'); g.fillStyle=gr; g.fillRect(0,0,w,h);
  g.strokeStyle='#e8b93a'; g.lineWidth=10; g.strokeRect(8,8,w-16,h-16);
  arText(g,'♛ قهوة قصر الملوك ♛',w/2,h/2+6,92,'#ffd86b');
});
cafeSignTex.wrapS = cafeSignTex.wrapT = THREE.ClampToEdgeWrapping;
const foulSignTex = makeTex(512,120,(g,w,h)=>{ g.fillStyle='#f2c230'; g.fillRect(0,0,w,h); g.strokeStyle='#8a1a10'; g.lineWidth=8; g.strokeRect(5,5,w-10,h-10); arText(g,'فول وفلافل الجامد',w/2,h/2+4,58,'#8a1a10'); });
foulSignTex.wrapS = foulSignTex.wrapT = THREE.ClampToEdgeWrapping;
const checkerTex = makeTex(64,16,(g)=>{ for (let x=0;x<8;x++) for (let y=0;y<2;y++){ g.fillStyle=(x+y)%2?'#111':'#f4f4f4'; g.fillRect(x*8,y*8,8,8); } }, [6,1]);

// ---- 04-world-layout.js ----
// ================= world layout =================
const PITCH = 48, N = 4, HALF = PITCH*N/2;
const ROADS = [...Array(N+1)].map((_,i) => -HALF + i*PITCH);
const BLOCKS = [...Array(N)].map((_,i) => -HALF + PITCH/2 + i*PITCH);
const BW = PITCH - 12, LIMIT = HALF + 5.5;
const CAFE = { cx: 24, cz: 24 };
const SPOT = {
  spawn: new THREE.Vector3(17, 0, 36.5), counter: new THREE.Vector3(21, 0, 22.6), domino: new THREE.Vector3(30, 0, 25.5),
  cart: new THREE.Vector3(34.5, 0, 31), cartHero: new THREE.Vector3(34.5, 0, 29.7), policeSpawn: new THREE.Vector3(32, 0, 40.2),
};
const TABLES = [[12,26.5],[17,26.5],[22,26.5],[12,32],[17,32],[22,32]];
const SEATS = TABLES.flatMap(([x,z],ti) => [{x:x-.85,z,ry:Math.PI/2,ti},{x:x+.85,z,ry:-Math.PI/2,ti}]);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(900,900), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
ground.rotation.x = -Math.PI/2; ground.position.y = -0.02; ground.receiveShadow = true; scene.add(ground);
const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(2*HALF+14, 2*HALF+14), new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: .93, envMapIntensity: .3 }));
asphalt.rotation.x = -Math.PI/2; asphalt.receiveShadow = true; scene.add(asphalt);

const obstacles = [], buildings = [], blocksInfo = [];
const treeList = [], lampList = [], whiteMarks = [], yellowMarks = [], parkedSpots = [];
const doors = [], noEntry = [], posters = [], signs = shopNames.map(() => []);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function instanced(geo, mat, list, cast=true, fn){
  if (!list.length) return null;
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  list.forEach((t,i)=>{ const tr = fn ? fn(t) : t; _e.set(tr.rx||0, tr.ry||0, 0); _q.setFromEuler(_e); _m.compose(_v.set(tr.x, tr.y||0, tr.z), _q, _s.set(tr.sx??1, tr.sy??1, tr.sz??1)); im.setMatrixAt(i, _m); });
  im.castShadow = cast; im.receiveShadow = true; scene.add(im); return im;
}
const slabMats = (() => { const side = new THREE.MeshStandardMaterial({ map: curbTex, roughness: .8 }); const top = new THREE.MeshStandardMaterial({ map: paveTex, roughness: .95, envMapIntensity: .3 }); return [side, side, top, top, side, side]; })();
const slabGeo = new THREE.BoxGeometry(BW, .15, BW);

// ---- merged-geometry helper with vertex colors ----
const _col = new THREE.Color();
function colored(geo, color){ _col.set(color); const n = geo.attributes.position.count, a = new Float32Array(n*3); for (let i=0;i<n;i++){ a[i*3]=_col.r; a[i*3+1]=_col.g; a[i*3+2]=_col.b; } geo.setAttribute('color', new THREE.BufferAttribute(a,3)); return geo; }
function box(list, w,h,d, x,y,z, color, ry=0){ const g = new THREE.BoxGeometry(w,h,d); if (ry) g.rotateY(ry); g.translate(x,y,z); list.push(colored(g,color)); }
function cyl(list, rt,rb,h, x,y,z, color, rx=0, seg=12){ const g = new THREE.CylinderGeometry(rt,rb,h,seg); if (rx) g.rotateX(rx); g.translate(x,y,z); list.push(colored(g,color)); }

const BAND_H = 3.6, BASE = .15 + BAND_H;
function addBuilding(cx, cz, w, d, floors, styleIdx, opts={}){
  const S = FSTY[styleIdx], h = floors*3.2;
  const grp = new THREE.Group(); grp.position.set(cx, 0, cz); scene.add(grp);
  // upper floors
  const geo = new THREE.BoxGeometry(w, h, d); const uv = geo.attributes.uv;
  for (let i=0;i<24;i++){ let a=1,b=1; if (i<8){ a=d/16; b=h/12.8; } else if (i<16){ a=w/10; b=d/10; } else { a=w/16; b=h/12.8; } uv.setXY(i, uv.getX(i)*a, uv.getY(i)*b); }
  const fm = new THREE.MeshStandardMaterial({ map: facadeTex[styleIdx], roughness: .9, envMapIntensity: .3 });
  const rm = new THREE.MeshStandardMaterial({ map: roofTex, roughness: .95, envMapIntensity: .25 });
  const main = new THREE.Mesh(geo, [fm,fm,rm,rm,fm,fm]); main.position.y = BASE + h/2; main.castShadow = main.receiveShadow = true; grp.add(main);
  // shop band
  const bgeo = new THREE.BoxGeometry(w+.14, BAND_H, d+.14); const buv = bgeo.attributes.uv; const off = Math.floor(rng()*3)/3;
  for (let i=0;i<24;i++){ let a=1; if (i<8) a=d/12; else if (i<16) a=0; else a=w/12; buv.setXY(i, buv.getX(i)*a + off, buv.getY(i)); }
  const bm = new THREE.MeshStandardMaterial({ map: opts.bandTex || bandTex, roughness: .85, envMapIntensity: .3 });
  const band = new THREE.Mesh(bgeo, bm); band.position.y = .15 + BAND_H/2; band.castShadow = band.receiveShadow = true; grp.add(band);
  // details: balconies, AC units, tanks, dishes, parapet
  const parts = [];
  const trimC = new THREE.Color(S.wall).multiplyScalar(.82).getStyle();
  box(parts, w+.3, .3, d+.3, 0, BASE + h + .15, 0, trimC);
  box(parts, w+.2, .18, d+.2, 0, BASE - .05, 0, '#3b342d');
  for (const fz of [1,-1]){
    const nb = Math.floor((w-1)/4);
    for (let f=1; f<floors; f++) for (let i=0;i<nb;i++){
      const bx = fz>0 ? -w/2 + 2 + 4*i : w/2 - 2 - 4*i;
      if (rng() < .42){
        const y = BASE + f*3.2 + .45, zz = fz*(d/2 + .5);
        box(parts, 2.9, .14, 1.0, bx, y, zz, trimC);
        box(parts, 2.9, .9, .06, bx, y+.5, fz*(d/2+.98), rng()<.5 ? '#2b2b2b' : S.trim);
        box(parts, .06, .9, 1.0, bx-1.42, y+.5, zz, '#2b2b2b'); box(parts, .06, .9, 1.0, bx+1.42, y+.5, zz, '#2b2b2b');
      } else if (rng() < .3){
        box(parts, .8, .5, .4, bx + 1.4, BASE + f*3.2 + 2.75 - 3.2*(rng()<.5?0:0), fz*(d/2+.2), '#e8e6e0');
      }
    }
  }
  for (const fx of [1,-1]) for (let f=1; f<floors; f++) if (rng()<.35) box(parts, .4, .5, .8, fx*(w/2+.2), BASE + f*3.2 + 2.6, R(-d/2+2, d/2-2), '#e8e6e0');
  const nt = 1 + Math.floor(rng()*3);
  for (let i=0;i<nt;i++) cyl(parts, .55, .55, 1.2, R(-w/2+1.5, w/2-1.5), BASE+h+.75, R(-d/2+1.5, d/2-1.5), rng()<.5?'#1d1d1d':'#2f5c8a');
  const nd = 1 + Math.floor(rng()*4);
  for (let i=0;i<nd;i++){ const g = new THREE.CylinderGeometry(.5,.08,.16,14); g.rotateX(-.9); g.translate(R(-w/2+1, w/2-1), BASE+h+.7, R(-d/2+1, d/2-1)); parts.push(colored(g,'#dcdad4')); }
  for (let i=0;i<2;i++) box(parts, R(1,2.2), R(.6,1.4), R(1,2.2), R(-w/2+1.5,w/2-1.5), BASE+h+.6, R(-d/2+1.5,d/2-1.5), '#8f8a80');
  const dm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, envMapIntensity: .3 });
  const det = new THREE.Mesh(mergeGeometries(parts), dm); det.castShadow = true; det.receiveShadow = true; grp.add(det);
  grp.updateMatrixWorld(true);
  const b = { grp, mats:[fm,rm,bm,dm], box:new THREE.Box3().setFromObject(grp), opacity:1 };
  buildings.push(b);
  obstacles.push({ minX:cx-w/2-.1, maxX:cx+w/2+.1, minZ:cz-d/2-.1, maxZ:cz+d/2+.1, building:true });
  // street-facing faces: doors + "no entry" plates, posters, shop signs
  const faces = opts.faces || [];
  for (const f of faces){
    const along = (f==='pz'||f==='nz') ? w : d;
    const ry = { pz:0, nz:Math.PI, px:Math.PI/2, nx:-Math.PI/2 }[f];
    const place = (u, y, out) => {
      const o = out ?? .08;
      if (f==='pz') return { x:cx+u, y, z:cz+d/2+o+.07, ry };
      if (f==='nz') return { x:cx-u, y, z:cz-d/2-o-.07, ry };
      if (f==='px') return { x:cx+w/2+o+.07, y, z:cz-u, ry };
      return { x:cx-w/2-o-.07, y, z:cz+u, ry };
    };
    const du = opts.doorU ?? R(-along/2+1.5, along/2-1.5);
    if (!opts.noDoor){ doors.push(place(du, .15+1.12)); noEntry.push(place(du, 2.62, .1)); }
    if (rng() < .75 && !opts.noPoster){ let pu = du + (rng()<.5?-2.2:2.2); if (Math.abs(pu) > along/2-.8) pu = du - Math.sign(pu)*2.2; posters.push(place(pu, 1.75, .1)); }
    if (!opts.noSign && along > 6.5) signs[Math.floor(rng()*signs.length)].push(place(R(-along/2+3, along/2-3), 3.32, .12));
  }
  return b;
}

for (let j=0;j<N;j++) for (let k=0;k<N;k++){
  const cx = BLOCKS[j], cz = BLOCKS[k];
  let type = 'city'; const r = rng();
  if (j===2 && k===2) type = 'cafe'; else if (r < .1) type = 'park'; else if (r < .17) type = 'parking';
  blocksInfo.push({ cx, cz, type });
  const slab = new THREE.Mesh(slabGeo, slabMats); slab.position.set(cx, .075, cz); slab.receiveShadow = true; scene.add(slab);
  if (type === 'park'){
    const g = new THREE.Mesh(new THREE.BoxGeometry(BW-6, .06, BW-6), new THREE.MeshStandardMaterial({ map: parkTex, roughness: 1 })); g.position.set(cx, .18, cz); g.receiveShadow = true; scene.add(g);
    for (let i=0;i<12;i++) treeList.push({ x: cx+R(-12,12), z: cz+R(-12,12), s: R(.9,1.5) });
  } else if (type === 'parking'){
    const g = new THREE.Mesh(new THREE.BoxGeometry(BW-6, .04, BW-6), new THREE.MeshStandardMaterial({ map: lotTex, roughness: .9 })); g.position.set(cx, .17, cz); g.receiveShadow = true; scene.add(g);
    for (const row of [-7, 7]){
      for (let i=0;i<10;i++){ const x = cx - 12.6 + i*2.8; whiteMarks.push({ x: x-1.4, y:.2, z: cz+row, sx:.12, sy:1, sz:5 }); if (rng() < .55) parkedSpots.push({ x, z: cz+row, ry: row<0 ? 0 : Math.PI, y:.19 }); }
      whiteMarks.push({ x: cx + 12.6 + 1.4, y:.2, z: cz+row, sx:.12, sy:1, sz:5 });
    }
  } else if (type === 'cafe'){
    const cafeBand = makeTex(768,232,(g,w,h)=>{
      g.fillStyle='#3a2a1c'; g.fillRect(0,0,w,h);
      const gr=g.createLinearGradient(0,50,0,232); gr.addColorStop(0,'#ffd88a'); gr.addColorStop(1,'#a4642a'); g.fillStyle=gr; g.fillRect(10,50,w-20,172);
      for (let i=0;i<9;i++){ g.fillStyle='#5a3a1e'; g.fillRect(30+i*82,120,46,100); g.fillStyle='#2a1a0e'; g.fillRect(40+i*82,100,26,26); }
      for (let i=0;i<14;i++){ g.fillStyle='rgba(255,240,200,.9)'; g.beginPath(); g.arc(30+i*52,62,6,0,7); g.fill(); }
      g.fillStyle='#2a1d12'; g.fillRect(0,0,w,46);
    });
    const cb = addBuilding(17.5, 15.5, 16, 12, 5, 1, { bandTex: cafeBand, faces:['pz','nz','nx'], doorU: 0, noSign: true, noPoster: true });
    void cb;
    addBuilding(33, 15.5, 11.5, 12, 7, 2, { faces:['pz','nz','px'] });
    const sgn = new THREE.Mesh(new THREE.PlaneGeometry(11, 1.9), new THREE.MeshStandardMaterial({ map: cafeSignTex, emissive: 0xffffff, emissiveMap: cafeSignTex, emissiveIntensity: .35, roughness: .6 }));
    sgn.position.set(17.5, 3.0, 21.65); scene.add(sgn);
    // awning
    const aw = new THREE.Mesh(new THREE.BoxGeometry(14, .08, 2.6), new THREE.MeshStandardMaterial({ color: 0x1d6b44, roughness: .8 })); aw.position.set(17.5, 3.75, 22.9); aw.rotation.x = .18; aw.castShadow = true; aw.name = 'cafeAwning'; scene.add(aw);
  } else {
    const rows = [[cz-15, cz-.3], [cz+.3, cz+15]];
    rows.forEach(([z0,z1], ri) => {
      const n = rng() < .55 ? 2 : 3; let x = cx - 15; const widths = [];
      let rem = 30; for (let i=0;i<n;i++){ const wv = i===n-1 ? rem : R(8, rem - 8*(n-1-i)); widths.push(wv); rem -= wv; }
      widths.forEach((wv, i) => {
        const bw = wv - .5, bd = (z1-z0) - R(0, 1.5);
        const bz = ri === 0 ? z0 + bd/2 : z1 - bd/2;
        const faces = [ri === 0 ? 'nz' : 'pz']; if (i===0) faces.push('nx'); if (i===n-1) faces.push('px');
        addBuilding(x + wv/2, bz, bw, bd, Math.floor(R(4, 11)), Math.floor(rng()*FSTY.length), { faces });
        x += wv;
      });
    });
    for (const side of [[0,1],[0,-1],[1,0],[-1,0]]) for (let t=-12;t<=12;t+=8) if (rng()<.4){ const off = BW/2 - 1.5; treeList.push(side[0] ? { x: cx+side[0]*off, z: cz+t, s:R(.75,1.05) } : { x: cx+t, z: cz+side[1]*off, s:R(.75,1.05) }); }
  }
}

// road markings, lamps, street parking
for (let i=0;i<=N;i++){
  for (let s=0;s<N;s++){
    const a = ROADS[s]+7.5, b = ROADS[s+1]-7.5, mid=(a+b)/2, len=b-a, r=ROADS[i];
    for (let q=a; q<b-2; q+=6){ whiteMarks.push({ x:q+1.5, y:.012, z:r, sx:3, sy:1, sz:.14 }); whiteMarks.push({ x:r, y:.012, z:q+1.5, sx:.14, sy:1, sz:3 }); }
    void mid; void len;
    for (const side of [-1,1]){
      const blockSide = r + side*7;
      if (blockSide < -HALF || blockSide > HALF) continue;
      for (const t of [12,24,36]){
        lampList.push({ x: ROADS[s]+t, z: r+side*6.7, ry: side>0 ? Math.PI : 0 });
        lampList.push({ x: r+side*6.7, z: ROADS[s]+t, ry: side>0 ? -Math.PI/2 : Math.PI/2 });
      }
      const nP = Math.floor(rng()*3);
      for (let p=0;p<nP;p++){
        const t = R(a+3, b-3);
        if (rng()<.5) parkedSpots.push({ x: t, z: r+side*5, ry: side>0 ? -Math.PI/2 : Math.PI/2, y:0 });
        else parkedSpots.push({ x: r+side*5, z: t, ry: side>0 ? Math.PI : 0, y:0 });
      }
    }
  }
}
for (const xi of ROADS) for (const zi of ROADS) for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const ex = xi+dx*8.2, ez = zi+dz*8.2;
  if (Math.abs(ex) > HALF+1 || Math.abs(ez) > HALF+1) continue;
  for (let q=-5;q<=5;q+=1.1){ if (dx) whiteMarks.push({ x: ex, y:.013, z: zi+q, sx: 2.6, sy:1, sz:.55 }); else whiteMarks.push({ x: xi+q, y:.013, z: ez, sx:.55, sy:1, sz:2.6 }); }
}
// speed bumps near the cafe
for (const x of [6, 42]) yellowMarks.push({ x, y:.05, z:48, sx:.6, sy:5, sz:10 });

const markGeo = new THREE.BoxGeometry(1, .02, 1);
instanced(markGeo, new THREE.MeshStandardMaterial({ color: 0xe8e6df, roughness: .8 }), whiteMarks, false);
instanced(markGeo, new THREE.MeshStandardMaterial({ color: 0xe3b23c, roughness: .8 }), yellowMarks, false);
const planeGeo = new THREE.PlaneGeometry(1,1);
instanced(planeGeo, new THREE.MeshStandardMaterial({ map: doorTex, roughness: .8 }), doors, false, t => ({ ...t, sx:1.3, sy:2.2 }));
instanced(planeGeo, new THREE.MeshStandardMaterial({ map: noEntryTex, roughness: .6, emissive: 0xffffff, emissiveMap: noEntryTex, emissiveIntensity: .12 }), noEntry, false, t => ({ ...t, sx:1.45, sy:.48 }));
instanced(planeGeo, new THREE.MeshStandardMaterial({ map: posterTex, roughness: .9 }), posters, false, t => ({ ...t, sx:.85, sy:1.13 }));
signs.forEach((list,i) => instanced(planeGeo, new THREE.MeshStandardMaterial({ map: signTex[i], roughness: .6, emissive: 0xffffff, emissiveMap: signTex[i], emissiveIntensity: .1 }), list, false, t => ({ ...t, sx:5.2, sy:.82 })));

// trees + lamps
const trunkGeo = new THREE.CylinderGeometry(.11, .18, 2.6, 7); trunkGeo.translate(0, 1.3, 0);
const leafGeo = new THREE.IcosahedronGeometry(1, 2);
{ const p = leafGeo.attributes.position; for (let i=0;i<p.count;i++){ _v.fromBufferAttribute(p,i); _v.multiplyScalar(1 + (Math.sin(_v.x*5.1)+Math.cos(_v.y*4.3+_v.z*3.7))*.07); p.setXYZ(i,_v.x,_v.y,_v.z); } leafGeo.computeVertexNormals(); }
instanced(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: 1 }), treeList, true, t => ({ x:t.x, y:.15, z:t.z, sx:t.s, sy:t.s, sz:t.s }));
const leaves = [];
treeList.forEach(t=>{
  leaves.push({ x:t.x, y:.15+2.9*t.s, z:t.z, sx:1.6*t.s, sy:1.25*t.s, sz:1.6*t.s });
  leaves.push({ x:t.x+.6*t.s, y:.15+2.4*t.s, z:t.z+.3*t.s, sx:1.05*t.s, sy:.95*t.s, sz:1.05*t.s });
  leaves.push({ x:t.x-.5*t.s, y:.15+3.5*t.s, z:t.z-.3*t.s, sx:1.0*t.s, sy:.9*t.s, sz:1.0*t.s });
  obstacles.push({ minX:t.x-.25, maxX:t.x+.25, minZ:t.z-.25, maxZ:t.z+.25 });
});
const leafIM = instanced(leafGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .95 }), leaves);
{ const c = new THREE.Color(); for (let i=0;i<leaves.length;i++){ c.setHSL(.22+Math.random()*.07, .42+Math.random()*.15, .24+Math.random()*.1); leafIM.setColorAt(i,c); } }
const poleGeo = new THREE.CylinderGeometry(.07, .1, 6.2, 8); poleGeo.translate(0, 3.25, 0);
const armGeo = new THREE.BoxGeometry(.12, .12, 1.6); armGeo.translate(0, 6.35, .7);
const headGeo = new THREE.BoxGeometry(.32, .14, .7); headGeo.translate(0, 6.25, 1.35);
instanced(mergeGeometries([poleGeo, armGeo]), new THREE.MeshStandardMaterial({ color: 0x3a3d40, metalness: .7, roughness: .45 }), lampList);
instanced(headGeo, new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff2cc, emissiveIntensity: .35 }), lampList, false);
lampList.forEach(l => obstacles.push({ minX:l.x-.15, maxX:l.x+.15, minZ:l.z-.15, maxZ:l.z+.15 }));

// ---- cafe furniture ----
const tableList = TABLES.map(([x,z]) => ({ x, z })).concat([{ x: SPOT.domino.x, z: SPOT.domino.z }]);
{
  const top = new THREE.CylinderGeometry(.55,.55,.05,20); top.translate(0,.88,0);
  const leg = new THREE.CylinderGeometry(.05,.05,.72,8); leg.translate(0,.5,0);
  const foot = new THREE.CylinderGeometry(.3,.3,.04,14); foot.translate(0,.17,0);
  instanced(mergeGeometries([top]), new THREE.MeshStandardMaterial({ color: 0xd9d4c7, roughness: .5, metalness: .2 }), tableList);
  instanced(mergeGeometries([leg, foot]), new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: .6, roughness: .4 }), tableList);
  tableList.forEach(t => obstacles.push({ minX:t.x-.5, maxX:t.x+.5, minZ:t.z-.5, maxZ:t.z+.5 }));
  const chairParts = []; box(chairParts, .44,.05,.44, 0,.47,0, '#ffffff'); box(chairParts, .44,.48,.05, 0,.72,-.2, '#ffffff');
  for (const [a,b] of [[-.19,-.19],[.19,-.19],[-.19,.19],[.19,.19]]) box(chairParts, .04,.47,.04, a,.235,b, '#ffffff');
  const chairGeo = mergeGeometries(chairParts);
  const chairs = SEATS.map(s => ({ x:s.x, z:s.z, ry:s.ry, y:.15 })).concat([{ x:SPOT.domino.x-.85, z:SPOT.domino.z, ry:Math.PI/2, y:.15 }, { x:SPOT.domino.x+.85, z:SPOT.domino.z, ry:-Math.PI/2, y:.15 }]);
  const chairIM = instanced(chairGeo, new THREE.MeshStandardMaterial({ vertexColors: true, color: 0xffffff, roughness: .6 }), chairs);
  const cc = new THREE.Color(); chairs.forEach((c,i) => { cc.set(i%3===0 ? '#c9302c' : '#f2f0ea'); chairIM.setColorAt(i, cc); });
  // dominoes on the domino table
  const dp = []; for (let i=0;i<9;i++) box(dp, .09,.025,.18, SPOT.domino.x - .36 + i*.095, 1.04, SPOT.domino.z + (i%2?.05:-.05), '#f4f0e6');
  for (let i=0;i<5;i++) box(dp, .09,.18,.025, SPOT.domino.x - .2 + i*.1, 1.11, SPOT.domino.z - .38, '#f4f0e6');
  const dmesh = new THREE.Mesh(mergeGeometries(dp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .4 })); dmesh.position.y = -.12; scene.add(dmesh);
  // counter (النَصبة)
  const cp = []; box(cp, 3.2,.95,.8, 0,.62,0, '#6b4528'); box(cp, 3.3,.06,.9, 0,1.12,0, '#c7b9a0');
  const counter = new THREE.Mesh(mergeGeometries(cp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 })); counter.position.set(SPOT.counter.x, 0, SPOT.counter.z); counter.castShadow = true; scene.add(counter);
  obstacles.push({ minX:SPOT.counter.x-1.6, maxX:SPOT.counter.x+1.6, minZ:SPOT.counter.z-.4, maxZ:SPOT.counter.z+.4 });
  // foul cart
  const fp = []; box(fp, 2.4,.9,1.1, 0,.95,0, '#2f6fa8'); box(fp, 2.5,.06,1.2, 0,1.42,0, '#d9d2c2');
  for (const x of [-1,1]){ const g = new THREE.CylinderGeometry(.32,.32,.1,16); g.rotateX(Math.PI/2); g.rotateY(Math.PI/2); g.translate(x*.8,.32,.58); fp.push(colored(g,'#222')); }
  { const up = []; box(up, .06,1.8,.06, 0,2.3,0, '#555'); const g = new THREE.ConeGeometry(1.5,.6,8,1,true); g.translate(0,3.3,0); up.push(colored(g,'#e4572e')); const um = new THREE.Mesh(mergeGeometries(up), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, side: THREE.DoubleSide })); um.position.set(SPOT.cart.x + 1.1, 0, SPOT.cart.z + .45); um.castShadow = true; um.name = 'cartUmbrella'; scene.add(um); }
  const cart = new THREE.Mesh(mergeGeometries(fp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, side: THREE.DoubleSide })); cart.position.copy(SPOT.cart); cart.castShadow = true; scene.add(cart);
  const fs = new THREE.Mesh(new THREE.PlaneGeometry(2.3,.55), new THREE.MeshStandardMaterial({ map: foulSignTex, roughness: .6 })); fs.position.set(SPOT.cart.x, .95, SPOT.cart.z + .57); scene.add(fs);
  obstacles.push({ minX:SPOT.cart.x-1.25, maxX:SPOT.cart.x+1.25, minZ:SPOT.cart.z-.6, maxZ:SPOT.cart.z+.6 });
}
// tea glass meshes (شاي في كوباية)
const glassGeo = new THREE.CylinderGeometry(.045,.035,.11,12, 1, true);
const teaGeo = new THREE.CylinderGeometry(.04,.032,.08,12);
const saucerGeo = new THREE.CylinderGeometry(.075,.06,.012,16);
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .35, roughness: .05, transmission: 0, side: THREE.DoubleSide, depthWrite: false });
const teaMat = new THREE.MeshStandardMaterial({ color: 0x8a2a08, roughness: .2, emissive: 0x3a0a00, emissiveIntensity: .3 });
const coffeeMat = new THREE.MeshStandardMaterial({ color: 0x2a1508, roughness: .3 });
const greenMat = new THREE.MeshStandardMaterial({ color: 0x9aa84a, roughness: .3 });
const milkMat = new THREE.MeshStandardMaterial({ color: 0xe9dcb8, roughness: .4 });
const saucerMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: .3 });
const DRINK_MAT = { 'شاي': teaMat, 'قهوة': coffeeMat, 'ينسون': greenMat, 'حلبة': milkMat };
function makeGlass(drink='شاي'){
  const g = new THREE.Group();
  const s = new THREE.Mesh(saucerGeo, saucerMat); s.position.y = .006; g.add(s);
  const t = new THREE.Mesh(teaGeo, DRINK_MAT[drink]); t.position.y = .052; g.add(t);
  const gl = new THREE.Mesh(glassGeo, glassMat); gl.position.y = .066; gl.renderOrder = 2; g.add(gl);
  g.scale.setScalar(1.6); return g;
}
const decoGlasses = [];
TABLES.forEach(([x,z],i) => { const n = 1 + (i%3); for (let k=0;k<n;k++){ const g = makeGlass(k===1?'قهوة':'شاي'); g.position.set(x + R(-.3,.3), 1.04-.12+.03, z + R(-.3,.3)); scene.add(g); decoGlasses.push(g); } });

// ---- 05-vehicles.js ----
// ================= vehicles =================
const carGeo = (() => {
  const ws = []; for (const x of [-.86,.86]) for (const z of [-1.38,1.38]){ const g = new THREE.CylinderGeometry(.36,.36,.26,18); g.rotateZ(Math.PI/2); g.translate(x,.36,z); ws.push(g); }
  const hub = []; for (const x of [-.99,.99]) for (const z of [-1.38,1.38]){ const g = new THREE.CylinderGeometry(.2,.2,.02,14); g.rotateZ(Math.PI/2); g.translate(x,.36,z); hub.push(g); }
  const lights = (z, y) => { const a = new THREE.BoxGeometry(.42,.13,.06), b = a.clone(); a.translate(-.62,y,z); b.translate(.62,y,z); return mergeGeometries([a,b]); };
  const bar = new THREE.BoxGeometry(.55,.13,.28);
  return {
    body: (() => { const g = new RoundedBoxGeometry(1.9,.62,4.4,3,.16); g.translate(0,.66,0); return g; })(),
    cabin: (() => { const g = new RoundedBoxGeometry(1.64,.56,2.3,3,.2); g.translate(0,1.2,-.2); return g; })(),
    roof: (() => { const g = new RoundedBoxGeometry(1.5,.06,1.9,2,.03); g.translate(0,1.49,-.25); return g; })(),
    wheels: mergeGeometries(ws), hubs: mergeGeometries(hub), head: lights(2.21,.74), tail: lights(-2.21,.78),
    stripe: (() => { const g = new THREE.BoxGeometry(1.93,.24,3.4); g.translate(0,.62,0); return g; })(),
    barL: (() => { const g = bar.clone(); g.translate(-.3,1.59,-.2); return g; })(),
    barR: (() => { const g = bar.clone(); g.translate(.3,1.59,-.2); return g; })(),
    taxiSign: (() => { const g = new THREE.BoxGeometry(.7,.2,.3); g.translate(0,1.62,-.2); return g; })(),
  };
})();
const carGlass = new THREE.MeshPhysicalMaterial({ color: 0x0b1218, metalness: .3, roughness: .06, envMapIntensity: 1.6 });
const tireMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: .9 });
const hubMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: .9, roughness: .3 });
const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: .7 });
const tailMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2020, emissiveIntensity: .7 });
const COLORS = ['#a3132b','#efefef','#1b1d20','#27458a','#878c93','#d39b17','#0f5d4e','#4d2a7a','#c4561a','#5e6b3a'];
const paintCache = {};
const paint = c => paintCache[c] ||= new THREE.MeshPhysicalMaterial({ color: c, metalness: .55, roughness: .3, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: 1.2 });
const checkerMat = new THREE.MeshStandardMaterial({ map: checkerTex, roughness: .5 });
function makeCar(color, kind='car'){
  const g = new THREE.Group();
  const add = (geo, mat, cast=true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; g.add(m); return m; };
  add(carGeo.body, paint(color)); add(carGeo.cabin, carGlass); add(carGeo.roof, paint(color), false);
  add(carGeo.wheels, tireMat); add(carGeo.hubs, hubMat, false); add(carGeo.head, headMat, false); add(carGeo.tail, tailMat, false);
  if (kind === 'police'){
    add(carGeo.stripe, paint('#173a7a'), false);
    const red = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff1030, emissiveIntensity: .3 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x000040, emissive: 0x1040ff, emissiveIntensity: .3 });
    add(carGeo.barL, red, false); add(carGeo.barR, blue, false); g.userData.red = red; g.userData.blue = blue;
  } else if (kind === 'taxi'){
    add(carGeo.stripe, checkerMat, false); add(carGeo.taxiSign, new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffb000, emissiveIntensity: .3 }), false);
  }
  scene.add(g); return g;
}
function makeMoto(color){
  const g = new THREE.Group(); const p = [];
  box(p, .32,.42,1.3, 0,.62,0, color); box(p, .36,.3,.6, 0,.92,.25, color); box(p, .34,.12,.7, 0,.86,-.3, '#151515');
  box(p, .7,.05,.05, 0,1.2,.72, '#222'); box(p, .06,.55,.06, 0,.92,.68, '#666'); box(p, .22,.18,.12, 0,1.0,.85, '#eeeeee');
  for (const z of [-.72,.72]){ const w = new THREE.CylinderGeometry(.33,.33,.12,18); w.rotateZ(Math.PI/2); w.translate(0,.33,z); p.push(colored(w,'#151515')); }
  box(p, .12,.1,.4, .18,.42,-.55, '#999');
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .4, metalness: .3 })); m.castShadow = true; g.add(m);
  scene.add(g); return g;
}
function makeTuktuk(color){
  const g = new THREE.Group(); const p = [];
  box(p, 1.25,.55,2.2, 0,.62,0, color); box(p, 1.3,.08,2.0, 0,1.82,-.1, color);
  for (const [x,z] of [[-.6,.85],[.6,.85],[-.6,-1],[.6,-1]]) box(p, .06,1.2,.06, x,1.25,z, '#222');
  box(p, .9,.5,.5, 0,1.05,1.0, '#1b1b1b'); box(p, 1.1,.1,.6, 0,1.0,-.5, '#3a2a1a');
  for (const [x,z] of [[0,1.05],[-.6,-.75],[.6,-.75]]){ const w = new THREE.CylinderGeometry(.26,.26,.16,14); w.rotateZ(Math.PI/2); w.translate(x,.26,z); p.push(colored(w,'#111')); }
  box(p, .9,.08,.03, 0,1.3,1.27, '#cfe0ea');
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .2 })); m.castShadow = true; g.add(m);
  scene.add(g); return g;
}

const vehicles = [];
function addVehicle(type, x, z, yaw, color){
  const mesh = type==='moto' ? makeMoto(color) : makeCar(color, type);
  mesh.position.set(x, 0, z); mesh.rotation.y = yaw;
  const v = { type, mesh, pos: mesh.position, yaw, speed: 0, steer: 0,
    max: type==='moto' ? 26 : type==='police' ? 25 : 22, accel: type==='moto' ? 12 : 10, turn: type==='moto' ? 2.5 : 1.9,
    circles: type==='moto' ? [[0,.6]] : [[1.25,1.05],[-1.25,1.05]], home: { x, z, yaw } };
  vehicles.push(v); return v;
}
const reserved = [[11,43.3],[19,43],[32,43]];
const heroMoto = addVehicle('moto', 11, 43.3, Math.PI/2, '#b3121f');
const heroCar = addVehicle('car', 19, 43, Math.PI/2, '#e8b21a');
const copCar = addVehicle('police', 32, 43, Math.PI/2, '#f4f4f4');
parkedSpots.forEach(p => { if (reserved.some(([x,z]) => Math.hypot(p.x-x, p.z-z) < 7)) return; addVehicle(rng()<.3 ? 'taxi' : 'car', p.x, p.z, p.ry, rng()<.3 ? '#f2f2f2' : pick(COLORS)).mesh.position.y = p.y; });
vehicles.forEach(v => v.home.y = v.mesh.position.y);
function vCircles(v, x=v.pos.x, z=v.pos.z, yaw=v.yaw){ const fx=Math.sin(yaw), fz=Math.cos(yaw); return v.circles.map(([o,r]) => ({ x:x+fx*o, z:z+fz*o, r })); }

// traffic
const traffic = [];
for (let i=0;i<18;i++){
  const kind = i%5===0 ? 'tuk' : i%3===0 ? 'taxi' : 'car';
  const c = kind==='tuk' ? makeTuktuk(pick(['#b3121f','#1f4fa8','#e0a21a'])) : makeCar(kind==='taxi' ? '#f2f2f2' : pick(COLORS), kind);
  c.userData = { kind, axis: i%2 ? 'x' : 'z', road: pick(ROADS), dir: rng()<.5 ? 1 : -1, s: R(-HALF-15, HALF+15), base: kind==='tuk' ? R(6,8) : R(8,12.5), speed: 9, len: kind==='tuk' ? 1.4 : 2.45 };
  traffic.push(c);
}
function placeTraffic(c){ const u = c.userData; if (u.axis==='x'){ c.position.set(u.s, 0, u.road + 3*u.dir); c.rotation.y = u.dir>0 ? Math.PI/2 : -Math.PI/2; } else { c.position.set(u.road - 3*u.dir, 0, u.s); c.rotation.y = u.dir>0 ? 0 : Math.PI; } }
traffic.forEach(placeTraffic);
// chaser for the cash mode
const chaserCar = makeCar('#f4f4f4', 'police'); chaserCar.visible = false;
const chaserLight = new THREE.PointLight(0xff2040, 0, 22, 1.6); chaserLight.position.set(0, 2.2, 0); chaserCar.add(chaserLight);

// ---- 06-photo-characters.js ----
// ================= photo characters =================
const blobTex = makeTex(128,128,(g)=>{ const gr = g.createRadialGradient(64,64,0,64,64,64); gr.addColorStop(0,'rgba(0,0,0,.6)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(0,0,128,128); });
const blobGeo = new THREE.PlaneGeometry(1.3,.8), blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false });
function makeDoll(c, heightM){
  const S = heightM / c.PH;
  const root = new THREE.Group(), doll = new THREE.Group(); root.add(doll);
  const P = {}, mats = [];
  for (const [key,order,z] of [['legL',10,-.012],['legR',10,-.012],['body',11,0],['armL',12,.012],['armR',12,.012]]){
    const [x0,y0,w,h] = c.parts[key]; const piv = c.piv[key];
    const mat = new THREE.MeshBasicMaterial({ map: dataTex(c.img[key]), transparent: true, alphaTest: .03, side: THREE.DoubleSide, toneMapped: false, color: new THREE.Color(.95,.95,.95) });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w*S, h*S), mat); mesh.renderOrder = order;
    const p = new THREE.Group(); const px = piv ? (piv[0]-c.FX)*S : 0, py = piv ? (c.FY-piv[1])*S : 0;
    p.position.set(px, py, z); mesh.position.set((x0+w/2-c.FX)*S - px, (c.FY-(y0+h/2))*S - py, 0);
    p.add(mesh); doll.add(p); P[key] = p; mats.push(mat);
  }
  const blob = new THREE.Mesh(blobGeo, blobMat); blob.rotation.x = -Math.PI/2; blob.position.y = .03; root.add(blob);
  scene.add(root);
  return { S, c, root, doll, P, mats, blob, phase: 0, tilt: 0, punchT: 0, punchSide: 1, downT: 0, fall: 0, height: heightM, hipY: (c.FY - c.parts.body[1] - c.parts.body[3]) * S };
}
function animDoll(d, vx, vz, dt, t){
  const sp = Math.hypot(vx, vz);
  d.phase += dt * sp * 1.6;
  const amp = Math.min(sp/5, 1.35), s = Math.sin(d.phase);
  d.doll.position.y = Math.abs(Math.cos(d.phase)) * .05 * amp;
  d.P.legL.scale.y = 1 - Math.max(0, s)*.09*amp; d.P.legR.scale.y = 1 - Math.max(0, -s)*.09*amp;
  d.P.armL.scale.y = 1 - Math.max(0, -s)*.1*amp; d.P.armR.scale.y = 1 - Math.max(0, s)*.1*amp;
  let rl = -Math.max(0,-s)*.06*amp, rr = Math.max(0,s)*.06*amp;
  if (d.punchT > 0){ d.punchT -= dt; const k = Math.sin((1 - d.punchT/.28) * Math.PI); if (d.punchSide > 0){ rr = 1.3*k; d.P.armR.scale.y = 1 - .2*k; } else { rl = -1.3*k; d.P.armL.scale.y = 1 - .2*k; } }
  d.P.armL.rotation.z = rl; d.P.armR.rotation.z = rr;
  d.doll.rotation.z = s * .025 * amp;
  d.doll.scale.y = 1 + (sp < .3 ? Math.sin(t*2.2)*.006 : 0);
  // face the camera (billboard around Y), with a little turn toward movement
  const cdx = camera.position.x - d.root.position.x, cdz = camera.position.z - d.root.position.z;
  const yaw = Math.atan2(cdx, cdz);
  const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
  d.tilt += (clamp((vx*rightX + vz*rightZ)/9, -1, 1)*.4 - d.tilt) * damp(8, dt);
  d.root.rotation.y = yaw + d.tilt;
  if (d.downT > 0) d.downT -= dt;
  d.fall += ((d.downT > 0 ? 1 : 0) - d.fall) * damp(d.downT > 0 ? 9 : 4, dt);
  d.doll.rotation.x = -d.fall * 1.45; d.doll.position.y += d.fall * .12;
}
const hero = { d: makeDoll(CH.hero, 1.8), pos: new THREE.Vector3(), vel: new THREE.Vector3(), knock: new THREE.Vector3(), hp: 100, stamina: 1, tired: false, inv: 0, hurtT: 0, money: 50, veh: null, locked: false, lastDir: new THREE.Vector3(0,0,1) };
const wantedD = makeDoll(CH.wanted, 1.78), enemyD = makeDoll(CH.enemy, 1.84);

// ---- 07-npcs-low-poly.js ----
// ================= NPCs (low-poly) =================
const SKIN = ['#c68a5d','#a86b45','#d9a57a','#8d5a3b','#e0b48d','#b27a52'];
const SHIRTS = ['#2b4a8b','#8a1f2b','#e8e2d0','#3b6b3a','#c47a1a','#555a60','#1f1f1f','#7a5a3a','#3f7fa8','#a8a39a'];
const PANTS = ['#1f2530','#3a3226','#2a2a2a','#4a4f5a','#5a4a36'];
const GALA = ['#e8e2d0','#8a8a80','#3b5a7a','#5a4a3a','#cfc6b0','#2f3b30'];
const HAIR = ['#14100c','#2a1d15','#3b2b20','#6e6e6e','#1b1410'];
const matCache = {}; const M = c => matCache[c] ||= new THREE.MeshStandardMaterial({ color: c, roughness: .85 });
const NG = { leg: new THREE.BoxGeometry(.15,.9,.17), arm: new THREE.BoxGeometry(.11,.6,.12), hand: new THREE.SphereGeometry(.06,8,6), torso: new THREE.BoxGeometry(.46,.62,.26), gala: new THREE.BoxGeometry(.5,1.22,.3), head: new THREE.SphereGeometry(.13,14,10), hair: new THREE.SphereGeometry(.137,12,8,0,Math.PI*2,0,Math.PI/2), mus: new THREE.BoxGeometry(.12,.025,.02) };
const npcs = [];
const NAMES = ['حمادة','كريم','عم سيد','الحاج محمود','زيزو','أبو علي','شيكو','مصطفى','عم رجب','بيبو','حسن','تامر'];
function makeNPC(){
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const gal = rng() < .3;
  const skin = M(pick(SKIN)), shirt = M(gal ? pick(GALA) : pick(SHIRTS)), pants = M(pick(PANTS));
  const legs = [], arms = [];
  for (const sx of [-1,1]){
    const lg = new THREE.Group(); lg.position.set(sx*.1, .9, 0); const lm = new THREE.Mesh(NG.leg, gal ? M('#4a3c30') : pants); lm.position.y = -.45; lg.add(lm); body.add(lg); legs.push(lg);
    const ar = new THREE.Group(); ar.position.set(sx*.3, 1.47, 0); const am = new THREE.Mesh(NG.arm, shirt); am.position.y = -.3; ar.add(am); const hd = new THREE.Mesh(NG.hand, skin); hd.position.y = -.63; ar.add(hd); body.add(ar); arms.push(ar);
  }
  const torso = new THREE.Mesh(gal ? NG.gala : NG.torso, shirt); torso.position.y = gal ? .93 : 1.2; torso.castShadow = true; body.add(torso);
  const head = new THREE.Mesh(NG.head, skin); head.position.y = 1.66; body.add(head);
  const hair = new THREE.Mesh(NG.hair, M(pick(HAIR))); hair.position.y = 1.69; body.add(hair);
  if (rng() < .45){ const mu = new THREE.Mesh(NG.mus, M('#1b1410')); mu.position.set(0, 1.62, .125); body.add(mu); }
  const sc = R(.93, 1.06); g.scale.setScalar(sc);
  scene.add(g);
  const n = { g, body, legs, arms, state: 'hidden', phase: R(0,6), speed: R(1.1,1.6), yaw: 0, t: 0, dir: 1, block: 0, downT: 0, fall: 0, fleeT: 0, name: pick(NAMES), role: null, head: 2.05*sc };
  g.visible = false; npcs.push(n); return n;
}
for (let i=0;i<40;i++) makeNPC();
const walkBlocks = blocksInfo.map((b,i) => i);
function perimPos(b, t){ const r = 16.6, c = [[b.cx-r,b.cz-r],[b.cx+r,b.cz-r],[b.cx+r,b.cz+r],[b.cx-r,b.cz+r]]; const s = ((Math.floor(t)%4)+4)%4, f = t - Math.floor(t); const a = c[s], e = c[(s+1)%4]; return [a[0]+(e[0]-a[0])*f, a[1]+(e[1]-a[1])*f]; }
function setWalker(n){ n.state = 'walk'; n.role = 'walker'; n.block = pick(walkBlocks); n.t = R(0,4); n.dir = rng()<.5 ? 1 : -1; n.g.visible = true; n.g.rotation.set(0,0,0); n.body.position.y = 0; n.fall = 0; n.downT = 0; }
function seatNPC(n, x, z, ry){ n.state = 'sit'; n.g.visible = true; n.g.position.set(x, .15, z); n.yaw = ry; n.g.rotation.set(0, ry, 0); n.fall = 0; n.downT = 0; }
function npcHit(n, power=1){
  if (n.state === 'hidden') return;
  n.prevState = n.state === 'down' ? n.prevState : n.state; n.state = 'down'; n.downT = 2.6 + power; n.fleeT = 5;
  n.fightT = ((n.prevState === 'walk' || n.prevState === 'fight') && Math.random() < .35) ? 7 : 0;
  say(n, rpick(['آه يا عم!','إيه ده يا جدع!','هبلغ عنك!','يا ساتر!','حرام عليك!']), 2, 'angry'); thwack();
}
function updateNPC(n, dt){
  if (n.state === 'hidden') return;
  let moving = 0;
  if (n.state === 'walk'){
    const b = blocksInfo[n.block]; const sp = n.speed * (n.fleeT > 0 ? 3.2 : 1);
    if (n.fleeT > 0) n.fleeT -= dt;
    const old = perimPos(b, n.t); n.t += n.dir * sp * dt / 33.2; const p = perimPos(b, n.t);
    n.g.position.set(p[0], .15, p[1]); const dx = p[0]-old[0], dz = p[1]-old[1];
    if (dx || dz) n.yaw = Math.atan2(dx, dz); moving = sp;
  } else if (n.state === 'goto'){
    const dx = n.tx - n.g.position.x, dz = n.tz - n.g.position.z, d = Math.hypot(dx, dz);
    if (d < .15){ n.g.position.x = n.tx; n.g.position.z = n.tz; if (n.onArrive) { const f = n.onArrive; n.onArrive = null; f(n); } }
    else { const s = Math.min(d, n.speed*1.2*dt); n.g.position.x += dx/d*s; n.g.position.z += dz/d*s; n.yaw = Math.atan2(dx, dz); moving = n.speed; }
    n.g.position.y = groundY(n.g.position.x, n.g.position.z);
  } else if (n.state === 'down'){
    n.downT -= dt; if (n.downT <= 0){ if (n.fightT > 0){ n.state = 'fight'; say(n, rpick(['تعالى هنا!','انت فاكر نفسك مين؟','هوريك!']), 2, 'angry'); } else if (n.prevState === 'walk' || n.prevState === 'down' || n.prevState === 'fight' || !n.prevState) { n.state = 'walk'; } else n.state = n.prevState; }
  } else if (n.state === 'fight'){
    n.fightT -= dt; const tp = hero.pos; const dx = tp.x - n.g.position.x, dz = tp.z - n.g.position.z, d = Math.hypot(dx, dz);
    if (n.fightT <= 0 || d > 25 || hero.veh){ const bp = perimPos(blocksInfo[n.block], n.t); n.state = 'goto'; n.tx = bp[0]; n.tz = bp[1]; n.onArrive = n2 => { n2.state = 'walk'; }; }
    else if (d > 1.1){ const s = 4*dt; moveWithSlide(n.g.position, dx/d*s, dz/d*s, .3); n.yaw = Math.atan2(dx, dz); moving = 4; }
    else { n.yaw = Math.atan2(dx, dz); n.atkT = (n.atkT||0) - dt; if (n.atkT <= 0){ n.atkT = 1.2; n.arms[1].rotation.x = -1.6; setTimeout(() => { n.arms[1].rotation.x = 0; if (n.state === 'fight' && n.g.position.distanceTo(hero.pos) < 1.7) heroDamage(5, 'npc'); }, 150); } }
    n.g.position.y = groundY(n.g.position.x, n.g.position.z);
  }
  // animation
  n.fall += ((n.state === 'down' ? 1 : 0) - n.fall) * damp(n.state === 'down' ? 10 : 4, dt);
  const sitting = n.state === 'sit' || n.state === 'customer' || n.state === 'domino';
  if (moving){ n.phase += dt * moving * 5.2; const s = Math.sin(n.phase); n.legs[0].rotation.x = s*.6; n.legs[1].rotation.x = -s*.6; n.arms[0].rotation.x = -s*.5; n.arms[1].rotation.x = s*.5; n.body.position.y = Math.abs(Math.cos(n.phase))*.03; }
  else if (sitting){ n.legs[0].rotation.x = n.legs[1].rotation.x = -1.45; n.arms[0].rotation.x = n.arms[1].rotation.x = -.5; n.body.position.y = -.43; }
  else { n.legs[0].rotation.x *= .8; n.legs[1].rotation.x *= .8; n.arms[0].rotation.x *= .8; n.arms[1].rotation.x *= .8; n.body.position.y *= .8; }
  n.g.rotation.y = lerpAngle(n.g.rotation.y, n.yaw, damp(10, dt));
  n.g.rotation.x = -n.fall * 1.5; n.g.position.y += 0;
}

// ---- 08-bubbles.js ----
// ================= bubbles =================
const bubbleLayer = $('bubbles'); const bubbles = [];
function headOf(ent){ if (ent.g) return _v.set(ent.g.position.x, ent.g.position.y + ent.head - (ent.state==='sit'||ent.state==='customer'||ent.state==='domino' ? .45 : 0), ent.g.position.z); if (ent.d) return _v.set(ent.d.root.position.x, ent.d.root.position.y + ent.d.height + .25, ent.d.root.position.z); return _v.set(0,0,0); }
function say(ent, text, dur=2.6, cls=''){
  let b = bubbles.find(b => b.ent === ent && !b.persist);
  if (!b){ const el = document.createElement('div'); bubbleLayer.appendChild(el); b = { el, ent }; bubbles.push(b); }
  b.el.className = 'bubble ' + cls; b.el.textContent = text; b.t = dur;
  if (ent.g && Math.random() < .55) speak(text);
}
function orderBubble(ent){ const el = document.createElement('div'); el.className = 'bubble order'; bubbleLayer.appendChild(el); const b = { el, ent, persist: true, t: 1e9 }; bubbles.push(b); return b; }
function removeBubble(b){ const i = bubbles.indexOf(b); if (i >= 0) bubbles.splice(i,1); b.el.remove(); }
function clearBubbles(){ while (bubbles.length) removeBubble(bubbles[0]); }
const _p = new THREE.Vector3();
function updateBubbles(dt){
  for (let i=bubbles.length-1;i>=0;i--){
    const b = bubbles[i]; if (!b.persist){ b.t -= dt; if (b.t <= 0){ removeBubble(b); continue; } }
    _p.copy(headOf(b.ent)); const dist = _p.distanceTo(camera.position); _p.project(camera);
    if (_p.z > 1 || dist > 40 || (b.ent.g && !b.ent.g.visible) || (b.ent.d && !b.ent.d.root.visible)){ b.el.style.display = 'none'; continue; }
    b.el.style.display = ''; b.el.style.left = ((_p.x+1)/2*innerWidth) + 'px'; b.el.style.top = ((1-_p.y)/2*innerHeight) + 'px';
  }
}

// ---- 09-audio.js ----
// ================= audio =================
let AC = null, master = null, sfx = null, musicGain = null, crowdGain = null, sirenGain = null;
let muted = store.get('ty_mute') === '1', musicOn = store.get('ty_music') !== '0', voiceOn = store.get('ty_voice') !== '0';
let musicEl = null, beatNext = 0, beatStep = 0;
function setBtnStates(){ $('muteBtn').textContent = muted ? '🔇' : '🔊'; $('musicBtn').classList.toggle('off', !musicOn); $('voiceBtn').classList.toggle('off', !voiceOn); }
setBtnStates();
function initAudio(){
  if (AC){ AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = muted ? 0 : 1; master.connect(AC.destination);
    sfx = AC.createGain(); sfx.gain.value = .7; sfx.connect(master);
    musicGain = AC.createGain(); musicGain.gain.value = musicOn ? .11 : 0; musicGain.connect(master);
    // crowd murmur
    const len = AC.sampleRate*2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0); let last = 0;
    for (let i=0;i<len;i++){ last = last*.97 + (Math.random()*2-1)*.03; d[i] = last*6; }
    const src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = .8;
    crowdGain = AC.createGain(); crowdGain.gain.value = 0; src.connect(bp); bp.connect(crowdGain); crowdGain.connect(master); src.start();
    // siren
    const osc = AC.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 760;
    const lfo = AC.createOscillator(); lfo.frequency.value = .7; const lg = AC.createGain(); lg.gain.value = 230; lfo.connect(lg); lg.connect(osc.frequency);
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700;
    sirenGain = AC.createGain(); sirenGain.gain.value = 0; osc.connect(lp); lp.connect(sirenGain); sirenGain.connect(master); osc.start(); lfo.start();
    // optional real track: music.mp3 next to the page (added by the owner)
    fetch('music.mp3', { method: 'HEAD' }).then(r => { if (r.ok && (r.headers.get('content-type')||'').includes('audio')){ musicEl = new Audio('music.mp3'); musicEl.loop = true; musicEl.volume = .22; if (musicOn && !muted) musicEl.play().catch(()=>{}); } }).catch(()=>{});
    beatNext = AC.currentTime + .1;
  } catch(e){ AC = null; }
}
function env(g, t, a, dur, vol){ g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(.0008, t + dur); }
function tone(f1, f2, dur, type='sine', vol=.16, delay=0, out){
  if (!AC) return; const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(f2,1), t+dur);
  env(g, t, .005, dur, vol); o.connect(g); g.connect(out || sfx); o.start(t); o.stop(t+dur+.05);
}
let noiseBuf = null;
function noise(dur, freq, vol, delay=0, type='lowpass', out){
  if (!AC) return; if (!noiseBuf){ noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1; }
  const t = AC.currentTime + delay, s = AC.createBufferSource(); s.buffer = noiseBuf; const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = AC.createGain(); env(g, t, .002, dur, vol); s.connect(f); f.connect(g); g.connect(out || sfx); s.start(t); s.stop(t+dur+.05);
}
const thwack = () => { noise(.18, 900, .6); tone(160, 60, .15, 'sine', .4); };
const horn = () => { tone(415, 415, .16, 'square', .07); tone(523, 523, .16, 'square', .05); tone(415, 415, .22, 'square', .07, .22); tone(523, 523, .22, 'square', .05, .22); };
const clink = () => { tone(2600, 2500, .25, 'sine', .08); tone(3400, 3300, .2, 'sine', .05, .05); };
const coin = () => { tone(880,1320,.12,'square',.07); tone(1320,1760,.16,'square',.06,.08); };
// original mahraganat-style beat (maqsum rhythm, hijaz riff)
const BPM = 126, STEP = 60/BPM/4, ROOT = 146.83;
const HIJ = [0,1,4,5,7,8,10,12];
const RIFF = [0,null,1,null,4,null,1,0, null,0,5,null,4,1,0,null, 7,null,8,null,7,5,4,null, 5,4,1,null,0,null,null,null];
const BASS = [0,null,null,0,null,null,0,null, -2,null,null,-2,null,null,1,null];
function beatTick(){
  if (!AC || !musicOn || muted || musicEl) return;
  while (beatNext < AC.currentTime + .15){
    const s = beatStep % 32, t = beatNext, q = s % 16;
    if (q === 0 || q === 8 || q === 11){ const o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t+.22); env(g, t, .002, .28, .9); o.connect(g); g.connect(musicGain); o.start(t); o.stop(t+.3); }
    if (q === 4 || q === 12) noise(.14, 1800, .5, t - AC.currentTime, 'bandpass', musicGain);
    if (q === 2 || q === 6 || q === 14) noise(.05, 3500, .28, t - AC.currentTime, 'highpass', musicGain);
    if (q % 2 === 1) noise(.025, 8000, .12, t - AC.currentTime, 'highpass', musicGain);
    const b = BASS[q]; if (b !== null && b !== undefined){ const o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = ROOT/2 * Math.pow(2, b/12); f.type = 'lowpass'; f.frequency.value = 380; env(g, t, .005, .2, .35); o.connect(f); f.connect(g); g.connect(musicGain); o.start(t); o.stop(t+.25); }
    const r = RIFF[s]; if (beatStep % 64 >= 32 && r !== null){ const o = AC.createOscillator(), g = AC.createGain(), v = AC.createOscillator(), vg = AC.createGain(); o.type = 'square'; o.frequency.value = ROOT*2 * Math.pow(2, HIJ[HIJ.indexOf(r) >= 0 ? HIJ.indexOf(r) : 0]/12 + 0) ; o.frequency.value = ROOT*2*Math.pow(2, r/12); v.frequency.value = 6; vg.gain.value = 6; v.connect(vg); vg.connect(o.frequency); env(g, t, .01, STEP*1.8, .07); o.connect(g); g.connect(musicGain); o.start(t); v.start(t); o.stop(t+STEP*2); v.stop(t+STEP*2); }
    beatNext += STEP; beatStep++;
  }
}
// voices: browser text-to-speech in Arabic, when available
let arVoice = null; const pickVoice = () => { try { const vs = speechSynthesis.getVoices(); arVoice = vs.find(v => /ar[-_]EG/i.test(v.lang)) || vs.find(v => /^ar/i.test(v.lang)) || null; } catch(e){} };
try { speechSynthesis.onvoiceschanged = pickVoice; pickVoice(); } catch(e){}
let lastSpeak = 0;
function speak(text){ if (muted || !voiceOn || !arVoice || !AC) return; const now = performance.now(); if (now - lastSpeak < 2500) return; lastSpeak = now; try { const u = new SpeechSynthesisUtterance(text.replace(/[^؀-ۿ\s!؟?]/g,'')); u.voice = arVoice; u.lang = arVoice.lang; u.volume = .4; u.rate = 1.05; u.pitch = .85 + Math.random()*.35; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch(e){} }
$('muteBtn').onclick = () => { muted = !muted; store.set('ty_mute', muted?'1':'0'); if (master) master.gain.value = muted ? 0 : 1; if (musicEl){ muted || !musicOn ? musicEl.pause() : musicEl.play().catch(()=>{}); } if (muted) try { speechSynthesis.cancel(); } catch(e){} setBtnStates(); };
$('musicBtn').onclick = () => { musicOn = !musicOn; store.set('ty_music', musicOn?'1':'0'); if (musicGain) musicGain.gain.value = musicOn ? .11 : 0; if (musicEl){ musicOn && !muted ? musicEl.play().catch(()=>{}) : musicEl.pause(); } if (AC) beatNext = AC.currentTime + .05; setBtnStates(); };
$('voiceBtn').onclick = () => { voiceOn = !voiceOn; store.set('ty_voice', voiceOn?'1':'0'); setBtnStates(); if (voiceOn && !arVoice) banner('جهازك مفيهوش صوت عربي، الكلام هيظهر مكتوب بس', 'info', 3); };

// ---- 10-input.js ----
// ================= input =================
const keys = {};
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  keys[e.code] = true; if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  if (state !== 'play') return;
  if (e.code === 'KeyE') action();
  if (e.code === 'KeyF') punch();
  if (e.code === 'KeyH') { if (hero.veh) horn(); }
  if (e.code === 'Escape'){ if (!$('shop').hidden){ $('shop').hidden = true; hero.locked = false; } else if (ST.kind && modeId !== 'foul') exitStation(); else if (!$('domino').hidden) closeDomino(); else openMenu(); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
canvas.addEventListener('mousedown', e => { if (e.button === 0 && state === 'play' && !isTouch && !ST.kind && $('domino').hidden) punch(); });
const ZOOMS = [5, 7.5, 11]; let zoomIdx = 0, camDist = 5, camTarget = 5;
addEventListener('wheel', e => { camTarget = clamp(camTarget + Math.sign(e.deltaY)*1.2, 4, 15); }, { passive: true });
$('zoomBtn').onclick = () => { zoomIdx = (zoomIdx+1) % ZOOMS.length; camTarget = ZOOMS[zoomIdx]; };
$('menuBtn').onclick = () => openMenu();
const goFull = () => { const d = document.documentElement; try { const r = (d.requestFullscreen || d.webkitRequestFullscreen).call(d); if (r && r.catch) r.catch(() => {}); } catch(e){} };
$('fsBtn').onclick = () => { if (document.fullscreenElement) { try { document.exitFullscreen(); } catch(e){} } else goFull(); };
canvas.addEventListener('contextmenu', e => e.preventDefault());
let joyHintOn = store.get('ty_joy') !== '1'; const hideJoyHint = () => { if (joyHintOn){ joyHintOn = false; store.set('ty_joy','1'); $('joyHint').classList.remove('show'); } };
if (joyHintOn) $('joyHint').classList.add('show');
const joy = { id: null, x0: 0, y0: 0, vx: 0, vz: 0, mag: 0 }; const joyEl = $('joy'), knob = $('knob');
// camera orbit: drag on the right side of the screen (touch) or with the right mouse button
const CAM = { orbit: 0, orbitSm: 0, tilt: .44, veh: 0, lastDrag: -9, drag: null };
canvas.addEventListener('pointerdown', e => {
  if (ST.kind || state !== 'play') return;
  const camSide = e.pointerType === 'mouse' ? (e.button === 2 || e.button === 1) : e.clientX > innerWidth * .45;
  if (camSide){ if (CAM.drag) return; CAM.drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch(err){} return; }
  if (e.pointerType === 'mouse' || joy.id !== null) return;
  hideJoyHint(); joy.id = e.pointerId; joy.x0 = e.clientX; joy.y0 = e.clientY; joyEl.style.left = e.clientX+'px'; joyEl.style.top = e.clientY+'px'; joyEl.style.display = 'block'; knob.style.transform = '';
});
addEventListener('pointermove', e => {
  if (CAM.drag && e.pointerId === CAM.drag.id){
    const dx = e.clientX - CAM.drag.x, dy = e.clientY - CAM.drag.y; CAM.drag.x = e.clientX; CAM.drag.y = e.clientY;
    const k = isTouch ? .009 : .006;
    if (hero.veh) CAM.veh = clamp(CAM.veh - dx*k, -Math.PI, Math.PI); else CAM.orbit -= dx*k;
    CAM.tilt = clamp(CAM.tilt + dy*k*.6, .12, 1.2); CAM.lastDrag = performance.now(); return;
  }
  if (e.pointerId !== joy.id) return; let dx = e.clientX - joy.x0, dy = e.clientY - joy.y0; const m = Math.hypot(dx,dy), max = 55; if (m > max){ dx *= max/m; dy *= max/m; } joy.vx = dx/max; joy.vz = dy/max; joy.mag = Math.min(1, m/max); knob.style.transform = `translate(${dx}px,${dy}px)`;
});
const endJoy = e => { if (CAM.drag && e.pointerId === CAM.drag.id){ CAM.drag = null; return; } if (e.pointerId !== joy.id) return; joy.id = null; joy.vx = joy.vz = joy.mag = 0; joyEl.style.display = 'none'; };
addEventListener('pointerup', endJoy); addEventListener('pointercancel', endJoy);
let runBtn = false; const rb = $('runBtn');
rb.addEventListener('pointerdown', e => { e.stopPropagation(); runBtn = true; rb.classList.add('on'); });
['pointerup','pointerleave','pointercancel'].forEach(ev => rb.addEventListener(ev, () => { runBtn = false; rb.classList.remove('on'); }));
$('actBtn').addEventListener('pointerdown', e => { e.stopPropagation(); if (state === 'play') action(); });
$('punchBtn').addEventListener('pointerdown', e => { e.stopPropagation(); if (state === 'play'){ if (hero.veh) horn(); else punch(); } });

// ---- 11-hud-helpers.js ----
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
  if (hero.inv > 0 || state !== 'play') return;
  hero.hp -= n; hero.hurtT = 0; flash(); thwack(); shake = Math.max(shake, .35);
  if (hero.hp <= 0){ hero.hp = 0; modeObj.onKO ? modeObj.onKO(why) : knockout(why); }
}
function knockout(why){
  banner(why === 'car' ? 'عربية خبطتك… فوقت في القهوة' : 'اتبهدلت… فوقت في القهوة', 'bad', 3);
  hero.hp = 100; hero.money = Math.max(0, hero.money - 20); if (hero.veh) exitVehicle(true);
  hero.pos.copy(SPOT.spawn); hero.inv = 2;
}

// ---- 12-physics-helpers.js ----
// ================= physics helpers =================
const PR = .35;
function staticBlocked(x, z, pad=PR){ for (const o of obstacles) if (x > o.minX-pad && x < o.maxX+pad && z > o.minZ-pad && z < o.maxZ+pad) return true; return false; }
function vehBlockedAt(x, z, pad, skip){ for (const v of vehicles){ if (v === skip) continue; for (const c of vCircles(v)) if (Math.hypot(c.x-x, c.z-z) < c.r + pad) return true; } return false; }
function blocked(x, z){ return staticBlocked(x, z) || vehBlockedAt(x, z, PR, hero.veh); }
function groundY(x, z){ for (const b of blocksInfo) if (Math.abs(x-b.cx) < BW/2 && Math.abs(z-b.cz) < BW/2) return .15; return 0; }
function segHitsBox(ax, az, bx, bz, o, pad){
  let t0 = 0, t1 = 1; const dx = bx-ax, dz = bz-az;
  for (const [p,d,mn,mx] of [[ax,dx,o.minX-pad,o.maxX+pad],[az,dz,o.minZ-pad,o.maxZ+pad]]){
    if (Math.abs(d) < 1e-9){ if (p < mn || p > mx) return false; }
    else { let ta = (mn-p)/d, tb = (mx-p)/d; if (ta > tb) [ta,tb] = [tb,ta]; t0 = Math.max(t0,ta); t1 = Math.min(t1,tb); if (t0 > t1) return false; }
  }
  return true;
}
function lineOfSight(ax, az, bx, bz){ for (const o of obstacles) if (o.building && segHitsBox(ax,az,bx,bz,o,.3)) return false; return true; }
function carLocal(car, p){ const h = car.rotation.y, fx = Math.sin(h), fz = Math.cos(h); const dx = p.x - car.position.x, dz = p.z - car.position.z; return { along: dx*fx + dz*fz, lat: dx*fz - dz*fx }; }
function nearestNode(x, z){ let best = [0,0], bd = 1e9; for (let i=0;i<=N;i++) for (let k=0;k<=N;k++){ const d = (ROADS[i]-x)**2 + (ROADS[k]-z)**2; if (d < bd){ bd = d; best = [i,k]; } } return best; }
function moveWithSlide(pos, dx, dz, pad=PR){ let moved = false; if (!staticBlocked(pos.x+dx, pos.z, pad)){ pos.x += dx; moved = true; } if (!staticBlocked(pos.x, pos.z+dz, pad)){ pos.z += dz; moved = true; } pos.x = clamp(pos.x, -LIMIT, LIMIT); pos.z = clamp(pos.z, -LIMIT, LIMIT); return moved; }
function randomSidewalkPoint(minD, from){ for (let i=0;i<200;i++){ const b = pick(blocksInfo); const p = perimPos(b, R(0,4)); if (!from || Math.hypot(p[0]-from.x, p[1]-from.z) > minD) return new THREE.Vector3(p[0], .15, p[1]); } return new THREE.Vector3(-80,.15,-80); }

// ---- 13-vehicles-enter-drive.js ----
// ================= vehicles: enter / drive =================
function enterVehicle(v){
  if (!modeObj.vehicles){ banner('مفيش ركوب في المود ده', 'info', 1.8); return; }
  if (modeObj.canDrive && !modeObj.canDrive(v)){ banner('دي مش بتاعتك', 'info', 1.5); return; }
  hero.veh = v; v.speed = 0; CAM.veh = 0; hero.d.blob.visible = false;
  banner(v.type === 'moto' ? 'ركبت الموتوسيكل 🏍️' : v.type === 'police' ? 'ركبت البوكس 🚓' : 'ركبت العربية 🚗', 'ok', 1.6);
  tone(90, 140, .4, 'sawtooth', .12);
}
function exitVehicle(force){
  const v = hero.veh; if (!v) return;
  const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw); const rx = fz, rz = -fx;
  const opts = [[rx*2.1, rz*2.1], [-rx*2.1, -rz*2.1], [-fx*3.2, -fz*3.2], [fx*3.2, fz*3.2]];
  let placed = false;
  for (const [ox,oz] of opts){ const x = v.pos.x+ox, z = v.pos.z+oz; if (!staticBlocked(x,z) && !vehBlockedAt(x,z,PR,null)){ hero.pos.set(x, groundY(x,z), z); placed = true; break; } }
  if (!placed && !force) { banner('مفيش مكان تنزل فيه', 'info', 1.4); return; }
  if (!placed) hero.pos.set(v.pos.x + 2.5, 0, v.pos.z);
  v.speed = 0; hero.veh = null; CAM.orbit = CAM.orbitSm = camYaw; CAM.veh = 0; hero.d.blob.visible = true; hero.d.doll.visible = true;
  hero.d.P.legL.visible = hero.d.P.legR.visible = true;
}
function driveVehicle(v, dt, inX, inZ, brake){
  const throttle = -inZ, steer = -inX;
  const drift = brake && Math.abs(v.speed) > 7; const vmax = v.max * ((v.dmg||0) >= 100 ? .55 : 1);
  if (brake){ v.speed *= Math.exp(-dt*(drift ? 1.1 : 4)); }
  else if (Math.abs(throttle) > .05){
    const target = throttle > 0 ? vmax*throttle : vmax*.35*throttle;
    const rate = (Math.sign(target) !== Math.sign(v.speed) && Math.abs(v.speed) > .5) ? 22 : v.accel;
    v.speed += clamp(target - v.speed, -rate*dt, rate*dt);
  } else v.speed *= Math.exp(-dt*.7);
  v.steer += (steer - v.steer) * damp(8, dt);
  let sf = clamp(v.speed/6, -1, 1) * (1 - Math.min(Math.abs(v.speed)/v.max, 1)*.35);
  if (Math.abs(throttle) > .05 && Math.abs(sf) < .4) sf = .4 * Math.sign(throttle);
  const nyaw = v.yaw + v.steer * v.turn * (drift ? 1.9 : 1) * sf * dt;
  setLoop('skid', drift ? .1 : 0, 1700, 'bandpass');
  if (drift && Math.random() < dt*14){ _t.set(v.pos.x - Math.sin(v.yaw)*1.8, .2, v.pos.z - Math.cos(v.yaw)*1.8); puff(_t, .5); }
  if ((v.dmg||0) > 60 && Math.random() < dt*6){ _t.set(v.pos.x + Math.sin(v.yaw)*1.8, 1.1, v.pos.z + Math.cos(v.yaw)*1.8); puff(_t, .45); }
  const nx = v.pos.x + Math.sin(nyaw)*v.speed*dt, nz = v.pos.z + Math.cos(nyaw)*v.speed*dt;
  const poseBlocked = (x, z, yaw) => vCircles(v, x, z, yaw).some(c => staticBlocked(c.x, c.z, c.r) || vehBlockedAt(c.x, c.z, c.r, v) || Math.abs(c.x) > LIMIT+3 || Math.abs(c.z) > LIMIT+3);
  if (poseBlocked(nx, nz, nyaw)){
    if (Math.abs(v.speed) > 7){ thwack(); shake = .4; heroDamage((Math.abs(v.speed) > 14 ? 10 : 4) * DIFF.dmg, 'crash'); v.dmg = (v.dmg||0) + Math.abs(v.speed)*1.6; if (v.dmg >= 100 && !v.broke){ v.broke = true; banner('العربية اتبهدلت… بقت بطيئة 💨', 'bad', 2.5); } }
    v.speed *= -.25;
    // still let the driver turn the nose away from what they hit
    const turnOnly = v.yaw + v.steer * v.turn * .6 * dt * (throttle < 0 ? -1 : 1);
    if (!poseBlocked(v.pos.x, v.pos.z, turnOnly)) v.yaw = turnOnly;
  }
  else { v.pos.x = nx; v.pos.z = nz; v.yaw = nyaw; }
  v.pos.y += (groundY(v.pos.x, v.pos.z) - v.pos.y) * damp(12, dt);
  v.mesh.rotation.y = v.yaw;
  if (v.type === 'moto') v.mesh.rotation.z = -v.steer * .35 * clamp(Math.abs(v.speed)/10, 0, 1);
  // traffic bump
  for (const c of traffic){ if (Math.hypot(c.position.x - v.pos.x, c.position.z - v.pos.z) < (v.type==='moto' ? 2.1 : 2.9)){ if (Math.abs(v.speed) > 3 || c.userData.speed > 3){ thwack(); shake = .5; heroDamage((v.type==='moto' ? 18 : 6) * DIFF.dmg, 'car'); v.speed = -v.speed*.3 - 2; c.userData.speed = 0; v.dmg = (v.dmg||0) + 12; } } }
}

// ---- 14-interactions.js ----
// ================= interactions =================
let nearAction = null;
function computeAction(){
  nearAction = null; if (state !== 'play' || hero.locked) return;
  const p = hero.pos;
  if (hero.veh){ const va = modeObj.vehAction && modeObj.vehAction(); nearAction = va || { text: 'انزل', fn: () => exitVehicle(false) }; return; }
  if (thief.active && !thief.caught && thief.pos.distanceTo(p) < 2){ nearAction = { text: 'امسك يوسف!', fn: thiefCaught }; return; }
  const ma = modeObj.action && modeObj.action(); if (ma){ nearAction = ma; return; }
  if (modeObj.vehicles){ let best = null, bd = 3.2; for (const v of vehicles){ if (modeObj.canDrive && !modeObj.canDrive(v)) continue; const d = Math.hypot(v.pos.x-p.x, v.pos.z-p.z); if (d < bd){ bd = d; best = v; } } if (best){ nearAction = { text: best.type==='moto' ? 'اركب الموتوسيكل' : best.type==='police' ? 'اركب البوكس' : 'اركب العربية', fn: () => enterVehicle(best) }; return; } }
  if (modeObj.cafe){
    if (p.distanceTo(SPOT.domino) < 2.4) { nearAction = { text: 'العب دومنو مع عم سيد', fn: () => openDomino() }; return; }
    if (p.distanceTo(SPOT.counter) < 2.6) { nearAction = { text: 'اشرب كوباية شاي (٥ جنيه)', fn: () => { if (hero.money < 5) return banner('مفيش فلوس كفاية', 'bad', 1.5); hero.money -= 5; hero.hp = Math.min(100, hero.hp+20); clink(); banner('شاي تقيل ومظبوط 🍵 +٢٠ صحة', 'ok', 2); } }; return; }
    if (Math.hypot(p.x-SPOT.cart.x, p.z-(SPOT.cart.z+1.4)) < 2.4) { nearAction = { text: 'اشتري سندوتش فلافل (٥ جنيه)', fn: () => { if (hero.money < 5) return banner('مفيش فلوس كفاية', 'bad', 1.5); hero.money -= 5; hero.hp = Math.min(100, hero.hp+35); coin(); banner('سندوتش فلافل سخن 🧆 +٣٥ صحة', 'ok', 2); } }; return; }
  }
}
function action(){ if (nearAction) nearAction.fn(); }
function punch(){
  if (hero.veh || hero.locked || hero.d.punchT > 0) return;
  // pick the closest target
  const p = hero.pos; let best = null, bd = 1.9;
  const camRightX = Math.cos(camYaw), camRightZ = -Math.sin(camYaw);
  for (const n of npcs){ if (n.state === 'hidden' || n.state === 'down') continue; const d = Math.hypot(n.g.position.x-p.x, n.g.position.z-p.z); if (d < bd){ bd = d; best = { n, x:n.g.position.x, z:n.g.position.z }; } }
  if (enemy.active && enemy.d.downT <= 0){ const d = enemy.pos.distanceTo(p); if (d < Math.max(bd, 1.9)){ bd = d; best = { enemy: true, x: enemy.pos.x, z: enemy.pos.z }; } }
  if (wanted.active && !wanted.caught){ const d = wanted.pos.distanceTo(p); if (d < 1.9 && d <= bd + .3){ best = { wanted: true, x: wanted.pos.x, z: wanted.pos.z }; } }
  if (thief.active && !thief.caught){ const d = thief.pos.distanceTo(p); if (d < 1.9){ best = { thief: true, x: thief.pos.x, z: thief.pos.z }; } }
  hero.d.punchSide = best ? (((best.x-p.x)*camRightX + (best.z-p.z)*camRightZ) >= 0 ? 1 : -1) : 1;
  hero.d.punchT = .28; noise(.08, 2500, .15);
  const pnow = runTime; hero.combo = (pnow - (hero.lastPunch ?? -9) < .8) ? (hero.combo||0) + 1 : 1; hero.lastPunch = pnow; const big = hero.combo % 3 === 0;
  if (!best) return;
  setTimeout(() => {
    if (big){ shake = .3; noise(.25, 600, .5); buzz(30); }
    if (best.n){ npcHit(best.n, big ? 2 : 0); if (modeObj.onPunchNPC) modeObj.onPunchNPC(best.n); }
    else if (best.enemy){ hitEnemy(big ? 35 : 18, p); if (big) say(enemy, '💥', .8, 'angry'); }
    else if (best.wanted) arrestWanted();
    else if (best.thief) thiefCaught();
  }, 120);
}

// ---- 15-enemy-hates-the-hero.js ----
// ================= enemy (hates the hero) =================
const enemy = { d: enemyD, pos: new THREE.Vector3(), vel: new THREE.Vector3(), hp: 100, active: false, state: 'roam', cd: 0, atk: 0, block: 0, t: 0, dir: 1, tauntT: 0 };
const ENEMY_LINES = ['انت تاني يا طيارة!','تعالى هنا!','مش طايقك!','النهارده يومك!','هتروح فين مني؟'];
function spawnEnemy(){ enemy.active = true; enemy.d.root.visible = true; enemy.hp = 100; enemy.state = 'roam'; enemy.cd = 6; const p = randomSidewalkPoint(45, hero.pos); enemy.pos.copy(p); enemy.block = blocksInfo.findIndex(b => Math.abs(p.x-b.cx) < 20 && Math.abs(p.z-b.cz) < 20); if (enemy.block < 0) enemy.block = 0; enemy.t = R(0,4); enemy.d.downT = 0; }
function hitEnemy(dmg, from){
  enemy.hp -= dmg; thwack(); const dx = enemy.pos.x - from.x, dz = enemy.pos.z - from.z, d = Math.hypot(dx,dz)||1;
  moveWithSlide(enemy.pos, dx/d*1.2, dz/d*1.2);
  if (enemy.hp <= 0){ enemy.d.downT = 6; enemy.state = 'down'; enemy.cd = 12; enemy.hp = enemy.maxHp || 100; say(enemy, 'ماشي يا طيارة… هترجعلي', 3, 'angry'); if (modeObj.onEnemyDown) modeObj.onEnemyDown(); }
  else say(enemy, rpick(['آه!','ماشي!','بتضربني؟!']), 1.2, 'angry');
}
function updateEnemy(dt){
  if (!enemy.active) return;
  const p = enemy.pos, target = hero.veh ? hero.veh.pos : hero.pos;
  const dx = target.x - p.x, dz = target.z - p.z, dist = Math.hypot(dx, dz);
  let vx = 0, vz = 0;
  if (enemy.cd > 0) enemy.cd -= dt;
  if (enemy.d.downT > 0 || enemy.state === 'wait'){ if (enemy.state === 'wait'){ p.copy(ENEMY_WAIT); enemy.tauntT -= dt; if (enemy.tauntT <= 0 && p.distanceTo(hero.pos) < 14){ enemy.tauntT = R(5,8); say(enemy, rpick(['تعالى نتسابق يا طيارة','خايف؟','موتوسيكلك خردة']), 2.2, 'angry'); } } }
  else {
    if (enemy.state === 'down') enemy.state = 'roam';
    const sees = dist < 24 && enemy.cd <= 0 && lineOfSight(p.x, p.z, target.x, target.z);
    if (sees && enemy.state !== 'chase'){ enemy.state = 'chase'; say(enemy, rpick(ENEMY_LINES), 2.4, 'angry'); }
    if (enemy.state === 'chase'){
      if (dist > 40){ enemy.state = 'roam'; }
      else if (dist > 1.1){ const sp = (enemy.boss ? 7.2 : 6.4) * DIFF.enemySpd; vx = dx/dist*sp; vz = dz/dist*sp; moveWithSlide(p, vx*dt, vz*dt); }
      enemy.tauntT -= dt; if (enemy.tauntT <= 0){ enemy.tauntT = R(4,7); say(enemy, rpick(ENEMY_LINES), 2, 'angry'); }
      if (dist < 1.45 && !hero.veh){ enemy.atk -= dt; if (enemy.atk <= 0){ enemy.atk = .95; enemy.d.punchT = .28; enemy.d.punchSide = (dx*Math.cos(camYaw) - dz*Math.sin(camYaw)) >= 0 ? -1 : 1; setTimeout(() => { if (enemy.active && enemy.d.downT <= 0 && enemy.pos.distanceTo(hero.pos) < 1.8) { heroDamage((enemy.boss ? 12 : 8) * DIFF.dmg, 'enemy'); hero.knock.set(dx/dist*-0, 0, 0); } }, 130); } }
    } else {
      const b = blocksInfo[enemy.block]; const old = perimPos(b, enemy.t); enemy.t += enemy.dir * 1.3 * dt / 33.2; const np = perimPos(b, enemy.t);
      const tx = np[0], tz = np[1]; const ddx = tx - p.x, ddz = tz - p.z, dd = Math.hypot(ddx, ddz);
      if (dd > 2) { vx = ddx/dd*3; vz = ddz/dd*3; moveWithSlide(p, vx*dt, vz*dt); } else { vx = (np[0]-old[0])/dt; vz = (np[1]-old[1])/dt; p.x = tx; p.z = tz; }
    }
  }
  // getting run over
  if (hero.veh && Math.abs(hero.veh.speed) > 4 && enemy.d.downT <= 0){ for (const c of vCircles(hero.veh)) if (Math.hypot(c.x-p.x, c.z-p.z) < c.r + .5){ hitEnemy(60, hero.veh.pos); enemy.d.downT = Math.max(enemy.d.downT, 4); break; } }
  p.y += (groundY(p.x, p.z) - p.y) * damp(15, dt);
  enemy.d.root.position.copy(p);
  enemy.vel.set(vx, 0, vz);
}

// ---- 16-wanted-man-police-mode.js ----
// ================= wanted man (police mode) =================
const wanted = { d: wantedD, pos: new THREE.Vector3(), active: false, caught: false, state: 'idle', speed: 7, dirX: 0, dirZ: 1, retarget: 0, shoutT: 0 };
function spawnWanted(){ wanted.active = true; wanted.caught = false; wanted.d.root.visible = true; wanted.d.downT = 0; wanted.pos.copy(randomSidewalkPoint(70, hero.pos)); wanted.state = 'idle'; wanted.speed = 7 * DIFF.enemySpd; }
function arrestWanted(){ if (!wanted.active || wanted.caught) return; wanted.caught = true; wanted.d.downT = 99; say(wanted, 'خلاص خلاص… سلّمت!', 3, 'angry'); if (modeObj.onArrest) modeObj.onArrest(); }
function updateWanted(dt){
  if (!wanted.active) return;
  const p = wanted.pos; let vx = 0, vz = 0;
  if (!wanted.caught){
    const t = hero.veh ? hero.veh.pos : hero.pos; const dx = p.x - t.x, dz = p.z - t.z, dist = Math.hypot(dx, dz);
    const spotted = dist < 14 || (dist < 32 && lineOfSight(p.x, p.z, t.x, t.z));
    if (spotted){
      if (wanted.state !== 'flee'){ say(wanted, rpick(['مش هتمسكني!','يا نهار أبيض… الحكومة!','اجري يا واد!']), 2.5, 'angry'); }
      wanted.state = 'flee'; wanted.lostT = 0;
    } else if (wanted.state === 'flee'){ wanted.lostT = (wanted.lostT||0) + dt; if (wanted.lostT > 6) wanted.state = 'idle'; }
    if (wanted.state === 'flee'){
      wanted.retarget -= dt;
      if (wanted.retarget <= 0){
        wanted.retarget = .35; let best = -1e9, bx = 0, bz = 1; const ax = dx/(dist||1), az = dz/(dist||1);
        for (let i=0;i<16;i++){ const a = i/16*Math.PI*2, cx = Math.sin(a), cz = Math.cos(a); let score = (cx*ax + cz*az)*2 + Math.random()*.4 + (cx*wanted.dirX + cz*wanted.dirZ)*.6; if (staticBlocked(p.x+cx*3, p.z+cz*3, .5) || staticBlocked(p.x+cx*1.2, p.z+cz*1.2, .4)) score -= 6; const nx = p.x+cx*8, nz = p.z+cz*8; if (Math.abs(nx) > LIMIT || Math.abs(nz) > LIMIT) score -= 4; if (score > best){ best = score; bx = cx; bz = cz; } }
        wanted.dirX = bx; wanted.dirZ = bz;
      }
      vx = wanted.dirX*wanted.speed; vz = wanted.dirZ*wanted.speed; moveWithSlide(p, vx*dt, vz*dt, .4);
      wanted.shoutT -= dt; if (wanted.shoutT <= 0){ wanted.shoutT = R(5,8); say(wanted, rpick(['مش هتمسكني!','ابعد عني!','أنا مظلوم يا باشا!']), 2, 'angry'); }
    }
    if (hero.veh && Math.abs(hero.veh.speed) > 1.5){ for (const c of vCircles(hero.veh)) if (Math.hypot(c.x-p.x, c.z-p.z) < c.r + .7){ arrestWanted(); break; } }
  }
  p.y += (groundY(p.x, p.z) - p.y) * damp(15, dt);
  wanted.d.root.position.copy(p); wanted.vx = vx; wanted.vz = vz;
}

// ---- 16b-youssef-and-islam.js ----
// ================= youssef (food thief) and islam (seated at the domino table) =================
const youssefD = makeDoll(CH.youssef, 1.8); youssefD.root.visible = false;
const islamD = makeDoll(CH.islam, 1.78); islamD.root.visible = false;
islamD.P.legL.visible = islamD.P.legR.visible = false; islamD.blob.visible = false;
function seatIslam(on){
  islamD.root.visible = on;
  if (on) islamD.root.position.set(SPOT.domino.x + .85, .62 - islamD.hipY + .04, SPOT.domino.z);
}
const thief = { d: youssefD, pos: new THREE.Vector3(), active: false, caught: false, next: 75, dirX: 0, dirZ: 1, retarget: 0, lostT: 0, shoutT: 0, vx: 0, vz: 0 };
function thiefReset(){ thief.active = false; thief.caught = false; thief.next = R(60, 110); youssefD.root.visible = false; }
function thiefStart(){
  thief.active = true; thief.caught = false; thief.lostT = 0; thief.shoutT = 2;
  thief.pos.set(SPOT.cart.x + 1.6, .15, SPOT.cart.z + 2.4); youssefD.root.visible = true; youssefD.downT = 0;
  say(thief, 'هوب! 🧆 ساندوتش ببلاش', 2.5, 'angry');
  banner('🚨 يوسف إبراهيم خطف ساندوتش من عربية الفول! الحقه', 'bad', 3.5); buzz(40);
}
function thiefCaught(){
  if (!thief.active || thief.caught) return;
  thief.caught = true; youssefD.downT = 2.5; thwack(); coin(); buzz(30);
  say(thief, 'خلاص خلاص… خد الساندوتش 😅', 2.5, 'angry');
  const reward = 40; hero.money += reward; if (modeId === 'story'){ SAVE.rep += 3; SAVE.cnt.thief = (SAVE.cnt.thief||0) + 1; saveStory(); }
  banner(`مسكت يوسف! +${reward} جنيه من صاحب العربية`, 'ok', 3);
  setTimeout(() => { thief.active = false; youssefD.root.visible = false; thief.next = R(150, 240); }, 2600);
}
function updateThief(dt, t){
  if (modeId !== 'story'){ if (thief.active) thiefReset(); return; }
  if (!thief.active){
    thief.next -= dt;
    if (thief.next <= 0 && !modeObj.job && !ST.kind && !race.active && SAVE.step >= 1 && hero.pos.distanceTo(SPOT.cart) < 70) thiefStart();
    return;
  }
  const p = thief.pos; let vx = 0, vz = 0;
  if (!thief.caught){
    const tg = hero.veh ? hero.veh.pos : hero.pos; const dx = p.x - tg.x, dz = p.z - tg.z, dist = Math.hypot(dx, dz);
    thief.retarget -= dt;
    if (thief.retarget <= 0){
      thief.retarget = .35; let best = -1e9, bx = 0, bz = 1; const ax = dx/(dist||1), az = dz/(dist||1);
      for (let i=0;i<16;i++){ const a = i/16*Math.PI*2, cx = Math.sin(a), cz = Math.cos(a); let score = (cx*ax + cz*az)*2 + Math.random()*.4 + (cx*thief.dirX + cz*thief.dirZ)*.6; if (staticBlocked(p.x+cx*3, p.z+cz*3, .5) || staticBlocked(p.x+cx*1.2, p.z+cz*1.2, .4)) score -= 6; if (Math.abs(p.x+cx*8) > LIMIT || Math.abs(p.z+cz*8) > LIMIT) score -= 4; if (score > best){ best = score; bx = cx; bz = cz; } }
      thief.dirX = bx; thief.dirZ = bz;
    }
    const sp = 6.4 * DIFF.enemySpd; vx = thief.dirX*sp; vz = thief.dirZ*sp; moveWithSlide(p, vx*dt, vz*dt, .4);
    thief.shoutT -= dt; if (thief.shoutT <= 0){ thief.shoutT = R(4,7); say(thief, rpick(['مش هتلحقني!','جعان يا جدعان!','ده ساندوتش واحد بس!']), 2, 'angry'); }
    if (hero.veh && Math.abs(hero.veh.speed) > 1.5) for (const c of vCircles(hero.veh)) if (Math.hypot(c.x-p.x, c.z-p.z) < c.r + .7){ thiefCaught(); break; }
    if (dist > 60) thief.lostT += dt; else thief.lostT = 0;
    if (thief.lostT > 6){ thief.active = false; youssefD.root.visible = false; thief.next = R(120, 200); banner('يوسف هرب بالساندوتش 😤', 'bad', 2.5); }
  }
  p.y += (groundY(p.x, p.z) - p.y) * damp(15, dt);
  youssefD.root.position.copy(p); thief.vx = vx; thief.vz = vz;
  animDoll(youssefD, vx, vz, dt, t);
}
function updatePhotoSeats(dt, t){ if (islamD.root.visible) animDoll(islamD, 0, 0, dt, t); }
// difficulty switch in the menu
function renderDiff(){ $('diffBtn').textContent = diffKey === 'easy' ? '😊 سهل' : '💪 عادي'; }
$('diffBtn').onclick = () => { diffKey = diffKey === 'easy' ? 'normal' : 'easy'; DIFF = DIFFS[diffKey]; store.set('ty_diff', diffKey); renderDiff(); };
renderDiff();

// ---- 17-cash-mode-chaser.js ----
// ================= cash-mode chaser =================
const chaser = { active: false, mode: 'grid', node: [0,0], lostT: 0, flashT: 0, spawnT: 0 };
function spawnChaser(){
  const p = hero.pos; const opts = [];
  for (let i=0;i<=N;i++) for (let k=0;k<=N;k++){ const d = Math.hypot(ROADS[i]-p.x, ROADS[k]-p.z); if (d > 45 && d < 90) opts.push([i,k]); }
  const n = opts.length ? rpick(opts) : [0,0];
  chaserCar.position.set(ROADS[n[0]], 0, ROADS[n[1]]); Object.assign(chaser, { node: n, mode: 'grid', active: true, lostT: 0, spawnT: 0 });
  chaserCar.visible = true; chaserLight.intensity = 30; banner('🚨 البوليس وراك! اجري', 'police', 3);
}
function updateChaser(dt){
  if (!chaser.active) return;
  const pc = chaserCar.position, p = hero.pos, dx = p.x - pc.x, dz = p.z - pc.z, dist = Math.hypot(dx, dz);
  chaser.spawnT += dt;
  const sees = dist < 42 && lineOfSight(pc.x, pc.z, p.x, p.z);
  const speed = 6.9 + Math.min(modeObj.got||0, 10)*.13 + (chaser.mode === 'grid' ? .9 : 0);
  let tx, tz;
  if (sees){ chaser.mode = 'direct'; tx = p.x; tz = p.z; chaser.lostT = 0; }
  else {
    if (chaser.mode === 'direct'){ chaser.mode = 'grid'; chaser.node = nearestNode(pc.x, pc.z); }
    tx = ROADS[chaser.node[0]]; tz = ROADS[chaser.node[1]];
    if (Math.hypot(tx-pc.x, tz-pc.z) < .9){ const o = [[1,0],[-1,0],[0,1],[0,-1]].map(([a,b]) => [chaser.node[0]+a, chaser.node[1]+b]).filter(([i,k]) => i>=0 && k>=0 && i<=N && k<=N); o.sort((A,B) => Math.hypot(ROADS[A[0]]-p.x, ROADS[A[1]]-p.z) - Math.hypot(ROADS[B[0]]-p.x, ROADS[B[1]]-p.z)); chaser.node = o[0]; tx = ROADS[chaser.node[0]]; tz = ROADS[chaser.node[1]]; }
    if (dist > 48) chaser.lostT += dt; else chaser.lostT = Math.max(0, chaser.lostT - dt*.5);
  }
  let vx = tx - pc.x, vz = tz - pc.z; const vl = Math.hypot(vx, vz) || 1; vx = vx/vl*speed; vz = vz/vl*speed;
  const nx = pc.x + vx*dt, nz = pc.z + vz*dt;
  if (chaser.mode === 'direct' && obstacles.some(o => o.building && nx > o.minX-1.1 && nx < o.maxX+1.1 && nz > o.minZ-1.1 && nz < o.maxZ+1.1)){ chaser.mode = 'grid'; chaser.node = nearestNode(pc.x, pc.z); }
  else { pc.x = nx; pc.z = nz; }
  chaserCar.rotation.y = lerpAngle(chaserCar.rotation.y, Math.atan2(vx, vz), damp(6, dt));
  chaser.flashT += dt; const on = Math.floor(chaser.flashT*7) % 2 === 0;
  chaserCar.userData.red.emissiveIntensity = on ? 3 : .2; chaserCar.userData.blue.emissiveIntensity = on ? .2 : 3; chaserLight.color.setHex(on ? 0xff2040 : 0x2050ff);
  if (sirenGain) sirenGain.gain.value = clamp(.08 - dist*.001, .012, .08);
  const L = carLocal(chaserCar, p);
  if (chaser.spawnT > 1 && Math.abs(L.along) < 2.6 && Math.abs(L.lat) < 1.35) endMode('اتمسكت! 🚔', `البوليس لحق ${heroName} بعد ما لم ${egp(modeObj.money||0)}.`);
  else if (chaser.lostT > 7){ chaser.active = false; chaserCar.visible = false; chaserLight.intensity = 0; if (sirenGain) sirenGain.gain.value = 0; banner('هربت منهم 😎', 'ok', 2.5); }
}

// ---- 18-modes.js ----
// ================= modes =================
let state = 'menu', modeId = 'free', modeObj = {}, heroName = 'طيارة', shake = 0, runTime = 0;
function renderModes(){
  const has = SAVE.started || SAVE.step > 0;
  const M = curMission();
  const list = [
    { id:'story', icon:'👑', name: has ? 'كمّل القصة' : 'القصة', desc: has ? (M ? `المهمة ${SAVE.step+1} من ${MISSIONS.length}: ${M.title} · ${egp(SAVE.money)}` : 'خلصت القصة! لف في الحتة براحتك.') : 'طيارة مفلس… اشتغل وحوّش، اشتري موتوسيكل وعربية، امسك المطلوب، ووقّع اللي بيكرهك.' },
    { id:'ahwa', icon:'☕', name:'وردية قهوجي', desc:'دور سريع في قصر الملوك: حضّر الشاي والقهوة بإيدك ووزّع.' },
    { id:'domino', icon:'🎲', name:'دومنو مع عم سيد', desc:'ماتش لـ ١٠١ بالقواعد المصرية.' },
  ];
  $('modes').innerHTML = list.map(m => `<button class="mode" data-mode="${m.id}"><span class="ic">${m.icon}</span><span><b>${m.name}</b><span>${m.desc}</span></span></button>`).join('') + (has ? '<button class="mode reset" id="resetStory"><span class="ic">↺</span><span><b>ابدأ القصة من الأول</b><span id="resetHint">التقدم اللي فات هيتمسح</span></span></button>' : '');
  $('modes').querySelectorAll('[data-mode]').forEach(b => b.onclick = () => startMode(b.dataset.mode));
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

// ---- 19-first-person-cooking-stations.js ----
// ================= first-person cooking stations =================
const ST = { kind: null, hold: null, labels: [], msgT: 0 };
const SM = {
  steel: new THREE.MeshStandardMaterial({ color: 0xc9ccd0, metalness: .85, roughness: .28, side: THREE.DoubleSide }),
  alu: new THREE.MeshStandardMaterial({ color: 0xb9bdc2, metalness: .8, roughness: .33 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc8963e, metalness: .85, roughness: .3, side: THREE.DoubleSide }),
  copper: new THREE.MeshStandardMaterial({ color: 0xb8692e, metalness: .85, roughness: .32, side: THREE.DoubleSide }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1b1b1b, metalness: .5, roughness: .5, side: THREE.DoubleSide }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: .7 }),
  jar: new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .25, roughness: .05, depthWrite: false, side: THREE.DoubleSide }),
  white: new THREE.MeshStandardMaterial({ color: 0xf3f1ec, roughness: .3 }),
  flame: new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }),
  hit: new THREE.MeshBasicMaterial({ visible: false }),
  ring: new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: .85, depthWrite: false, side: THREE.DoubleSide }),
  paper: new THREE.MeshStandardMaterial({ color: 0xeadcbe, roughness: .9 }),
  sugar: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6, transparent: true }),
  green: new THREE.MeshStandardMaterial({ color: 0x2f5d3a, roughness: .8 }),
  tahina: new THREE.MeshStandardMaterial({ color: 0xd8c39a, roughness: .45 }),
  egg: new THREE.MeshStandardMaterial({ color: 0xf6f2e8, roughness: .4 }),
  yolk: new THREE.MeshStandardMaterial({ color: 0xf2b627, roughness: .5 }),
  foam: new THREE.MeshStandardMaterial({ color: 0xb48a58, roughness: .7 }),
  spill: new THREE.MeshStandardMaterial({ color: 0x3a2210, roughness: .3, transparent: true, opacity: .85 }),
};
const marbleTex = makeTex(512,512,(g,w,h)=>{ g.fillStyle='#ebe6dc'; g.fillRect(0,0,w,h); for (let i=0;i<40;i++){ g.strokeStyle=`rgba(120,110,100,${.05+Math.random()*.12})`; g.lineWidth=1+Math.random()*2; g.beginPath(); let x=Math.random()*w, y=Math.random()*h; g.moveTo(x,y); for (let k=0;k<8;k++){ x+=Math.random()*80-40; y+=Math.random()*80-40; g.lineTo(x,y); } g.stroke(); } grain(g,w,h,6000,.06); });
const steelTex = makeTex(512,512,(g,w,h)=>{ g.fillStyle='#b9bcc0'; g.fillRect(0,0,w,h); for (let y=0;y<h;y++){ g.fillStyle=`rgba(255,255,255,${Math.random()*.08})`; g.fillRect(0,y,w,1); } grain(g,w,h,4000,.08); });
const breadTex = makeTex(256,256,(g,w,h)=>{ const gr=g.createRadialGradient(128,128,20,128,128,128); gr.addColorStop(0,'#cf9f5f'); gr.addColorStop(1,'#9f6b34'); g.fillStyle=gr; g.fillRect(0,0,w,h); for (let i=0;i<900;i++){ g.fillStyle=`rgba(${90+Math.random()*60|0},${55+Math.random()*30|0},25,${.3+Math.random()*.4})`; g.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*3,1+Math.random()*2); } for (let i=0;i<14;i++){ g.fillStyle='rgba(70,40,15,.35)'; g.beginPath(); g.ellipse(Math.random()*w,Math.random()*h,6+Math.random()*14,4+Math.random()*8,Math.random()*3,0,7); g.fill(); } });
const foulTex = makeTex(256,256,(g,w,h)=>{ g.fillStyle='#6b4524'; g.fillRect(0,0,w,h); for (let i=0;i<700;i++){ g.fillStyle=`rgba(${120+Math.random()*50|0},${75+Math.random()*30|0},35,.7)`; g.beginPath(); g.ellipse(Math.random()*w,Math.random()*h,4+Math.random()*4,3+Math.random()*3,Math.random()*3,0,7); g.fill(); } for (let i=0;i<30;i++){ g.fillStyle='rgba(230,190,60,.35)'; g.beginPath(); g.ellipse(Math.random()*w,Math.random()*h,8+Math.random()*16,5+Math.random()*10,0,0,7); g.fill(); } for (let i=0;i<250;i++){ g.fillStyle='rgba(150,90,30,.9)'; g.fillRect(Math.random()*w,Math.random()*h,1.5,1.5); } });
const mixTex = makeTex(256,256,(g,w,h)=>{ g.fillStyle='#5f7a36'; g.fillRect(0,0,w,h); for (let i=0;i<3000;i++){ g.fillStyle=`hsla(${70+Math.random()*40},${40+Math.random()*30}%,${25+Math.random()*30}%,.8)`; g.fillRect(Math.random()*w,Math.random()*h,2,2); } });
const steamTex = makeTex(64,64,(g)=>{ const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); });
const cylM = (rt, rb, h, mat, seg=20, open=false) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat);
function bowl(r, h, mat=SM.steel){ const g = new THREE.Group(); const w = cylM(r, r*.72, h, mat, 28, true); w.position.y = h/2; const b = cylM(r*.72, r*.72, .004, mat, 28); b.position.y = .002; g.add(w, b); return g; }
function disc(r, mat, y=0){ const d = cylM(r, r, .006, mat, 28); d.position.y = y; return d; }
const stGlassMat = new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, transparent: true, opacity: .42, roughness: .05, side: THREE.DoubleSide, depthWrite: false });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .1, transparent: true, opacity: .8 });
function emptyGlass(){ const g = new THREE.Group(); const gl = cylM(.045,.036,.11, stGlassMat, 16, true); gl.position.y = .058; gl.renderOrder = 3; const rim = new THREE.Mesh(new THREE.TorusGeometry(.045,.0025,6,24), rimMat); rim.rotation.x = Math.PI/2; rim.position.y = .113; const s = cylM(.075,.06,.012, saucerMat, 18); s.position.y = .006; g.add(s, gl, rim); return g; }
function cupModel(){ const g = new THREE.Group(); const c = cylM(.038,.03,.06, SM.white, 20, true); c.position.y = .042; const b = cylM(.03,.03,.004, SM.white, 20); b.position.y = .013; const h = new THREE.Mesh(new THREE.TorusGeometry(.016,.004,6,12,Math.PI), SM.white); h.rotation.z = -Math.PI/2; h.position.set(.042,.045,0); const s = cylM(.065,.055,.01, SM.white, 20); s.position.y = .005; g.add(c, b, h, s); return g; }
const stationAnchor = { ahwa: { pos: new THREE.Vector3(SPOT.counter.x, 1.15, SPOT.counter.z), yaw: 0 }, foul: { pos: new THREE.Vector3(SPOT.cart.x, 1.45, SPOT.cart.z), yaw: Math.PI } };
const STA = {};
function makeStation(kind){
  const a = stationAnchor[kind]; const grp = new THREE.Group(); grp.position.copy(a.pos); grp.rotation.y = a.yaw; scene.add(grp);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1, .03, 1), new THREE.MeshStandardMaterial(kind === 'ahwa' ? { map: marbleTex, roughness: .3 } : { map: steelTex, metalness: .6, roughness: .32 }));
  top.position.y = .015; top.receiveShadow = true; grp.add(top);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.13, .16, 36), SM.ring); ring.rotation.x = -Math.PI/2; ring.visible = false; grp.add(ring);
  const S = { kind, grp, top, ring, props: {}, hits: [], narrow: null }; STA[kind] = S; return S;
}
function addProp(S, name, label, obj, hit, w, n){
  const g = new THREE.Group(); g.add(obj); S.grp.add(g);
  const hm = new THREE.Mesh(new THREE.BoxGeometry(hit[0], hit[1], hit[0]), SM.hit); hm.position.y = hit[1]/2; hm.userData.prop = name; g.add(hm);
  obj.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const pr = { name, label, g, obj, hm, w, n }; S.props[name] = pr; S.hits.push(hm); return pr;
}
function layoutStation(S, narrow){
  S.narrow = narrow;
  for (const pr of Object.values(S.props)){ const [x,z] = narrow ? pr.n : pr.w; pr.g.position.set(x, .03, z); }
  if (narrow){ S.top.scale.set(1.42, 1, 1.62); S.top.position.z = -.07; } else { S.top.scale.set(2.05, 1, 1.22); S.top.position.z = .02; }
  if (S.onLayout) S.onLayout();
}
// steam puffs
const steamPool = [...Array(18)].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; scene.add(s); return { s, life: 0 }; });
function puff(worldPos, size=.06){ const p = steamPool.find(p => p.life <= 0); if (!p) return; p.life = 1.6; p.s.visible = true; p.s.position.copy(worldPos); p.s.position.x += (Math.random()-.5)*.03; p.s.scale.setScalar(size); p.size = size; }
function updateSteam(dt){ for (const p of steamPool){ if (p.life <= 0) continue; p.life -= dt; p.s.position.y += dt*.12; p.s.position.x += Math.sin(p.life*5)*dt*.02; const k = p.life/1.6; p.s.material.opacity = Math.min(1, (1-k)*4) * k * .7; p.s.scale.setScalar(p.size * (1 + (1-k)*1.8)); if (p.life <= 0) p.s.visible = false; } }
// pouring stream
const streamMesh = new THREE.Mesh(new THREE.CylinderGeometry(.006,.004,1,8), new THREE.MeshStandardMaterial({ color: 0x8a2a08, transparent: true, opacity: .85, roughness: .1 })); streamMesh.visible = false; scene.add(streamMesh);
function showStream(from, to, color){ streamMesh.visible = true; streamMesh.material.color.set(color); const d = _t.copy(to).sub(from); const len = d.length(); streamMesh.position.copy(from).addScaledVector(d, .5); streamMesh.scale.set(1, len, 1); streamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), d.normalize()); }
// looping sounds (pour, sizzle)
const loops = {};
function loopGain(name, freq, type){
  if (!AC) return null; if (loops[name]) return loops[name];
  if (!noiseBuf){ noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1; }
  const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = 1.2; const g = AC.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(sfx); s.start(); loops[name] = g; return g;
}
function setLoop(name, v, freq, type){ const g = loopGain(name, freq, type); if (g) g.gain.value += (v - g.gain.value) * .25; }

// ----- tea & coffee station (النَصبة) -----
const AH = { vessel: null, pot: { coffee: 0, sugar: 0, heat: 0, onFire: false, ruined: false, foam: false }, pouring: null, stirT: 0 };
const SA = makeStation('ahwa');
{
  const S = SA;
  // stove
  const stove = new THREE.Group(); { const b = cylM(.12,.13,.035, SM.dark, 24); b.position.y = .017; const gr = new THREE.Mesh(new THREE.TorusGeometry(.085,.008,6,24), SM.dark); gr.rotation.x = Math.PI/2; gr.position.y = .04; const fl = new THREE.Mesh(new THREE.TorusGeometry(.055,.014,6,24), SM.flame); fl.rotation.x = Math.PI/2; fl.position.y = .045; fl.visible = false; const sp = disc(.11, SM.spill, .036); sp.visible = false; stove.add(b, gr, fl, sp); stove.userData = { flame: fl, spill: sp }; }
  addProp(S, 'stove', '🔥 النار', stove, [.3,.12], [-.78,-.32], [-.42,-.62]);
  // kanaka (كنكة)
  const kan = new THREE.Group(); { const body = cylM(.05,.062,.11, SM.brass, 22, true); body.position.y = .056; const bot = cylM(.062,.062,.004, SM.brass, 22); bot.position.y = .002; const hd = new THREE.Mesh(new THREE.BoxGeometry(.2,.012,.016), SM.brass); hd.position.set(-.15,.1,0); hd.rotation.z = -.35; const liq = disc(.048, new THREE.MeshStandardMaterial({ color: 0x2a1508, roughness: .2 }), .03); const foam = disc(.049, SM.foam, .03); foam.visible = false; kan.add(body, bot, hd, liq, foam); kan.userData = { liq, foam }; kan.scale.setScalar(1.25); }
  addProp(S, 'kanaka', 'الكنكة', kan, [.3,.25], [-.78,.06], [-.42,-.27]);
  // barrad (tea pot)
  const brd = new THREE.Group(); { const tilt = new THREE.Group(); brd.add(tilt); const body = new THREE.Mesh(new THREE.SphereGeometry(.1,24,16), SM.alu); body.scale.set(1,.85,1); body.position.y = .09; const lid = cylM(.045,.05,.02, SM.alu, 18); lid.position.y = .17; const knob = new THREE.Mesh(new THREE.SphereGeometry(.015,10,8), SM.dark); knob.position.y = .187; const sp = cylM(.01,.022,.15, SM.alu, 10); sp.rotation.z = -1.0; sp.position.set(.13,.12,0); const hd = new THREE.Mesh(new THREE.TorusGeometry(.055,.01,8,16,Math.PI), SM.dark); hd.rotation.z = Math.PI/2; hd.position.set(-.1,.1,0); tilt.add(body, lid, knob, sp, hd); brd.userData = { tilt, spout: new THREE.Vector3(.2,.18,0) }; }
  addProp(S, 'barrad', 'البراد', brd, [.32,.3], [-.36,-.34], [0,-.62]);
  // kettle (غلاية مية)
  const ket = new THREE.Group(); { const tilt = new THREE.Group(); ket.add(tilt); const body = cylM(.07,.08,.17, SM.steel, 22); body.position.y = .085; const lid = cylM(.05,.06,.02, SM.steel, 18); lid.position.y = .18; const hd = new THREE.Mesh(new THREE.TorusGeometry(.06,.01,8,16,Math.PI), SM.dark); hd.position.y = .19; const sp = cylM(.008,.016,.12, SM.steel, 10); sp.rotation.z = -1.1; sp.position.set(.1,.11,0); tilt.add(body, lid, hd, sp); ket.userData = { tilt, spout: new THREE.Vector3(.16,.15,0) }; }
  addProp(S, 'kettle', '💧 مية سخنة', ket, [.3,.3], [.04,-.34], [.42,-.62]);
  // tray
  const tr = new THREE.Group(); { const t = cylM(.2,.2,.014, SM.alu, 30); t.position.y = .007; const rim = new THREE.Mesh(new THREE.TorusGeometry(.2,.007,6,30), SM.alu); rim.rotation.x = Math.PI/2; rim.position.y = .015; tr.add(t, rim); tr.userData = { slots: new THREE.Group() }; tr.add(tr.userData.slots); }
  addProp(S, 'tray', '🍽️ الصينية', tr, [.4,.12], [.74,-.3], [.42,-.27]);
  // jars
  const jar = (col, lidCol) => { const g = new THREE.Group(); const gl = cylM(.058,.058,.13, SM.jar, 20, true); gl.position.y = .065; gl.renderOrder = 3; const c = cylM(.052,.052,.08, new THREE.MeshStandardMaterial({ color: col, roughness: .9 }), 20); c.position.y = .042; const l = cylM(.062,.062,.022, new THREE.MeshStandardMaterial({ color: lidCol, roughness: .5 }), 20); l.position.y = .14; g.add(c, gl, l); g.scale.setScalar(1.2); return g; };
  addProp(S, 'sugar', '🧂 سكر', jar(0xf7f5f0, 0xc0392b), [.24,.25], [-.42,.04], [0,-.27]);
  addProp(S, 'coffee', '☕ بُن', jar(0x3b2414, 0x2c3e50), [.24,.25], [-.16,.04], [-.42,.08]);
  addProp(S, 'anise', '🌿 ينسون', jar(0x8f8a4a, 0x27ae60), [.24,.25], [.1,.04], [0,.08]);
  addProp(S, 'helba', '🥛 حلبة', jar(0xc9a23a, 0xd4ac0d), [.24,.25], [.36,.04], [.42,.08]);
  // stacks
  const gls = new THREE.Group(); for (let i=0;i<3;i++){ const g = emptyGlass(); g.position.set((i-1)*.09, 0, 0); gls.add(g); } gls.scale.setScalar(1.3);
  addProp(S, 'glasses', '🥃 كوبايات', gls, [.36,.2], [.74,.38], [.42,.44]);
  const cps = new THREE.Group(); for (let i=0;i<2;i++){ const g = cupModel(); g.position.set((i-.5)*.13, 0, 0); cps.add(g); } cps.scale.setScalar(1.3);
  addProp(S, 'cups', '☕ فناجين', cps, [.32,.18], [.44,.38], [-.42,.44]);
  // work spot with the vessel
  const work = new THREE.Group(); { const mat = disc(.1, SM.green, .003); work.add(mat); const vg = new THREE.Group(); work.add(vg); work.userData = { vg }; }
  addProp(S, 'work', '👇 هنا', work, [.3,.3], [-.14,.38], [0,.44]);
  S.onLayout = () => {
    // turn the pots so their spouts face the work spot
    for (const nm of ['barrad','kettle']){ const pr = S.props[nm]; const w = S.props.work.g.position; const dx = w.x - pr.g.position.x, dz = w.z - pr.g.position.z; pr.obj.rotation.y = Math.atan2(-dz, dx); }
    const pr = S.props.kanaka, w = S.props.work.g.position; pr.obj.rotation.y = Math.atan2(-(w.z - pr.g.position.z), w.x - pr.g.position.x);
  };
  layoutStation(S, false);
}
function newVessel(kind){ return { kind, drink: null, herb: null, fill: 0, sugar: 0, stir: 0, spilled: false, foam: false, hotT: 0 }; }
function ahwaVisual(){
  const W = SA.props.work.obj.userData, vg = W.vg, v = AH.vessel;
  const key = v ? v.kind : 'none';
  if (W.key !== key){
    while (vg.children.length) vg.remove(vg.children[0]); W.key = key; W.P = null;
    if (v){
      const g = v.kind === 'glass' ? emptyGlass() : cupModel(); g.scale.setScalar(1.7); vg.add(g);
      const P = { g };
      if (v.kind === 'glass'){
        P.lq = new THREE.Mesh(new THREE.CylinderGeometry(.041,.034,1,16), new THREE.MeshStandardMaterial({ roughness: .15, transparent: true, opacity: .88, emissiveIntensity: .12 })); P.lq.geometry.translate(0,.5,0); P.lq.position.y = .01; g.add(P.lq);
        P.herb = disc(.03, new THREE.MeshStandardMaterial({ color: 0x6f6a32 }), .015); g.add(P.herb);
        P.sugar = cylM(.032,.032,.004, SM.sugar.clone(), 16); P.sugar.position.y = .013; g.add(P.sugar);
        P.spill = disc(.12, new THREE.MeshStandardMaterial({ transparent: true, opacity: .7, roughness: .1 }), .002); vg.add(P.spill);
        P.spoon = new THREE.Group(); const h = new THREE.Mesh(new THREE.BoxGeometry(.004,.16,.004), SM.steel); h.position.set(.015,.1,0); P.spoon.add(h); P.spoon.rotation.z = .2; g.add(P.spoon);
      } else {
        P.lq = disc(.029, new THREE.MeshStandardMaterial({ roughness: .2 }), .02); g.add(P.lq);
        P.foam = disc(.0295, SM.foam, .02); g.add(P.foam);
      }
      W.P = P;
    }
  }
  if (!v || !W.P) return;
  const P = W.P, col = { 'شاي': 0x7a2306, 'قهوة': 0x2a1508, 'ينسون': 0xa99a45, 'حلبة': 0xd4ad4f }[v.drink] || 0xa9c9d9;
  if (v.kind === 'glass'){
    P.lq.visible = v.fill > 0; P.lq.material.color.setHex(col); P.lq.material.emissive.setHex(col); P.lq.scale.y = Math.max(.001, Math.min(v.fill, 1.02)) * .105;
    P.herb.visible = !!v.herb && v.fill < .05; P.herb.material.color.setHex(v.herb === 'حلبة' ? 0xc9a23a : 0x6f6a32);
    P.sugar.visible = v.sugar > 0; P.sugar.scale.y = 1 + v.sugar*.8; P.sugar.material.opacity = Math.max(0, 1 - v.stir) * .95;
    P.spill.visible = v.spilled; P.spill.material.color.setHex(col);
    P.spoon.visible = !!ST.stirring;
  } else {
    P.lq.visible = v.fill > 0; P.lq.material.color.setHex(col); P.lq.position.y = .014 + Math.min(v.fill,1)*.055;
    P.foam.visible = v.fill > 0 && v.foam; P.foam.position.y = P.lq.position.y + .001;
  }
}
function ahwaPotVisual(){
  const k = SA.props.kanaka.obj.userData, p = AH.pot;
  k.liq.visible = p.coffee > 0 && !p.ruined; k.liq.position.y = .03 + Math.min(1, p.heat)*.03;
  const f = clamp((p.heat - .5)/.5, 0, 1); k.foam.visible = p.coffee > 0 && f > 0 && !p.ruined; k.foam.position.y = .045 + f*.05; k.foam.scale.setScalar(1 + f*.08);
  const st = SA.props.stove.obj.userData; st.flame.visible = p.onFire; st.spill.visible = p.ruined;
  const kp = SA.props.kanaka;
  const target = p.onFire ? SA.props.stove.g.position : null;
  if (target){ kp.g.position.set(target.x, .07, target.z); } else { const [x,z] = SA.narrow ? kp.n : kp.w; kp.g.position.set(x, .03, z); }
}
function ahwaTrayVisual(){
  const sl = SA.props.tray.obj.userData.slots; while (sl.children.length) sl.remove(sl.children[0]);
  (modeObj.tray || []).forEach((d,i) => { const g = d.drink === 'قهوة' ? cupModel() : makeGlass(d.drink); if (d.drink === 'قهوة'){ const l = disc(.029, coffeeMat, .065); g.add(l); g.scale.setScalar(1.3); } else g.scale.setScalar(1.05); const a = i/trayCap()*Math.PI*2; g.position.set(Math.cos(a)*.1, .014, Math.sin(a)*.1); sl.add(g); });
}
function stMsg(t, cls=''){ $('stHint').textContent = t; $('stHint').className = 'st-hint show ' + cls; ST.msgT = 2.4; }
function pendingAhwa(){
  if (!modeObj.patrons || (modeObj.story && modeObj.job !== 'ahwa')) return [];
  const list = modeObj.patrons.filter(n => n.state === 'customer' && n.order).sort((a,b) => a.patience - b.patience).map(n => ({ n, o: n.order }));
  const tray = [...(modeObj.tray||[])];
  return list.filter(({o}) => { const i = tray.findIndex(t => t.drink === o.drink && t.spoons === sugarSpoons(o.drink, o.sugar)); if (i >= 0){ tray.splice(i,1); return false; } return true; });
}
function ahwaTap(name){
  const v = AH.vessel, p = AH.pot, S = SA;
  const spoon = (from, to) => { tone(2400, 2300, .08, 'sine', .05); buzz(10); spoonFly(S.props[from], S.props[to]); };
  if (name === 'glasses' || name === 'cups'){
    if (v) return stMsg('فيه حاجة قدامك… حطها على الصينية أو ارميها');
    AH.vessel = newVessel(name === 'glasses' ? 'glass' : 'cup'); clink(); ahwaVisual(); return;
  }
  if (name === 'sugar'){
    if (p.coffee > 0 && !p.onFire && p.heat < .05 && (!v || v.kind === 'cup')){ if (p.sugar >= 4) return stMsg('كفاية سكر!'); p.sugar++; spoon('sugar','kanaka'); return stMsg(`سكر في الكنكة: ${p.sugar} معلقة`); }
    if (v && v.kind === 'glass' && !v.spilled){ if (v.sugar >= 5) return stMsg('كفاية سكر!'); v.sugar++; v.stir = 0; spoon('sugar','work'); ahwaVisual(); return stMsg(`سكر: ${v.sugar} معلقة`); }
    return stMsg('هات كوباية الأول… أو حط بُن في الكنكة للقهوة');
  }
  if (name === 'coffee'){
    if (p.ruined) return stMsg('القهوة فارت… دوس ارمي الأول', 'bad');
    if (p.onFire || p.heat > .05 || p.foam) return stMsg('الكنكة شغالة خلاص');
    if (p.coffee >= 2) return stMsg('معلقة بُن كفاية للفنجان');
    p.coffee++; spoon('coffee','kanaka'); ahwaPotVisual(); return stMsg('بُن في الكنكة ✔️ حط سكر لو عايز، وبعدين على النار');
  }
  if (name === 'anise' || name === 'helba'){
    const herb = name === 'anise' ? 'ينسون' : 'حلبة';
    if (!v || v.kind !== 'glass') return stMsg('هات كوباية الأول');
    if (v.fill > 0 || v.herb) return stMsg('الكوباية فيها حاجة');
    v.herb = herb; spoon(name, 'work'); ahwaVisual(); return stMsg(`${herb} في الكوباية ✔️ صب مية سخنة من الغلاية`);
  }
  if (name === 'kanaka' || name === 'stove'){
    if (p.ruined) return stMsg('القهوة فارت… دوس ارمي', 'bad');
    if (p.coffee === 0) return stMsg('حط معلقة بُن في الكنكة الأول');
    if (p.onFire){ p.onFire = false; tone(300,200,.15,'sine',.08); if (p.heat >= .72){ p.foam = true; stMsg('الوش مظبوط 👌 هات فنجان واضغط مطوّل على الكنكة', 'ok'); } else stMsg('لسه بدري… رجّعها على النار'); }
    else { if (p.foam) return stMsg('القهوة جاهزة… صبها في فنجان (اضغط مطوّل)'); p.onFire = true; noise(.3, 600, .12); stMsg('على النار… استنى الوش يطلع ومتسيبهاش تفور'); }
    ahwaPotVisual(); return;
  }
  if (name === 'barrad' || name === 'kettle') return stMsg('اضغط مطوّل عشان تصب');
  if (name === 'work'){ if (!v) return stMsg('هات كوباية أو فنجان'); if (v.kind === 'glass' && v.sugar > 0 && v.fill > .3){ v.stir = Math.min(1, v.stir + .3); clink(); ahwaVisual(); return stMsg(v.stir >= 1 ? 'السكر داب ✔️' : 'قلّب كمان… (أو اضغط مطوّل)'); } return; }
  if (name === 'tray') return stationBtn('toTray');
}
function ahwaHold(name, dt){
  const v = AH.vessel, p = AH.pot;
  if (name === 'barrad' || name === 'kettle'){
    if (!v || v.kind !== 'glass') { if (!ST.warned) stMsg('هات كوباية الأول'); ST.warned = true; return false; }
    if (v.spilled) return false;
    if (name === 'barrad' && v.herb){ if (!ST.warned) stMsg('دي للينسون/الحلبة… استخدم الغلاية'); ST.warned = true; return false; }
    if (name === 'kettle' && !v.herb){ if (!ST.warned) stMsg('الغلاية للينسون والحلبة… للشاي استخدم البراد'); ST.warned = true; return false; }
    v.drink = name === 'barrad' ? 'شاي' : v.herb; v.fill += dt * (SAVE.up.fastpour ? .55 : .38); v.hotT = 25;
    if (v.fill > DIFF.spill){ v.spilled = true; v.fill = DIFF.spill; stMsg('دلقت! ارمي الكوباية 🗑️', 'bad'); buzz(60); }
    AH.pouring = name; ahwaVisual(); return true;
  }
  if (name === 'kanaka'){
    if (!p.foam || p.onFire) return false;
    if (!v || v.kind !== 'cup'){ if (!ST.warned) stMsg('القهوة بتتصب في فنجان… هات فنجان'); ST.warned = true; return false; }
    if (v.fill >= 1) return false;
    v.drink = 'قهوة'; v.foam = true; v.sugar = p.sugar; v.fill += dt * .5; v.hotT = 25; AH.pouring = 'kanaka';
    if (v.fill >= .9){ v.fill = Math.min(v.fill, 1); Object.assign(p, { coffee:0, sugar:0, heat:0, foam:false }); ahwaPotVisual(); AH.pouring = null; stMsg('فنجان قهوة بوش ✔️ حطه على الصينية', 'ok'); }
    ahwaVisual(); return true;
  }
  if (name === 'work'){
    if (!v || v.kind !== 'glass' || v.fill < .3) return false;
    if (v.sugar === 0){ if (!ST.warned) stMsg('مفيش سكر تقلّبه'); ST.warned = true; return false; }
    v.stir = Math.min(1, v.stir + dt*.9); ST.stirring = true; ST.stirT = (ST.stirT||0) + dt; if (ST.stirT > .35){ ST.stirT = 0; tone(2800,2700,.05,'sine',.04); }
    ahwaVisual(); const P = SA.props.work.obj.userData.P; if (P && P.spoon) P.spoon.rotation.y = performance.now()/120;
    if (v.stir >= 1 && !ST.stirDone){ ST.stirDone = true; stMsg('السكر داب ✔️', 'ok'); }
    return true;
  }
  return false;
}
function ahwaRelease(){ AH.pouring = null; ST.stirring = false; ST.stirDone = false; ahwaVisual(); const v = AH.vessel; if (v && !v.spilled && v.fill > 0 && v.kind === 'glass' && (AH.lastPour)){ if (v.fill >= .78 && v.fill <= .98) stMsg('مظبوطة على الخط ✔️', 'ok'); else if (v.fill < .78) stMsg('لسه ناقصة شوية'); } }
function ahwaNext(){
  const v = AH.vessel, p = AH.pot, pend = pendingAhwa(), o = pend[0] && pend[0].o;
  if (p.ruined) return { btn: 'trash', text: 'القهوة فارت 😬 ارمي وابدأ من الأول' };
  if (p.onFire) return { prop: 'kanaka', text: p.heat > .72 ? 'الوش طلع! شيل الكنكة دلوقتي 🔥' : 'استنى الوش يطلع… متسيبهاش تفور' };
  if (v){
    if (v.spilled) return { btn: 'trash', text: 'الكوباية مدلوقة… ارميها' };
    const want = pend.find(x => v.kind === 'cup' ? x.o.drink === 'قهوة' : (v.herb ? x.o.drink === v.herb : x.o.drink === 'شاي')) || pend.find(x => x.o.drink !== 'قهوة');
    if (v.kind === 'cup'){
      if (v.fill < .85){ if (p.foam) return { prop: 'kanaka', text: 'اضغط مطوّل على الكنكة عشان تصب' }; if (p.coffee === 0) return { prop: 'coffee', text: 'حط بُن في الكنكة' }; return { prop: 'kanaka', text: 'حط الكنكة على النار' }; }
      return { btn: 'toTray', text: 'حط الفنجان على الصينية' };
    }
    if (!v.herb && v.fill === 0 && want && (want.o.drink === 'ينسون' || want.o.drink === 'حلبة')) return { prop: want.o.drink === 'ينسون' ? 'anise' : 'helba', text: `${want.o.drink}: حط معلقة في الكوباية` };
    if (v.fill < .78) return { prop: v.herb ? 'kettle' : 'barrad', text: 'اضغط مطوّل عشان تصب… وقف عند الخط الأخضر' };
    const need = want ? sugarSpoons(want.o.drink, want.o.sugar) : v.sugar;
    if (v.sugar < need) return { prop: 'sugar', text: `${want.o.drink} ${want.o.sugar}: ${need} معلقة سكر (${v.sugar}/${need})` };
    if (v.sugar > 0 && v.stir < 1) return { prop: 'work', text: 'قلّب السكر: اضغط مطوّل على الكوباية' };
    return { btn: 'toTray', text: 'حطها على الصينية' };
  }
  if ((modeObj.tray||[]).length >= trayCap()) return { btn: 'done', text: 'الصينية مليانة… روح وزّع' };
  if (!o) return (modeObj.tray||[]).length ? { btn: 'done', text: 'كده تمام… دوس خلاص ووزّع الطلبات' } : { text: 'مستني طلبات… الزباين جايين' };
  if (o.drink === 'قهوة'){
    const need = sugarSpoons('قهوة', o.sugar);
    if (p.foam) return { prop: 'cups', text: 'القهوة جاهزة… هات فنجان' };
    if (p.coffee === 0) return { prop: 'coffee', text: `قهوة ${o.sugar}: حط معلقة بُن في الكنكة` };
    if (p.sugar < need) return { prop: 'sugar', text: `حط ${need} معلقة سكر في الكنكة (${p.sugar}/${need})` };
    return { prop: 'kanaka', text: 'حط الكنكة على النار' };
  }
  return { prop: 'glasses', text: `${orderLabel(o)}: هات كوباية` };
}

// ----- foul & falafel cart -----
const FL = { fry: [], sF: [], sP: [], sand: null, bag: [] };
const SF = makeStation('foul');
const ballGeo = new THREE.IcosahedronGeometry(.026, 1);
{ const p = ballGeo.attributes.position; for (let i=0;i<p.count;i++){ _v.fromBufferAttribute(p,i); _v.multiplyScalar(1 + (Math.random()-.5)*.12); p.setXYZ(i,_v.x,_v.y,_v.z); } ballGeo.computeVertexNormals(); }
const friesGeo = (() => { const a = []; for (let i=0;i<14;i++){ const g = new THREE.BoxGeometry(.009,.009,.075); g.rotateY(Math.random()*Math.PI); g.rotateX((Math.random()-.5)*.4); g.translate((Math.random()-.5)*.08, .006 + Math.random()*.02, (Math.random()-.5)*.08); a.push(g); } return mergeGeometries(a); })();
{
  const S = SF;
  // big pot of foul
  const pot = new THREE.Group(); { const b = cylM(.17,.19,.24, SM.copper, 30, true); b.position.y = .12; const bt = cylM(.19,.19,.006, SM.copper, 30); bt.position.y = .003; const rim = new THREE.Mesh(new THREE.TorusGeometry(.17,.012,8,30), SM.brass); rim.rotation.x = Math.PI/2; rim.position.y = .24; const f = disc(.165, new THREE.MeshStandardMaterial({ map: foulTex, roughness: .35 }), .2); const lad = new THREE.Group(); const st = cylM(.007,.007,.36, SM.steel, 8); st.position.y = .18; const bw = new THREE.Mesh(new THREE.SphereGeometry(.045,14,8,0,Math.PI*2,Math.PI/2,Math.PI/2), SM.steel); lad.add(st, bw); lad.rotation.z = .35; lad.position.set(.09,.05,0); pot.add(b, bt, rim, f, lad); pot.userData = { lad }; }
  addProp(S, 'pot', '🥣 قِدرة الفول', pot, [.42,.3], [-.72,-.3], [-.42,-.62]);
  // frying pan with oil
  const pan = new THREE.Group(); { const b = cylM(.22,.18,.07, SM.dark, 32, true); b.position.y = .035; const bt = cylM(.18,.18,.006, SM.dark, 32); bt.position.y = .003; const oil = disc(.205, new THREE.MeshStandardMaterial({ color: 0xc99a2e, roughness: .05, metalness: .2, transparent: true, opacity: .9, emissive: 0x3a2a00, emissiveIntensity: .3 }), .05); const hd = new THREE.Mesh(new THREE.BoxGeometry(.2,.015,.03), SM.wood); hd.position.set(-.3,.06,0); const fl = new THREE.Mesh(new THREE.TorusGeometry(.12,.014,6,24), SM.flame); fl.rotation.x = Math.PI/2; fl.position.y = -.005; const items = new THREE.Group(); pan.add(b, bt, oil, hd, fl, items); pan.userData = { items, oil }; }
  addProp(S, 'pan', '🍳 طاسة الزيت', pan, [.48,.15], [-.12,-.32], [.06,-.62]);
  const mix = bowl(.13,.08); { const m = new THREE.Mesh(new THREE.SphereGeometry(.12,20,10,0,Math.PI*2,0,Math.PI/2), new THREE.MeshStandardMaterial({ map: mixTex, roughness: .9 })); m.scale.y = .35; m.position.y = .055; mix.add(m); }
  addProp(S, 'mix', '🟢 عجينة الفلافل', mix, [.3,.15], [.42,-.3], [.48,-.62]);
  const bread = new THREE.Group(); { const bm = [new THREE.MeshStandardMaterial({ color: 0xa8743a, roughness: .8 }), new THREE.MeshStandardMaterial({ map: breadTex, roughness: .85 }), new THREE.MeshStandardMaterial({ map: breadTex, roughness: .85 })]; for (let i=0;i<4;i++){ const d = new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.018,26), bm); d.position.set((Math.random()-.5)*.01, .01 + i*.019, (Math.random()-.5)*.01); bread.add(d); } }
  addProp(S, 'bread', '🍞 عيش', bread, [.3,.12], [-.74,.08], [-.42,-.24]);
  const tah = bowl(.08,.06); tah.add(disc(.075, SM.tahina, .045)); addProp(S, 'tahina', '⚪ طحينة', tah, [.22,.12], [-.45,.08], [0,-.24]);
  const sal = bowl(.09,.06); { const a = []; for (let i=0;i<40;i++){ const g = new THREE.BoxGeometry(.014,.014,.014); g.translate((Math.random()-.5)*.11, .045 + Math.random()*.02, (Math.random()-.5)*.11); a.push(colored(g, rpick(['#d1291d','#e03a2a','#4e8f2f','#6fae3a','#f4efe4']))); } const sm = new THREE.Mesh(mergeGeometries(a), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5 })); sal.add(sm); }
  addProp(S, 'salad', '🥗 سلطة', sal, [.24,.12], [-.17,.08], [.42,-.24]);
  const egg = bowl(.09,.06); for (let i=0;i<4;i++){ const e = new THREE.Mesh(new THREE.SphereGeometry(.022,12,10), SM.egg); e.scale.y = 1.3; e.position.set(Math.cos(i*1.6)*.035, .05, Math.sin(i*1.6)*.035); egg.add(e); }
  addProp(S, 'eggs', '🥚 بيض', egg, [.24,.12], [.11,.08], [-.42,.1]);
  const fr = new THREE.Group(); { const b = new THREE.Mesh(new THREE.BoxGeometry(.18,.06,.14), SM.dark); b.position.y = .03; const f = new THREE.Mesh(friesGeo, new THREE.MeshStandardMaterial({ color: 0xf1e2b0, roughness: .7 })); f.position.y = .06; fr.add(b, f); }
  addProp(S, 'fries', '🥔 بطاطس', fr, [.26,.12], [.4,.08], [0,.1]);
  const strainer = () => { const g = bowl(.1,.05, SM.dark); const it = new THREE.Group(); g.add(it); g.userData = { items: it }; return g; };
  addProp(S, 'sF', '🧆 فلافل جاهزة', strainer(), [.26,.12], [.74,.08], [.42,.1]);
  addProp(S, 'sP', '🍟 بطاطس جاهزة', strainer(), [.26,.12], [.74,.4], [.45,.46]);
  const board = new THREE.Group(); { const b = new THREE.Mesh(new THREE.BoxGeometry(.34,.02,.24), SM.wood); b.position.y = .01; const sg = new THREE.Group(); board.add(b, sg); board.userData = { sg }; }
  addProp(S, 'board', '🔪 اللوح', board, [.36,.15], [-.34,.4], [-.36,.46]);
  const bag = new THREE.Group(); { const b = new THREE.Mesh(new THREE.BoxGeometry(.16,.18,.1), SM.paper); b.position.y = .09; const it = new THREE.Group(); bag.add(b, it); bag.userData = { it }; }
  addProp(S, 'bag', '🛍️ الكيس', bag, [.24,.22], [.22,.4], [.08,.46]);
  layoutStation(S, false);
}
const BALL_COLS = [[0, new THREE.Color('#6d8a3e')], [6, new THREE.Color('#b9772a')], [10, new THREE.Color('#6b3a14')], [13, new THREE.Color('#2b1a0c')]];
function fryColor(t, type, out){ const tt = type === 'ball' ? t : t*.78; let a = BALL_COLS[0], b = BALL_COLS[BALL_COLS.length-1]; for (let i=0;i<BALL_COLS.length-1;i++) if (tt >= BALL_COLS[i][0] && tt <= BALL_COLS[i+1][0]){ a = BALL_COLS[i]; b = BALL_COLS[i+1]; break; } if (tt > b[0]) { out.copy(b[1]); return out; } const k = (tt - a[0]) / (b[0] - a[0] || 1); out.copy(a[1]).lerp(b[1], clamp(k,0,1)); if (type === 'fries'){ out.lerp(new THREE.Color('#f3e3b0'), tt < 6 ? .6 - tt*.08 : 0); } return out; }
const doneness = (t, type) => type === 'ball' ? (t < 5 ? 'raw' : t <= 10*DIFF.fry ? 'good' : 'burnt') : (t < 7 ? 'raw' : t <= 13*DIFF.fry ? 'good' : 'burnt');
function foulVisual(){
  const pan = SF.props.pan.obj.userData.items;
  // strainers
  const fill = (pr, arr) => { const it = SF.props[pr].obj.userData.items; while (it.children.length) it.remove(it.children[0]); arr.forEach((x,i) => { const m = new THREE.Mesh(x.type === 'ball' ? ballGeo : friesGeo, new THREE.MeshStandardMaterial({ color: fryColor(x.t, x.type, new THREE.Color()), roughness: .85 })); const a = i*2.1; m.position.set(Math.cos(a)*.035*(i%3), .035 + Math.floor(i/6)*.02, Math.sin(a)*.035*(i%3)); it.add(m); }); };
  fill('sF', FL.sF); fill('sP', FL.sP);
  // sandwich on the board
  const sg = SF.props.board.obj.userData.sg; while (sg.children.length) sg.remove(sg.children[0]);
  const s = FL.sand;
  if (s){
    const bm = [new THREE.MeshStandardMaterial({ color: 0xa8743a, roughness: .8 }), new THREE.MeshStandardMaterial({ map: breadTex, roughness: .85 }), new THREE.MeshStandardMaterial({ color: 0xe6d2a8, roughness: .9 })];
    const half = new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.016,26,1,false,0,Math.PI), bm); half.position.y = .03; half.rotation.y = Math.PI/2; sg.add(half);
    const inner = disc(.1, bm[2], .021); inner.scale.z = .55; inner.position.z = .02; sg.add(inner);
    const top = .04;
    if (s.base === 'فول'){ const f = new THREE.Mesh(new THREE.SphereGeometry(.06,16,8,0,Math.PI*2,0,Math.PI/2), new THREE.MeshStandardMaterial({ map: foulTex, roughness: .35 })); f.scale.set(1.3,.4,.7); f.position.set(0,top-.01,.02); sg.add(f); }
    if (s.base === 'فلافل') for (let i=0;i<3;i++){ const m = new THREE.Mesh(ballGeo, new THREE.MeshStandardMaterial({ color: fryColor(s.t||7, 'ball', new THREE.Color()), roughness: .85 })); m.position.set((i-1)*.05, top+.01, .02); sg.add(m); }
    if (s.base === 'بطاطس'){ const m = new THREE.Mesh(friesGeo, new THREE.MeshStandardMaterial({ color: fryColor(s.t||9, 'fries', new THREE.Color()), roughness: .8 })); m.position.set(0,top-.005,.02); m.scale.set(1.6,1,1); sg.add(m); }
    if (s.base === 'بيض') for (let i=0;i<4;i++){ const w = disc(.022, SM.egg, top+.002+i*.003); w.position.x = (i-1.5)*.04; w.position.z = .02; const y = disc(.011, SM.yolk, top+.006+i*.003); y.position.copy(w.position); y.position.y += .004; sg.add(w, y); }
    if (s.tahina) for (let i=0;i<3;i++){ const t = new THREE.Mesh(new THREE.TorusGeometry(.05,.004,6,20,Math.PI), SM.tahina); t.rotation.x = Math.PI/2; t.position.set((i-1)*.025, top+.025, .02); sg.add(t); }
    if (s.salad){ const a = []; for (let i=0;i<14;i++){ const g = new THREE.BoxGeometry(.012,.012,.012); g.translate((Math.random()-.5)*.13, top+.02, .02+(Math.random()-.5)*.04); a.push(colored(g, rpick(['#d1291d','#4e8f2f','#f4efe4']))); } sg.add(new THREE.Mesh(mergeGeometries(a), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5 }))); }
  }
  // wrapped sandwiches in the bag
  const it = SF.props.bag.obj.userData.it; while (it.children.length) it.remove(it.children[0]);
  FL.bag.forEach((b,i) => { const w = cylM(.032,.032,.17, SM.paper, 14); w.rotation.x = Math.PI/2; w.position.set(-.05 + (i%3)*.05, .2 + Math.floor(i/3)*.04, 0); it.add(w); });
  void pan;
}
function addFry(type){
  const items = SF.props.pan.obj.userData.items;
  const mesh = new THREE.Mesh(type === 'ball' ? ballGeo : friesGeo, new THREE.MeshStandardMaterial({ color: 0x6d8a3e, roughness: .85 }));
  const a = Math.random()*Math.PI*2, r = type === 'ball' ? .05 + Math.random()*.09 : .02; mesh.position.set(Math.cos(a)*r, .055, Math.sin(a)*r); items.add(mesh);
  FL.fry.push({ type, t: 0, mesh }); noise(.5, 5000, .25, 0, 'highpass'); buzz(12);
}
function foulTap(name){
  const s = FL.sand;
  const needBase = () => { if (!s) { stMsg('خد رغيف عيش الأول 🫓'); return false; } if (s.base){ stMsg('الرغيف فيه حشو خلاص'); return false; } return true; };
  if (name === 'mix'){ if (FL.fry.filter(f => f.type === 'ball').length >= 9) return stMsg('الطاسة مليانة'); addFry('ball'); return stMsg('قرص فلافل في الزيت… شيله لما يبقى دهبي'); }
  if (name === 'fries'){ if (FL.fry.some(f => f.type === 'fries')) return stMsg('فيه بطاطس في الزيت'); addFry('fries'); return stMsg('البطاطس في الزيت'); }
  if (name === 'pan'){
    if (!FL.fry.length) return stMsg('الطاسة فاضية');
    const items = SF.props.pan.obj.userData.items;
    FL.fry.forEach(f => { items.remove(f.mesh); (f.type === 'ball' ? FL.sF : FL.sP).push({ type: f.type, t: f.t }); });
    const q = FL.fry.map(f => doneness(f.t, f.type)); FL.fry = []; tone(500,300,.1,'triangle',.08); foulVisual();
    if (q.includes('burnt')) return stMsg('فيه حاجة اتحرقت! 😬', 'bad'); if (q.includes('raw')) return stMsg('فيه حاجة لسه نية…', 'bad'); return stMsg('دهبي ومظبوط 👌', 'ok');
  }
  if (name === 'bread'){ if (s) return stMsg('فيه رغيف على اللوح… كمّله أو ارميه'); FL.sand = { base: null, tahina: false, salad: false, q: 'good' }; tone(300,250,.08,'triangle',.08); foulVisual(); return stMsg('فتحت الرغيف ✔️'); }
  if (name === 'pot'){ if (!needBase()) return; s.base = 'فول'; const lad = SF.props.pot.obj.userData.lad; lad.rotation.z = -.4; setTimeout(() => lad.rotation.z = .35, 300); noise(.2, 400, .2); foulVisual(); return stMsg('غرفت فول ✔️'); }
  if (name === 'sF'){ if (!needBase()) return; if (FL.sF.length < 3) return stMsg('محتاج ٣ أقراص فلافل في المصفاية'); const take = FL.sF.splice(0,3); const qs = take.map(x => doneness(x.t, 'ball')); s.base = 'فلافل'; s.q = qs.includes('burnt') ? 'burnt' : qs.includes('raw') ? 'raw' : 'good'; s.t = take.reduce((a,x) => a + x.t, 0)/3; foulVisual(); return stMsg('٣ أقراص فلافل ✔️'); }
  if (name === 'sP'){ if (!needBase()) return; if (!FL.sP.length) return stMsg('مفيش بطاطس جاهزة'); const b = FL.sP.shift(); s.base = 'بطاطس'; s.q = doneness(b.t, 'fries'); s.t = b.t; foulVisual(); return stMsg('بطاطس ✔️'); }
  if (name === 'eggs'){ if (!needBase()) return; s.base = 'بيض'; foulVisual(); return stMsg('بيض مسلوق ✔️'); }
  if (name === 'tahina'){ if (!s || !s.base) return stMsg('حط الحشو الأول'); if (s.tahina) return stMsg('فيه طحينة خلاص'); s.tahina = true; noise(.25, 700, .1); foulVisual(); return stMsg('طحينة ✔️'); }
  if (name === 'salad'){ if (!s || !s.base) return stMsg('حط الحشو الأول'); if (s.salad) return stMsg('فيه سلطة خلاص'); s.salad = true; foulVisual(); return stMsg('سلطة ✔️'); }
  if (name === 'board') return stationBtn('wrap');
  if (name === 'bag') return stationBtn('serve');
}
function foulFront(){ const c = modeObj.queue && modeObj.queue[0]; return c && c.ready ? c : null; }
function foulMissing(c){ const need = c.order.map(sandKey); FL.bag.forEach(b => { const i = need.indexOf(sandKey(b)); if (i >= 0) need.splice(i,1); }); return need.map(k => { const [base,t,s] = k.split('|'); return { base, tahina: t === '1', salad: s === '1' }; }); }
function foulNext(){
  const c = foulFront();
  if (!c) return { text: 'مستني زبون… جهّز فلافل في الزيت من دلوقتي' };
  const miss = foulMissing(c);
  if (!miss.length && !FL.sand) return { btn: 'serve', text: 'الطلب كامل… سلّمه' };
  const s = FL.sand, want = miss[0];
  if (s){
    if (!s.base){
      if (!want) return { btn: 'trash', text: 'الطلب مش محتاج ده' };
      if (want.base === 'فول') return { prop: 'pot', text: 'اغرف فول من القِدرة' };
      if (want.base === 'بيض') return { prop: 'eggs', text: 'حط بيض' };
      if (want.base === 'فلافل'){ if (FL.sF.length >= 3) return { prop: 'sF', text: 'حط ٣ أقراص فلافل' }; if (FL.fry.some(f => f.type === 'ball')){ const ok = FL.fry.filter(f => f.type === 'ball' && f.t >= 5).length; return { prop: ok ? 'pan' : null, text: ok ? 'الفلافل بقت دهبي… شيلها (دوس على الطاسة)' : 'استنى الفلافل تحمر…' }; } return { prop: 'mix', text: 'اعمل ٣ أقراص فلافل وحطها في الزيت' }; }
      if (want.base === 'بطاطس'){ if (FL.sP.length) return { prop: 'sP', text: 'حط البطاطس' }; const f = FL.fry.find(f => f.type === 'fries'); if (f) return { prop: f.t >= 7 ? 'pan' : null, text: f.t >= 7 ? 'البطاطس استوت… شيلها' : 'استنى البطاطس تستوي…' }; return { prop: 'fries', text: 'نزّل البطاطس في الزيت' }; }
    }
    const tgt = miss.find(m => m.base === s.base) || want;
    if (tgt && tgt.tahina && !s.tahina) return { prop: 'tahina', text: 'زوّد طحينة' };
    if (tgt && tgt.salad && !s.salad) return { prop: 'salad', text: 'زوّد سلطة' };
    return { btn: 'wrap', text: 'لف الساندوتش' };
  }
  if (want && want.base === 'فلافل' && FL.sF.length < 3 && FL.fry.filter(f => f.type === 'ball').length + FL.sF.length < 3) return { prop: 'mix', text: 'ابدأ اقلي فلافل (٣ أقراص)' };
  return { prop: 'bread', text: `اللي جاي: ${sandLabel(want)} — خد رغيف` };
}
function serveFoul(){
  const m = modeObj, c = foulFront(); if (!c) return stMsg('مفيش زبون مستني');
  if (!FL.bag.length) return stMsg('الكيس فاضي');
  const miss = foulMissing(c); const need = c.order.map(sandKey); const extra = FL.bag.filter(b => { const i = need.indexOf(sandKey(b)); if (i >= 0){ need.splice(i,1); return false; } return true; });
  if (miss.length || extra.length){ say(c.n, miss.length ? `ناقص: ${miss.map(sandLabel).join('، ').replace(/[^؀-ۿ\s+،]/g,'')}` : 'ده مش طلبي!', 2.2, 'angry'); c.patience -= 6; buzz(40); return stMsg(miss.length ? 'الطلب ناقص' : 'فيه حاجة زيادة مش مطلوبة', 'bad'); }
  const bad = FL.bag.find(b => b.q !== 'good');
  const price = c.order.reduce((s,o) => s + sandPrice(o), 0); const tip = bad ? 0 : Math.round(4*clamp(c.patience/c.maxPat,0,1) + 1);
  m.served++; m.earned += price + tip; hero.money += price + tip; coin(); buzz(25); if (m.onServe) m.onServe('foul');
  FL.bag = []; foulVisual();
  if (bad) { say(c.n, bad.q === 'burnt' ? 'الفلافل محروقة يا معلم!' : 'ده لسه ني!', 2, 'angry'); stMsg(`+${price} جنيه (من غير بقشيش)`, 'bad'); }
  else stMsg(`+${price + tip} جنيه 👌`, 'ok');
  finishFoulCustomer(c, !bad);
}

// ----- station flow -----
const STATION_BTNS = {
  ahwa: [['toTray','✅ على الصينية'],['trash','🗑️ ارمي'],['done','🚶 خلاص']],
  foul: [['wrap','🌯 لف الساندوتش'],['serve','🤝 سلّم الطلب'],['trash','🗑️ ارمي']],
};
function stationBtn(id){
  if (ST.kind === 'ahwa'){
    const v = AH.vessel, p = AH.pot;
    if (id === 'toTray'){
      if (!v || v.fill < .5) return stMsg('الكوباية لسه فاضية');
      if (v.spilled) return stMsg('دي مدلوقة… ارميها', 'bad');
      if ((modeObj.tray||[]).length >= trayCap()) return stMsg('الصينية مليانة… روح وزّع الأول');
      const drink = v.drink; modeObj.tray.push({ drink, spoons: v.sugar, fill: v.fill, stirred: v.kind === 'cup' || v.sugar === 0 || v.stir >= 1, good: v.fill >= .72 && v.fill <= DIFF.spill });
      AH.vessel = null; clink(); buzz(15); ahwaVisual(); ahwaTrayVisual(); return stMsg(`${DRINK_ICON[drink]} ${drink} ${sugarLabel(drink, modeObj.tray[modeObj.tray.length-1].spoons)} على الصينية ✔️`, 'ok');
    }
    if (id === 'trash'){ if (v){ AH.vessel = null; ahwaVisual(); noise(.2, 800, .2); return stMsg('رميتها'); } if (p.ruined || p.coffee || p.sugar){ Object.assign(p, { coffee:0, sugar:0, heat:0, onFire:false, ruined:false, foam:false }); ahwaPotVisual(); return stMsg('نضّفت الكنكة'); } return stMsg('مفيش حاجة ترميها'); }
    if (id === 'done') return exitStation();
  }
  if (ST.kind === 'foul'){
    if (id === 'wrap'){ const s = FL.sand; if (!s) return stMsg('خد رغيف الأول'); if (!s.base) return stMsg('الرغيف فاضي'); FL.bag.push(s); FL.sand = null; noise(.25, 2500, .12); buzz(15); foulVisual(); return stMsg(`${sandLabel(s)} في الكيس ✔️`, 'ok'); }
    if (id === 'serve') return serveFoul();
    if (id === 'done') return endJob(false);
    if (id === 'trash'){ if (FL.sand){ FL.sand = null; foulVisual(); return stMsg('رميت الرغيف'); } if (FL.bag.length){ FL.bag = []; foulVisual(); return stMsg('فضّيت الكيس'); } if (FL.sF.length || FL.sP.length){ FL.sF = []; FL.sP = []; foulVisual(); return stMsg('فضّيت المصافي'); } return stMsg('مفيش حاجة ترميها'); }
  }
}
function enterStation(kind){
  ST.kind = kind; ST.hold = null; hero.locked = true; hero.d.root.visible = false; trayGroup.visible = false; $('tray').hidden = true;
  document.body.classList.add('in-station'); $('station').hidden = false;
  $('stBtns').innerHTML = (kind === 'foul' && modeObj.story ? [...STATION_BTNS.foul, ['done','🚶 خلّص']] : STATION_BTNS[kind]).map(([id,t]) => `<button data-b="${id}" id="stb_${id}">${t}</button>`).join('');
  $('stBtns').querySelectorAll('button').forEach(b => b.onclick = () => stationBtn(b.dataset.b));
  const S = STA[kind]; $('plabels').innerHTML = ''; ST.labels = Object.values(S.props).map(pr => { const el = document.createElement('div'); el.className = 'plabel'; el.textContent = pr.label; $('plabels').appendChild(el); return { el, pr }; });
  camera.fov = 50; camera.updateProjectionMatrix(); const aw = scene.getObjectByName('cafeAwning'); if (aw) aw.visible = kind !== 'ahwa'; const um = scene.getObjectByName('cartUmbrella'); if (um) um.visible = kind !== 'foul';
  if (kind === 'ahwa'){ ahwaVisual(); ahwaPotVisual(); ahwaTrayVisual(); }
  if (kind === 'foul') foulVisual();
  stMsg(kind === 'ahwa' ? 'دوس على الحاجات عشان تمسكها… واضغط مطوّل عشان تصب' : 'دوس على الحاجات… الحلقة الصفرا بتقولك الخطوة الجاية');
}
function exitStation(silent){
  if (!ST.kind) return;
  const k = ST.kind; ST.kind = null; ST.hold = null; streamMesh.visible = false; setLoop('pour', 0, 900, 'bandpass'); setLoop('sizzle', 0, 4000, 'highpass');
  STA[k].ring.visible = false; $('station').hidden = true; $('plabels').innerHTML = ''; ST.labels = []; document.body.classList.remove('in-station');
  hero.locked = false; hero.d.root.visible = true; camera.fov = 46; camera.updateProjectionMatrix(); const aw = scene.getObjectByName('cafeAwning'); if (aw) aw.visible = true; const um = scene.getObjectByName('cartUmbrella'); if (um) um.visible = true;
  if (k === 'ahwa' && STA.ahwa.narrow) layoutStation(STA.ahwa, false); if (k === 'foul' && STA.foul.narrow) layoutStation(STA.foul, false);
  if (k === 'ahwa'){ ahwaPotVisual(); refreshTray(); if (!silent && (modeObj.tray||[]).length) banner('وزّع الطلبات على الزباين ☕', 'info', 2); }
}
// fly a spoon from a jar to its target
const flySpoon = new THREE.Group(); { const h = new THREE.Mesh(new THREE.BoxGeometry(.006,.006,.12), SM.steel); const b = new THREE.Mesh(new THREE.SphereGeometry(.014,10,6), SM.steel); b.scale.y = .4; b.position.z = .065; flySpoon.add(h, b); flySpoon.visible = false; }
let spoonAnim = null;
function spoonFly(from, to){ const S = STA[ST.kind]; S.grp.add(flySpoon); flySpoon.visible = true; spoonAnim = { a: from.g.position.clone().add(new THREE.Vector3(0,.22,0)), b: to.g.position.clone().add(new THREE.Vector3(0,.2,0)), t: 0 }; }
// pointer handling inside stations
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
canvas.addEventListener('pointerdown', e => {
  if (!ST.kind || state !== 'play') return;
  const S = STA[ST.kind]; ndc.set(e.clientX/innerWidth*2-1, -(e.clientY/innerHeight)*2+1); raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(S.hits, false)[0]; if (!hit) return;
  ST.hold = { name: hit.object.userData.prop, t: 0, held: false, id: e.pointerId }; ST.warned = false;
  try { canvas.setPointerCapture(e.pointerId); } catch(err){}
});
const stUp = (e, cancel) => { const h = ST.hold; if (!h || e.pointerId !== h.id) return; ST.hold = null; streamMesh.visible = false; if (h.held){ AH.lastPour = true; if (ST.kind === 'ahwa') ahwaRelease(); } else if (!cancel){ if (ST.kind === 'ahwa') ahwaTap(h.name); else foulTap(h.name); } AH.lastPour = false; };
addEventListener('pointerup', e => stUp(e, false)); addEventListener('pointercancel', e => stUp(e, true));
function stationCamera(dt){
  const S = STA[ST.kind]; const asp = innerWidth/innerHeight; const narrow = asp < .95;
  if (S.narrow !== narrow){ layoutStation(S, narrow); if (ST.kind === 'ahwa') ahwaPotVisual(); }
  const vf = 50*Math.PI/180, hf = 2*Math.atan(Math.tan(vf/2)*asp);
  const W = narrow ? 1.34 : 1.9, Dd = narrow ? 1.45 : 1.5, pitch = narrow ? 1.12 : .98;
  const D = Math.max((W/2)/Math.tan(hf/2), (Dd/2)/Math.tan(vf/2)) * (narrow ? 1.0 : 1.02);
  const cp = new THREE.Vector3(0, Math.sin(pitch)*D, Math.cos(pitch)*D - (narrow ? .07 : 0)); S.grp.localToWorld(cp);
  const lp = new THREE.Vector3(0, 0, narrow ? -.02 : .16); S.grp.localToWorld(lp);
  camera.position.lerp(cp, damp(6, dt)); lookAt.lerp(lp, damp(8, dt));
}
const _sw = new THREE.Vector3(), _sw2 = new THREE.Vector3(), _fc = new THREE.Color();
function updateStation(dt, t){
  const S = STA[ST.kind];
  // hold logic
  let pouring = false;
  if (ST.hold){ ST.hold.t += dt; if (ST.hold.t > .16){ const ok = ST.kind === 'ahwa' ? ahwaHold(ST.hold.name, dt) : false; if (ok) ST.hold.held = true; pouring = ok && ST.kind === 'ahwa' && AH.pouring; } }
  // ahwa simulation
  if (ST.kind === 'ahwa'){
    const p = AH.pot;
    for (const nm of ['barrad','kettle','kanaka']){ const pr = S.props[nm]; const tilt = pr.obj.userData.tilt || pr.obj; const want = (pouring && AH.pouring === nm) ? (nm === 'kanaka' ? -.9 : -.75) : 0; if (nm === 'kanaka'){ pr.obj.rotation.z += ((pouring && AH.pouring === 'kanaka' ? -.8 : 0) - pr.obj.rotation.z) * damp(10, dt); } else tilt.rotation.z += (want - tilt.rotation.z) * damp(10, dt); }
    if (pouring && AH.vessel){
      const nm = AH.pouring, pr = S.props[nm];
      if (nm === 'kanaka') _sw.set(.11, .14, 0).applyEuler(pr.obj.rotation).multiplyScalar(1.25).add(pr.g.position); else _sw.copy(pr.obj.userData.spout).applyEuler(new THREE.Euler(0, pr.obj.rotation.y, pr.obj.userData.tilt.rotation.z)).add(pr.g.position);
      S.grp.localToWorld(_sw);
      _sw2.copy(S.props.work.g.position); _sw2.y += AH.vessel.kind === 'cup' ? .14 : .2; S.grp.localToWorld(_sw2);
      showStream(_sw, _sw2, { 'شاي': 0x7a2306, 'قهوة': 0x2a1508, 'ينسون': 0xbcae66, 'حلبة': 0xd4ad4f }[AH.vessel.drink] || 0xcfe6f0);
      setLoop('pour', .22, 900, 'bandpass');
      $('stMeter').hidden = false; $('stMeterLabel').textContent = AH.vessel.kind === 'cup' ? 'الفنجان' : 'الكوباية'; $('stMeterBar').style.width = (Math.min(AH.vessel.fill,1)*100) + '%'; $('stBand').style.left = '78%'; $('stBand').style.width = '20%';
    } else { streamMesh.visible = false; setLoop('pour', 0, 900, 'bandpass'); }
    if (p.onFire){
      p.heat += dt * .105 * DIFF.heat; ahwaPotVisual();
      const fl = S.props.stove.obj.userData.flame; fl.scale.setScalar(1 + Math.sin(t*30)*.08);
      if (p.heat > .45 && Math.random() < dt*6){ _sw.copy(S.props.kanaka.g.position); _sw.y += .2; S.grp.localToWorld(_sw); puff(_sw, .05); }
      if (p.heat > .8 && Math.random() < dt*8) tone(180 + Math.random()*80, 120, .05, 'sine', .03);
      if (p.heat >= 1.0){ p.onFire = false; p.ruined = true; p.foam = false; ahwaPotVisual(); noise(.6, 500, .3); buzz(80); stMsg('القهوة فارت! 😬 دوس ارمي', 'bad'); }
      $('stMeter').hidden = false; $('stMeterLabel').textContent = 'النار'; $('stMeterBar').style.width = (Math.min(p.heat,1)*100) + '%'; $('stBand').style.left = '72%'; $('stBand').style.width = '26%';
    } else if (!pouring) $('stMeter').hidden = true;
    const v = AH.vessel;
    if (v && v.hotT > 0 && v.fill > .3){ v.hotT -= dt; if (Math.random() < dt*3){ _sw.copy(S.props.work.g.position); _sw.y += v.kind === 'cup' ? .15 : .24; S.grp.localToWorld(_sw); puff(_sw, .05); } }
    if (Math.random() < dt*1.2){ _sw.copy(S.props.barrad.g.position); _sw.y += .26; S.grp.localToWorld(_sw); puff(_sw, .04); }
  }
  // foul simulation
  if (ST.kind === 'foul' || modeId === 'foul'){
    for (const f of FL.fry){ f.t += dt; fryColor(f.t, f.type, f.mesh.material.color); f.mesh.position.y = .052 + Math.sin(t*20 + f.t*3)*.003; }
    if (FL.fry.length && Math.random() < dt*FL.fry.length*2){ const f = rpick(FL.fry); _sw.copy(f.mesh.position); f.mesh.parent.localToWorld(_sw); _sw.y += .03; puff(_sw, .035); }
    setLoop('sizzle', ST.kind === 'foul' ? Math.min(.14, FL.fry.length*.025) : 0, 4000, 'highpass');
  }
  // spoon flight
  if (spoonAnim){ spoonAnim.t += dt/.35; const k = Math.min(1, spoonAnim.t); flySpoon.position.lerpVectors(spoonAnim.a, spoonAnim.b, k); flySpoon.position.y += Math.sin(k*Math.PI)*.12; flySpoon.rotation.x = -k*1.2; if (k >= 1){ spoonAnim = null; flySpoon.visible = false; } }
  // hint ring + labels + ticket
  const nx = ST.kind === 'ahwa' ? ahwaNext() : foulNext();
  if (nx.prop && S.props[nx.prop]){ S.ring.visible = true; S.ring.position.set(S.props[nx.prop].g.position.x, .04, S.props[nx.prop].g.position.z); const sc = 1 + Math.sin(t*6)*.12; S.ring.scale.set(sc, sc, sc); } else S.ring.visible = false;
  $('stBtns').querySelectorAll('button').forEach(b => b.classList.toggle('pulse', b.dataset.b === nx.btn));
  if (ST.msgT > 0){ ST.msgT -= dt; } else { $('stHint').textContent = nx.text; $('stHint').className = 'st-hint show'; }
  for (const L of ST.labels){ _sw.copy(L.pr.g.position); _sw.z += .14; S.grp.localToWorld(_sw); _sw.project(camera); L.el.style.left = ((_sw.x+1)/2*innerWidth) + 'px'; L.el.style.top = ((1-_sw.y)/2*innerHeight + 4) + 'px'; L.el.classList.toggle('hot', L.pr.name === nx.prop); }
  ST.tick = (ST.tick||0) - dt;
  if (ST.tick <= 0){ ST.tick = .25; renderTicket(); }
}
function renderTicket(){
  let html = '';
  if (ST.kind === 'ahwa'){
    const list = modeObj.patrons ? modeObj.patrons.filter(n => n.state === 'customer' && n.order).sort((a,b) => a.patience - b.patience) : [];
    html = '<b>الطلبات</b>' + (list.length ? list.slice(0,5).map(n => { const f = clamp(n.patience/n.maxPat,0,1); return `<div class="tk"><span>${orderLabel(n.order)} <small>🥄×${sugarSpoons(n.order.drink, n.order.sugar)}</small></span><i style="width:${f*100}%;background:${f<.3?'#e33':'#3aa84a'}"></i></div>`; }).join('') : '<div class="tk muted">مفيش طلبات دلوقتي</div>');
    const tr = modeObj.tray || []; html += `<div class="tk tr">الصينية (${tr.length}/${trayCap()}): ${tr.map(d => DRINK_ICON[d.drink]).join(' ') || '—'}</div>`;
  } else {
    const c = foulFront();
    if (c){ const f = clamp(c.patience/c.maxPat,0,1); const miss = foulMissing(c).map(sandKey); html = `<b>${c.n.name} عايز:</b>` + c.order.map(o => { const k = sandKey(o); const i = miss.indexOf(k); const done = i < 0; if (!done) miss.splice(i,1); return `<div class="tk ${done ? 'ok' : ''}">${done ? '✅' : '⬜'} ${sandLabel(o)}</div>`; }).join('') + `<div class="pat2"><i style="width:${f*100}%;background:${f<.3?'#e33':'#3aa84a'}"></i></div>`; }
    else html = '<b>مستني زبون…</b>';
    html += `<div class="tk tr">في الكيس: ${FL.bag.length} · في الطابور: ${Math.max(0,(modeObj.queue||[]).length - (c?1:0))}</div>`;
  }
  $('stTicket').innerHTML = html;
}

// ---- 20-story.js ----
// ================= story: طيارة الجامد =================
const STORY_KEY = 'ty_story_v1';
const newStory = () => ({ money: 20, rep: 0, step: 0, owned: { moto: false, car: false }, acc: {}, wear: {}, up: {}, cnt: {}, ended: false });
function loadStory(){ try { const s = JSON.parse(store.get(STORY_KEY) || 'null'); if (s && typeof s.step === 'number'){ const d = newStory(); return { ...d, ...s, owned: { ...d.owned, ...s.owned }, acc: s.acc || {}, wear: s.wear || {}, up: s.up || {}, cnt: s.cnt || {} }; } } catch(e){} return newStory(); }
let SAVE = loadStory();
function saveStory(){ if (modeId === 'story') SAVE.money = Math.max(0, Math.round(hero.money)); store.set(STORY_KEY, JSON.stringify(SAVE)); }
const trayCap = () => SAVE.up.tray4 ? 4 : 3;
const SHOP = { pos: new THREE.Vector3(7.7, .15, 30), name: 'محل الأناقة', items: [
  { id: 'glasses', kind: 'acc', name: '🕶️ نضارة شمس', price: 120 },
  { id: 'cap', kind: 'acc', name: '🧢 كاب', price: 90 },
  { id: 'chain', kind: 'acc', name: '📿 سلسلة دهب', price: 250 },
  { id: 'watch', kind: 'acc', name: '⌚ ساعة', price: 180 },
  { id: 'tray4', kind: 'up', name: '🍽️ صينية كبيرة (٤ طلبات)', price: 150 },
  { id: 'fastpour', kind: 'up', name: '⚡ براد أسرع في الصب', price: 100 },
] };
const PRICE = { moto: 300, car: 1500 };
// shop sign + markers
{
  const tex = makeTex(512,160,(g,w,h)=>{ g.fillStyle='#2a1b3d'; g.fillRect(0,0,w,h); g.strokeStyle='#f0c24a'; g.lineWidth=8; g.strokeRect(6,6,w-12,h-12); arText(g,'محل الأناقة',w/2,62,64,'#ffe08a'); arText(g,'نضارات · ساعات · سلاسل',w/2,122,30,'#e9dcff',700); });
  const sg = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,2.4,8), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: .6 })); pole.position.y = 1.2; const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2,.7), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .25, side: THREE.DoubleSide })); board.position.y = 2.5; sg.add(pole, board); sg.position.copy(SHOP.pos); sg.position.x -= .6; scene.add(sg);
}
const priceTag = (txt) => { const t = makeTex(256,96,(g,w,h)=>{ g.fillStyle='#fff3c4'; g.fillRect(0,0,w,h); g.strokeStyle='#b4431f'; g.lineWidth=6; g.strokeRect(3,3,w-6,h-6); arText(g,txt,w/2,h/2+3,38,'#7a1f0e'); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true })); s.scale.set(1.7,.64,1); scene.add(s); return s; };
const motoTag = priceTag('للبيع ٣٠٠ جنيه'), carTag = priceTag('للبيع ١٥٠٠ جنيه');
const missionMark = new THREE.Group(); { const b = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffc94a, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); b.scale.set(1.3,1.4,1.3); const r = new THREE.Mesh(new THREE.RingGeometry(1.1,1.4,40), new THREE.MeshBasicMaterial({ color: 0xffc94a, transparent: true, opacity: .7, depthWrite: false, side: THREE.DoubleSide })); r.rotation.x = -Math.PI/2; r.position.y = .25; missionMark.add(b, r); missionMark.visible = false; scene.add(missionMark); }
const race = { active: false, t: 0, goal: new THREE.Vector3(-48, 0, -96) };
const ENEMY_WAIT = new THREE.Vector3(28, .15, 40.2);
// accessories drawn on top of the hero photo
const ACC = {};
{
  const d = hero.d, S = d.S, c = d.c;
  const plane = (tex, cx, cy, w, h, key, order=13) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w*S, h*S), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .05, side: THREE.DoubleSide, toneMapped: false })); m.renderOrder = order; const piv = key ? c.piv[key] : [c.FX, c.FY]; m.position.set((cx - piv[0])*S, (piv[1] - cy)*S, .035); (key ? d.P[key] : d.P.body).add(m); m.visible = false; return m; };
  const tx = (w,h,draw) => { const t = makeTex(w,h,draw); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };
  ACC.glasses = plane(tx(256,90,(g,w,h)=>{ const lens = x => { const gr = g.createLinearGradient(x,10,x+20,80); gr.addColorStop(0,'#3a4a5a'); gr.addColorStop(1,'#05070a'); g.fillStyle = gr; g.beginPath(); g.roundRect(x,14,100,62,26); g.fill(); g.strokeStyle='#111'; g.lineWidth=7; g.stroke(); g.fillStyle='rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(x+30,32,18,7,-.4,0,7); g.fill(); }; lens(8); lens(148); g.strokeStyle='#111'; g.lineWidth=8; g.beginPath(); g.moveTo(108,34); g.quadraticCurveTo(128,22,148,34); g.stroke(); }), 512, 136, 168, 58);
  ACC.cap = plane(tx(256,160,(g,w,h)=>{ g.fillStyle='#c0392b'; g.beginPath(); g.ellipse(128,112,108,98,0,Math.PI,0); g.fill(); g.fillStyle='#a93226'; g.beginPath(); g.ellipse(128,118,124,20,0,0,Math.PI*2); g.fill(); g.strokeStyle='rgba(0,0,0,.25)'; g.lineWidth=3; g.beginPath(); g.moveTo(128,14); g.lineTo(128,110); g.stroke(); g.fillStyle='#fff'; g.font='900 46px Georgia'; g.textAlign='center'; g.fillText('T',128,92); }), 507, 52, 200, 124);
  ACC.chain = plane(tx(256,128,(g,w,h)=>{ g.strokeStyle='#e3b23c'; g.lineWidth=7; g.setLineDash([9,5]); g.beginPath(); g.moveTo(14,12); g.quadraticCurveTo(128,150,242,12); g.stroke(); g.setLineDash([]); g.fillStyle='#f6c945'; g.beginPath(); g.arc(128,92,15,0,7); g.fill(); g.strokeStyle='#a87a12'; g.lineWidth=3; g.stroke(); }), 512, 282, 128, 64);
  ACC.watch = plane(tx(64,64,(g)=>{ g.fillStyle='#1a1a1a'; g.fillRect(18,0,28,64); g.fillStyle='#d4a62a'; g.beginPath(); g.arc(32,32,18,0,7); g.fill(); g.fillStyle='#fffbe8'; g.beginPath(); g.arc(32,32,13,0,7); g.fill(); g.strokeStyle='#222'; g.lineWidth=2; g.beginPath(); g.moveTo(32,32); g.lineTo(32,22); g.moveTo(32,32); g.lineTo(39,35); g.stroke(); }), 122, 782, 46, 46, 'armL');
}
function applyAccessories(){ for (const k of Object.keys(ACC)) ACC[k].visible = !!(SAVE.acc[k] && SAVE.wear[k] !== false); }
applyAccessories();
// shop overlay
function openShop(){
  hero.locked = true; $('shop').hidden = false; renderShop();
}
function renderShop(){
  $('shopTitle').textContent = SHOP.name; $('shopMoney').textContent = `معاك ${egp(hero.money)}`;
  $('shopItems').innerHTML = SHOP.items.map(it => {
    const own = it.kind === 'acc' ? SAVE.acc[it.id] : SAVE.up[it.id];
    const wear = own && it.kind === 'acc' && SAVE.wear[it.id] !== false;
    const btn = !own ? `<button data-buy="${it.id}" ${hero.money < it.price ? 'class="poor"' : ''}>اشتري · ${it.price} ج</button>` : it.kind === 'acc' ? `<button data-wear="${it.id}">${wear ? 'اقلعها' : 'البسها'}</button>` : '<span class="owned">✓ عندك</span>';
    return `<div class="sitem"><span>${it.name}</span>${btn}</div>`;
  }).join('');
  $('shopItems').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const it = SHOP.items.find(i => i.id === b.dataset.buy); if (hero.money < it.price){ $('shopMoney').textContent = `محتاج ${egp(it.price - hero.money)} كمان`; buzz(40); return; } hero.money -= it.price; (it.kind === 'acc' ? SAVE.acc : SAVE.up)[it.id] = true; if (it.kind === 'acc') SAVE.wear[it.id] = true; coin(); buzz(20); applyAccessories(); saveStory(); renderShop(); });
  $('shopItems').querySelectorAll('[data-wear]').forEach(b => b.onclick = () => { const id = b.dataset.wear; SAVE.wear[id] = SAVE.wear[id] === false; applyAccessories(); saveStory(); renderShop(); });
}
$('shopClose').onclick = () => { $('shop').hidden = true; hero.locked = false; };
function buyVehicle(kind){
  const p = PRICE[kind]; if (hero.money < p){ banner(`محتاج ${egp(p - hero.money)} كمان… اشتغل في القهوة أو الفول`, 'bad', 2.5); buzz(40); return; }
  hero.money -= p; SAVE.owned[kind] = true; saveStory(); coin(); buzz(30);
  banner(kind === 'moto' ? '🏍️ الموتوسيكل بقى بتاعك!' : '🚗 العربية بقت بتاعتك!', 'ok', 3);
}
// missions
const MISSIONS = [
  { title: 'أول يوم شغل', text: s => `روح قهوة قصر الملوك (☕) واشتغل وردية: وصّل ٥ طلبات. (${Math.min(s.cnt.ahwa||0,5)}/٥)`, target: () => SPOT.counter, done: s => (s.cnt.ahwa||0) >= 5, reward: 40, onStart: s => { s.cnt.ahwa = 0; } },
  { title: 'عم سيد عايزك', text: () => 'اقعد على ترابيزة الدومنو واكسب ماتش مع عم سيد. الرهان ٢٠ جنيه.', target: () => SPOT.domino, done: s => (s.cnt.dom||0) >= 1, reward: 30, onStart: s => { s.cnt.dom = 0; } },
  { title: 'الموتوسيكل', text: () => `الموتوسيكل الأحمر للبيع بـ ٣٠٠ جنيه قدام القهوة. اشتغل في القهوة أو على عربية الفول لحد ما تحوّش. (${egp(hero.money)} / ٣٠٠)`, target: () => heroMoto.pos, done: s => s.owned.moto, reward: 0 },
  { title: 'سباق', text: () => race.active ? `سوق على العلامة الصفرا! فاضل ${Math.ceil(race.t)} ثانية` : 'اللي بيكرهك واقف جنب الموتوسيكلات وعايز سباق. اركب الموتوسيكل وروحله (E).', target: () => race.active ? race.goal : enemy.pos, done: s => (s.cnt.race||0) >= 1, reward: 80, onStart: s => { s.cnt.race = 0; enemyWait(); } },
  { title: 'رد الاعتبار', text: () => 'اللي بيكرهك بيقول عليك خسيس في الحتة… وقّعه في خناقة.', target: () => enemy.pos, done: s => (s.cnt.edown||0) >= 1, reward: 60, onStart: s => { s.cnt.edown = 0; enemyFree(); } },
  { title: 'المطلوب في الحتة', text: () => 'المطلوب اتشاف في الحتة والمكافأة ١٠٠٠ جنيه! دوّر عليه (النقطة الحمرا) وامسكه.', target: () => wanted.pos, done: s => (s.cnt.arrest||0) >= 1, reward: 1000, onStart: s => { s.cnt.arrest = 0; spawnWanted(); } },
  { title: 'العربية', text: () => `العربية الصفرا للبيع بـ ١٥٠٠ جنيه قدام القهوة. (${egp(hero.money)} / ١٥٠٠)`, target: () => heroCar.pos, done: s => s.owned.car, reward: 0 },
  { title: 'الأستايل', text: s => `روح محل الأناقة واشتري نضارة وسلسلة دهب. (${(s.acc.glasses?1:0)+(s.acc.chain?1:0)}/٢)`, target: () => SHOP.pos, done: s => s.acc.glasses && s.acc.chain, reward: 0 },
  { title: 'المواجهة الأخيرة', text: s => `اللي بيكرهك جاي ومعاه كلام كبير. وقّعه مرتين. (${Math.min(s.cnt.fdown||0,2)}/٢)`, target: () => enemy.pos, done: s => (s.cnt.fdown||0) >= 2, reward: 300, onStart: s => { s.cnt.fdown = 0; enemyBoss(true); } },
];
function curMission(){ return MISSIONS[SAVE.step] || null; }
function enemyWait(){ enemy.active = true; enemy.d.root.visible = true; enemy.state = 'wait'; enemy.pos.copy(ENEMY_WAIT); enemy.d.downT = 0; }
function enemyFree(){ if (enemy.state === 'wait') enemy.state = 'roam'; enemy.cd = 3; }
function enemyBoss(on){ enemy.boss = on; enemy.maxHp = on ? 160 : 100; enemy.hp = enemy.maxHp; if (on){ enemy.state = 'roam'; enemy.cd = 2; banner('⚠️ المواجهة الأخيرة!', 'bad', 3); } }
function completeMission(){
  const M = curMission(); if (!M) return;
  if (M.reward){ hero.money += M.reward; }
  SAVE.rep += 10; SAVE.step++; coin(); buzz(40);
  banner(`✅ ${M.title}${M.reward ? ' · +' + M.reward + ' جنيه' : ''}`, 'ok', 3.5);
  const N = curMission();
  if (N){ N.onStart && N.onStart(SAVE); setTimeout(() => { if (modeId === 'story' && state === 'play') banner(`📱 مهمة جديدة: ${N.title}`, 'info', 3); }, 3600); }
  else { enemyBoss(false); enemy.cd = 9999; enemy.state = 'roam'; SAVE.ended = true; setTimeout(showStoryEnd, 1500); }
  saveStory();
}
function showStoryEnd(){ if (modeId !== 'story') return; hero.locked = true; $('storyEnd').hidden = false; tone(523,523,.15,'triangle',.2); tone(659,659,.15,'triangle',.2,.15); tone(784,1046,.5,'triangle',.22,.3); }
$('storyEndBtn').onclick = () => { $('storyEnd').hidden = true; hero.locked = false; };
// jobs inside the story
function startJob(kind){
  const m = modeObj; m.job = kind; m.served = 0; m.angry = 0; m.earned = 0; m.combo = 0; m.lastServe = -99;
  if (kind === 'ahwa'){ m.time = 150; m.tray = []; m.spawnT = .5; m.seatsTaken = new Set(); m.patrons.forEach(n => { n.state = 'hidden'; n.g.visible = false; n.leaving = false; n.seat = undefined; n.order = null; }); resetAhwaStation(); refreshTray(); banner('☕ الوردية بدأت! (دقيقتين ونص)', 'info', 2.5); }
  if (kind === 'foul'){ m.time = 150; m.queue = []; m.spawnT = 1; m.pool.forEach(n => { n.state = 'hidden'; n.g.visible = false; }); FL.fry.forEach(f => f.mesh.parent && f.mesh.parent.remove(f.mesh)); Object.assign(FL, { fry: [], sF: [], sP: [], sand: null, bag: [] }); foulVisual(); hero.pos.copy(SPOT.cartHero); hero.pos.y = .15; enterStation('foul'); }
}
function endJob(fail){
  const m = modeObj; const kind = m.job; if (!kind) return;
  m.job = null; m.time = undefined; exitStation(true);
  if (kind === 'ahwa'){ m.patrons.forEach(n => { if (n.bubble){ removeBubble(n.bubble); n.bubble = null; } if (n.glass){ scene.remove(n.glass); n.glass = null; } if (n.state !== 'hidden'){ n.order = null; leaveSeat(n); } }); m.tray = []; refreshTray(); }
  if (kind === 'foul'){ (m.queue||[]).forEach(c => { c.n.state = 'goto'; c.n.tx = SPOT.cart.x + 10; c.n.tz = SPOT.cart.z + 8; c.n.onArrive = n2 => { n2.state = 'hidden'; n2.g.visible = false; }; }); m.queue = []; hero.pos.set(SPOT.cart.x, .15, SPOT.cart.z + 2); }
  banner(fail ? `المعلم مشّاك من الشغل 😬 · كسبت ${egp(m.earned)}` : `خلصت الشغل 👏 · كسبت ${egp(m.earned)}`, fail ? 'bad' : 'ok', 3.5);
  saveStory();
}
function storyAction(){
  const p = hero.pos, m = modeObj;
  if (p.distanceTo(SHOP.pos) < 2.6) return { text: 'ادخل محل الأناقة', fn: openShop };
  for (const [v, kind] of [[heroMoto,'moto'],[heroCar,'car']]) if (!SAVE.owned[kind] && Math.hypot(v.pos.x-p.x, v.pos.z-p.z) < 3.2) return { text: `اشتري ${kind === 'moto' ? 'الموتوسيكل' : 'العربية'} (${PRICE[kind]} جنيه)`, fn: () => buyVehicle(kind) };
  if (enemy.state === 'wait' && p.distanceTo(enemy.pos) < 3) return { text: 'اركب الموتوسيكل الأول عشان السباق', fn: () => say(enemy, 'هتسابق برجليك؟ هاهاها', 2, 'angry') };
  if (m.job === 'ahwa'){
    if (p.distanceTo(SPOT.counter) < 2.6) return { text: 'ادخل النَصبة وحضّر الطلبات', fn: () => enterStation('ahwa') };
    const c = m.patrons.find(n => n.state === 'customer' && n.order && Math.hypot(n.g.position.x-p.x, n.g.position.z-p.z) < 2);
    if (c) return { text: `قدّم ${c.order.drink} ${c.order.sugar} لـ ${c.name}`, fn: () => serveAhwa(c) };
    return null;
  }
  if (m.job === 'foul' && Math.hypot(p.x-SPOT.cart.x, p.z-SPOT.cart.z) < 2.8) return { text: 'ارجع لعربية الفول', fn: () => enterStation('foul') };
  if (!m.job){
    if (p.distanceTo(SPOT.counter) < 2.6) return { text: 'اشتغل وردية قهوجي ☕', fn: () => startJob('ahwa') };
    if (Math.hypot(p.x-SPOT.cart.x, p.z-SPOT.cart.z) < 2.8) return { text: 'اشتغل على عربية الفول 🧆', fn: () => startJob('foul') };
  }
  return null;
}
function storyVehAction(){
  const M = curMission();
  if (M && M.title === 'سباق' && !race.active && hero.veh && hero.veh.pos.distanceTo(enemy.pos) < 9) return { text: '🏁 ابدأ السباق', fn: startRace };
  return null;
}
function startRace(){ race.active = true; race.t = 40*DIFF.race; say(enemy, 'هتاكل تراب!', 2.5, 'angry'); banner('🏁 يلا! وصل للعلامة الصفرا قبل ما الوقت يخلص', 'info', 3); tone(440,440,.15,'square',.08); tone(440,440,.15,'square',.08,.5); tone(880,880,.3,'square',.1,1); }
function updateStory(dt){
  const m = modeObj;
  motoTag.visible = !SAVE.owned.moto; carTag.visible = !SAVE.owned.car;
  motoTag.position.set(heroMoto.pos.x, 2.1, heroMoto.pos.z); carTag.position.set(heroCar.pos.x, 2.6, heroCar.pos.z);
  if (race.active){
    race.t -= dt;
    const f = hero.veh ? hero.veh.pos : hero.pos;
    if (Math.hypot(f.x - race.goal.x, f.z - race.goal.z) < 8){ race.active = false; SAVE.cnt.race = 1; banner('🏆 سبقته!', 'ok', 3); enemyFree(); enemy.pos.copy(randomSidewalkPoint(10, race.goal)); say(enemy, 'ماشي… المرة الجاية', 2.5, 'angry'); }
    else if (race.t <= 0){ race.active = false; banner('⏱️ خسرت السباق… ارجعله وجرّب تاني', 'bad', 3); enemyWait(); }
  }
  const M = curMission();
  if (M && !m.job && M.done(SAVE)) completeMission();
  // mission marker
  const tgt = M && M.target ? M.target() : null;
  missionMark.visible = !!tgt && !ST.kind && !(M.title === 'المطلوب في الحتة' && wanted.caught);
  if (tgt){ missionMark.position.set(tgt.x, 0, tgt.z); missionMark.children[1].rotation.z += dt; missionMark.scale.setScalar(race.active ? 2.2 : 1); }
  m.saveT = (m.saveT || 0) - dt; if (m.saveT <= 0){ m.saveT = 5; saveStory(); }
}
function storyHudTitle(){ const m = modeObj; if (m.job === 'ahwa') return 'وردية قهوجي ☕'; if (m.job === 'foul') return 'شغل الفول 🧆'; const M = curMission(); return M ? `📱 ${M.title}` : 'طيارة الجامد 👑'; }
function storyHud(){
  const m = modeObj, M = curMission();
  if (m.job) return `الوقت: <b style="display:inline;color:#fff">${fmtTime(m.time||0)}</b> · بعت: ${m.served} · زعلانين: <b style="display:inline;color:#ff9a9a">${m.angry}/٣</b><br>كسبت: ${egp(m.earned)}${m.job === 'ahwa' ? '<br>روح النَصبة (E) ووزّع على الزباين.' : ''}`;
  if (!M) return 'خلصت القصة! لف في الحتة براحتك واشتغل والعب دومنو.';
  return M.text(SAVE) + `<br><small style="color:#c2b7a3">السمعة: ${SAVE.rep} ⭐</small>`;
}

function resetWorld(){
  clearBubbles();
  vehicles.forEach(v => { v.pos.set(v.home.x, v.home.y||0, v.home.z); v.yaw = v.home.yaw; v.mesh.rotation.set(0, v.yaw, 0); v.speed = 0; v.dmg = 0; v.broke = false; });
  seatIslam(false); thiefReset();
  motoTag.visible = carTag.visible = false; missionMark.visible = false; race.active = false; enemy.boss = false; enemy.maxHp = 100; $('shop').hidden = true; $('storyEnd').hidden = true;
  npcs.forEach(n => { n.state = 'hidden'; n.g.visible = false; n.role = null; n.onArrive = null; });
  let i = 0;
  for (; i<WALKERS; i++) setWalker(npcs[i]);
  enemy.active = false; enemy.d.root.visible = false; wanted.active = false; wanted.d.root.visible = false;
  chaser.active = false; chaserCar.visible = false; chaserLight.intensity = 0; if (sirenGain) sirenGain.gain.value = 0;
  cash.forEach(c => { c.g.visible = false; c.taken = false; });
  copCar.mesh.userData.red.emissiveIntensity = .3; copCar.mesh.userData.blue.emissiveIntensity = .3;
  hero.veh = null; hero.locked = false; hero.hp = 100; hero.stamina = 1; hero.tired = false; hero.inv = 0; hero.knock.set(0,0,0); hero.vel.set(0,0,0);
  hero.d.root.visible = true; hero.d.doll.visible = true; hero.d.blob.visible = true; hero.d.P.legL.visible = hero.d.P.legR.visible = true; hero.d.downT = 0;
  trayGroup.visible = false; $('tray').hidden = true; exitStation(true);
  decoGlasses.forEach(g => g.visible = true);
  return i;
}
function seatDeco(start){
  // domino friends + café regulars (decor in free modes)
  const a = npcs[start], b = npcs[start+1];
  seatNPC(a, SPOT.domino.x-.85, SPOT.domino.z, Math.PI/2); a.state = 'domino'; a.name = 'عم سيد';
  seatNPC(b, SPOT.domino.x+.85, SPOT.domino.z, -Math.PI/2); b.state = 'hidden'; b.g.visible = false; seatIslam(true);
  let k = start+2; [0,3,5,8,10].forEach(si => { const s = SEATS[si]; seatNPC(npcs[k], s.x, s.z, s.ry); k++; });
  const v = npcs[k]; seatNPC(v, SPOT.cartHero.x, SPOT.cartHero.z, 0); v.state = 'idle'; v.g.position.y = .15; k++;
  return k;
}

function startMode(id){
  initAudio(); if (isTouch && !document.fullscreenElement) goFull();
  heroName = $('nameIn').value.trim() || 'طيارة'; store.set('ty_name', heroName); $('hudName').textContent = heroName;
  modeId = id; runTime = 0; state = 'play';
  $('menu').hidden = true; $('end').hidden = true; $('domino').hidden = true; $('hud').hidden = false;
  const free = resetWorld();
  hero.money = id === 'story' ? SAVE.money : id === 'free' || id === 'domino' ? Math.max(hero.money, 50) : 0;
  const M_ = {
    free: () => { const k = seatDeco(free); void k; spawnEnemy(); hero.pos.copy(SPOT.spawn);
      return { vehicles: true, cafe: true, enemyOn: true, title: 'حر في الحتة',
        hud: () => `اركب الموتوسيكل أو العربية اللي جنب القهوة.<br>${enemy.d.downT > 0 ? 'وقّعته 💪' : enemy.state === 'chase' ? '<b style="color:#ff7a7a;display:inline">اللي بيكرهك جاي عليك!</b>' : 'خلي بالك… فيه واحد بيكرهك في الحتة.'}<br>اشرب شاي أو كُل فلافل عشان صحتك.` }; },
    domino: () => { const r = M_.free(); hero.pos.set(SPOT.domino.x, .15, SPOT.domino.z + 1.6); setTimeout(openDomino, 200); return r; },
    police: () => { seatDeco(free); hero.pos.copy(SPOT.policeSpawn); spawnWanted();
      return { vehicles: true, cafe: false, title: 'ظابط مباحث 🚓', time: 240,
        hud: () => { const d = wanted.pos.distanceTo(hero.veh ? hero.veh.pos : hero.pos); return `اقبض على المطلوب (النقطة الحمرا على الخريطة).<br>المسافة: <b style="display:inline;color:#fff">${Math.round(d)} م</b> · الوقت: <b style="display:inline;color:#fff">${fmtTime(modeObj.time)}</b><br>اخبطه بالبوكس أو اقرب منه واضربه.`; },
        onArrest: () => { const t = 240 - modeObj.time; const best = parseFloat(store.get('ty_best_police')||'0'); let bt=''; if (!best || t < best){ store.set('ty_best_police', String(t)); bt = 'رقم قياسي جديد! 🏆'; } else bt = `أحسن وقت: ${fmtTime(best)}`; coin(); setTimeout(() => endMode('قبضت على المطلوب! 🚔', `الظابط ${heroName} قبض عليه في ${fmtTime(t)}.`, bt), 1200); },
        onTime: () => endMode('المطلوب هرب 😤', 'الوقت خلص قبل ما تقبض عليه. جرّب تاني وخد البوكس على طول.') }; },
    cash: () => { hero.pos.copy(SPOT.spawn); cash.forEach(c => { c.g.visible = true; c.g.scale.setScalar(1); c.g.position.y = 0; });
      return { vehicles: false, cafe: false, title: 'فلوس الشارع 💵', got: 0, money: 0,
        hud: () => `لميت ${modeObj.got} من ١٥ رزمة (${egp(modeObj.money)}).<br>${chaser.active ? '<b style="color:#ff7a7a;display:inline">البوليس وراك!</b>' : 'دوّر على النور الأصفر.'}`,
        onKO: () => endMode('العربيات بهدلتك 🚗', `${heroName} لم ${egp(modeObj.money)} قبل ما يقع.`) }; },
    story: () => {
      hero.money = SAVE.money; const a = npcs[free], b = npcs[free+1];
      seatNPC(a, SPOT.domino.x-.85, SPOT.domino.z, Math.PI/2); a.state = 'domino'; a.name = 'عم سيد';
      seatNPC(b, SPOT.domino.x+.85, SPOT.domino.z, -Math.PI/2); b.state = 'hidden'; b.g.visible = false; seatIslam(true);
      decoGlasses.forEach(g => g.visible = false);
      spawnEnemy(); enemyBoss(false); hero.pos.copy(SPOT.spawn); race.active = false;
      const M = curMission();
      if (!SAVE.started){ SAVE.started = true; if (M && M.onStart) M.onStart(SAVE); }
      if (M && M.title === 'سباق') enemyWait();
      if (M && M.title === 'المطلوب في الحتة') spawnWanted();
      if (M && M.title === 'المواجهة الأخيرة') enemyBoss(true);
      if (SAVE.ended) enemy.cd = 9999;
      const patrons = npcs.slice(free+2, free+14), pool = npcs.slice(free+14, free+20);
      return { vehicles: true, cafe: true, story: true, title: 'القصة', job: null, patrons, pool, tray: [], seatsTaken: new Set(), queue: [], served: 0, angry: 0, earned: 0, spawnT: 1, domBet: 20,
        canDrive: v => (v === heroMoto && SAVE.owned.moto) || (v === heroCar && SAVE.owned.car),
        hud: storyHud, hudTitle: storyHudTitle, action: storyAction, vehAction: storyVehAction,
        onServe: kind => { SAVE.cnt[kind] = (SAVE.cnt[kind]||0) + 1; },
        onDomino: w => { const bet = Math.min(modeObj.domBet, Math.max(0, Math.floor(hero.money))); if (w){ hero.money += bet; SAVE.cnt.dom = (SAVE.cnt.dom||0) + 1; } else hero.money -= bet; saveStory(); return bet; },
        onEnemyDown: () => { SAVE.cnt.edown = (SAVE.cnt.edown||0) + 1; if (enemy.boss) SAVE.cnt.fdown = (SAVE.cnt.fdown||0) + 1; saveStory(); },
        onArrest: () => { SAVE.cnt.arrest = 1; coin(); setTimeout(() => { wanted.active = false; wanted.d.root.visible = false; }, 3500); },
        onTime: () => endJob(false), onFail: () => endJob(true) };
    },
    ahwa: () => { hero.pos.set(SPOT.counter.x, .15, SPOT.counter.z + 1.5); decoGlasses.forEach(g => g.visible = false);
      const patrons = npcs.slice(free, free+12); patrons.forEach(n => { n.leaving = false; n.seat = undefined; });
      return { vehicles: false, cafe: false, title: 'قهوجي في قصر الملوك ☕', time: 240, tray: [], served: 0, angry: 0, earned: 0, spawnT: .5, patrons, seatsTaken: new Set(), init: () => resetAhwaStation(),
        hud: () => `وصّلت: <b style="display:inline;color:#fff">${modeObj.served}</b> · زعلانين: <b style="display:inline;color:#ff9a9a">${modeObj.angry} / ٣</b><br>الوقت: ${fmtTime(modeObj.time)} · الغلة: ${egp(modeObj.earned)}<br>${(modeObj.tray||[]).length ? 'وزّع اللي على الصينية (E جنب الزبون).' : 'روح للنَصبة (E) وحضّر الطلبات.'}`,
        action: () => {
          if (hero.pos.distanceTo(SPOT.counter) < 2.6) return { text: 'ادخل النَصبة وحضّر الطلبات', fn: () => enterStation('ahwa') };
          const c = modeObj.patrons.find(n => n.state === 'customer' && n.order && Math.hypot(n.g.position.x-hero.pos.x, n.g.position.z-hero.pos.z) < 2);
          if (c) return { text: `قدّم ${c.order.drink} ${c.order.sugar} لـ ${c.name}`, fn: () => serveAhwa(c) };
          return null;
        },
        onTime: () => endMode('الوردية خلصت ☕', `${heroName} وصّل ${modeObj.served} طلب وكسب ${egp(modeObj.earned)}.`, bestScore('ahwa', modeObj.earned)) }; },
    foul: () => { hero.pos.copy(SPOT.cartHero); hero.pos.y = .15;
      const q = npcs.slice(free, free+6);
      return { vehicles: false, cafe: false, title: 'عربية الفول 🧆', time: 210, queue: [], pool: q, served: 0, angry: 0, earned: 0, spawnT: 2,
        init: () => { FL.fry.forEach(f => f.mesh.parent && f.mesh.parent.remove(f.mesh)); Object.assign(FL, { fry: [], sF: [], sP: [], sand: null, bag: [] }); foulVisual(); },
        hud: () => `بعت: <b style="display:inline;color:#fff">${modeObj.served}</b> · زعلانين: <b style="display:inline;color:#ff9a9a">${modeObj.angry} / ٣</b><br>الوقت: ${fmtTime(modeObj.time)} · الغلة: ${egp(modeObj.earned)}`,
        onTime: () => endMode('خلّصت الفول 🧆', `${heroName} باع ${modeObj.served} طلب وكسب ${egp(modeObj.earned)}.`, bestScore('foul', modeObj.earned)) }; },
  };
  modeObj = M_[id](); if (modeObj.init) modeObj.init();
  if (id === 'free' || id === 'domino' || id === 'police') { /* walkers already out */ }
  setObjective(modeObj.title, '');
  camera.position.set(hero.pos.x, 4, hero.pos.z + 6); lookAt.copy(hero.pos);
  refreshTray(); updateHud(); if (id === 'foul') enterStation('foul');
  banner({ story: SAVE.started && SAVE.step ? 'رجعت الحتة يا ' + heroName + ' 👑' : 'يلا يا ' + heroName + '… نبقى الجامد 👑', free:'أهلاً بيك في الحتة يا ' + heroName, police:'المطلوب في الحتة… اركب البوكس 🚓', cash:'دوّر على رزم الفلوس 💵', ahwa:'الزباين جايين… جهّز النَصبة ☕', foul:'افتح العربية… الزباين جايين 🧆', domino:'اقعد يا ' + heroName }[id], 'info', 2.6);
}
function bestScore(key, v){ const b = parseFloat(store.get('ty_best_'+key)||'0'); if (v > b){ store.set('ty_best_'+key, String(v)); return 'رقم قياسي جديد! 🏆'; } return `أحسن غلة: ${egp(b)}`; }
function endMode(title, text, best=''){
  if (state !== 'play') return; state = 'end';
  if (sirenGain) sirenGain.gain.value = 0;
  $('endTitle').textContent = title; $('endText').textContent = text; $('endBest').textContent = best;
  exitStation(true); $('domino').hidden = true; document.body.classList.remove('in-domino'); hero.locked = false;
  setTimeout(() => { $('hud').hidden = true; $('end').hidden = false; }, 700);
}
function openMenu(){ saveStory(); renderModes(); state = 'menu'; $('hud').hidden = true; $('domino').hidden = true; $('end').hidden = true; $('menu').hidden = false; clearBubbles(); exitStation(true); document.body.classList.remove('in-domino'); if (sirenGain) sirenGain.gain.value = 0; try { speechSynthesis.cancel(); } catch(e){} }
$('againBtn').onclick = () => startMode(modeId);
$('toMenuBtn').onclick = openMenu;

function resetAhwaStation(){ AH.vessel = null; Object.assign(AH.pot, { coffee:0, sugar:0, heat:0, onFire:false, ruined:false, foam:false }); ahwaVisual(); ahwaPotVisual(); ahwaTrayVisual(); }
function serveAhwa(c){
  const tr = modeObj.tray, o = c.order, need = sugarSpoons(o.drink, o.sugar);
  let i = tr.findIndex(t => t.drink === o.drink && t.spoons === need), wrongSugar = false;
  if (i < 0){ i = tr.findIndex(t => t.drink === o.drink); wrongSugar = i >= 0; }
  if (i < 0){ say(c, 'مش ده اللي طلبته!', 1.6, 'angry'); buzz(30); return; }
  const item = tr.splice(i,1)[0]; refreshTray(); ahwaTrayVisual(); clink(); buzz(15);
  const f = clamp(c.patience/c.maxPat, 0, 1);
  const tip = wrongSugar ? 0 : Math.max(0, Math.round(4 + 10*f) + (o.reg ? 5 : 0) - (item.good ? 0 : 3) - (item.stirred ? 0 : 3));
  const now = runTime; modeObj.combo = (now - (modeObj.lastServe ?? -99) < 25) ? (modeObj.combo||0) + 1 : 1; modeObj.lastServe = now; const cb = modeObj.combo >= 3 && !wrongSugar ? Math.min(modeObj.combo - 2, 4) * 3 : 0;
  const pay = 5 + tip + cb; modeObj.served++; modeObj.earned += pay; hero.money += pay; if (modeObj.onServe) modeObj.onServe('ahwa');
  if (wrongSugar) say(c, item.spoons > need ? 'إيه السكر ده كله!' : 'ده مر يا معلم!', 2.2, 'angry');
  else if (!item.stirred) say(c, 'السكر لسه تحت يا ريس', 2);
  else if (!item.good) say(c, 'الكوباية مش مليانة!', 2);
  else say(c, rpick(['تسلم إيدك يا معلم','الله ينور','شاي ولا أروع','مظبوط زي ما بحبه']), 2);
  const s = SEATS[c.seat]; let g;
  if (item.drink === 'قهوة'){ g = cupModel(); g.add(disc(.029, coffeeMat, .065)); g.scale.setScalar(1.6); } else g = makeGlass(item.drink);
  g.position.set(TABLES[s.ti][0] + (s.x < TABLES[s.ti][0] ? -.25 : .25), .93, TABLES[s.ti][1]); scene.add(g);
  if (c.bubble){ removeBubble(c.bubble); c.bubble = null; }
  c.order = null; c.state = 'drinking'; c.leaveT = 9; c.glass = g;
  banner(`+${pay} جنيه${tip ? ' (بقشيش ' + tip + ')' : ''}${cb ? ' · كومبو ×' + modeObj.combo + ' 🔥' : ''}`, wrongSugar ? 'bad' : 'ok', 1.6);
}
function updateAhwa(dt){
  const m = modeObj;
  m.spawnT -= dt;
  const waiting = m.patrons.filter(n => (n.state === 'customer' && n.order) || n.state === 'goto' && n.onArrive && n.seat !== undefined && !n.leaving).length;
  if (m.spawnT <= 0 && waiting < 4){
    m.spawnT = (m.served + m.angry < 1 && m.seatsTaken.size < 2) ? 3 : R(11, 17) * (m.time < 100 ? .8 : 1);
    const free = SEATS.map((s,i) => i).filter(i => !m.seatsTaken.has(i));
    const n = m.patrons.find(n => n.state === 'hidden');
    if (free.length && n){
      const si = rpick(free); m.seatsTaken.add(si); const s = SEATS[si];
      n.leaving = false; n.g.visible = true; n.g.position.set(s.x + R(-3,3), .15, 40.5); n.state = 'goto'; n.speed = R(1.6, 2.1); n.tx = s.x + (s.x < TABLES[s.ti][0] ? -.25 : .25); n.tz = s.z + .6; n.seat = si;
      n.onArrive = n2 => { seatNPC(n2, s.x, s.z, s.ry); n2.state = 'customer'; const rg = REGULARS[n2.name]; n2.order = rg && Math.random() < .75 ? { ...rg, reg: true } : { drink: rpick(DRINKS), sugar: rpick(SUGARS) }; n2.maxPat = 120*DIFF.pat; n2.patience = n2.maxPat; n2.bubble = orderBubble(n2); say(n2, n2.order.reg ? `زي العادة يا ${heroName}! ${n2.order.drink} ${n2.order.sugar}` : `واحد ${n2.order.drink} ${n2.order.sugar} يا ريس!`, 0); buzz(15); };
    } else m.spawnT = 2;
  }
  for (const n of m.patrons){
    if (n.state === 'customer' && n.order){
      n.patience -= dt; const f = clamp(n.patience/n.maxPat, 0, 1);
      if (n.bubble) n.bubble.el.innerHTML = `${orderLabel(n.order)}<div class="pat"><i style="width:${f*100}%;background:${f<.3?'#d33':'#3aa84a'}"></i></div>`;
      if (n.patience <= 0){ m.angry++; removeBubble(n.bubble); n.bubble = null; n.order = null; say(n, 'إيه القهوة دي! ماشي', 2, 'angry'); leaveSeat(n); if (m.angry >= 3){ if (m.onFail) m.onFail(); else endMode('الزباين زعلوا 😤', `${heroName} وصّل ${m.served} طلب بس ٣ زباين مشيوا زعلانين.`, bestScore('ahwa', m.earned)); } }
    } else if (n.state === 'drinking'){ n.leaveT -= dt; if (n.leaveT <= 0){ if (n.glass){ scene.remove(n.glass); n.glass = null; } leaveSeat(n); } }
  }
}
function leaveSeat(n){ modeObj.seatsTaken && modeObj.seatsTaken.delete(n.seat); n.leaving = true; n.state = 'goto'; n.g.position.y = .15; n.tx = rpick([7.5, 40.5]); n.tz = R(36, 40); n.onArrive = n2 => { n2.state = 'hidden'; n2.g.visible = false; n2.leaving = false; }; }

// ---- 21-domino-egyptian-rules-2-players.js ----
// ================= domino (Egyptian rules: 1v1 and 2v2) =================
// 1v1: 7 tiles each, 14 in the boneyard (الكومة). Draw until you can play; pass only when the boneyard is empty. Match to 101.
// 2v2: 7 tiles each, no boneyard, partners sit opposite, play goes round the table. Pass when you can't play. Match to 151.
// First round: the highest double opens (الدش in 2v2 always). Later rounds: the player who went out opens with any tile.
// Going out: the winners take the pips left in the losing side's hands. Blocked game (قفلة): lower total wins and takes the other side's pips; a tie scores nothing.
// House rules: the player who closes the game must say «قفلة» first, otherwise the other side gets 50. Getting caught cheating gives the other side 50.
const NUMN = ['أبيض','يك','دو','سيه','جوهار','بانج','شيش'];
const DBL = ['البلاطة','الهبياك','الدوبارة','الدوسة','الدورجي','الدبش','الدش'];
const tName = t => t[0] === t[1] ? DBL[t[0]] : `${NUMN[Math.max(t[0],t[1])]} ${NUMN[Math.min(t[0],t[1])]}`;
const pipsOf = arr => arr.reduce((s,t) => s + t[0] + t[1], 0);
const sameT = (a,b) => (a[0]===b[0] && a[1]===b[1]) || (a[0]===b[1] && a[1]===b[0]);
const touches = (t, v) => t[0] === v || t[1] === v;
const DOM = { mode: null, seats: [], hands: [], bone: [], board: [], start: 0, L: null, R: null, turn: 0, sel: null, selCheat: false, score: [0,0], target: 101, over: true, matchOver: true, qafla: false, mustStart: null, lastWinner: null, weak: [], cheats: [], accused: false, lastSide: 'R', aiTimer: null };
const PIPS = { 0:[], 1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8] };
const tileHTML = (t, cls='', attrs='') => `<span class="tile ${t[0]===t[1] ? 'dbl' : ''} ${cls}" ${attrs}>${[t[0],t[1]].map(v => `<span class="half">${[...Array(9)].map((_,i) => PIPS[v].includes(i) ? '<i class="pip"></i>' : '<i></i>').join('')}</span>`).join('')}</span>`;
const teamOf = s => s % 2;          // seat 0 (you) and 2 (partner) are team 0
const isMe = s => s === 0;
const NS = () => DOM.seats.length;
const hand = s => DOM.hands[s];
const teamName = tm => DOM.mode === '1v1' ? (tm === 0 ? heroName : 'عم سيد') : (tm === 0 ? 'إحنا' : 'هما');
function openDomino(){
  hero.locked = true; $('domino').hidden = false; document.body.classList.add('in-domino');
  if (DOM.matchOver){ $('dPick').hidden = false; $('dGame').hidden = true; $('dScore').textContent = modeObj.domBet ? `الرهان ${Math.min(modeObj.domBet, Math.floor(hero.money))} جنيه` : ''; }
  else { $('dPick').hidden = true; $('dGame').hidden = false; renderDomino(); if (!DOM.over && !isMe(DOM.turn)) scheduleAI(); }
}
function closeDomino(){ $('domino').hidden = true; hero.locked = false; document.body.classList.remove('in-domino'); clearTimeout(DOM.aiTimer); }
$('dExit').onclick = closeDomino;
document.querySelectorAll('[data-dm]').forEach(b => b.onclick = () => newDominoMatch(b.dataset.dm));
$('dAgain').onclick = () => { if (DOM.matchOver){ $('dPick').hidden = false; $('dGame').hidden = true; } else newDominoRound(); };
function newDominoMatch(mode){
  DOM.mode = mode; DOM.score = [0,0]; DOM.matchOver = false; DOM.lastWinner = null;
  DOM.target = mode === '1v1' ? 101 : 151;
  DOM.seats = mode === '1v1'
    ? [{ name: heroName, face: CH.hero.img.face }, { name: 'عم سيد', face: null }]
    : [{ name: heroName, face: CH.hero.img.face }, { name: 'شمس', face: CH.wanted.img.face }, { name: 'إسلام', face: CH.islam.img.face }, { name: 'العربي', face: CH.enemy.img.face }];
  $('dPick').hidden = true; $('dGame').hidden = false; document.querySelector('.seats').classList.toggle('four', mode === '2v2');
  newDominoRound();
}
function newDominoRound(){
  clearTimeout(DOM.aiTimer);
  const all = []; for (let a=0;a<=6;a++) for (let b=a;b<=6;b++) all.push([a,b]);
  for (let i=all.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [all[i],all[j]] = [all[j],all[i]]; }
  DOM.hands = []; for (let s=0;s<NS();s++) DOM.hands.push(all.slice(s*7, s*7+7));
  DOM.hands[0].sort((a,b) => (b[0]+b[1]) - (a[0]+a[1]));
  DOM.bone = all.slice(NS()*7);
  Object.assign(DOM, { board: [], start: 0, L: null, R: null, sel: null, selCheat: false, over: false, qafla: false, weak: DOM.seats.map(() => []), cheats: [], accused: false, mustStart: null });
  let who, msg;
  if (DOM.lastWinner !== null){ who = DOM.lastWinner; msg = `${DOM.seats[who].name} كسب الدور اللي فات… يبدأ بأي حجر`; }
  else {
    let st = null;
    for (let d=6; d>=0 && !st; d--) for (let s=0; s<NS() && !st; s++) if (hand(s).some(t => t[0]===d && t[1]===d)) st = { s, t: [d,d] };
    if (!st){ let best = null; for (let s=0;s<NS();s++) for (const t of hand(s)) if (!best || t[0]+t[1] > best.t[0]+best.t[1]) best = { s, t }; st = best; }
    who = st.s; DOM.mustStart = st.t; msg = isMe(who) ? `معاك ${tName(st.t)}… ابدأ بيه 👇` : `${DOM.seats[who].name} معاه ${tName(st.t)}… هو اللي هيبدأ`;
  }
  DOM.turn = who; dMsg(msg); renderDomino(); if (!isMe(who)) scheduleAI(1300);
}
function fits(t){ if (!DOM.board.length) return !DOM.mustStart || sameT(t, DOM.mustStart); return touches(t, DOM.L) || touches(t, DOM.R); }
function placeTile(t, side, cheat){
  if (!DOM.board.length){ DOM.board.push([t[0],t[1]]); DOM.start = 0; DOM.L = t[0]; DOM.R = t[1]; return 'R'; }
  let o;
  if (side === 'L'){ if (t[1]===DOM.L) o = [t[0],t[1]]; else if (t[0]===DOM.L) o = [t[1],t[0]]; else if (cheat) o = [t[0],t[1]]; else return null; DOM.board.unshift(o); DOM.start++; DOM.L = o[0]; return 'L'; }
  if (t[0]===DOM.R) o = [t[0],t[1]]; else if (t[1]===DOM.R) o = [t[1],t[0]]; else if (cheat) o = [t[0],t[1]]; else return null; DOM.board.push(o); DOM.R = o[1]; return 'R';
}
function unplace(side, prev){ if (side === 'L'){ DOM.board.shift(); DOM.start--; } else DOM.board.pop(); DOM.L = prev.L; DOM.R = prev.R; }
function isBlocked(){ if (!DOM.board.length) return false; return ![...DOM.hands.flat(), ...DOM.bone].some(t => touches(t, DOM.L) || touches(t, DOM.R)); }
function dMsg(t){ $('dMsg').textContent = t; }
function nextTurn(){ DOM.turn = (DOM.turn + 1) % NS(); DOM.sel = null; DOM.selCheat = false; renderDomino(); if (!isMe(DOM.turn) && !DOM.over) scheduleAI(); }
function scheduleAI(ms=950){ clearTimeout(DOM.aiTimer); DOM.aiTimer = setTimeout(aiTurn, ms); }

// ---------- rendering ----------
function renderDomino(){
  const [a, b] = DOM.score;
  $('dScore').textContent = `${teamName(0)} ${a} — ${b} ${teamName(1)} · لـ ${DOM.target}${modeObj.domBet ? ' · الرهان ' + Math.min(modeObj.domBet, Math.floor(hero.money)) + ' ج' : ''}`;
  for (const s of [1,2,3]){
    const el = $('seat' + s); const seat = DOM.mode === '1v1' ? (s === 2 ? 1 : null) : s;
    if (seat === null || !DOM.seats[seat]){ el.hidden = true; continue; }
    el.hidden = false; const p = DOM.seats[seat];
    el.className = `seat ${s === 2 ? 'top' : s === 1 ? 'left' : 'right'} ${teamOf(seat) === 0 ? 'mate' : 'opp'} ${DOM.turn === seat && !DOM.over ? 'active' : ''}`;
    el.innerHTML = `${p.face ? `<img src="${p.face}" alt="">` : '<span class="noface">👴</span>'}<span class="sn">${p.name}${teamOf(seat) === 0 && seat !== 0 ? ' 🤝' : ''}</span><span class="sc">🂠 ${hand(seat).length}</span>${DOM.over ? `<span class="reveal">${hand(seat).map(t => tileHTML(t, 'mini')).join('')}</span>` : ''}`;
  }
  drawBoard();
  const myTurn = isMe(DOM.turn) && !DOM.over;
  $('dHand').innerHTML = hand(0).map((t,i) => `<div class="hwrap">${tileHTML(t, (myTurn ? (fits(t) ? 'ok' : 'no') : 'no') + (DOM.sel === i ? ' sel' : ''), `data-i="${i}"`)}<small>${tName(t)}</small></div>`).join('');
  $('dHand').querySelectorAll('.tile').forEach(el => el.onclick = () => playerPick(+el.dataset.i));
  const canPlay = hand(0).some(fits), started = DOM.board.length > 0;
  $('dDraw').hidden = !(myTurn && started && !canPlay && DOM.bone.length && DOM.mode === '1v1');
  $('dPass').hidden = !(myTurn && started && (canPlay || !DOM.bone.length || DOM.mode === '2v2'));
  $('dQafla').hidden = !(myTurn && started); $('dQafla').classList.toggle('on', DOM.qafla);
  $('dCheat').hidden = !(myTurn && DOM.cheats.length >= 0 && DOM.board.length > 1 && !DOM.accused);
  const showSides = DOM.sel !== null;
  $('dLeft').hidden = $('dRight').hidden = !showSides; $('dCancel').hidden = !showSides;
  if (showSides){ $('dLeft').textContent = `⬅️ على الـ ${NUMN[DOM.L]}`; $('dRight').textContent = `على الـ ${NUMN[DOM.R]} ➡️`; }
  $('dAgain').hidden = !DOM.over; $('dAgain').textContent = DOM.matchOver ? 'ماتش جديد' : 'دور جديد';
}
// board drawn on a canvas as a real snake: it turns at the edges, doubles lie crosswise
function drawBoard(){
  const cv = $('dCanvas'), box = cv.parentElement.getBoundingClientRect();
  const W = Math.max(260, box.width), H = cv.clientHeight || 220, dpr = Math.min(devicePixelRatio || 1, 2);
  if (cv.width !== Math.round(W*dpr) || cv.height !== Math.round(H*dpr)){ cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  const gr = g.createRadialGradient(W/2,H/2,20,W/2,H/2,W*.7); gr.addColorStop(0,'#2a6b3f'); gr.addColorStop(1,'#163d25'); g.fillStyle = gr; g.fillRect(0,0,W,H);
  if (!DOM.board.length){ g.fillStyle = 'rgba(230,255,235,.6)'; g.font = '700 16px Cairo, sans-serif'; g.textAlign = 'center'; g.direction = 'rtl'; g.fillText('الترابيزة فاضية', W/2, H/2); return; }
  const padX = DOM.mode === '2v2' ? 86 : 18, padY = 14;
  let u = 22, rects;
  for (; u >= 7; u -= 1){ rects = layoutSnake(u, padX, W - padX); const bb = bbox(rects); if (bb.h <= H - padY*2 && bb.minX >= 4 && bb.maxX <= W - 4) break; }
  const bb = bbox(rects); const oy = (H - bb.h)/2 - bb.minY, ox = 0;
  for (const r of rects) drawTile(g, r.x+ox, r.y+oy, r.w, r.h, r.vals, r.dir, u, r.end);
}
function bbox(rs){ let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9; for (const r of rs){ minX=Math.min(minX,r.x); minY=Math.min(minY,r.y); maxX=Math.max(maxX,r.x+r.w); maxY=Math.max(maxY,r.y+r.h); } return { minX, minY, maxX, maxY, h: maxY-minY }; }
function layoutSnake(u, minX, maxX){
  const out = [], cx = (minX + maxX)/2, cy = 0;
  const st = DOM.board[DOM.start], sd = st[0] === st[1];
  const s = sd ? { x: cx - u/2, y: cy - u, w: u, h: 2*u } : { x: cx - u, y: cy - u/2, w: 2*u, h: u };
  out.push({ ...s, vals: [st[0], st[1]], dir: 'R', end: DOM.board.length === 1 });
  const arm = (tiles, dirs, p0, last0) => {
    let k = 0, p = { ...p0 }, last = last0;
    tiles.forEach((t, i) => {
      const dbl = t[0] === t[1]; const along = dbl ? u : 2*u, across = dbl ? 2*u : u;
      let d = dirs[k % dirs.length];
      if ((d === 'R' && p.x + along > maxX) || (d === 'L' && p.x - along < minX)){
        const vert = dirs[(k+1) % dirs.length];
        p = { x: d === 'R' ? last.x + last.w - u/2 : last.x + u/2, y: vert === 'D' ? last.y + last.h : last.y };
        k++; d = vert;
      }
      let r;
      if (d === 'R') r = { x: p.x, y: p.y - across/2, w: along, h: across };
      else if (d === 'L') r = { x: p.x - along, y: p.y - across/2, w: along, h: across };
      else if (d === 'D') r = { x: p.x - across/2, y: p.y, w: across, h: along };
      else r = { x: p.x - across/2, y: p.y - along, w: across, h: along };
      out.push({ ...r, vals: t, dir: d, end: i === tiles.length - 1 });
      if (d === 'R') p = { x: r.x + r.w, y: p.y }; else if (d === 'L') p = { x: r.x, y: p.y };
      else { const nh = dirs[(k+1) % dirs.length]; p = { x: nh === 'L' ? r.x : r.x + r.w, y: d === 'D' ? r.y + r.h - u/2 : r.y + u/2 }; k++; }
      last = r;
    });
  };
  const right = DOM.board.slice(DOM.start + 1).map(t => [t[0], t[1]]);
  const left = DOM.board.slice(0, DOM.start).reverse().map(t => [t[1], t[0]]);
  arm(right, ['R','D','L','D'], { x: s.x + s.w, y: cy }, s);
  arm(left, ['L','U','R','U'], { x: s.x, y: cy }, s);
  return out;
}
function drawTile(g, x, y, w, h, vals, dir, u, end){
  const rr = Math.max(3, u*.22);
  g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = u*.35; g.shadowOffsetY = u*.12;
  g.fillStyle = '#f7f2e6'; g.beginPath(); g.roundRect(x+.5, y+.5, w-1, h-1, rr); g.fill(); g.restore();
  g.strokeStyle = end ? '#ffd34d' : '#bdb39d'; g.lineWidth = end ? 2.2 : 1; g.beginPath(); g.roundRect(x+.5, y+.5, w-1, h-1, rr); g.stroke();
  const horizontalTile = w > h;
  // which half touches the previous tile
  let first = vals[0], second = vals[1];
  const halves = horizontalTile ? [[x, y, w/2, h], [x + w/2, y, w/2, h]] : [[x, y, w, h/2], [x, y + h/2, w, h/2]];
  let order = [first, second];
  if (dir === 'L' && horizontalTile) order = [second, first];
  if (dir === 'U' && !horizontalTile) order = [second, first];
  g.strokeStyle = '#3a3a3a'; g.lineWidth = Math.max(1, u*.06); g.beginPath();
  if (horizontalTile){ g.moveTo(x + w/2, y + h*.18); g.lineTo(x + w/2, y + h*.82); } else { g.moveTo(x + w*.18, y + h/2); g.lineTo(x + w*.82, y + h/2); }
  g.stroke();
  halves.forEach(([hx, hy, hw, hh], i) => {
    const v = order[i]; const pr = Math.max(1.3, u*.1);
    g.fillStyle = '#151515';
    for (const idx of PIPS[v]){ const cxp = hx + hw*(.22 + (idx%3)*.28), cyp = hy + hh*(.22 + Math.floor(idx/3)*.28); g.beginPath(); g.arc(cxp, cyp, pr, 0, 7); g.fill(); }
  });
}

// ---------- you ----------
function playerPick(i){
  if (!isMe(DOM.turn) || DOM.over) return;
  const t = hand(0)[i]; DOM.sel = null; DOM.selCheat = false;
  if (!fits(t)){
    if (!DOM.board.length){ dMsg(`لازم تبدأ بـ ${tName(DOM.mustStart)}`); return renderDomino(); }
    DOM.sel = i; DOM.selCheat = true; dMsg(`${tName(t)} مش راكب… لو نزلته يبقى غش 😈`); return renderDomino();
  }
  if (!DOM.board.length) return commitPlayer(i, 'R');
  const l = touches(t, DOM.L), r = touches(t, DOM.R);
  if (l && r && DOM.L !== DOM.R){ DOM.sel = i; dMsg('تحطه فين؟'); return renderDomino(); }
  commitPlayer(i, l ? 'L' : 'R');
}
$('dLeft').onclick = () => { if (DOM.sel !== null) commitPlayer(DOM.sel, 'L', DOM.selCheat); };
$('dRight').onclick = () => { if (DOM.sel !== null) commitPlayer(DOM.sel, 'R', DOM.selCheat); };
$('dCancel').onclick = () => { DOM.sel = null; DOM.selCheat = false; dMsg('دورك'); renderDomino(); };
$('dQafla').onclick = () => { DOM.qafla = !DOM.qafla; dMsg(DOM.qafla ? 'قلت «قفلة» 🔒… انزل الحجر اللي بيقفل' : 'لغيت القفلة'); renderDomino(); };
function commitPlayer(i, side, cheat=false){
  const t = hand(0)[i], prev = { L: DOM.L, R: DOM.R };
  const s = placeTile(t, side, cheat); if (!s) return;
  hand(0).splice(i,1); DOM.sel = null; DOM.selCheat = false; DOM.lastSide = s; DOM.cheats = []; DOM.accused = false;
  tone(700,500,.06,'triangle',.15); buzz(10);
  if (cheat){
    if (Math.random() < .6){ unplace(s, prev); hand(0).splice(i, 0, t); DOM.score[1] += 50; tone(300,150,.4,'sawtooth',.1); buzz(60); dMsg(`🚨 اتمسكت بتغش! +٥٠ لـ ${teamName(1)}`); speak('بتغش؟'); renderDomino(); checkMatch(); return; }
    dMsg(`نزّلت ${tName(t)} غش… محدش خد باله 🤫`);
  } else dMsg(`نزّلت ${tName(t)}`);
  afterPlay(0, DOM.qafla);
}
$('dDraw').onclick = () => {
  if (!isMe(DOM.turn) || !DOM.bone.length) return;
  DOM.weak[0] = [...new Set([...DOM.weak[0], DOM.L, DOM.R])];
  const t = DOM.bone.pop(); hand(0).push(t); hand(0).sort((a,b) => (b[0]+b[1]) - (a[0]+a[1]));
  dMsg(fits(t) ? `سحبت ${tName(t)}… ينفع ينزل ✔️` : `سحبت ${tName(t)}… اسحب تاني`); tone(500,600,.05,'triangle',.08); renderDomino();
};
$('dPass').onclick = () => {
  if (!isMe(DOM.turn) || DOM.over) return;
  const canPlay = hand(0).some(fits);
  if (!canPlay && DOM.bone.length && DOM.mode === '1v1') return dMsg('اسحب من الكومة الأول');
  if (canPlay){
    if (Math.random() < .5){ DOM.score[1] += 50; buzz(60); dMsg(`🚨 فوّت وانت معاك؟! اتمسكت… +٥٠ لـ ${teamName(1)}`); renderDomino(); if (checkMatch()) return; }
    else dMsg('فوّت وانت معاك… محدش خد باله 🤫');
  } else { dMsg('فوّت'); DOM.weak[0] = [...new Set([...DOM.weak[0], DOM.L, DOM.R])]; }
  DOM.qafla = false; DOM.cheats = []; nextTurn();
};
$('dCheat').onclick = () => {
  if (DOM.accused) return; DOM.accused = true;
  const c = DOM.cheats.find(x => teamOf(x.seat) === 1);
  if (c){
    DOM.score[0] += 50; coin();
    if (c.type === 'tile'){ const endT = c.side === 'L' ? DOM.board[0] : DOM.board[DOM.board.length-1]; if (endT && sameT(endT, c.t)){ unplace(c.side, c.prev); hand(c.seat).push(c.t); } }
    dMsg(`🚨 مسكت ${DOM.seats[c.seat].name} بيغش! +٥٠ لـ ${teamName(0)}`); speak('خلاص خلاص… مسكتني');
  } else dMsg('ظلمتهم… محدش كان بيغش 😅');
  DOM.cheats = DOM.cheats.filter(x => x !== c); renderDomino(); checkMatch();
};

// ---------- after any move ----------
function afterPlay(seat, announced){
  DOM.qafla = false;
  if (!hand(seat).length) return endRound({ type: 'out', seat });
  if (isBlocked()){ if (announced) return endRound({ type: 'block', seat }); DOM.score[1 - teamOf(seat)] += 50; return endRound({ type: 'penalty', seat }); }
  if (announced && isMe(seat)) dMsg('قلت «قفلة» ومكانتش قفلة 😅');
  nextTurn();
}

// ---------- computer players ----------
function aiScore(seat, o){
  const t = o.t, exposed = o.side === 'L' ? (t[1] === DOM.L ? t[0] : t[1]) : (t[0] === DOM.R ? t[1] : t[0]);
  const other = o.side === 'L' ? DOM.R : DOM.L; const mine = hand(seat);
  let sc = t[0] + t[1] + (t[0] === t[1] ? 6 : 0) + (exposed === other ? 2 : 0) + mine.filter(x => x !== t && touches(x, exposed)).length * 2;
  for (let s=0;s<NS();s++){ if (s === seat) continue; const w = DOM.weak[s] || []; if (!w.includes(exposed)) continue; sc += teamOf(s) === teamOf(seat) ? -7 : 9; }
  return sc;
}
function aiLegal(seat){ const o = []; if (!DOM.board.length){ hand(seat).forEach(t => { if (!DOM.mustStart || sameT(t, DOM.mustStart)) o.push({ t, side: 'R' }); }); return o; } hand(seat).forEach(t => { if (touches(t, DOM.L)) o.push({ t, side: 'L' }); if (touches(t, DOM.R) && DOM.L !== DOM.R) o.push({ t, side: 'R' }); else if (touches(t, DOM.R) && !touches(t, DOM.L)) o.push({ t, side: 'R' }); }); return o; }
const TALK = ['اتلمّ يا ' + heroName, 'دي لعبتي من زمان', 'ركّز يا ابني', 'هتعمل إيه دلوقتي؟', 'شوف دي بقى', 'ماشي ماشي'];
function aiTurn(){
  if (DOM.over || isMe(DOM.turn) || $('domino').hidden) return;
  const seat = DOM.turn, p = DOM.seats[seat], opp = teamOf(seat) === 1;
  let opts = aiLegal(seat);
  if (DOM.board.length && opp && opts.length && Math.random() < .05){ DOM.cheats.push({ seat, type: 'pass' }); dMsg(`${p.name}: «فوّت»`); return nextTurn(); }
  if (DOM.board.length && opp && Math.random() < .03 && hand(seat).length > 1){ const bad = hand(seat).find(t => !touches(t, DOM.L) && !touches(t, DOM.R)); if (bad){ const prev = { L: DOM.L, R: DOM.R }, side = Math.random() < .5 ? 'L' : 'R'; placeTile(bad, side, true); hand(seat).splice(hand(seat).indexOf(bad), 1); DOM.lastSide = side; DOM.cheats.push({ seat, type: 'tile', t: bad, side, prev }); dMsg(`${p.name} نزل ${tName(bad)}`); tone(600,420,.06,'triangle',.15); return afterPlay(seat, false); } }
  let drew = 0;
  if (DOM.mode === '1v1') while (!opts.length && DOM.bone.length){ DOM.weak[seat] = [...new Set([...DOM.weak[seat], DOM.L, DOM.R])]; hand(seat).push(DOM.bone.pop()); drew++; opts = aiLegal(seat); }
  if (!opts.length){ DOM.weak[seat] = [...new Set([...DOM.weak[seat], DOM.L, DOM.R])]; dMsg(drew ? `${p.name} سحب ${drew} وفوّت` : `${p.name} فوّت`); return nextTurn(); }
  opts.sort((a,b) => aiScore(seat, b) - aiScore(seat, a));
  const o = opts[0]; placeTile(o.t, o.side); hand(seat).splice(hand(seat).indexOf(o.t), 1); DOM.lastSide = o.side;
  tone(600,420,.06,'triangle',.15);
  const blocked = isBlocked(), says = blocked && Math.random() < .88;
  dMsg(`${drew ? `${p.name} سحب ${drew} ونزل ` : `${p.name} نزل `}${tName(o.t)}${says ? ' وقال «قفلة!» 🔒' : ''}${!blocked && hand(seat).length && Math.random() < .25 ? ' · «' + rpick(TALK) + '»' : ''}`);
  if (Math.random() < .5) speak(tName(o.t));
  afterPlay(seat, says);
}

// ---------- round and match end ----------
function endRound(res){
  DOM.over = true; clearTimeout(DOM.aiTimer);
  const teamPips = tm => DOM.hands.reduce((s, h, i) => s + (teamOf(i) === tm ? pipsOf(h) : 0), 0);
  let txt = '';
  if (res.type === 'out'){
    const tm = teamOf(res.seat), pts = teamPips(1 - tm); DOM.score[tm] += pts; DOM.lastWinner = res.seat;
    txt = `${DOM.seats[res.seat].name} خلّص حجارته 🎉 +${pts} لـ ${teamName(tm)}`;
  } else if (res.type === 'block'){
    const a = teamPips(0), b = teamPips(1);
    if (a < b){ DOM.score[0] += b; DOM.lastWinner = lowestSeat(0); txt = `قفلة 🔒 ${teamName(0)} ${a} و${teamName(1)} ${b}… +${b} لـ ${teamName(0)}`; }
    else if (b < a){ DOM.score[1] += a; DOM.lastWinner = lowestSeat(1); txt = `قفلة 🔒 ${teamName(0)} ${a} و${teamName(1)} ${b}… +${a} لـ ${teamName(1)}`; }
    else { DOM.lastWinner = null; txt = `قفلة 🔒 متعادلين (${a})… محدش ياخد حاجة`; }
  } else {
    const tm = teamOf(res.seat); DOM.lastWinner = null;
    txt = `${DOM.seats[res.seat].name} قفلها من غير ما يقول «قفلة»! +٥٠ لـ ${teamName(1 - tm)}`;
  }
  if (!checkMatch(txt)) dMsg(txt);
  renderDomino();
}
function lowestSeat(tm){ let best = null; DOM.hands.forEach((h, i) => { if (teamOf(i) === tm && (best === null || pipsOf(h) < pipsOf(DOM.hands[best]))) best = i; }); return best; }
function checkMatch(prefix=''){
  const [a, b] = DOM.score;
  if (a < DOM.target && b < DOM.target) return false;
  DOM.over = true; DOM.matchOver = true; clearTimeout(DOM.aiTimer); const w = a >= b;
  let betTxt = ''; if (modeObj.onDomino){ const bt = modeObj.onDomino(w); if (bt) betTxt = w ? ` · +${bt} جنيه` : ` · -${bt} جنيه`; }
  dMsg(`${prefix ? prefix + ' — ' : ''}${w ? `🏆 كسبتوا الماتش ${a}–${b}!` : `${teamName(1)} كسب الماتش ${b}–${a} 😅`}${betTxt}`.replace('كسبتوا', DOM.mode === '1v1' ? 'كسبت' : 'كسبتوا'));
  if (w) coin(); speak(w ? 'ماشي… كسبتوا المرة دي' : 'اتعلم يا ابني');
  renderDomino(); return true;
}
addEventListener('resize', () => { if (!$('domino').hidden && !$('dGame').hidden) drawBoard(); });

// ---- 22-camera.js ----
// ================= camera =================
const lookAt = new THREE.Vector3(); let camYaw = 0;
const ray = new THREE.Ray(), headPos = new THREE.Vector3(), _t = new THREE.Vector3();
function updateCamera(dt){
  const v = hero.veh;
  if (ST.kind){ stationCamera(dt); } else if (v){
    // look-around offset from dragging; it eases back behind the vehicle after a moment
    if (performance.now() - CAM.lastDrag > 1400) CAM.veh *= Math.exp(-dt*2.5);
    const vy = v.yaw + CAM.veh, fx = Math.sin(vy), fz = Math.cos(vy); const back = v.type === 'moto' ? 5.8 : 7.6, up = (v.type === 'moto' ? 2.6 : 3.2) * (.6 + CAM.tilt*.9);
    const fv = 46 + clamp(Math.abs(v.speed)/v.max, 0, 1)*12; if (Math.abs(camera.fov - fv) > .2){ camera.fov += (fv - camera.fov)*damp(3, dt); camera.updateProjectionMatrix(); }
    _t.set(v.pos.x - fx*back, v.pos.y + up, v.pos.z - fz*back); camera.position.lerp(_t, damp(CAM.drag ? 12 : 5, dt));
    lookAt.lerp(_t.set(v.pos.x + fx*3, v.pos.y + 1.1, v.pos.z + fz*3), damp(8, dt));
  } else {
    if (Math.abs(camera.fov - 46) > .2){ camera.fov += (46 - camera.fov)*damp(4, dt); camera.updateProjectionMatrix(); }
    camDist += (camTarget - camDist) * damp(5, dt); const p = hero.pos;
    if (keys.KeyQ) CAM.orbit += dt*2; if (keys.KeyR) CAM.orbit -= dt*2;
    CAM.orbitSm += (CAM.orbit - CAM.orbitSm) * damp(14, dt);
    lookAt.lerp(_t.set(p.x, p.y + 1.2, p.z), damp(9, dt));
    const o = CAM.orbitSm, hgt = .4 + camDist*CAM.tilt;
    camera.position.set(lookAt.x + Math.sin(o)*camDist, lookAt.y - .1 + hgt, lookAt.z + Math.cos(o)*camDist);
  }
  if (shake > 0){ shake -= dt; camera.position.x += (Math.random()-.5)*shake*.5; camera.position.y += (Math.random()-.5)*shake*.5; }
  camera.lookAt(lookAt);
  camYaw = Math.atan2(camera.position.x - lookAt.x, camera.position.z - lookAt.z);
  // fade buildings between the camera and the focus point
  const f = v ? v.pos : hero.pos; headPos.set(f.x, f.y + 1.4, f.z);
  ray.origin.copy(camera.position); ray.direction.copy(headPos).sub(camera.position); const segLen = ray.direction.length(); ray.direction.normalize();
  for (const b of buildings){
    const hit = ray.intersectBox(b.box, _t); const blocking = hit && camera.position.distanceTo(_t) < segLen - .3;
    const target = blocking ? .18 : 1;
    if (Math.abs(b.opacity - target) > .005){ b.opacity += (target - b.opacity) * damp(10, dt); const tr = b.opacity < .98; for (const m of b.mats){ m.opacity = b.opacity; if (m.transparent !== tr){ m.transparent = tr; m.depthWrite = !tr; m.needsUpdate = true; } } }
  }
  sun.target.position.copy(f); sun.position.copy(f).addScaledVector(sunDir, 120);
}

// ---- 23-radar.js ----
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

// ---- 24-main-update.js ----
// ================= main update =================
let chatterT = 3;
function update(dt, t){
  beatTick();
  const playing = state === 'play';
  if (playing){
    runTime += dt;
    if (modeObj.time !== undefined){ modeObj.time -= dt; if (modeObj.time <= 0){ modeObj.time = 0; modeObj.onTime && modeObj.onTime(); } }
    // input
    let ix = 0, iz = 0;
    if (keys.KeyW || keys.ArrowUp) iz -= 1; if (keys.KeyS || keys.ArrowDown) iz += 1; if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
    ix += joy.vx; iz += joy.vz; let mag = Math.hypot(ix, iz); if (mag > 1){ ix /= mag; iz /= mag; mag = 1; }
    if (hero.locked){ ix = iz = 0; mag = 0; }
    if (hero.veh){
      driveVehicle(hero.veh, dt, ix, iz, keys.Space || runBtn);
      hero.pos.copy(hero.veh.pos);
      // run over NPCs
      if (Math.abs(hero.veh.speed) > 3) for (const n of npcs){ if (n.state === 'hidden' || n.state === 'down') continue; for (const c of vCircles(hero.veh)) if (Math.hypot(c.x-n.g.position.x, c.z-n.g.position.z) < c.r + .45){ npcHit(n, 2); break; } }
      if (hero.veh === copCar){ const on = Math.floor(t*7)%2 === 0; copCar.mesh.userData.red.emissiveIntensity = on ? 3 : .2; copCar.mesh.userData.blue.emissiveIntensity = on ? .2 : 3; if (sirenGain && !chaser.active) sirenGain.gain.value = .05; }
      else if (sirenGain && !chaser.active) sirenGain.gain.value = 0;
    } else {
      if (sirenGain && !chaser.active) sirenGain.gain.value = 0;
      // walking: input relative to the camera direction
      const cy = Math.cos(camYaw), sy = Math.sin(camYaw);
      const wx = ix*cy + iz*sy, wz = -ix*sy + iz*cy;
      const wantRun = (keys.ShiftLeft || keys.ShiftRight || runBtn || joy.mag > .93) && mag > .1;
      let spd = 5;
      if (wantRun && !hero.tired){ spd = 9.2; hero.stamina -= dt*.2; if (hero.stamina <= 0){ hero.stamina = 0; hero.tired = true; } }
      else { hero.stamina = Math.min(1, hero.stamina + dt*.15); if (hero.tired && hero.stamina > .35) hero.tired = false; }
      _t.set(wx*spd, 0, wz*spd); hero.vel.lerp(_t, damp(12, dt)); hero.knock.multiplyScalar(Math.exp(-dt*5));
      const mx = (hero.vel.x + hero.knock.x)*dt, mz = (hero.vel.z + hero.knock.z)*dt; const p = hero.pos;
      if (!blocked(p.x+mx, p.z)) p.x += mx; else { hero.vel.x = 0; hero.knock.x = 0; }
      if (!blocked(p.x, p.z+mz)) p.z += mz; else { hero.vel.z = 0; hero.knock.z = 0; }
      p.x = clamp(p.x, -LIMIT, LIMIT); p.z = clamp(p.z, -LIMIT, LIMIT); p.y += (groundY(p.x, p.z) - p.y) * damp(18, dt);
    }
    if (hero.inv > 0) hero.inv -= dt;
    hero.hurtT += dt; if (hero.hurtT > 5 && hero.hp < 100) hero.hp = Math.min(100, hero.hp + dt*2);
    // mode logic
    if (modeId === 'cash'){
      for (const c of cash){ if (c.taken) continue; if (Math.hypot(c.x-hero.pos.x, c.z-hero.pos.z) < 1.4){ c.taken = true; c.pop = .001; modeObj.got++; modeObj.money += c.value; coin(); if (modeObj.got === 15){ const best = parseFloat(store.get('ty_best_cash')||'0'); let bt = ''; if (!best || runTime < best){ store.set('ty_best_cash', String(runTime)); bt = 'رقم قياسي جديد! 🏆'; } else bt = `أحسن وقت: ${fmtTime(best)}`; endMode('لميت كل الفلوس! 💰', `${heroName} لم ${egp(modeObj.money)} في ${fmtTime(runTime)}.`, bt); break; } if (!chaser.active) spawnChaser(); else banner(`+${c.value} جنيه`, 'ok', 1.1); } }
      updateChaser(dt);
    }
    if (modeId === 'ahwa' || modeObj.job === 'ahwa') updateAhwa(dt);
    if (modeId === 'story') updateStory(dt);
    if (modeId === 'foul' || modeObj.job === 'foul') updateFoul(dt);
    if (ST.kind) updateStation(dt, t);
    // traffic hits on foot
    if (!hero.veh && hero.inv <= 0) for (const c of traffic){ const L = carLocal(c, hero.pos); if (Math.abs(L.along) < c.userData.len && Math.abs(L.lat) < 1.2){ heroDamage((modeId === 'cash' ? 34 : 25) * DIFF.dmg, 'car'); hero.inv = 1.6; const fx = Math.sin(c.rotation.y), fz = Math.cos(c.rotation.y), side = L.lat >= 0 ? 1 : -1; hero.knock.set(fz*side*9 + fx*c.userData.speed*.5, 0, -fx*side*9 + fz*c.userData.speed*.5); horn(); break; } }
    // random street chatter
    chatterT -= dt;
    if (chatterT <= 0){ chatterT = R(4, 8); const near = npcs.filter(n => (n.state === 'walk' || n.state === 'sit' || n.state === 'domino') && n.g.position.distanceTo(hero.pos) < 16); if (near.length){ const n = rpick(near); say(n, rpick(n.state === 'domino' ? ['دومنو يا جدعان!','قفلتها عليك','هات الشيش'] : ['صباح الفل يا معلم','إزيك يا '+heroName+'!','الجو حر النهارده','حد شاف الواد ده؟','يا عم ركز في الطريق','الشاي هنا مفيش زيه','فين أيامك يا '+heroName,'الماتش النهارده الساعة كام؟']), 2.6); } }
  }
  // traffic
  for (const c of traffic){
    const u = c.userData; let target = u.base;
    for (const o of traffic){ if (o === c) continue; const w = o.userData; if (w.axis !== u.axis || w.road !== u.road || w.dir !== u.dir) continue; const ahead = (w.s - u.s) * u.dir; if (ahead > 0 && ahead < 10) target = Math.min(target, ahead < 6 ? 0 : w.speed); }
    if (hero.veh){ const L = carLocal(c, hero.veh.pos); if (L.along > 0 && L.along < 9 && Math.abs(L.lat) < 1.8) target = 0; }
    u.speed += (target - u.speed) * damp(3, dt); u.s += u.speed * u.dir * dt;
    if (u.s * u.dir > HALF + 25) u.s = -(HALF + 25) * u.dir;
    placeTraffic(c);
    if (playing && Math.random() < dt*.02 && c.position.distanceTo(hero.pos) < 30) horn();
  }
  npcs.forEach(n => updateNPC(n, dt));
  if (playing){ updateEnemy(dt); updateWanted(dt); updateThief(dt, t); }
  updatePhotoSeats(dt, t);
  // cash animation
  for (const c of cash){ if (!c.g.visible) continue; if (c.taken){ c.pop += dt; c.g.position.y = c.pop*6; c.g.scale.setScalar(Math.max(0, 1 - c.pop*2.5)); if (c.pop > .4) c.g.visible = false; continue; } c.st.rotation.y = t*1.6; c.st.position.y = 1 + Math.sin(t*2.4 + c.x)*.15; }
  // hero visuals
  const hd = hero.d;
  if (hero.veh){
    const v = hero.veh;
    if (v.type === 'moto'){ hd.root.visible = true; hd.P.legL.visible = hd.P.legR.visible = false; hd.root.position.set(v.pos.x - Math.sin(v.yaw)*.25, v.pos.y + .86 - hd.hipY, v.pos.z - Math.cos(v.yaw)*.25); animDoll(hd, 0, 0, dt, t); }
    else hd.root.visible = false;
  } else { hd.root.visible = !ST.kind; hd.P.legL.visible = hd.P.legR.visible = true; hd.root.position.copy(hero.pos); animDoll(hd, hero.vel.x, hero.vel.z, dt, t); hd.doll.visible = !(hero.inv > 0 && Math.floor(hero.inv*12) % 2 === 1); }
  if (enemy.active) animDoll(enemy.d, enemy.vel.x, enemy.vel.z, dt, t);
  if (wanted.active) animDoll(wanted.d, wanted.vx||0, wanted.vz||0, dt, t);
  if (trayGroup.visible){ trayGroup.position.set(hero.pos.x + Math.cos(camYaw)*.45, hero.pos.y + 1.2, hero.pos.z - Math.sin(camYaw)*.45); }
  updateCamera(dt);
  updateBubbles(dt); updateSteam(dt);
  // crowd ambience
  if (crowdGain){ const near = playing ? npcs.filter(n => n.state !== 'hidden' && n.g.position.distanceTo(hero.pos) < 18).length : 0; crowdGain.gain.value += ((muted ? 0 : Math.min(.05, near*.006)) - crowdGain.gain.value) * damp(2, dt); }
  if (playing){
    computeAction();
    const pr = $('prompt'); if (nearAction){ pr.innerHTML = `<kbd>E</kbd>${nearAction.text}`; pr.classList.add('show'); } else pr.classList.remove('show');
    if (bannerT > 0){ bannerT -= dt; if (bannerT <= 0) $('banner').className = 'banner'; }
    if (chaser.active && bannerT <= 0) banner('🚨 البوليس وراك!', 'police', 1.5);
    hudT -= dt; if (hudT <= 0){ hudT = .2; updateHud(); if (modeObj.hud) $('objText').innerHTML = modeObj.hud(); if (modeObj.hudTitle) $('objTitle').textContent = modeObj.hudTitle(); }
    drawRadar(t);
  }
}
let hudT = 0;

addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
hero.pos.copy(SPOT.spawn); resetWorld(); seatDeco(WALKERS);
camera.position.set(SPOT.spawn.x + 6, 5, SPOT.spawn.z + 9); lookAt.copy(SPOT.spawn);
const clock = new THREE.Clock(); let elapsed = 0;
let fpsAcc = 0, fpsN = 0, pxr = renderer.getPixelRatio();
renderer.setAnimationLoop(() => { const raw = clock.getDelta(), dt = Math.min(raw, .05); elapsed += dt; update(dt, elapsed); renderer.render(scene, camera);
  if (state === 'play'){ fpsAcc += raw; fpsN++; if (fpsN >= 150){ const avg = fpsAcc/fpsN; if (avg > 1/30 && pxr > .8){ pxr = Math.max(.8, pxr - .2); renderer.setPixelRatio(pxr); renderer.setSize(innerWidth, innerHeight); } else if (avg > 1/24 && sun.castShadow){ sun.castShadow = false; } fpsAcc = 0; fpsN = 0; } } });
renderModes();
$('loadMsg').textContent = 'اختار مود وابدأ.';
window.__game = { hero, enemy, wanted, vehicles, npcs, keys, get state(){ return state; }, get mode(){ return modeObj; }, startMode, action, punch, dbg: { ST, AH, FL, DOM, ahwaTap, ahwaHold, foulTap, stationBtn, enterStation, exitStation, openDomino, playerPick, SA, SF, get SAVE(){ return SAVE; }, completeMission, startJob, endJob, race, buyVehicle, MISSIONS, startRace, openShop, renderModes, thief, thiefStart, thiefCaught, islamD, CAM }, step(n=60){ for (let i=0;i<n;i++){ elapsed += 1/60; update(1/60, elapsed); } renderer.render(scene, camera); } };
