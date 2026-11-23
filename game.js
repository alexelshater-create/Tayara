// ---- 00-setup.js ----
import * as THREE from 'three';
import { Sky } from 'three/addons/Sky.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';

// loading bar on the main menu: the buttons stay dim and can't be pressed until loadDone() (end of 24-main-update)
const loadStep = (p, msg) => { const f = document.getElementById('loadFill'); if (f) f.style.width = Math.round(Math.min(1, p) * 100) + '%'; if (msg){ const m = document.getElementById('loadMsg'); if (m) m.textContent = msg; } };
loadStep(.1, 'بيجهّز الحتة…');
const CH = await (await fetch('assets/chars.json')).json();
const $ = id => document.getElementById(id);
const store = { get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch(e){} } };
document.querySelectorAll('[data-face]').forEach(e => e.style.backgroundImage = `url(${CH.hero.img.face})`);
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');
// graphics level (settings): خفيف / عادي / عالي. First run picks it from the device: weak phones خفيف, other phones عادي, computers عالي.
const GFX_AUTO = isTouch ? (((navigator.hardwareConcurrency || 4) <= 6 || (navigator.deviceMemory || 4) <= 4) ? 'low' : 'mid') : ((navigator.hardwareConcurrency || 8) <= 4 ? 'mid' : 'high');
const GFX_URL = new URLSearchParams(location.search).get('gfx');   // ?gfx=low for testing
let GFX = ['low', 'mid', 'high'].includes(GFX_URL) ? GFX_URL : ['low', 'mid', 'high'].includes(store.get('ty_gfx')) ? store.get('ty_gfx') : GFX_AUTO;
const LOW = GFX === 'low'; const WALKERS = GFX === 'low' ? 8 : GFX === 'mid' ? 12 : 16;
if (store.get('ty_name')) $('nameIn').value = store.get('ty_name');
try { await Promise.race([document.fonts.load('900 40px Cairo'), new Promise(r => setTimeout(r, 1800))]); } catch(e){}
loadStep(.18, 'بيبني الشوارع…');

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
renderer.setPixelRatio(1);   // set by applyGfx() below
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.86;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd8cbb3, 55, 205);
const camera = new THREE.PerspectiveCamera(46, innerWidth/innerHeight, 0.1, 900);
const sky = new Sky(); sky.scale.setScalar(4000); scene.add(sky);
const su = sky.material.uniforms;
su.turbidity.value = 9; su.rayleigh.value = 1.1; su.mieCoefficient.value = 0.006; su.mieDirectionalG.value = 0.82;
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90-33), THREE.MathUtils.degToRad(38));
su.sunPosition.value.copy(sunDir);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
const hemi = new THREE.HemisphereLight(0xd9e4f0, 0x7a6650, 0.42); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe3bd, 2.9);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left:-45, right:45, top:45, bottom:-45, near:1, far:280 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

// graphics level: خفيف = no sun shadows (the soft blob under each character stays), sharpness 1, shorter view;
// عادي = shadows near you, sharpness up to 1.5; عالي = sharper shadows over a wider area, sharpness up to 2
function applyGfx(){
  const q = GFX, dpr = window.devicePixelRatio || 1;
  renderer.setPixelRatio(Math.min(dpr, q === 'low' ? 1 : q === 'mid' ? 1.5 : 2));
  const sh = q !== 'low';
  if (renderer.shadowMap.enabled !== sh){ renderer.shadowMap.enabled = sh; scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); }); }
  sun.castShadow = sh;
  const ms = q === 'high' ? 2048 : 1024, ext = q === 'high' ? 45 : 30;
  if (sun.shadow.mapSize.x !== ms){ sun.shadow.mapSize.set(ms, ms); if (sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; } }
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext }); sun.shadow.camera.updateProjectionMatrix();
  scene.fog.near = q === 'low' ? 40 : 55; scene.fog.far = q === 'low' ? 150 : 205;
  camera.far = scene.fog.far + 25; camera.updateProjectionMatrix();        // nothing past the fog is drawn
  renderer.setSize(innerWidth, innerHeight);
}
applyGfx();

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
  // Alexandria: old pastel buildings, tall arched windows, green / blue / brown wooden shutters, salt-washed paint
  {wall:'#e7cf86', trim:'#f7ecd2', sh:'#2f6b4f', arch:true}, {wall:'#a9c7d6', trim:'#eef2ee', sh:'#2e4f7a', arch:true},
  {wall:'#e3b7a6', trim:'#f6e6dc', sh:'#6b4a33', arch:true}, {wall:'#cfdcc2', trim:'#f2f1e6', sh:'#355e3b', arch:true},
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
    if (S.arch){
      // a cornice under each floor, a tall window with a round top, shutters (often half open)
      g.fillStyle=S.trim; g.fillRect(x, y+fh-10, bw, 7); g.fillStyle='rgba(0,0,0,.12)'; g.fillRect(x, y+fh-3, bw, 3);
      const ax=x+34, aw=bw-68, ay=y+20, ah=fh-38, r=aw/2;
      const arch = () => { g.beginPath(); g.moveTo(ax, ay+ah); g.lineTo(ax, ay+r); g.arc(ax+r, ay+r, r, Math.PI, 0); g.lineTo(ax+aw, ay+ah); g.closePath(); };
      g.save(); g.translate(0,0); g.fillStyle=S.trim; g.beginPath(); g.moveTo(ax-6, ay+ah+5); g.lineTo(ax-6, ay+r); g.arc(ax+r, ay+r, r+6, Math.PI, 0); g.lineTo(ax+aw+6, ay+ah+5); g.closePath(); g.fill(); g.restore();
      const rr = Math.random();
      if (rr < .45){ arch(); g.fillStyle=S.sh; g.fill(); g.strokeStyle='rgba(0,0,0,.3)'; g.lineWidth=1.4; for (let k=ay+r;k<ay+ah;k+=5){ g.beginPath(); g.moveTo(ax+2,k); g.lineTo(ax+aw-2,k); g.stroke(); } g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(ax+aw/2-1, ay+r*.3, 2, ah-r*.3); }
      else { arch(); const gr=g.createLinearGradient(ax,ay,ax+aw,ay+ah); gr.addColorStop(0,'#6f8794'); gr.addColorStop(1,'#1c262e'); g.fillStyle=gr; g.fill(); g.fillStyle=S.sh; g.fillRect(ax-15, ay+r*.6, 12, ah-r*.6); g.fillRect(ax+aw+3, ay+r*.6, 12, ah-r*.6); if (Math.random()<.4){ g.fillStyle=`hsl(${Math.random()*360|0},45%,60%)`; g.fillRect(ax+4, ay+ah-26, aw-8, 20); } }
      g.fillStyle='rgba(255,255,255,.07)'; for (let k=0;k<3;k++) g.fillRect(x+Math.random()*bw, y+Math.random()*fh, 20+Math.random()*30, 10+Math.random()*20);
      const st2=g.createLinearGradient(0,ay+ah,0,ay+ah+34); st2.addColorStop(0,'rgba(60,50,30,.2)'); st2.addColorStop(1,'rgba(60,50,30,0)'); g.fillStyle=st2; g.fillRect(ax,ay+ah+4,aw,34);
      continue;
    }
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
// The map is a grid of 48 m blocks: 8 across (x) and 5 down (z).
// Columns 0-3 / rows 0-3 are «الحتة», columns 4-5 the market (north) and restaurants (south),
// columns 6-7 the stadium area (north) and workshops (south). Row 4 is the corniche on the sea (Alexandria, بحري);
// a bridge runs out over the water to the fort (FAR, see 04b-alexandria.js).
const PITCH = 48, NXB = 8, NZB = 5, X0 = -96, Z0 = -96;
const ROADS_X = [...Array(NXB+1)].map((_,i) => X0 + i*PITCH);   // north-south roads: -96 … 288
const ROADS_Z = [...Array(NZB+1)].map((_,k) => Z0 + k*PITCH);   // east-west roads:  -96 … 144
const XMAX = ROADS_X[NXB], ZMAX = ROADS_Z[NZB];
const N = 4, HALF = 96, ROADS = ROADS_X.slice(0, 5);             // legacy names used by the old cash mode
const BW = PITCH - 12, LIMIT = HALF + 5.5;
const NILE_Z = ZMAX + 10;                                        // the river bank (promenade railing)
const BRIDGE = { x: 96, z1: 262, w: 13 };
const FAR = { x0: 50, x1: 142, z0: 258, z1: 312 };   // the fort's spit of land
const PIER = { x0: 269, x1: 275, z0: NILE_Z - 1, z1: 192 };   // the harbour pier (04b)
function inWorld(x, z){
  if (x > X0 - 5.5 && x < XMAX + 5.5 && z > Z0 - 5.5 && z < NILE_Z - .4) return true;
  if (Math.abs(x - BRIDGE.x) < BRIDGE.w/2 - .6 && z >= NILE_Z - 1 && z <= BRIDGE.z1 + 1) return true;
  if (x > FAR.x0 && x < FAR.x1 && z > FAR.z0 && z < FAR.z1) return true;
  if (x > PIER.x0 + .5 && x < PIER.x1 - .5 && z >= PIER.z0 && z < PIER.z1 - .4) return true;
  return false;
}
const DISTRICT_NAMES = { hara: 'الحتة', market: 'السوق', food: 'شارع المطاعم', stadium: 'الملعب', works: 'منطقة الورش', corniche: 'الكورنيش', bridge: 'كوبري القلعة', bank: 'القلعة' };
function blockDistrict(i, k){ if (k === 4) return 'corniche'; if (i <= 3) return 'hara'; if (i <= 5) return k <= 1 ? 'market' : 'food'; return k <= 1 ? 'stadium' : 'works'; }
function districtAt(x, z){
  if (z > FAR.z0 - 2) return 'bank'; if (z >= NILE_Z - 1) return 'bridge';
  const i = clamp(Math.floor((x - X0)/PITCH), 0, NXB-1), k = clamp(Math.floor((z - Z0)/PITCH), 0, NZB-1); return blockDistrict(i, k);
}
const CAFE = { cx: 24, cz: 24 };
const SPOT = {
  spawn: new THREE.Vector3(17, 0, 36.5), counter: new THREE.Vector3(21, 0, 22.6), domino: new THREE.Vector3(30, 0, 25.5),
  cart: new THREE.Vector3(34.5, 0, 31), cartHero: new THREE.Vector3(34.5, 0, 29.7), policeSpawn: new THREE.Vector3(32, 0, 40.2),
  house: new THREE.Vector3(-24, .15, 88.4), azzouz: new THREE.Vector3(120, .15, 40.4), workshop: new THREE.Vector3(264, .15, 88.4),
  stadium: new THREE.Vector3(216, .15, -7.6), wedding: new THREE.Vector3(-72, .15, 33), cornicheView: new THREE.Vector3(150, .15, 152),
  bridgeMid: new THREE.Vector3(96, 0, 205), market: new THREE.Vector3(144, .15, -48),
};
const STOPS = [
  { id: 'hara', name: 'الحتة · قهوة قصر الملوك', pos: new THREE.Vector3(40.4, .15, 40.4) },
  { id: 'house', name: 'بيت طيارة', pos: new THREE.Vector3(-8.4, .15, 88.4) },
  { id: 'market', name: 'السوق', pos: new THREE.Vector3(120, .15, -7.6) },
  { id: 'food', name: 'شارع المطاعم · عزوز', pos: new THREE.Vector3(136.4, .15, 40.4) },
  { id: 'stadium', name: 'الملعب', pos: new THREE.Vector3(232, .15, -7.6) },
  { id: 'works', name: 'منطقة الورش', pos: new THREE.Vector3(248, .15, 88.4) },
  { id: 'corniche', name: 'الكورنيش', pos: new THREE.Vector3(170, .15, 151.6) },
];
const TABLES = [[12,26.5],[17,26.5],[22,26.5],[12,32],[17,32],[22,32]];
const SEATS = TABLES.flatMap(([x,z],ti) => [{x:x-.85,z,ry:Math.PI/2,ti},{x:x+.85,z,ry:-Math.PI/2,ti}]);

// ground, asphalt and the river
const groundMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 });
{ const g = new THREE.Mesh(new THREE.PlaneGeometry(1600, 900), groundMat); g.rotation.x = -Math.PI/2; g.position.set(96, -.02, NILE_Z - 450); g.receiveShadow = true; scene.add(g);
}
asphaltTex.repeat.set((XMAX - X0 + 14)/10, (ZMAX - Z0 + 14)/10);
const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(XMAX - X0 + 14, ZMAX - Z0 + 13), new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: .93, envMapIntensity: .3 }));
asphalt.rotation.x = -Math.PI/2; asphalt.position.set((X0 + XMAX)/2, 0, (Z0 + ZMAX)/2 + .5); asphalt.receiveShadow = true; scene.add(asphalt);
const waterTex = makeTex(256,256,(g,w,h)=>{ g.fillStyle='#1f6f8b'; g.fillRect(0,0,w,h); for (let i=0;i<1400;i++){ g.strokeStyle=`rgba(${180+Math.random()*60|0},${210+Math.random()*40|0},230,${.05+Math.random()*.12})`; g.lineWidth=1+Math.random()*2; const x=Math.random()*w, y=Math.random()*h; g.beginPath(); g.moveTo(x,y); g.quadraticCurveTo(x+8,y-3,x+16+Math.random()*14,y); g.stroke(); } }, [60, 12]);
const water = new THREE.Mesh(new THREE.PlaneGeometry(2600, 1700), new THREE.MeshStandardMaterial({ map: waterTex, color: 0x8fd0e0, roughness: .1, metalness: .3, envMapIntensity: 1.3 }));
waterTex.repeat.set(2600/14, 1700/14);
water.rotation.x = -Math.PI/2; water.position.set(96, -1.1, NILE_Z + 850); water.receiveShadow = true; scene.add(water);
{ const bankMat = new THREE.MeshStandardMaterial({ color: 0x8f8573, roughness: .95 });
  for (const z of [NILE_Z + .2]){ const wall = new THREE.Mesh(new THREE.BoxGeometry(1600, 1.4, .6), bankMat); wall.position.set(96, -.55, z); scene.add(wall); } }

const obstacles = [], buildings = [], blocksInfo = [];
const treeList = [], lampList = [], whiteMarks = [], yellowMarks = [], parkedSpots = [];
const doors = [], noEntry = [], posters = [], signs = shopNames.map(() => []);
const palmList = [], benchList = [], stallLists = [[], [], []], tireList = [], drumList = [], outTables = [];
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
  const b = { grp, mats:[fm,rm,bm,dm], box:new THREE.Box3().setFromObject(grp), opacity:1, cx, cz, w, d, faces: opts.faces || [], floors };
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
    const pool = opts.signPool || signs; if (!opts.noSign && along > 6.5) pool[Math.floor(rng()*pool.length)].push(place(R(-along/2+3, along/2-3), 3.32, .12));
  }
  return b;
}

// district textures
const foodNames = [['مطعم عزوز للبيتزا','#b3121f'],['كبابجي الملك','#5a2d0c'],['حلواني النور','#c2185b'],['شاورما الريس','#1b5e20'],['فطاطري السلطان','#e65100'],['كشري أبو طارق','#4e342e'],['مطعم فول وطعمية','#827717'],['عصير قصب الحرية','#2e7d32']];
const foodSignTex = foodNames.map(([t,c]) => { const tx = makeTex(640,100,(g,w,h)=>{ g.fillStyle=c; g.fillRect(0,0,w,h); g.strokeStyle='#fff3b0'; g.lineWidth=6; g.strokeRect(4,4,w-8,h-8); arText(g, t, w/2, h/2+3, 50, '#fffbe8'); }); tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping; return tx; });
const foodSigns = foodNames.map(() => []);
const garageBand = makeTex(768,232,(g,w,h)=>{
  g.fillStyle='#4a4540'; g.fillRect(0,0,w,h); grain(g,w,h,9000,.18);
  for (let b=0;b<3;b++){ const x=b*256;
    if (b===1){ g.fillStyle='#16130f'; g.fillRect(x+8,40,240,182); g.fillStyle='#3a3a3a'; g.fillRect(x+40,150,170,60); g.fillStyle='#222'; g.beginPath(); g.arc(x+70,212,18,0,7); g.arc(x+180,212,18,0,7); g.fill(); g.fillStyle='rgba(255,200,80,.25)'; g.fillRect(x+8,40,240,30); }
    else { g.fillStyle='#7a7d80'; g.fillRect(x+8,40,240,182); g.strokeStyle='rgba(0,0,0,.35)'; for (let y=44;y<222;y+=7){ g.beginPath(); g.moveTo(x+8,y); g.lineTo(x+248,y); g.stroke(); } g.fillStyle='rgba(90,60,30,.35)'; g.fillRect(x+30+Math.random()*80,120,60,90); }
  }
  g.fillStyle='#2a2622'; g.fillRect(0,0,w,36);
});
const azzouzBand = makeTex(768,232,(g,w,h)=>{
  g.fillStyle='#3b1a12'; g.fillRect(0,0,w,h);
  const gr=g.createLinearGradient(0,50,0,232); gr.addColorStop(0,'#ffcf7a'); gr.addColorStop(1,'#b04a1e'); g.fillStyle=gr; g.fillRect(10,48,w-20,174);
  g.fillStyle='#5a2a14'; g.beginPath(); g.arc(384,200,90,Math.PI,0); g.fill(); g.fillStyle='#ff7a1a'; g.beginPath(); g.arc(384,200,60,Math.PI,0); g.fill();
  for (let i=0;i<6;i++){ g.fillStyle='#f2e2c0'; g.beginPath(); g.arc(70+i*42,150,16,0,7); g.fill(); g.fillStyle='#c0392b'; g.beginPath(); g.arc(70+i*42,150,11,0,7); g.fill(); }
  g.fillStyle='#2a120a'; g.fillRect(0,0,w,46);
});
const houseBand = makeTex(768,232,(g,w,h)=>{ g.fillStyle='#8a5a40'; g.fillRect(0,0,w,h); grain(g,w,h,12000,.2); g.strokeStyle='rgba(50,22,12,.35)'; for (let y=0;y<h;y+=9){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); } g.fillStyle='rgba(30,20,10,.35)'; g.fillRect(120,90,90,70); g.fillRect(560,90,90,70); g.fillStyle='#6b6f73'; g.fillRect(124,94,82,62); g.fillRect(564,94,82,62); });
const bigSign = (text, bg, fg, w=1024, h=180, size=86) => { const t = makeTex(w,h,(g)=>{ g.fillStyle=bg; g.fillRect(0,0,w,h); g.strokeStyle=fg; g.lineWidth=10; g.strokeRect(8,8,w-16,h-16); arText(g, text, w/2, h/2+6, size, fg); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };
function signBoard(tex, x, y, z, w, h, ry=0, glow=.35){ const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: glow, roughness: .6 })); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; }
const glowSigns = [];

// ---- blocks ----
for (let j=0;j<NXB;j++) for (let k=0;k<NZB;k++){
  const cx = X0 + PITCH/2 + j*PITCH, cz = Z0 + PITCH/2 + k*PITCH, dist = blockDistrict(j, k);
  let type = 'city'; const r = rng();
  if (dist === 'hara'){ if (j===2 && k===2) type = 'cafe'; else if (j===1 && k===3) type = 'house'; else if (j===0 && k===2) type = 'wedding'; else if (r < .1) type = 'park'; else if (r < .17) type = 'parking'; }
  else if (dist === 'stadium' && j === 6 && k === 1) type = 'pitch';
  else if (dist === 'works' && j === 7 && k === 3) type = 'workshop';
  else if (dist === 'food' && j === 4 && k === 2) type = 'azzouz';
  else if (dist === 'corniche') type = j === 3 ? 'fishmarket' : j === 7 ? 'port' : 'corniche';
  else if (dist === 'stadium' && j === 6 && k === 0) type = 'showroom';
  else if (dist === 'stadium' && j === 7 && k === 0) type = 'villa';
  else type = dist;
  blocksInfo.push({ cx, cz, type, dist, j, k });
  const slab = new THREE.Mesh(slabGeo, slabMats); slab.position.set(cx, .075, cz); slab.receiveShadow = true; scene.add(slab);
  const rowsOf = (floorsMin, floorsMax, styles, extra={}) => {
    const rows = [[cz-15, cz-.3], [cz+.3, cz+15]];
    rows.forEach(([z0,z1], ri) => {
      if (extra.skipRow === ri) return;
      const n = rng() < .55 ? 2 : 3; let x = cx - 15; const widths = [];
      let rem = 30; for (let i=0;i<n;i++){ const wv = i===n-1 ? rem : R(8, rem - 8*(n-1-i)); widths.push(wv); rem -= wv; }
      widths.forEach((wv, i) => {
        const bw = wv - .5, bd = (z1-z0) - R(0, 1.5);
        const bz = ri === 0 ? z0 + bd/2 : z1 - bd/2;
        const faces = [ri === 0 ? 'nz' : 'pz']; if (i===0) faces.push('nx'); if (i===n-1) faces.push('px');
        addBuilding(x + wv/2, bz, bw, bd, Math.floor(R(floorsMin, floorsMax)), pick(styles), { faces, ...extra });
        x += wv;
      });
    });
  };
  const ALL = [0,1,2,3,4,5,6,7,8,9];
  const sidewalkRing = (fn, step=5, prob=.6) => { const off = BW/2 - 1.6; for (const side of [[0,1],[0,-1],[1,0],[-1,0]]) for (let t=-14; t<=14; t+=step) if (rng() < prob) fn(side[0] ? { x: cx+side[0]*off, z: cz+t, ry: side[0] > 0 ? Math.PI/2 : -Math.PI/2 } : { x: cx+t, z: cz+side[1]*off, ry: side[1] > 0 ? 0 : Math.PI }); };
  if (type === 'park'){
    const g = new THREE.Mesh(new THREE.BoxGeometry(BW-6, .06, BW-6), new THREE.MeshStandardMaterial({ map: parkTex, roughness: 1 })); g.position.set(cx, .18, cz); g.receiveShadow = true; scene.add(g);
    for (let i=0;i<12;i++) treeList.push({ x: cx+R(-12,12), z: cz+R(-12,12), s: R(.9,1.5) });
    for (let i=0;i<4;i++) benchList.push({ x: cx + R(-10,10), z: cz + R(-10,10), ry: pick([0, Math.PI/2, Math.PI, -Math.PI/2]), y: .2 });
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
    addBuilding(17.5, 15.5, 16, 12, 5, 1, { bandTex: cafeBand, faces:['pz','nz','nx'], doorU: 0, noSign: true, noPoster: true });
    addBuilding(33, 15.5, 11.5, 12, 7, 2, { faces:['pz','nz','px'] });
    glowSigns.push(signBoard(cafeSignTex, 17.5, 3.0, 21.65, 11, 1.9));
    const aw = new THREE.Mesh(new THREE.BoxGeometry(14, .08, 2.6), new THREE.MeshStandardMaterial({ color: 0x1d6b44, roughness: .8 })); aw.position.set(17.5, 3.75, 22.9); aw.rotation.x = .18; aw.castShadow = true; aw.name = 'cafeAwning'; scene.add(aw);
  } else if (type === 'house'){
    // طيارة's run-down house in the middle of the south row, with neighbours either side
    addBuilding(-24, 80.5, 9, 11, 2, 5, { bandTex: houseBand, faces: [], noDoor: true });
    addBuilding(-35, 79.5, 12.5, 13, 5, 4, { faces: ['pz','nx'] });
    addBuilding(-13, 79.5, 12.5, 13, 6, 1, { faces: ['pz','px'] });
    rowsOf(4, 9, ALL, { skipRow: 1 });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.3), new THREE.MeshStandardMaterial({ map: doorTex, roughness: .8, color: 0xb8a48c })); door.position.set(-24, 1.3, 86.08); scene.add(door);
    glowSigns.push(signBoard(bigSign('بيت طيارة','#f3ecd8','#5a2a14',512,120,64), -24, 2.85, 86.1, 2.2, .52, 0, .15));
  } else if (type === 'wedding'){
    // the street where إسلام's wedding happens: open square with buildings on the north row
    // north row: إسلام's family house in the middle (04b puts its sign and door), a neighbour each side
    addBuilding(cx - 10.5, cz - 8.5, 8.5, 13, 5, 7, { faces: ['pz', 'nx'] });
    addBuilding(cx, cz - 8.5, 11.5, 13, 4, 8, { faces: ['pz'], noDoor: true, noSign: true, noPoster: true });
    addBuilding(cx + 10.5, cz - 8.5, 8.5, 13, 6, 6, { faces: ['pz', 'px'] });
    const g = new THREE.Mesh(new THREE.BoxGeometry(BW-6, .04, 14), new THREE.MeshStandardMaterial({ color: 0x9c6b4c, roughness: .9 })); g.position.set(cx, .17, cz + 8); g.receiveShadow = true; scene.add(g);
    for (let i=0;i<6;i++) treeList.push({ x: cx - 13 + i*5.2, z: cz + 15.5, s: .85 });
  } else if (type === 'market'){
    rowsOf(3, 6, [0,1,3,5]);
    sidewalkRing(p => stallLists[Math.floor(rng()*3)].push({ ...p, y: .15 }), 4.2, .7);
  } else if (type === 'food' || type === 'azzouz'){
    if (type === 'azzouz'){
      addBuilding(120, 33.5, 13, 11, 4, 3, { bandTex: azzouzBand, faces: ['pz'], doorU: 0, noSign: true, noPoster: true });
      glowSigns.push(signBoard(bigSign('🍕 مطعم عزوز للبيتزا','#b3121f','#fff3c4'), 120, 3.1, 39.12, 11, 1.9, 0, .5));
      addBuilding(106.5, 33.5, 12.5, 11, 6, 0, { faces: ['pz','nx'], signPool: foodSigns });
      addBuilding(133.5, 33.5, 12.5, 11, 5, 2, { faces: ['pz','px'], signPool: foodSigns });
      rowsOf(4, 9, ALL, { skipRow: 1, signPool: foodSigns });
    } else rowsOf(4, 9, ALL, { signPool: foodSigns });
    sidewalkRing(p => outTables.push(p), 6, .35);
  } else if (type === 'works' || type === 'workshop'){
    if (type === 'workshop'){
      addBuilding(264, 79, 18, 14, 2, 4, { bandTex: garageBand, faces: ['pz'], noDoor: true, noSign: true, noPoster: true });
      glowSigns.push(signBoard(bigSign('ورشة الأسطى شمس 🔧','#20262c','#ffb74d'), 264, 3.1, 86.2, 10, 1.75, 0, .3));
      rowsOf(1, 3, [3,4,5], { bandTex: garageBand, skipRow: 1, noSign: true });
    } else rowsOf(1, 3, [3,4,5], { bandTex: garageBand, noSign: true });
    sidewalkRing(p => (rng() < .5 ? tireList : drumList).push({ ...p, y: .15 }), 3.5, .5);
  } else if (type === 'pitch'){
    const pt = makeTex(512,340,(g,w,h)=>{ for (let i=0;i<10;i++){ g.fillStyle = i%2 ? '#3f8f3a' : '#4aa244'; g.fillRect(i*w/10,0,w/10,h); } g.strokeStyle='rgba(255,255,255,.9)'; g.lineWidth=5; g.strokeRect(14,14,w-28,h-28); g.beginPath(); g.moveTo(w/2,14); g.lineTo(w/2,h-14); g.stroke(); g.beginPath(); g.arc(w/2,h/2,44,0,7); g.stroke(); g.strokeRect(14,h/2-70,70,140); g.strokeRect(w-84,h/2-70,70,140); });
    pt.wrapS = pt.wrapT = THREE.ClampToEdgeWrapping;
    const f = new THREE.Mesh(new THREE.BoxGeometry(32, .06, 22), new THREE.MeshStandardMaterial({ map: pt, roughness: .95 })); f.position.set(cx, .18, cz); f.receiveShadow = true; scene.add(f);
    const gp = []; for (const s of [-1,1]){ const gx = cx + s*15.2; box(gp, .14,2.2,.14, gx,1.25,cz-3, '#ffffff'); box(gp, .14,2.2,.14, gx,1.25,cz+3, '#ffffff'); box(gp, .14,.14,6.1, gx,2.35,cz, '#ffffff'); }
    for (let t=-16; t<=16; t+=2){ box(gp, .08,1.6,.08, cx+t,.95,cz-12, '#556'); box(gp, .08,1.6,.08, cx+t,.95,cz+12, '#556'); }
    for (const [x,z] of [[-17,-12],[17,-12],[-17,12],[17,12]]){ box(gp, .3,9,.3, cx+x,4.65,cz+z, '#666'); box(gp, 1.6,.8,.4, cx+x,9.2,cz+z, '#eee'); }
    const gm = new THREE.Mesh(mergeGeometries(gp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .3 })); gm.castShadow = true; scene.add(gm);
    obstacles.push({ minX: cx-16, maxX: cx+16, minZ: cz-12.2, maxZ: cz-11.8 });
  } else if (type === 'port' || type === 'showroom'){
    // built in 04b-alexandria.js
  } else if (type === 'villa'){
    // العربي's family villa (04b builds it): a walled garden, nothing else on this block
  } else if (type === 'fishmarket'){
    // حلقة السمك: tall buildings at the back, the covered fish market on the sea side
    const n = 3; let x = cx - 15; for (let i=0;i<n;i++){ const wv = 10; addBuilding(x + wv/2, cz - 8.5, wv - .6, 12, Math.floor(R(7, 12)), pick([6,7,8,9]), { faces: ['nz', ...(i===0?['nx']:[]), ...(i===n-1?['px']:[])], noPoster: true }); x += wv; }
    const fp = [];
    for (const sx of [-12, -4, 4, 12]) for (const sz of [3, 12]){
      box(fp, 6.4, .9, 2.2, cx + sx, .6, cz + sz, '#cfd6da');                              // the stall (steel)
      box(fp, 6.2, .08, 2.0, cx + sx, 1.07, cz + sz, '#e8f4f8');                            // ice
      for (let f = 0; f < 7; f++) box(fp, .55, .1, .16, cx + sx - 2.6 + f*.85, 1.16, cz + sz + R(-.6,.6), pick(['#9fb0bc','#c0ccd4','#d98a6a','#8a98a4']), R(-.4,.4));   // fish
      for (const px of [-3, 3]) for (const pz of [-1, 1]) box(fp, .12, 3.2, .12, cx + sx + px, 1.75, cz + sz + pz*1.4, '#4a4f55');
      box(fp, 7, .1, 3.4, cx + sx, 3.4, cz + sz, pick(['#1f5fa8','#c0392b','#2e7d32','#e0a21a']));   // awning
      obstacles.push({ minX: cx + sx - 3.2, maxX: cx + sx + 3.2, minZ: cz + sz - 1.1, maxZ: cz + sz + 1.1 });
    }
    const fm = new THREE.Mesh(mergeGeometries(fp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .25 })); fm.castShadow = true; fm.receiveShadow = true; scene.add(fm);
    glowSigns.push(signBoard(bigSign('🐟 حلقة السمك','#0d3b66','#f4d35e',768,150,74), cx, 4.6, cz + 16.6, 9, 1.75, 0, .35));
    for (const sx of [-4.5, 4.5]){ const pp = []; box(pp, .25, 5.2, .25, cx + sx, 2.6, cz + 16.6, '#2b2f33'); scene.add(new THREE.Mesh(mergeGeometries(pp), new THREE.MeshStandardMaterial({ vertexColors: true }))); }
  } else if (type === 'corniche'){
    // tall nicer buildings on the north half, a palm promenade on the south half
    const n = 3; let x = cx - 15; for (let i=0;i<n;i++){ const wv = 10; addBuilding(x + wv/2, cz - 8.5, wv - .6, 12, Math.floor(R(8, 15)), pick([0,2,3,4,6,7,8,9]), { faces: ['nz', ...(i===0?['nx']:[]), ...(i===n-1?['px']:[])], noPoster: true }); x += wv; }
    for (let t=-14; t<=14; t+=7){ palmList.push({ x: cx+t, z: cz+5, s: R(.9,1.15) }); palmList.push({ x: cx+t+3.5, z: cz+13, s: R(.9,1.15) }); benchList.push({ x: cx+t+1.8, z: cz+9, ry: Math.PI, y: .15 }); }
  } else {
    rowsOf(4, 11, ALL);
    for (const side of [[0,1],[0,-1],[1,0],[-1,0]]) for (let t=-12;t<=12;t+=8) if (rng()<.4){ const off = BW/2 - 1.5; treeList.push(side[0] ? { x: cx+side[0]*off, z: cz+t, s:R(.75,1.05) } : { x: cx+t, z: cz+side[1]*off, s:R(.75,1.05) }); }
  }
}

// river promenade, palms and benches along the Nile, and the bridge
{ const pv = paveTex.clone(); pv.needsUpdate = true; pv.repeat.set((XMAX - X0 + 12)/3, (NILE_Z - ZMAX - 6)/3); const pm = new THREE.MeshStandardMaterial({ map: pv, roughness: .95 }); const sideM = slabMats[0];
  for (const [xa, xb] of [[X0 - 6, BRIDGE.x - BRIDGE.w/2], [BRIDGE.x + BRIDGE.w/2, XMAX + 6]]){ const pr = new THREE.Mesh(new THREE.BoxGeometry(xb - xa, .15, NILE_Z - ZMAX - 6), [sideM, sideM, pm, pm, sideM, sideM]); pr.position.set((xa+xb)/2, .075, (ZMAX + 6 + NILE_Z)/2); pr.receiveShadow = true; scene.add(pr); } }
for (let x = X0 - 4; x <= XMAX + 4; x += 9){ if (Math.abs(x - BRIDGE.x) < 9) continue; palmList.push({ x, z: NILE_Z - 2.4, s: R(.95,1.2) }); if (rng() < .5) benchList.push({ x: x + 4.5, z: NILE_Z - 1.6, ry: 0, y: 0 }); }
{
  const rp = [];
  for (let x = X0 - 6; x <= XMAX + 6; x += 2.4){ if (Math.abs(x - BRIDGE.x) < BRIDGE.w/2) continue; box(rp, .1,1,.1, x,.5,NILE_Z - .5, '#2b2f33'); }
  box(rp, (BRIDGE.x - BRIDGE.w/2) - (X0 - 6), .08,.08, ((X0-6) + (BRIDGE.x - BRIDGE.w/2))/2, 1.0, NILE_Z - .5, '#2b2f33');
  box(rp, (XMAX + 6) - (BRIDGE.x + BRIDGE.w/2), .08,.08, ((XMAX+6) + (BRIDGE.x + BRIDGE.w/2))/2, 1.0, NILE_Z - .5, '#2b2f33');
  // bridge deck, kerbs, rails and pillars
  const len = BRIDGE.z1 - NILE_Z + 4, mid = (NILE_Z - 2 + BRIDGE.z1 + 2)/2;
  box(rp, BRIDGE.w, .8, len, BRIDGE.x, -.4, mid, '#8a8780');
  for (const s of [-1,1]){
    box(rp, .7, .35, len, BRIDGE.x + s*(BRIDGE.w/2 - .35), .17, mid, '#cfcac0');
    box(rp, .12, 1.1, len, BRIDGE.x + s*(BRIDGE.w/2 - .1), .9, mid, '#3c4652');
    for (let z = NILE_Z; z < BRIDGE.z1; z += 3) box(rp, .14, 1.1, .14, BRIDGE.x + s*(BRIDGE.w/2 - .1), .55, z, '#3c4652');
    obstacles.push({ minX: BRIDGE.x + s*(BRIDGE.w/2) - .5, maxX: BRIDGE.x + s*(BRIDGE.w/2) + .5, minZ: NILE_Z - 1, maxZ: BRIDGE.z1 });
  }
  for (let z = NILE_Z + 12; z < BRIDGE.z1 - 4; z += 22) for (const s of [-1,1]) box(rp, 1.6, 2.4, 1.6, BRIDGE.x + s*4, -1.6, z, '#7a776f');
  for (let z = NILE_Z + 4; z < BRIDGE.z1; z += 2.5) whiteMarks.push({ x: BRIDGE.x, y: .012, z, sx: .14, sy: 1, sz: 1.3 });
  for (let z = NILE_Z + 10; z < BRIDGE.z1; z += 24) for (const s of [-1,1]) lampList.push({ x: BRIDGE.x + s*(BRIDGE.w/2 - .4), z, ry: s > 0 ? -Math.PI/2 : Math.PI/2 });
  const rm = new THREE.Mesh(mergeGeometries(rp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7, metalness: .2 })); rm.receiveShadow = true; rm.castShadow = true; scene.add(rm);
  glowSigns.push(signBoard(bigSign('كوبري القلعة','#0d3b66','#f4d35e',768,140,70), BRIDGE.x, 5.2, NILE_Z - 1.2, 6, 1.1, 0, .3));
  const gantry = []; for (const s of [-1,1]) box(gantry, .25, 5.4, .25, BRIDGE.x + s*3.2, 2.7, NILE_Z - 1.3, '#3c4652'); box(gantry, 6.8, .25, .25, BRIDGE.x, 4.6, NILE_Z - 1.3, '#3c4652');
  scene.add(new THREE.Mesh(mergeGeometries(gantry), new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .5, roughness: .4 })));
}
// fishing boats on the sea (the array keeps its old name: 24 moves and rocks them)
const feluccas = [];
for (let i=0;i<9;i++){
  const g = new THREE.Group(); const p = [];
  const hc = pick(['#1f5fa8','#c0392b','#2e7d32','#e0a21a','#f1ead8']), tc = pick(['#f1ead8','#1f5fa8','#e0a21a']);
  box(p, 2.2,.7,6.4, 0,.15,0, hc); box(p, 2.26,.18,6.5, 0,.55,0, tc); box(p, 1.9,.08,5.8, 0,.5,0, '#8a5a32');
  { const bow = new THREE.ConeGeometry(1.1, 1.6, 4); bow.rotateX(Math.PI/2); bow.rotateZ(Math.PI/4); bow.scale(1, .45, 1); bow.translate(0, .2, 3.9); p.push(colored(bow, hc)); }
  box(p, 1.3,1.1,1.4, 0,1.05,-1.6, '#f4f0e6'); box(p, 1.4,.1,1.5, 0,1.65,-1.6, tc); box(p, .1,4.2,.1, 0,2.6,.8, '#5a3a1e'); box(p, .06,.06,2.6, 0,3.6,.4, '#5a3a1e');
  const hull = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 })); hull.castShadow = true; g.add(hull);
  // most boats sit at anchor off the corniche; a few chug slowly along
  const moving = i < 3;
  g.position.set(R(-60, 260), -1.0, moving ? R(NILE_Z + 40, NILE_Z + 120) : R(NILE_Z + 14, NILE_Z + 60));
  if (Math.abs(g.position.x - BRIDGE.x) < 14) g.position.x += 30;
  g.rotation.y = moving ? Math.PI/2 * (rng() < .5 ? 1 : -1) : R(0, 6.28); scene.add(g); feluccas.push({ g, sp: moving ? R(1.2, 2.2) * (g.rotation.y > 0 ? 1 : -1) : 0, ph: R(0, 6) });
}

// road markings, lamps and street parking
const blockAt = (x, z) => blocksInfo.find(b => Math.abs(x-b.cx) < BW/2 + .5 && Math.abs(z-b.cz) < BW/2 + .5);
for (let k=0;k<ROADS_Z.length;k++) for (let s=0;s<NXB;s++){       // east-west roads
  const z = ROADS_Z[k], a = ROADS_X[s]+7.5, b = ROADS_X[s+1]-7.5;
  for (let q=a; q<b-2; q+=6) whiteMarks.push({ x:q+1.5, y:.012, z, sx:3, sy:1, sz:.14 });
  for (const side of [-1,1]){
    if (!blockAt((a+b)/2, z + side*24)) continue;
    for (const t of [12,24,36]) lampList.push({ x: ROADS_X[s]+t, z: z+side*6.7, ry: side>0 ? Math.PI : 0 });
    const nP = Math.floor(rng()*3); for (let p=0;p<nP;p++) parkedSpots.push({ x: R(a+3, b-3), z: z+side*5, ry: side>0 ? -Math.PI/2 : Math.PI/2, y:0 });
  }
}
for (let i=0;i<ROADS_X.length;i++) for (let s=0;s<NZB;s++){       // north-south roads
  const x = ROADS_X[i], a = ROADS_Z[s]+7.5, b = ROADS_Z[s+1]-7.5;
  for (let q=a; q<b-2; q+=6) whiteMarks.push({ x, y:.012, z:q+1.5, sx:.14, sy:1, sz:3 });
  for (const side of [-1,1]){
    if (!blockAt(x + side*24, (a+b)/2)) continue;
    for (const t of [12,24,36]) lampList.push({ x: x+side*6.7, z: ROADS_Z[s]+t, ry: side>0 ? -Math.PI/2 : Math.PI/2 });
    const nP = Math.floor(rng()*3); for (let p=0;p<nP;p++) parkedSpots.push({ x: x+side*5, z: R(a+3, b-3), ry: side>0 ? Math.PI : 0, y:0 });
  }
}
for (const xi of ROADS_X) for (const zi of ROADS_Z) for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const ex = xi+dx*8.2, ez = zi+dz*8.2;
  if (ex < X0-1 || ex > XMAX+1 || ez < Z0-1 || ez > ZMAX+1) continue;
  for (let q=-5;q<=5;q+=1.1){ if (dx) whiteMarks.push({ x: ex, y:.013, z: zi+q, sx: 2.6, sy:1, sz:.55 }); else whiteMarks.push({ x: xi+q, y:.013, z: ez, sx:.55, sy:1, sz:2.6 }); }
}
for (const x of [6, 42]) yellowMarks.push({ x, y:.05, z:48, sx:.6, sy:5, sz:10 });

const markGeo = new THREE.BoxGeometry(1, .02, 1);
instanced(markGeo, new THREE.MeshStandardMaterial({ color: 0xe8e6df, roughness: .8 }), whiteMarks, false);
instanced(markGeo, new THREE.MeshStandardMaterial({ color: 0xe3b23c, roughness: .8 }), yellowMarks, false);
const planeGeo = new THREE.PlaneGeometry(1,1);
instanced(planeGeo, new THREE.MeshStandardMaterial({ map: doorTex, roughness: .8 }), doors, false, t => ({ ...t, sx:1.3, sy:2.2 }));
// the «ممنوع دخول يوسف إبراهيم» plates and the wanted posters appear as the story goes on (count is changed later)
const noEntryIM = instanced(planeGeo, new THREE.MeshStandardMaterial({ map: noEntryTex, roughness: .6, emissive: 0xffffff, emissiveMap: noEntryTex, emissiveIntensity: .12 }), noEntry, false, t => ({ ...t, sx:1.45, sy:.48 }));
const posterIM = instanced(planeGeo, new THREE.MeshStandardMaterial({ map: posterTex, roughness: .9 }), posters, false, t => ({ ...t, sx:.85, sy:1.13 }));
signs.forEach((list,i) => instanced(planeGeo, new THREE.MeshStandardMaterial({ map: signTex[i], roughness: .6, emissive: 0xffffff, emissiveMap: signTex[i], emissiveIntensity: .1 }), list, false, t => ({ ...t, sx:5.2, sy:.82 })));
foodSigns.forEach((list,i) => instanced(planeGeo, new THREE.MeshStandardMaterial({ map: foodSignTex[i], roughness: .6, emissive: 0xffffff, emissiveMap: foodSignTex[i], emissiveIntensity: .18 }), list, false, t => ({ ...t, sx:5.2, sy:.82 })));
// order the plates so that the ones near the café/foul cart come first
{ const o = noEntry.map((p,i) => ({ i, d: Math.hypot(p.x - 30, p.z - 30) })).sort((a,b) => a.d - b.d); const m4 = new THREE.Matrix4(), tmp = []; o.forEach(({i}) => { noEntryIM.getMatrixAt(i, m4); tmp.push(m4.clone()); }); tmp.forEach((m,i) => noEntryIM.setMatrixAt(i, m)); noEntryIM.instanceMatrix.needsUpdate = true; }
function setNoEntryShown(f){ noEntryIM.count = Math.round(noEntry.length * clamp(f, 0, 1)); }
function setPostersShown(on){ posterIM.visible = on; }

// trees, palms, lamps
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
{ // palms: a tall trunk and drooping fronds
  const pp = []; for (let i=0;i<6;i++){ const g = new THREE.CylinderGeometry(.16 - i*.012, .2 - i*.012, 1.4, 7); g.translate(Math.sin(i*.35)*.12*i*.3, .7 + i*1.35, 0); pp.push(colored(g, i%2 ? '#7a5a3a' : '#6b4e33')); }
  for (let f=0; f<8; f++){ const g = new THREE.SphereGeometry(1, 8, 4); g.scale(.28, .06, 1.9); g.translate(0, 0, 1.6); g.rotateX(.55); g.rotateY(f/8*Math.PI*2); g.translate(.25, 8.4, 0); pp.push(colored(g, f%2 ? '#3f7a2e' : '#4f8f36')); }
  instanced(mergeGeometries(pp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 }), palmList, true, t => ({ x: t.x, y: .15, z: t.z, sx: t.s, sy: t.s, sz: t.s, ry: t.x*1.7 }));
  palmList.forEach(t => obstacles.push({ minX:t.x-.3, maxX:t.x+.3, minZ:t.z-.3, maxZ:t.z+.3 }));
}
{ // benches
  const bp = []; box(bp, 1.8,.08,.5, 0,.48,0, '#7a4f2c'); box(bp, 1.8,.45,.06, 0,.75,-.24, '#7a4f2c'); for (const x of [-.8,.8]) box(bp, .08,.48,.45, x,.24,0, '#333');
  instanced(mergeGeometries(bp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7 }), benchList);
}
{ // market stalls: fruit, vegetables, clothes
  const mk = (top) => { const sp = []; box(sp, 1.9,.85,1.0, 0,.43,0, '#7a5230'); box(sp, 2.0,.06,1.1, 0,.88,0, '#a07040'); for (const x of [-.9,.9]) box(sp, .07,1.9,.07, x,1.8,-.45, '#5a3a20');
    const cv = new THREE.BoxGeometry(2.3,.05,1.5); cv.rotateX(-.25); cv.translate(0,2.7,.05); sp.push(colored(cv, top.awn));
    for (let i=0;i<10;i++){ const g = top.kind === 'clothes' ? new THREE.BoxGeometry(.28,.06,.34) : new THREE.SphereGeometry(.09,8,6); g.translate(-.75 + (i%5)*.37, .97 + (top.kind==='clothes' ? Math.floor(i/5)*.07 : .02), -.2 + Math.floor(i/5)*.38); sp.push(colored(g, top.cols[i % top.cols.length])); }
    return mergeGeometries(sp); };
  const kinds = [{ kind:'fruit', awn:'#d84315', cols:['#ff8f00','#e53935','#fdd835','#7cb342'] }, { kind:'veg', awn:'#2e7d32', cols:['#c62828','#66bb6a','#8d6e63','#fafafa'] }, { kind:'clothes', awn:'#1565c0', cols:['#ab47bc','#26c6da','#ef5350','#ffee58','#212121'] }];
  stallLists.forEach((list, i) => { instanced(mk(kinds[i]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7 }), list); list.forEach(p => obstacles.push({ minX:p.x-1.05, maxX:p.x+1.05, minZ:p.z-1.05, maxZ:p.z+1.05 })); });
}
{ // workshop yards: tyre stacks and oil drums
  const tp = []; for (let i=0;i<4;i++){ const g = new THREE.TorusGeometry(.34,.13,8,16); g.rotateX(Math.PI/2); g.translate(0, .14 + i*.26, 0); tp.push(colored(g, '#1c1c1c')); }
  instanced(mergeGeometries(tp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 }), tireList);
  const dr = new THREE.CylinderGeometry(.32,.32,.9,14); dr.translate(0,.45,0);
  const dIM = instanced(dr, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6, metalness: .4 }), drumList);
  if (dIM){ const c = new THREE.Color(); drumList.forEach((d,i) => { c.set(pick(['#1e5fa8','#b71c1c','#2e7d32','#f9a825'])); dIM.setColorAt(i, c); }); }
  [...tireList, ...drumList].forEach(p => obstacles.push({ minX:p.x-.45, maxX:p.x+.45, minZ:p.z-.45, maxZ:p.z+.45 }));
}
{ // restaurant pavement tables
  const tp = []; cyl(tp, .45,.45,.04, 0,.78,0, '#e8e2d4', 0, 16); cyl(tp, .04,.04,.72, 0,.4,0, '#555'); box(tp, .4,.05,.4, .75,.45,0, '#c0392b'); box(tp, .4,.05,.4, -.75,.45,0, '#f2f0ea');
  instanced(mergeGeometries(tp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 }), outTables, true, t => ({ ...t, y: .15 }));
  outTables.forEach(p => obstacles.push({ minX:p.x-.5, maxX:p.x+.5, minZ:p.z-.5, maxZ:p.z+.5 }));
}
const poleGeo = new THREE.CylinderGeometry(.07, .1, 6.2, 8); poleGeo.translate(0, 3.25, 0);
const armGeo = new THREE.BoxGeometry(.12, .12, 1.6); armGeo.translate(0, 6.35, .7);
const headGeo = new THREE.BoxGeometry(.32, .14, .7); headGeo.translate(0, 6.25, 1.35);
instanced(mergeGeometries([poleGeo, armGeo]), new THREE.MeshStandardMaterial({ color: 0x3a3d40, metalness: .7, roughness: .45 }), lampList);
const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff2cc, emissiveIntensity: .35 });
instanced(headGeo, lampHeadMat, lampList, false);
lampList.forEach(l => obstacles.push({ minX:l.x-.15, maxX:l.x+.15, minZ:l.z-.15, maxZ:l.z+.15 }));
// warm light pools under the street lamps (seen at night)
const glowTex = makeTex(128,128,(g)=>{ const gr = g.createRadialGradient(64,64,0,64,64,64); gr.addColorStop(0,'rgba(255,214,150,.85)'); gr.addColorStop(1,'rgba(255,214,150,0)'); g.fillStyle=gr; g.fillRect(0,0,128,128); });
const lampPoolMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
const poolGeo = new THREE.PlaneGeometry(1,1); poolGeo.rotateX(-Math.PI/2);
const lampPools = instanced(poolGeo, lampPoolMat, lampList, false, l => ({ x: l.x + Math.sin(l.ry)*1.4, y: .2, z: l.z + Math.cos(l.ry)*1.4, sx: 9, sy: 1, sz: 9 }));
if (lampPools) lampPools.receiveShadow = false;
// transit stops (موقف)
const stopSignTex = makeTex(256,256,(g,w,h)=>{ g.fillStyle='#0d47a1'; g.beginPath(); g.arc(128,128,124,0,7); g.fill(); g.fillStyle='#fff'; g.beginPath(); g.roundRect(56,70,144,96,14); g.fill(); g.fillStyle='#0d47a1'; g.fillRect(70,84,52,34); g.fillRect(134,84,52,34); g.fillStyle='#222'; g.beginPath(); g.arc(88,172,14,0,7); g.arc(168,172,14,0,7); g.fill(); arText(g,'موقف',128,222,34,'#fff'); });
stopSignTex.wrapS = stopSignTex.wrapT = THREE.ClampToEdgeWrapping;
STOPS.forEach(s => {
  const g = new THREE.Group(); g.position.copy(s.pos);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,2.8,8), new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: .6 })); pole.position.y = 1.4;
  const sg = new THREE.Mesh(new THREE.CircleGeometry(.5, 24), new THREE.MeshStandardMaterial({ map: stopSignTex, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: stopSignTex, emissiveIntensity: .2 })); sg.position.y = 2.9;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6,.08,1.2), new THREE.MeshStandardMaterial({ color: 0x0d47a1, roughness: .6 })); roof.position.set(1.4, 2.35, 0);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2,.08,.45), new THREE.MeshStandardMaterial({ color: 0xb0b6bd, metalness: .4 })); bench.position.set(1.4, .5, 0);
  g.add(pole, sg, roof, bench); g.userData.sign = sg; scene.add(g); s.g = g;
  obstacles.push({ minX: s.pos.x - .15, maxX: s.pos.x + .15, minZ: s.pos.z - .15, maxZ: s.pos.z + .15 });
});

// ---- cafe furniture ----
const tableList = TABLES.map(([x,z]) => ({ x, z })).concat([{ x: SPOT.domino.x, z: SPOT.domino.z }]);
{
  const top = new THREE.CylinderGeometry(.55,.55,.05,20); top.translate(0,.88,0);
  const leg = new THREE.CylinderGeometry(.05,.05,.72,8); leg.translate(0,.5,0);
  const foot = new THREE.CylinderGeometry(.3,.3,.04,14); foot.translate(0,.17,0);
  const oldTop = instanced(mergeGeometries([top]), new THREE.MeshStandardMaterial({ color: 0xd9d4c7, roughness: .5, metalness: .2 }), tableList);
  const oldBase = instanced(mergeGeometries([leg, foot]), new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: .6, roughness: .4 }), tableList);
  tableList.forEach(t => obstacles.push({ minX:t.x-.5, maxX:t.x+.5, minZ:t.z-.5, maxZ:t.z+.5 }));
  const chairParts = []; box(chairParts, .44,.05,.44, 0,.47,0, '#ffffff'); box(chairParts, .44,.48,.05, 0,.72,-.2, '#ffffff');
  for (const [a,b] of [[-.19,-.19],[.19,-.19],[-.19,.19],[.19,.19]]) box(chairParts, .04,.47,.04, a,.235,b, '#ffffff');
  const chairGeo = mergeGeometries(chairParts);
  const chairs = SEATS.map(s => ({ x:s.x, z:s.z, ry:s.ry, y:.15 })).concat([{ x:SPOT.domino.x-.85, z:SPOT.domino.z, ry:Math.PI/2, y:.15 }, { x:SPOT.domino.x+.85, z:SPOT.domino.z, ry:-Math.PI/2, y:.15 }]);
  const chairIM = instanced(chairGeo, new THREE.MeshStandardMaterial({ vertexColors: true, color: 0xffffff, roughness: .6 }), chairs);
  const cc = new THREE.Color(); chairs.forEach((c,i) => { cc.set(i%3===0 ? '#c9302c' : '#f2f0ea'); chairIM.setColorAt(i, cc); });
  // the café's real furniture (assets/props/cafe-set.glb: green bistro chairs, marble tables on iron feet) replaces the simple shapes once it has loaded
  (async () => { try {
    const { GLTFLoader } = await import('three/addons/GLTFLoader.js');
    const g = (await new GLTFLoader().loadAsync('assets/props/cafe-set.glb')).scene; g.updateMatrixWorld(true);
    const part = n => { let m = null; g.traverse(o => { if (o.isMesh && (o.name === n || o.parent.name === n) && !m) m = o; }); if (!m) return null; const geo = m.geometry.clone(); geo.applyMatrix4(m.matrixWorld); return { geo, mat: m.material }; };
    const ch = part('chair'), tt = part('table_top'), tb = part('table_base'); if (!ch || !tt || !tb) return;
    const onFloor = list => list.map(t => ({ ...t, y: .15 }));
    instanced(ch.geo, ch.mat, chairs); instanced(tt.geo, tt.mat, onFloor(tableList)); instanced(tb.geo, tb.mat, onFloor(tableList));
    chairIM.visible = false; if (oldTop) oldTop.visible = false; if (oldBase) oldBase.visible = false;
  } catch (e){ console.warn('café furniture model failed, keeping the simple one', e); } })();
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

// ---- 04b-alexandria.js ----
// ================= Alexandria: the fort, the bridge towers, the breakwater, the tram line, the villa, the story houses =================
// (the sea, the fish market and the pastel facades are in 03-textures / 04-world-layout)

// stone: one texture of sandstone blocks, mapped by world position so big and small pieces share the same block size
const stoneTex = makeTex(256, 256, (g, w, h) => {
  g.fillStyle = '#d6bd8c'; g.fillRect(0, 0, w, h); grain(g, w, h, 16000, .16);
  g.strokeStyle = 'rgba(110,84,50,.45)'; g.lineWidth = 2;
  for (let y = 0; y <= h; y += 32){ g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = ((y / 32) % 2) * 32; x < w; x += 64){ g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } }
  for (let i = 0; i < 40; i++){ g.fillStyle = `rgba(${Math.random() < .5 ? '90,70,40' : '255,245,220'},${Math.random() * .12})`; g.fillRect(Math.random() * w, Math.random() * h, 20 + Math.random() * 40, 10 + Math.random() * 25); }
});
const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: .92, envMapIntensity: .35 });
// merge pieces and give every vertex texture coordinates from its world position (4 m per texture repeat)
function stoneMesh(geos, cast = true){
  const g = mergeGeometries(geos.map(x => x.index ? x.toNonIndexed() : x)); const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++){ const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay > .6){ uv[i*2] = x / 4; uv[i*2+1] = z / 4; } else if (ax > az){ uv[i*2] = z / 4; uv[i*2+1] = y / 4; } else { uv[i*2] = x / 4; uv[i*2+1] = y / 4; } }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const m = new THREE.Mesh(g, stoneMat); m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m;
}
const bx = (w, h, d, x, y, z, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };
const cy = (r, h, x, y, z, seg = 16, r2) => new THREE.CylinderGeometry(r, r2 ?? r, h, seg).translate(x, y, z);
// battlements along a wall from (x0,z0) to (x1,z1) at height y
function merlons(list, x0, z0, x1, z1, y, t = 1.2){ const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / 1.6), ry = Math.atan2(x1 - x0, z1 - z0); for (let i = 0; i <= n; i++){ const k = i / n; list.push(bx(t, .9, .8, x0 + (x1 - x0) * k, y + .45, z0 + (z1 - z0) * k, ry)); } }

// ---- the fort (like Qaitbay): a spit of land at the end of the bridge, a curtain wall with round towers, the keep with its minaret ----
const FORT = { cx: 96, gateZ: 266, x0: 62, x1: 130, z0: 266, z1: 306, keep: { x: 96, z: 291, s: 20, h: 13 } };
{
  const lt = stoneTex.clone(); lt.repeat.set((FAR.x1 - FAR.x0) / 4, (FAR.z1 - FAR.z0) / 4); lt.needsUpdate = true;
  const land = new THREE.Mesh(new THREE.BoxGeometry(FAR.x1 - FAR.x0, .15, FAR.z1 - FAR.z0), new THREE.MeshStandardMaterial({ map: lt, roughness: .95, color: 0xcab89a }));
  land.position.set((FAR.x0 + FAR.x1) / 2, .075, (FAR.z0 + FAR.z1) / 2); land.receiveShadow = true; scene.add(land);
  // rocks round the edge
  const rk = []; for (let i = 0; i < 70; i++){ const side = i % 4, t = rng(); const x = side < 2 ? FAR.x0 + t * (FAR.x1 - FAR.x0) : side === 2 ? FAR.x0 - 1 : FAR.x1 + 1, z = side === 0 ? FAR.z0 - 1 : side === 1 ? FAR.z1 + 1 : FAR.z0 + t * (FAR.z1 - FAR.z0); if (side === 0 && Math.abs(x - BRIDGE.x) < BRIDGE.w) continue; const g = new THREE.DodecahedronGeometry(R(1, 2.2), 0); g.translate(x + R(-1, 1), -.7, z + R(-1, 1)); rk.push(colored(g, pick(['#8a8478', '#6f6a60', '#9c9284']))); }
  const rocks = new THREE.Mesh(mergeGeometries(rk), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })); rocks.receiveShadow = true; scene.add(rocks);
  const W = 1.6, H = 6.5, wall = [], top = [];
  const { x0, x1, z0, z1 } = FORT, gx0 = FORT.cx - 4, gx1 = FORT.cx + 4;
  const seg = (ax, az, bx2, bz) => { const L = Math.hypot(bx2 - ax, bz - az), ry = Math.atan2(bx2 - ax, bz - az); wall.push(bx(W, H, L, (ax + bx2) / 2, H / 2, (az + bz) / 2, ry)); merlons(top, ax, az, bx2, bz, H); obstacles.push({ minX: Math.min(ax, bx2) - W / 2, maxX: Math.max(ax, bx2) + W / 2, minZ: Math.min(az, bz) - W / 2, maxZ: Math.max(az, bz) + W / 2 }); };
  seg(x0, z0, gx0, z0); seg(gx1, z0, x1, z0); seg(x1, z0, x1, z1); seg(x1, z1, x0, z1); seg(x0, z1, x0, z0);
  for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]){ wall.push(cy(3.2, H + 2, x, (H + 2) / 2, z, 20)); for (let a = 0; a < 12; a++){ const an = a / 12 * Math.PI * 2; top.push(bx(1, .9, .7, x + Math.sin(an) * 3, H + 2.45, z + Math.cos(an) * 3, an)); } obstacles.push({ minX: x - 3.2, maxX: x + 3.2, minZ: z - 3.2, maxZ: z + 3.2 }); }
  // the gate: two bastions and an arch over the way in
  for (const s of [-1, 1]){ wall.push(bx(3.4, H + 2.5, 4, FORT.cx + s * 5.6, (H + 2.5) / 2, z0, 0)); obstacles.push({ minX: FORT.cx + s * 5.6 - 1.7, maxX: FORT.cx + s * 5.6 + 1.7, minZ: z0 - 2, maxZ: z0 + 2 }); merlons(top, FORT.cx + s * 4, z0 - 2, FORT.cx + s * 7.2, z0 - 2, H + 2.5, 1); }
  wall.push(bx(8, 2.4, 4, FORT.cx, H + 1.3, z0)); merlons(top, gx0, z0 - 2, gx1, z0 - 2, H + 2.5, 1);
  // the keep: four round turrets, battlements, a dark arched door, and a small minaret on the roof
  const K = FORT.keep, hs = K.s / 2;
  wall.push(bx(K.s, K.h, K.s, K.x, K.h / 2, K.z)); merlons(top, K.x - hs, K.z - hs, K.x + hs, K.z - hs, K.h); merlons(top, K.x + hs, K.z - hs, K.x + hs, K.z + hs, K.h); merlons(top, K.x + hs, K.z + hs, K.x - hs, K.z + hs, K.h); merlons(top, K.x - hs, K.z + hs, K.x - hs, K.z - hs, K.h);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]){ wall.push(cy(2.6, K.h + 2.5, K.x + sx * hs, (K.h + 2.5) / 2, K.z + sz * hs, 18)); wall.push(cy(2.9, .5, K.x + sx * hs, K.h + 2.75, K.z + sz * hs, 18)); }
  obstacles.push({ minX: K.x - hs - 2, maxX: K.x + hs + 2, minZ: K.z - hs - 2, maxZ: K.z + hs + 2, building: true });
  wall.push(cy(1.5, 5, K.x + 4, K.h + 2.5, K.z + 3, 12)); wall.push(cy(2, .5, K.x + 4, K.h + 5.2, K.z + 3, 12)); wall.push(cy(1.1, 2.6, K.x + 4, K.h + 6.6, K.z + 3, 12));
  stoneMesh(wall); stoneMesh(top, false);
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 1 });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(3, 4.6), dark); door.position.set(K.x, 2.4, K.z - hs - .02); door.rotation.y = Math.PI; scene.add(door);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: .8 })); dome.position.set(K.x + 4, K.h + 7.9, K.z + 3); scene.add(dome);
  // small windows on the keep (slits)
  const sl = []; for (const f of [-1, 1]) for (let i = -2; i <= 2; i++) for (const y of [6, 10]){ sl.push(bx(.5, 1.6, .1, K.x + i * 3.5, y, K.z + f * (hs + .03))); sl.push(bx(.1, 1.6, .5, K.x + f * (hs + .03), y, K.z + i * 3.5)); }
  scene.add(new THREE.Mesh(mergeGeometries(sl), dark));
  glowSigns.push(signBoard(bigSign('🏰 القلعة', '#3a2a14', '#f4d35e', 512, 130, 70), FORT.cx, H + 3.4, z0 - 2.1, 4.2, 1.06, Math.PI, .25));
}

// ---- Stanley-style towers at both ends of the bridge: square pavilions with arches and a little dome ----
{
  const tw = [], domes = [];
  for (const z of [NILE_Z + 1.5, BRIDGE.z1 - 1.5]) for (const s of [-1, 1]){
    const x = BRIDGE.x + s * (BRIDGE.w / 2 + 1.8);
    tw.push(bx(3.2, 7, 3.2, x, 3.5, z)); tw.push(bx(3.8, .5, 3.8, x, 7.2, z)); tw.push(bx(2.6, 1.6, 2.6, x, 8.2, z));
    for (let a = 0; a < 4; a++){ const an = a * Math.PI / 2; tw.push(bx(.9, .9, .4, x + Math.sin(an) * 1.6, 5.4, z + Math.cos(an) * 1.6, an)); }
    domes.push([x, z]);
    obstacles.push({ minX: x - 1.6, maxX: x + 1.6, minZ: z - 1.6, maxZ: z + 1.6 });
  }
  stoneMesh(tw);
  const dm = new THREE.MeshStandardMaterial({ color: 0x3f7f8c, roughness: .5, metalness: .3 });
  for (const [x, z] of domes){ const d = new THREE.Mesh(new THREE.SphereGeometry(1.25, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), dm); d.position.set(x, 9, z); d.castShadow = true; scene.add(d); }
}

// ---- the breakwater: concrete tetrapods piled along the corniche wall (weak phones: fewer) ----
{
  const parts = []; for (const [x, y, z] of [[0, 1, 0], [.94, -.33, 0], [-.47, -.33, .82], [-.47, -.33, -.82]]){ const g = new THREE.CylinderGeometry(.18, .42, 1.3, 7); g.translate(0, .65, 0); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, y, z).normalize()); g.applyQuaternion(q); parts.push(g); }
  const tetra = mergeGeometries(parts); tetra.computeVertexNormals();
  const list = [], step = GFX === 'low' ? 2.6 : 1.7;
  for (let x = X0 - 8; x <= XMAX + 8; x += step){ if (Math.abs(x - BRIDGE.x) < BRIDGE.w / 2 + 3) continue; for (let r = 0; r < 2; r++) list.push({ x: x + R(-.5, .5) + r * step / 2, y: -1.25 + r * .35, z: NILE_Z + 1.6 + r * 1.3 + R(-.3, .3), rx: R(0, 3), ry: R(0, 6), s: R(.9, 1.15) }); }
  const im = instanced(tetra, new THREE.MeshStandardMaterial({ color: 0xbdb7ab, roughness: .95 }), list, false, t => ({ ...t, sx: t.s, sy: t.s, sz: t.s }));
  if (im) im.receiveShadow = true;
}

// ---- the tram line along the market road (z = -48): rails in the middle of the road, poles and wires, three stops ----
const TRAM = { z: ROADS_Z[1], x0: X0 - 24, x1: XMAX + 24, stations: [-60, 72, 216] };
{
  const p = [];
  for (const s of [-1, 1]) box(p, TRAM.x1 - TRAM.x0, .06, .12, (TRAM.x0 + TRAM.x1) / 2, .04, TRAM.z + s * .72, '#9aa0a6');
  box(p, TRAM.x1 - TRAM.x0, .02, 2.6, (TRAM.x0 + TRAM.x1) / 2, .012, TRAM.z, '#3a3835');
  for (let x = TRAM.x0; x <= TRAM.x1; x += 24){ if (ROADS_X.some(r => Math.abs(r - x) < 7)) continue; for (const s of [-1, 1]) box(p, .2, 6.6, .2, x, 3.3, TRAM.z + s * 6.7, '#2b2f33'); box(p, .08, .08, 13.4, x, 6.2, TRAM.z, '#2b2f33'); }
  box(p, TRAM.x1 - TRAM.x0, .04, .04, (TRAM.x0 + TRAM.x1) / 2, 5.7, TRAM.z, '#1d1f22');
  for (const x of TRAM.stations){
    // a shelter on the north pavement with a bench and the stop's sign
    const sz = TRAM.z - 7.6;
    box(p, 5, .12, 2, x, 2.7, sz, '#e0a21a'); for (const dx of [-2.3, 2.3]) box(p, .12, 2.6, .12, x + dx, 1.4, sz - .8, '#2b2f33'); box(p, 4.6, 1.8, .06, x, 1.5, sz - .9, '#cfe0ea');
    box(p, 3, .1, .5, x, .6, sz - .4, '#8a5a32'); for (const dx of [-1.2, 1.2]) box(p, .1, .45, .45, x + dx, .38, sz - .4, '#2b2f33');
    obstacles.push({ minX: x - 2.5, maxX: x + 2.5, minZ: sz - 1, maxZ: sz - .7 });
    glowSigns.push(signBoard(bigSign('🚋 محطة الترام', '#e0a21a', '#2a1700', 512, 120, 60), x, 3.05, sz + .02, 3.6, .84, Math.PI, .3));
  }
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: .3 })); m.receiveShadow = true; m.castShadow = true; scene.add(m);
}

// ---- العربي's family villa: white walls round a garden, a pool, palms, a gate; the house itself modern and white ----
const VILLA = { cx: X0 + PITCH / 2 + 7 * PITCH, cz: Z0 + PITCH / 2 };
{
  const { cx, cz } = VILLA, p = [], wallC = '#f2efe8', gateZ = cz + 16.5;
  const lawn = new THREE.Mesh(new THREE.BoxGeometry(BW - 3, .05, BW - 3), new THREE.MeshStandardMaterial({ map: parkTex, roughness: 1 })); lawn.position.set(cx, .18, cz); lawn.receiveShadow = true; scene.add(lawn);
  for (const [w, d, x, z] of [[BW - 2, .4, 0, -(BW / 2 - 1)], [.4, BW - 2, -(BW / 2 - 1), 0], [.4, BW - 2, BW / 2 - 1, 0], [(BW - 2) / 2 - 3, .4, -((BW - 2) / 4 + 1.5), BW / 2 - 1], [(BW - 2) / 2 - 3, .4, (BW - 2) / 4 + 1.5, BW / 2 - 1]]){
    box(p, w, 2.4, d, cx + x, 1.35, cz + z, wallC); obstacles.push({ minX: cx + x - w / 2, maxX: cx + x + w / 2, minZ: cz + z - d / 2, maxZ: cz + z + d / 2 });
  }
  for (const s of [-1, 1]) box(p, .7, 3.2, .7, cx + s * 3.2, 1.75, gateZ, '#d8c39d');
  for (let i = -5; i <= 5; i++) box(p, .06, 2.2, .06, cx + i * .55, 1.25, gateZ, '#1d1f22');
  box(p, 6, .1, .1, cx, 2.35, gateZ, '#c9a227');
  // the house: two white boxes, big dark windows, a flat roof terrace
  box(p, 18, 4, 11, cx, 2.15, cz - 6, '#f7f5f0'); box(p, 12, 3.6, 9, cx - 2, 5.95, cz - 7, '#f7f5f0'); box(p, 19, .25, 12, cx, 4.2, cz - 6, '#d8d4cc');
  for (let i = -3; i <= 3; i++) box(p, 1.8, 2.4, .06, cx + i * 2.4, 1.9, cz - .45, '#22313a');
  for (let i = -2; i <= 2; i++) box(p, 1.6, 2.2, .06, cx - 2 + i * 2.2, 5.9, cz - 2.47, '#22313a');
  box(p, 3, 2.6, .08, cx + 6.5, 1.45, cz - .4, '#5a3a1e');
  obstacles.push({ minX: cx - 9, maxX: cx + 9, minZ: cz - 11.5, maxZ: cz - .5, building: true });
  // the pool
  box(p, 9, .3, 4.6, cx - 5, .2, cz + 6, '#e8e4da');
  const pool = new THREE.Mesh(new THREE.BoxGeometry(8, .1, 3.6), new THREE.MeshStandardMaterial({ color: 0x3fb7d8, roughness: .1, metalness: .2, emissive: 0x0a3a4a, emissiveIntensity: .4 })); pool.position.set(cx - 5, .33, cz + 6); scene.add(pool);
  obstacles.push({ minX: cx - 9.5, maxX: cx - .5, minZ: cz + 3.7, maxZ: cz + 8.3 });
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .55 })); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  buildings.push({ grp: m, mats: [m.material], box: new THREE.Box3().setFromObject(m), opacity: 1 });
  glowSigns.push(signBoard(bigSign('فيلا الحاج العربي', '#f7f5f0', '#8a6a1a', 640, 120, 58), cx, 2.9, gateZ + .3, 4.2, .8, 0, .2));
  VILLA.gate = new THREE.Vector3(cx, .15, gateZ + 1.2);
}

// ---- the story houses get their names on the door: طيارة's (already there), شادية's next door, إسلام's family ----
const STORY_HOUSES = {
  shadia: { name: 'بيت شادية', door: new THREE.Vector3(-35, .15, 86.4) },
  islam: { name: 'بيت إسلام', door: new THREE.Vector3(-72, .15, 22.4) },
};
for (const h of Object.values(STORY_HOUSES)){
  const d = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.3), new THREE.MeshStandardMaterial({ map: doorTex, roughness: .8, color: 0xb8a48c })); d.position.set(h.door.x, 1.3, h.door.z - .3); scene.add(d);
  glowSigns.push(signBoard(bigSign(h.name, '#f3ecd8', '#5a2a14', 512, 120, 64), h.door.x, 2.85, h.door.z - .28, 2.2, .52, 0, .15));
}

// ---- the harbour (الميناء) at the east end of the corniche: a warehouse you can walk into, containers, a pier with launches ----
const PORT = { cx: X0 + PITCH / 2 + 7 * PITCH, cz: Z0 + PITCH / 2 + 4 * PITCH };
{
  const { cx, cz } = PORT, p = [], wx0 = cx - 15, wx1 = cx + 13, wz0 = cz - 15, wz1 = cz + 1, H = 8;
  PORT.shed = { x0: wx0, x1: wx1, z0: wz0, z1: wz1 }; PORT.door = new THREE.Vector3(cx - 1, .15, wz1 + 1.5); PORT.inside = new THREE.Vector3(cx - 1, .15, cz - 8);
  const wall = (w, d, x, z) => { box(p, w, H, d, x, H / 2, z, '#7d8a96'); obstacles.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }); };
  wall(wx1 - wx0, .4, (wx0 + wx1) / 2, wz0); wall(.4, wz1 - wz0, wx0, (wz0 + wz1) / 2); wall(.4, wz1 - wz0, wx1, (wz0 + wz1) / 2);
  wall(cx - 5 - wx0, .4, (wx0 + cx - 5) / 2, wz1); wall(wx1 - (cx + 3), .4, (cx + 3 + wx1) / 2, wz1);
  box(p, 8, H - 5.5, .4, cx - 1, H - (H - 5.5) / 2, wz1, '#7d8a96');
  for (let x = wx0; x <= wx1; x += 1.2) box(p, .1, H, .5, x, H / 2, wz1 + .05, '#6b7783');
  box(p, wx1 - wx0 + 1, .3, wz1 - wz0 + 1, (wx0 + wx1) / 2, H + .15, (wz0 + wz1) / 2, '#5f6b77');
  // crates inside
  for (let i = 0; i < 9; i++){ const x = wx0 + 3 + (i % 3) * 3.2, z = wz0 + 3 + Math.floor(i / 3) * 3.4; box(p, 1.8, 1.2 + (i % 2) * .6, 1.8, x, .75 + (i % 2) * .3, z, '#8a6a3a'); obstacles.push({ minX: x - .9, maxX: x + .9, minZ: z - .9, maxZ: z + .9 }); }
  // containers along the quay
  for (let i = 0; i < 5; i++){ const x = cx - 14 + i * 6.3, c = pick(['#c0392b', '#1f5fa8', '#2e7d32', '#e0a21a', '#6d4c41']); box(p, 6, 2.6, 2.5, x, 1.45, cz + 11, c); if (i % 2) box(p, 6, 2.6, 2.5, x, 4.05, cz + 11, pick(['#1f5fa8', '#c0392b'])); obstacles.push({ minX: x - 3, maxX: x + 3, minZ: cz + 9.75, maxZ: cz + 12.25 }); }
  // the pier and its posts
  box(p, PIER.x1 - PIER.x0, .3, PIER.z1 - PIER.z0, (PIER.x0 + PIER.x1) / 2, 0, (PIER.z0 + PIER.z1) / 2, '#8a6a4a');
  for (let z = PIER.z0 + 2; z < PIER.z1; z += 4) for (const x of [PIER.x0, PIER.x1]) box(p, .35, 2.2, .35, x, -.6, z, '#5a4030');
  for (const s2 of [-1, 1]) obstacles.push({ minX: (s2 < 0 ? PIER.x0 - .3 : PIER.x1 - .2), maxX: (s2 < 0 ? PIER.x0 + .2 : PIER.x1 + .3), minZ: NILE_Z + 1, maxZ: PIER.z1 });
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7, metalness: .25 })); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  glowSigns.push(signBoard(bigSign('⚓ مخازن الميناء', '#20262c', '#ffb74d', 640, 120, 58), cx - 1, H - 1.2, wz1 + .25, 6, 1.1, 0, .3));
  const fl = new THREE.Mesh(new THREE.BoxGeometry(wx1 - wx0, .04, wz1 - wz0), new THREE.MeshStandardMaterial({ color: 0x5a5650, roughness: .9 })); fl.position.set((wx0 + wx1) / 2, .17, (wz0 + wz1) / 2); fl.receiveShadow = true; scene.add(fl);
}

// ---- الحاج العربي's car showroom (the story calls it «سموحة»): glass front, cars inside ----
const SHOWROOM = { cx: X0 + PITCH / 2 + 6 * PITCH, cz: Z0 + PITCH / 2 };
{
  const { cx, cz } = SHOWROOM, p = [];
  box(p, 28, 6.5, 14, cx, 3.4, cz - 4, '#f2f2f0'); box(p, 29, .5, 15, cx, 6.9, cz - 4, '#20262c');
  obstacles.push({ minX: cx - 14, maxX: cx + 14, minZ: cz - 11, maxZ: cz + 3, building: true });
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .4 })); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(26, 5), new THREE.MeshStandardMaterial({ color: 0x9fd0e0, emissive: 0x2a5a6a, emissiveIntensity: .5, roughness: .05, metalness: .5, transparent: true, opacity: .55 })); glass.position.set(cx, 2.9, cz + 3.05); scene.add(glass);
  SHOWROOM.mats = [m.material, glass.material];
  buildings.push({ grp: m, mats: [m.material], box: new THREE.Box3().setFromObject(m), opacity: 1 });
  glowSigns.push(signBoard(bigSign('معرض الحاج العربي للسيارات', '#20262c', '#f2c14e', 1024, 150, 66), cx, 6.1, cz + 3.1, 12, 1.75, 0, .4));
  SHOWROOM.front = new THREE.Vector3(cx, .15, cz + 8);
}
// burnt after chapter 6 (until the end of the story)
function showroomBurnt(on){ const [m, g] = SHOWROOM.mats; m.color.setScalar(on ? .25 : 1); g.opacity = on ? .15 : .55; g.emissiveIntensity = on ? 0 : .5; }

// ---- 04c-time-of-day.js ----
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

// ---- 05-vehicles.js ----
// ================= vehicles =================
// the street cars: assets/props/auta-cars.glb (tools/make_auta.py). A sedan (parked cars, traffic, the black-and-yellow
// Alexandria taxi) and a police car in Egyptian colours. If the file is missing the boxy cars below are used.
const AUTA = await (async () => {
  try {
    const { GLTFLoader } = await import('three/addons/GLTFLoader.js');
    const g = (await new GLTFLoader().loadAsync('assets/props/auta-cars.glb')).scene; g.updateMatrixWorld(true);
    const o = {}; g.traverse(m => { if (m.isMesh){ const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); geo.applyMatrix4(m.matrixWorld); if (!geo.attributes.normal) geo.computeVertexNormals(); o[m.name] = geo; } });
    if (!o.sedan_rest || !o.police_rest) return null;
    o.sedanTop = new THREE.Box3().setFromBufferAttribute(o.sedan_roof.attributes.position).max.y;
    return o;
  } catch (e){ console.warn('street cars failed, using the boxy ones', e); return null; }
})();
const carGeo = (() => {
  const ws = []; for (const x of [-.86,.86]) for (const z of [-1.38,1.38]){ const g = new THREE.CylinderGeometry(.36,.36,.26,12); g.rotateZ(Math.PI/2); g.translate(x,.36,z); ws.push(g); }
  const hub = []; for (const x of [-.99,.99]) for (const z of [-1.38,1.38]){ const g = new THREE.CylinderGeometry(.2,.2,.02,10); g.rotateZ(Math.PI/2); g.translate(x,.36,z); hub.push(g); }
  const lights = (z, y) => { const a = new THREE.BoxGeometry(.42,.13,.06), b = a.clone(); a.translate(-.62,y,z); b.translate(.62,y,z); return mergeGeometries([a,b]); };
  const bar = new THREE.BoxGeometry(.55,.13,.28);
  return {
    body: (() => { const g = new RoundedBoxGeometry(1.9,.62,4.4,2,.16); g.translate(0,.66,0); return g; })(),
    cabin: (() => { const g = new RoundedBoxGeometry(1.64,.56,2.3,2,.2); g.translate(0,1.2,-.2); return g; })(),
    roof: (() => { const g = new RoundedBoxGeometry(1.5,.06,1.9,2,.03); g.translate(0,1.49,-.25); return g; })(),
    wheels: mergeGeometries(ws), hubs: mergeGeometries(hub), head: lights(2.21,.74), tail: lights(-2.21,.78),
    stripe: (() => { const g = new THREE.BoxGeometry(1.93,.24,3.4); g.translate(0,.62,0); return g; })(),
    barL: (() => { const g = bar.clone(); g.translate(-.3,1.59,-.2); return g; })(),
    barR: (() => { const g = bar.clone(); g.translate(.3,1.59,-.2); return g; })(),
    taxiSign: (() => { const g = new THREE.BoxGeometry(.7,.2,.3); g.translate(0,1.62,-.2); return g; })(),
  };
})();
if (AUTA){
  // the sedan's wheels (for the gold hubs from the garage) and the taxi sign on its roof
  const hub = []; for (const x of [-1.03, 1.03]) for (const z of [1.44, -1.53]){ const g = new THREE.CylinderGeometry(.19,.19,.02,10); g.rotateZ(Math.PI/2); g.translate(x,.3,z); hub.push(g); }
  carGeo.hubs = mergeGeometries(hub);
  carGeo.taxiSign = new THREE.BoxGeometry(.7,.2,.3).translate(0, AUTA.sedanTop + .08, -.3);
}
const carGlass = new THREE.MeshPhysicalMaterial({ color: 0x0b1218, metalness: .3, roughness: .06, envMapIntensity: 1.6 });
const tireMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: .9 });
const hubMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: .9, roughness: .3 });
const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: .7 });
const tailMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2020, emissiveIntensity: .7 });
const COLORS = ['#a3132b','#efefef','#1b1d20','#27458a','#878c93','#d39b17','#0f5d4e','#4d2a7a','#c4561a','#5e6b3a'];
const paintCache = {};
const paint = c => paintCache[c] ||= new THREE.MeshPhysicalMaterial({ color: c, metalness: .55, roughness: .3, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: 1.2, side: AUTA ? THREE.DoubleSide : THREE.FrontSide });
const checkerMat = new THREE.MeshStandardMaterial({ map: checkerTex, roughness: .5 });
// a car is drawn in 3 pieces instead of 8 (phones are slow with many separate pieces): the paint (body + roof),
// the rest (glass, tyres, hubs, coloured per vertex) and the lights (one glowing material, tinted per vertex)
const carParts = (() => {
  const ni = g => g.index ? g.toNonIndexed() : g.clone();          // rounded boxes and cylinders store their triangles differently: make them alike
  const cl = (geo, c) => colored(ni(geo), c);
  if (AUTA) return {
    paint: mergeGeometries([AUTA.sedan_body, AUTA.sedan_roof]), rest: AUTA.sedan_rest, lights: AUTA.sedan_lights,
    taxi: mergeGeometries([cl(AUTA.sedan_body, '#161616'), cl(AUTA.sedan_roof, '#f5b800')]),     // Alexandria: black below, yellow on top
  };
  return {
    paint: mergeGeometries([ni(carGeo.body), ni(carGeo.roof)]),
    rest: mergeGeometries([cl(carGeo.cabin, '#0b1218'), cl(carGeo.wheels, '#141414'), cl(carGeo.hubs, '#b8bcc0')]),
    lights: mergeGeometries([cl(carGeo.head, '#fffaf0'), cl(carGeo.tail, '#ff1a1a')]),
  };
})();
const carRestMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .45, roughness: .32, envMapIntensity: 1.3 });
const carLightMat = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: .7, roughness: .4 });
carLightMat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor.rgb;'); };
const taxiMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: .5, roughness: .3, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: 1.2 });
// some faces of the street-car model point inwards (roof, windows): draw both sides of those materials
const autaSide = m => { if (AUTA) m.side = THREE.DoubleSide; return m; };
autaSide(taxiMat); autaSide(carRestMat);
// «شرطة» on both front doors of the police car
const policeWord = (() => {
  if (!AUTA) return null;
  const tex = makeTex(256, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = '900 44px Cairo, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl'; g.fillText('شرطة', w/2, h/2 + 2); });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const p = AUTA.police_rest.attributes.position; let half = 0;
  for (let i = 0; i < p.count; i++){ const y = p.getY(i), z = p.getZ(i); if (y > .55 && y < .8 && Math.abs(z) < .4) half = Math.max(half, Math.abs(p.getX(i))); }
  const a = new THREE.PlaneGeometry(1.1, .28).rotateY(Math.PI/2).translate(half + .015, .62, .15), b = new THREE.PlaneGeometry(1.1, .28).rotateY(-Math.PI/2).translate(-half - .015, .62, .15);
  return { geo: mergeGeometries([a, b]), mat };
})();
function makeCar(color, kind='car'){
  const g = new THREE.Group();
  const add = (geo, mat, cast=true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; g.add(m); return m; };
  if (AUTA){
    if (kind === 'police'){
      add(AUTA.police_rest, carRestMat); add(AUTA.police_lights, carLightMat, false); add(policeWord.geo, policeWord.mat, false);
      const red = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff1030, emissiveIntensity: .3 });
      const blue = new THREE.MeshStandardMaterial({ color: 0x000040, emissive: 0x1040ff, emissiveIntensity: .3 });
      add(AUTA.police_red, red, false); add(AUTA.police_blue, blue, false); g.userData.red = red; g.userData.blue = blue;
    } else {
      add(kind === 'taxi' ? carParts.taxi : carParts.paint, kind === 'taxi' ? taxiMat : paint(color)); add(carParts.rest, carRestMat, false); add(carParts.lights, carLightMat, false);
      if (kind === 'taxi') add(carGeo.taxiSign, new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffb000, emissiveIntensity: .3 }), false);
    }
    scene.add(g); return g;
  }
  add(carParts.paint, paint(color)); add(carParts.rest, carRestMat, false); add(carParts.lights, carLightMat, false);
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
  const mesh = type==='moto' ? makeMoto(color) : type==='tuk' ? makeTuktuk(color) : makeCar(color, type);
  mesh.position.set(x, 0, z); mesh.rotation.y = yaw;
  const v = { type, mesh, pos: mesh.position, yaw, speed: 0, steer: 0,
    max: type==='moto' ? 26 : type==='police' ? 25 : type==='tuk' ? 15 : 22, accel: type==='moto' ? 12 : type==='tuk' ? 8 : 10, turn: type==='moto' ? 2.5 : type==='tuk' ? 2.3 : 1.9,
    circles: type==='moto' ? [[0,.6]] : type==='tuk' ? [[.7,.85],[-.6,.85]] : [[1.25,1.05],[-1.25,1.05]], home: { x, z, yaw } };
  vehicles.push(v); return v;
}
const reserved = [[11,43.3],[19,43],[32,43],[26,43.2]];   // the last one is العربي's sports car (05c)
const heroMoto = addVehicle('moto', 11, 43.3, Math.PI/2, '#b3121f');
const heroCar = addVehicle('car', 19, 43, Math.PI/2, '#e8b21a');
const copCar = addVehicle('police', 32, 43, Math.PI/2, '#f4f4f4');
parkedSpots.forEach((p, pi) => { if (reserved.some(([x,z]) => Math.hypot(p.x-x, p.z-z) < 7)) return; if (GFX === 'low' && pi % 3 === 1) return; /* weak phones: a third fewer parked cars */ addVehicle(rng()<.3 ? 'taxi' : 'car', p.x, p.z, p.ry, rng()<.3 ? '#f2f2f2' : pick(COLORS)).mesh.position.y = p.y; });
vehicles.forEach(v => v.home.y = v.mesh.position.y);
function vCircles(v, x=v.pos.x, z=v.pos.z, yaw=v.yaw){ const fx=Math.sin(yaw), fz=Math.cos(yaw); return v.circles.map(([o,r]) => ({ x:x+fx*o, z:z+fz*o, r })); }

// traffic
const traffic = [];
const TRAFFIC_N = GFX === 'low' ? 18 : GFX === 'mid' ? 24 : 30;   // fewer moving cars on weak phones
for (let i=0;i<TRAFFIC_N;i++){
  const kind = i%5===0 ? 'tuk' : i%3===0 ? 'taxi' : 'car';
  const c = kind==='tuk' ? makeTuktuk(pick(['#b3121f','#1f4fa8','#e0a21a'])) : makeCar(kind==='taxi' ? '#f2f2f2' : pick(COLORS), kind);
  const ax = i%3 === 0 ? 'z' : 'x', road = ax === 'x' ? pick(ROADS_Z) : (i%6 === 0 ? BRIDGE.x : pick(ROADS_X));
  c.userData = { kind, axis: ax, road, dir: rng()<.5 ? 1 : -1, s: ax === 'x' ? R(X0-15, XMAX+15) : road === BRIDGE.x ? R(Z0, BRIDGE.z1) : R(Z0+8, ZMAX-8), base: kind==='tuk' ? R(6,8) : R(8,12.5), speed: 9, len: kind==='tuk' ? 1.4 : 2.45, turn: null, next: null, waitT: 0, ghostT: 0, honkT: 0 };
  traffic.push(c);
}
// traffic drives on the right of the road grid. At a crossing a car sometimes turns (a smooth curve); roads that end
// (the north-south streets at the sea and at the south edge) always turn. The bridge road and the east-west roads run off the map and come back.
const LANE = 3;
const lanePt = (axis, road, dir, s, out) => axis === 'x' ? out.set(s, 0, road + LANE*dir) : out.set(road - LANE*dir, 0, s);
function placeTraffic(c){ const u = c.userData; if (u.turn) return; lanePt(u.axis, u.road, u.dir, u.s, c.position); c.rotation.y = u.axis === 'x' ? (u.dir > 0 ? Math.PI/2 : -Math.PI/2) : (u.dir > 0 ? 0 : Math.PI); }
traffic.forEach(placeTraffic);
// the next crossing ahead of a car (and whether it has to turn there)
function nextCrossing(u){
  const list = u.axis === 'x' ? ROADS_X : ROADS_Z;
  let J = null; for (const v of list){ if ((v - u.s) * u.dir > 6.5 && (J === null || Math.abs(v - u.s) < Math.abs(J - u.s))) J = v; }
  if (J === null) return null;
  const endOfRoad = u.axis === 'z' && u.road !== BRIDGE.x && (J === ZMAX || J === Z0);
  return { J, must: endOfRoad, decided: false, turn: false };
}
function startTurn(c, J){
  const u = c.userData, R = u.road, d = u.dir;
  // where to: the other axis, either way, but not off a north-south street's end
  let nd = rng() < .5 ? 1 : -1;
  if (u.axis === 'x'){ const ok = x => !((R === ZMAX && x > 0 && J !== BRIDGE.x) || (R === Z0 && x < 0)); if (!ok(nd)) nd = -nd; if (!ok(nd)) return false; }
  const p0 = c.position.clone(), p2 = new THREE.Vector3(), p1 = new THREE.Vector3();
  if (u.axis === 'x'){ lanePt('z', J, nd, R + 6*nd, p2); p1.set(J - LANE*nd, 0, R + LANE*d); }
  else { lanePt('x', J, nd, R + 6*nd, p2); p1.set(R - LANE*d, 0, J + LANE*nd); }
  u.turn = { p0, p1, p2, t: 0, len: (p0.distanceTo(p1) + p1.distanceTo(p2)) * .85, to: { axis: u.axis === 'x' ? 'z' : 'x', road: J, dir: nd, s: R + 6*nd } };
  return true;
}
const _tq = new THREE.Vector3(), _tq2 = new THREE.Vector3();
function trafficStep(c, dt, t, playing){
  const u = c.userData; let target = u.turn ? Math.min(u.base, 6.5) : u.base;
  u.ghostT -= dt; u.honkT -= dt;
  if (u.ghostT <= 0){
    // whatever is just in front: another car, the player's car, the player on foot
    for (const o of traffic){ if (o === c) continue; const L = carLocal(c, o.position); if (L.along > 0 && L.along < 8 && Math.abs(L.lat) < 1.7) target = Math.min(target, L.along < 5 ? 0 : o.userData.speed); }
    for (const tx of [tram.x - 9, tram.x, tram.x + 9]){ const L = carLocal(c, _tq2.set(tx, 0, TRAM.z)); if (L.along > 0 && L.along < 9 && Math.abs(L.lat) < 2.4){ target = 0; break; } }
    if (hero.veh){ const L = carLocal(c, hero.veh.pos); if (L.along > 0 && L.along < 9 && Math.abs(L.lat) < 1.9) target = 0; }
    else if (!HOUSE.inside){ const L = carLocal(c, hero.pos); if (L.along > 0 && L.along < 7.5 && Math.abs(L.lat) < 1.5){ target = 0; if (playing && u.honkT <= 0 && L.along < 6){ u.honkT = R(2.5, 5); if (c.position.distanceTo(hero.pos) < 25) horn(); } } }
    // wait while another car is in the middle of the crossing ahead
    if (!u.turn && u.next){ const ahead = (u.next.J - u.s) * u.dir; if (ahead > 0 && ahead < 11){ const cx = u.axis === 'x' ? u.next.J : u.road, cz = u.axis === 'x' ? u.road : u.next.J; for (const o of traffic){ if (o !== c && (o.userData.turn || o.userData.axis !== u.axis) && Math.abs(o.position.x - cx) < 6 && Math.abs(o.position.z - cz) < 6){ target = 0; break; } } } }
  }
  // stuck behind each other for a while (two cars waiting for one another): this one goes anyway
  if (target === 0 && u.speed < .3){ u.waitT += dt; if (u.waitT > 3.5){ u.ghostT = 1.6; u.waitT = 0; } } else u.waitT = 0;
  u.speed += (target - u.speed) * damp(3, dt);
  if (u.turn){
    const T = u.turn; T.t = Math.min(1, T.t + u.speed * dt / T.len); const k = T.t, a = (1-k)*(1-k), b = 2*(1-k)*k, e = k*k;
    c.position.set(a*T.p0.x + b*T.p1.x + e*T.p2.x, 0, a*T.p0.z + b*T.p1.z + e*T.p2.z);
    _tq.set(2*(1-k)*(T.p1.x - T.p0.x) + 2*k*(T.p2.x - T.p1.x), 0, 2*(1-k)*(T.p1.z - T.p0.z) + 2*k*(T.p2.z - T.p1.z));
    if (_tq.lengthSq() > 1e-6) c.rotation.y = Math.atan2(_tq.x, _tq.z);
    if (T.t >= 1){ Object.assign(u, T.to); u.turn = null; u.next = null; placeTraffic(c); }
    return;
  }
  u.s += u.speed * u.dir * dt;
  if (!u.next) u.next = nextCrossing(u);
  const n = u.next;
  if (n && !n.decided && (n.J - u.s) * u.dir <= 6){ n.decided = true; if ((n.must || rng() < .3) && startTurn(c, n.J)) return; u.next = null; }
  if (n && (u.s - n.J) * u.dir > 1) u.next = null;
  const lo = u.axis === 'x' ? X0 - 30 : Z0 - 30, hi = u.axis === 'x' ? XMAX + 30 : BRIDGE.z1 + 45;
  if (u.dir > 0 && u.s > hi){ u.s = lo; u.next = null; } else if (u.dir < 0 && u.s < lo){ u.s = hi; u.next = null; }
  placeTraffic(c);
}
// chaser for the cash mode
const chaserCar = makeCar('#f4f4f4', 'police'); chaserCar.visible = false;
const chaserLight = new THREE.PointLight(0xff2040, 0, 22, 1.6); chaserLight.position.set(0, 2.2, 0); chaserCar.add(chaserLight);

// ---- 05b-rig3d.js ----
﻿// ================= 3D characters: auto-rig + procedural moves =================
// Models come from tools/shrink_model.py: one textured mesh, A-pose, feet on y = 0, facing +z, 1.8 m tall.
// The rig finds the joints from the shape, builds 18 bones and skin weights, and the moves are drawn in code.
const RV = (x, y, z) => new THREE.Vector3(x, y, z);
function segDist(p, a, b){ const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); }

function findJoints(pos, H){
  const n = pos.count, P = i => RV(pos.getX(i), pos.getY(i), pos.getZ(i));
  let tipL = null, tipR = null;                         // hand tips: the furthest points to each side
  for (let i = 0; i < n; i++){ const x = pos.getX(i); if (!tipL || x > tipL.x) tipL = P(i); if (!tipR || x < tipR.x) tipR = P(i); }
  const legX = (y0, y1, side) => { let s = 0, c = 0; for (let i = 0; i < n; i++){ const y = pos.getY(i), x = pos.getX(i); if (y > y0*H && y < y1*H && Math.sign(x) === side && Math.abs(x) < .16*H){ s += x; c++; } } return c ? s / c : side * .06*H; };
  const kneeXL = legX(.26, .31, 1), kneeXR = legX(.26, .31, -1), ankleXL = legX(.04, .08, 1), ankleXR = legX(.04, .08, -1);
  let zs = 0, zc = 0; for (let i = 0; i < n; i++){ const y = pos.getY(i); if (y > .6*H && y < .75*H && Math.abs(pos.getX(i)) < .08*H){ zs += pos.getZ(i); zc++; } }
  const cz = zc ? zs / zc : 0;
  let w = 0; for (let i = 0; i < n; i++){ const y = pos.getY(i), x = Math.abs(pos.getX(i)); if (y > .76*H && y < .8*H && x < .2*H) w = Math.max(w, x); }
  let shX = Math.max(.08*H, w * .78), shY = .805*H;
  // T-pose (hands up at shoulder height): the arms fill that height, so measure the chest just under the armpits instead
  if ((tipL.y + tipR.y) / 2 > .7*H){
    let wc = 0; for (let i = 0; i < n; i++){ const y = pos.getY(i), x = Math.abs(pos.getX(i)); if (y > .64*H && y < .69*H && x < .2*H) wc = Math.max(wc, x); }
    shX = Math.max(.07*H, wc * .82); shY = Math.max(.76*H, Math.min(.83*H, (tipL.y + tipR.y) / 2 + .005*H));
  }
  const arm = (tip, s) => { const sh = RV(s*shX, shY, cz), d = tip.clone().sub(sh); return { sh, el: sh.clone().addScaledVector(d, .42), wr: sh.clone().addScaledVector(d, .76), tip: tip.clone() }; };
  const hipY = .52*H;
  const leg = (kx, ax, s) => ({ hip: RV(s*Math.max(.045*H, Math.abs(kx)*.9), hipY, cz), knee: RV(kx, .285*H, cz + .01*H), ankle: RV(ax, .045*H, cz - .01*H), toe: RV(ax, .01*H, cz + .075*H) });
  return { cz, H, armL: arm(tipL, 1), armR: arm(tipR, -1), legL: leg(kneeXL, ankleXL, 1), legR: leg(kneeXR, ankleXR, -1),
    pelvis: RV(0, hipY, cz), spine: RV(0, .6*H, cz), chest: RV(0, .7*H, cz), neck: RV(0, .82*H, cz), head: RV(0, .87*H, cz), top: RV(0, 1.0*H, cz) };
}

// pre: the saved result of an earlier rig of the same model (assets/models/<name>.rig.json, made by tools/bake_rigs.mjs);
// with it the slow part (joints from the shape, skin weights) is skipped, which matters on phones
function rigModel(srcMesh, pre){
  const geo = srcMesh.geometry.clone(), pos = geo.attributes.position; geo.computeBoundingBox();
  const H = geo.boundingBox.max.y - geo.boundingBox.min.y, J = pre ? rigJointsFrom(pre.J) : findJoints(pos, H);
  const bones = {}, list = [];
  const mk = (name, at, parent) => { const b = new THREE.Bone(); b.name = name; const pw = parent ? parent.userData.w : RV(0, 0, 0); b.position.copy(at).sub(pw); b.userData.w = at.clone(); if (parent) parent.add(b); bones[name] = b; list.push(b); return b; };
  const root = mk('root', RV(0, 0, J.cz), null);
  const pelvis = mk('pelvis', J.pelvis, root), spine = mk('spine', J.spine, pelvis), chest = mk('chest', J.chest, spine), neck = mk('neck', J.neck, chest); mk('head', J.head, neck);
  for (const [s, A, Lg] of [['L', J.armL, J.legL], ['R', J.armR, J.legR]]){
    const ua = mk('upperArm' + s, A.sh, chest), la = mk('lowerArm' + s, A.el, ua); mk('hand' + s, A.wr, la);
    const ul = mk('upperLeg' + s, Lg.hip, pelvis), ll = mk('lowerLeg' + s, Lg.knee, ul); mk('foot' + s, Lg.ankle, ll);
  }
  let si, sw, skirt;
  if (pre){ ({ si, sw } = rigUnpack(pre, pos.count)); skirt = !!pre.skirt; }
  else {
  const segs = [
    ['pelvis', J.pelvis, J.spine, 0], ['spine', J.spine, J.chest, 0], ['chest', J.chest, J.neck, 0], ['neck', J.neck, J.head, 0], ['head', J.head, J.top, 0],
    ['upperArmL', J.armL.sh, J.armL.el, 1], ['lowerArmL', J.armL.el, J.armL.wr, 1], ['handL', J.armL.wr, J.armL.tip, 1],
    ['upperArmR', J.armR.sh, J.armR.el, -1], ['lowerArmR', J.armR.el, J.armR.wr, -1], ['handR', J.armR.wr, J.armR.tip, -1],
    ['upperLegL', J.legL.hip, J.legL.knee, 1], ['lowerLegL', J.legL.knee, J.legL.ankle, 1], ['footL', J.legL.ankle, J.legL.toe, 1],
    ['upperLegR', J.legR.hip, J.legR.knee, -1], ['lowerLegR', J.legR.knee, J.legR.ankle, -1], ['footR', J.legR.ankle, J.legR.toe, -1],
  ];
  const NB = { pelvis: ['spine', 'upperLegL', 'upperLegR'], spine: ['pelvis', 'chest'], chest: ['spine', 'neck', 'upperArmL', 'upperArmR'], neck: ['chest', 'head'], head: ['neck'],
    upperArmL: ['chest', 'lowerArmL'], lowerArmL: ['upperArmL', 'handL'], handL: ['lowerArmL'], upperArmR: ['chest', 'lowerArmR'], lowerArmR: ['upperArmR', 'handR'], handR: ['lowerArmR'],
    upperLegL: ['pelvis', 'lowerLegL'], lowerLegL: ['upperLegL', 'footL'], footL: ['lowerLegL'], upperLegR: ['pelvis', 'lowerLegR'], lowerLegR: ['upperLegR', 'footR'], footR: ['lowerLegR'] };
  const idx = {}; for (const [name] of segs) idx[name] = list.indexOf(bones[name]);
  const n = pos.count, p = RV(0, 0, 0), d = segs.map(s => [s[0], 0]); si = new Uint16Array(n*4); sw = new Float32Array(n*4);
  for (let i = 0; i < n; i++){
    p.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    const side = Math.abs(p.x) < .015*H ? 0 : Math.sign(p.x);
    for (let k = 0; k < segs.length; k++){ const [name, a, b, s] = segs[k]; d[k][0] = name; d[k][1] = (s && side && s !== side) ? 1e9 : segDist(p, a, b); }
    const sorted = d.slice().sort((a, b) => a[1] - b[1]);
    const best = sorted[0], ok = NB[best[0]];
    const cand = sorted.filter(([name, dist]) => (name === best[0] || ok.includes(name)) && dist < best[1] * 1.7 + .01*H).slice(0, 4);
    let tot = 0; const ws = cand.map(([name, dist]) => { const w = 1 / Math.pow(dist + .004*H, 4); tot += w; return [name, w]; });
    ws.forEach(([name, w], k) => { si[i*4 + k] = idx[name]; sw[i*4 + k] = w / tot; });
  }
  smoothWeights(geo, pos, si, sw, list.length, segs.map(([name, , , sd]) => [idx[name], sd]), H);
  // long dresses (no gap between the legs at knee height): the skirt follows the pelvis at the top and both thighs
  // lower down, blended across the middle, so it sways with the steps instead of splitting into two trouser legs
  // a dress fills the middle from its front to its back; trousers only touch in the middle (baggy legs, inner seams)
  let kn = 0, mid = 0, zs = 0, zMax = -1e9, zMin = 1e9, mMax = -1e9, mMin = 1e9;
  for (let i = 0; i < n; i++){ const y = pos.getY(i); if (y > .2*H && y < .3*H){ const z = pos.getZ(i); kn++; zs += z; zMax = Math.max(zMax, z); zMin = Math.min(zMin, z); if (Math.abs(pos.getX(i)) < .015*H){ mid++; mMax = Math.max(mMax, z); mMin = Math.min(mMin, z); } } }
  const zc = kn ? zs / kn : 0;
  skirt = kn > 0 && mid / kn > .04 && (mMax - zc) > .8 * (zMax - zc) && (zc - mMin) > .8 * (zc - zMin);
  if (skirt){
    const arms = new Set(['upperArmL', 'lowerArmL', 'handL', 'upperArmR', 'lowerArmR', 'handR'].map(nm => idx[nm]));
    const top = J.pelvis.y - .02*H, bot = .02*H, sm = x => x * x * (3 - 2 * x);
    for (let i = 0; i < n; i++){
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (y >= top || y <= bot || (arms.has(si[i*4]) && sw[i*4] > .4)) continue;
      if (y < .065*H && [J.legL, J.legR].some(L => segDist(RV(x, y, z), L.ankle, L.toe) < .045*H)) continue;   // the shoes stay on the feet
      // above the knees: pelvis -> thighs; below: thighs -> shins (so it hangs down when she sits); blended left/right
      const c01 = v => Math.max(0, Math.min(1, v)), kneeY = (J.legL.knee.y + J.legR.knee.y) / 2, s = sm(c01(.5 + x / (.2*H)));
      if (y >= kneeY){
        const t = sm(c01((top - y) / (top - kneeY)));
        si[i*4] = idx.pelvis; si[i*4+1] = idx.upperLegL; si[i*4+2] = idx.upperLegR; si[i*4+3] = idx.spine;
        sw[i*4] = 1 - t; sw[i*4+1] = t * s; sw[i*4+2] = t * (1 - s); sw[i*4+3] = 0;
      } else {
        const u = sm(c01((kneeY - y) / (kneeY - .14*H)));
        si[i*4] = idx.upperLegL; si[i*4+1] = idx.upperLegR; si[i*4+2] = idx.lowerLegL; si[i*4+3] = idx.lowerLegR;
        sw[i*4] = (1 - u) * s; sw[i*4+1] = (1 - u) * (1 - s); sw[i*4+2] = u * s; sw[i*4+3] = u * (1 - s);
      }
    }
  }
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  const mesh = new THREE.SkinnedMesh(geo, srcMesh.material);
  mesh.add(root); mesh.bind(new THREE.Skeleton(list));
  mesh.computeBoundingSphere(); mesh.boundingSphere.radius *= 1.45;   // generous, so no pose pokes out of it
  const armAng = s => { const A = s > 0 ? J.armL : J.armR; const v = A.wr.clone().sub(A.sh); return Math.atan2(Math.abs(v.x), -v.y); };
  return { mesh, bones, J, H, skirt, head: pre && pre.head ? pre.head : measureHead(pos, H, J), armDown: { L: armAng(1), R: armAng(-1) }, t: 0, phase: 0 };
}
// ---- saving a rig: joints as arrays, bone numbers and weights as bytes in base64 ----
function rigJointsTo(o){ if (o && o.isVector3) return [+o.x.toFixed(5), +o.y.toFixed(5), +o.z.toFixed(5)]; if (o && typeof o === 'object'){ const r = {}; for (const k in o) r[k] = rigJointsTo(o[k]); return r; } return o; }
function rigJointsFrom(o){ if (Array.isArray(o) && o.length === 3 && typeof o[0] === 'number') return RV(o[0], o[1], o[2]); if (o && typeof o === 'object'){ const r = {}; for (const k in o) r[k] = rigJointsFrom(o[k]); return r; } return o; }
function b64(bytes){ let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)); return btoa(s); }
function unb64(s){ const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
function rigData(R){
  const g = R.mesh.geometry, si = g.attributes.skinIndex.array, sw = g.attributes.skinWeight.array;
  const qi = new Uint8Array(si.length), qw = new Uint8Array(sw.length);
  for (let i = 0; i < si.length; i++){ qi[i] = si[i]; qw[i] = Math.round(sw[i] * 255); }
  return { v: 1, count: g.attributes.position.count, J: rigJointsTo(R.J), skirt: R.skirt, head: R.head, si: b64(qi), sw: b64(qw) };
}
function rigUnpack(pre, count){
  const qi = unb64(pre.si), qw = unb64(pre.sw); if (qi.length !== count * 4) throw new Error('saved rig does not match the model');
  const si = new Uint16Array(qi), sw = new Float32Array(qw.length);
  for (let i = 0; i < count; i++){ let t = 0; for (let k = 0; k < 4; k++) t += qw[i*4+k]; for (let k = 0; k < 4; k++) sw[i*4+k] = t ? qw[i*4+k] / t : (k ? 0 : 1); }
  return { si, sw };
}
// face landmarks from the shape (for the glasses, cap and chain)
function measureHead(pos, H, J){
  const n = pos.count, X = i => pos.getX(i), Y = i => pos.getY(i), Z = i => pos.getZ(i);
  let noseY = .9*H, nz = -1e9;                                   // the nose tip: the most forward point of the face
  for (let i = 0; i < n; i++){ const y = Y(i); if (y > .83*H && y < .93*H && Math.abs(X(i)) < .012*H && Z(i) > nz){ nz = Z(i); noseY = y; } }
  const eyeY = noseY + .02*H, capY = eyeY + .025*H, neckY = noseY - .05*H, chestY = neckY - .045*H;
  let faceZ = -1e9, rx = 0, z0 = 1e9, z1 = -1e9, nF = -1e9, nB = 1e9, nX = 0, cF = -1e9;
  for (let i = 0; i < n; i++){
    const x = Math.abs(X(i)), y = Y(i), z = Z(i);
    if (Math.abs(y - eyeY) < .012*H && x > .012*H && x < .03*H) faceZ = Math.max(faceZ, z);
    if (y > capY){ rx = Math.max(rx, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    if (Math.abs(y - neckY) < .006*H && x < .06*H){ nF = Math.max(nF, z); nB = Math.min(nB, z); nX = Math.max(nX, x); }
    if (Math.abs(y - chestY) < .006*H && x < .035*H) cF = Math.max(cF, z);
  }
  // wrist thickness where the watch goes
  const A = J.armL, dir = A.wr.clone().sub(A.el).normalize(), w = A.el.clone().lerp(A.wr, .86), q = RV(0, 0, 0), pds = [];
  for (let i = 0; i < n; i++){ q.set(X(i), Y(i), Z(i)).sub(w); const al = q.dot(dir); if (Math.abs(al) > .006*H) continue; const pd = q.addScaledVector(dir, -al).length(); if (pd < .028*H) pds.push(pd); }
  pds.sort((a, b) => a - b); const wr = pds.length ? pds[Math.floor(pds.length * .8)] : 0;
  return { wristR: wr || .03, eyeY, faceZ, capY, rx, rz: (z1 - z0) / 2, cz: (z1 + z0) / 2, neckY, neckF: nF, neckB: nB, neckX: nX, chestY, chestF: cF };
}
// the shop's accessories as real 3D pieces on the bones
function make3DAccessories(R){
  const B = R.bones, J = R.J, Hd = R.head, H = R.H, at = (bone, w) => w.clone().sub(bone.userData.w);
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 1, roughness: .28 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b1016, metalness: .4, roughness: .12 });
  const out = {};
  { // sunglasses
    const g = new THREE.Group(), fz = Hd.faceZ + .012, hw = Hd.rx * .97, depth = Math.max(.08, fz - Hd.cz);
    for (const s of [-1, 1]){ const l = new THREE.Mesh(new RoundedBoxGeometry(.048, .032, .008, 2, .008), dark); l.position.set(s*.03, 0, 0); g.add(l);
      const sd = new THREE.Mesh(new THREE.BoxGeometry(Math.max(.005, hw - .054), .006, .006), dark); sd.position.set(s*(.054 + (hw - .054)/2), .007, -.004); g.add(sd);
      const tm = new THREE.Mesh(new THREE.BoxGeometry(.006, .006, depth), dark); tm.position.set(s*hw, .007, -depth/2); g.add(tm); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(.014, .006, .006), dark); br.position.set(0, .008, .002); g.add(br);
    g.position.copy(at(B.head, RV(0, Hd.eyeY, fz))); B.head.add(g); out.glasses = g;
  }
  { // red cap
    const g = new THREE.Group(), red = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: .75 }), sx = Hd.rx * 1.13, sz = Hd.rz * 1.1;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI*2, 0, Math.PI/2), red); dome.scale.set(sx, H - Hd.capY + .035, sz); g.add(dome);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .007, 24, 1, false, -Math.PI/2, Math.PI), new THREE.MeshStandardMaterial({ color: 0xa93226, roughness: .75 })); brim.scale.set(sx * .92, 1, .085); brim.position.set(0, .004, sz * .93); brim.rotation.x = .1; g.add(brim);
    g.position.copy(at(B.head, RV(0, Hd.capY, Hd.cz))); B.head.add(g); out.cap = g;
  }
  { // gold chain: round the back of the neck, hanging onto the chest, with a medal
    const g = new THREE.Group(), fz = Hd.chestF + .008, bz = Hd.neckB - .004, dy = Hd.neckY - Hd.chestY, dz = fz - bz;
    const tilt = Math.atan2(dy, dz), rz = Math.hypot(dy, dz) / 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .0045 / Math.min(Hd.neckX * .95 + .006, rz), 6, 40), gold); ring.rotation.x = Math.PI/2; ring.scale.set(Hd.neckX * .95 + .006, rz, Math.min(Hd.neckX * .95 + .006, rz));
    const tg = new THREE.Group(); tg.rotation.x = tilt; tg.add(ring); g.add(tg);
    const med = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .004, 18), gold); med.rotation.x = Math.PI/2 - .25; med.position.set(0, -.018, rz + .006); tg.add(med);
    g.position.copy(at(B.chest, RV(0, (Hd.neckY + Hd.chestY) / 2, (fz + bz) / 2))); B.chest.add(g); out.chain = g;
  }
  { // watch on the left wrist
    const A = J.armL, dir = A.wr.clone().sub(A.el).normalize(), w = A.el.clone().lerp(A.wr, .86);
    const g = new THREE.Group(); g.quaternion.setFromUnitVectors(RV(0, 1, 0), dir);
    const wr = Hd.wristR + .003; g.add(new THREE.Mesh(new THREE.CylinderGeometry(wr, wr, .022, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: .6, side: THREE.DoubleSide })));
    const face = new THREE.Mesh(new THREE.CylinderGeometry(.017, .017, .008, 18), gold); face.rotation.z = Math.PI/2; face.position.x = wr + .003; g.add(face);
    g.position.copy(at(B.lowerArmL, w)); B.lowerArmL.add(g); out.watch = g;
  }
  return out;
}

// soften the skin weights over the surface (3 rounds of averaging with the neighbours), so elbows,
// knees, shoulders and hips bend smoothly instead of creasing; left/right limbs stay apart.
function smoothWeights(geo, pos, si, sw, nb, segSide, H){
  const n = pos.count, key = new Map(), wid = new Int32Array(n); let nw = 0;
  for (let i = 0; i < n; i++){ const k = Math.round(pos.getX(i)*2e4) + ',' + Math.round(pos.getY(i)*2e4) + ',' + Math.round(pos.getZ(i)*2e4); let w = key.get(k); if (w === undefined){ w = nw++; key.set(k, w); } wid[i] = w; }
  const W = new Float32Array(nw*nb), side = new Int8Array(nw);
  for (let i = 0; i < n; i++){ const w = wid[i]; side[w] = Math.abs(pos.getX(i)) < .015*H ? 0 : Math.sign(pos.getX(i)); for (let k = 0; k < 4; k++) W[w*nb + si[i*4+k]] = Math.max(W[w*nb + si[i*4+k]], sw[i*4+k]); }
  // neighbours (welded) from the triangles
  const ix = geo.index.array, nbs = Array.from({ length: nw }, () => []);
  for (let f = 0; f < ix.length; f += 3){ const a = wid[ix[f]], b = wid[ix[f+1]], c = wid[ix[f+2]]; nbs[a].push(b, c); nbs[b].push(a, c); nbs[c].push(a, b); }
  const sideOf = new Int8Array(nb); for (const [bi, sd] of segSide) sideOf[bi] = sd;
  let T = new Float32Array(nw*nb);
  for (let it = 0; it < 3; it++){
    for (let v = 0; v < nw; v++){
      const L = nbs[v], o = v*nb; if (!L.length){ for (let b = 0; b < nb; b++) T[o+b] = W[o+b]; continue; }
      for (let b = 0; b < nb; b++){ let sum = 0; for (const u of L) sum += W[u*nb + b]; T[o+b] = W[o+b]*.5 + sum / L.length * .5; }
      if (side[v]) for (let b = 0; b < nb; b++) if (sideOf[b] && sideOf[b] !== side[v]) T[o+b] = 0;
    }
    const tmp = W.slice(); W.set(T); T = tmp;
  }
  // back to the 4 strongest bones per vertex
  const order = new Array(nb);
  for (let i = 0; i < n; i++){
    const o = wid[i]*nb; for (let b = 0; b < nb; b++) order[b] = b; order.sort((x, y) => W[o+y] - W[o+x]);
    let tot = 0; for (let k = 0; k < 4; k++) tot += W[o + order[k]];
    for (let k = 0; k < 4; k++){ si[i*4+k] = order[k]; sw[i*4+k] = tot > 0 ? W[o + order[k]] / tot : (k ? 0 : 1); }
  }
}

const _re = new THREE.Euler(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qc = new THREE.Quaternion();
const AX = RV(1, 0, 0), AY = RV(0, 1, 0), AZ = RV(0, 0, 1);
function brot(b, x, y, z){ b.quaternion.setFromEuler(_re.set(x, y, z)); }
function addRot(b, x, y, z){ b.quaternion.multiply(_qc.setFromEuler(_re.set(x, y, z))); }
function armRot(b, down, side, swing, out = 0, twist = 0){
  // lower the arm from the A-pose toward the body (around z), then swing it forward/back (around x)
  _qa.setFromAxisAngle(AX, swing); _qb.setFromAxisAngle(AZ, side * -(down - .12 - out));
  b.quaternion.copy(_qa).multiply(_qb);
  if (twist) b.quaternion.multiply(_qc.setFromAxisAngle(AY, twist));   // twist turns the bent forearm in toward the body
}
const lerpN = (a, b, k) => a + (b - a) * k;
// two-bone IK: turn the upper arm and forearm so the hand reaches `target` (world), elbow toward `pole` (world direction).
// k blends from the pose already set (0) to the full reach (1).
const _iv1 = RV(0,0,0), _iv2 = RV(0,0,0), _iv3 = RV(0,0,0), _iv4 = RV(0,0,0), _iv5 = RV(0,0,0), _iv6 = RV(0,0,0), _iv7 = RV(0,0,0), _iv8 = RV(0,0,0);
const _iq1 = new THREE.Quaternion(), _iq2 = new THREE.Quaternion(), _iq3 = new THREE.Quaternion(), _iqA = new THREE.Quaternion(), _iqB = new THREE.Quaternion();
function aimBone(b, child, dir){
  // rotate bone b (in world terms) so the direction to its child points along dir
  b.updateWorldMatrix(true, true);
  const p = b.getWorldPosition(_iv7), c = child.getWorldPosition(_iv8), cur = c.sub(p).normalize();
  _iq1.setFromUnitVectors(cur, dir);
  const wq = b.getWorldQuaternion(_iq2), pq = b.parent.getWorldQuaternion(_iq3);
  b.quaternion.copy(pq.invert().multiply(_iq1.multiply(wq)));
}
function ikArm(R, side, target, pole, k = 1){
  if (k <= 0) return;
  const s = side > 0 ? 'L' : 'R', ua = R.bones['upperArm' + s], la = R.bones['lowerArm' + s], hd = R.bones['hand' + s];
  const fkU = _iqA.copy(ua.quaternion), fkL = _iqB.copy(la.quaternion);
  R.mesh.updateMatrixWorld(true);
  const S = ua.getWorldPosition(RV(0,0,0)), E = la.getWorldPosition(RV(0,0,0)), W = hd.getWorldPosition(RV(0,0,0));
  const a = E.distanceTo(S), b = W.distanceTo(E), dir = target.clone().sub(S);
  const d = Math.max(Math.abs(a - b) + 1e-3, Math.min(a + b - 1e-3, dir.length())); dir.normalize();
  const cosA = (a * a + d * d - b * b) / (2 * a * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const n = RV(0,0,0).crossVectors(dir, pole).normalize(), toPole = RV(0,0,0).crossVectors(n, dir).normalize();
  const elbowDir = dir.clone().multiplyScalar(cosA).addScaledVector(toPole, sinA).normalize();
  aimBone(ua, la, elbowDir);
  const E2 = la.getWorldPosition(RV(0,0,0)); aimBone(la, hd, target.clone().sub(E2).normalize());
  if (k < 1){ ua.quaternion.copy(fkU.slerp(ua.quaternion, k)); la.quaternion.copy(fkL.slerp(la.quaternion, k)); }
}
// o: { f: steps per second (walk/run), k: punch / hit strength 0..1, side: 1 right hand / -1 left,
//      look: head turn (radians, + = to his left), lean: body roll in turns, snap: no blending }
function poseRig(R, move, dt, o = {}){
  const B = R.bones, H = R.H; R.t += dt;
  const t = R.t; let ph = R.phase;
  if (move !== R.move){ R.move = move; R.since = 0; } R.since = (R.since || 0) + dt;
  for (const k in B){ if (k !== 'root') B[k].quaternion.identity(); }
  B.root.position.y = 0; B.pelvis.position.set(R.J.pelvis.x, R.J.pelvis.y, 0);
  let swingL = 0, swingR = 0, elL = -.18, elR = -.18, outL = -.04, outR = -.04, twL = 0, twR = 0;
  if (move === 'idle'){
    // breathing, a slow weight shift from foot to foot, and now and then a look around
    const br = Math.sin(t * 1.8), ws = Math.sin(t * .7);
    brot(B.chest, br * .02, 0, 0); brot(B.head, Math.sin(t * .7) * .03, Math.sin(t * .37) * .1 + Math.max(0, Math.sin(t * .13) - .8) * 2.2, 0);
    B.pelvis.position.x += ws * .008*H; brot(B.pelvis, 0, 0, ws * .025); brot(B.spine, 0, 0, -ws * .02);
    brot(B.upperLegL, 0, 0, -ws * .025); brot(B.upperLegR, 0, 0, -ws * .025); brot(B.lowerLegL, Math.max(0, -ws) * .08, 0, 0); brot(B.lowerLegR, Math.max(0, ws) * .08, 0, 0);
    swingL = .04 + br * .03; swingR = .04 - br * .03;
  } else if (move === 'walk' || move === 'run'){
    const run = move === 'run', amp = run ? 1 : .62, f = o.f || (run ? 9.5 : 6.2); ph = R.phase += dt * f; const s = Math.sin(ph), c = Math.cos(ph);
    const la = R.skirt ? .6 : 1;   // in a long dress the steps are shorter
    brot(B.upperLegL, (-s * .55 * amp - (run ? .1 : 0)) * la, 0, 0); brot(B.upperLegR, (s * .55 * amp - (run ? .1 : 0)) * la, 0, 0);
    const knee = (run ? 1.45 : 1.1) * (R.skirt ? .55 : 1);
    brot(B.lowerLegL, Math.max(0, -Math.sin(ph - .9)) * knee * amp + .06, 0, 0); brot(B.lowerLegR, Math.max(0, Math.sin(ph - .9)) * knee * amp + .06, 0, 0);
    brot(B.footL, s * .22 * amp, 0, 0); brot(B.footR, -s * .22 * amp, 0, 0);
    swingL = s * .5 * amp; swingR = -s * .5 * amp;
    elL = run ? -1.3 : -.25 - Math.max(0, -swingL) * .5; elR = run ? -1.3 : -.25 - Math.max(0, -swingR) * .5;
    B.pelvis.position.y += Math.abs(c) * .018*H * amp - (run ? .022*H : 0); B.pelvis.position.x += s * .006*H;
    brot(B.pelvis, run ? .12 : .03, s * .09 * amp, -s * .035 * amp); brot(B.chest, run ? .07 : .01, -s * .15 * amp, s * .02);
    brot(B.head, run ? -.08 : 0, s * .05 * amp, 0);
  } else if (move === 'punch'){
    // boxing guard, the punching arm shoots straight out, the shoulder turns into it
    const k = o.k ?? Math.max(0, Math.sin(Math.min(1, (t % 1.1) / .35) * Math.PI)), sd = o.side || 1;
    swingL = swingR = -.75; elL = elR = -2.1; outL = outR = -.06;
    if (sd > 0){ swingR = lerpN(-.75, -1.5, k); elR = lerpN(-2.1, -.08, k); outR = lerpN(-.06, .02, k); }
    else { swingL = lerpN(-.75, -1.5, k); elL = lerpN(-2.1, -.08, k); outL = lerpN(-.06, .02, k); }
    brot(B.pelvis, .06, .18 * k * sd, 0); brot(B.chest, .1 * k, .38 * k * sd, 0); brot(B.head, 0, -.5 * k * sd, 0);
    B.pelvis.position.y -= .015*H;
    brot(B.upperLegL, -.32, 0, .04); brot(B.lowerLegL, .38, 0, 0); brot(B.footL, -.06, 0, 0); brot(B.upperLegR, .22, 0, -.04); brot(B.lowerLegR, .18, 0, 0);
  } else if (move === 'hit'){
    // knocked back: leans away, arms thrown back, knees give a little
    const k = o.k ?? 1;
    brot(B.chest, -.3 * k, .15 * k, 0); brot(B.neck, -.15 * k, 0, 0); brot(B.head, -.18 * k, -.2 * k, .1 * k);
    B.pelvis.position.z = -.025*H * k; B.pelvis.position.y -= .02*H * k;
    brot(B.upperLegL, -.2 * k, 0, 0); brot(B.lowerLegL, .4 * k, 0, 0); brot(B.upperLegR, .15 * k, 0, 0); brot(B.lowerLegR, .3 * k, 0, 0);
    swingL = .35 * k; swingR = .25 * k; elL = elR = -.18 - .35 * k; outL = outR = -.04 + .4 * k;
  } else if (move === 'talk'){
    // talking with the hands: one hand explains, the other joins in now and then; little nods
    const a = Math.sin(t * 3.1), b = Math.sin(t * 4.3 + 1), c = Math.max(0, Math.sin(t * 1.7));
    swingR = -.4 + a * .14; elR = -1.2 + b * .3; outR = -.02 + a * .04;
    swingL = -.1 - c * .3; elL = -.3 - c * .8; outL = -.04 + c * .05;
    brot(B.chest, .02, Math.sin(t * 1.1) * .07, 0); brot(B.head, Math.sin(t * 5) * .05, Math.sin(t * 1.3) * .14, Math.sin(t * .9) * .04);
    const ws = Math.sin(t * .7); B.pelvis.position.x += ws * .006*H; brot(B.pelvis, 0, 0, ws * .02);
  } else if (move === 'sit' || move === 'shisha'){
    brot(B.upperLegL, -1.5, 0, .05); brot(B.upperLegR, -1.5, 0, -.05); brot(B.lowerLegL, 1.5, 0, 0); brot(B.lowerLegR, 1.5, 0, 0);
    B.root.position.y = -(R.J.pelvis.y - .29*H); swingL = swingR = -.35; elL = elR = -.6;
    brot(B.spine, .06, 0, 0); brot(B.head, Math.sin(t * .6) * .03, Math.sin(t * .3) * .1, 0);
    if (move === 'shisha'){
      // a 9-second cycle: the hose goes up to the mouth, a long draw with the head back a little, then down again; leaning back, relaxed
      const c = t % 9, ss = x => x * x * (3 - 2 * x), k = c < .8 ? ss(c / .8) : c < 2.6 ? 1 : c < 3.4 ? 1 - ss((c - 2.6) / .8) : 0;
      brot(B.spine, -.04, 0, 0); brot(B.head, -.1 * k + Math.sin(t * .6) * .02, Math.sin(t * .3) * .12 * (1 - k), 0);
      o.ikMouth = k;   // the right hand is placed at the mouth further down (two-bone IK)
    }
  } else if (move === 'moto'){
    brot(B.upperLegL, -1.15, 0, .18); brot(B.upperLegR, -1.15, 0, -.18); brot(B.lowerLegL, 1.35, 0, 0); brot(B.lowerLegR, 1.35, 0, 0);
    B.root.position.y = -(R.J.pelvis.y - .5*H); brot(B.pelvis, .25, 0, 0); brot(B.chest, .15, 0, 0);
    swingL = swingR = -1.05; elL = elR = -.35; outL = outR = .25;
  } else if (move === 'dance'){
    ph = R.phase += dt * 7; const s = Math.sin(ph), s2 = Math.sin(ph * .5);
    B.pelvis.position.x += s * .03*H; B.pelvis.position.y += Math.abs(Math.cos(ph)) * .02*H;
    brot(B.pelvis, 0, s2 * .3, s * .08); brot(B.chest, 0, -s2 * .2, -s * .1); brot(B.head, 0, s2 * .2, s * .1);
    swingL = -1.2 - s * .5; swingR = -1.2 + s * .5; elL = -1.4; elR = -1.4; outL = outR = .7;
    brot(B.upperLegL, -.15 - Math.max(0, s) * .4, 0, 0); brot(B.lowerLegL, Math.max(0, s) * .6, 0, 0);
    brot(B.upperLegR, -.15 - Math.max(0, -s) * .4, 0, 0); brot(B.lowerLegR, Math.max(0, -s) * .6, 0, 0);
  } else if (move === 'cheer'){
    const s = Math.abs(Math.sin(t * 8));
    outL = outR = 1.6 + s * .25; elL = elR = -.35 - s * .4; swingL = swingR = -.15;
    B.pelvis.position.y += s * .05*H; brot(B.upperLegL, -.2 * s, 0, 0); brot(B.upperLegR, -.2 * s, 0, 0); brot(B.lowerLegL, .35 * s, 0, 0); brot(B.lowerLegR, .35 * s, 0, 0);
    brot(B.head, -.15, 0, 0);
  } else if (move === 'wave'){
    swingR = -.2; outR = 2.1; elR = -.2 - Math.abs(Math.sin(t * 6)) * .9; swingL = .05;
    brot(B.head, 0, -.15, 0);
  }
  // long hair and wide sleeves over the shoulders stretch if the arms go up high: keep them lower in a long dress
  if (R.skirt){ outL = Math.min(outL, .85); outR = Math.min(outR, .85); swingL = Math.max(swingL, -1.25); swingR = Math.max(swingR, -1.25); }
  armRot(B.upperArmL, R.armDown.L, 1, swingL, outL, twL); armRot(B.upperArmR, R.armDown.R, -1, swingR, outR, twR);
  brot(B.lowerArmL, elL, 0, 0); brot(B.lowerArmR, elR, 0, 0);
  // looking at someone, and leaning into turns
  if (o.look){ const lk = Math.max(-1.1, Math.min(1.1, o.look)); addRot(B.neck, 0, lk * .4, 0); addRot(B.head, 0, lk * .6, 0); }
  if (o.lean){ const ln = Math.max(-.25, Math.min(.25, o.lean)); addRot(B.pelvis, 0, 0, ln * .4); addRot(B.chest, 0, 0, ln * .6); }
  // hand to the mouth (the shisha hose), or any hand to a point in the world (o.ikTarget = { side, pos, pole, k })
  if (o.ikMouth > 0){
    R.mesh.updateMatrixWorld(true); const hp = B.head.getWorldPosition(_iv1), fw = _iv2.set(0, 0, 1).applyQuaternion(R.mesh.getWorldQuaternion(_iq1));
    const up = _iv3.set(0, 1, 0), right = _iv4.crossVectors(fw, up).normalize();   // the character's right (+z forward, x left)
    const mouth = _iv5.copy(hp).addScaledVector(fw, .15 * R.mesh.scale.y).addScaledVector(up, -.11 * R.mesh.scale.y).addScaledVector(right, .06);   // the wrist sits under the chin, so the fingers hold the hose at the lips
    ikArm(R, -1, mouth, _iv6.copy(up).multiplyScalar(-1).addScaledVector(right, .8).addScaledVector(fw, -.3), o.ikMouth);
  }
  if (o.ikTarget) ikArm(R, o.ikTarget.side, o.ikTarget.pos, o.ikTarget.pole, o.ikTarget.k ?? 1);
  // blend from the last pose: quick inside a move, softer when the move changes, so nothing snaps
  const P = R.prev || (R.prev = {}), first = !P.root;
  const rate = o.snap || first ? 0 : move === 'punch' ? 35 : R.since < .4 ? 10 : 40, a = rate ? 1 - Math.exp(-rate * dt) : 1;
  for (const k in B){
    const b = B[k], p = P[k] || (P[k] = { q: b.quaternion.clone(), v: b.position.clone() });
    if (a < 1){ p.q.slerp(b.quaternion, a); p.v.lerp(b.position, a); b.quaternion.copy(p.q); b.position.copy(p.v); }
    else { p.q.copy(b.quaternion); p.v.copy(b.position); }
  }
}

// a copy of a rigged model with its own skeleton (the mesh data and texture are shared): for NPCs of the same look
function cloneRig(R){
  const root = R.bones.root.clone(true), bones = {};
  root.traverse(b => { if (b.isBone) bones[b.name] = b; });
  const list = R.mesh.skeleton.bones.map(b => bones[b.name]);
  const mesh = new THREE.SkinnedMesh(R.mesh.geometry, R.mesh.material); mesh.castShadow = R.mesh.castShadow;
  mesh.add(root); mesh.bind(new THREE.Skeleton(list, R.mesh.skeleton.boneInverses.map(m => m.clone())), new THREE.Matrix4());
  mesh.boundingSphere = R.mesh.boundingSphere.clone();
  return { ...R, mesh, bones, t: Math.random() * 10, phase: Math.random() * 6, prev: null, move: null, since: 0 };
}

// ---- 05c-models3d.js ----
// ================= 3D characters: loading =================
// load a model made by tools/shrink_model.py; null when it is missing or broken (the game then keeps the photo character)
const RIG_MS = {};   // how long each rig took to build (for checking load time)
async function loadModel3D(name){
  try {
    const { GLTFLoader } = await import('three/addons/GLTFLoader.js');
    const g = await new GLTFLoader().loadAsync(`assets/models/${name}.glb`);
    let src = null; g.scene.traverse(o => { if (o.isMesh && !src) src = o; });
    if (!src) return null;
    const pre = await fetch(`assets/models/${name}.rig.json`).then(r => r.ok ? r.json() : null).catch(() => null);
    const t0 = performance.now(); let R;
    try { R = rigModel(src, pre); } catch (e){ console.warn('saved rig unusable, rigging again:', name, e.message); R = rigModel(src); }
    RIG_MS[name] = Math.round(performance.now() - t0) + (pre ? ' (saved)' : '');
    const m = R.mesh.material; m.side = THREE.FrontSide; if (m.map) m.map.anisotropy = 4;
    R.mesh.castShadow = !LOW;
    return R;
  } catch (e){ console.warn('3D model failed, using the photo:', name, e); return null; }
}
// which models exist is written by build.py; anyone without a model keeps the photo character.
// Only the characters the game already places are loaded (shadia and haidy, islam's bride, join when their scenes are built).
const MODELS_USED = ['tayara', 'arabi', 'islam', 'shams', 'youssef', 'kamel', 'thug', 'soldier', 'npc', 'shadia', 'haidy'];
const MODEL_LIST = store.get('chars2d') === '1' ? [] : (await fetch('assets/models/index.json').then(r => r.json()).catch(() => [])).filter(n => MODELS_USED.includes(n));
let modelsDone = 0; loadStep(.3, 'بيحمّل الشخصيات…');
const MODELS3D = Object.fromEntries(await Promise.all(MODEL_LIST.map(async n => { const r = await loadModel3D(n); modelsDone++; loadStep(.3 + .55 * modelsDone / MODEL_LIST.length, `بيحمّل الشخصيات (${modelsDone}/${MODEL_LIST.length})`); return [n, r]; })));
loadStep(.88, 'بيركن العربيات…');

// العربي's sports car (assets/props/arabi-car.glb): parked in front of the café. It is his, so in the story you
// can't take it (jobOnly); in the free modes anyone can drive it, fast.
let arabiCar = null;
{
  const g = await (async () => { try { const { GLTFLoader } = await import('three/addons/GLTFLoader.js'); return (await new GLTFLoader().loadAsync('assets/props/arabi-car.glb')).scene; } catch (e){ console.warn('Arabi car model failed', e); return null; } })();
  if (g){
    g.traverse(o => { if (o.isMesh){ o.castShadow = !LOW; o.receiveShadow = true; } });
    const x = 26, z = 43.2, yaw = Math.PI / 2; g.position.set(x, 0, z); g.rotation.y = yaw; scene.add(g);
    arabiCar = { type: 'sport', mesh: g, pos: g.position, yaw, speed: 0, steer: 0, max: 34, accel: 15, turn: 1.85, circles: [[1.3, 1.05], [-1.3, 1.05]], home: { x, z, yaw, y: 0 }, jobOnly: 'arabiCar' };
    vehicles.push(arabiCar);
  }
}

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
// a 3D character with the same fields as a photo doll, so the rest of the game can use either one.
// P holds stand-ins (not in the scene): hiding the legs still means "seated" (moto), and photo-only extras attach harmlessly.
function makeDoll3D(R, c, heightM){
  const root = new THREE.Group(), doll = new THREE.Group(); root.add(doll);
  const k = heightM / R.H; R.mesh.scale.setScalar(k); doll.add(R.mesh);
  const P = { legL: new THREE.Object3D(), legR: new THREE.Object3D(), body: new THREE.Object3D(), armL: new THREE.Object3D(), armR: new THREE.Object3D() };
  const blob = new THREE.Mesh(blobGeo, blobMat); blob.rotation.x = -Math.PI/2; blob.position.y = .03; blob.scale.set(.7, .9, 1); root.add(blob);
  scene.add(root);
  return { is3D: true, R, S: heightM / c.PH, c, root, doll, P, mats: [R.mesh.material], blob, phase: 0, tilt: 0, punchT: 0, punchSide: 1, downT: 0, fall: 0, height: heightM,
    hipY: .5 * heightM - .02, yaw: 0, faceYaw: null, forceMove: null, seatMove: 'moto' };
}
// a thud when someone hits the ground
function fallSfx(d){ if (d.fall > .6 && !d.thudded){ d.thudded = true; if (d.root.visible) thud(sfxVol(d.root.position.x, d.root.position.z)); } else if (d.fall < .2) d.thudded = false; }
function makeCharacter(model, c, heightM){ return MODELS3D[model] ? makeDoll3D(MODELS3D[model], c, heightM) : makeDoll(c, heightM); }
function anim3D(d, vx, vz, dt, t){
  const sp = Math.hypot(vx, vz), seated = !d.P.legL.visible;
  let move = seated ? d.seatMove : sp > 5.4 ? 'run' : sp > .35 ? 'walk' : 'idle', o = { f: clamp(sp * 1.55, 4.5, 11) };
  if (d.forceMove){ move = d.forceMove; d.forceMove = null; }
  if (d.punchT > 0 && !seated){ d.punchT -= dt; move = 'punch'; o.k = Math.sin(clamp(1 - d.punchT/.28, 0, 1) * Math.PI); o.side = d.punchSide; }
  if (d.downT > 0) d.downT -= dt;
  d.fall += ((d.downT > 0 ? 1 : 0) - d.fall) * damp(d.downT > 0 ? 9 : 4, dt);
  if (d.fall > .05) move = 'idle';
  fallSfx(d);
  // taking a hit (set by the damage code), and talking with the hands while his line is on screen
  if (d.hitT > 0){ d.hitT -= dt; if (!seated && d.fall < .05 && move !== 'punch'){ move = 'hit'; o.k = clamp(d.hitT / .45 * 1.6, 0, 1); } }
  if (d.talkT > 0){ d.talkT -= dt; if (move === 'idle' && d.fall < .05) move = 'talk'; }
  // facing: the bike's heading when seated, the way he moves when walking; standing still, the others turn to the hero
  let want = null;
  if (seated) want = d.faceYaw;
  else if (sp > .35) want = Math.atan2(vx, vz);
  else if (d !== hero.d){ const dx = hero.pos.x - d.root.position.x, dz = hero.pos.z - d.root.position.z, dd = Math.hypot(dx, dz); if (dd > .4 && dd < 25) want = Math.atan2(dx, dz); }
  const yaw0 = d.yaw;
  if (want != null) d.yaw = seated ? want : lerpAngle(d.yaw, want, damp(sp > .35 ? 12 : 4, dt));
  d.root.rotation.y = d.yaw;
  // lean into turns when running; standing still, the head turns toward the camera (cutscenes) or the hero
  const turn = dt > 0 ? lerpAngle(0, d.yaw - yaw0, 1) / dt : 0;
  d.lean = (d.lean || 0) + ((sp > 3 && !seated ? clamp(-turn * sp * .012, -.25, .25) : 0) - (d.lean || 0)) * damp(6, dt); o.lean = d.lean;
  if (!seated && sp < .35 && d.fall < .05){
    const tgt = CUT.on || d === hero.d ? camera.position : hero.pos, dx = tgt.x - d.root.position.x, dz = tgt.z - d.root.position.z;
    const rel = lerpAngle(0, Math.atan2(dx, dz) - d.yaw, 1), want2 = Math.abs(rel) < 1.7 && Math.hypot(dx, dz) < 20 ? rel * .85 : 0;
    d.look = (d.look || 0) + (want2 - (d.look || 0)) * damp(5, dt);
  } else d.look = (d.look || 0) * (1 - damp(8, dt));
  o.look = d.look;
  d.blob.visible = d.blob.visible && !seated;
  poseRig(d.R, move, dt, o);
  d.doll.position.set(0, d.fall * .12, 0); d.doll.rotation.set(-d.fall * 1.45, 0, 0);
}
function animDoll(d, vx, vz, dt, t){
  if (d.is3D) return anim3D(d, vx, vz, dt, t);
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
  fallSfx(d);
}
const hero = { d: makeCharacter('tayara', CH.hero, 1.8), pos: new THREE.Vector3(), vel: new THREE.Vector3(), knock: new THREE.Vector3(), hp: 100, stamina: 1, tired: false, inv: 0, hurtT: 0, money: 50, veh: null, locked: false, lastDir: new THREE.Vector3(0,0,1) };
const wantedD = makeCharacter('shams', CH.wanted, 1.78), enemyD = makeCharacter('arabi', CH.enemy, 1.84);

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
const NAMES = ['حمادة','كريم','عم سعيد','الحاج محمود','زيزو','أبو علي','شيكو','مصطفى','عم رجب','بيبو','حسن','تامر'];
// every NPC piece shares one material and carries its colours per vertex; torso, head and hair are one piece,
// each arm (sleeve + hand) is one piece: 5 pieces per person instead of 9 (phones draw fewer separate things)
const npcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 });
const npcPart = (geo, color, x = 0, y = 0, z = 0) => { const p = geo.index ? geo.toNonIndexed() : geo.clone(); p.translate(x, y, z); return colored(p, color); };
function makeNPC(){
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const gal = rng() < .3;
  const skin = pick(SKIN), shirt = gal ? pick(GALA) : pick(SHIRTS), pants = pick(PANTS);
  const legs = [], arms = [];
  const legGeo = npcPart(NG.leg, gal ? '#4a3c30' : pants), armGeo = mergeGeometries([npcPart(NG.arm, shirt, 0, -.3, 0), npcPart(NG.hand, skin, 0, -.63, 0)]);
  for (const sx of [-1,1]){
    const lg = new THREE.Group(); lg.position.set(sx*.1, .9, 0); const lm = new THREE.Mesh(legGeo, npcMat); lm.position.y = -.45; lg.add(lm); body.add(lg); legs.push(lg);
    const ar = new THREE.Group(); ar.position.set(sx*.3, 1.47, 0); ar.add(new THREE.Mesh(armGeo, npcMat)); body.add(ar); arms.push(ar);
  }
  const parts = [npcPart(gal ? NG.gala : NG.torso, shirt, 0, gal ? .93 : 1.2, 0), npcPart(NG.head, skin, 0, 1.66, 0), npcPart(NG.hair, pick(HAIR), 0, 1.69, 0)];
  if (rng() < .45) parts.push(npcPart(NG.mus, '#1b1410', 0, 1.62, .125));
  const torso = new THREE.Mesh(mergeGeometries(parts), npcMat); torso.castShadow = true; body.add(torso);
  const sc = R(.93, 1.06); g.scale.setScalar(sc);
  scene.add(g);
  const n = { g, body, legs, arms, state: 'hidden', phase: R(0,6), speed: R(1.1,1.6), yaw: 0, t: 0, dir: 1, block: 0, downT: 0, fall: 0, fleeT: 0, name: pick(NAMES), role: null, head: 2.05*sc };
  g.visible = false; npcs.push(n); return n;
}
for (let i=0;i<46;i++) makeNPC();
const walkBlocks = blocksInfo.map((b,i) => i);
function perimPos(b, t){ const r = 16.6, c = [[b.cx-r,b.cz-r],[b.cx+r,b.cz-r],[b.cx+r,b.cz+r],[b.cx-r,b.cz+r]]; const s = ((Math.floor(t)%4)+4)%4, f = t - Math.floor(t); const a = c[s], e = c[(s+1)%4]; return [a[0]+(e[0]-a[0])*f, a[1]+(e[1]-a[1])*f]; }
function setWalker(n){ n.state = 'walk'; n.role = 'walker'; n.block = pick(walkBlocks); n.t = R(0,4); n.dir = rng()<.5 ? 1 : -1; n.g.visible = true; n.g.rotation.set(0,0,0); n.body.position.y = 0; n.fall = 0; n.downT = 0; }
function seatNPC(n, x, z, ry){ n.state = 'sit'; n.g.visible = true; n.g.position.set(x, .15, z); n.yaw = ry; n.g.rotation.set(0, ry, 0); n.fall = 0; n.downT = 0; }
function npcHit(n, power=1){
  if (n.state === 'hidden') return;
  n.prevState = n.state === 'down' ? n.prevState : n.state; n.state = 'down'; n.downT = 2.6 + power; n.fleeT = 5;
  n.fightT = ((n.prevState === 'walk' || n.prevState === 'fight') && Math.random() < .35) ? 7 : 0;
  if (n.thug){ n.thugHits = (n.thugHits||0) + 1; n.fightT = 999; if (n.thugHits >= 3){ n.thugDone = true; n.downT = 999; n.fightT = 0; say(n, 'خلاص… خلاص!', 2, 'angry'); thwack(); return; } }
  say(n, rpick(['آه يا عم!','إيه ده يا جدع!','هبلغ عنك!','يا ساتر!','حرام عليك!']), 2, 'angry'); thwack();
}
// an NPC can wear a 3D model instead of the low-poly body (شمس's men use the thug / soldier models)
function npcWear3D(n, model){
  if (n.r3 || !MODELS3D[model]) return false;
  n.r3 = cloneRig(MODELS3D[model]); n.g.add(n.r3.mesh); n.body.visible = false; return true;
}
function npcTakeOff3D(n){ if (!n.r3) return; n.g.remove(n.r3.mesh); n.r3 = null; n.body.visible = true; }
function animNPC3D(n, moving, sitting, dt){
  let move = sitting ? 'sit' : moving > 3 ? 'run' : moving > 0 ? 'walk' : 'idle', o = { f: clamp(moving * 1.55, 4.5, 11) };
  if (n.punchT > 0){ n.punchT -= dt; move = 'punch'; o.k = Math.sin(clamp(1 - n.punchT / .3, 0, 1) * Math.PI); o.side = 1; }
  if (n.state === 'down') move = 'idle';
  poseRig(n.r3, move, dt, o);
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
    else { n.yaw = Math.atan2(dx, dz); n.atkT = (n.atkT||0) - dt; if (n.atkT <= 0){ n.atkT = 1.2; n.arms[1].rotation.x = -1.6; n.punchT = .3; setTimeout(() => { n.arms[1].rotation.x = 0; if (n.state === 'fight' && n.g.position.distanceTo(hero.pos) < 1.7) heroDamage(5, 'npc'); }, 150); } }
    n.g.position.y = groundY(n.g.position.x, n.g.position.z);
  }
  // animation
  n.fall += ((n.state === 'down' ? 1 : 0) - n.fall) * damp(n.state === 'down' ? 10 : 4, dt);
  const sitting = n.state === 'sit' || n.state === 'customer' || n.state === 'domino';
  if (moving){ n.phase += dt * moving * 5.2; const s = Math.sin(n.phase); n.legs[0].rotation.x = s*.6; n.legs[1].rotation.x = -s*.6; n.arms[0].rotation.x = -s*.5; n.arms[1].rotation.x = s*.5; n.body.position.y = Math.abs(Math.cos(n.phase))*.03; }
  else if (sitting){ n.legs[0].rotation.x = n.legs[1].rotation.x = -1.45; n.arms[0].rotation.x = n.arms[1].rotation.x = -.5; n.body.position.y = -.43; }
  else { n.legs[0].rotation.x *= .8; n.legs[1].rotation.x *= .8; n.arms[0].rotation.x *= .8; n.arms[1].rotation.x *= .8; n.body.position.y *= .8; }
  if (n.gestT > 0){ n.gestT -= dt; n.arms[1].rotation.x = -1.15 + Math.sin(n.gestT*9)*.45; n.arms[1].rotation.z = .25; } else if (n.arms[1].rotation.z) n.arms[1].rotation.z *= .8;
  if (n.r3) animNPC3D(n, moving, sitting, dt);
  n.g.rotation.y = lerpAngle(n.g.rotation.y, n.yaw, damp(10, dt));
  n.g.rotation.x = -n.fall * 1.5; n.g.position.y += 0;
}

// a few people in the street wear the 3D man in the galabeya (models/npc.glb)
[2, 7, 12, 19].forEach(i => { if (npcs[i]) npcWear3D(npcs[i], 'npc'); });

// ---- 08-bubbles.js ----
// ================= bubbles =================
const bubbleLayer = $('bubbles'); const bubbles = [];
function headOf(ent){ if (ent.g) return _v.set(ent.g.position.x, ent.g.position.y + ent.head - (ent.state==='sit'||ent.state==='customer'||ent.state==='domino' ? .45 : 0), ent.g.position.z); if (ent.d) return _v.set(ent.d.root.position.x, ent.d.root.position.y + ent.d.height + .25, ent.d.root.position.z); return _v.set(0,0,0); }
function say(ent, text, dur=2.6, cls=''){
  let b = bubbles.find(b => b.ent === ent && !b.persist);
  if (!b){ const el = document.createElement('div'); bubbleLayer.appendChild(el); b = { el, ent }; bubbles.push(b); }
  b.el.className = 'bubble ' + cls; b.el.textContent = text; b.t = dur; if (ent.arms && text) ent.gestT = Math.min(dur || 2, 2.2);
  if (ent.g && Math.random() < .55) speak(text);
}
function orderBubble(ent){ const el = document.createElement('div'); el.className = 'bubble order'; bubbleLayer.appendChild(el); const b = { el, ent, persist: true, t: 1e9 }; bubbles.push(b); return b; }
function removeBubble(b){ const i = bubbles.indexOf(b); if (i >= 0) bubbles.splice(i,1); b.el.remove(); }
function clearBubbles(){ while (bubbles.length) removeBubble(bubbles[0]); }
const _p = new THREE.Vector3();
// bubbles keep out of the HUD (the cards and buttons at the top, the action buttons at the bottom) and inside the screen
let hudRects = [], hudRectT = 0;
function readHudRects(){ hudRects = $('hud').hidden ? [] : [...document.querySelectorAll('#hud .top .card, #hud .top .col:last-child, #hud .mbtns, #hud .banner.show')].filter(e => e.offsetWidth).map(e => e.getBoundingClientRect()); }
function placeBubble(b, x, y){
  const txt = b.el.textContent; if (b.txt !== txt || !b.w){ b.txt = txt; b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }   // (0 while its layer is hidden: measure again later)
  const w = b.w, h = b.h + 7;   // y is the tip of the bubble (it hangs above it)
  x = clamp(x, w/2 + 6, innerWidth - w/2 - 6);
  // if it lands on a HUD box: the nearest spot (one or two moves out of the boxes) that is free and on screen
  const hits = (px, py) => hudRects.some(r => px - w/2 < r.right + 4 && px + w/2 > r.left - 4 && py - h < r.bottom + 4 && py > r.top - 4);
  if (hits(x, y)){
    const outs = (px, py) => hudRects.flatMap(r => [[px, r.bottom + h + 6], [px, r.top - 6], [r.left - w/2 - 6, py], [r.right + w/2 + 6, py]]);
    const one = outs(x, y), cands = one.concat(one.flatMap(([px, py]) => outs(px, py)));
    let best = null, bd = 1e9;
    for (const [px, py] of cands){
      if (px - w/2 < 2 || px + w/2 > innerWidth - 2 || py - h < 2 || py > innerHeight - 2) continue;
      const d = Math.abs(px - x) + Math.abs(py - y); if (d < bd && !hits(px, py)){ bd = d; best = [px, py]; }
    }
    if (best){ x = best[0]; y = best[1]; }
  }
  b.el.style.left = x + 'px'; b.el.style.top = clamp(y, h + 4, innerHeight - 4) + 'px';
}
function updateBubbles(dt){
  hudRectT -= dt; if (hudRectT <= 0){ hudRectT = .5; readHudRects(); }
  for (let i=bubbles.length-1;i>=0;i--){
    const b = bubbles[i]; if (!b.persist){ b.t -= dt; if (b.t <= 0){ removeBubble(b); continue; } }
    _p.copy(headOf(b.ent)); const dist = _p.distanceTo(camera.position); _p.project(camera);
    if (_p.z > 1 || dist > 40 || (b.ent.g && !b.ent.g.visible) || (b.ent.d && !b.ent.d.root.visible)){ b.el.style.display = 'none'; continue; }
    b.el.style.display = ''; placeBubble(b, (_p.x+1)/2*innerWidth, (1-_p.y)/2*innerHeight);
  }
}

// ---- 09-audio.js ----
// ================= audio =================
let AC = null, master = null, sfx = null, musicGain = null, crowdGain = null, sirenGain = null;
let muted = store.get('ty_mute') === '1', musicOn = store.get('ty_music') !== '0', voiceOn = store.get('ty_voice') !== '0';
let musicEl = null, beatNext = 0, beatStep = 0;
function setBtnStates(){ $('muteBtn').textContent = muted ? '🔇' : '🔊'; $('voiceBtn').classList.toggle('off', !voiceOn); }
setBtnStates();
function initAudio(){
  if (AC){ AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = muted ? 0 : 1; master.connect(AC.destination);
    sfx = AC.createGain(); sfx.gain.value = .7; sfx.connect(master);
    musicGain = AC.createGain(); musicGain.gain.value = .07; musicGain.connect(master);
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
// original mahraganat-style beat (maqsum rhythm, hijaz riff): only during the wedding dance game
const BPM = 126, STEP = 60/BPM/4, ROOT = 146.83;
const HIJ = [0,1,4,5,7,8,10,12];
const RIFF = [0,null,1,null,4,null,1,0, null,0,5,null,4,1,0,null, 7,null,8,null,7,5,4,null, 5,4,1,null,0,null,null,null];
const BASS = [0,null,null,0,null,null,0,null, -2,null,null,-2,null,null,1,null];
function beatTick(){
  if (!AC || muted || !RHY.on) return;   // the beat is only for the wedding dance game
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
$('voiceBtn').onclick = () => { voiceOn = !voiceOn; store.set('ty_voice', voiceOn?'1':'0'); setBtnStates(); if (voiceOn && !arVoice) banner('جهازك مفيهوش صوت عربي، الكلام هيظهر مكتوب بس', 'info', 3); };

// ---- 09b-sfx.js ----
﻿// ================= sound effects =================
// Everything is made in code with Web Audio (no sound files): the engine that rises and falls with speed,
// tyres, doors, crashes, footsteps, punches, falls, the sea and gulls, crickets at night, the shisha, UI clicks.
const SFX = { ready: false, stepD: 0, lastSp: 0, crashT: 0, gullT: 4, cricketT: 2, shishaT: 2, eng: null, skid: null, sea: null };
function sfxVol(x, z, r = 8){ const d = Math.hypot(camera.position.x - x, camera.position.z - z); return 1 / (1 + Math.max(0, d - 2) / r); }
function loopNoise(type, freq, q = .7){
  if (!noiseBuf){ noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1; }
  const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.loopStart = Math.random() * .5;
  const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = AC.createGain(); g.gain.value = 0;
  s.connect(f); f.connect(g); g.connect(sfx); s.start(); return { s, f, g };
}
function sfxInit(){
  if (!AC || SFX.ready) return; SFX.ready = true;
  // engine: a sawtooth and a square an octave down, through a low-pass, plus a little rumble
  const o1 = AC.createOscillator(), o2 = AC.createOscillator(), g2 = AC.createGain(), lp = AC.createBiquadFilter(), g = AC.createGain();
  o1.type = 'sawtooth'; o2.type = 'square'; g2.gain.value = .45; lp.type = 'lowpass'; lp.frequency.value = 600; g.gain.value = 0;
  o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(sfx); o1.start(); o2.start();
  SFX.eng = { o1, o2, lp, g, rumble: loopNoise('lowpass', 220) };
  SFX.skid = loopNoise('bandpass', 1700, 3);
  SFX.sea = loopNoise('lowpass', 520, .5);
  SFX.wind = loopNoise('bandpass', 380, .4);
}
const ramp = (param, v, dt, k = 8) => { param.value += (v - param.value) * (1 - Math.exp(-k * dt)); };
// one-shots
function stepSfx(sp){ const v = Math.min(1, sp / 4); noise(.045, 650 + Math.random() * 500, .09 * v); tone(130 + Math.random() * 30, 70, .05, 'sine', .05 * v); }
function punchWhoosh(){ noise(.16, 1300, .22, 0, 'bandpass'); }
function thud(v = 1){ tone(110, 42, .28, 'sine', .4 * v); noise(.14, 380, .32 * v); }
function doorSfx(slam = true){ noise(.05, 2400, .16, 0, 'highpass'); if (slam){ tone(170, 80, .14, 'square', .07, .06); noise(.1, 500, .3, .06); } }
function engineStart(type){ const b = type === 'moto' ? 70 : type === 'tuk' ? 52 : 40; tone(b * .6, b * 1.6, .35, 'sawtooth', .07); tone(b * 1.6, b * 1.1, .4, 'sawtooth', .05, .32); }
function crashSfx(sp){ const v = Math.min(1, sp / 18) * .6 + .4; noise(.4, 650, .7 * v); tone(90, 38, .32, 'sawtooth', .22 * v); tone(3100, 2600, .18, 'sine', .04 * v, .06); tone(4200, 3800, .14, 'sine', .03 * v, .1); }
function gull(v){ const p = 1 + Math.random() * .25; tone(1500 * p, 950 * p, .22, 'sawtooth', .018 * v); tone(1650 * p, 1000 * p, .2, 'sawtooth', .015 * v, .26); }
function cricket(v){ const f = 4200 + Math.random() * 600; for (let i = 0; i < 3; i++) tone(f, f * .97, .035, 'sine', .012 * v, i * .06); }
function shishaBubbles(v){ const n = 3 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) tone(280 + Math.random() * 180, 700 + Math.random() * 500, .07, 'sine', .05 * v, i * (.06 + Math.random() * .05)); }
function tileClack(){ noise(.03, 3200, .25, 0, 'highpass'); tone(2100, 1500, .04, 'triangle', .06); }
function uiClick(){ tone(1250, 900, .035, 'triangle', .045); }
document.addEventListener('click', e => { if (AC && !muted && e.target.closest && e.target.closest('button')) uiClick(); }, true);

function sfxUpdate(dt, t){
  if (!AC) return; sfxInit(); if (!SFX.ready || dt <= 0) return;
  const playing = state === 'play' && !CUT.on, v = hero.veh;
  // engine and tyres of the vehicle you drive
  let eg = 0, pitch = 40, sk = 0;
  if (v && playing){
    const sp = Math.abs(v.speed), base = v.type === 'moto' ? 72 : v.type === 'tuk' ? 50 : 38;
    const gear = sp < 1 ? 0 : (sp % 9) / 9;                       // the pitch climbs, drops at each gear change, climbs again
    pitch = base * (1 + sp * .03 + gear * .55); eg = v.type === 'moto' ? .055 : v.type === 'tuk' ? .05 : .045;
    const dv = (SFX.lastSp - sp) / dt; SFX.lastSp = sp;
    if ((dv > 12 && sp > 6) || (Math.abs(v.steer || 0) > .75 && sp > 14)) sk = v.type === 'moto' ? .05 : .085;
  } else SFX.lastSp = 0;
  const E = SFX.eng; ramp(E.o1.frequency, pitch, dt, 10); ramp(E.o2.frequency, pitch / 2, dt, 10); ramp(E.lp.frequency, 300 + pitch * 7, dt, 6);
  ramp(E.g.gain, muted ? 0 : eg, dt, 6); ramp(E.rumble.g.gain, muted ? 0 : eg * .8, dt, 6); ramp(SFX.skid.g.gain, muted ? 0 : sk, dt, 14);
  SFX.crashT -= dt;
  // footsteps
  if (!v && playing && !hero.locked){ const sp = Math.hypot(hero.vel.x, hero.vel.z); if (sp > .5){ SFX.stepD += sp * dt; if (SFX.stepD > (sp > 5.4 ? 1.45 : .78)){ SFX.stepD = 0; stepSfx(sp); } } else SFX.stepD = .5; }
  // the sea along the corniche (louder as you get close, rolling like waves), wind, gulls by day, crickets at night
  const p = v ? v.pos : hero.pos, toSea = Math.max(0, NILE_Z - p.z), near = clamp(1 - toSea / 55, 0, 1);
  const outside = state === 'play' && !HOUSE.inside && !ST.kind;
  ramp(SFX.sea.g.gain, muted || !outside ? 0 : near * (.045 + .03 * Math.sin(t * .5) + .015 * Math.sin(t * 1.3)), dt, 3);
  ramp(SFX.wind.g.gain, muted || !outside ? 0 : .006 + near * .012 + .004 * Math.sin(t * .23), dt, 2);
  const night = isNight();
  if (outside && !muted){
    if (!night && near > .15){ SFX.gullT -= dt; if (SFX.gullT <= 0){ SFX.gullT = R(5, 13); gull(near); } }
    if (night){ SFX.cricketT -= dt; if (SFX.cricketT <= 0){ SFX.cricketT = R(.6, 2.2); cricket(1 - near * .7); } }
    // الحاج كامل's shisha at the domino table: bubbles when you're near
    const dv = sfxVol(SPOT.domino.x, SPOT.domino.z, 3); if (dv > .25){ SFX.shishaT -= dt; if (SFX.shishaT <= 0){ SFX.shishaT = R(3, 6.5); shishaBubbles(dv); } }
  }
}

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
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
canvas.addEventListener('mousedown', e => { if (e.button === 0 && state === 'play' && !isTouch && !ST.kind && $('domino').hidden) punch(); });
const ZOOMS = [5, 7.5, 11]; let zoomIdx = 0, camDist = 5, camTarget = 5;
addEventListener('wheel', e => { camTarget = clamp(camTarget + Math.sign(e.deltaY)*1.2, 4, 15); }, { passive: true });
$('zoomBtn').onclick = () => { if (hero.veh){ CAM.vmode = (CAM.vmode + 1) % 3; store.set('ty_vcam', String(CAM.vmode)); banner(['📷 كاميرا ورا العربية', '📷 كاميرا بعيدة', '📷 من جوه العربية'][CAM.vmode], 'info', 1.2); return; } zoomIdx = (zoomIdx+1) % ZOOMS.length; camTarget = ZOOMS[zoomIdx]; };
$('menuBtn').onclick = () => openPause();
const lockLandscape = () => { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch(e){} };
const goFull = () => { const d = document.documentElement; if (document.fullscreenElement){ lockLandscape(); return; } try { const r = (d.requestFullscreen || d.webkitRequestFullscreen).call(d, { navigationUI: 'hide' }); if (r && r.then) r.then(lockLandscape, () => {}); else lockLandscape(); } catch(e){} };
$('fsBtn').onclick = () => { if (document.fullscreenElement) { try { document.exitFullscreen(); } catch(e){} } else goFull(); };
canvas.addEventListener('contextmenu', e => e.preventDefault());
let joyHintOn = store.get('ty_joy') !== '1'; const hideJoyHint = () => { if (joyHintOn){ joyHintOn = false; store.set('ty_joy','1'); $('joyHint').classList.remove('show'); } };
if (joyHintOn) $('joyHint').classList.add('show');
const joy = { id: null, x0: 0, y0: 0, vx: 0, vz: 0, mag: 0 }; const joyEl = $('joy'), knob = $('knob');
// camera orbit: drag on the right side of the screen (touch) or with the right mouse button
const CAM = { orbit: 0, orbitSm: 0, tilt: .44, veh: 0, lastDrag: -9, drag: null, vmode: +(store.get('ty_vcam') || 0) % 3, cy: 0 };   // vmode: 0 behind, 1 far, 2 inside
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
  if (e.pointerId !== joy.id) return; let dx = e.clientX - joy.x0, dy = e.clientY - joy.y0; const m = Math.hypot(dx,dy), max = 55; if (m > max){ dx *= max/m; dy *= max/m; } if (hero.veh){ dy = 0; dx = clamp(dx * 55 / 75, -55, 55); } joy.vx = dx/max; joy.vz = dy/max; joy.mag = Math.min(1, m/max); knob.style.transform = `translate(${dx}px,${dy}px)`;
});
const endJoy = e => { if (CAM.drag && e.pointerId === CAM.drag.id){ CAM.drag = null; return; } if (e.pointerId !== joy.id) return; joy.id = null; joy.vx = joy.vz = joy.mag = 0; joyEl.style.display = 'none'; };
addEventListener('pointerup', endJoy); addEventListener('pointercancel', endJoy);
const pedal = { gas: false, brake: false };
for (const [id, k] of [['gasBtn', 'gas'], ['brakeBtn', 'brake']]){
  const b = $(id);
  b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); pedal[k] = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch(err){} if (k === 'gas') hideSteerHint(); });
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev => b.addEventListener(ev, () => { pedal[k] = false; b.classList.remove('on'); }));
}
let steerHintOn = store.get('ty_steer') !== '1'; function hideSteerHint(){ if (steerHintOn && joy.id !== null){ steerHintOn = false; store.set('ty_steer', '1'); } $('steerHint').classList.toggle('show', steerHintOn); }
let runBtn = false; const rb = $('runBtn');
rb.addEventListener('pointerdown', e => { e.stopPropagation(); runBtn = true; rb.classList.add('on'); });
['pointerup','pointerleave','pointercancel'].forEach(ev => rb.addEventListener(ev, () => { runBtn = false; rb.classList.remove('on'); }));
$('actBtn').addEventListener('pointerdown', e => { e.stopPropagation(); if (state === 'play') action(); });
$('punchBtn').addEventListener('pointerdown', e => { e.stopPropagation(); if (state === 'play'){ if (hero.veh) horn(); else punch(); } });

// on a phone, the first tap goes fullscreen and turns the game sideways
if (isTouch) addEventListener('pointerdown', function first(){ goFull(); removeEventListener('pointerdown', first, true); }, true);

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
  if (hero.inv > 0 || state !== 'play' || CUT.on || HOUSE.inside) return;
  hero.hp -= n; hero.hurtT = 0; hero.d.hitT = .45; flash(); thwack(); shake = Math.max(shake, .35);
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
function blocked(x, z){ if (HOUSE.inside) return !HOUSE.inRoom(x, z) || staticBlocked(x, z); return !inWorld(x, z) || staticBlocked(x, z) || vehBlockedAt(x, z, PR, hero.veh) || tramBlocks(x, z); }
function freeSpot(x, z){ if (!staticBlocked(x, z, .5) && inWorld(x, z)) return [x, z]; for (let r = .6; r < 6; r += .4) for (let a = 0; a < 6.28; a += .4){ const nx = x + Math.sin(a)*r, nz = z + Math.cos(a)*r; if (inWorld(nx, nz) && !staticBlocked(nx, nz, .5)) return [nx, nz]; } return [x, z]; }
function groundY(x, z){ if (HOUSE.inside) return 0; for (const b of blocksInfo) if (Math.abs(x-b.cx) < BW/2 && Math.abs(z-b.cz) < BW/2) return .15; if (z > ZMAX + 6 && z < NILE_Z && Math.abs(x - BRIDGE.x) > BRIDGE.w/2) return .15; if (z > FAR.z0 && x > FAR.x0 && x < FAR.x1) return .15; if (x > PIER.x0 && x < PIER.x1 && z >= PIER.z0 && z < PIER.z1) return .15; return 0; }
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
function moveWithSlide(pos, dx, dz, pad=PR){ let moved = false; if (inWorld(pos.x+dx, pos.z) && !staticBlocked(pos.x+dx, pos.z, pad)){ pos.x += dx; moved = true; } if (inWorld(pos.x, pos.z+dz) && !staticBlocked(pos.x, pos.z+dz, pad)){ pos.z += dz; moved = true; } return moved; }
function randomSidewalkPoint(minD, from){ for (let i=0;i<200;i++){ const b = pick(blocksInfo); const p = perimPos(b, R(0,4)); if (!from || Math.hypot(p[0]-from.x, p[1]-from.z) > minD) return new THREE.Vector3(p[0], .15, p[1]); } return new THREE.Vector3(-80,.15,-80); }

// ---- 13-vehicles-enter-drive.js ----
// ================= vehicles: enter / drive =================
function enterVehicle(v){
  if (!modeObj.vehicles){ banner('مفيش ركوب في المود ده', 'info', 1.8); return; }
  if (modeObj.canDrive && !modeObj.canDrive(v)){ banner('دي مش بتاعتك', 'info', 1.5); return; }
  hero.veh = v; v.speed = 0; CAM.veh = 0; CAM.cy = v.yaw; hero.d.blob.visible = false;
  banner(v.type === 'boat' ? 'ركبت اللانش ⚓' : v.type === 'moto' ? 'ركبت الموتوسيكل 🏍️' : v.type === 'police' ? 'ركبت البوكس 🚓' : v.type === 'tuk' ? 'ركبت التوكتوك 🛺' : 'ركبت العربية 🚗', 'ok', 1.6);
  if (v.type !== 'moto') doorSfx(); engineStart(v.type);
}
function exitVehicle(force){
  const v = hero.veh; if (!v) return;
  const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw); const rx = fz, rz = -fx;
  const opts = [[rx*2.1, rz*2.1], [-rx*2.1, -rz*2.1], [-fx*3.2, -fz*3.2], [fx*3.2, fz*3.2]];
  let placed = false;
  if (v.type === 'boat') opts.push([PIER.x0 + 3 - v.pos.x, 0], [(PIER.x0 + PIER.x1) / 2 - v.pos.x, Math.min(PIER.z1 - 1, Math.max(PIER.z0 + 1, v.pos.z)) - v.pos.z]);
  for (const [ox,oz] of opts){ const x = v.pos.x+ox, z = v.pos.z+oz; if (inWorld(x, z) && !staticBlocked(x,z) && !vehBlockedAt(x,z,PR,null) && Math.hypot(ox, oz) < 7){ hero.pos.set(x, groundY(x,z), z); placed = true; break; } }
  if (!placed && !force) { banner('مفيش مكان تنزل فيه', 'info', 1.4); return; }
  if (!placed) hero.pos.set(v.pos.x + 2.5, 0, v.pos.z);
  if (v.type !== 'moto') doorSfx(); else noise(.08, 900, .2);
  v.speed = 0; if (v.type !== 'moto'){ v.mesh.rotation.x = v.mesh.rotation.z = 0; v.pitch = v.roll = 0; } hero.veh = null; CAM.orbit = CAM.orbitSm = camYaw; CAM.veh = 0; hero.d.blob.visible = true; hero.d.doll.visible = true;
  hero.d.P.legL.visible = hero.d.P.legR.visible = true;
}
function driveVehicle(v, dt, inX, inZ, brake){
  const throttle = -inZ, steer = -inX;
  const drift = brake && Math.abs(v.speed) > 7; const vmax = v.max * ((v.dmg||0) >= 100 ? .55 : 1);
  const sp0 = v.speed;
  if (brake){ v.speed *= Math.exp(-dt*(drift ? 1.1 : 4)); }
  else if (Math.abs(throttle) > .05){
    const target = throttle > 0 ? vmax*throttle : vmax*.35*throttle;
    const braking = Math.sign(target) !== Math.sign(v.speed) && Math.abs(v.speed) > .5;
    // strong pull from a standstill that fades near top speed; braking is always strong
    const rate = braking ? 28 : v.accel * (1.35 - .8 * clamp(Math.abs(v.speed) / vmax, 0, 1));
    v.speed += clamp(target - v.speed, -rate*dt, rate*dt);
  } else v.speed *= Math.exp(-dt*.7);
  // the wheel turns quickly and comes back straight a bit quicker when let go
  v.steer += (steer - v.steer) * damp(Math.abs(steer) > .05 ? 9 : 12, dt);
  let sf = clamp(v.speed/6, -1, 1) * (1 - Math.min(Math.abs(v.speed)/v.max, 1)*.35);
  if (Math.abs(throttle) > .05 && Math.abs(sf) < .4) sf = .4 * Math.sign(throttle);
  const nyaw = v.yaw + v.steer * v.turn * (drift ? 1.9 : 1) * sf * dt;
  setLoop('skid', drift ? .1 : 0, 1700, 'bandpass');
  if (drift && Math.random() < dt*14){ _t.set(v.pos.x - Math.sin(v.yaw)*1.8, .2, v.pos.z - Math.cos(v.yaw)*1.8); puff(_t, .5); }
  if ((v.dmg||0) > 60 && Math.random() < dt*6){ _t.set(v.pos.x + Math.sin(v.yaw)*1.8, 1.1, v.pos.z + Math.cos(v.yaw)*1.8); puff(_t, .45); }
  const nx = v.pos.x + Math.sin(nyaw)*v.speed*dt, nz = v.pos.z + Math.cos(nyaw)*v.speed*dt;
  const poseBlocked = v.type === 'boat' ? (x, z, yaw) => vCircles(v, x, z, yaw).some(c => !inSea(c.x, c.z) || vehBlockedAt(c.x, c.z, c.r, v))
    : (x, z, yaw) => vCircles(v, x, z, yaw).some(c => staticBlocked(c.x, c.z, c.r) || vehBlockedAt(c.x, c.z, c.r, v) || tramBlocks(c.x, c.z, c.r) || !inWorld(c.x, c.z));
  // hitting something at an angle: slide along it (keep the free part of the move) instead of bouncing off
  let slid = false;
  if (poseBlocked(nx, nz, nyaw)) for (const [tx, tz] of [[nx, v.pos.z], [v.pos.x, nz]]){
    if (Math.hypot(tx - v.pos.x, tz - v.pos.z) < Math.abs(v.speed) * dt * .35) continue;   // almost head-on: that is a crash
    if (!poseBlocked(tx, tz, nyaw)){ v.pos.x = tx; v.pos.z = tz; v.yaw = nyaw; v.speed *= Math.exp(-dt*2.5); slid = true; if (Math.abs(v.speed) > 6 && Math.random() < dt*10) noise(.06, 2400, .05); break; }
  }
  if (slid){ /* moved along the wall */ }
  else if (poseBlocked(nx, nz, nyaw)){
    if (Math.abs(v.speed) > 7){ if (typeof onVehicleCrash === 'function') onVehicleCrash(v, Math.abs(v.speed)); thwack(); shake = .4; heroDamage((Math.abs(v.speed) > 14 ? 10 : 4) * DIFF.dmg, 'crash'); v.dmg = (v.dmg||0) + Math.abs(v.speed)*1.6; if (v.dmg >= 100 && !v.broke){ v.broke = true; banner('العربية اتبهدلت… بقت بطيئة 💨', 'bad', 2.5); } }
    v.speed *= -.25;
    // still let the driver turn the nose away from what they hit
    const turnOnly = v.yaw + v.steer * v.turn * .6 * dt * (throttle < 0 ? -1 : 1);
    if (!poseBlocked(v.pos.x, v.pos.z, turnOnly)) v.yaw = turnOnly;
  }
  else { v.pos.x = nx; v.pos.z = nz; v.yaw = nyaw; }
  if (v.type === 'boat') v.pos.y = -.9 + Math.sin(runTime * 1.6) * .07;
  else if (!vehicleAir(v, dt)) v.pos.y += (groundY(v.pos.x, v.pos.z) - v.pos.y) * damp(12, dt);
  v.mesh.rotation.y = v.yaw;
  if (v.type === 'moto') v.mesh.rotation.z = -v.steer * .35 * clamp(Math.abs(v.speed)/10, 0, 1);
  else {
    // the body leans out of turns and dips when braking / lifts when speeding up
    const acc = (v.speed - sp0) / Math.max(dt, 1e-3);
    v.pitch = (v.pitch || 0) + (clamp(-acc * .0035, -.045, .03) - (v.pitch || 0)) * damp(6, dt);
    v.roll = (v.roll || 0) + (-v.steer * .045 * clamp(Math.abs(v.speed) / 14, 0, 1) - (v.roll || 0)) * damp(5, dt);
    v.mesh.rotation.x = v.pitch; v.mesh.rotation.z = v.roll;
  }
  // traffic bump
  if (v.type !== 'boat') for (const c of traffic){ if (Math.hypot(c.position.x - v.pos.x, c.position.z - v.pos.z) < (v.type==='moto' ? 2.1 : 2.9)){ if (Math.abs(v.speed) > 3 || c.userData.speed > 3){ if (typeof onVehicleCrash === 'function') onVehicleCrash(v, Math.abs(v.speed) + 6); if (SFX.crashT <= 0){ crashSfx(Math.abs(v.speed) + 6); SFX.crashT = .6; } else thwack(); shake = .5; heroDamage((v.type==='moto' ? 18 : 6) * DIFF.dmg, 'car'); v.speed = -v.speed*.3 - 2; c.userData.speed = 0; v.dmg = (v.dmg||0) + 12; } } }
}

// ---- 14-interactions.js ----
﻿// ================= interactions =================
let nearAction = null;
function computeAction(){
  nearAction = null; if (state !== 'play') return;
  if (TRAMR.on){ nearAction = tramRideAction(); return; }
  if (ACT.kind && ACTS[ACT.kind].action){ nearAction = ACTS[ACT.kind].action(ACT.d); if (nearAction || hero.locked) return; }
  if (hero.locked) return;
  const p = hero.pos;
  if (HOUSE.inside){ nearAction = HOUSE.shop ? shopAction() : houseAction(); return; }
  if (hero.veh){ const ga = garageAction(); if (ga){ nearAction = ga; return; } const va = modeObj.vehAction && modeObj.vehAction(); nearAction = va || { text: 'انزل', fn: () => exitVehicle(false) }; return; }
  if (thief.active && !thief.caught && thief.pos.distanceTo(p) < 2){ nearAction = { text: 'امسك يوسف!', fn: thiefCaught }; return; }
  const ma = modeObj.action && modeObj.action(); if (ma){ nearAction = ma; return; }
  { const aa = actionNearActivity(p); if (aa){ nearAction = aa; return; } }
  if (modeObj.vehicles){ const sd = nearShopDoor(p); if (sd){ nearAction = { text: `ادخل ${sd.name} ${sd.icon}`, fn: () => enterShop(sd) }; return; } const ta = tramAction(p); if (ta){ nearAction = ta; return; } }
  if (modeObj.vehicles){ const st = nearestStop(p); if (st){ nearAction = { text: '🚏 اركب مواصلة', fn: () => openTransit(st) }; return; } }
  if (modeObj.vehicles){ let best = null, bd = 3.2; for (const v of vehicles){ if (modeObj.canDrive && !modeObj.canDrive(v)) continue; const d = Math.hypot(v.pos.x-p.x, v.pos.z-p.z); if (d < bd){ bd = d; best = v; } } if (best){ nearAction = { text: best.type==='boat' ? 'اركب اللانش ⚓' : best.type==='moto' ? 'اركب الموتوسيكل' : best.type==='police' ? 'اركب البوكس' : best.type==='tuk' ? 'اركب التوكتوك' : 'اركب العربية', fn: () => enterVehicle(best) }; return; } }
  if (modeObj.cafe){
    if (p.distanceTo(SPOT.domino) < 2.4) { nearAction = { text: 'العب دومنو مع الحاج كامل', fn: () => openDomino() }; return; }
    if (Math.hypot(p.x - TAWLA_SPOT.x, p.z - TAWLA_SPOT.z) < 1.9) { nearAction = { text: 'العب طاولة مع عم رجب 🎯', fn: openTawla }; return; }
    if (p.distanceTo(SPOT.counter) < 2.6) { nearAction = { text: 'اشرب كوباية شاي (٥ جنيه)', fn: () => { if (hero.money < 5) return banner('مفيش فلوس كفاية', 'bad', 1.5); hero.money -= 5; hero.hp = Math.min(100, hero.hp+20); clink(); banner('شاي تقيل ومظبوط 🍵 +٢٠ صحة', 'ok', 2); } }; return; }
    if (Math.hypot(p.x-SPOT.cart.x, p.z-(SPOT.cart.z+1.4)) < 2.4) { nearAction = { text: 'اشتري سندوتش فلافل (٥ جنيه)', fn: () => { if (hero.money < 5) return banner('مفيش فلوس كفاية', 'bad', 1.5); hero.money -= 5; hero.hp = Math.min(100, hero.hp+35); coin(); banner('سندوتش فلافل سخن 🧆 +٣٥ صحة', 'ok', 2); } }; return; }
  }
}
function action(){ if (nearAction) nearAction.fn(); }
function punch(){
  if (WEAP.cur === 'pistol' && !hero.veh && !hero.locked){ shootPistol(); return; }
  if (hero.veh || hero.locked || hero.d.punchT > 0) return;
  // pick the closest target
  const p = hero.pos; let best = null, bd = weaponRange();
  const camRightX = Math.cos(camYaw), camRightZ = -Math.sin(camYaw);
  for (const n of npcs){ if (n.state === 'hidden' || n.state === 'down') continue; const d = Math.hypot(n.g.position.x-p.x, n.g.position.z-p.z); if (d < bd){ bd = d; best = { n, x:n.g.position.x, z:n.g.position.z }; } }
  if (enemy.active && !enemy.ally && enemy.d.downT <= 0){ const d = enemy.pos.distanceTo(p); if (d < Math.max(bd, 1.9)){ bd = d; best = { enemy: true, x: enemy.pos.x, z: enemy.pos.z }; } }
  if (wanted.active && !wanted.caught){ const d = wanted.pos.distanceTo(p); if (d < 1.9 && d <= bd + .3){ best = { wanted: true, x: wanted.pos.x, z: wanted.pos.z }; } }
  if (thief.active && !thief.caught){ const d = thief.pos.distanceTo(p); if (d < 1.9){ best = { thief: true, x: thief.pos.x, z: thief.pos.z }; } }
  { const bt = bossTarget(p); if (bt) best = bt; }
  hero.d.punchSide = best ? (((best.x-p.x)*camRightX + (best.z-p.z)*camRightZ) >= 0 ? 1 : -1) : 1;
  hero.d.punchT = .28; punchWhoosh();
  if (hero.d.is3D){ hero.d.punchSide = (hero.combo||0) % 2 ? -1 : 1; if (best) hero.d.yaw = Math.atan2(best.x - p.x, best.z - p.z); }   // the 3D hero turns to the target and swaps hands
  const pnow = runTime; hero.combo = (pnow - (hero.lastPunch ?? -9) < .8) ? (hero.combo||0) + 1 : 1; hero.lastPunch = pnow; const big = hero.combo % 3 === 0;
  if (!best) return;
  setTimeout(() => {
    if (big){ shake = .3; noise(.25, 600, .5); buzz(30); }
    const mult = weaponHit(best.n ? best.n : best.enemy ? enemy : null);
    if (best.n){ npcHit(best.n, (big ? 2 : 0) + (mult > 1.4 ? 1 : 0)); if (mult >= 1.5 && best.n.thug && !best.n.thugDone){ best.n.thugHits++; if (best.n.thugHits >= 3){ best.n.thugDone = true; best.n.downT = 999; best.n.fightT = 0; } } if (modeObj.onPunchNPC) modeObj.onPunchNPC(best.n); }
    else if (best.enemy){ hitEnemy((big ? 35 : 18) * mult, p); if (big) say(enemy, '💥', .8, 'angry'); }
    else if (best.wanted) arrestWanted();
    else if (best.thief) thiefCaught();
    else if (best.boss) bossHit(big || mult >= 2);
  }, 120);
}

// ---- 15-enemy-hates-the-hero.js ----
// ================= enemy (hates the hero) =================
const enemy = { d: enemyD, pos: new THREE.Vector3(), vel: new THREE.Vector3(), hp: 100, active: false, state: 'roam', cd: 0, atk: 0, block: 0, t: 0, dir: 1, tauntT: 0 };
const ENEMY_LINES = ['انت تاني يا طيارة!','تعالى هنا!','مش طايقك!','النهارده يومك!','هتروح فين مني؟'];
function spawnEnemy(){ enemy.active = true; enemy.d.root.visible = true; enemy.hp = 100; enemy.state = 'roam'; enemy.cd = 6; const p = randomSidewalkPoint(45, hero.pos); enemy.pos.copy(p); enemy.block = blocksInfo.findIndex(b => Math.abs(p.x-b.cx) < 20 && Math.abs(p.z-b.cz) < 20); if (enemy.block < 0) enemy.block = 0; enemy.t = R(0,4); enemy.d.downT = 0; }
function hitEnemy(dmg, from){
  enemy.hp -= dmg; enemy.d.hitT = .45; thwack(); const dx = enemy.pos.x - from.x, dz = enemy.pos.z - from.z, d = Math.hypot(dx,dz)||1;
  moveWithSlide(enemy.pos, dx/d*1.2, dz/d*1.2);
  if (enemy.hp <= 0){ stat('arabiDown'); enemy.d.downT = 6; enemy.state = 'down'; enemy.cd = 12; enemy.hp = enemy.maxHp || 100; say(enemy, 'ماشي يا طيارة… هترجعلي', 3, 'angry'); if (modeObj.onEnemyDown) modeObj.onEnemyDown(); }
  else say(enemy, rpick(['آه!','ماشي!','بتضربني؟!']), 1.2, 'angry');
}
function updateEnemy(dt){
  if (!enemy.active) return;
  if (enemy.ally){ allyUpdate(dt); return; }
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
        for (let i=0;i<16;i++){ const a = i/16*Math.PI*2, cx = Math.sin(a), cz = Math.cos(a); let score = (cx*ax + cz*az)*2 + Math.random()*.4 + (cx*wanted.dirX + cz*wanted.dirZ)*.6; if (staticBlocked(p.x+cx*3, p.z+cz*3, .5) || staticBlocked(p.x+cx*1.2, p.z+cz*1.2, .4)) score -= 6; const nx = p.x+cx*8, nz = p.z+cz*8; if (!inWorld(nx, nz)) score -= 4; if (score > best){ best = score; bx = cx; bz = cz; } }
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
const youssefD = makeCharacter('youssef', CH.youssef, 1.8); youssefD.root.visible = false;
const islamD = makeCharacter('islam', CH.islam, 1.78); islamD.root.visible = false;
if (islamD.is3D){ islamD.seatMove = 'sit'; islamD.hipY = .29 * 1.78 - .06; islamD.faceYaw = islamD.yaw = -Math.PI/2; }   // seated on the chair, facing the domino table
islamD.P.legL.visible = islamD.P.legR.visible = false; islamD.blob.visible = false;
function seatIslam(on){
  islamD.root.visible = on;
  if (on) islamD.root.position.set(SPOT.domino.x + .85, .62 - islamD.hipY + .04, SPOT.domino.z);
}
// الحاج كامل at the domino table with his shisha (3D model when there is one; otherwise the old seated regular stays)
const kamelD = MODELS3D.kamel ? makeDoll3D(MODELS3D.kamel, CH.hero, 1.76) : null;
const HOOKAH = { g: null, smoke: [], bowlT: 0, v: new THREE.Vector3() };
if (kamelD){ kamelD.root.visible = false; kamelD.seatMove = 'shisha'; kamelD.hipY = .29 * 1.76 - .06; kamelD.faceYaw = kamelD.yaw = Math.PI/2; kamelD.P.legL.visible = kamelD.P.legR.visible = false; kamelD.blob.visible = false; }
(async () => { try {
  const { GLTFLoader } = await import('three/addons/GLTFLoader.js');
  const g = (await new GLTFLoader().loadAsync('assets/props/hookah.glb')).scene;
  g.traverse(o => { if (o.isMesh) o.castShadow = !LOW; });
  g.position.set(SPOT.domino.x - 1.32, .15, SPOT.domino.z + .5); g.rotation.y = 2.2; g.visible = !!(kamelD && kamelD.root.visible); scene.add(g); HOOKAH.g = g;
} catch (e){ console.warn('hookah model failed', e); } })();
// smoke: soft sprites that rise, spread and fade
const smokeTex = makeTex(64, 64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(240,240,240,.6)'); gr.addColorStop(1, 'rgba(240,240,240,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
for (let i = 0; i < 20; i++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; scene.add(s); HOOKAH.smoke.push({ s, life: 0, max: 1, size: .06, v: new THREE.Vector3() }); }
function smokePuff(p0, n, big, dir){
  for (const p of HOOKAH.smoke){ if (n <= 0) break; if (p.life > 0) continue;
    p.life = p.max = big ? R(2.2, 3.2) : R(1.2, 1.8); p.s.position.set(p0.x + R(-.02, .02), p0.y, p0.z + R(-.02, .02));
    p.v.set(R(-.04, .04) + (dir ? dir.x * .25 : 0), big ? R(.12, .22) : R(.15, .25), R(-.04, .04) + (dir ? dir.z * .25 : 0)); p.size = big ? .1 : .05; p.s.visible = true; n--; }
}
function seatKamel(on){ if (!kamelD) return false; kamelD.root.visible = on; if (HOOKAH.g) HOOKAH.g.visible = on; if (on) kamelD.root.position.set(SPOT.domino.x - .85, .62 - kamelD.hipY + .04, SPOT.domino.z); return true; }
function updateKamel(dt, t){
  const on = !!(kamelD && kamelD.root.visible);
  if (on){
    animDoll(kamelD, 0, 0, dt, t);
    // the pose 'shisha' runs a 9-second cycle: hose to the mouth at 0.8s, draws until 2.6s, breathes out at 3.4s
    const c = kamelD.R.t % 9, c0 = c - dt;
    if (c > 1 && c0 <= 1 && !muted) shishaBubbles(sfxVol(SPOT.domino.x, SPOT.domino.z, 3));
    if (c > 3.3 && c0 <= 3.3){ kamelD.R.bones.head.getWorldPosition(HOOKAH.v); const f = kamelD.yaw; HOOKAH.v.x += Math.sin(f) * .12; HOOKAH.v.z += Math.cos(f) * .12; HOOKAH.v.y -= .05; smokePuff(HOOKAH.v, 6, true, { x: Math.sin(f), z: Math.cos(f) }); }
    // a thin wisp from the coal on the bowl
    HOOKAH.bowlT -= dt; if (HOOKAH.g && HOOKAH.bowlT <= 0){ HOOKAH.bowlT = R(.5, .9); HOOKAH.v.set(HOOKAH.g.position.x, HOOKAH.g.position.y + .86, HOOKAH.g.position.z); smokePuff(HOOKAH.v, 1, false); }
  }
  for (const p of HOOKAH.smoke){
    if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0 || !on){ p.life = 0; p.s.visible = false; continue; }
    const k = 1 - p.life / p.max; p.s.position.addScaledVector(p.v, dt); p.v.multiplyScalar(1 - dt * .6);
    const sz = p.size * (1 + k * 4); p.s.scale.set(sz, sz, 1); p.s.material.opacity = Math.min(1, k * 6) * (1 - k) * .55;
  }
}
const thief = { d: youssefD, pos: new THREE.Vector3(), active: false, caught: false, next: 75, dirX: 0, dirZ: 1, retarget: 0, lostT: 0, shoutT: 0, vx: 0, vz: 0 };
function thiefReset(){ thief.active = false; thief.caught = false; thief.next = R(60, 110); youssefD.root.visible = false; }
function thiefStart(at, line, ban){
  thief.active = true; thief.caught = false; thief.lostT = 0; thief.shoutT = 2;
  if (at) thief.pos.copy(at); else thief.pos.set(SPOT.cart.x + 1.6, .15, SPOT.cart.z + 2.4); youssefD.root.visible = true; youssefD.downT = 0; youssefD.P.legL.visible = youssefD.P.legR.visible = true; youssefD.blob.visible = true;
  say(thief, line || 'هوب! 🧆 ساندوتش ببلاش', 2.5, 'angry');
  banner(ban || '🚨 يوسف إبراهيم خطف ساندوتش من عربية الفول! الحقه', 'bad', 3.5); buzz(40);
}
function thiefCaught(){
  if (!thief.active || thief.caught) return;
  thief.caught = true; youssefD.downT = 2.5; thwack(); coin(); buzz(30); stat('thief');
  say(thief, 'خلاص خلاص… خد الساندوتش 😅', 2.5, 'angry');
  const reward = 40; hero.money += reward; if (modeId === 'story'){ SAVE.rep += 3; SAVE.cnt.thief = (SAVE.cnt.thief||0) + 1; saveStory(); }
  banner(`مسكت يوسف! +${reward} جنيه من صاحب العربية`, 'ok', 3);
  setTimeout(() => { thief.active = false; if (!CUT.idle.has(youssefD)) youssefD.root.visible = false; thief.next = R(150, 240); }, 2600);
}
function updateThief(dt, t){
  if (modeId !== 'story'){ if (thief.active) thiefReset(); return; }
  if (!thief.active){
    thief.next -= dt;
    if (thief.next <= 0 && !modeObj.job && !ST.kind && !JOB.kind && !CUT.on && !HOUSE.inside && storyAllowsThief() && hero.pos.distanceTo(SPOT.cart) < 70) thiefStart();
    return;
  }
  const p = thief.pos; let vx = 0, vz = 0;
  if (!thief.caught){
    const tg = hero.veh ? hero.veh.pos : hero.pos; const dx = p.x - tg.x, dz = p.z - tg.z, dist = Math.hypot(dx, dz);
    thief.retarget -= dt;
    if (thief.retarget <= 0){
      thief.retarget = .35; let best = -1e9, bx = 0, bz = 1; const ax = dx/(dist||1), az = dz/(dist||1);
      for (let i=0;i<16;i++){ const a = i/16*Math.PI*2, cx = Math.sin(a), cz = Math.cos(a); let score = (cx*ax + cz*az)*2 + Math.random()*.4 + (cx*thief.dirX + cz*thief.dirZ)*.6; if (staticBlocked(p.x+cx*3, p.z+cz*3, .5) || staticBlocked(p.x+cx*1.2, p.z+cz*1.2, .4)) score -= 6; if (!inWorld(p.x+cx*8, p.z+cz*8)) score -= 4; if (score > best){ best = score; bx = cx; bz = cz; } }
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
function updatePhotoSeats(dt, t){ if (islamD.root.visible) animDoll(islamD, 0, 0, dt, t); updateKamel(dt, t); }
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
  const has = SAVE.started || SAVE.m > 0, M = curM();
  $('mmPlay').textContent = !has ? '▶ ابدأ القصة' : SAVE.ended ? '▶ لف في الحتة (بعد القصة)' : '▶ كمّل القصة';
  $('mmStatus').innerHTML = !has ? 'صبي قهوجي مفلس… ومطلوب اسمه شمس. <b>قصة في ٨ فصول وأكتر من ٦٠ مهمة</b>'
    : M ? `<b>${CHAPS[M.ch][0]}: ${CHAPS[M.ch][1]}</b> · ${M.title}<br>💰 ${egp(SAVE.money)} · المهمة ${SAVE.m + 1} من ${MS.length}` : `<b>خلّصت القصة 👑</b> · 💰 ${egp(SAVE.money)}`;
  $('mmAchN').textContent = `${ACH.filter(a => PROG.ach[a.id]).length}/${ACH.length}`;
  const rs = $('resetStory'); rs.parentElement.hidden = !has; rs.dataset.armed = ''; rs.textContent = '↺ ابدأ من الأول';
}
$('mmPlay').onclick = () => startMode('story');
document.querySelectorAll('.mm-card[data-mode]').forEach(b => b.onclick = () => startMode(b.dataset.mode));
$('mmAch').onclick = () => openAch();
$('mmIntro').onclick = () => playIntroSeq();
$('mmRec').onclick = () => { location.href = 'record.html'; };
$('mmSet').onclick = () => { renderModes(); $('settings').hidden = false; };
$('setClose').onclick = () => { $('settings').hidden = true; heroName = $('nameIn').value.trim() || 'طيارة'; store.set('ty_name', heroName); };
$('resetStory').onclick = () => { const b = $('resetStory'); if (!b.dataset.armed){ b.dataset.armed = '1'; b.textContent = 'متأكد؟ دوس تاني'; return; } SAVE = newStory(); store.set(STORY_KEY, JSON.stringify(SAVE)); applyAccessories(); renderModes(); b.textContent = '✓ اتمسحت'; };

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
  m.served++; m.earned += price + tip; hero.money += price + tip; coin(); buzz(25); if (m.onServe) m.onServe('foul'); stat('foul');
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
  hero.locked = false; hero.d.root.visible = true; camera.clearViewOffset(); Object.assign(stView, { x: 0, y: 0, w: 0, h: 0, t: 0 }); camera.fov = 46; camera.updateProjectionMatrix(); const aw = scene.getObjectByName('cafeAwning'); if (aw) aw.visible = true; const um = scene.getObjectByName('cartUmbrella'); if (um) um.visible = true;
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
// The table is framed inside the part of the screen the panels leave free:
// the orders ticket takes the right side, the hint, pour meter and buttons take the bottom.
const stView = { x: 0, y: 0, w: 0, h: 0, t: 0 };
function stationFreeArea(narrow){
  if (narrow) return { offX: 0, offY: 0, w: innerWidth, h: innerHeight };
  const tk = $('stTicket').getBoundingClientRect(), right = tk.width ? tk.width + 16 : 0;
  const btn = $('stBtns').getBoundingClientRect(), bottom = (btn.height ? innerHeight - btn.top : 70) + (innerHeight < 520 ? 44 : 64);
  return { offX: right / 2, offY: bottom / 2, w: innerWidth - right, h: innerHeight - bottom };
}
function stationCamera(dt){
  const S = STA[ST.kind]; const narrow = innerWidth/innerHeight < .95;
  if (S.narrow !== narrow){ layoutStation(S, narrow); if (ST.kind === 'ahwa') ahwaPotVisual(); }
  stView.t -= dt; if (stView.t <= 0){ stView.t = .25; const a = stationFreeArea(narrow); if (Math.abs(a.offX - stView.x) > 1 || Math.abs(a.offY - stView.y) > 1 || Math.abs(a.w - stView.w) > 1){ Object.assign(stView, { x: a.offX, y: a.offY, w: a.w, h: a.h }); if (a.offX || a.offY) camera.setViewOffset(innerWidth, innerHeight, a.offX, a.offY, innerWidth, innerHeight); else camera.clearViewOffset(); } }
  const freeW = stView.w || innerWidth, freeH = stView.h || innerHeight, asp = freeW / freeH;
  const vf = 2*Math.atan(Math.tan(25*Math.PI/180) * freeH / innerHeight), hf = 2*Math.atan(Math.tan(vf/2)*asp);
  const W = narrow ? 1.34 : 2.08, Dd = narrow ? 1.45 : 1.56, pitch = narrow ? 1.12 : .98;
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

// ---- 19b-house-and-transit.js ----
// ================= طيارة's house (interior, renovation) and public transport =================
function fadeTo(fn, hold=.25){ return new Promise(res => { const f = $('fade'); f.classList.add('on'); setTimeout(() => { try { fn && fn(); } catch(e){ console.error(e); } setTimeout(() => { f.classList.remove('on'); setTimeout(res, 380); }, hold*1000); }, 380); }); }
// ---- interior ----
const HOUSE_C = new THREE.Vector3(-403, 0, -400);
const RENO = [
  { lvl: 0, name: 'على قد الحال', price: 0, text: 'مرتبة على الأرض ولمبة عريانة' },
  { lvl: 1, name: 'دهان وسرير', price: 250, text: 'دهان جديد، سرير، ستارة ونور' },
  { lvl: 2, name: 'أنتريه وتلفزيون', price: 600, text: 'سجادة، كنبة، تلفزيون وزرعة' },
  { lvl: 3, name: 'بيت الجامد', price: 1200, text: 'تكييف، بلايستيشن، تلاجة وبرواز ليك' },
];
const roomTex = {
  wall0: makeTex(256,256,(g,w,h)=>{ g.fillStyle='#a89a84'; g.fillRect(0,0,w,h); grain(g,w,h,6000,.18); g.strokeStyle='rgba(40,30,20,.45)'; g.lineWidth=1.5; for (let i=0;i<7;i++){ g.beginPath(); let x=Math.random()*w, y=Math.random()*h; g.moveTo(x,y); for (let k=0;k<6;k++){ x+=Math.random()*30-15; y+=Math.random()*30; g.lineTo(x,y); } g.stroke(); } g.fillStyle='rgba(70,60,40,.25)'; g.fillRect(0,h*.8,w,h*.2); }, [3,1]),
  wall1: makeTex(256,256,(g,w,h)=>{ g.fillStyle='#f1d9c0'; g.fillRect(0,0,w,h); grain(g,w,h,3000,.05); g.fillStyle='#e0bfa0'; g.fillRect(0,h*.82,w,h*.18); }, [3,1]),
  wall3: makeTex(256,256,(g,w,h)=>{ g.fillStyle='#e8eef2'; g.fillRect(0,0,w,h); for (let x=0;x<w;x+=32){ g.fillStyle='rgba(120,150,170,.12)'; g.fillRect(x,0,14,h*.82); } g.fillStyle='#6d8796'; g.fillRect(0,h*.82,w,h*.18); }, [3,1]),
  floor0: makeTex(256,256,(g,w,h)=>{ g.fillStyle='#8a8580'; g.fillRect(0,0,w,h); grain(g,w,h,9000,.2); }, [3,3]),
  floor1: makeTex(256,256,(g,w,h)=>{ for (let y=0;y<4;y++) for (let x=0;x<4;x++){ g.fillStyle=(x+y)%2?'#e9e4da':'#cfc8ba'; g.fillRect(x*64,y*64,64,64); } g.strokeStyle='rgba(0,0,0,.15)'; for (let i=0;i<=4;i++){ g.beginPath(); g.moveTo(i*64,0); g.lineTo(i*64,h); g.stroke(); g.beginPath(); g.moveTo(0,i*64); g.lineTo(w,i*64); g.stroke(); } }, [4,4]),
};
const room = new THREE.Group(); room.position.copy(HOUSE_C); scene.add(room);
const wallMat = new THREE.MeshStandardMaterial({ map: roomTex.wall0, roughness: .95 });
const floorMat = new THREE.MeshStandardMaterial({ map: roomTex.floor0, roughness: .9 });
{ const fl = new THREE.Mesh(new THREE.BoxGeometry(7, .1, 6), floorMat); fl.position.y = -.05; fl.receiveShadow = true; room.add(fl);
  for (const [w, d, x, z] of [[7, .15, 0, -3], [.15, 6, -3.5, 0], [.15, 6, 3.5, 0]]){ const m = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), wallMat); m.position.set(x, 1.5, z); m.receiveShadow = true; room.add(m); }
  for (const x of [-2.4, 2.4]){ const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3, .15), wallMat); m.position.set(x, 1.5, 3); room.add(m); }
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1), new THREE.MeshStandardMaterial({ color: 0x9fc4e0, emissive: 0x6f9ec0, emissiveIntensity: .6 })); win.position.set(1.6, 1.8, -2.91); room.add(win);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.3), new THREE.MeshStandardMaterial({ map: doorTex, roughness: .8, side: THREE.DoubleSide })); door.position.set(0, 1.15, 3.05); room.add(door); }
const lvlGroups = [0,1,2,3].map(() => { const g = new THREE.Group(); room.add(g); return g; });
const mergedMesh = (parts) => { const m = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7 })); m.castShadow = true; m.receiveShadow = true; return m; };
{ // level 0: mattress, crate, bare bulb, rusty wardrobe
  const p = []; box(p, 1.1,.25,2,  -2.6,.13,-1.7, '#9c9a8c'); box(p, .5,.06,.4, -2.6,.28,-2.5, '#d8d4c4'); box(p, .7,.5,.6, -.2,.25,-1.5, '#8a6a3a'); box(p, 1.1,2.1,.6, 2.8,1.05,-2.55, '#5a5048'); box(p, .02,.9,.02, 0,2.55,-.2, '#222'); lvlGroups[0].add(mergedMesh(p));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.08,10,8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 2 })); bulb.position.set(0, 2.05, -.2); lvlGroups[0].add(bulb); }
{ // level 1: bed, wooden wardrobe, table, curtain, lamp
  const p = []; box(p, 1.3,.45,2.1, -2.6,.23,-1.7, '#7a4f2c'); box(p, 1.2,.2,2, -2.6,.55,-1.7, '#e8e4f4'); box(p, 1.3,.9,.1, -2.6,.9,-2.75, '#6a3f20'); box(p, .5,.12,.35, -2.6,.72,-2.4, '#f4f0e0');
  box(p, 1.2,2.2,.6, 2.8,1.1,-2.55, '#8a5a32'); box(p, .02,.25,.02, 2.75,1.1,-2.24, '#d4a62a'); box(p, .9,.06,.7, -.2,.75,-1.5, '#8a5a32'); for (const [x,z] of [[-.6,-1.8],[.2,-1.8],[-.6,-1.2],[.2,-1.2]]) box(p, .05,.72,.05, x,.36,z, '#6a3f20');
  box(p, 1.7,1.3,.04, 1.6,1.85,-2.86, '#b3121f'); lvlGroups[1].add(mergedMesh(p));
  const lamp = new THREE.Mesh(new THREE.ConeGeometry(.22,.25,16,1,true), new THREE.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xffe2a0, emissiveIntensity: 1.4, side: THREE.DoubleSide })); lamp.position.set(0, 2.6, -.2); lvlGroups[1].add(lamp); }
{ // level 2: carpet, sofa, TV, plant
  const p = []; box(p, 3,.02,2.2, .2,.012,-.2, '#8e2a2a'); box(p, .8,.45,2.2, 2.9,.23,.3, '#3d5a80'); box(p, .25,.5,2.2, 3.2,.6,.3, '#334c6c');
  box(p, 1.4,.5,.45, .2,.25,-2.65, '#3a2a1e'); box(p, 1.5,.85,.08, .2,1.05,-2.72, '#111'); cyl(p, .22,.18,.4, -1.6,.2,-2.5, '#8a5a32'); { const g = new THREE.SphereGeometry(.4,10,8); g.translate(-1.6,.75,-2.5); p.push(colored(g,'#3f7a2e')); }
  lvlGroups[2].add(mergedMesh(p));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.35, .72), new THREE.MeshStandardMaterial({ color: 0x223, emissive: 0x4a7ab8, emissiveIntensity: .9 })); screen.position.set(.2, 1.05, -2.67); lvlGroups[2].add(screen); room.userData.screen = screen; }
{ // level 3: AC, PlayStation, fridge, framed poster of طيارة
  const p = []; box(p, 1,.35,.25, -.5,2.5,-2.8, '#f4f4f0'); box(p, .4,.08,.3, .7,.55,-2.6, '#111'); box(p, .8,1.8,.7, 2.85,.9,1.8, '#e8ecef'); box(p, .03,.6,.03, 2.45,1.2,1.5, '#888');
  lvlGroups[3].add(mergedMesh(p));
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.1), new THREE.MeshStandardMaterial({ map: dataTex(CH.hero.img.face) })); frame.position.set(-3.38, 1.7, 0); frame.rotation.y = Math.PI/2; lvlGroups[3].add(frame);
  const fb = new THREE.Mesh(new THREE.BoxGeometry(.04, 1.2, 1.0), new THREE.MeshStandardMaterial({ color: 0xd4a62a, metalness: .7, roughness: .3 })); fb.position.set(-3.42, 1.7, 0); lvlGroups[3].add(fb); }
const HOUSE_SPOTS = { bed: new THREE.Vector3(-404.6, 0, -401), wardrobe: new THREE.Vector3(-400.2, 0, -401.8), table: new THREE.Vector3(-402.4, 0, -400.4), tv: new THREE.Vector3(-402.8, 0, -401.6), door: new THREE.Vector3(-403, 0, -397.6) };
obstacles.push({ minX: -406.4, maxX: -404.5, minZ: -402.9, maxZ: -400.6 }, { minX: -400.9, maxX: -399.6, minZ: -402.9, maxZ: -402.1 }, { minX: -403.7, maxX: -402.7, minZ: -402, maxZ: -401 });
function houseLevel(){ return (typeof SAVE !== 'undefined' && SAVE.house) || 0; }
function houseVisual(){
  const L = houseLevel();
  lvlGroups.forEach((g, i) => { g.visible = i === 0 ? L === 0 : i <= L; });
  wallMat.map = L >= 3 ? roomTex.wall3 : L >= 1 ? roomTex.wall1 : roomTex.wall0; wallMat.needsUpdate = true;
  floorMat.map = L >= 1 ? roomTex.floor1 : roomTex.floor0; floorMat.needsUpdate = true;
}
lvlGroups.forEach((g, i) => g.visible = i === 0);
const roomLight = new THREE.PointLight(0xffe2b0, 0, 9, 1.4); roomLight.position.set(0, 2.5, -.2); room.add(roomLight);
function enterHouse(){
  if (hero.veh) return;
  fadeTo(() => { HOUSE.inside = true; roomLight.intensity = 9; HOUSE.prevCam = camTarget; camTarget = Math.min(camTarget, 3.4); camDist = camTarget; hero.pos.set(HOUSE_SPOTS.door.x, 0, HOUSE_SPOTS.door.z - .6); CAM.orbit = CAM.orbitSm = 0; CAM.tilt = .55; houseVisual(); lookAt.copy(hero.pos); hero.vel.set(0,0,0); });
}
function exitHouse(){
  fadeTo(() => { HOUSE.inside = false; roomLight.intensity = 0; camTarget = HOUSE.prevCam || 5; { const [fx, fz] = freeSpot(SPOT.house.x + 1.4, SPOT.house.z + 1.1); hero.pos.set(fx, .15, fz); } CAM.orbit = CAM.orbitSm = 0; lookAt.copy(hero.pos); hero.vel.set(0,0,0); if (typeof onStoryEvent === 'function') onStoryEvent('exitHouse'); });
}
function houseAction(){
  const p = hero.pos, near = (v, r=1.4) => Math.hypot(p.x - v.x, p.z - v.z) < r;
  if (near(HOUSE_SPOTS.door, 1.3)) return { text: 'اخرج من البيت', fn: exitHouse };
  if (near(HOUSE_SPOTS.bed, 1.7)) return { text: 'نام 😴', fn: openSleep };
  if (near(HOUSE_SPOTS.wardrobe, 1.5)) return { text: 'افتح الدولاب', fn: openWardrobe };
  if (houseLevel() >= 2 && near(HOUSE_SPOTS.tv, 1.4)) return { text: 'اتفرج على التلفزيون', fn: () => fadeTo(() => { advanceTime(2); banner('اتفرجت على ماتش الأهلي والزمالك 📺', 'info', 2.5); }) };
  if (near(HOUSE_SPOTS.table, 1.5)) return { text: 'جدد البيت 🔨', fn: openRenovate };
  return null;
}
// overlays reuse the shop panel
function openPanel(title, rows, note=''){
  hero.locked = true; $('shop').hidden = false; $('shopTitle').textContent = title; $('shopMoney').textContent = note || `معاك ${egp(hero.money)}`;
  $('shopItems').innerHTML = rows.map((r, i) => `<div class="sitem"><span>${r.label}</span>${r.btn ? `<button data-row="${i}" ${r.dim ? 'class="poor"' : ''}>${r.btn}</button>` : `<span class="owned">${r.tag || ''}</span>`}</div>`).join('');
  $('shopItems').querySelectorAll('[data-row]').forEach(b => b.onclick = () => rows[+b.dataset.row].fn());
}
function closePanel(){ $('shop').hidden = true; hero.locked = false; }
function openSleep(){
  openPanel('😴 تنام لحد إمتى؟', [
    { label: '🌅 لحد الصبح (٨ الصبح)', btn: 'نام', fn: () => sleepTo(8) },
    { label: '🌙 لحد بالليل (٩ بالليل)', btn: 'نام', fn: () => sleepTo(21) },
  ], `الساعة دلوقتي ${clockText()}`);
}
function sleepTo(h){ closePanel(); fadeTo(() => { SAVE.time = h; applyTimeOfDay(h); hero.hp = 100; saveStory(); banner(h < 12 ? 'صباح الفل يا طيارة ☀️' : 'الدنيا ليلت 🌙', 'info', 2.5); if (typeof onStoryEvent === 'function') onStoryEvent('slept', h); }, .8); }
function advanceTime(hours){ if (typeof SAVE === 'undefined') return; SAVE.time = ((SAVE.time ?? 15) + hours) % 24; applyTimeOfDay(SAVE.time); }
function openWardrobe(){
  const owned = SHOP.items.filter(i => i.kind === 'acc' && SAVE.acc[i.id]);
  if (!owned.length) return openPanel('👕 الدولاب', [{ label: 'الدولاب فاضي… اشتري حاجات من محل الأناقة', tag: '' }]);
  const rows = owned.map(it => ({ label: it.name, btn: SAVE.wear[it.id] !== false ? 'اقلعها' : 'البسها', fn: () => { SAVE.wear[it.id] = SAVE.wear[it.id] === false; applyAccessories(); saveStory(); openWardrobe(); } }));
  openPanel('👕 الدولاب', rows);
}
function openRenovate(){
  const L = houseLevel();
  const rows = RENO.slice(1).map(r => r.lvl <= L ? { label: `✅ ${r.name}`, tag: 'خلص' } : r.lvl === L + 1 ? { label: `🔨 ${r.name} · ${r.text}`, btn: `جدد · ${r.price} ج`, dim: hero.money < r.price, fn: () => buyReno(r) } : { label: `🔒 ${r.name}`, tag: `${r.price} ج` });
  openPanel('🏠 تجديد البيت', rows);
}
function buyReno(r){
  if (hero.money < r.price){ $('shopMoney').textContent = `محتاج ${egp(r.price - hero.money)} كمان`; buzz(40); return; }
  hero.money -= r.price; SAVE.house = r.lvl; saveStory(); coin(); buzz(30);
  closePanel(); fadeTo(() => { houseVisual(); banner(`🏠 البيت اتجدد: ${r.name}`, 'ok', 3); if (typeof onStoryEvent === 'function') onStoryEvent('renovated', r.lvl); }, .6);
}
// ---- public transport ----
function nearestStop(p, r=2.6){ return STOPS.find(s => Math.hypot(s.pos.x - p.x, s.pos.z - p.z) < r); }
function openTransit(from){
  const rows = STOPS.filter(s => s !== from).map(s => {
    const d = Math.hypot(s.pos.x - from.pos.x, s.pos.z - from.pos.z), fare = Math.max(3, Math.round(d / 30)), kind = d > 140 ? '🚐 ميكروباص' : '🛺 توكتوك';
    return { label: `${kind} ← ${s.name}`, btn: `${fare} ج`, dim: hero.money < fare, fn: () => ride(s, fare, kind) };
  });
  openPanel('🚏 رايح فين؟', rows);
}
function ride(to, fare, kind){
  if (hero.money < fare){ $('shopMoney').textContent = 'مفيش أجرة كفاية 😅'; buzz(40); return; }
  closePanel(); hero.money -= fare;
  fadeTo(() => { { const [fx, fz] = freeSpot(to.pos.x + 1.4, to.pos.z + (to.pos.z > ZMAX ? -1.2 : 1.2)); hero.pos.set(fx, .15, fz); } lookAt.copy(hero.pos); hero.vel.set(0,0,0); advanceTime(.4); banner(`${kind.split(' ')[0]} وصلت ${to.name}`, 'info', 2.4); if (typeof onStoryEvent === 'function') onStoryEvent('rode', to.id); }, .9);
}

// ---- 19c-cutscenes.js ----
// ================= cutscenes and dialogue =================
// A cutscene is a list of steps: { cam, look, t } moves the camera, { say, text } shows a line,
// { do } runs code, { wait } pauses, { walk: [doll, x, z, speed] } walks a photo character.
// Story steps: { narr: 'kamel_03_1' } الحاج كامل narrates (audio + subtitle), { flash: true|false } old-film flashback look,
// { card: chapterIndex|false } the big black chapter card, { rain: true|false } the storm.
const CAST = {
  tayara: { name: () => heroName, face: () => CH.hero.img.face }, arabi: { name: () => 'العربي', face: () => CH.enemy.img.face },
  shams: { name: () => 'شمس', face: () => CH.wanted.img.face }, youssef: { name: () => 'يوسف إبراهيم', face: () => CH.youssef.img.face },
  islam: { name: () => 'إسلام', face: () => CH.islam.img.face }, sayed: { name: () => 'الحاج كامل', emoji: '👳‍♂️' },
  moallem: { name: () => 'المعلم عبده', emoji: '🧔' }, landlord: { name: () => 'الحاج محمود', emoji: '👳' }, azzouz: { name: () => 'عزوز', emoji: '👨‍🍳' },
  fathi: { name: () => 'الحاج فتحي', emoji: '🧆' }, crowd: { name: () => 'الناس', emoji: '👥' }, police: { name: () => 'الظابط', emoji: '👮' }, mechanic: { name: () => 'الأسطى رضا', emoji: '🔧' }, phone: { name: () => 'الموبايل', emoji: '📱' }, thug: { name: () => 'رجالة شمس', emoji: '😠' },
};
const CAST_DOLLS = { tayara: hero.d, arabi: enemyD, shams: wantedD, youssef: youssefD, islam: islamD };
const CUT = { on: false, timers: [], cam: null, walkers: [], typing: null, waitTap: null, skip: false, idle: new Set() };
function showActor(d, x, z, legs=true){ d.root.visible = true; d.root.position.set(x, groundY(x, z), z); d.P.legL.visible = d.P.legR.visible = legs; d.blob.visible = legs; d.downT = 0; if (d !== hero.d) CUT.idle.add(d); }
function hideActor(d){ d.root.visible = false; CUT.idle.delete(d); }
const cv3 = a => a instanceof THREE.Vector3 ? a.clone() : new THREE.Vector3(a[0], a[1], a[2]);
function cutWait(s){ return new Promise(res => CUT.timers.push({ t: s, res })); }
function tickCutscene(dt){
  for (let i = CUT.timers.length - 1; i >= 0; i--){ const w = CUT.timers[i]; w.t -= dt; if (w.t <= 0 || CUT.skip){ CUT.timers.splice(i, 1); w.res(); } }
  if (CUT.cam){ const c = CUT.cam; c.k = Math.min(1, c.k + dt / c.t); const e = c.k < .5 ? 2*c.k*c.k : 1 - Math.pow(-2*c.k + 2, 2)/2; camera.position.lerpVectors(c.p0, c.p1, e); lookAt.lerpVectors(c.l0, c.l1, e); if (c.k >= 1 || CUT.skip){ camera.position.copy(c.p1); lookAt.copy(c.l1); CUT.cam = null; c.res(); } }
  const walking = new Set();
  for (let i = CUT.walkers.length - 1; i >= 0; i--){
    const w = CUT.walkers[i], isHero = w.d === hero.d, p = isHero ? hero.pos : w.d.root.position, dx = w.x - p.x, dz = w.z - p.z, d = Math.hypot(dx, dz);
    if (d < .12 || CUT.skip){ p.x = w.x; p.z = w.z; if (isHero) hero.vel.set(0,0,0); CUT.walkers.splice(i, 1); w.res(); continue; }
    const s = Math.min(d, w.sp*dt); p.x += dx/d*s; p.z += dz/d*s; p.y = groundY(p.x, p.z);
    if (isHero) hero.vel.set(dx/d*w.sp, 0, dz/d*w.sp); else { animDoll(w.d, dx/d*w.sp, dz/d*w.sp, dt, performance.now()/1000); walking.add(w.d); }
  }
  for (const d of CUT.idle) if (!walking.has(d) && d.root.visible) animDoll(d, 0, 0, dt, performance.now()/1000);
  if (CUT.typing){ const ty = CUT.typing; ty.i = Math.min(ty.full.length, ty.i + dt*38); $('dlgText').textContent = ty.full.slice(0, Math.floor(ty.i)); if (ty.i >= ty.full.length) CUT.typing = null; }
}
function dlgShow(who, text, narr){
  const c = CAST[who] || CAST.crowd; const face = c.face && c.face();
  $('dlgFace').innerHTML = face ? `<img src="${face}" alt="">` : `<span>${c.emoji || '💬'}</span>`;
  $('dlgName').textContent = c.name(); $('dlg').hidden = false; $('dlgText').textContent = ''; $('dlg').classList.toggle('narr', !!narr);
  CUT.typing = { full: text, i: 0 };
  const td = CAST_DOLLS[who]; if (td && td.is3D) td.talkT = clamp(text.length * .055, 1.2, 4.5);
  if (narr) playNarr(narr); else if (!muted && !playVoice(text)) speak(text);
}
function dlgTap(){
  if (!CUT.on) return;
  if (CUT.typing){ $('dlgText').textContent = CUT.typing.full; CUT.typing = null; return; }
  if (CUT.waitTap){ const r = CUT.waitTap; CUT.waitTap = null; r(); }
}
$('dlg').addEventListener('pointerdown', e => { e.stopPropagation(); dlgTap(); });
$('cine').addEventListener('pointerdown', e => { if (e.target.id === 'cineSkip') return; dlgTap(); });
$('cineSkip').addEventListener('pointerdown', e => { e.stopPropagation(); CUT.skip = true; if (CUT.waitTap){ const r = CUT.waitTap; CUT.waitTap = null; r(); } });
addEventListener('keydown', e => { if (CUT.on && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE')){ e.preventDefault(); dlgTap(); } if (CUT.on && e.code === 'Escape'){ CUT.skip = true; if (CUT.waitTap){ const r = CUT.waitTap; CUT.waitTap = null; r(); } } }, true);
async function playCut(steps){
  if (CUT.on) return;
  CUT.on = true; CUT.skip = false; hero.locked = true; document.body.classList.add('cutscene'); $('cine').hidden = false; hero.vel.set(0,0,0);
  if (innerHeight < 520) camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * .17, innerWidth, innerHeight);
  if (hero.veh) hero.veh.speed = 0;
  try {
    for (const s of steps){
      if (s.do){ try { s.do(); } catch(e){ console.error(e); } }
      if (CUT.skip && !s.do) continue;
      if (s.cam){ await new Promise(res => { CUT.cam = { p0: camera.position.clone(), p1: cv3(s.cam), l0: lookAt.clone(), l1: cv3(s.look || s.cam), k: s.t === 0 ? 1 : 0, t: s.t ?? 1.4, res }; }); }
      if (s.walk){ const [d, x, z, sp] = s.walk; const pr = new Promise(res => CUT.walkers.push({ d, x, z, sp: sp || 2.2, res })); if (!s.noWait) await pr; }
      if (s.flash !== undefined) setFlashback(s.flash);
      if (s.rain !== undefined) setRain(s.rain);
      if (s.card !== undefined) chapterCardBig(s.card);
      if (s.narr && !NARR[s.narr] && !s.text) continue;
      if (s.say || s.narr){ const text = s.narr ? (NARR[s.narr] || s.text) : s.text; dlgShow(s.narr ? 'kamel' : s.say, text, s.narr); s.text = text; let tapped = false; const tap = new Promise(res => { CUT.waitTap = () => { tapped = true; res(); }; });
        await Promise.race([tap, cutWait(s.auto || Math.max(6, s.text.length * .09 + 3))]);
        if (!tapped && !CUT.skip && voiceLeft() > .2) await Promise.race([tap, cutWait(voiceLeft() + .35)]);
        CUT.waitTap = null; CUT.typing = null; stopVoice(); }
      if (s.wait) await cutWait(s.wait);
      if (s.fade) await fadeTo(s.fade === true ? null : s.fade);
    }
  } finally {
    $('dlg').hidden = true; $('cine').hidden = true; document.body.classList.remove('cutscene'); stopVoice(); setFlashback(false); chapterCardBig(false); SCENE.hideHero = false; SCENE.lockY = false; if (!ST.kind) camera.clearViewOffset();
    CUT.on = false; CUT.cam = null; CUT.walkers.length = 0; CUT.skip = false; hero.locked = false;
    CAM.orbit = CAM.orbitSm = camYaw;
  }
}
// camera helpers for scripting: a spot near a point, looking at it
function camNear(p, dx=0, dy=2.2, dz=4.5){ return [p.x + dx, (p.y||0) + dy, p.z + dz]; }
function lookAtP(p, dy=1.4){ return [p.x, (p.y||0) + dy, p.z]; }

// ---- 19d-jobs.js ----
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

// ---- 19e-wedding-rhythm.js ----
// ================= wedding dance: rhythm game on a mahraganat beat =================
// Notes fall in four lanes; tap the lane (or press D F J K / the arrow keys) when a note reaches the line.
const RHY = { on: false, t: 0, notes: [], hits: 0, total: 0, combo: 0, res: null, dur: 40, beat: 60/126, els: [] };
const LANE_KEYS = [['KeyD','ArrowLeft'], ['KeyF','ArrowDown'], ['KeyJ','ArrowUp'], ['KeyK','ArrowRight']];
function playWedding(){
  return new Promise(res => {
    RHY.on = true; RHY.t = -2; RHY.hits = 0; RHY.combo = 0; RHY.res = res; RHY.notes = [];
    const gap = DIFF.pat > 1 ? 2 : 1; // easier = fewer notes
    for (let b = 0; b * RHY.beat < RHY.dur; b += gap){ if (Math.random() < .2) continue; RHY.notes.push({ at: b * RHY.beat, lane: Math.floor(Math.random()*4), done: false, el: null }); if (b > 30 && Math.random() < .15) RHY.notes.push({ at: b * RHY.beat, lane: Math.floor(Math.random()*4), done: false, el: null }); }
    RHY.total = RHY.notes.length;
    $('rhy').hidden = false; $('rhyNotes').innerHTML = ''; hero.locked = true; document.body.classList.add('in-rhythm');
    beatNext = AC ? AC.currentTime + .05 : 0;
    rhyMsg('استعد… 💃');
  });
}
function rhyMsg(t, cls=''){ const m = $('rhyMsg'); m.textContent = t; m.className = 'rhymsg ' + cls; }
function rhyHit(lane){
  if (!RHY.on || RHY.t < 0) return;
  const btn = document.querySelectorAll('.rlane')[lane]; btn.classList.add('hit'); setTimeout(() => btn.classList.remove('hit'), 90);
  let best = null, bd = 1e9; for (const n of RHY.notes){ if (n.done || n.lane !== lane) continue; const d = Math.abs(n.at - RHY.t); if (d < bd){ bd = d; best = n; } }
  if (best && bd < .24){ best.done = true; if (best.el) best.el.classList.add('gone'); RHY.hits++; RHY.combo++; rhyMsg(bd < .1 ? `🔥 جامد! ×${RHY.combo}` : `👌 حلو ×${RHY.combo}`, 'good'); tone(880 + lane*110, 660, .06, 'triangle', .06); buzz(8); hero.d.punchT = .2; hero.d.punchSide = lane < 2 ? -1 : 1; }
  else { RHY.combo = 0; rhyMsg('❌', 'bad'); }
}
document.querySelectorAll('.rlane').forEach((b, i) => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); rhyHit(i); }));
addEventListener('keydown', e => { if (!RHY.on) return; LANE_KEYS.forEach((ks, i) => { if (ks.includes(e.code)){ e.preventDefault(); rhyHit(i); } }); });
function updateRhythm(dt){
  if (!RHY.on) return;
  RHY.t += dt;
  const H = $('rhyNotes').clientHeight || 300, travel = 1.6;
  for (const n of RHY.notes){
    const dtn = n.at - RHY.t;
    if (!n.done && dtn < -.25){ n.done = true; RHY.combo = 0; if (n.el) n.el.classList.add('miss'); }
    if (dtn > travel || (n.done && dtn < -.4)){ if (n.el && dtn < -.4){ n.el.remove(); n.el = null; } continue; }
    if (!n.el){ n.el = document.createElement('i'); n.el.className = `rnote l${n.lane}`; n.el.style.left = `${3 + n.lane*24}%`; $('rhyNotes').appendChild(n.el); }
    n.el.style.top = `${(1 - dtn/travel) * H - 15}px`;
  }
  $('rhyBar').style.width = `${clamp(RHY.t / RHY.dur, 0, 1)*100}%`;
  $('rhyScore').textContent = `${RHY.hits} / ${RHY.total}`;
  if (Math.floor((RHY.t) / RHY.beat) !== Math.floor((RHY.t - dt) / RHY.beat) && RHY.t > 0){ noise(.05, 2200, .12); }
  if (RHY.t >= RHY.dur + 1){
    RHY.on = false; $('rhy').hidden = true; hero.locked = false; document.body.classList.remove('in-rhythm'); $('rhyNotes').innerHTML = '';
    const pct = RHY.total ? RHY.hits / RHY.total : 0; const r = RHY.res; RHY.res = null; r && r({ pct, hits: RHY.hits, total: RHY.total });
  }
}

// ---- 19f-extras.js ----
// ================= progress across all modes: stats, achievements, gold tea glasses, photo mode =================
const PROG_KEY = 'ty_prog';
const PROG = (() => { try { const p = JSON.parse(store.get(PROG_KEY) || 'null'); if (p) return { glasses: p.glasses || [], ach: p.ach || {}, stats: p.stats || {}, best: p.best || {} }; } catch(e){} return { glasses: [], ach: {}, stats: {}, best: {} }; })();
const saveProg = () => store.set(PROG_KEY, JSON.stringify(PROG));
function stat(key, n=1){ PROG.stats[key] = (PROG.stats[key] || 0) + n; achCheckSoon(); }
function bestOf(key, v, lower=false){ const b = PROG.best[key]; if (b === undefined || (lower ? v < b : v > b)){ PROG.best[key] = v; saveProg(); return true; } return false; }
const stS = k => PROG.stats[k] || 0;
// ---- achievements ----
const ACH = [
  { id: 'shift', icon: '☕', name: 'أول وردية', desc: 'قدّم أول مشروب في قصر الملوك', ok: () => stS('drinks') >= 1 },
  { id: 'tea50', icon: '🫖', name: 'معلم الشاي', desc: 'قدّم ٥٠ مشروب', ok: () => stS('drinks') >= 50, prog: () => [stS('drinks'), 50] },
  { id: 'foul30', icon: '🧆', name: 'ملك الفول', desc: 'بيع ٣٠ طلب فول', ok: () => stS('foul') >= 30, prog: () => [stS('foul'), 30] },
  { id: 'dom', icon: '🎲', name: 'إيد خفيفة', desc: 'اكسب ماتش دومنو', ok: () => stS('domWin') >= 1 },
  { id: 'dom2', icon: '🤝', name: 'شركاء', desc: 'اكسب ماتش ٢ ضد ٢ مع إسلام', ok: () => stS('domWin2') >= 1 },
  { id: 'qafla', icon: '🔒', name: 'قفلة!', desc: 'اقفل الدور وانت أقل في النقط', ok: () => stS('qafla') >= 1 },
  { id: 'tawla', icon: '🎯', name: 'عم الطاولة', desc: 'اكسب عشرة طاولة', ok: () => stS('tawlaWin') >= 1 },
  { id: 'g1', icon: '🏆', name: 'أول كوباية دهب', desc: 'لاقي كوباية شاي دهب', ok: () => PROG.glasses.length >= 1 },
  { id: 'g10', icon: '✨', name: 'نص الطقم', desc: 'لاقي ١٠ كوبايات دهب', ok: () => PROG.glasses.length >= 10, prog: () => [PROG.glasses.length, 10] },
  { id: 'g20', icon: '👑', name: 'الطقم الدهب كامل', desc: 'لاقي الـ ٢٠ كوباية الدهب', ok: () => PROG.glasses.length >= 20, prog: () => [PROG.glasses.length, 20] },
  { id: 'arabi5', icon: '👊', name: 'مش خايف', desc: 'وقّع العربي ٥ مرات', ok: () => stS('arabiDown') >= 5, prog: () => [stS('arabiDown'), 5] },
  { id: 'thief5', icon: '🥪', name: 'صايد الحرامي', desc: 'امسك يوسف ٥ مرات', ok: () => stS('thief') >= 5, prog: () => [stS('thief'), 5] },
  { id: 'pizza10', icon: '🍕', name: 'طيار ديليفري', desc: 'وصّل ١٠ بيتزا', ok: () => stS('pizza') >= 10, prog: () => [stS('pizza'), 10] },
  { id: 'tuk10', icon: '🛺', name: 'أسطى توكتوك', desc: 'وصّل ١٠ زباين بالتوكتوك', ok: () => stS('tuk') >= 10, prog: () => [stS('tuk'), 10] },
  { id: 'goal5', icon: '⚽', name: 'هداف الحتة', desc: 'سجّل ٥ من ٥ ضربات جزاء', ok: () => stS('penalty5') >= 1 },
  { id: 'park', icon: '🅿️', name: 'السايس مبسوط', desc: 'اركن في أقل من ٢٠ ثانية', ok: () => stS('parkFast') >= 1 },
  { id: 'stunt', icon: '🏍️', name: 'طيارة بجد', desc: 'اطلع في الهوا ثانيتين بالموتوسيكل', ok: () => stS('air2') >= 1 },
  { id: 'pigeon', icon: '🕊️', name: 'غِيّة الحمام', desc: 'رجّع الحمام كله للغِيّة', ok: () => stS('pigeons') >= 1 },
  { id: 'kameen', icon: '🚓', name: 'ورقك سليم', desc: 'عدّي من كمين من غير مخالفة', ok: () => stS('kameenOk') >= 1 },
  { id: 'garage', icon: '🔧', name: 'عربيتي على مزاجي', desc: 'غيّر لون أو ركّب حاجة في الجراج', ok: () => stS('garage') >= 1 },
  { id: 'house3', icon: '🏠', name: 'بيت الجامد', desc: 'جدّد البيت لآخر مستوى', ok: () => typeof SAVE !== 'undefined' && SAVE.house >= 3 },
  { id: 'photo5', icon: '📸', name: 'مصوّر الحتة', desc: 'صوّر ٥ صور', ok: () => stS('photos') >= 5, prog: () => [stS('photos'), 5] },
  { id: 'ramadan', icon: '🌙', name: 'ليلة رمضان', desc: 'لف في الحتة في ليلة رمضان', ok: () => stS('ramadan') >= 1 },
  { id: 'story', icon: '👑', name: 'الجامد', desc: 'خلّص القصة كلها', ok: () => typeof SAVE !== 'undefined' && SAVE.ended },
];
let achT = 0; const achCheckSoon = () => { achT = Math.min(achT, .2); };
const achQueue = [];
function achCheck(){ let any = false; for (const a of ACH){ if (PROG.ach[a.id]) continue; let ok = false; try { ok = a.ok(); } catch(e){} if (ok){ PROG.ach[a.id] = Date.now(); achQueue.push(a); any = true; } } if (any) saveProg(); }
function achToastTick(dt){
  const el = $('achToast');
  if (achToastTick.t > 0){ achToastTick.t -= dt; if (achToastTick.t <= 0) el.classList.remove('show'); return; }
  const a = achQueue.shift(); if (!a || CUT.on) { if (a) achQueue.unshift(a); return; }
  el.innerHTML = `<span class="ai">${a.icon}</span><span><small>إنجاز جديد 🏆</small><b>${a.name}</b></span>`; el.classList.add('show'); achToastTick.t = 3.6;
  tone(660, 660, .12, 'triangle', .15); tone(880, 880, .12, 'triangle', .15, .12); tone(1320, 1320, .3, 'triangle', .15, .24); buzz(30);
}
achToastTick.t = 0;
function openAch(){
  const done = ACH.filter(a => PROG.ach[a.id]).length;
  $('achHead').textContent = `🏆 الإنجازات · ${done}/${ACH.length} · كوبايات دهب ${PROG.glasses.length}/20`;
  $('achList').innerHTML = ACH.map(a => { const got = !!PROG.ach[a.id], p = !got && a.prog ? a.prog() : null; return `<div class="ach ${got ? 'got' : ''}"><span class="ai">${got ? a.icon : '🔒'}</span><span><b>${a.name}</b><small>${a.desc}${p ? ` · ${Math.min(p[0], p[1])}/${p[1]}` : ''}</small></span></div>`; }).join('');
  $('achOv').hidden = false;
}
$('achClose').onclick = () => { $('achOv').hidden = true; };
// ---- 20 gold tea glasses hidden around the map ----
const goldMat = new THREE.MeshStandardMaterial({ color: 0xffc83a, metalness: 1, roughness: .22, emissive: 0x6a4500, emissiveIntensity: .55 });
const goldTea = new THREE.MeshStandardMaterial({ color: 0x8a2a06, emissive: 0x3a1000, emissiveIntensity: .4, roughness: .3 });
const GLASS_SPOTS = (() => {
  const rnd = mulberry32(2024), out = [];
  const blockAt = (i, k) => blocksInfo.find(b => Math.abs(b.cx - (X0 + PITCH/2 + i*PITCH)) < 2 && Math.abs(b.cz - (Z0 + PITCH/2 + k*PITCH)) < 2);
  const picks = [[0,0],[1,3],[2,0],[3,4],[4,1],[5,3],[6,0],[7,1],[7,4],[0,4],[3,1],[5,0],[6,4],[2,3],[4,4],[1,1]];
  for (const [i, k] of picks){ const b = blockAt(i, k); if (!b) continue; const p = perimPos(b, rnd()*4); out.push([p[0], p[1]]); }
  out.push([96, 232], [62, 276], [142, 282], [216, -24]);
  return out.slice(0, 20).map(([x, z], id) => { const [fx, fz] = freeSpot(x, z); return { id, x: fx, z: fz }; });
})();
const goldGlasses = GLASS_SPOTS.map(s => {
  const g = new THREE.Group();
  const gl = makeGlass('شاي'); gl.traverse(m => { if (m.isMesh) m.material = m.material === glassMat ? goldMat : m.material === saucerMat ? goldMat : goldTea; }); gl.scale.setScalar(4.2); g.add(gl);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); beam.scale.set(.35, .45, .35); g.add(beam);
  g.position.set(s.x, groundY(s.x, s.z), s.z); g.visible = false; scene.add(g);
  return { ...s, g, gl, got: () => PROG.glasses.includes(s.id) };
});
const glassesOn = () => state === 'play' && (modeId === 'story' || modeId === 'free');
function updateGlasses(dt, t){
  const on = glassesOn(), f = hero.veh ? hero.veh.pos : hero.pos;
  for (const G of goldGlasses){
    const vis = on && !G.got() && !HOUSE.inside && Math.abs(G.x - f.x) < 140 && Math.abs(G.z - f.z) < 140;
    G.g.visible = vis; if (!vis) continue;
    G.gl.rotation.y = t*1.8 + G.id; G.gl.position.y = 1 + Math.sin(t*2.4 + G.id)*.15;
    const d = Math.hypot(G.x - f.x, G.z - f.z);
    if (d < (hero.veh ? 3.2 : 1.8)){
      PROG.glasses.push(G.id); saveProg(); G.g.visible = false; const n = PROG.glasses.length;
      const pay = n >= 20 ? 500 : 25; hero.money += pay; coin(); tone(1046, 1568, .35, 'triangle', .16); buzz(40); stat('glassFound'); heroCheer();
      banner(n >= 20 ? `👑 لقيت الطقم الدهب كله! +${pay} جنيه` : `🏆 كوباية دهب ${n}/20 · +${pay} جنيه`, 'ok', 3);
    }
  }
}
// ---- photo mode ----
const PHOTO = { on: false, yaw: 0, tilt: .25, dist: 4.2, filter: 'none', pose: 0, last: null };
const PHOTO_FILTERS = [['none', 'عادي'], ['sepia(.85) contrast(1.05)', 'قديم'], ['grayscale(1) contrast(1.15)', 'أبيض وأسود'], ['saturate(1.5) contrast(1.08)', 'ألوان'], ['sepia(.35) saturate(1.4) hue-rotate(-12deg)', 'دافي']];
const POSES = ['واقف', 'بوكس 👊', 'بيرقص 💃', 'واقع 😵'];
function openPhoto(){
  if (state !== 'play' || CUT.on || ST.kind || RHY.on) return;
  PHOTO.on = true; PHOTO.yaw = camYaw; PHOTO.tilt = .25; PHOTO.dist = 4.2; PHOTO.pose = 0;
  document.body.classList.add('photo'); $('photoUi').hidden = false; renderPhotoUi();
}
function closePhoto(){ PHOTO.on = false; document.body.classList.remove('photo'); $('photoUi').hidden = true; $('photoShot').hidden = true; canvas.style.filter = ''; hero.d.downT = 0; CAM.orbit = CAM.orbitSm = camYaw; }
function renderPhotoUi(){
  $('phFilter').textContent = '🎨 ' + PHOTO_FILTERS.find(f => f[0] === PHOTO.filter)[1];
  $('phPose').textContent = '🕺 ' + POSES[PHOTO.pose];
  canvas.style.filter = PHOTO.filter === 'none' ? '' : PHOTO.filter;
}
$('phFilter').onclick = () => { const i = PHOTO_FILTERS.findIndex(f => f[0] === PHOTO.filter); PHOTO.filter = PHOTO_FILTERS[(i + 1) % PHOTO_FILTERS.length][0]; renderPhotoUi(); };
$('phPose').onclick = () => { PHOTO.pose = (PHOTO.pose + 1) % POSES.length; renderPhotoUi(); };
$('phClose').onclick = closePhoto;
$('phZoomIn').onclick = () => { PHOTO.dist = clamp(PHOTO.dist - .8, 1.8, 14); };
$('phZoomOut').onclick = () => { PHOTO.dist = clamp(PHOTO.dist + .8, 1.8, 14); };
$('phSnap').onclick = takePhoto;
$('photoBtn').onclick = openPhoto;
function photoTick(dt, t){
  // drag anywhere to orbit; the world is frozen, only the hero poses
  const f = hero.veh ? hero.veh.pos : hero.pos;
  lookAt.set(f.x, f.y + 1.15, f.z);
  const h = .3 + PHOTO.dist * PHOTO.tilt;
  camera.position.set(f.x + Math.sin(PHOTO.yaw)*PHOTO.dist, f.y + 1.05 + h, f.z + Math.cos(PHOTO.yaw)*PHOTO.dist); camera.lookAt(lookAt);
  camYaw = PHOTO.yaw;
  const d = hero.d;
  if (!hero.veh){ d.root.position.copy(hero.pos); d.root.visible = true; }
  if (PHOTO.pose === 1){ if (d.punchT <= 0){ d.punchT = .28; d.punchSide = -d.punchSide || 1; } }
  if (PHOTO.pose === 3) d.downT = Math.max(d.downT, .5); else d.downT = 0;
  const dance = PHOTO.pose === 2 ? Math.sin(t*6) : 0;
  if (d.is3D){ d.forceMove = PHOTO.pose === 2 ? 'dance' : null; animDoll(d, 0, 0, dt, t); } else animDoll(d, dance*2.5, 0, dt, t); if (PHOTO.pose === 2 && !d.is3D){ d.doll.rotation.z = dance*.12; d.doll.position.y += Math.abs(dance)*.08; }
  for (const x of [enemy, wanted]) if (x.active && x.d.root.visible) animDoll(x.d, 0, 0, 0, t);
  updateBubbles(dt);
}
(() => { let drag = null;
  canvas.addEventListener('pointerdown', e => { if (!PHOTO.on) return; drag = { x: e.clientX, y: e.clientY }; });
  addEventListener('pointermove', e => { if (!PHOTO.on || !drag) return; PHOTO.yaw -= (e.clientX - drag.x) * .008; PHOTO.tilt = clamp(PHOTO.tilt + (e.clientY - drag.y) * .004, -.05, 1.2); drag = { x: e.clientX, y: e.clientY }; });
  addEventListener('pointerup', () => { drag = null; });
  addEventListener('wheel', e => { if (PHOTO.on) PHOTO.dist = clamp(PHOTO.dist + Math.sign(e.deltaY)*.6, 1.8, 14); }, { passive: true });
})();
function takePhoto(){
  photoTick(0, performance.now()/1000); renderer.render(scene, camera);
  const W = canvas.width, H = canvas.height, out = document.createElement('canvas'); out.width = W; out.height = H; const g = out.getContext('2d');
  if (PHOTO.filter !== 'none') g.filter = PHOTO.filter; g.drawImage(canvas, 0, 0); g.filter = 'none';
  const s = H / 720; g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, H - 64*s, W, 64*s);
  g.font = `900 ${34*s}px Cairo, sans-serif`; g.fillStyle = '#ffc94a'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.direction = 'rtl'; g.fillText('طيارة الجامد 👑', W - 22*s, H - 32*s);
  g.font = `700 ${20*s}px Cairo, sans-serif`; g.fillStyle = '#f6efe2'; g.textAlign = 'left'; g.direction = 'ltr'; g.fillText(`${DISTRICT_NAMES[districtAt(hero.pos.x, hero.pos.z)] || ''} · ${clockText()}`, 22*s, H - 32*s);
  PHOTO.last = out.toDataURL('image/jpeg', .9);
  $('photoImg').src = PHOTO.last; $('photoShot').hidden = false;
  noise(.08, 4000, .4); flash(); stat('photos');
}
$('phSave').onclick = () => { const a = document.createElement('a'); a.href = PHOTO.last; a.download = `tayara-${Date.now()}.jpg`; document.body.appendChild(a); a.click(); a.remove(); };
$('phShare').onclick = async () => { try { const blob = await (await fetch(PHOTO.last)).blob(); const file = new File([blob], 'tayara.jpg', { type: 'image/jpeg' }); if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'طيارة الجامد' }); else $('phSave').onclick(); } catch(e){} };
$('phBack').onclick = () => { $('photoShot').hidden = true; };
$('phShare').hidden = !navigator.share;
// ---- per-frame ----
function updateExtras(dt, t){
  updateGlasses(dt, t);
  achT -= dt; if (achT <= 0){ achT = 1.5; achCheck(); }
  achToastTick(dt);
}

// ---- 19g-activities.js ----
// ================= open-world activities: penalties, parking with the سايس, pigeons, stunt ramps, police checkpoints =================
// Activities run in the free mode and in the story (outside cutscenes and jobs). One at a time.
const ACT = { kind: null, d: null, cam: null };
const AV = (x, y, z) => new THREE.Vector3(x, y, z);
const nearXZ = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) < r;
const helper = npcs[39];          // keeper / سايس / officer, one activity at a time
function actAvailable(){ return state === 'play' && (modeId === 'free' || (modeId === 'story' && ST2.phase !== 'intro' && ST2.phase !== 'outro')) && !JOB.kind && !modeObj.job && !CUT.on && !ST.kind && !HOUSE.inside; }
function actUi(label, val, zone){ const u = $('actUi'); u.hidden = false; $('amLabel').textContent = label; $('amMark').style.left = `${clamp(val, 0, 1)*100}%`; const z = $('amZone'); if (zone){ z.hidden = false; z.style.left = `${zone[0]*100}%`; z.style.width = `${(zone[1]-zone[0])*100}%`; } else z.hidden = true; }
function actStart(k){ if (ACT.kind) return; ACT.kind = k; ACT.d = {}; $('actQuit').hidden = false; ACTS[k].start(ACT.d); }
function actEnd(msg, cls='ok'){
  const A = ACTS[ACT.kind]; if (!A) return; A.end && A.end(ACT.d);
  ACT.kind = null; ACT.d = null; ACT.cam = null; hero.locked = false; $('actUi').hidden = true; $('actQuit').hidden = true;
  if (msg) banner(msg, cls, 3.2);
  if (modeId === 'story') saveStory();
}
$('actQuit').onclick = () => actEnd('خلّصت 👋', 'info');
function helperShow(x, z, yaw, name){ const n = helper; n.role = 'act'; n.state = 'idle'; n.g.visible = true; n.g.position.set(x, groundY(x, z), z); n.yaw = yaw; n.g.rotation.set(0, yaw, 0); n.fall = 0; n.downT = 0; n.name = name; }
function helperHide(){ const n = helper; if (n.role !== 'act') return; n.state = 'hidden'; n.g.visible = false; n.role = null; n.g.rotation.x = 0; n.body.position.x = 0; }
const signSprite = (emoji, label) => { const t = makeTex(256, 128, (g, w, h) => { g.fillStyle = 'rgba(20,14,8,.82)'; g.beginPath(); g.roundRect(4, 4, w-8, h-8, 28); g.fill(); g.strokeStyle = '#ffc94a'; g.lineWidth = 5; g.stroke(); g.font = '64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, 52, h/2 + 4); arText(g, label, 160, h/2 + 4, 34, '#ffe08a'); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true })); s.scale.set(2.2, 1.1, 1); scene.add(s); return s; };

// ---------- ⚽ penalties at the stadium ----------
const PITCH_B = blocksInfo.find(b => b.type === 'pitch') || { cx: 216, cz: -24 };
const PEN = { goalX: PITCH_B.cx + 15.2, cz: PITCH_B.cz, spotX: PITCH_B.cx + 8.2 };
const ball = new THREE.Mesh(new THREE.SphereGeometry(.17, 18, 14), new THREE.MeshStandardMaterial({ roughness: .5, map: makeTex(128, 64, (g, w, h) => { g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h); g.fillStyle = '#151515'; for (let i = 0; i < 9; i++){ const x = (i*37) % w, y = (i*23) % h; g.beginPath(); for (let k = 0; k < 5; k++){ const a = k/5*Math.PI*2; g.lineTo(x + Math.cos(a)*8, y + Math.sin(a)*8); } g.fill(); } }) }));
ball.castShadow = true; ball.visible = false; scene.add(ball);
const aimRing = new THREE.Mesh(new THREE.RingGeometry(.22, .3, 24), new THREE.MeshBasicMaterial({ color: 0xffd34d, side: THREE.DoubleSide, transparent: true, opacity: .9, depthTest: false })); aimRing.rotation.y = Math.PI/2; aimRing.renderOrder = 5; aimRing.visible = false; scene.add(aimRing);
const footballSign = signSprite('⚽', 'ضربات جزاء'); footballSign.position.set(PEN.spotX - 2.5, 3, PEN.cz + 4);
function penNext(d){ d.phase = 'aim'; d.t = 0; ball.position.set(PEN.spotX, .35, PEN.cz); ball.visible = true; helperShow(PEN.goalX - .6, PEN.cz, -Math.PI/2, 'الحارس'); helper.body.position.x = 0; helper.g.rotation.x = 0; aimRing.visible = true; }

// ---------- 🅿️ parking with the سايس ----------
const LOT = (() => { const lots = blocksInfo.filter(b => b.type === 'parking'); lots.sort((a, b) => Math.hypot(a.cx - 24, a.cz - 24) - Math.hypot(b.cx - 24, b.cz - 24)); return lots[0] || null; })();
const parkCar = LOT ? addVehicle('car', LOT.cx - 13, LOT.cz, Math.PI/2, '#6a1b9a') : null;
if (parkCar){ parkCar.jobOnly = 'parking'; parkCar.home.y = .19; parkCar.pos.y = .19; }
const slotMark = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 4.8), new THREE.MeshBasicMaterial({ color: 0x3cff6a, transparent: true, opacity: .35, depthWrite: false })); slotMark.rotation.x = -Math.PI/2; slotMark.visible = false; scene.add(slotMark);
const parkSign = LOT ? signSprite('🅿️', 'السايس') : null; if (parkSign) parkSign.position.set(LOT.cx - 16, 3, LOT.cz + 2.4);
const SAIS_POS = LOT ? AV(LOT.cx - 16.2, .15, LOT.cz + 2.2) : null;
function freeSlot(){
  const opts = [];
  for (const row of [-7, 7]) for (let i = 0; i < 10; i++){ const x = LOT.cx - 12.6 + i*2.8, z = LOT.cz + row; if (parkedSpots.some(p => Math.hypot(p.x - x, p.z - z) < 1.2)) continue; if (vehicles.some(v => v !== parkCar && Math.hypot(v.pos.x - x, v.pos.z - z) < 2)) continue; opts.push({ x, z, yaw: row < 0 ? 0 : Math.PI }); }
  return opts.length ? rpick(opts) : null;
}

// ---------- 🕊️ pigeons (غِيّة الحمام) ----------
const COOP = (() => { const parks = blocksInfo.filter(b => b.type === 'park'); parks.sort((a, b) => Math.hypot(a.cx - SPOT.house.x, a.cz - SPOT.house.z) - Math.hypot(b.cx - SPOT.house.x, b.cz - SPOT.house.z)); const b = parks[0]; const [x, z] = freeSpot(b ? b.cx + 6 : -40, b ? b.cz - 6 : 60); return AV(x, .15, z); })();
{ const p = []; for (const [dx, dz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) box(p, .12, 4.2, .12, COOP.x + dx*.9, 2.1, COOP.z + dz*.9, '#6b4a2a');
  box(p, 2.3, 1.4, 2.3, COOP.x, 4.6, COOP.z, '#a5763f'); box(p, 2.7, .12, 2.7, COOP.x, 5.36, COOP.z, '#7a5230'); box(p, 2.5, .08, 2.5, COOP.x, 3.9, COOP.z, '#5a3c22');
  for (let i = 0; i < 4; i++) box(p, .5, .45, .05, COOP.x - .75 + i*.5, 4.6, COOP.z + 1.16, '#2b1d10');
  box(p, .05, 2, .05, COOP.x + 1.1, 6.3, COOP.z + 1.1, '#444'); box(p, .9, .55, .02, COOP.x + 1.55, 6.9, COOP.z + 1.1, '#c62828');
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 })); m.castShadow = true; scene.add(m);
  obstacles.push({ minX: COOP.x - 1.1, maxX: COOP.x + 1.1, minZ: COOP.z - 1.1, maxZ: COOP.z + 1.1 }); }
const coopSign = signSprite('🕊️', 'غِيّة الحمام'); coopSign.position.set(COOP.x, 7.6, COOP.z);
const birdMat = new THREE.MeshStandardMaterial({ color: 0xe9e6de, roughness: .7 }), birdDark = new THREE.MeshStandardMaterial({ color: 0x8a8f98, roughness: .7 });
const birdBody = new THREE.SphereGeometry(.13, 10, 8); birdBody.scale(1, .8, 1.6);
const wingGeo = new THREE.BoxGeometry(.34, .02, .16); wingGeo.translate(.17, 0, 0);
const pigeons = [];
for (let i = 0; i < 8; i++){
  const g = new THREE.Group(); const b = new THREE.Mesh(birdBody, i % 3 ? birdMat : birdDark); g.add(b);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), birdDark); head.position.set(0, .07, .2); g.add(head);
  const wl = new THREE.Mesh(wingGeo, i % 3 ? birdMat : birdDark), wr = wl.clone(); wr.rotation.y = Math.PI; g.add(wl, wr);
  g.scale.setScalar(1.3); scene.add(g);
  pigeons.push({ g, wl, wr, a: i/8*Math.PI*2, r: 6 + (i%3)*2, h: 9 + (i%4), sp: .5 + (i%3)*.12, state: 'circle', pos: AV(0, 0, 0), from: AV(0,0,0), to: AV(0,0,0), k: 0 });
}
function updatePigeons(dt, t){
  for (const p of pigeons){
    let flap = 1;
    if (p.state === 'circle'){ p.a += p.sp*dt; const x = COOP.x + Math.cos(p.a)*p.r, z = COOP.z + Math.sin(p.a)*p.r, y = p.h + Math.sin(t*1.3 + p.r)*.6; p.g.position.set(x, y, z); p.g.rotation.set(0, -p.a, Math.sin(t + p.r)*.15); }
    else if (p.state === 'fly'){ p.k = Math.min(1, p.k + dt / p.dur); const e = p.k; p.g.position.lerpVectors(p.from, p.to, e); p.g.position.y += Math.sin(e*Math.PI) * 7; p.g.rotation.set(0, Math.atan2(p.to.x - p.from.x, p.to.z - p.from.z), 0); if (p.k >= 1){ p.state = p.next; if (p.state === 'ground'){ p.g.position.copy(p.to); } } }
    else if (p.state === 'ground'){ flap = 0; p.g.position.y = groundY(p.to.x, p.to.z) + .12 + Math.abs(Math.sin(t*5 + p.r))*.03; p.g.rotation.y += Math.sin(t*2 + p.r)*dt; }
    const w = flap ? Math.sin(t*18 + p.r)*.9 : -.1; p.wl.rotation.z = w; p.wr.rotation.z = -w;
  }
}
function pigeonFly(p, to, next){ p.from.copy(p.g.position); p.to.copy(to); p.k = 0; p.dur = Math.max(1.5, p.from.distanceTo(to) / 16); p.state = 'fly'; p.next = next; }

// ---------- 🏍️ stunt ramps ----------
const RAMPS = [ { x: 232, z: 3, yaw: Math.PI/2 }, { x: 60, z: 141, yaw: Math.PI/2 }, { x: 99, z: 270, yaw: 0 }, { x: -45, z: -45, yaw: 0 }, { x: 189, z: 99, yaw: -Math.PI/2 } ];
{ const rampMat = new THREE.MeshStandardMaterial({ color: 0xa0703c, roughness: .8, map: makeTex(64, 128, (g, w, h) => { g.fillStyle = '#a0703c'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(60,35,15,.5)'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 3); g.fillStyle = '#ffd200'; g.fillRect(0, h - 10, w, 10); }) });
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(6, 0); shape.lineTo(6, 1.5); shape.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 3.2, bevelEnabled: false }); geo.translate(-3, 0, -1.6); geo.rotateY(-Math.PI/2);
  for (const r of RAMPS){ const m = new THREE.Mesh(geo, rampMat); m.position.set(r.x, 0, r.z); m.rotation.y = r.yaw; m.castShadow = true; m.receiveShadow = true; scene.add(m); r.fx = Math.sin(r.yaw); r.fz = Math.cos(r.yaw); } }
// height of the ramp surface under a point (0 when not on a ramp)
function rampHeight(x, z){ for (const r of RAMPS){ const dx = x - r.x, dz = z - r.z, along = dx*r.fx + dz*r.fz, lat = dx*r.fz - dz*r.fx; if (Math.abs(lat) < 1.6 && along > -3 && along < 3) return { h: (along + 3) / 6 * 1.5, r, along }; } return null; }
// called from driveVehicle every frame
function vehicleAir(v, dt){
  if (v.air){
    v.air.vy -= 13*dt; v.pos.y += v.air.vy*dt; v.air.t += dt; v.mesh.rotation.x = clamp(-v.air.vy*.03, -.35, .35);
    const g = groundY(v.pos.x, v.pos.z);
    if (v.pos.y <= g && v.air.vy < 0){ const t = v.air.t; v.pos.y = g; v.air = null; v.mesh.rotation.x = 0; thwack(); shake = .35; buzz(40); puff(AV(v.pos.x, .3, v.pos.z), .8);
      if (t > .7){ const pay = Math.round(t*12); if (modeId === 'story' || modeId === 'free') hero.money += pay; banner(`🛫 نطّة ${t.toFixed(1)} ثانية! +${pay} جنيه`, 'ok', 2.4); coin(); if (bestOf('air', +t.toFixed(2))) setTimeout(() => banner(`🏆 أطول نطّة: ${t.toFixed(1)} ثانية`, 'ok', 2.4), 2500); if (t >= 2) stat('air2'); } }
    return true;
  }
  const rh = rampHeight(v.pos.x, v.pos.z);
  if (rh){ v.pos.y = rh.h; const fwd = Math.sin(v.yaw)*rh.r.fx + Math.cos(v.yaw)*rh.r.fz; v.mesh.rotation.x = -.24 * Math.sign(fwd);
    if (rh.along > 2.4 && fwd > .7 && v.speed > 9){ v.air = { vy: v.speed * (v.type === 'moto' ? .5 : .38), t: 0 }; tone(200, 500, .4, 'sawtooth', .08); }
    return true; }
  if (v.mesh.rotation.x) v.mesh.rotation.x *= .8;
  return false;
}

// ---------- 🚓 police checkpoint (كمين) while driving ----------
const kameenCar = makeCar('#f4f4f4', 'police'); kameenCar.visible = false;
let kameenT = R(120, 200);
const NO_KAMEEN = new Set(['race','friendRace','chase','returnMoto','checkpoints','sighting','shamsWedding','snatch','pizzaThief','tail','flatTire','thugs','bossFight','spill']);
function ownVehicle(v){ if (!v) return false; if (v === heroMoto || v === heroCar) return modeId !== 'story' || SAVE.owned[v.type === 'moto' ? 'moto' : 'car']; if (v.jobOnly && v.jobOnly === JOB.kind) return true; if (v === copCar) return modeId === 'police'; return false; }
function kameenSpawn(){
  const v = hero.veh, fx = Math.sin(v.yaw), fz = Math.cos(v.yaw); let x = v.pos.x + fx*60, z = v.pos.z + fz*60;
  const alongX = Math.abs(fx) > Math.abs(fz);
  if (alongX){ z = ROADS_Z.reduce((b, r) => Math.abs(r - v.pos.z) < Math.abs(b - v.pos.z) ? r : b, ROADS_Z[0]); }
  else { x = ROADS_X.reduce((b, r) => Math.abs(r - v.pos.x) < Math.abs(b - v.pos.x) ? r : b, ROADS_X[0]); }
  if (!inWorld(x, z) || Math.abs(alongX ? v.pos.z - z : v.pos.x - x) > 7) return false;
  actStart('kameen'); const d = ACT.d; d.pos = AV(x, 0, z); d.alongX = alongX;
  kameenCar.visible = true; kameenCar.position.set(alongX ? x : x + 6.5, 0, alongX ? z + 6.5 : z); kameenCar.rotation.y = alongX ? Math.PI/2 : 0;
  helperShow(alongX ? x : x + 4.2, alongX ? z + 4.2 : z, alongX ? Math.PI : -Math.PI/2, 'أمين الشرطة');
  banner('🚓 كمين قدامك! هدّي ووقف عند الظابط', 'police', 3); return true;
}

// ---------- the activities ----------
const ACTS = {
  football: { pos: AV(PEN.spotX - 1.6, .15, PEN.cz + 2.5), r: 3, label: 'العب ضربات جزاء ⚽',
    start(d){ d.shot = 0; d.goals = 0; d.res = []; hero.locked = true; heroTo2(PEN.spotX - 1.3, PEN.cz); penNext(d); banner('⚽ ٥ ضربات جزاء… وجّه ودوس', 'info', 2.5); },
    update(dt, d, t){
      ACT.cam = { p: AV(PEN.spotX - 4.6, 2.6, PEN.cz + 2.4), l: AV(PEN.goalX, 1.1, PEN.cz - .3) };
      hero.pos.set(PEN.spotX - .9, .15, PEN.cz - .9); hero.vel.set(0, 0, 0);
      d.t += dt; const H = helper;
      if (d.phase === 'aim'){ d.aim = Math.sin(d.t*2.2); aimRing.position.set(PEN.goalX - .1, 1.1, PEN.cz + d.aim*3.2); actUi('وجّه الشوطة ⬅️➡️ ودوس ✋', (d.aim + 1)/2); H.body.position.x = Math.sin(t*3)*.15; }
      else if (d.phase === 'power'){ d.pow = 1 - Math.abs(((d.t*.9) % 2) - 1); aimRing.position.y = .35 + d.pow*2.4; actUi('القوة… دوس تاني ✋ (الأخضر أحسن)', d.pow, [.35, .78]); }
      else if (d.phase === 'fly'){ d.k = Math.min(1, d.k + dt/.55); const e = d.k; ball.position.set(PEN.spotX + (d.tx - PEN.spotX)*e, .35 + (d.ty - .35)*e + Math.sin(e*Math.PI)*.4, PEN.cz + (d.tz - PEN.cz)*e); ball.rotation.x += dt*20;
        const kd = Math.min(1, d.k*1.6); H.g.position.z = PEN.cz + (d.kz - PEN.cz)*kd; H.g.rotation.x = 0; H.g.rotation.z = (d.kz - PEN.cz)*-.35*kd;
        if (d.k >= 1) penResult(d); }
      else if (d.phase === 'result'){ if (d.t > 1.6){ d.shot++; H.g.rotation.z = 0; if (d.shot >= 5) return penEnd(d); penNext(d); } }
    },
    action(d){ if (d.phase === 'aim') return { text: '🎯 ثبّت الاتجاه', fn: () => { d.phase = 'power'; d.t = 0; } }; if (d.phase === 'power') return { text: '⚽ شوط!', fn: () => penShoot(d) }; return null; },
    hud: d => `⚽ ضربة ${Math.min(d.shot + 1, 5)} من ٥ · أهداف: <b style="display:inline;color:#fff">${d.goals}</b><br>${d.res.map(r => r ? '✅' : '❌').join(' ')}`,
    end(){ ball.visible = false; aimRing.visible = false; helperHide(); } },
  parking: LOT ? { pos: SAIS_POS, r: 2.6, label: 'اركن عربية زبون للسايس 🅿️ (بقشيش)',
    start(d){ d.slot = freeSlot(); if (!d.slot){ actEnd('الجراج مليان… تعالى بعدين', 'info'); return; } d.t = 45; d.used = 0; d.hold = 0; d.dmg0 = 0;
      parkCar.pos.set(LOT.cx - 13.5, .19, LOT.cz); parkCar.yaw = Math.PI/2; parkCar.mesh.rotation.set(0, parkCar.yaw, 0); parkCar.dmg = 0; parkCar.broke = false; parkCar.speed = 0;
      slotMark.position.set(d.slot.x, .23, d.slot.z); slotMark.rotation.z = 0; slotMark.visible = true;
      helperShow(SAIS_POS.x, SAIS_POS.z, Math.PI/2, 'السايس'); say(helper, 'تعالى يا باشا… اركنها في المربع الأخضر 👉', 3);
      enterVehicle(parkCar); },
    update(dt, d){
      d.t -= dt; d.used += dt; const v = parkCar;
      if (hero.veh !== v){ return actEnd('سبت العربية… السايس زعلان 😤', 'bad'); }
      const L = carLocal(v.mesh, AV(d.slot.x, 0, d.slot.z)), ang = Math.abs(((v.yaw - d.slot.yaw + Math.PI*3) % (Math.PI*2)) - Math.PI), ok = Math.abs(L.along) < .9 && Math.abs(L.lat) < .5 && (ang < .3 || ang > Math.PI - .3);
      slotMark.material.color.setHex(ok ? 0x3cff6a : 0xffd34d);
      if (ok && Math.abs(v.speed) < .6){ d.hold += dt; if (d.hold > .8) return parkDone(d); } else d.hold = 0;
      if (Math.random() < dt*.25) say(helper, rpick(['شمال شمال…','يمين شوية يا باشا','على مهلك!','كمّل كمّل… كده','اكسر شوية']), 1.8);
      if (d.t <= 0) return actEnd('الوقت خلص… السايس ركنها بنفسه 😅', 'bad');
    },
    hud: d => `🅿️ اركن في المربع الأخضر · فاضل ${Math.max(0, Math.ceil(d.t))} ثانية<br>${Math.round(parkCar.dmg || 0) ? `خبطات: ${Math.round(parkCar.dmg)}٪ (هتتخصم من البقشيش)` : 'من غير خبطات = بقشيش أكبر'}`,
    end(){ slotMark.visible = false; if (hero.veh === parkCar) exitVehicle(true); helperHide(); } } : null,
  pigeons: { pos: AV(COOP.x + 2.2, .15, COOP.z + 1.6), r: 2.8, label: 'طيّر الحمام ورجّعه للغِيّة 🕊️',
    start(d){ d.t = 150; d.back = 0; for (const p of pigeons){ const to = sidewalkFar(COOP, 40, 115); pigeonFly(p, to, 'ground'); p.home = false; } banner('🕊️ الحمام نزل في الشوارع… لِف ورجّعه (النقط البيضا)', 'info', 3.5); },
    update(dt, d){ d.t -= dt; const f = hero.veh ? hero.veh.pos : hero.pos;
      for (const p of pigeons) if (p.state === 'ground' && !p.home && nearXZ(f, p.to, hero.veh ? 4 : 2.6)){ p.home = true; d.back++; const c = AV(COOP.x, 9, COOP.z); pigeonFly(p, c, 'circle'); tone(1200, 1700, .15, 'triangle', .1); banner(`🕊️ ${d.back}/8 رجع`, 'ok', 1.2); }
      if (d.back >= 8){ stat('pigeons'); hero.money += 60; return actEnd('🕊️ الحمام كله رجع الغِيّة! +٦٠ جنيه', 'ok'); }
      if (d.t <= 0) return actEnd(`الوقت خلص… رجّعت ${d.back} من ٨`, 'bad'); },
    hud: d => `🕊️ رجّع الحمام للغِيّة (${d.back}/8)<br>فاضل ${Math.max(0, Math.ceil(d.t))} ثانية · النقط البيضا على الخريطة`,
    marks: () => pigeons.filter(p => p.state === 'ground' && !p.home).map(p => ({ x: p.to.x, z: p.to.z, r: 3.2, c: '#ffffff' })),
    end(){ for (const p of pigeons) if (p.state !== 'circle'){ pigeonFly(p, AV(COOP.x, 9, COOP.z), 'circle'); } } },
  kameen: { pos: null,
    start(d){ d.stopT = 0; d.passed = false; d.flee = 0; d.asked = false; },
    update(dt, d){
      const v = hero.veh, f = v ? v.pos : hero.pos, dist = Math.hypot(f.x - d.pos.x, f.z - d.pos.z);
      if (d.fleeing){ d.flee -= dt; if (sirenGain) sirenGain.gain.value = .05; if (dist > 110){ if (sirenGain) sirenGain.gain.value = 0; return actEnd('😎 هربت من الكمين', 'ok'); } if (d.flee <= 0){ if (sirenGain) sirenGain.gain.value = 0; hero.money = Math.max(0, hero.money - 100); return actEnd('🚓 اتمسكت! مخالفة ١٠٠ جنيه', 'bad'); } return; }
      if (d.asked) return;
      if (dist < 9 && v){ if (Math.abs(v.speed) < 1.5){ d.stopT += dt; if (d.stopT > .7) kameenAsk(d); } else if (Math.abs(v.speed) > 7 && !d.passed){ d.passed = true; kameenRun(d, 'عدّيت من الكمين من غير ما تقف! 🚨'); } }
      if (dist > 140 && !d.passed) return actEnd(null);
      if (!v && dist > 20) return actEnd(null);
    },
    hud: d => d.fleeing ? `🚨 البوليس وراك! ابعد ١١٠ متر · فاضل ${Math.max(0, Math.ceil(d.flee))} ثانية` : '🚓 كمين! هدّي ووقف جنب أمين الشرطة',
    marks: () => ACT.d && ACT.d.pos ? [{ x: ACT.d.pos.x, z: ACT.d.pos.z, r: 5, c: Math.floor(performance.now()/250)%2 ? '#ff2020' : '#3a6bff' }] : [],
    end(){ kameenCar.visible = false; helperHide(); $('shop').hidden = true; kameenT = R(160, 260); } },
};
function heroTo2(x, z){ if (hero.veh) exitVehicle(true); hero.pos.set(x, groundY(x, z), z); hero.vel.set(0, 0, 0); }
function sidewalkFar(c, a, b){ for (let i = 0; i < 80; i++){ const p = randomSidewalkPoint(a, c); const d = p.distanceTo(c); if (d > a && d < b) return p; } return randomSidewalkPoint(a, c); }
function penShoot(d){
  d.phase = 'fly'; d.k = 0; d.t = 0; aimRing.visible = false;
  d.tz = PEN.cz + d.aim*3.2; d.ty = .3 + d.pow*2.4; d.tx = PEN.goalX + .3;
  const zones = [PEN.cz - 2, PEN.cz, PEN.cz + 2], read = Math.random() < (DIFF.pat > 1 ? .25 : .38);
  d.kz = read ? zones.reduce((b, z) => Math.abs(z - d.tz) < Math.abs(b - d.tz) ? z : b, zones[0]) : rpick(zones);
  noise(.12, 900, .6); hero.d.punchT = .28; hero.d.punchSide = 1; buzz(20);
}
function penResult(d){
  d.phase = 'result'; d.t = 0; let goal = true, msg = 'جووووول ⚽🔥';
  if (Math.abs(d.tz - PEN.cz) > 3.05){ goal = false; msg = Math.abs(d.tz - PEN.cz) < 3.3 ? 'في القائم! 😱' : 'برا الجول 😬'; }
  else if (d.ty > 2.3){ goal = false; msg = 'فوق العارضة 😬'; }
  else if (Math.abs(d.kz - d.tz) < 1.25 && d.ty < 2){ goal = false; msg = 'الحارس مسكها 🧤'; }
  d.res.push(goal); if (goal){ d.goals++; heroCheer(); tone(523, 523, .1, 'triangle', .15); tone(784, 1046, .4, 'triangle', .15, .1); noise(.6, 1200, .25); }
  else noise(.2, 400, .4);
  banner(msg, goal ? 'ok' : 'bad', 1.4);
}
function penEnd(d){ const n = d.goals; if (n === 5) stat('penalty5'); const pay = n*10; hero.money += pay; const rec = bestOf('penalties', n) ? ' · رقم قياسي!' : ''; actEnd(`⚽ سجّلت ${n} من ٥ · +${pay} جنيه${rec}`, n >= 3 ? 'ok' : 'info'); }
function parkDone(d){
  const t = d.used, dmg = parkCar.dmg || 0, tip = Math.max(5, Math.round(40 - t*.8 - dmg*.3)); hero.money += tip; coin(); buzz(30);
  if (t < 20) stat('parkFast'); setTimeout(heroCheer, 300); say(helper, rpick(['الله ينور يا باشا 👌','ركنة محترفين!','تسلم إيدك']), 2.5);
  const rec = bestOf('park', +t.toFixed(1), true) ? ' · رقم قياسي!' : '';
  actEnd(`🅿️ ركنتها في ${t.toFixed(1)} ثانية · بقشيش ${tip} جنيه${rec}`, 'ok');
}
function kameenAsk(d){
  d.asked = true; const v = hero.veh; v.speed = 0; say(helper, 'الرخص يا أسطى 🪪', 2.5);
  const own = ownVehicle(v);
  openPanel('🚓 كمين · الرخص يا أسطى', [
    { label: '🪪 ورّي الرخص', btn: 'اتفضل يا باشا', fn: () => { closePanel(); if (own){ stat('kameenOk'); say(helper, 'تمام يا أسطى، اتفضل 👮', 2.5); actEnd('✅ ورقك سليم… اتفضل', 'ok'); } else { hero.money = Math.max(0, hero.money - 50); say(helper, 'العربية دي مش باسمك!', 2.5); actEnd('📝 العربية مش باسمك… مخالفة ٥٠ جنيه', 'bad'); } } },
    { label: '🏃 اهرب بالعربية', btn: 'دوس بنزين', fn: () => { closePanel(); kameenRun(d, 'هربت من الكمين! 🚨'); } },
  ], own ? 'العربية باسمك… مفيش مشكلة' : '⚠️ العربية دي مش باسمك');
}
function kameenRun(d, msg){ d.fleeing = true; d.asked = true; d.flee = 22; banner(`${msg} ابعد بسرعة`, 'police', 3); say(helper, 'وقف عندك!!', 2.5, 'angry'); }
// map marks and in-world prompts
function actMapMarks(t){
  const m = []; const show = modeId === 'free' || modeId === 'story';
  if (!show) return m;
  if (ACT.kind && ACTS[ACT.kind].marks) m.push(...ACTS[ACT.kind].marks());
  if (!ACT.kind){ m.push({ x: PEN.spotX, z: PEN.cz, r: 3, c: '#7be07a' }, { x: COOP.x, z: COOP.z, r: 3, c: '#e9e6de' }); if (LOT) m.push({ x: SAIS_POS.x, z: SAIS_POS.z, r: 3, c: '#5ad1ff' }); }
  return m;
}
function actionNearActivity(p){
  if (!actAvailable() || ACT.kind || hero.veh) return null;
  for (const [k, A] of Object.entries(ACTS)) if (A && A.pos && nearXZ(p, A.pos, A.r)) return { text: A.label, fn: () => actStart(k) };
  return null;
}
function updateActivities(dt, t){
  document.body.classList.toggle('in-act', !!ACT.kind && hero.locked);
  updatePigeons(dt, t); updateGarage(t);
  const showSigns = modeId === 'free' || modeId === 'story';
  footballSign.visible = coopSign.visible = showSigns; if (parkSign) parkSign.visible = showSigns;
  if (ACT.kind){ const A = ACTS[ACT.kind]; if (!actAvailable() && ACT.kind !== 'kameen' && ACT.kind !== 'parking') return actEnd(null); A.update(dt, ACT.d, t); return; }
  if (hero.veh && actAvailable() && Math.abs(hero.veh.speed) > 8 && !(modeId === 'story' && ST2.phase === 'active' && NO_KAMEEN.has(curM() && curM().id))){ kameenT -= dt; if (kameenT <= 0){ kameenT = R(40, 80); kameenSpawn(); } }
}

// ---- 19h-tawla.js ----
// ================= طاولة (backgammon) with عم رجب at قصر الملوك =================
// Standard rules as played in Egypt ("طاولة ٣١"): 15 pieces each, two dice, doubles play four times,
// a single piece (blot) can be hit and must re-enter from the bar first, you must use as much of the roll as possible
// (and the bigger die if only one can be used), bear off once all 15 are home. Match to 3; winning before the other
// side bears off a single piece (مارس) counts 2.
const TW = { pts: [], bar: [0, 0], off: [0, 0], dice: [], seqs: [], turn: 1, sel: null, score: [0, 0], target: 3, over: true, matchOver: true, busy: false, msg: '' };
const DIE_N = ['', 'يك', 'دو', 'سه', 'جهار', 'بيش', 'شيش'];
const DBL_N = ['', 'هبّاب', 'دوبارة', 'دوسة', 'دورجي', 'دبش', 'دُش'];
const rollName = (a, b) => a === b ? DBL_N[a] : `${DIE_N[Math.max(a, b)]} ${DIE_N[Math.min(a, b)]}`;
const TAWLA_SPOT = (() => { const [x, z] = TABLES[5]; return new THREE.Vector3(x, 0, z); })();
// pieces: +n = yours (moving 24 → 1), -n = عم رجب (moving 1 → 24). index 0 and 25 unused (0 = your bear-off, 25 = his)
function twNewGame(){
  TW.pts = Array(26).fill(0); TW.pts[24] = 2; TW.pts[13] = 5; TW.pts[8] = 3; TW.pts[6] = 5; TW.pts[1] = -2; TW.pts[12] = -5; TW.pts[17] = -3; TW.pts[19] = -5;
  TW.bar = [0, 0]; TW.off = [0, 0]; TW.dice = []; TW.seqs = []; TW.sel = null; TW.over = false;
}
const sideIdx = s => s === 1 ? 0 : 1;
function allHome(st, s){ if (st.bar[sideIdx(s)]) return false; for (let p = 1; p <= 24; p++){ if (st.pts[p]*s > 0 && (s === 1 ? p > 6 : p < 19)) return false; } return true; }
function canLand(st, s, p){ return st.pts[p]*s >= -1; }
function movesFor(st, s, d){
  const out = [], bi = sideIdx(s);
  if (st.bar[bi]){ const to = s === 1 ? 25 - d : d; if (canLand(st, s, to)) out.push({ from: 'bar', to, d }); return out; }
  const home = allHome(st, s);
  for (let p = 1; p <= 24; p++){
    if (st.pts[p]*s <= 0) continue;
    const to = p - d*s;
    if (to >= 1 && to <= 24){ if (canLand(st, s, to)) out.push({ from: p, to, d }); }
    else if (home){
      const exact = s === 1 ? to === 0 : to === 25;
      let higher = false; if (!exact){ for (let q = 1; q <= 24; q++) if (st.pts[q]*s > 0 && (s === 1 ? q > p : q < p) && (s === 1 ? q <= 6 : q >= 19)) higher = true; }
      if (exact || !higher) out.push({ from: p, to: s === 1 ? 0 : 25, d });
    }
  }
  return out;
}
function applyMove(st, s, m){
  const n = { pts: st.pts.slice(), bar: st.bar.slice(), off: st.off.slice() }, bi = sideIdx(s), hit = { v: false };
  if (m.from === 'bar') n.bar[bi]--; else n.pts[m.from] -= s;
  if (m.to === 0 || m.to === 25) n.off[bi]++;
  else { if (n.pts[m.to]*s === -1){ n.pts[m.to] = 0; n.bar[1 - bi]++; hit.v = true; } n.pts[m.to] += s; }
  n.hit = hit.v; return n;
}
function sequences(st, s, dice){
  const res = []; const seen = new Set();
  const rec = (state, left, seq) => {
    let any = false; const tried = new Set();
    for (let i = 0; i < left.length; i++){ const d = left[i]; if (tried.has(d)) continue; tried.add(d);
      for (const m of movesFor(state, s, d)){ any = true; const ns = applyMove(state, s, m); rec(ns, left.slice(0, i).concat(left.slice(i + 1)), seq.concat([{ ...m, hit: ns.hit }])); } }
    if (!any){ const key = seq.map(m => `${m.from}>${m.to}`).join(','); if (!seen.has(key)){ seen.add(key); res.push({ seq, end: state }); } }
  };
  rec(st, dice, []);
  const max = Math.max(0, ...res.map(r => r.seq.length));
  let keep = res.filter(r => r.seq.length === max);
  if (max === 1 && dice.length === 2 && dice[0] !== dice[1]){ const big = Math.max(...dice); if (keep.some(r => r.seq[0].d === big)) keep = keep.filter(r => r.seq[0].d === big); }
  return max ? keep : [];
}
function pipCount(st, s){ let n = st.bar[sideIdx(s)] * 25; for (let p = 1; p <= 24; p++) if (st.pts[p]*s > 0) n += st.pts[p]*s * (s === 1 ? p : 25 - p); return n; }
function evalPos(st, s){
  let v = (pipCount(st, -s) - pipCount(st, s)) * .12 + st.off[sideIdx(s)] * 3 + st.bar[sideIdx(-s)] * 7 - st.bar[sideIdx(s)] * 6;
  for (let p = 1; p <= 24; p++){ const c = st.pts[p]*s; const myHome = s === 1 ? p <= 6 : p >= 19;
    if (c >= 2) v += myHome ? 3 : 1.6;
    if (c === 1){ // a blot: how exposed is it to pieces behind it
      let danger = 0; for (let q = 1; q <= 24; q++){ if (st.pts[q]*s < 0){ const dist = s === 1 ? p - q : q - p; if (dist < 0 && -dist <= 11) danger += -dist <= 6 ? 2 : 1; } } if (st.bar[sideIdx(-s)]) danger += 2;
      v -= danger * (myHome ? 1.4 : 1); }
  }
  return v;
}
// ---------- UI ----------
const twCv = $('twCanvas'), twG = twCv.getContext('2d');
let twGeom = null;
function twLayout(){
  const W = Math.min(760, innerWidth - 52), H = Math.round(Math.min(W * .6, innerHeight - (innerHeight < 520 ? 118 : 200))), dpr = Math.min(2, devicePixelRatio || 1);
  twCv.width = W*dpr; twCv.height = H*dpr; twCv.style.width = W + 'px'; twCv.style.height = H + 'px'; twG.setTransform(dpr, 0, 0, dpr, 0, 0);
  const off = W*.08, bar = W*.06, pw = (W - off - bar - 16) / 12; twGeom = { W, H, off, bar, pw, x0: 8, r: Math.min(pw*.46, H*.045) };
}
// screen position of point p (1..24): bottom row right→left is 1..12, top row left→right is 13..24
function ptX(p){ const g = twGeom; const i = p <= 12 ? 12 - p : p - 13; return g.x0 + i*g.pw + (i >= 6 ? g.bar : 0) + g.pw/2; }
const ptTop = p => p > 12;
function drawTawla(){
  if (!twGeom) twLayout(); const g = twGeom, c = twG, { W, H } = g;
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#5a3418'; c.fillRect(0, 0, W, H); c.fillStyle = '#e8d2a8'; c.fillRect(g.x0, 8, W - g.off - 16, H - 16);
  const bx = g.x0 + 6*g.pw; c.fillStyle = '#4a2a12'; c.fillRect(bx, 0, g.bar, H);
  c.fillStyle = '#3a2210'; c.fillRect(W - g.off, 0, g.off, H);
  const legal = new Set(), dests = new Set();
  if (TW.turn === 1 && !TW.over && !TW.busy){ for (const r of TW.seqs){ const m = r.seq[0]; legal.add(String(m.from)); if (TW.sel !== null && String(m.from) === String(TW.sel)) dests.add(m.to); } }
  for (let p = 1; p <= 24; p++){
    const x = ptX(p), top = ptTop(p), y0 = top ? 8 : H - 8, y1 = top ? H*.44 : H*.56;
    c.fillStyle = p % 2 ? '#9c2f1f' : '#2f4a3a'; if (dests.has(p)) c.fillStyle = '#e0a21a';
    c.beginPath(); c.moveTo(x - g.pw/2 + 1, y0); c.lineTo(x + g.pw/2 - 1, y0); c.lineTo(x, y1); c.closePath(); c.fill();
    const n = Math.abs(TW.pts[p]); if (!n) continue; const mine = TW.pts[p] > 0;
    for (let k = 0; k < Math.min(n, 5); k++){ const y = top ? 8 + g.r + k*g.r*2 : H - 8 - g.r - k*g.r*2; twPiece(x, y, mine, String(TW.sel) === String(p) && k === Math.min(n, 5) - 1, legal.has(String(p)) && k === Math.min(n, 5) - 1); }
    if (n > 5){ const y = top ? 8 + g.r + 4*g.r*2 : H - 8 - g.r - 4*g.r*2; c.fillStyle = mine ? '#222' : '#fff'; c.font = `900 ${g.r}px Cairo, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(n, x, y + 1); }
  }
  // bar
  for (let k = 0; k < TW.bar[0]; k++) twPiece(bx + g.bar/2, H*.62 + k*g.r*1.6, true, TW.sel === 'bar', legal.has('bar'));
  for (let k = 0; k < TW.bar[1]; k++) twPiece(bx + g.bar/2, H*.38 - k*g.r*1.6, false);
  // borne off
  c.fillStyle = dests.has(0) ? '#e0a21a' : '#2a1a0c'; c.fillRect(W - g.off + 4, H*.52, g.off - 8, H*.46);
  c.fillStyle = '#2a1a0c'; c.fillRect(W - g.off + 4, 8, g.off - 8, H*.4);
  for (let k = 0; k < TW.off[0]; k++){ c.fillStyle = '#f4efe2'; c.fillRect(W - g.off + 8, H - 12 - k*(H*.42/15), g.off - 16, H*.42/15 - 1); }
  for (let k = 0; k < TW.off[1]; k++){ c.fillStyle = '#1b1b1b'; c.fillRect(W - g.off + 8, 10 + k*(H*.38/15), g.off - 16, H*.38/15 - 1); }
  c.fillStyle = '#ffe9b0'; c.font = `800 ${Math.max(10, g.off*.2)}px Cairo, sans-serif`; c.textAlign = 'center'; c.fillText('برا', W - g.off/2, H*.5);
  // dice
  const dx = TW.turn === 1 ? g.x0 + 9*g.pw + g.bar : g.x0 + 3*g.pw, ds = Math.min(g.pw*.8, 34);
  TW.dice.forEach((d, i) => twDie(dx - ds*.7 + i*ds*1.4 - (TW.dice.length > 2 ? ds*1.4 : 0), H/2, ds, d, TW.turn === 1 ? '#fff' : '#222'));
}
function twPiece(x, y, mine, sel, can){
  const c = twG, r = twGeom.r, gr = c.createRadialGradient(x - r*.35, y - r*.35, r*.1, x, y, r);
  gr.addColorStop(0, mine ? '#ffffff' : '#555'); gr.addColorStop(1, mine ? '#cfc5ae' : '#111'); c.fillStyle = gr;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fill(); c.lineWidth = sel ? 4 : can ? 2.5 : 1.2; c.strokeStyle = sel ? '#e0a21a' : can ? '#3cc870' : 'rgba(0,0,0,.5)'; c.stroke();
}
function twDie(x, y, s, n, col){
  const c = twG; c.fillStyle = col; c.strokeStyle = '#000'; c.lineWidth = 1.5; c.beginPath(); c.roundRect(x - s/2, y - s/2, s, s, s*.18); c.fill(); c.stroke();
  c.fillStyle = col === '#fff' ? '#111' : '#fff'; const P = { 1: [[0,0]], 2: [[-1,-1],[1,1]], 3: [[-1,-1],[0,0],[1,1]], 4: [[-1,-1],[1,-1],[-1,1],[1,1]], 5: [[-1,-1],[1,-1],[0,0],[-1,1],[1,1]], 6: [[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]] }[n] || [];
  for (const [a, b] of P){ c.beginPath(); c.arc(x + a*s*.25, y + b*s*.25, s*.08, 0, Math.PI*2); c.fill(); }
}
function twHit(px, py){
  const g = twGeom; if (px > g.W - g.off) return py > g.H*.5 ? 0 : null;
  const bx = g.x0 + 6*g.pw; if (px >= bx && px <= bx + g.bar) return 'bar';
  let i = Math.floor((px - g.x0 - (px > bx + g.bar ? g.bar : 0)) / g.pw); i = clamp(i, 0, 11);
  return py < g.H/2 ? 13 + i : 12 - i;
}
twCv.addEventListener('pointerdown', e => {
  if (TW.turn !== 1 || TW.over || TW.busy || !TW.seqs.length) return;
  const r = twCv.getBoundingClientRect(), hit = twHit(e.clientX - r.left, e.clientY - r.top); if (hit === null) return;
  if (TW.sel !== null){ const m = TW.seqs.map(s => s.seq[0]).find(m => String(m.from) === String(TW.sel) && m.to === hit); if (m){ twPlayerMove(m); return; } }
  const can = TW.seqs.some(s => String(s.seq[0].from) === String(hit)); TW.sel = can ? hit : null; if (!can && TW.bar[0]) twMsg('لازم تدخّل الحجر اللي على البار الأول'); drawTawla();
});
function twMsg(t){ $('twMsg').textContent = t; }
function twState(){ return { pts: TW.pts, bar: TW.bar, off: TW.off }; }
function twSet(st){ TW.pts = st.pts; TW.bar = st.bar; TW.off = st.off; }
function twRoll(){
  if (TW.over || TW.busy || TW.dice.length) return;
  const a = 1 + Math.floor(Math.random()*6), b = 1 + Math.floor(Math.random()*6); TW.dice = a === b ? [a, a, a, a] : [a, b];
  noise(.15, 3000, .4); tone(300, 200, .05, 'square', .06, .08);
  TW.seqs = sequences(twState(), TW.turn, TW.dice);
  const who = TW.turn === 1 ? heroName : 'عم رجب'; const nm = rollName(a, b);
  if (!TW.seqs.length){ twMsg(`${who}: ${nm}… مفيش لعب`); drawTawla(); TW.busy = true; setTimeout(() => { TW.busy = false; twEndTurn(); }, 1300); return; }
  twMsg(TW.turn === 1 ? `🎲 ${nm}! اختار حجر وحرّكه (الحجارة اللي ليها لعب عليها دايرة خضرا)` : `عم رجب: «${nm}!»`); if (Math.random() < .5) speak(nm);
  drawTawla(); twButtons();
  if (TW.turn === -1) twAi();
}
function twPlayerMove(m){
  const st = applyMove(twState(), 1, m); twSet(st); tone(500, 380, .05, 'triangle', .12);
  if (m.hit){ twMsg('ضربت حجر عم رجب! 💥'); thwack(); }
  TW.seqs = TW.seqs.filter(s => String(s.seq[0].from) === String(m.from) && s.seq[0].to === m.to).map(s => ({ seq: s.seq.slice(1), end: s.end })).filter(s => s.seq.length);
  TW.dice.splice(TW.dice.indexOf(m.d), 1); TW.sel = null;
  if (TW.off[0] >= 15) return twWin(1);
  if (!TW.seqs.length){ drawTawla(); TW.busy = true; setTimeout(() => { TW.busy = false; twEndTurn(); }, 500); return; }
  drawTawla();
}
function twAi(){
  let best = null, bv = -1e9; for (const r of TW.seqs){ const v = evalPos(r.end, -1) + Math.random()*.6; if (v > bv){ bv = v; best = r; } }
  const seq = best.seq.slice(); TW.busy = true;
  const step = () => { if (TW.over) return; const m = seq.shift(); if (!m){ TW.busy = false; if (TW.off[1] >= 15) return twWin(-1); return twEndTurn(); }
    twSet(applyMove(twState(), -1, m)); TW.dice.splice(TW.dice.indexOf(m.d), 1); tone(420, 300, .05, 'triangle', .1);
    if (m.hit){ twMsg('عم رجب ضرب حجرك! «معلش يا ابني» 😏'); thwack(); }
    drawTawla(); if (TW.off[1] >= 15){ TW.busy = false; return twWin(-1); } setTimeout(step, 620); };
  setTimeout(step, 900);
}
function twEndTurn(){ TW.dice = []; TW.seqs = []; TW.sel = null; TW.turn = -TW.turn; drawTawla(); twButtons(); if (TW.turn === -1){ twMsg('دور عم رجب…'); setTimeout(twRoll, 700); } else twMsg('دورك… ارمي الزهر 🎲'); }
function twWin(s){
  TW.over = true; const loserOff = TW.off[sideIdx(-s)], pts = loserOff === 0 ? 2 : 1; TW.score[sideIdx(s)] += pts;
  const mars = pts === 2 ? ' (مارس! نقطتين)' : '';
  if (TW.score[0] >= TW.target || TW.score[1] >= TW.target){ TW.matchOver = true; const w = TW.score[0] > TW.score[1];
    let bet = ''; if (modeObj.onDomino && modeId === 'story'){ const b = Math.min(modeObj.domBet || 20, Math.max(0, Math.floor(hero.money))); hero.money += w ? b : -b; bet = w ? ` · +${b} جنيه` : ` · -${b} جنيه`; saveStory(); }
    if (w){ stat('tawlaWin'); coin(); }
    twMsg(`${w ? '🏆 كسبت العشرة' : '😅 عم رجب كسب العشرة'} ${TW.score[0]}–${TW.score[1]}${mars}${bet}`); speak(w ? 'ماشي يا ابني… إيدك خفيفة' : 'اتعلم يا ابني');
  } else twMsg(`${s === 1 ? '🎉 كسبت الدور' : 'عم رجب كسب الدور'}${mars} · ${TW.score[0]}–${TW.score[1]}`);
  drawTawla(); twButtons();
}
function twButtons(){
  $('twRoll').hidden = !(TW.turn === 1 && !TW.over && !TW.dice.length);
  $('twAgain').hidden = !TW.over; $('twAgain').textContent = TW.matchOver ? 'عشرة جديدة' : 'دور جديد';
  $('twScore').textContent = `${heroName} ${TW.score[0]} · عم رجب ${TW.score[1]} (لـ ٣)`;
}
function openTawla(){
  hero.locked = true; $('tawla').hidden = false; document.body.classList.add('in-domino');
  if (TW.matchOver){ TW.score = [0, 0]; TW.matchOver = false; twStartGame(); } else { twLayout(); drawTawla(); twButtons(); }
}
function twStartGame(){
  twNewGame(); twLayout();
  // opening roll: each rolls one die, the higher starts
  let a, b; do { a = 1 + Math.floor(Math.random()*6); b = 1 + Math.floor(Math.random()*6); } while (a === b);
  TW.turn = a > b ? 1 : -1; twMsg(`${heroName} رمى ${DIE_N[a]} وعم رجب ${DIE_N[b]}… ${TW.turn === 1 ? 'انت تبدأ!' : 'عم رجب يبدأ'}`);
  drawTawla(); twButtons(); if (TW.turn === -1) setTimeout(twRoll, 1200);
}
function closeTawla(){ $('tawla').hidden = true; hero.locked = false; document.body.classList.remove('in-domino'); }
$('twRoll').onclick = twRoll; $('twExit').onclick = closeTawla;
$('twAgain').onclick = () => { if (TW.matchOver){ TW.score = [0, 0]; TW.matchOver = false; } twStartGame(); };
addEventListener('resize', () => { if (!$('tawla').hidden){ twLayout(); drawTawla(); } });
// the board on a café table
{ const p = []; box(p, .9, .06, .6, TAWLA_SPOT.x, 1.0, TAWLA_SPOT.z, '#7a4a22'); box(p, .86, .02, .56, TAWLA_SPOT.x, 1.035, TAWLA_SPOT.z, '#e8d2a8'); box(p, .04, .03, .6, TAWLA_SPOT.x, 1.04, TAWLA_SPOT.z, '#4a2a12');
  for (let i = 0; i < 6; i++){ box(p, .06, .025, .06, TAWLA_SPOT.x - .35 + i*.05, 1.05, TAWLA_SPOT.z - .2, '#f4efe2'); box(p, .06, .025, .06, TAWLA_SPOT.x + .1 + i*.05, 1.05, TAWLA_SPOT.z + .2, '#1b1b1b'); }
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 })); scene.add(m); }

// ---- 19i-garage.js ----
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
  if (s.gold && v.type !== 'moto' && !v.goldHubs){ v.goldHubs = new THREE.Mesh(carGeo.hubs, goldHub); v.goldHubs.scale.set(1.02, 1.02, 1.02); v.goldHubs.position.y = -.007; v.goldHubs.userData.keep = true; v.mesh.add(v.goldHubs); }
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

// ---- 19j-life.js ----
// ================= life in the streets: lit windows, stars and moon, cats, gestures, cheering, Ramadan night =================
// ---- lit windows at night (same 4×4 window grid as the facade textures) ----
const litTex = makeTex(512, 512, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let fy = 0; fy < 4; fy++) for (let bx = 0; bx < 4; bx++){ if (Math.random() > .38) continue; const x = bx*128 + 30, y = fy*128 + 26; const gr = g.createLinearGradient(x, y, x, y + 80); gr.addColorStop(0, Math.random() < .3 ? '#cfe3ff' : '#ffd79a'); gr.addColorStop(1, '#a8682a'); g.fillStyle = gr; g.fillRect(x, y, 68, 80); } });
const litMats = [];
for (const b of buildings) for (const m of b.mats) if (facadeTex.includes(m.map)){ m.emissiveMap = litTex; m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = 0; m.needsUpdate = true; litMats.push(m); }
// ---- stars and moon ----
const stars = (() => { const n = 700, pos = new Float32Array(n*3); for (let i = 0; i < n; i++){ const a = Math.random()*Math.PI*2, e = Math.acos(1 - Math.random()*.9); pos[i*3] = Math.sin(e)*Math.cos(a)*700; pos[i*3+1] = Math.cos(e)*700; pos[i*3+2] = Math.sin(e)*Math.sin(a)*700; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); p.frustumCulled = false; scene.add(p); return p; })();
const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeTex(128, 128, g => { const gr = g.createRadialGradient(64, 64, 20, 64, 64, 64); gr.addColorStop(0, 'rgba(255,250,230,1)'); gr.addColorStop(.45, 'rgba(255,250,230,1)'); gr.addColorStop(.5, 'rgba(255,240,200,.35)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(200,190,170,.35)'; for (const [x, y, r] of [[52, 50, 8], [74, 70, 6], [58, 78, 5]]){ g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }), transparent: true, opacity: 0, fog: false, depthWrite: false }));
moon.scale.setScalar(60); scene.add(moon);
let lifeNight = -1;
function nightVisuals(){
  const n = nightAmount(TOD.h); if (Math.abs(n - lifeNight) < .01) return; lifeNight = n;
  for (const m of litMats) m.emissiveIntensity = n * 1.05;
  // dim the image-based (reflection) light at night, otherwise the city stays lit like daytime
  const env = 1 - n*.78; scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : null; if (!ms) return; for (const m of ms){ if (m.envMapIntensity === undefined) continue; if (m.userData.env0 === undefined) m.userData.env0 = m.envMapIntensity; m.envMapIntensity = m.userData.env0 * env; } });
  stars.material.opacity = Math.max(0, n - .25) * 1.2; moon.material.opacity = n;
}
// ---- street cats ----
const catMat = [0x2b2b2b, 0xd98c3a, 0xeeeeee, 0x7a6a5a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .8 }));
const cats = [];
{ const body = new THREE.BoxGeometry(.2, .2, .5), head = new THREE.BoxGeometry(.18, .17, .17), leg = new THREE.BoxGeometry(.06, .2, .06), tail = new THREE.BoxGeometry(.04, .04, .35), ear = new THREE.ConeGeometry(.04, .08, 4);
  const hara = blocksInfo.filter(b => b.dist === 'hara' || b.dist === 'market' || b.dist === 'food');
  for (let i = 0; i < 9; i++){ const g = new THREE.Group(), m = catMat[i % 4];
    const b = new THREE.Mesh(body, m); b.position.y = .3; g.add(b); const h = new THREE.Mesh(head, m); h.position.set(0, .42, .3); g.add(h);
    for (const s of [-1, 1]){ const e = new THREE.Mesh(ear, m); e.position.set(s*.06, .53, .3); g.add(e); }
    const legs = [[-.07, .18], [.07, .18], [-.07, -.18], [.07, -.18]].map(([x, z]) => { const l = new THREE.Mesh(leg, m); l.position.set(x, .1, z); g.add(l); return l; });
    const t = new THREE.Mesh(tail, m); t.position.set(0, .45, -.38); t.rotation.x = .7; g.add(t);
    scene.add(g); const blk = pick(hara);
    cats.push({ g, legs, tail: t, b: blk, t: R(0, 4), dir: rng() < .5 ? 1 : -1, sp: R(.5, 1), run: 0, sit: R(2, 8), ph: R(0, 6) }); } }
function updateCats(dt, t){
  const f = hero.pos;
  for (const c of cats){
    const p = c.g.position, d = Math.hypot(p.x - f.x, p.z - f.z);
    if (d > 120){ c.g.visible = false; continue; } c.g.visible = !HOUSE.inside;
    if (d < 3.2 && !hero.veh && c.run <= 0){ c.run = 2.2; c.dir = -c.dir; if (Math.random() < .6) tone(900, 600, .18, 'sawtooth', .025); }
    let sp = 0;
    if (c.run > 0){ c.run -= dt; sp = 4.2; }
    else if (c.sit > 0){ c.sit -= dt; if (c.sit <= 0) c.walk = R(3, 9); }
    else { sp = c.sp; c.walk -= dt; if (c.walk <= 0) c.sit = R(3, 10); }
    if (sp){ const r = 15.6, old = perimPos({ cx: c.b.cx, cz: c.b.cz }, c.t); c.t += c.dir * sp * dt / 31.2; const q = perimPos({ cx: c.b.cx, cz: c.b.cz }, c.t); const k = (16.6 - r); p.set(q[0] + Math.sign(c.b.cx - q[0])*k*0, .15, q[1]); c.g.rotation.y = Math.atan2(q[0] - old[0], q[1] - old[1]); }
    const s = Math.sin(t*sp*5 + c.ph)*(sp ? .5 : 0); c.legs[0].rotation.x = c.legs[3].rotation.x = s; c.legs[1].rotation.x = c.legs[2].rotation.x = -s;
    c.tail.rotation.z = Math.sin(t*2 + c.ph)*.4; c.g.position.y = .15 + (c.sit > 0 ? -.06 : 0);
  }
}
// ---- hero cheering (arms up and a hop) ----
function heroCheer(){ hero.cheerT = 1.3; }
function cheerPose(dt){ if (!(hero.cheerT > 0) || hero.veh) return; hero.cheerT -= dt; if (hero.d.is3D){ hero.d.forceMove = 'cheer'; return; } const d = hero.d, k = Math.min(1, hero.cheerT*3), hop = Math.abs(Math.sin(hero.cheerT*8))*.25*k; d.P.armL.rotation.z = -2.6*k; d.P.armR.rotation.z = 2.6*k; d.doll.position.y += hop; }
// ---- Ramadan night (فوانيس، زينة، مسحراتي) ----
PROG.ramadan = !!PROG.ramadan;
const ramadan = new THREE.Group(); ramadan.visible = false; scene.add(ramadan);
const lanternGeo = (() => { const p = []; const body = new THREE.CylinderGeometry(.22, .17, .5, 8); body.translate(0, 0, 0); p.push(body); const top = new THREE.ConeGeometry(.24, .28, 8); top.translate(0, .39, 0); p.push(top); const bot = new THREE.ConeGeometry(.17, .14, 8); bot.rotateX(Math.PI); bot.translate(0, -.32, 0); p.push(bot); const ring = new THREE.TorusGeometry(.06, .015, 6, 10); ring.translate(0, .58, 0); p.push(ring); return mergeGeometries(p); })();
const RAM_STRINGS = [];
{ // bulb strings and lanterns zig-zag across the streets around قصر الملوك
  const bulbs = [], lanterns = [];
  const addRun = (ax, az, bx, bz, side) => { const n = 7; for (let i = 0; i < n; i++){ const t0 = i/n, t1 = (i + 1)/n; const p0 = [ax + (bx - ax)*t0, az + (bz - az)*t0], p1 = [ax + (bx - ax)*t1, az + (bz - az)*t1];
      const a = new THREE.Vector3(p0[0] + side[0]*(i % 2 ? 6.5 : -6.5), 5.4, p0[1] + side[1]*(i % 2 ? 6.5 : -6.5)), b = new THREE.Vector3(p1[0] + side[0]*(i % 2 ? -6.5 : 6.5), 5.4, p1[1] + side[1]*(i % 2 ? -6.5 : 6.5));
      RAM_STRINGS.push(a, b); for (let k = 1; k < 9; k++){ const q = a.clone().lerp(b, k/9); q.y -= Math.sin(k/9*Math.PI)*.8; bulbs.push(q); } const mid = a.clone().lerp(b, .5); mid.y -= 1.3; lanterns.push(mid); } };
  addRun(-40, 48, 90, 48, [0, 1]); addRun(48, -40, 48, 96, [1, 0]); addRun(0, 0, 0, 96, [1, 0]); addRun(-40, 0, 90, 0, [0, 1]);
  const lg = new THREE.BufferGeometry().setFromPoints(RAM_STRINGS); ramadan.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x222222 })));
  const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), bulbs.length);
  const c = new THREE.Color(); bulbs.forEach((q, i) => { _m.makeTranslation(q.x, q.y, q.z); bm.setMatrixAt(i, _m); c.setHSL([.08, .14, .0, .55, .33][i % 5], 1, .55); bm.setColorAt(i, c); }); ramadan.add(bm);
  const lm = new THREE.InstancedMesh(lanternGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), lanterns.length);
  lanterns.forEach((q, i) => { _m.makeScale(1.7, 1.7, 1.7).setPosition(q.x, q.y, q.z); lm.setMatrixAt(i, _m); c.setHSL([.02, .1, .6, .33][i % 4], .95, .5); lm.setColorAt(i, c); }); ramadan.add(lm);
  // a big lantern and a crescent over the café
  const big = new THREE.Mesh(lanternGeo, new THREE.MeshStandardMaterial({ color: 0xffc94a, emissive: 0xff9a2a, emissiveIntensity: 1.6, metalness: .4, roughness: .35 })); big.scale.setScalar(3.2); big.position.set(21, 7.2, 38.6); ramadan.add(big);
  const cres = new THREE.Mesh(new THREE.TorusGeometry(1.1, .18, 8, 30, Math.PI*1.3), new THREE.MeshStandardMaterial({ color: 0xfff1b0, emissive: 0xffe28a, emissiveIntensity: 1.6 })); cres.position.set(28, 8.6, 38.6); cres.rotation.z = -.9; ramadan.add(cres);
}
const mesa = makeNPC(); mesa.name = 'المسحراتي';
{ const drum = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .16, 14), new THREE.MeshStandardMaterial({ color: 0xc69a5a, roughness: .7 })); drum.rotation.x = Math.PI/2; drum.position.set(-.28, 1.05, .2); mesa.body.add(drum); }
const MESA_LINES = ['اصحى يا نايم… وحّد الدايم 🥁', 'سحور يا عباد الله 🌙', `قوم يا ${'طيارة'}… السحور!`, 'رمضان كريم يا حتة 🏮'];
function ramadanOn(){ return PROG.ramadan && (modeId === 'free' || modeId === 'story' || modeId === 'domino') && (modeId !== 'story' || isNight()); }
function updateRamadan(dt, t){
  const on = ramadanOn(); ramadan.visible = on && !HOUSE.inside;
  if (!on){ if (mesa.role === 'mesa'){ mesa.state = 'hidden'; mesa.g.visible = false; mesa.role = null; } return; }
  if (mesa.role !== 'mesa'){ setWalker(mesa); mesa.role = 'mesa'; mesa.block = blocksInfo.findIndex(b => b.type === 'cafe'); mesa.speed = .9; mesa.beat = 0; mesa.lineT = 3; }
  const d = mesa.g.position.distanceTo(hero.pos);
  mesa.beat -= dt; if (mesa.beat <= 0){ mesa.beat = .45; if (d < 32 && !muted) noise(.09, 160, clamp(.5 - d*.014, .05, .5)); mesa.arms[0].rotation.x = -1.4; setTimeout(() => { mesa.arms[0].rotation.x = -.4; }, 120); }
  mesa.lineT -= dt; if (mesa.lineT <= 0 && d < 30){ mesa.lineT = R(7, 11); say(mesa, rpick(MESA_LINES).replace('طيارة', heroName), 3); }
  RAM.time += dt; if (RAM.time > 20 && !RAM.counted){ RAM.counted = true; stat('ramadan'); }
}
const RAM = { time: 0, counted: false };
function renderRamadanBtn(){ const b = $('ramBtn'); if (b){ b.textContent = PROG.ramadan ? '🌙 ليلة رمضان: شغالة' : '🌙 ليلة رمضان: مقفولة'; b.classList.toggle('on', PROG.ramadan); } }
$('ramBtn').onclick = () => { PROG.ramadan = !PROG.ramadan; saveProg(); renderRamadanBtn(); };
renderRamadanBtn();
// ---- per frame ----
let lifeT = 0;
function updateLife(dt, t){
  lifeT -= dt; if (lifeT <= 0){ lifeT = .5; nightVisuals(); }
  stars.position.copy(camera.position); moon.position.set(camera.position.x - 380, camera.position.y + 330, camera.position.z - 420);
  updateCats(dt, t); updateRamadan(dt, t);
}

// ---- 19k-voices.js ----
// ================= recorded voices for the story dialogue =================
// Each line has an id (a hash of its text). A line plays a real recording when one exists:
// 1) recorded on this device with record.html (kept in IndexedDB), or 2) shipped in assets/voices (listed in index.json by build.py).
// Otherwise the game falls back to the computer voice.
const VOICE = { files: {}, db: null, cur: null, local: new Set() };
function vHash(t){ let h = 0x811c9dc5; for (const ch of t){ h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }
fetch('assets/voices/index.json').then(r => r.ok ? r.json() : {}).then(j => { VOICE.files = j || {}; }).catch(() => {});
function vDb(){ return new Promise((res, rej) => { const rq = indexedDB.open('tayara-voices', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('lines'); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); }); }
function vRefreshLocal(){ if (!window.indexedDB) return; vDb().then(db => { VOICE.db = db; const rq = db.transaction('lines').objectStore('lines').getAllKeys(); rq.onsuccess = () => { VOICE.local = new Set(rq.result); }; }).catch(() => {}); }
vRefreshLocal(); addEventListener('focus', vRefreshLocal);
function stopVoice(){ if (VOICE.cur){ try { VOICE.cur.pause(); } catch(e){} VOICE.cur = null; } }
function startAudio(src, revoke){ const a = new Audio(src); VOICE.cur = a; a.play().catch(() => {}); a.onended = () => { if (revoke) URL.revokeObjectURL(src); }; return a; }
function playVoice(text){
  stopVoice(); const id = vHash(text);
  if (VOICE.db && VOICE.local.has(id)){ const rq = VOICE.db.transaction('lines').objectStore('lines').get(id); rq.onsuccess = () => { const v = rq.result; if (v && v.blob) startAudio(URL.createObjectURL(v.blob), true); }; VOICE.cur = { paused: false, duration: 3, currentTime: 0, pause(){} }; return true; }
  const f = VOICE.files[id]; if (f){ startAudio('assets/voices/' + f); return true; }
  return false;
}
function voiceLeft(){ const a = VOICE.cur; if (!a || a.paused) return 0; const d = a.duration; return isFinite(d) ? Math.max(0, d - a.currentTime) : 1.5; }

// ---- 19l-intro.js ----
// ================= intro: the film (Google Flow) with name tags, else character cards and the poster =================
// Plays once on the first visit (after a tap, so the sound can start) and again from the menu. The same layout draws the poster images.
const POSTER_CAST = [
  { k: 'youssef', name: 'يوسف إبراهيم', line: 'حرامي الساندوتشات… ممنوع دخوله في أي حتة', color: '#f4a300', from: 1 },
  { k: 'arabi', name: 'العربي', line: 'كان عايز الشغلانة… وعايز طيارة يختفي', color: '#e0457b', from: -1 },
  { k: 'islam', name: 'إسلام', line: 'الصاحب الجدع… وعريس الحتة', color: '#12a39a', from: 1 },
  { k: 'shams', name: 'شمس', line: 'المطلوب رقم ١… كان أشطر ميكانيكي في المنطقة', color: '#c62828', from: -1 },
  { k: 'tayara', name: 'طيارة', line: 'صبي قهوجي مفلس… وهيبقى الجامد', color: '#ffc94a', from: 1 },
];
// where each one stands in the poster: x = centre, b = feet line, h = height (fractions of the frame)
// a clean line-up on one ground line: طيارة in front in the middle, شمس darker at the edge, the café sign left visible
const POSTER_LAYOUT = {
  wide: { youssef: { x: .085, b: .97, h: .47, z: 4 }, arabi: { x: .275, b: .95, h: .64, z: 2 }, tayara: { x: .5, b: .98, h: .74, z: 3 }, islam: { x: .725, b: .95, h: .64, z: 2 }, shams: { x: .905, b: .94, h: .7, dim: .78, z: 1 }, title: { x: .5, y: .105, s: .1 }, fx: .5 },
  // the menu keeps the right side free for the buttons (wide) or the bottom (tall)
  menuWide: { youssef: { x: .06, b: .99, h: .42, z: 4 }, arabi: { x: .17, b: .96, h: .58, z: 2 }, tayara: { x: .32, b: .99, h: .72, z: 3 }, islam: { x: .47, b: .96, h: .58, z: 2 }, shams: { x: .4, b: .86, h: .6, dim: .6, z: 0 }, fx: .4 },
  menuTall: { arabi: { x: .2, b: .44, h: .19, z: 1 }, shams: { x: .8, b: .44, h: .2, dim: .7, z: 1 }, islam: { x: .82, b: .52, h: .22, z: 2 }, tayara: { x: .52, b: .53, h: .3, z: 3 }, youssef: { x: .16, b: .54, h: .15, z: 4 }, fx: .29 },
  tall: { arabi: { x: .2, b: .8, h: .3, z: 1 }, shams: { x: .8, b: .8, h: .32, dim: .78, z: 1 }, islam: { x: .82, b: .985, h: .34, z: 2 }, tayara: { x: .52, b: .99, h: .48, z: 3 }, youssef: { x: .17, b: .995, h: .22, z: 4 }, title: { x: .5, y: .075, s: .072 }, fx: .29 },
};
const POSTER_FILE = { shams: 'shams-solo' };
const posterImg = k => `assets/poster/${k}.webp`;
const posterPart = k => posterImg(POSTER_FILE[k] || k);
const INTRO = { timers: [], playing: false };
const iAt = (ms, fn) => INTRO.timers.push(setTimeout(fn, ms));
function whoosh(){ if (AC && !muted) noise(.35, 1200, .35); }
function introLayout(){
  const el = $('iFinal'), wide = innerWidth / innerHeight >= 1.05, L = POSTER_LAYOUT[wide ? 'wide' : 'tall'];
  for (const c of POSTER_CAST){ const p = L[c.k], img = el.querySelector(`[data-k="${c.k}"]`); Object.assign(img.style, { left: `${p.x*100}%`, top: `${(p.b - p.h)*100}%`, height: `${p.h*100}%`, zIndex: p.z, filter: p.dim ? `brightness(${p.dim}) saturate(.9)` : '' }); }
  const t = $('iTitle'); Object.assign(t.style, { left: `${L.title.x*100}%`, top: `${L.title.y*100}%`, fontSize: `${(wide ? innerHeight : innerWidth) * L.title.s * (wide ? 1 : 1.9)}px` });
  document.querySelector('#intro .ibg').style.backgroundPosition = `${L.fx*100}% center`;
}
// the film: who appears when (seconds into assets/intro/intro.mp4)
const INTRO_TAGS = [
  { t: 9.0, end: 13.2, name: 'طيارة', line: 'صبي القهوة… وهيبقى الجامد', color: '#ffc94a' },
  { t: 16.4, end: 20.6, name: 'العربي', line: 'ابن الحاج العربي الكبير… والفلوس عنده مش مشكلة', color: '#e0457b' },
  { t: 24.6, end: 28.8, name: 'إسلام', line: 'الصاحب الجدع… وعريس الحتة', color: '#12a39a' },
  { t: 31.2, end: 35.6, name: 'يوسف إبراهيم', line: 'بيدوّر على شغل… ولقى حاجة تانية', color: '#f4a300' },
  { t: 39.4, end: 43.6, name: 'شمس', line: 'محدش شاف وشه… غير اللي ندم', color: '#c62828' },
];
const INTRO_TITLE_AT = 46;
function playIntroSeq(){
  if (INTRO.playing) return;
  const v = $('iVideo');
  if (!v || INTRO.noVideo || !v.canPlayType('video/mp4')) return playPosterIntro();
  INTRO.playing = true; INTRO.timers.forEach(clearTimeout); INTRO.timers = []; initAudio();
  const box = $('intro'); box.hidden = false; box.className = 'intro on video'; $('iFinal').className = 'ifinal'; $('iTitle').classList.remove('slam'); $('iTap').classList.remove('show');
  const tag = $('iTag'); tag.className = 'iname'; let shown = -1, titled = false;
  if (!v.src) v.src = 'assets/intro/intro.mp4';
  v.muted = muted; v.currentTime = 0;
  v.onerror = () => { INTRO.noVideo = true; INTRO.playing = false; playPosterIntro(); };
  const tick = () => {
    if (!INTRO.playing || box.hidden) return;
    const t = v.currentTime, k = INTRO_TAGS.findIndex(c => t >= c.t && t < c.end);
    if (k !== shown){
      if (k >= 0){ const c = INTRO_TAGS[k]; tag.style.setProperty('--c', c.color); tag.querySelector('b').textContent = c.name; tag.querySelector('span').textContent = c.line; tag.className = 'iname'; void tag.offsetWidth; tag.className = 'iname show'; }
      else if (shown >= 0) tag.className = 'iname hide';
      shown = k;
    }
    if (!titled && t >= INTRO_TITLE_AT){ titled = true; introLayout(); box.classList.add('final'); $('iFinal').className = 'ifinal in'; setTimeout(() => $('iTitle').classList.add('slam'), 60); }
    requestAnimationFrame(tick);
  };
  v.onended = () => { $('iTap').classList.add('show'); INTRO.ready = true; };
  const p = v.play(); if (p && p.catch) p.catch(() => { v.muted = true; v.play().catch(() => { INTRO.playing = false; playPosterIntro(); }); });
  requestAnimationFrame(tick);
}
// the older intro (illustrated character cards, then the poster): used when the film can't play
function playPosterIntro(){
  if (INTRO.playing) return; INTRO.playing = true; INTRO.timers.forEach(clearTimeout); INTRO.timers = [];
  initAudio(); const box = $('intro'); box.hidden = false; box.className = 'intro on'; $('iCard').className = 'icard'; $('iFinal').className = 'ifinal'; $('iTap').classList.remove('show');
  const card = $('iCard'); let t = 900;
  iAt(200, () => { box.classList.add('bgin'); $('iKicker').classList.add('show'); });
  iAt(t + 1400, () => $('iKicker').classList.remove('show')); t += 2000;
  for (const c of POSTER_CAST){
    iAt(t, () => { card.className = 'icard'; void card.offsetWidth; card.style.setProperty('--c', c.color); card.style.setProperty('--from', c.from); $('iImg').src = posterImg(c.k); $('iName').textContent = c.name; $('iLine').textContent = c.line; card.className = 'icard in'; whoosh(); });
    iAt(t + 2350, () => { card.classList.add('out'); });
    t += 2700;
  }
  iAt(t, () => { card.className = 'icard'; introLayout(); box.classList.add('final'); $('iFinal').className = 'ifinal in'; whoosh(); });
  iAt(t + 1500, () => { $('iTitle').classList.add('slam'); if (AC && !muted){ noise(.5, 400, .6); tone(110, 55, .5, 'sawtooth', .12); } shake = .3; });
  iAt(t + 2600, () => { $('iTap').classList.add('show'); INTRO.ready = true; });
}
function endIntro(){ const v = $('iVideo'); if (v){ v.pause(); } INTRO.timers.forEach(clearTimeout); INTRO.timers = []; INTRO.playing = false; INTRO.ready = false; $('intro').hidden = true; $('intro').className = 'intro'; store.set('ty_intro', '1'); }
$('introSkip').onclick = e => { e.stopPropagation(); endIntro(); };
$('intro').addEventListener('pointerdown', e => { if (INTRO.ready && !e.target.closest('button')) endIntro(); });
$('iSave').onclick = async e => { e.stopPropagation(); const wide = innerWidth >= innerHeight; const cv = await makePosterImage(wide ? 1920 : 1080, wide ? 1080 : 1920); const a = document.createElement('a'); a.href = cv.toDataURL('image/jpeg', .92); a.download = `tayara-poster-${wide ? 'wide' : 'tall'}.jpg`; document.body.appendChild(a); a.click(); a.remove(); };
addEventListener('resize', () => { if (!$('intro').hidden) introLayout(); });
// first visit: a tap to start (browsers only allow sound after a tap), then the intro
function introOnLoad(){
  if (store.get('ty_intro') === '1') return;
  $('introStart').hidden = false;
}
$('introStartBtn').onclick = () => { $('introStart').hidden = true; playIntroSeq(); };
$('introStartSkip').onclick = () => { $('introStart').hidden = true; store.set('ty_intro', '1'); };
// ---- the poster as an image (same layout, drawn on a canvas) ----
const posterCache = {};
const loadImg = src => posterCache[src] ||= new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
async function makePosterImage(W, H, kind){
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  try { await document.fonts.load('900 100px Cairo'); await document.fonts.load('700 40px Cairo'); } catch(e){}
  const L = POSTER_LAYOUT[kind || (W / H >= 1.05 ? 'wide' : 'tall')];
  const bg = await loadImg(posterImg('bg')); const s = Math.max(W / bg.width, H / bg.height), bw = bg.width*s, bx = clamp(W/2 - L.fx*bw, W - bw, 0);
  g.save(); g.filter = `blur(${Math.round(W/900)}px) brightness(.8) saturate(1.05)`; g.drawImage(bg, bx, (H - bg.height*s)/2, bw, bg.height*s); g.restore();
  const top = g.createLinearGradient(0, 0, 0, H*.3); top.addColorStop(0, 'rgba(8,5,3,.7)'); top.addColorStop(1, 'rgba(8,5,3,0)'); g.fillStyle = top; g.fillRect(0, 0, W, H*.3);
  const vg = g.createLinearGradient(0, H*.6, 0, H); vg.addColorStop(0, 'rgba(8,5,3,0)'); vg.addColorStop(1, 'rgba(8,5,3,.8)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(W/2, H*.55, Math.min(W, H)*.3, W/2, H*.55, Math.max(W, H)*.75); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  const order = [...POSTER_CAST].sort((a, b) => L[a.k].z - L[b.k].z);
  for (const c of order){ const p = L[c.k], im = await loadImg(posterPart(c.k)); const h = p.h*H, w = im.width / im.height * h; g.save(); if (p.dim) g.filter = `brightness(${p.dim}) saturate(.9)`; g.drawImage(im, p.x*W - w/2, (p.b - p.h)*H, w, h); g.restore(); }
  if (!L.title) return cv;
  // title
  const fs = (W / H >= 1.05 ? H : W*1.9) * L.title.s, tx = L.title.x*W, ty = L.title.y*H;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl'; g.font = `900 ${fs}px Cairo, sans-serif`;
  g.lineJoin = 'round'; g.lineWidth = fs*.14; g.strokeStyle = '#2a1404'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = fs*.25; g.strokeText('طيارة الجامد', tx, ty); g.shadowBlur = 0;
  const gr = g.createLinearGradient(0, ty - fs*.5, 0, ty + fs*.5); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(.45, '#ffc94a'); gr.addColorStop(1, '#d9781a'); g.fillStyle = gr; g.fillText('طيارة الجامد', tx, ty);
  g.font = `800 ${fs*.28}px Cairo, sans-serif`; g.lineWidth = fs*.06; g.strokeStyle = 'rgba(20,10,4,.9)'; g.strokeText('الحتة كلها بتتكلم عليه', tx, ty + fs*.78); g.fillStyle = '#fff'; g.fillText('الحتة كلها بتتكلم عليه', tx, ty + fs*.78);
  return cv;
}

// ---- 19m-places.js ----
// ================= places you can walk into, and the tram =================
// Each shop has a door on a building in town (a glass door and a sign) and a room far away (like طيارة's house).
// Walking through the door fades into the room; the shopkeeper sells a few things; the door inside takes you back out.
const SHOP_DEFS = [
  { id: 'pharmacy', name: 'صيدلية الشفاء', icon: '💊', color: '#1e5aa8', block: [2, 1], keeper: 'دكتور مجدي', wall: '#eef3f5', floor: '#d9e2e6',
    items: [{ label: '💊 مسكّن وفيتامين (الصحة كلها)', price: 30, hp: 100, say: 'ألف سلامة يا ابني' }, { label: '🩹 بلاستر وشاش', price: 6, hp: 20, say: 'خلي بالك من نفسك' }] },
  { id: 'barber', name: 'حلاق الجامد', icon: '💈', color: '#7a1f2b', block: [3, 2], keeper: 'الأسطى حمو', wall: '#f1e4d0', floor: '#cfc6b8',
    items: [{ label: '✂️ حلاقة وتظبيط دقن', price: 25, say: 'نعيماً يا جامد… بقيت عريس', fx: 'cut' }, { label: '🧴 جيل وبرفان', price: 10, say: 'ريحتك بقت فل', fx: 'cut' }] },
  { id: 'juice', name: 'عصير قصب الحرية', icon: '🥤', color: '#2d7a1f', block: [3, 1], keeper: 'عم سيد العصّار', wall: '#e9f0d8', floor: '#bdb39d',
    items: [{ label: '🥤 كوباية قصب', price: 5, hp: 25, run: true, say: 'قصب ساقع يرد الروح' }, { label: '🥭 مانجا فريش', price: 12, hp: 45, run: true, say: 'مانجا عويس على أصولها' }] },
  { id: 'phones', name: 'موبايلات طيارة', icon: '📱', color: '#202a6e', block: [1, 2], keeper: 'ميدو', wall: '#e6e8f2', floor: '#d5d7de',
    items: [{ label: '🔋 اشحن موبايلك', price: 0, say: 'اشحن براحتك يا معلم', fx: 'charge' }, { label: '📲 كارت شحن ٢٠', price: 20, say: 'الكارت أهو… كلّم الحبايب', fx: 'card' }] },
  { id: 'market', name: 'سوبر ماركت الأمانة', icon: '🛒', color: '#1f6f43', block: [2, 3], keeper: 'الحاج رمضان', wall: '#f4f1e8', floor: '#e2ddd2',
    items: [{ label: '🥫 ساندوتش جبنة وبيبسي', price: 8, hp: 30, say: 'بالهنا والشفا' }, { label: '💧 مية ساقعة', price: 3, hp: 10, run: true, say: 'اتفضل' }, { label: '🍫 شوكولاتة', price: 5, hp: 15, say: 'حلّي بقك' }] },
  { id: 'koshari', name: 'كشري أبو طارق', icon: '🍲', color: '#a33a12', block: [5, 2], keeper: 'أبو طارق', wall: '#f3e0c4', floor: '#b9a48a',
    items: [{ label: '🍲 طبق كشري وسط', price: 20, hp: 70, say: 'زوّد الدقة والشطة' }, { label: '🍮 أرز بلبن', price: 8, hp: 20, say: 'حلو الختام' }] },
  { id: 'bakery', name: 'مخبز العيش البلدي', icon: '🍞', color: '#8a5a12', block: [1, 1], keeper: 'الريّس عبده', wall: '#ead8b8', floor: '#9c8c74',
    items: [{ label: '🍞 خمس أرغفة سخنة', price: 2, hp: 15, say: 'العيش لسه طالع من الفرن' }, { label: '🥐 فينو وجبنة', price: 6, hp: 25, say: 'بالهنا' }] },
  { id: 'police', name: 'قسم شرطة الجمرك', icon: '🚓', color: '#0d3b66', block: [3, 3], keeper: 'الظابط حسام', wall: '#dde3e8', floor: '#b8bfc4',
    items: [{ label: '🗣️ اسأل الظابط على حاجة', price: 0, say: 'الحتة أمان طول ما إحنا هنا… ولو شفت حاجة بلّغ', fx: 'talk' }] },
  { id: 'cafe', name: 'قهوة قصر الملوك (جوه)', icon: '☕', color: '#5a3a1e', door: { x: 12.2, z: 21.66, face: 'pz' }, keeper: 'المعلم عبده', wall: '#d9b98a', floor: '#8a6a4a',
    items: [{ label: '🍵 شاي كشري', price: 5, hp: 20, say: 'تقيل ومظبوط' }, { label: '☕ قهوة مظبوط', price: 8, hp: 25, say: 'على وشها' }, { label: '💨 حجر شيشة تفاح', price: 15, say: 'اشرب يا جامد', fx: 'shisha' }] },
  { id: 'azzouz', name: 'مطعم عزوز (جوه)', icon: '🍕', color: '#b3121f', door: { x: 125.4, z: 39.07, face: 'pz' }, keeper: 'عزوز', wall: '#f2d6b0', floor: '#a0705c',
    items: [{ label: '🍕 بيتزا سوبر سوبريم', price: 40, hp: 100, say: 'أحسن بيتزا في إسكندرية' }, { label: '🍕 حتة مارجريتا', price: 12, hp: 35, say: 'بالهنا يا طيارة' }] },
];
const SHOPS = [];
const ROOM = { W: 10, D: 8, H: 3.4 };
const shopLight = new THREE.PointLight(0xffe8c8, 0, 14, 1.3); scene.add(shopLight);
// ---- doors in town ----
{
  const used = new Set();
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x2a3540, emissive: 0xffd9a0, emissiveIntensity: .35, roughness: .2, metalness: .3 });
  SHOP_DEFS.forEach((def, i) => {
    let door = def.door ? { x: def.door.x, z: def.door.z, ry: def.door.face === 'pz' ? 0 : Math.PI } : null;
    if (!door){
      const [j, k] = def.block, cx = X0 + PITCH / 2 + j * PITCH, cz = Z0 + PITCH / 2 + k * PITCH;
      const b = buildings.filter(b => b.faces && Math.abs(b.cx - cx) < BW / 2 && Math.abs(b.cz - cz) < BW / 2 && b.w >= 6.5 && !used.has(b) && b.faces.some(f => f === 'pz' || f === 'nz')).sort((a, c) => c.w - a.w)[0];
      if (!b){ console.warn('no building for', def.id); return; }
      used.add(b); const f = b.faces.includes('pz') ? 'pz' : 'nz', s = f === 'pz' ? 1 : -1;
      door = { x: b.cx + (b.w > 9 ? -b.w / 4 : 0), z: b.cz + s * (b.d / 2 + .09), ry: s > 0 ? 0 : Math.PI };
    }
    const out = Math.cos(door.ry) > 0 ? 1 : -1;
    const dm = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.4), doorMat); dm.position.set(door.x, 1.35, door.z + out * .01); dm.rotation.y = door.ry; scene.add(dm);
    glowSigns.push(signBoard(bigSign(`${def.icon} ${def.name}`, def.color, '#fff8e0', 768, 140, 62), door.x, 3.15, door.z + out * .04, 3.9, .72, door.ry, .45));
    const shop = { ...def, out: new THREE.Vector3(door.x, .15, door.z + out * 1.1), outYaw: door.ry, room: { x: -560 + i * 30, z: -560 }, keeperN: null };
    SHOPS.push(shop);
    buildRoom(shop);
  });
}
function nearShopDoor(p){ return SHOPS.find(s => Math.hypot(s.out.x - p.x, s.out.z - p.z) < 1.5); }
// ---- rooms ----
function buildRoom(s){
  const { W, D, H } = ROOM, ox = s.room.x, oz = s.room.z, p = [], glow = [];
  const B = (w, h, d, x, y, z, c, ry) => box(p, w, h, d, ox + x, y, oz + z, c, ry), C = (rt, rb, h, x, y, z, c) => cyl(p, rt, rb, h, ox + x, y, oz + z, c);
  B(W, .1, D, 0, -.05, 0, s.floor);
  B(W, H, .15, 0, H / 2, -D / 2, s.wall); B(.15, H, D, -W / 2, H / 2, 0, s.wall); B(.15, H, D, W / 2, H / 2, 0, s.wall);
  B(W / 2 - .9, H, .15, -(W / 4 + .45), H / 2, D / 2, s.wall); B(W / 2 - .9, H, .15, W / 4 + .45, H / 2, D / 2, s.wall); B(1.8, H - 2.5, .15, 0, 2.5 + (H - 2.5) / 2, D / 2, s.wall);
  B(W, .12, .2, 0, .06, -D / 2 + .1, '#5a4a3a');
  const solid = (w, d, x, z) => obstacles.push({ minX: ox + x - w / 2, maxX: ox + x + w / 2, minZ: oz + z - d / 2, maxZ: oz + z + d / 2 });
  const counter = (x, z, w = 4.6, c = '#7a4f2c') => { B(w, 1, .8, x, .5, z, c); B(w + .1, .06, .9, x, 1.03, z, '#d8d0c0'); solid(w, .8, x, z); };
  const shelves = (z, cols, w = W - 1.2) => { B(w, 2.6, .45, 0, 1.3, z, '#8a6a4a'); solid(w, .45, 0, z); for (let r = 0; r < 4; r++){ B(w, .05, .45, 0, .35 + r * .62, z, '#6a4a2a'); for (let x = -w / 2 + .3; x < w / 2 - .2; x += .34) if (rng() < .85) B(.26, .36, .3, x, .55 + r * .62, z + .02, pick(cols)); } };
  const table = (x, z) => { C(.5, .5, .05, x, .74, z, '#e8e2d4'); C(.05, .05, .72, x, .36, z, '#444'); for (const a of [0, Math.PI]) B(.42, .45, .42, x + Math.sin(a) * .85, .23, z + Math.cos(a) * .85, '#5a7a5a'); };
  s.counter = new THREE.Vector3(ox, 0, oz - 1.6); s.keeperAt = new THREE.Vector3(ox, .15, oz - 2.5);
  switch (s.id){
    case 'pharmacy': counter(0, -1.6, 5, '#f4f4f0'); shelves(-3.6, ['#ffffff', '#cfe3f5', '#2e7dd1', '#e8f4e8', '#d32f2f']); glow.push(['+', '#1faa59', 0, 2.9, -3.35, 1, 1]); break;
    case 'barber':
      for (const z of [-1.5, 1]){ B(.9, .5, .9, -3.6, .45, z, '#b3121f'); B(.9, .9, .15, -4.0, 1.1, z, '#b3121f'); B(.1, 1.2, 1.4, -4.85, 1.7, z, '#bfe3f2'); }
      counter(2.4, -2.4, 2.4); B(.8, .5, 2.6, 3.9, .25, 1.5, '#3a3a3a'); s.counter.set(ox + 2.4, 0, oz - 2.4); s.keeperAt.set(ox - 3, .15, oz - .4); break;
    case 'juice':
      counter(0, -1.6); for (let i = 0; i < 6; i++) B(.6, .4, .5, -4 + i * .5, .2, 2.6 - (i % 2) * .6, pick(['#f28c28', '#ffcc33', '#7bbf3a']));
      for (let i = 0; i < 8; i++) C(.05, .05, 2.4, 3.7 + (i % 3) * .15, 1.2, -3.4 + Math.floor(i / 3) * .15, '#8aa04a');
      B(.8, .9, .6, -1.5, 1.5, -1.6, '#c0c4c8'); for (let i = 0; i < 6; i++) C(.09, .09, .3, .3 + i * .25, 1.2, -1.6, pick(['#f28c28', '#ffcc33', '#7bbf3a', '#c0392b'])); break;
    case 'phones':
      for (const [x, z] of [[-1.8, -1.6], [1.8, -1.6]]){ B(3, .9, .8, x, .45, z, '#e8ecf0'); B(3, .3, .8, x, 1.05, z, '#9ad7f0'); } s.counter.set(ox, 0, oz - 1.6);
      B(W - 1.2, 2.2, .1, 0, 1.6, -3.85, '#1d2340'); for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) B(.4, .7, .06, -4 + i * 1, 1 + r * .8, -3.75, pick(['#111', '#e8e8e8', '#2e7dd1', '#c9a227'])); break;
    case 'market':
      counter(3, 2.4, 2.6); s.counter.set(ox + 3, 0, oz + 2.4); s.keeperAt.set(ox + 3, .15, oz + 1.5);
      for (const x of [-3.6, -1.3]){ B(.6, 1.8, 4.5, x, .9, -1, '#c8c2b4'); solid(1.4, 4.5, x, -1); for (let r = 0; r < 3; r++) for (let z = -3.1; z < 1.2; z += .32) for (const sx of [-1, 1]) if (rng() < .8) B(.2, .3, .25, x + sx * .38, .4 + r * .55, z, pick(['#d32f2f', '#ffca28', '#2e7d32', '#1565c0', '#f57c00', '#ffffff'])); }
      B(2, 2.2, .9, 3.6, 1.1, -3.3, '#dfe6ea'); B(1.8, 1.8, .05, 3.6, 1.2, -2.83, '#a8d8ea'); break;
    case 'koshari':
      counter(0, -1.6, 5); for (let i = 0; i < 4; i++) C(.4, .35, .6, -1.8 + i * 1.2, 1.35, -1.7, '#b0b4b8'); table(-2.5, 1.6); table(2.5, 1.6); break;
    case 'bakery':
      B(4, 2.4, 1.4, -2, 1.2, -3.2, '#9a4a2a'); glow.push(['oven', '#ff7a1a', -2, 1, -2.48, 1.6, .7]); counter(2.2, -1, 3, '#8a6a4a'); s.counter.set(ox + 2.2, 0, oz - 1); s.keeperAt.set(ox + 2.2, .15, oz - 2);
      for (let r = 0; r < 4; r++) for (let i = 0; i < 5; i++) C(.18, .18, .04, 3.4 + (i % 2) * .2, .5 + r * .5, -3.3 + i * .35, '#d9a35a'); B(1.2, 2.2, .5, 3.6, 1.1, -2.6, '#6a4a2a'); break;
    case 'police':
      counter(0, -1.4, 3.6, '#5a6470'); s.counter.set(ox, 0, oz - 1.4);
      for (const x of [-3.2, 3.2]){ B(1.6, .75, .8, x, .38, -2.4, '#7a5a3a'); B(.5, .02, .4, x, .77, -2.4, '#f4f4f0'); }
      C(.03, .03, 2.6, 4.3, 1.3, -3.3, '#888'); B(.9, .2, .02, 4.75, 2.45, -3.3, '#c62828'); B(.9, .2, .02, 4.75, 2.25, -3.3, '#ffffff'); B(.9, .2, .02, 4.75, 2.05, -3.3, '#111111');
      for (let i = 0; i < 7; i++) B(.05, 2.2, .05, -4.6 + i * .18, 1.1, 2.6, '#444'); B(2.2, 3, .1, -3.9, 1.5, 3.6, '#5a6470'); B(3, .45, .5, 2.8, .23, 3.4, '#5a4a3a'); break;
    case 'cafe':
      counter(-2.5, -2.4, 3.6, '#5a3a1e'); s.counter.set(ox - 2.5, 0, oz - 2.4); s.keeperAt.set(ox - 2.5, .15, oz - 3.2);
      table(-2.2, .9); table(1.8, .9); table(2.8, -1.8); B(1.8, 1, .1, 3.2, 2.2, -3.85, '#111'); glow.push(['tv', '#4a7ab8', 3.2, 2.2, -3.79, 1.6, .85]);
      C(.15, .25, .8, 4.2, .4, 2.7, '#2e7dd1'); C(.03, .03, .7, 4.2, 1.15, 2.7, '#888'); break;
    case 'azzouz':
      B(2.6, 2.2, 1.6, 3.2, 1.1, -3.1, '#9a4a2a'); glow.push(['oven', '#ff7a1a', 3.2, .9, -2.28, 1.2, .6]); counter(-1.4, -1.8, 4.2, '#b3121f'); s.counter.set(ox - 1.4, 0, oz - 1.8); s.keeperAt.set(ox - 1.4, .15, oz - 2.7);
      table(-2.8, 1.6); table(1.6, 1.4); break;
  }
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .75 })); m.receiveShadow = true; scene.add(m);
  for (const [kind, c, x, y, z, w, h] of glow){ const g = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: kind === 'oven' ? 1.6 : 1 })); g.position.set(ox + x, y, oz + z); scene.add(g); }
  const sign = signBoard(bigSign(`${s.icon} ${s.name}`, s.color, '#fff8e0', 768, 140, 62), ox, 2.95, oz - D / 2 + .09, 4.2, .77, 0, .4); void sign;
  s.doorIn = new THREE.Vector3(ox, 0, oz + D / 2 - .6);
}
// ---- going in and out ----
const SHOPIN = { s: null };
function enterShop(s){
  if (hero.veh) return;
  fadeTo(() => {
    SHOPIN.s = s; HOUSE.inside = true; HOUSE.shop = s; HOUSE.homeRoom ||= HOUSE.room;
    HOUSE.room = { x0: s.room.x - ROOM.W / 2, x1: s.room.x + ROOM.W / 2, z0: s.room.z - ROOM.D / 2, z1: s.room.z + ROOM.D / 2 + .2 };
    HOUSE.prevCam = camTarget; camTarget = Math.min(camTarget, 3.8); camDist = camTarget;
    hero.pos.set(s.doorIn.x, 0, s.room.z + .4); hero.vel.set(0, 0, 0); CAM.orbit = CAM.orbitSm = 0; CAM.tilt = .5; lookAt.copy(hero.pos);
    shopLight.position.set(s.room.x, 2.9, s.room.z); shopLight.intensity = 4;
    if (!s.keeperN){ s.keeperN = makeNPC(); }
    const n = s.keeperN; n.role = 'keeper'; n.name = s.keeper; n.state = 'idle'; n.g.visible = true; n.g.position.copy(s.keeperAt); n.yaw = 0; n.g.rotation.set(0, 0, 0); n.downT = 0; n.fall = 0;
    banner(`${s.icon} ${s.name}`, 'info', 1.8);
  }, .2).then(() => { if (SHOPIN.s === s && s.keeperN) say(s.keeperN, rpick(['أهلاً يا ' + heroName, 'نورت يا جامد', 'اتفضل يا معلم', 'أؤمر']), 2.2); });
}
function exitShop(){
  const s = SHOPIN.s; if (!s) return;
  fadeTo(() => {
    HOUSE.inside = false; HOUSE.shop = null; HOUSE.room = HOUSE.homeRoom || HOUSE.room; SHOPIN.s = null; shopLight.intensity = 0;
    if (s.keeperN){ s.keeperN.state = 'hidden'; s.keeperN.g.visible = false; }
    camTarget = HOUSE.prevCam || 5; hero.pos.set(s.out.x, .15, s.out.z); hero.vel.set(0, 0, 0); CAM.orbit = CAM.orbitSm = s.outYaw; lookAt.copy(hero.pos);
  });
}
function shopAction(){
  const s = SHOPIN.s, p = hero.pos;
  if (Math.hypot(p.x - s.doorIn.x, p.z - s.doorIn.z) < 1.4) return { text: `اخرج من ${s.name}`, fn: exitShop };
  if (Math.hypot(p.x - s.counter.x, p.z - s.counter.z) < 2.4) return { text: s.id === 'police' ? `كلّم ${s.keeper}` : `اشتري من ${s.keeper} ${s.icon}`, fn: () => openShopMenu(s) };
  return null;
}
function openShopMenu(s){
  openPanel(`${s.icon} ${s.name}`, s.items.map(it => ({ label: it.label, btn: it.price ? `${it.price} ج` : 'يلا', dim: hero.money < it.price, fn: () => buyAt(s, it) })));
}
function buyAt(s, it){
  if (hero.money < it.price){ $('shopMoney').textContent = `محتاج ${egp(it.price - hero.money)} كمان`; buzz(40); return; }
  hero.money -= it.price; closePanel(); if (it.price) coin(); else clink();
  if (it.hp) hero.hp = Math.min(100, hero.hp + it.hp);
  if (it.run){ hero.stamina = 1; hero.tired = false; }
  const fx = { cut: 'شكلك بقى جامد ✂️', charge: 'الموبايل اتشحن 🔋', card: 'الرصيد اتشحن 📲', shisha: 'دماغك رايقة 💨', talk: '' }[it.fx];
  banner(fx || (it.hp ? `${it.label.split(' ')[0]} +${it.hp} صحة` : 'تمام'), 'ok', 2.2);
  if (s.keeperN) say(s.keeperN, it.say, 2.6);
}

// ================= the tram: one yellow two-car tram runs along the market road, stops at the three stops, and you can ride it =================
const tram = { x: TRAM.x0 + 30, dir: 1, speed: 0, stopT: 0, at: null, bellT: 0, mesh: null };
const TRAMR = { on: false, from: null };
{
  const p = [], gl = [];
  for (const off of [5.2, -5.4]){
    box(p, 10, 1.5, 2.5, off, 1.15, 0, '#e8b419'); box(p, 10, .95, 2.46, off, 2.35, 0, '#f3ead2'); box(p, 10.1, .12, 2.56, off, 1.9, 0, '#7a5a12');
    box(p, 9.6, .35, 2.3, off, 3.0, 0, '#9aa0a6'); box(p, 8, .4, 1.8, off, .3, 0, '#2b2b2b');
    for (let i = -4; i <= 4; i++) for (const s of [-1, 1]) box(p, .8, .7, .04, off + i * 1.05, 2.35, s * 1.25, '#2a3a44');
    for (const e of [-1, 1]) box(p, .06, .7, 2, off + e * 5.02, 2.35, 0, '#2a3a44');
  }
  box(p, .6, .9, 2.2, -.1, 1.6, 0, '#3a3a3a');
  // the trolley pole up to the wire
  { const g = new THREE.CylinderGeometry(.04, .04, 3.2, 6); g.rotateZ(-1.1); g.translate(4.6, 4.3, 0); p.push(colored(g, '#2b2f33')); }
  const mesh = new THREE.Group();
  const body = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .45, metalness: .2 })); body.castShadow = true; mesh.add(body);
  for (const e of [-1, 1]){ const l = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .3), new THREE.MeshStandardMaterial({ color: 0xfff4d0, emissive: 0xfff0c0, emissiveIntensity: .8 })); l.position.set(e * 10.23, 1.2, 0); l.rotation.y = e * Math.PI / 2; mesh.add(l); }
  const sign = signBoard(bigSign('🚋 بحري ⇄ الرمل', '#2a1700', '#ffd34d', 512, 100, 52), 0, 0, 0, 3, .6, 0, .5); scene.remove(sign); sign.position.set(5.2, 2.95, 1.29); mesh.add(sign);
  mesh.position.set(tram.x, 0, TRAM.z); scene.add(mesh); tram.mesh = mesh;
}
const TRAM_HALF = 10.4;
function tramBlocks(x, z, pad = PR){ return !TRAMR.on && Math.abs(x - tram.x) < TRAM_HALF + pad && Math.abs(z - TRAM.z) < 1.3 + pad; }
function tramBell(){ tone(1320, 1320, .12, 'triangle', .09); tone(1320, 1320, .12, 'triangle', .09, .18); }
function updateTram(dt, t, playing){
  const T = tram;
  if (T.stopT > 0){ T.stopT -= dt; T.speed = 0; if (T.stopT <= 0){ T.lastStop = T.at; T.at = null; if (playing && Math.abs(T.x - hero.pos.x) < 60) tramBell(); } }
  else {
    let target = 7;
    // something in front: the player, the player's car, a car crossing
    const front = T.x + T.dir * TRAM_HALF;
    const ahead = (x, z, lat) => { const a = (x - front) * T.dir; return a > -1 && a < 11 && Math.abs(z - TRAM.z) < lat; };
    if (!TRAMR.on && (hero.veh ? ahead(hero.veh.pos.x, hero.veh.pos.z, 2.6) : ahead(hero.pos.x, hero.pos.z, 1.9))){ target = 0; T.bellT -= dt; if (T.bellT <= 0 && playing){ T.bellT = 2.5; tramBell(); } }
    for (const c of traffic) if (ahead(c.position.x, c.position.z, 2.4)){ target = 0; break; }
    // the next stop in the way it is going: slow down and stop exactly there
    const next = TRAM.stations.filter(s => (s - T.x) * T.dir > .05 && s !== T.lastStop).sort((a, b) => Math.abs(a - T.x) - Math.abs(b - T.x))[0];
    if (next !== undefined){ const d = Math.abs(next - T.x); target = Math.min(target, Math.sqrt(2 * 1.4 * d) + .2); if (d < .25){ T.x = next; T.at = next; T.stopT = 7; T.speed = 0; } }
    // the ends of the line (off the map): turn round
    if ((T.dir > 0 && T.x > TRAM.x1) || (T.dir < 0 && T.x < TRAM.x0)){ T.dir *= -1; T.lastStop = null; T.stopT = 3; }
    T.speed += (target - T.speed) * damp(T.speed > target ? 4 : 1.2, dt);
    if (T.stopT <= 0) T.x += T.speed * T.dir * dt;
  }
  T.mesh.position.x = T.x; T.mesh.rotation.y = T.dir > 0 ? 0 : Math.PI;
  // riding: you stand inside; at a stop you can get off
  if (TRAMR.on){ hero.pos.set(T.x - T.dir * 2, .15, TRAM.z); hero.vel.set(0, 0, 0); }
  // walking in front of it
  else if (playing && !hero.veh && hero.inv <= 0 && T.speed > 2 && tramBlocks(hero.pos.x, hero.pos.z, .1)){ heroDamage(30 * DIFF.dmg, 'car'); hero.inv = 1.6; hero.knock.set(T.dir * 6, 0, hero.pos.z < TRAM.z ? -9 : 9); tramBell(); }
}
function tramAction(p){
  if (hero.veh || TRAMR.on || tram.stopT <= .8) return null;
  if (Math.abs(p.x - tram.x) < TRAM_HALF + 1 && Math.abs(p.z - TRAM.z) < 3.6) return { text: '🚋 اركب الترام (٢ جنيه)', fn: () => {
    if (hero.money < 2) return banner('مفيش ٢ جنيه للتذكرة 😅', 'bad', 1.8);
    hero.money -= 2; TRAMR.on = true; TRAMR.from = tram.at; TRAMR.cam = camTarget; camTarget = 11; CAM.tilt = .5; hero.locked = true; tramBell(); banner('ركبت الترام 🚋 · هتنزل في المحطة الجاية', 'ok', 2.4);
  } };
  return null;
}
function tramRideAction(){
  if (tram.stopT > .5 && tram.at !== null && tram.at !== TRAMR.from) return { text: 'انزل من الترام 🚋', fn: () => endTramRide() };
  return { text: '🚋 الترام ماشي… استنى المحطة الجاية', fn: () => {} };
}
// a new mode / the menu: out of any shop, off the tram
function leavePlaces(){
  if (TRAMR.on){ TRAMR.on = false; hero.locked = false; if (TRAMR.cam) camTarget = TRAMR.cam; }
  if (SHOPIN.s){ if (SHOPIN.s.keeperN){ SHOPIN.s.keeperN.state = 'hidden'; SHOPIN.s.keeperN.g.visible = false; } SHOPIN.s = null; HOUSE.shop = null; HOUSE.inside = false; shopLight.intensity = 0; }
  if (HOUSE.homeRoom) HOUSE.room = HOUSE.homeRoom;
}
function endTramRide(){
  if (!TRAMR.on) return; TRAMR.on = false; hero.locked = false; if (TRAMR.cam) camTarget = TRAMR.cam;
  const [fx, fz] = freeSpot(tram.x, TRAM.z - 6.9); hero.pos.set(fx, .15, fz); hero.vel.set(0, 0, 0); lookAt.copy(hero.pos);
}

// ---- 19n-story-fx.js ----
// ================= story effects: narration, flashbacks, rain, fire, the club, launches, mission end card =================

// ---- الحاج كامل narrates: assets/voices/kamel/<id>.mp3 (made in ElevenLabs), texts in lines.json ----
const NARR = {};
fetch('assets/voices/kamel/lines.json').then(r => r.ok ? r.json() : {}).then(j => Object.assign(NARR, j)).catch(() => {});
Object.assign(CAST, {
  kamel: { name: () => 'الحاج كامل', emoji: '👳‍♂️' }, shadia: { name: () => 'شادية', emoji: '👩' }, haidy: { name: () => 'هايدي', emoji: '👰' },
  father: { name: () => 'الحاج العربي', emoji: '🧔' }, leather: { name: () => 'راجل بجاكت جلد', emoji: '🧥' }, mother: { name: () => 'أم شادية', emoji: '👵' },
});
// play one narration line (returns false when the file is missing, then the line is only shown)
function playNarr(id){ if (muted) return false; stopVoice(); const a = startAudio(`assets/voices/kamel/${id}.mp3`); a.onerror = () => { if (VOICE.cur === a) VOICE.cur = null; }; return true; }

// what a scene changes for a moment: طيارة hidden (flashbacks), طيارة kept on a roof (the ending)
const SCENE = { hideHero: false, lockY: false };
// the café awning on fire (chapter 5), then burnt until the café is renewed in the ending
function awningFire(on){ clearFires(); if (on) for (const x of [12, 17.5, 23]) fireAt(x, 3.6, 23.3, .85); }
function awningBurnt(on){ const aw = scene.getObjectByName('cafeAwning'); if (aw) aw.material.color.set(on ? 0x2a2622 : 0x1d6b44); }
// الحاج العربي's showroom on fire (chapter 6)
function showroomFire(on){ clearFires(); if (on){ for (const dx of [-9, -3, 3, 9]) fireAt(SHOWROOM.cx + dx, 6.9, SHOWROOM.cz - 2, 1.4); fireAt(SHOWROOM.cx, .2, SHOWROOM.cz + 2, 1.2); showroomBurnt(true); } }
// the kite over طيارة's roof in the ending
const KITE = { g: null };
function kiteShow(on){
  if (!KITE.g){ const g = new THREE.Group(); const k = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, .6, 0), new THREE.Vector3(.45, 0, 0), new THREE.Vector3(0, -.8, 0), new THREE.Vector3(0, .6, 0), new THREE.Vector3(0, -.8, 0), new THREE.Vector3(-.45, 0, 0)]), new THREE.MeshStandardMaterial({ color: 0xe8b419, side: THREE.DoubleSide, emissive: 0x553300, emissiveIntensity: .3 })); k.geometry.computeVertexNormals(); g.add(k); const tail = new THREE.Mesh(new THREE.BoxGeometry(.04, 1.4, .02).translate(0, -1.5, 0), new THREE.MeshStandardMaterial({ color: 0xc0392b })); g.add(tail); scene.add(g); KITE.g = g; }
  KITE.g.visible = !!on; if (on) KITE.g.position.set(-24, 17, 72); SCENE.lockY = !!on;
}
// ---- extra people: شادية, هايدي, الحاج العربي (العربي's father), the man in the leather jacket ----
const shadiaD = makeCharacter('shadia', CH.hero, 1.64); shadiaD.root.visible = false;
const haidyD = makeCharacter('haidy', CH.hero, 1.62); haidyD.root.visible = false;
const fatherD = MODELS3D.npc ? makeDoll3D(cloneRig(MODELS3D.npc), CH.enemy, 1.78) : makeDoll(CH.enemy, 1.78); fatherD.root.visible = false;
const leatherD = MODELS3D.thug ? makeDoll3D(cloneRig(MODELS3D.thug), CH.wanted, 1.82) : makeDoll(CH.wanted, 1.82); leatherD.root.visible = false;
Object.assign(CAST_DOLLS, { shadia: shadiaD, haidy: haidyD, father: fatherD, leather: leatherD });

// ---- flashback look: old film colours, a vignette, «زمان…» ----
document.body.insertAdjacentHTML('beforeend', '<div id="fbOv"><i></i><b>زمان…</b></div><div id="rainOv"></div><div id="mEnd" class="mend" hidden></div>');
function setFlashback(on){ document.body.classList.toggle('flashback', !!on); canvas.style.filter = on ? 'sepia(.7) saturate(.8) contrast(1.06) brightness(.94)' : ''; }

// ---- small tweens for scenes (a falling shirt, a car rolling away…) ----
const TWEENS = [];
function tween(dur, fn, done){ TWEENS.push({ t: 0, dur, fn, done }); }

// ---- rain (نوّة المكنسة): falling streaks round the camera, darker and foggier, thunder now and then ----
const RAIN = { on: false, mesh: null, flashT: 6 };
{
  const n = GFX === 'low' ? 500 : 1100, pos = new Float32Array(n * 6);
  for (let i = 0; i < n; i++){ const x = R(-30, 30), y = R(0, 26), z = R(-30, 30); pos.set([x, y, z, x + .18, y - 1.4, z], i * 6); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  RAIN.mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xdfeaf6, transparent: true, opacity: .7, fog: false })); RAIN.mesh.visible = false; RAIN.mesh.frustumCulled = false; scene.add(RAIN.mesh);
}
function setRain(on){ RAIN.on = !!on; RAIN.mesh.visible = RAIN.on; document.body.classList.toggle('raining', RAIN.on); if (!on) setLoop('rain', 0, 2600, 'highpass'); }
function rainTick(dt){
  if (!RAIN.on) return;
  const p = RAIN.mesh.geometry.attributes.position, a = p.array;
  for (let i = 0; i < a.length; i += 6){ a[i+1] -= dt * 26; a[i+4] -= dt * 26; if (a[i+4] < 0){ a[i+1] += 26; a[i+4] += 26; } }
  p.needsUpdate = true; RAIN.mesh.position.set(camera.position.x, 0, camera.position.z);
  scene.fog.near = Math.min(scene.fog.near, 18); scene.fog.far = Math.min(scene.fog.far, 95);
  setLoop('rain', muted ? 0 : .09, 2600, 'highpass');
  RAIN.flashT -= dt; if (RAIN.flashT <= 0){ RAIN.flashT = R(5, 11); const f = $('rainOv'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 120); setTimeout(() => { noise(1.6, 120, .5); }, R(300, 1200)); }
}

// ---- fire: flickering flames with a light and smoke ----
const FIRES = [];
const fireMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false });
function fireAt(x, y, z, size = 1){
  const g = new THREE.Group(); g.position.set(x, y, z);
  for (let i = 0; i < 4; i++){ const c = new THREE.Mesh(new THREE.ConeGeometry(.45 * size, 1.6 * size, 7, 1, true), fireMat); c.position.set(R(-.5, .5) * size, .8 * size, R(-.5, .5) * size); g.add(c); }
  const light = new THREE.PointLight(0xff7a2a, 6 * size, 10 * size, 1.6); light.position.y = 1.2 * size; g.add(light);
  scene.add(g); const f = { g, light, size, ph: R(0, 6), smokeT: 0 }; FIRES.push(f); return f;
}
function clearFires(){ for (const f of FIRES) scene.remove(f.g); FIRES.length = 0; }
function fireTick(dt, t){
  for (const f of FIRES){ f.g.children.forEach((c, i) => { if (c.isMesh){ const k = 1 + Math.sin(t * 13 + i * 2 + f.ph) * .18; c.scale.set(k, k + Math.sin(t * 9 + i) * .25, k); } }); f.light.intensity = (5 + Math.sin(t * 17 + f.ph) * 1.6) * f.size;
    f.smokeT -= dt; if (f.smokeT <= 0){ f.smokeT = .25; _t.set(f.g.position.x + R(-.4, .4), f.g.position.y + 1.8 * f.size, f.g.position.z + R(-.4, .4)); puff(_t, .9 * f.size); } }
}

// ---- the club (شومة): the first weapon, in chapter 6. In the hand, and hits count double on شمس's men ----
const STICK = { on: false };   // the club: giveStick() is in 19o-stage5.js with the other weapons
// ---- launches (لانشات) in the harbour: you can drive one in chapter 6 ----
function inSea(x, z){
  if (z < NILE_Z + 2 || z > NILE_Z + 260 || x < X0 - 60 || x > XMAX + 60) return false;
  if (Math.abs(x - BRIDGE.x) < BRIDGE.w / 2 + 1.5 && z < BRIDGE.z1 + 2) return false;                   // the bridge
  if (x > FAR.x0 - 3 && x < FAR.x1 + 3 && z > FAR.z0 - 3) return false;                                // the fort
  if (x > PIER.x0 - .6 && x < PIER.x1 + .6 && z < PIER.z1 + .6) return false;                            // the pier
  return true;
}
function makeLaunch(color){
  const g = new THREE.Group(), p = [];
  box(p, 2.4, .9, 6, 0, .2, 0, color); box(p, 2.46, .2, 6.1, 0, .7, 0, '#f4f0e6'); { const bow = new THREE.ConeGeometry(1.2, 1.8, 4); bow.rotateX(Math.PI / 2); bow.rotateZ(Math.PI / 4); bow.scale(1, .5, 1); bow.translate(0, .25, 3.85); p.push(colored(bow, color)); }
  box(p, 1.6, 1, 1.4, 0, 1.2, -.6, '#e8eef2'); box(p, 1.5, .5, .06, 0, 1.45, .12, '#2a3a44'); box(p, .5, .7, .6, 0, .7, -2.7, '#222');
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5 })); m.castShadow = true; g.add(m); scene.add(g); return g;
}
const launches = [];
for (const [x, z, c] of [[PIER.x0 - 2.4, 172, '#1f5fa8'], [PIER.x1 + 2.4, 178, '#c0392b']]){
  const mesh = makeLaunch(c); mesh.position.set(x, -.9, z);
  const v = { type: 'boat', mesh, pos: mesh.position, yaw: 0, speed: 0, steer: 0, max: 21, accel: 8, turn: 1.35, circles: [[1.6, 1.25], [-1.6, 1.25]], home: { x, z, yaw: 0, y: -.9 }, jobOnly: 'boat' };
  vehicles.push(v); launches.push(v);
}
const shamsLaunch = makeLaunch('#212121'); shamsLaunch.visible = false;

// ---- end of a mission: what you earned, how long it took, stars ----
function missionCard(M, secs, fails, reward){
  const par = M.par || 150, stars = fails ? (fails > 1 ? 1 : 2) : secs <= par ? 3 : secs <= par * 1.6 ? 2 : 1;
  const quip = rpick(stars === 3 ? ['جامد يا طيارة 👑', 'إيدك تتلف في حرير', 'كده الشغل!'] : stars === 2 ? ['مش وحش… بس الحتة مستنية أحسن', 'كويس… شد حيلك شوية'] : ['المهم إنها خلصت 😅', 'الحاج كامل بيضحك عليك من القهوة 😂']);
  const el = $('mEnd'); el.innerHTML = `<b>✅ ${M.title}</b><span class="st">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</span><small>${reward ? `+${reward} جنيه · ` : ''}${fmtTime(secs)}</small><i>${quip}</i>`;
  el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(missionCard.t); missionCard.t = setTimeout(() => { el.hidden = true; }, 3400);
  (SAVE.stars ||= {})[M.id] = Math.max(SAVE.stars[M.id] || 0, stars);
}

const KAMEL_T = { t: 8 };
function storyFxTick(dt, t){
  for (let i = TWEENS.length - 1; i >= 0; i--){ const w = TWEENS[i]; w.t += dt; const k = Math.min(1, w.t / w.dur); w.fn(k); if (k >= 1){ TWEENS.splice(i, 1); if (w.done) w.done(); } }
  rainTick(dt); fireTick(dt, t);
  if (KITE.g && KITE.g.visible){ KITE.g.position.x = -24 + Math.sin(t * .7) * 2.2; KITE.g.position.y = 17 + Math.sin(t * 1.3) * .8; KITE.g.rotation.z = Math.sin(t * 1.1) * .35; }
  // الحاج كامل says something now and then when you sit near him at the café
  if (state === 'play' && kamelD && kamelD.root.visible && !CUT.on && (modeId === 'story' || modeId === 'free') && hero.pos.distanceTo(SPOT.domino) < 3.4){
    KAMEL_T.t -= dt; if (KAMEL_T.t <= 0){ KAMEL_T.t = R(35, 60); const id = rpick(['kamel_r1', 'kamel_r2', 'kamel_r3', 'kamel_r4', 'kamel_r5']); if (NARR[id]){ say({ d: kamelD }, NARR[id], 5); playNarr(id); } }
  }
  for (const v of launches) if (v !== hero.veh){ v.pos.y = -.9 + Math.sin(t * 1.3 + v.home.x) * .06; v.mesh.rotation.z = Math.sin(t * 1.1 + v.home.z) * .03; }
}

// ---- 19o-stage5.js ----
// ================= stage 5: weapons and the police, طيارة's phone (GPS, missions, people), more activities, the first-time tips =================

// ---------------- weapons ----------------
// Funny ones (slipper, broom, plastic chair) and real ones (club, pistol). No blood: people fall down and get up.
// In the story they come with the story; in the free mode you have them all. Shooting in the street brings the police.
const WEAPONS = {
  none:    { name: 'إيدك', icon: '👊', mult: 1, range: 1.9 },
  slipper: { name: 'شبشب', icon: '🥿', mult: 1.2, range: 2, funny: ['شبشب؟! يا نهار أبيض 😂', 'ده شبشب أمي ده!', 'آآآه… الشبشب لأ!'] },
  broom:   { name: 'مقشة', icon: '🧹', mult: 1.5, range: 2.5, funny: ['مقشة؟! هو انت بتكنس الحتة؟', 'يا عم بالراحة على المقشة!'] },
  chair:   { name: 'كرسي بلاستيك', icon: '🪑', mult: 2.2, range: 2.1, uses: 4, funny: ['الكرسي!! زي الأفلام بالظبط', 'آه يا ضهري!'] },
  stick:   { name: 'شومة', icon: '🏏', mult: 2, range: 2.3 },
  pistol:  { name: 'مسدس', icon: '🔫', mult: 3, range: 24, gun: true },
};
const WEAP = { cur: 'none', meshes: {}, chairUses: 0 };
function weaponsOwned(){
  if (modeId !== 'story') return Object.keys(WEAPONS);
  const m = SAVE.m, I = idx, out = ['none', 'slipper'];
  if (SAVE.ended || m > I('spill')) out.push('broom', 'chair');
  if (SAVE.ended || (m >= I('prepare'))) out.push('stick');
  if (SAVE.ended) out.push('pistol');
  return out;
}
// what is in the right hand
function weaponMesh(id){
  if (WEAP.meshes[id] !== undefined) return WEAP.meshes[id];
  if (!hero.d.is3D || id === 'none'){ WEAP.meshes[id] = null; return null; }
  const R3 = hero.d.R, A = R3.J.armR, dir = A.wr.clone().sub(A.el).normalize(), g = new THREE.Group(); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const p = [];
  if (id === 'slipper'){ box(p, .1, .03, .27, 0, .1, .06, '#2e7dd1'); box(p, .1, .03, .05, 0, .12, .02, '#e8e2d4'); }
  if (id === 'broom'){ cyl(p, .018, .018, 1.3, 0, .55, 0, '#c9a227'); cyl(p, .1, .05, .32, 0, 1.3, 0, '#8a6a3a'); }
  if (id === 'chair'){ box(p, .42, .04, .42, 0, .25, .18, '#e53935'); box(p, .42, .38, .04, 0, .44, -.02, '#e53935'); for (const [x, z] of [[-.18, .35], [.18, .35], [-.18, 0], [.18, 0]]) box(p, .03, .3, .03, x, .08, z, '#e53935'); }
  if (id === 'stick'){ const c = new THREE.CylinderGeometry(.022, .032, .85, 8).translate(0, .32, 0); c.rotateX(1.2); p.push(colored(c, '#6b4423')); }
  if (id === 'pistol'){ box(p, .04, .12, .05, 0, .06, .02, '#1b1b1b'); box(p, .04, .05, .2, 0, .13, .1, '#2a2a2a'); }
  if (!p.length){ WEAP.meshes[id] = null; return null; }
  g.add(new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: id === 'pistol' ? .6 : .1 })));
  g.position.copy(A.wr.clone().sub(R3.bones.lowerArmR.userData.w)); R3.bones.lowerArmR.add(g); WEAP.meshes[id] = g; return g;
}
function setWeapon(id, quiet){
  if (!WEAPONS[id]) id = 'none';
  WEAP.cur = id; hero.weapon = id === 'none' ? null : id; if (id === 'chair') WEAP.chairUses = WEAPONS.chair.uses;
  for (const k of Object.keys(WEAPONS)){ const m = weaponMesh(k); if (m) m.visible = k === id; }
  $('weapBtn').textContent = WEAPONS[id].icon; document.body.classList.toggle('armed', id !== 'none');
  if (!quiet) banner(`${WEAPONS[id].icon} ${WEAPONS[id].name}`, 'info', 1.2);
}
function cycleWeapon(){ const own = weaponsOwned(), i = own.indexOf(WEAP.cur); setWeapon(own[(i + 1) % own.length]); }
// the club in chapter 6 goes through the same hands
function giveStick(on){ STICK.on = !!on; if (on) setWeapon('stick', true); else if (WEAP.cur === 'stick') setWeapon('none', true); }
const weaponRange = () => WEAPONS[WEAP.cur].range;
// a hit with the weapon in hand: how much harder than a fist, a funny line, the plastic chair breaks after a few hits
function weaponHit(target){
  const W = WEAPONS[WEAP.cur]; if (WEAP.cur === 'none') return 1;
  if (W.funny && target && Math.random() < .7) say(target, rpick(W.funny), 1.8, 'angry');
  if (WEAP.cur === 'slipper') noise(.08, 3200, .35);
  if (WEAP.cur === 'chair'){ WEAP.chairUses--; noise(.2, 1400, .4); if (WEAP.chairUses <= 0){ banner('🪑 الكرسي اتكسر!', 'info', 1.4); setWeapon('none', true); } }
  return W.mult;
}
// ---- the pistol: shoots the nearest person in front of the camera; nobody bleeds, they fall and run ----
const muzzle = new THREE.PointLight(0xffd27a, 0, 6, 2); scene.add(muzzle);
const tracer = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: .9 })); tracer.visible = false; scene.add(tracer);
let shotCd = 0;
function shootPistol(){
  if (shotCd > 0 || hero.veh || hero.locked) return; shotCd = .35;
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), p = hero.pos; let best = null, bs = 1e9;
  const cand = [];
  for (const n of npcs) if (n.state !== 'hidden' && n.state !== 'down' && n.g.visible) cand.push({ x: n.g.position.x, z: n.g.position.z, n });
  if (enemy.active && !enemy.ally && enemy.d.downT <= 0) cand.push({ x: enemy.pos.x, z: enemy.pos.z, enemy: true });
  if (boss.active && wantedD.downT <= 0) cand.push({ x: boss.pos.x, z: boss.pos.z, boss: true });
  for (const c of cand){ const dx = c.x - p.x, dz = c.z - p.z, d = Math.hypot(dx, dz); if (d > WEAPONS.pistol.range || d < .3) continue; const cos = (dx * fx + dz * fz) / d; if (cos < .88) continue; const s = d * (2 - cos); if (s < bs && lineOfSight(p.x, p.z, c.x, c.z)){ bs = s; best = c; } }
  hero.d.punchT = .2; hero.d.punchSide = 1; if (best) hero.d.yaw = Math.atan2(best.x - p.x, best.z - p.z);
  noise(.18, 2600, .7); tone(120, 60, .2, 'sawtooth', .15); shake = Math.max(shake, .15); buzz(25);
  muzzle.position.set(p.x + fx * .6, 1.4, p.z + fz * .6); muzzle.intensity = 8; setTimeout(() => { muzzle.intensity = 0; }, 70);
  const end = best ? new THREE.Vector3(best.x, 1.2, best.z) : new THREE.Vector3(p.x + fx * 20, 1.3, p.z + fz * 20);
  tracer.geometry.setFromPoints([new THREE.Vector3(p.x + fx * .6, 1.4, p.z + fz * .6), end]); tracer.visible = true; setTimeout(() => { tracer.visible = false; }, 60);
  if (best){ if (best.n){ npcHit(best.n, 3); if (best.n.thug && !best.n.thugDone){ best.n.thugHits = 3; best.n.thugDone = true; best.n.downT = 999; } } else if (best.enemy) hitEnemy(45, p); else if (best.boss) bossHit(true); }
  // everyone around runs; shooting in the street brings the police
  for (const n of npcs) if (n.state === 'walk' && n.g.position.distanceTo(p) < 25){ n.fleeT = 7; if (Math.random() < .3) say(n, rpick(['ضرب نار!!', 'اجروااا!', 'يا ساتر يا رب!']), 1.6, 'angry'); }
  if (modeId !== 'story' || ST2.phase !== 'active') wantedUp();
}
// ---- the police after shooting: a car comes for you through the streets; get far away or hide, or pay a fine ----
const POL = { on: false, heat: 0, t: 0, lost: 0, repath: 0, path: [], bustT: 0 };
function wantedUp(){
  POL.heat = Math.min(3, POL.heat + 1); POL.t = 0; POL.lost = 0;
  if (!POL.on){ POL.on = true; const p = randomSidewalkPoint(60, hero.pos); chaserCar.position.set(p.x, 0, p.z); chaserCar.visible = true; chaserLight.intensity = 30; banner('🚨 ضرب نار في الشارع… البوليس جاي!', 'police', 3); }
  renderWanted();
}
function polEnd(msg, cls){ POL.on = false; POL.heat = 0; chaserCar.visible = false; chaserLight.intensity = 0; if (sirenGain) sirenGain.gain.value = 0; renderWanted(); if (msg) banner(msg, cls || 'ok', 3); }
function renderWanted(){ const el = $('wantedBox'); el.hidden = !POL.on; el.textContent = '🚨 ' + '⭐'.repeat(POL.heat); }
const snapTo = (list, v) => list.reduce((b, r) => Math.abs(r - v) < Math.abs(b - v) ? r : b, list[0]);
// a path along the road grid: to the nearest east-west road, along it, then up or down the north-south road
function roadPath(from, to){
  const z1 = snapTo(ROADS_Z, from.z), x2 = snapTo(ROADS_X, to.x);
  return [new THREE.Vector3(from.x, 0, z1), new THREE.Vector3(x2, 0, z1), new THREE.Vector3(x2, 0, to.z), new THREE.Vector3(to.x, 0, to.z)];
}
function updatePolice(dt, t){
  if (shotCd > 0) shotCd -= dt;
  if (!POL.on) return;
  if (modeId === 'cash' || state === 'menu'){ polEnd(null); return; }
  const c = chaserCar.position, f = hero.veh ? hero.veh.pos : hero.pos, d = Math.hypot(f.x - c.x, f.z - c.z);
  POL.repath -= dt; if (POL.repath <= 0){ POL.repath = .6; POL.path = d < 18 ? [f.clone()] : roadPath(c, f); }
  const wp = POL.path.find(w => Math.hypot(w.x - c.x, w.z - c.z) > 1) || f, dx = wp.x - c.x, dz = wp.z - c.z, dd = Math.hypot(dx, dz) || 1;
  const sp = (hero.veh ? 18 : 9) + POL.heat * 2; c.x += dx / dd * Math.min(dd, sp * dt); c.z += dz / dd * Math.min(dd, sp * dt); chaserCar.rotation.y = Math.atan2(dx, dz);
  const on = Math.floor(t * 7) % 2 === 0; chaserCar.userData.red.emissiveIntensity = on ? 3 : .2; chaserCar.userData.blue.emissiveIntensity = on ? .2 : 3; if (sirenGain) sirenGain.gain.value = muted ? 0 : .05;
  if (d < 4.2 && (!hero.veh || Math.abs(hero.veh.speed) < 3)){ POL.bustT += dt; if (POL.bustT > .8){ const fine = 40 * POL.heat; hero.money = Math.max(0, hero.money - fine); if (WEAP.cur === 'pistol') setWeapon('none', true); polEnd(`🚔 اتمسكت… دفعت غرامة ${fine} جنيه`, 'bad'); } } else POL.bustT = 0;
  if (d > 130){ POL.lost += dt; if (POL.lost > 5) polEnd('😎 البوليس تاه منك'); } else POL.lost = 0;
  POL.t += dt; if (POL.t > 90) polEnd('😮‍💨 البوليس بطّل يدوّر');
}

// ---------------- طيارة's phone ----------------
const PHONE = { app: 'home' };
const GPS = { on: false, to: null, name: '', path: [], repath: 0 };
function gpsPlaces(){
  const L = [];
  const M = modeId === 'story' ? curM() : null, tg = M && typeof storyTarget === 'function' ? storyTarget() : null;
  if (tg) L.push({ g: 'المهمة', name: `📱 ${M.title}`, pos: tg.clone ? tg.clone() : new THREE.Vector3(tg.x, 0, tg.z) });
  L.push({ g: 'الحتة', name: '☕ قهوة قصر الملوك', pos: PL.cafeOut }, { g: 'الحتة', name: '🏠 بيت طيارة', pos: SPOT.house }, { g: 'الحتة', name: '🏠 بيت شادية', pos: STORY_HOUSES.shadia.door }, { g: 'الحتة', name: '🏠 بيت إسلام', pos: STORY_HOUSES.islam.door }, { g: 'الحتة', name: '🧆 عربية الفول', pos: SPOT.cart });
  for (const s of SHOPS) L.push({ g: 'المحلات', name: `${s.icon} ${s.name}`, pos: s.out });
  L.push({ g: 'إسكندرية', name: '🏰 القلعة', pos: new THREE.Vector3(96, 0, 262) }, { g: 'إسكندرية', name: '🐟 حلقة السمك', pos: new THREE.Vector3(72, 0, 140) }, { g: 'إسكندرية', name: '⚓ الميناء', pos: PORT.door }, { g: 'إسكندرية', name: '🏛️ فيلا الحاج العربي', pos: VILLA.gate }, { g: 'إسكندرية', name: '🚗 معرض العربيات', pos: SHOWROOM.front }, { g: 'إسكندرية', name: '🌊 الكورنيش', pos: PL.corniche }, { g: 'إسكندرية', name: '🔧 ورشة شمس', pos: SPOT.workshop });
  TRAM.stations.forEach((x, i) => L.push({ g: 'إسكندرية', name: `🚋 محطة الترام ${i + 1}`, pos: new THREE.Vector3(x, 0, TRAM.z - 7) }));
  for (const [k, A] of Object.entries(ACTS)) if (A && A.pos && A.label) L.push({ g: 'تسالي', name: A.label, pos: A.pos });
  return L;
}
function gpsSet(p){ GPS.on = true; GPS.to = p.pos.clone(); GPS.name = p.name; GPS.repath = 0; banner(`🗺️ الـ GPS: ${p.name}`, 'info', 2); closePhone(); }
function gpsClear(){ GPS.on = false; GPS.to = null; GPS.path = []; }
function updateGps(dt){
  if (!GPS.on) return; const f = hero.veh ? hero.veh.pos : hero.pos;
  if (Math.hypot(f.x - GPS.to.x, f.z - GPS.to.z) < 7){ banner(`📍 وصلت: ${GPS.name}`, 'ok', 2.2); gpsClear(); return; }
  GPS.repath -= dt; if (GPS.repath <= 0){ GPS.repath = .8; const to = GPS.to; GPS.path = (to.z > NILE_Z + 2) ? [f.clone(), ...roadPath(f, new THREE.Vector3(BRIDGE.x, 0, NILE_Z - 2)).slice(0, 2), new THREE.Vector3(BRIDGE.x, 0, Math.min(to.z, BRIDGE.z1)), to.clone()] : [f.clone(), ...roadPath(f, to)]; }
}
// people in your phone: they appear as you meet them in the story
const CONTACTS = [
  { k: 'moallem', name: 'المعلم عبده', emoji: '🧔', about: 'صاحب قهوة قصر الملوك. بيزعّق كتير… وقلبه أبيض.', calls: ['الوردية يا طيارة!', 'هو انت فين؟ القهوة مليانة!'] },
  { k: 'islam', name: 'إسلام', face: () => CH.islam.img.face, about: 'صاحبك من زمان. دافي، ونفسه في الاستقرار.', calls: ['إيه يا جامد؟ تعالى نلعب دور دومنو.', 'هايدي بتسلّم عليك 😄'], after: 'islamHi' },
  { k: 'kamel', name: 'الحاج كامل', emoji: '👳‍♂️', about: 'قاعد بالشيشة على القهوة من أيام ما الترام كان بتعريفة. هو اللي بيحكي الحكاية.', calls: ['اقعد يا ابني… اقعد.', 'الشاي من غير سكر… زي الدنيا من غير صحاب.'], after: 'domino' },
  { k: 'shadia', name: 'شادية', emoji: '👩', about: 'جارتك. بتصوّر، ونفسها تبقى أشهر مصورة في إسكندرية.', calls: ['الغروب النهارده هيبقى حلو… تيجي؟', 'متنساش تبتسم في الصور 📸'], after: 'laundry' },
  { k: 'landlord', name: 'الحاج محمود', emoji: '👳', about: 'صاحب البيت. الإيجار إيجار.', calls: ['الإيجار يا ابني… الإيجار!'], after: 'wake' },
  { k: 'fathi', name: 'الحاج فتحي', emoji: '🧆', about: 'بتاع الفول والطعمية. علّق يافطة «ممنوع دخول يوسف إبراهيم».', calls: ['الطعمية لسه طالعة من الزيت!'], after: 'foul' },
  { k: 'azzouz', name: 'عزوز', emoji: '👨‍🍳', about: 'صاحب مطعم البيتزا. الطلبات كتير والوقت قليل.', calls: ['عندي طلب مستعجل يا طيارة!'], after: 'azzouz' },
  { k: 'arabi', name: 'العربي', face: () => CH.enemy.img.face, about: 'ابن الحاج العربي. عربية حمرا، ولسان أطول منها.', calls: ['إيه يا صبي القهوة؟ 😏', 'تيجي نتسابق؟'], after: 'arabiArrives' },
  { k: 'youssef', name: 'يوسف إبراهيم', face: () => CH.youssef.img.face, about: 'بيهزر حتى وهو غلطان. ممنوع دخوله نص محلات الحتة.', calls: ['أنا ماخدتش حاجة والله 😅'], after: 'snatch' },
  { k: 'shams', name: 'شمس', face: () => CH.wanted.img.face, about: 'كان أشطر ميكانيكي في المنطقة. دلوقتي… محدش بيشوف وشه.', calls: ['(الرقم مغلق أو غير متاح)'], after: 'poster' },
  { k: 'father', name: 'الحاج العربي', emoji: '🧔', about: 'أبو العربي. عنده نص الميناء ونص سموحة.', calls: ['أهلاً يا طيارة يا ابني.'], after: 'villaFlash' },
  { k: 'officer', name: 'الظابط حسام', emoji: '👮', about: 'ظابط قسم الجمرك. عينه على الحتة.', calls: ['لو شفت حاجة بلّغني على طول.'], after: 'poster' },
  { k: 'haidy', name: 'هايدي', emoji: '👰', about: 'خطيبة إسلام. اتقابلوا في الترام.', calls: ['إسلام بيقول عليك أخوه 😊'], after: 'islamFlash' },
];
const met = c => modeId !== 'story' || SAVE.ended || !c.after || SAVE.m > idx(c.after);
function openPhone(app){
  if (state !== 'play' || CUT.on) return;
  state = 'pause'; for (const k in keys) keys[k] = false; PHONE.app = app || 'home'; renderPhone(); $('phone').hidden = false; tone(880, 1320, .08, 'sine', .05);
}
function closePhone(){ if ($('phone').hidden) return; $('phone').hidden = true; if (state === 'pause') state = 'play'; }
function renderPhone(){
  const P = $('phoneScr'), now = typeof TOD !== 'undefined' ? clockText() : '';
  const top = `<div class="ph-bar"><span>${now}</span><span>📶 🔋 ${egp(hero.money)}</span></div>`;
  const back = t => `<div class="ph-head"><button data-ph="home" aria-label="رجوع">➜</button><b>${t}</b></div>`;
  let h = '';
  if (PHONE.app === 'home'){
    h = top + `<div class="ph-wall"><b>${clockText ? clockText() : ''}</b><small>${DISTRICT_NAMES[districtAt(hero.pos.x, hero.pos.z)] || 'إسكندرية'}</small></div><div class="ph-apps">
      <button data-ph="gps"><span>🗺️</span>الخريطة</button><button data-ph="tasks"><span>📋</span>المهمات</button><button data-ph="people"><span>👥</span>الأسامي</button>
      <button data-ph="ach"><span>🏆</span>الإنجازات</button><button data-ph="cam"><span>📷</span>الكاميرا</button><button data-ph="weap"><span>${WEAPONS[WEAP.cur].icon}</span>السلاح</button></div>`;
  } else if (PHONE.app === 'gps'){
    const L = gpsPlaces(), groups = [...new Set(L.map(p => p.g))];
    h = top + back('🗺️ الخريطة') + (GPS.on ? `<div class="ph-row on"><span>📍 ${GPS.name}</span><button data-gps="clear">شيل</button></div>` : '') + `<div class="ph-list">` + groups.map(g => `<h4>${g}</h4>` + L.map((p, i) => p.g === g ? `<button class="ph-row" data-gpsi="${i}"><span>${p.name}</span><small>${Math.round(hero.pos.distanceTo(p.pos))} م</small></button>` : '').join('')).join('') + `</div>`;
    PHONE.places = L;
  } else if (PHONE.app === 'tasks'){
    const M = modeId === 'story' ? curM() : null;
    h = top + back('📋 المهمات') + `<div class="ph-list">` + (M ? `<div class="ph-card"><small>${CHAPS[M.ch][0]}: ${CHAPS[M.ch][1]}</small><b>📱 ${M.title}</b><p>${storyHud().replace(/<br>.*$/s, '')}</p><button data-gps="mission">🗺️ وديني على المهمة</button></div><div class="ph-card"><small>القصة</small><b>خلّصت ${SAVE.m} من ${MS.length}</b></div>` : modeId === 'story' ? '<div class="ph-card"><b>خلّصت القصة 👑</b></div>' : '<div class="ph-card"><b>لف براحتك</b><p>القصة من القايمة الرئيسية ← كمّل القصة</p></div>')
      + `<h4>تسالي في الحتة</h4>` + Object.values(ACTS).filter(A => A && A.label && A.pos).map(A => `<div class="ph-row"><span>${A.label}</span></div>`).join('') + `</div>`;
  } else if (PHONE.app === 'people'){
    h = top + back('👥 الأسامي') + `<div class="ph-list">` + CONTACTS.map((c, i) => met(c) ? `<div class="ph-contact">${c.face ? `<img src="${c.face()}" alt="">` : `<span class="em">${c.emoji}</span>`}<div><b>${c.name}</b><small>${c.about}</small></div><button data-call="${i}" aria-label="اتصل">📞</button></div>` : `<div class="ph-contact locked"><span class="em">❔</span><div><b>؟؟؟</b><small>لسه ماتعرفتوش</small></div></div>`).join('') + `</div>`;
  } else if (PHONE.app === 'weap'){
    const own = weaponsOwned();
    h = top + back('السلاح') + `<div class="ph-list">` + Object.entries(WEAPONS).map(([k, w]) => own.includes(k) ? `<button class="ph-row${k === WEAP.cur ? ' on' : ''}" data-weap="${k}"><span>${w.icon} ${w.name}</span><small>${w.gun ? 'ضرب نار = بوليس' : w.funny ? 'للهزار' : k === 'none' ? '' : 'ضربة تقيلة'}</small></button>` : `<div class="ph-row locked"><span>🔒 ؟؟؟</span><small>مع القصة</small></div>`).join('') + `<p class="ph-note">الزرار ${WEAPONS[WEAP.cur].icon} جنب 👊 بيبدّل بينهم.</p></div>`;
  }
  P.innerHTML = h;
  P.querySelectorAll('[data-ph]').forEach(b => b.onclick = () => { const a = b.dataset.ph; if (a === 'ach'){ closePhone(); openAch(); return; } if (a === 'cam'){ closePhone(); $('photoBtn').click(); return; } PHONE.app = a; renderPhone(); });
  P.querySelectorAll('[data-gpsi]').forEach(b => b.onclick = () => gpsSet(PHONE.places[+b.dataset.gpsi]));
  P.querySelectorAll('[data-gps]').forEach(b => b.onclick = () => { if (b.dataset.gps === 'clear'){ gpsClear(); renderPhone(); } else { const tg = storyTarget(); if (tg) gpsSet({ name: `📱 ${curM().title}`, pos: tg.clone ? tg.clone() : new THREE.Vector3(tg.x, 0, tg.z) }); else banner('المهمة دي مالهاش مكان', 'info', 1.6); } });
  P.querySelectorAll('[data-call]').forEach(b => b.onclick = () => { const c = CONTACTS[+b.dataset.call]; closePhone(); tone(440, 440, .4, 'sine', .05); setTimeout(() => banner(`📞 ${c.name}: «${rpick(c.calls)}»`, 'info', 3.4), 600); });
  P.querySelectorAll('[data-weap]').forEach(b => b.onclick = () => { setWeapon(b.dataset.weap); renderPhone(); });
}
$('phoneBtn').addEventListener('click', e => { e.stopPropagation(); openPhone(); });
$('phoneClose').onclick = closePhone;
$('weapBtn').addEventListener('pointerdown', e => { e.stopPropagation(); if (state === 'play') cycleWeapon(); });
addEventListener('keydown', e => { if (e.target && e.target.tagName === 'INPUT') return; if (e.code === 'KeyP' && !e.repeat){ if ($('phone').hidden) openPhone(); else closePhone(); } if (e.code === 'KeyG' && !e.repeat && state === 'play') cycleWeapon(); });

// ---------------- more activities (same rules as 19g: one at a time, ✋ to start, ✕ to stop) ----------------
// a meter that runs back and forth; press ✋ while it is in the green
function swing(d, dt, sp){ d.k = (d.k || 0) + dt * sp; return 1 - Math.abs((d.k % 2) - 1); }
const inZone = (v, z) => v >= z[0] && v <= z[1];
const actSigns = [];
function actSign(emoji, label, x, z, y = 3){ const s = signSprite(emoji, label); s.position.set(x, y, z); actSigns.push(s); return s; }
// a ferris wheel on the corniche (ملاهي) and a horse carriage (حنطور)
const WHEEL = { x: -72, z: 133, r: 9, g: null };
{
  const g = new THREE.Group(), p = [];
  for (let i = 0; i < 16; i++){ const a = i / 16 * Math.PI * 2, s = new THREE.CylinderGeometry(.08, .08, WHEEL.r, 6); s.translate(0, WHEEL.r / 2, 0); s.rotateZ(a); p.push(colored(s, '#e0e0e0')); }
  const ring = new THREE.TorusGeometry(WHEEL.r, .18, 6, 40); p.push(colored(ring, '#ffca28'));
  const wheel = new THREE.Mesh(mergeGeometries(p.map(x => x.index ? x.toNonIndexed() : x)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .4, metalness: .4, emissive: 0x332200, emissiveIntensity: .3 })); g.add(wheel); g.userData.wheel = wheel;
  const cabs = []; for (let i = 0; i < 8; i++){ const c = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1, 1.1), new THREE.MeshStandardMaterial({ color: ['#e53935', '#1e88e5', '#43a047', '#fdd835'][i % 4], roughness: .5 })); g.add(c); cabs.push(c); } g.userData.cabs = cabs;
  const legs = []; for (const s of [-1, 1]) for (const dz of [-1, 1]){ const l = new THREE.CylinderGeometry(.15, .2, WHEEL.r + 2.5, 6); l.translate(0, (WHEEL.r + 2.5) / 2, 0); l.rotateZ(s * .32); l.translate(s * 1.8, 0, dz * .6); legs.push(colored(l, '#9e9e9e')); }
  scene.add(new THREE.Mesh(mergeGeometries(legs.map(x => x.index ? x.toNonIndexed() : x)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .5 })).translateX(WHEEL.x).translateZ(WHEEL.z));
  g.position.set(WHEEL.x, WHEEL.r + 2.4, WHEEL.z); scene.add(g); WHEEL.g = g;
  obstacles.push({ minX: WHEEL.x - 4, maxX: WHEEL.x + 4, minZ: WHEEL.z - 1.2, maxZ: WHEEL.z + 1.2 });
  glowSigns.push(signBoard(bigSign('🎡 ملاهي الكورنيش', '#1a237e', '#ffd54f', 640, 120, 60), WHEEL.x, 1.8, WHEEL.z + 1.5, 4, .75, 0, .5));
}
const HANTOUR = { g: null, x0: 20, x1: 230, z: 147.2 };
{
  const g = new THREE.Group(), p = [];
  box(p, 1.6, .8, 2.6, 0, 1.1, -1.2, '#4e342e'); box(p, 1.7, .1, 2.7, 0, 1.55, -1.2, '#ffca28'); box(p, 1.4, .7, .1, 0, 1.9, -2.4, '#4e342e'); box(p, 1.6, .08, 1.4, 0, 2.6, -1.8, '#c62828');
  for (const s of [-1, 1]){ const w = new THREE.CylinderGeometry(.6, .6, .1, 14); w.rotateZ(Math.PI / 2); w.translate(s * .9, .6, -1.4); p.push(colored(w, '#3e2723')); }
  box(p, .5, .7, 1.6, 0, 1.4, 1.2, '#8d6e63'); box(p, .3, .5, .5, 0, 1.95, 2.05, '#8d6e63'); for (const [x, z] of [[-.15, .6], [.15, .6], [-.15, 1.8], [.15, 1.8]]) box(p, .1, 1, .1, x, .55, z, '#6d4c41');
  g.add(new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7 }))); g.position.set(HANTOUR.x0, 0, HANTOUR.z); g.rotation.y = Math.PI / 2; scene.add(g); HANTOUR.g = g;
}
// the taxi and the microbus for the passenger jobs (like the tuktuk)
const taxiVeh = addVehicle('taxi', 92, 136.2, Math.PI, '#161616'); taxiVeh.jobOnly = 'taxi'; taxiVeh.home.y = 0;
const microVeh = (() => {
  const g = new THREE.Group(), p = []; box(p, 2.1, 1.9, 4.8, 0, 1.35, 0, '#f4f4f0'); box(p, 2.12, .35, 4.82, 0, .9, 0, '#1e5aa8'); box(p, 2.14, .7, 3.6, 0, 1.75, -.4, '#22313a'); box(p, 1.9, .7, .06, 0, 1.75, 2.42, '#22313a');
  for (const x of [-.95, .95]) for (const z of [-1.6, 1.6]){ const w = new THREE.CylinderGeometry(.38, .38, .26, 12); w.rotateZ(Math.PI / 2); w.translate(x, .38, z); p.push(colored(w, '#141414')); }
  g.add(new THREE.Mesh(mergeGeometries(p.map(x => x.index ? x.toNonIndexed() : x)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5 }))); scene.add(g);
  const x = 116, z = -10.6, v = { type: 'car', mesh: g, pos: g.position, yaw: Math.PI / 2, speed: 0, steer: 0, max: 18, accel: 7, turn: 1.6, circles: [[1.3, 1.15], [-1.3, 1.15]], home: { x, z, yaw: Math.PI / 2, y: 0 }, jobOnly: 'micro' };
  g.position.set(x, 0, z); g.rotation.y = v.yaw; vehicles.push(v); return v;
})();
const JOB_VEH = { tuk: tukVeh, taxi: taxiVeh, micro: microVeh };
const JOB_NAME = { tuk: '🛺 التوكتوك', taxi: '🚕 التاكسي', micro: '🚐 الميكروباص' };
function startPaxJob(kind){ if (JOB.kind) return; JOB.kind = kind; JOB.count = 0; JOB.earned = 0; newPassenger(); if (!hero.veh) enterVehicle(JOB_VEH[kind]); banner(`${JOB_NAME[kind]}: روح خد الزبون من العلامة الصفرا`, 'info', 3); $('jobEnd').hidden = false; }
const FISH = [['🐟 بوري', 25], ['🐠 دنيس', 40], ['🦐 جمبري', 30], ['🐡 سردين', 12], ['🦀 كابوريا', 20], ['👢 جزمة قديمة 😂', 0]];
Object.assign(ACTS, {
  fishing: { pos: AV((PIER.x0 + PIER.x1) / 2, .15, PIER.z1 - 3), r: 3, label: '🎣 اصطاد سمك من على الرصيف',
    start(d){ d.n = 0; d.got = []; d.phase = 'cast'; hero.locked = true; banner('🎣 ارمي السنارة… ولما تشد، دوس في الأخضر', 'info', 3); },
    update(dt, d){
      ACT.cam = { p: AV(hero.pos.x - 4, 3, hero.pos.z - 4), l: AV(hero.pos.x + 2, .5, hero.pos.z + 8) };
      if (d.phase === 'wait'){ d.t -= dt; actUi('مستني السمكة… 🎣', .5); if (d.t <= 0){ d.phase = 'hook'; d.k = 0; d.zone = [R(.2, .6), 0]; d.zone[1] = d.zone[0] + .22; buzz(40); noise(.15, 1800, .3); banner('🐟 شدّت!! دوس في الأخضر', 'ok', 1.2); d.t = 3.5; } }
      else if (d.phase === 'hook'){ d.t -= dt; d.v = swing(d, dt, 1.3); actUi('اسحب! دوس ✋ في الأخضر', d.v, d.zone); if (d.t <= 0){ banner('السمكة هربت 😬', 'bad', 1.4); d.n++; d.phase = d.n >= 5 ? 'done' : 'cast'; } }
      if (d.phase === 'done'){ const sum = d.got.reduce((s, f) => s + f[1], 0); hero.money += sum; stat('fish', d.got.length); return actEnd(`🎣 طلّعت ${d.got.length} من ٥ · +${sum} جنيه`, d.got.length ? 'ok' : 'info'); }
    },
    action(d){ if (d.phase === 'cast') return { text: '🎣 ارمي السنارة', fn: () => { d.phase = 'wait'; d.t = R(1.5, 4); noise(.1, 800, .2); } }; if (d.phase === 'hook') return { text: '✋ اسحب!', fn: () => { if (inZone(d.v, d.zone)){ const f = rpick(FISH); d.got.push(f); banner(`${f[0]}${f[1] ? ' +' + f[1] : ''}`, 'ok', 1.6); coin(); } else banner('بدري أوي… السمكة فلتت', 'bad', 1.4); d.n++; d.phase = d.n >= 5 ? 'done' : 'cast'; } }; return null; },
    hud: d => `🎣 رمية ${Math.min(d.n + 1, 5)} من ٥ · طلّعت ${d.got.length}<br>${d.got.map(f => f[0].split(' ')[0]).join(' ')}` },
  kite: { pos: AV(-29.4, .15, 88.8), r: 2.2, label: '🪁 اطلع السطح وطيّر طيارة ورق',
    start(d){ d.t = 35; d.v = .5; d.in = 0; d.wind = 0; hero.locked = true; kiteShow(true); KITE.g.position.set(-24, 17, 72); SCENE.lockY = true; hero.pos.set(-24.5, 10.2, 79.5); banner('🪁 خلّي الطيارة في الأخضر: دوس ✋ تشد الخيط', 'info', 3); },
    update(dt, d, t){
      ACT.cam = { p: AV(-30, 13.5, 86), l: AV(-24, 14, 74) }; hero.pos.set(-24.5, 10.2, 79.5); hero.vel.set(0, 0, 0);
      d.t -= dt; d.wind += (Math.sin(t * .9) * .6 + Math.sin(t * 2.3) * .4 - d.wind) * dt; d.v = clamp(d.v - dt * (.18 + d.wind * .12), 0, 1);
      if (inZone(d.v, [.45, .8])) d.in += dt; KITE.g.position.y = 12 + d.v * 10; actUi(`الطيارة في الهوا… ${Math.round(d.in)} ثانية في الأخضر`, d.v, [.45, .8]);
      if (d.v <= 0){ return actEnd('🪁 الطيارة وقعت على سطح الجيران 😂', 'bad'); }
      if (d.t <= 0){ const pay = Math.round(d.in * 2); hero.money += pay; if (d.in > 25) stat('kite'); return actEnd(`🪁 طيّرتها ${Math.round(d.in)} ثانية في العالي · +${pay} جنيه`, 'ok'); }
    },
    action(d){ return { text: '🪁 شد الخيط', fn: () => { d.v = Math.min(1, d.v + .09); } }; },
    hud: d => `🪁 فاضل ${Math.max(0, Math.ceil(d.t))} ثانية · شد الخيط وخليها في الأخضر`,
    end(){ kiteShow(false); SCENE.lockY = false; heroTo2(-29.4, 89.4); } },
  arm: { pos: AV(13.6, .15, 33.6), r: 2, label: '💪 مصارعة إيد مع حمادة على الترابيزة',
    start(d){ d.v = .5; d.t = 0; hero.locked = true; helperShow(12, 31.4, 0, 'حمادة'); say(helper, 'هات إيدك يا طيارة 💪', 2); banner('💪 دوس ✋ بسرعة عشان تكسب', 'info', 2.5); },
    update(dt, d){ ACT.cam = { p: AV(16.5, 2.4, 35.5), l: AV(12.5, 1, 32) }; d.t += dt; d.v = clamp(d.v - dt * (.22 + d.t * .012), 0, 1); actUi('اضغط بسرعة! 💪', d.v, [.85, 1]);
      if (d.v >= 1){ hero.money += 20; stat('arm'); heroCheer(); say(helper, 'إيدك حديد يا جدع!', 2.2); return actEnd('💪 كسبت حمادة! +٢٠ جنيه', 'ok'); }
      if (d.v <= 0){ say(helper, 'روح كُل فول الأول 😂', 2.2); return actEnd('💪 حمادة كسبك…', 'bad'); } },
    action(d){ return { text: '💪 اضغط!', fn: () => { d.v = Math.min(1, d.v + .055); buzz(8); } }; },
    hud: () => '💪 مصارعة إيد: دوس بسرعة لحد ما توصل للأخضر',
    end(){ helperHide(); } },
  gym: { pos: AV(196, .15, -9.6), r: 2.4, label: '🏋️ جيم الأبطال: اتمرّن (١٠ جنيه)',
    start(d){ if (hero.money < 10){ actEnd('محتاج ١٠ جنيه للجيم', 'bad'); return; } hero.money -= 10; d.reps = 0; d.miss = 0; d.k = 0; hero.locked = true; banner('🏋️ دوس ✋ لما المؤشر يبقى في الأخضر', 'info', 2.5); },
    update(dt, d){ if (d.reps === undefined) return; d.v = swing(d, dt, 1.4 + d.reps * .12); actUi(`عدّة ${d.reps}/10`, d.v, [.42, .62]);
      if (d.reps >= 10){ const fit = Math.min(5, (+store.get('ty_fit') || 0) + 1); store.set('ty_fit', String(fit)); stat('gym'); heroCheer(); return actEnd(`🏋️ ١٠ عدّات! نَفَسك بقى أطول (لياقة ${fit}/5)`, 'ok'); }
      if (d.miss >= 3) return actEnd('🏋️ تعبت… كفاية النهارده', 'info'); },
    action(d){ return { text: '🏋️ ارفع!', fn: () => { if (inZone(d.v, [.42, .62])){ d.reps++; hero.cheerT = .5; noise(.1, 500, .2); } else { d.miss++; banner('😮‍💨 تقيلة…', 'bad', .8); } } }; },
    hud: d => `🏋️ ارفع ١٠ مرات في الأخضر · غلط ${d.miss || 0}/3` },
  play: { pos: AV(163.5, .15, 40.6), r: 2.2, label: '🎮 بلايستيشن: ماتش فيفا (٥ جنيه)',
    start(d){ if (hero.money < 5){ actEnd('محتاج ٥ جنيه', 'bad'); return; } hero.money -= 5; d.me = 0; d.him = 0; d.shot = 0; d.k = 0; hero.locked = true; banner('🎮 خمس شوطات… دوس في الأخضر عشان تجيب جون', 'info', 2.5); },
    update(dt, d){ if (d.shot === undefined) return; const z = [.4 - d.shot * .02, .58 - d.shot * .03]; d.v = swing(d, dt, 1.5 + d.shot * .2); d.z = z; actUi(`أنت ${d.me} - ${d.him} الكمبيوتر`, d.v, z);
      if (d.shot >= 5){ const win = d.me > d.him; if (win){ hero.money += 15; stat('fifa'); } return actEnd(win ? `🎮 كسبت ${d.me}-${d.him}! +١٥ جنيه` : `🎮 خسرت ${d.me}-${d.him} 😅`, win ? 'ok' : 'bad'); } },
    action(d){ return { text: '⚽ شوط!', fn: () => { if (inZone(d.v, d.z)){ d.me++; banner('جووول 🎮', 'ok', .9); } else banner('برا 😬', 'bad', .9); if (Math.random() < .45) d.him++; d.shot++; } }; },
    hud: d => `🎮 فيفا · شوطة ${Math.min((d.shot || 0) + 1, 5)} من ٥` },
  ferris: { pos: AV(WHEEL.x + 3.2, .15, WHEEL.z + 2.6), r: 2.4, label: '🎡 اركب الملاهي (١٠ جنيه)',
    start(d){ if (hero.money < 10){ actEnd('محتاج ١٠ جنيه', 'bad'); return; } hero.money -= 10; d.t = 0; hero.locked = true; SCENE.hideHero = true; banner('🎡 بص على إسكندرية من فوق', 'ok', 2.5); },
    update(dt, d){ if (d.t === undefined) return; d.t += dt; const a = d.t * .35, r = WHEEL.r, cx = WHEEL.x, cy = WHEEL.r + 2.4;
      const p = AV(cx + Math.sin(-a) * r, cy - Math.cos(-a) * r + 1.4, WHEEL.z + .9); ACT.cam = { p, l: AV(cx + 40 * Math.sin(d.t * .1), 2, WHEEL.z + 60) }; actUi('🎡', (d.t / 18) % 1);
      if (d.t > 18) return actEnd('🎡 أحلى منظر في إسكندرية', 'ok'); },
    hud: () => '🎡 فوق في السما… استمتع بالمنظر', end(){ SCENE.hideHero = false; } },
  souq: { pos: AV(120, .15, -50.4), r: 2.4, label: '🛍️ سوق الجمعة: فاصل واشتري',
    start(d){ const it = rpick([['📻 راديو قديم', 60], ['⌚ ساعة ماركة (؟)', 90], ['🧥 جاكت جلد', 120], ['🎸 عود', 150], ['📷 كاميرا قديمة', 100]]); d.item = it[0]; d.ask = Math.round(it[1] * R(1.3, 1.7)); d.min = Math.round(it[1] * R(.7, .95)); d.worth = Math.round(it[1] * R(.9, 1.4)); d.round = 0; hero.locked = true; helperShow(120, -52.6, 0, 'البيّاع'); souqPanel(d); },
    update(){}, hud: d => `🛍️ ${d.item || ''} · البيّاع عايز ${d.ask || 0} جنيه`, end(){ helperHide(); if (!$('shop').hidden) closePanel(); } },
  hantour: { pos: AV(HANTOUR.x0 + 2.4, .15, HANTOUR.z - 2.6), r: 2.6, label: '🐴 حنطور على الكورنيش (٢٠ جنيه)',
    start(d){ if (hero.money < 20){ actEnd('محتاج ٢٠ جنيه', 'bad'); return; } hero.money -= 20; d.t = 0; hero.locked = true; SCENE.hideHero = true; banner('🐴 لفّة على الكورنيش', 'ok', 2.5); },
    update(dt, d, t){ if (d.t === undefined) return; d.t += dt; const k = Math.min(1, d.t / 30), x = HANTOUR.x0 + (HANTOUR.x1 - HANTOUR.x0) * k; HANTOUR.g.position.x = x; HANTOUR.g.position.y = Math.abs(Math.sin(t * 6)) * .04;
      if (Math.random() < dt * 1.5) noise(.05, 700, .15); ACT.cam = { p: AV(x - 7, 3.2, HANTOUR.z - 5), l: AV(x + 10, 1.5, HANTOUR.z + 8) };
      if (k >= 1){ hero.pos.set(x, .15, HANTOUR.z - 3); return actEnd('🐴 لفة حلوة على الكورنيش', 'ok'); } },
    hud: () => '🐴 الحنطور ماشي على الكورنيش…', end(){ SCENE.hideHero = false; HANTOUR.g.position.set(HANTOUR.x0, 0, HANTOUR.z); } },
  keepie: { pos: AV(6, .15, 44), r: 2.2, label: '⚽ كورة شراب: نطّط الكورة',
    start(d){ d.n = 0; d.k = 0; hero.locked = true; ball.visible = true; banner('⚽ دوس ✋ لما الكورة تبقى في الأخضر', 'info', 2.5); },
    update(dt, d){ d.v = swing(d, dt, 1.2 + d.n * .08); ball.position.set(hero.pos.x + .4, .3 + (1 - d.v) * 1.6, hero.pos.z + .4); actUi(`نطّة ${d.n}`, d.v, [.8, 1]);
      ACT.cam = { p: AV(hero.pos.x + 3, 2, hero.pos.z + 4), l: AV(hero.pos.x, 1, hero.pos.z) }; },
    action(d){ return { text: '⚽ نطّط', fn: () => { if (d.v >= .8){ d.n++; d.k = 0; noise(.05, 1500, .2); } else { const rec = bestOf('keepie', d.n) ? ' · رقم قياسي!' : ''; hero.money += d.n; actEnd(`⚽ نطّطتها ${d.n} مرة · +${d.n} جنيه${rec}`, d.n >= 10 ? 'ok' : 'info'); } } }; },
    hud: d => `⚽ نطّطت ${d.n} · أحسن رقم ${PROG.best.keepie || 0}`, end(){ ball.visible = false; } },
  taxi: { pos: AV(92, .15, 139), r: 3, label: '🚕 اشتغل على التاكسي', start(){ ACT.kind = null; ACT.d = null; $('actQuit').hidden = true; startPaxJob('taxi'); }, update(){} },
  micro: { pos: AV(116, .15, -14), r: 3, label: '🚐 اشتغل على الميكروباص', start(){ ACT.kind = null; ACT.d = null; $('actQuit').hidden = true; startPaxJob('micro'); }, update(){} },
});
function souqPanel(d){
  const offers = [Math.round(d.ask * .5), Math.round(d.ask * .75), d.ask];
  openPanel(`🛍️ ${d.item}`, [
    ...offers.slice(0, 2).map(o => ({ label: `💬 «آخر كلام… ${o} جنيه؟»`, btn: `${o} ج`, fn: () => souqOffer(d, o) })),
    { label: `✅ موافق على ${d.ask} جنيه`, btn: 'اشتري', dim: hero.money < d.ask, fn: () => souqOffer(d, d.ask) },
    { label: '🚶 مش عايز', btn: 'امشي', fn: () => { closePanel(); actEnd('🛍️ مشيت من غير ما تشتري', 'info'); } },
  ], `البيّاع: «${d.round ? 'خلاص… ' : ''}${d.ask} جنيه وده آخر سعر»`);
}
function souqOffer(d, o){
  if (hero.money < o){ $('shopMoney').textContent = 'معاكش الفلوس دي 😅'; return; }
  if (o >= d.min || o >= d.ask){ closePanel(); hero.money -= o; const gain = d.worth - o; hero.money += d.worth; coin(); if (gain > 0) stat('souq'); say(helper, 'مبروك عليك… كسبتها', 2); return actEnd(`🛍️ اشتريتها بـ ${o} وبعتها بـ ${d.worth} · ${gain >= 0 ? 'كسبت' : 'خسرت'} ${Math.abs(gain)} جنيه`, gain >= 0 ? 'ok' : 'bad'); }
  d.round++; if (d.round >= 3){ closePanel(); say(helper, 'ربنا يسهلك… مش هبيع', 2); return actEnd('🛍️ البيّاع زهق ومشّاك 😂', 'bad'); }
  d.ask = Math.max(d.min, Math.round((d.ask + o) / 2 + R(0, 8))); say(helper, rpick(['لا يا باشا… خسران فيها', 'ده بضاعة أصلي!', 'زوّد شوية بس']), 1.8); souqPanel(d);
}
// signs over the new activities
actSign('🎣', 'صيد', ACTS.fishing.pos.x, ACTS.fishing.pos.z); actSign('🪁', 'طيارة ورق', ACTS.kite.pos.x, ACTS.kite.pos.z - .6); actSign('💪', 'مصارعة إيد', ACTS.arm.pos.x, ACTS.arm.pos.z + .4, 2.6);
actSign('🏋️', 'جيم', ACTS.gym.pos.x, ACTS.gym.pos.z); actSign('🎮', 'بلايستيشن', ACTS.play.pos.x, ACTS.play.pos.z); actSign('🛍️', 'سوق الجمعة', ACTS.souq.pos.x, ACTS.souq.pos.z);
actSign('🐴', 'حنطور', ACTS.hantour.pos.x, ACTS.hantour.pos.z); actSign('⚽', 'كورة شراب', ACTS.keepie.pos.x, ACTS.keepie.pos.z); actSign('🚕', 'تاكسي', ACTS.taxi.pos.x, ACTS.taxi.pos.z, 3.4); actSign('🚐', 'ميكروباص', ACTS.micro.pos.x, ACTS.micro.pos.z, 3.4);
ACH.push(
  { id: 'fish', icon: '🎣', name: 'صياد بحري', desc: 'اصطاد ١٠ سمكات', ok: () => (PROG.stats.fish || 0) >= 10 },
  { id: 'kite', icon: '🪁', name: 'في العالي', desc: 'طيّر الطيارة الورق ٢٥ ثانية في الأخضر', ok: () => (PROG.stats.kite || 0) >= 1 },
  { id: 'arm', icon: '💪', name: 'إيد حديد', desc: 'اكسب مصارعة إيد', ok: () => (PROG.stats.arm || 0) >= 1 },
  { id: 'souq', icon: '🛍️', name: 'تاجر شاطر', desc: 'اكسب فلوس من سوق الجمعة', ok: () => (PROG.stats.souq || 0) >= 1 },
);
// النوّات: in the free mode a storm comes now and then (Alexandria winter)
const NAWA = { t: R(240, 420), left: 0 };
function updateNawa(dt){
  if (modeId !== 'free' || state !== 'play'){ if (NAWA.left > 0){ NAWA.left = 0; setRain(false); } return; }
  if (NAWA.left > 0){ NAWA.left -= dt; if (NAWA.left <= 0){ setRain(false); banner('🌤️ النوّة خلصت', 'info', 2); NAWA.t = R(300, 600); } return; }
  NAWA.t -= dt; if (NAWA.t <= 0){ NAWA.left = R(70, 120); setRain(true); banner('🌧️ نوّة! البحر عالي والمطر نازل', 'info', 3); }
}

// ---------------- first-time tips, and buttons that show only when they do something ----------------
const TUT = [
  { el: () => isTouch ? $('joyHint') : null, at: 'left', text: () => isTouch ? 'اسحب بصباعك هنا عشان تمشي. ولو سحبت لآخره هتجري.' : 'امشي بـ WASD، واجري بـ Shift.' },
  { el: () => $('actBtn'), text: () => isTouch ? 'ده زرار ✋: تركب، تتكلم، تدخل المحلات… بيظهر لما يبقى فيه حاجة تتعمل.' : 'زرار E: تركب، تتكلم، تدخل المحلات.' },
  { el: () => $('punchBtn'), text: () => '👊 تضرب. وجنبه زرار السلاح… الشبشب أول سلاح 😂' },
  { el: () => $('phoneBtn'), text: () => '📱 موبايل طيارة: خريطة بالـ GPS، ومهماتك، والأسامي اللي تعرفهم.' },
  { el: () => $('radar'), text: () => 'الخريطة الصغيرة. النجمة ★ مكان مهمتك… دوس عليها تكبر.' },
  { el: () => $('menuBtn'), text: () => '☰ استراحة: الإعدادات، وتعدّي المهمة، والقايمة.' },
];
const TUTS = { i: -1 };
function tutStart(){ if (store.get('ty_tut') === '1' || TUTS.i >= 0) return; TUTS.i = 0; document.body.classList.add('tut'); tutShow(); }
function tutShow(){
  const s = TUT[TUTS.i]; if (!s){ tutEnd(); return; }
  const el = s.el(), box = $('tutBox'), r = el && el.offsetWidth ? el.getBoundingClientRect() : null;
  $('tutText').textContent = s.text(); $('tutN').textContent = `${TUTS.i + 1}/${TUT.length}`; $('tut').hidden = false;
  const hl = $('tutHl'); if (r){ hl.hidden = false; Object.assign(hl.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' }); } else hl.hidden = true;
  const bw = Math.min(320, innerWidth - 32); let x = r ? r.left + r.width / 2 - bw / 2 : innerWidth / 2 - bw / 2, y = r ? (r.top > innerHeight / 2 ? r.top - 120 : r.bottom + 14) : innerHeight / 2 - 50;
  x = clamp(x, 16, innerWidth - bw - 16); y = clamp(y, 10, innerHeight - 130); Object.assign(box.style, { left: x + 'px', top: y + 'px', width: bw + 'px' });
}
function tutEnd(){ TUTS.i = -2; $('tut').hidden = true; document.body.classList.remove('tut'); store.set('ty_tut', '1'); }
$('tutNext').onclick = () => { TUTS.i++; tutShow(); };
$('tutSkip').onclick = tutEnd;
let ctxT = 0;
function updateContextButtons(dt){
  ctxT -= dt; if (ctxT > 0) return; ctxT = .2;
  const b = document.body;
  if (b.classList.contains('tut') || state !== 'play'){ b.classList.remove('no-act', 'no-punch', 'no-run'); return; }
  b.classList.toggle('no-act', !nearAction && !hero.veh);
  const p = hero.pos, foe = WEAP.cur !== 'none' || (enemy.active && !enemy.ally && enemy.pos.distanceTo(p) < 12) || boss.active || (wanted.active && !wanted.caught) || (thief.active && !thief.caught) || npcs.some(n => (n.thug || n.state === 'walk' || n.state === 'idle' || n.state === 'fight') && n.g.visible && n.g.position.distanceTo(p) < 3.2);
  b.classList.toggle('no-punch', !foe && !hero.veh);
  b.classList.toggle('no-run', !hero.veh && joy.id === null && hero.vel.lengthSq() < .3);
}
let ownT = 0;
function updateStage5(dt, t){ updatePolice(dt, t);
  ownT -= dt; if (ownT <= 0){ ownT = 1; if (WEAP.cur !== 'none' && !weaponsOwned().includes(WEAP.cur)) setWeapon('none', true); } updateGps(dt); updateNawa(dt); updateContextButtons(dt);
  if (WHEEL.g){ WHEEL.g.userData.wheel.rotation.z = t * .35; WHEEL.g.userData.cabs.forEach((c, i) => { const a = t * .35 + i / 8 * Math.PI * 2; c.position.set(Math.sin(-a) * WHEEL.r, -Math.cos(-a) * WHEEL.r - .7, .9); }); }
  const show = modeId === 'free' || modeId === 'story'; for (const s of actSigns) s.visible = show;
  if (state === 'play' && !CUT.on && TUTS.i === -1 && (modeId === 'story' || modeId === 'free') && runTime > 1.5 && store.get('ty_tut') !== '1') tutStart();
}

// ---- 20-story.js ----
// ================= story: طيارة الجامد =================
const STORY_KEY = 'ty_story_v2';
const newStory = () => ({ money: 20, rep: 0, m: 0, time: 9, house: 0, owned: { moto: false, car: false }, acc: {}, wear: {}, up: {}, cnt: {}, ended: false, started: false, introSeen: -1, chSeen: -1, skipped: {} });
function loadStory(){ try { const s = JSON.parse(store.get(STORY_KEY) || 'null'); if (s && typeof s.m === 'number'){ const d = newStory(); return { ...d, ...s, owned: { ...d.owned, ...s.owned }, acc: s.acc || {}, wear: s.wear || {}, up: s.up || {}, cnt: s.cnt || {} }; } } catch(e){} return newStory(); }
let SAVE = loadStory();
const STORY_V = 3;
// replaying a finished mission from the missions screen runs on a copy of the save; the real one is kept in REPLAY.back
const REPLAY = { on: false, back: null, i: -1, last: -1 };
function saveStory(){ if (REPLAY.on) return; SAVE.v = STORY_V; if (modeId === 'story'){ SAVE.money = Math.max(0, Math.round(hero.money)); SAVE.time = TOD.h; } store.set(STORY_KEY, JSON.stringify(SAVE)); }
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
if (hero.d.is3D) Object.assign(ACC, make3DAccessories(hero.d.R));
else {
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
// ---------- story engine ----------
const ST2 = { phase: 'idle', d: { base: {} }, ev: {}, stalkT: 70, npcs: {}, allow: null };
const cnt = k => SAVE.cnt[k] || 0;
const mark = (d, ...ks) => { d.base = d.base || {}; for (const k of ks) d.base[k] = cnt(k); };
const prog = (d, k) => cnt(k) - ((d.base && d.base[k] !== undefined) ? d.base[k] : cnt(k));
function onStoryEvent(type, arg){ if (modeId !== 'story') return; ST2.ev[type] = arg === undefined ? true : arg; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const near = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) < r;
const heroAt = () => hero.veh ? hero.veh.pos : hero.pos;
// named people (low-poly)
const NAMED = { moallem: { i: 40, name: 'المعلم عبده', pos: [24.6, .15, 24.4], yaw: Math.PI }, landlord: { i: 41, name: 'الحاج محمود', pos: [-21.2, .15, 88.6], yaw: 0 }, azzouz: { i: 42, name: 'عزوز', pos: [116.4, .15, 40.6], yaw: 0 }, fathi: { i: 43, name: 'الحاج فتحي', pos: [37.4, .15, 31.8], yaw: -Math.PI/2 }, officer: { i: 44, name: 'الظابط', pos: [34.6, .15, 39.6], yaw: Math.PI }, reda: { i: 45, name: 'الأسطى رضا', pos: [127, .15, -7.6], yaw: Math.PI } };
function setupNamed(){ for (const [k, v] of Object.entries(NAMED)){ const n = npcs[v.i]; if (!n) continue; n.role = 'named'; n.name = v.name; n.state = 'idle'; n.g.visible = true; n.g.position.set(v.pos[0], v.pos[1], v.pos[2]); n.yaw = v.yaw; n.g.rotation.set(0, v.yaw, 0); n.fall = 0; n.downT = 0; ST2.npcs[k] = n; } }
const NP = k => ST2.npcs[k];
// pickups (papers, parts) with a glowing beam
const pickups = [];
const pickMat = new THREE.MeshStandardMaterial({ color: 0xffe082, emissive: 0xffb300, emissiveIntensity: .8, roughness: .4 });
function addPickup(pos, kind='paper'){ const g = new THREE.Group(); const m = new THREE.Mesh(kind === 'part' ? new THREE.TorusGeometry(.22,.08,8,16) : new THREE.BoxGeometry(.4,.04,.3), pickMat); m.position.y = .9; g.add(m); const b = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); b.scale.set(.6, .6, .6); g.add(b); g.position.copy(pos); scene.add(g); const p = { g, m, pos: pos.clone(), got: false }; pickups.push(p); return p; }
function clearPickups(){ for (const p of pickups) scene.remove(p.g); pickups.length = 0; }
function updatePickups(dt, t){ for (const p of pickups){ if (p.got) continue; p.m.rotation.y = t*2; p.m.position.y = .9 + Math.sin(t*3)*.12; if (!hero.veh && near(hero.pos, p.pos, 1.6)){ p.got = true; p.g.visible = false; coin(); buzz(20); banner('✔️ لقيتها', 'ok', 1.2); } } }
// police checkpoints (كمين)
const checkpoints = [];
function addCheckpoint(x, z){ const car = makeCar('#f4f4f4', 'police'); car.position.set(x, 0, z); car.rotation.y = Math.PI/2; const c = { car, pos: V(x, 0, z), r: 10 }; checkpoints.push(c); return c; }
function clearCheckpoints(){ for (const c of checkpoints) scene.remove(c.car); checkpoints.length = 0; }
// wedding decorations
const wedding = new THREE.Group(); wedding.visible = false; scene.add(wedding);
{ const W = V(-72, .15, 33); const p = []; box(p, 8, .5, 3, W.x, .25, W.z + 5.5, '#7b1f3a'); box(p, 8, 3, .1, W.x, 1.8, W.z + 7, '#c2185b'); for (const s of [-1,1]) box(p, .5, 1.6, .5, W.x + s*3.2, 1.3, W.z + 5, '#111');
  for (let r=0;r<3;r++) for (let c=0;c<6;c++) box(p, .44,.5,.44, W.x - 5 + c*2, .25, W.z - 2 - r*1.6, c%2 ? '#f2f0ea' : '#c9302c');
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 })); wedding.add(m);
  const bulbs = []; for (let i=0;i<40;i++){ const x = W.x - 14 + i*.7; bulbs.push({ x, y: 4.2 + Math.sin(i*.45)*.4, z: W.z }); bulbs.push({ x, y: 4.0 + Math.sin(i*.45)*.4, z: W.z - 6 }); }
  const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.2 }), bulbs.length);
  const c = new THREE.Color(); bulbs.forEach((b, i) => { _m.makeTranslation(b.x, b.y, b.z); bm.setMatrixAt(i, _m); c.setHSL((i*.07)%1, .9, .55); bm.setColorAt(i, c); }); wedding.add(bm); }
// arabi's motorcycle (for chapter 5) and شمس's getaway motorcycle
const arabiMoto = addVehicle('moto', 262, 92.5, -Math.PI/2, '#1565c0'); arabiMoto.jobOnly = 'arabi'; arabiMoto.home.y = 0;
const shamsMoto = makeMoto('#212121'); shamsMoto.visible = false;
// شمس as a fighter for the final fight
const boss = { active: false, pos: V(0,0,0), hp: 160, atk: 0, downs: 0, vx: 0, vz: 0 };
function bossTarget(p){ if (!boss.active || wantedD.downT > 0) return null; const d = boss.pos.distanceTo(p); return d < 1.9 ? { boss: true, x: boss.pos.x, z: boss.pos.z } : null; }
function bossHit(big){ boss.hp -= big ? 34 : 18; wantedD.hitT = .45; thwack(); say(wanted, rpick(['آه!','ماشي يا طيارة!','لسه بدري!']), 1, 'angry'); if (boss.hp <= 0){ boss.downs++; boss.hp = 160; wantedD.downT = 3.5; say(wanted, boss.downs >= 2 ? 'خلاص… خلاص!' : 'قوم يا شمس… قوم', 2, 'angry'); } }
function updateBoss(dt, t){
  if (!boss.active) return;
  const p = boss.pos, tg = hero.pos, dx = tg.x - p.x, dz = tg.z - p.z, dist = Math.hypot(dx, dz); boss.vx = boss.vz = 0;
  if (wantedD.downT <= 0 && !CUT.on){
    if (dist > 1.2){ const sp = 6.2 * DIFF.enemySpd; boss.vx = dx/dist*sp; boss.vz = dz/dist*sp; moveWithSlide(p, boss.vx*dt, boss.vz*dt); }
    else { boss.atk -= dt; if (boss.atk <= 0){ boss.atk = 1.0; wantedD.punchT = .28; setTimeout(() => { if (boss.active && wantedD.downT <= 0 && boss.pos.distanceTo(hero.pos) < 1.8) heroDamage(10 * DIFF.dmg, 'enemy'); }, 130); } }
  }
  wantedD.root.position.copy(p); animDoll(wantedD, boss.vx, boss.vz, dt, t);
}
// arabi: stalks طيارة anywhere (hostile chapters) or walks next to him (ally chapters)
function allyUpdate(dt){
  const p = enemy.pos;
  if (hero.veh || HOUSE.inside){ enemy.d.root.visible = false; enemy.vel.set(0,0,0); return; }
  if (!enemy.d.root.visible){ enemy.d.root.visible = true; p.set(hero.pos.x + 1.6, hero.pos.y, hero.pos.z + .8); }
  const thug = npcs.find(n => n.thug && !n.thugDone && n.state === 'fight' && n.g.position.distanceTo(p) < 14);
  const tg = thug ? thug.g.position : V(hero.pos.x + 1.4, 0, hero.pos.z + .6);
  const dx = tg.x - p.x, dz = tg.z - p.z, d = Math.hypot(dx, dz); let vx = 0, vz = 0;
  if (d > (thug ? 1.1 : 1.8)){ const sp = d > 8 ? 8 : 5.2; vx = dx/d*sp; vz = dz/d*sp; moveWithSlide(p, vx*dt, vz*dt); if (d > 30) p.set(hero.pos.x + 1.4, hero.pos.y, hero.pos.z + .6); }
  else if (thug){ enemy.atk -= dt; if (enemy.atk <= 0){ enemy.atk = 1.1; enemy.d.punchT = .28; setTimeout(() => { if (thug.state === 'fight') npcHit(thug, 0); }, 120); } }
  p.y += (groundY(p.x, p.z) - p.y) * damp(15, dt); enemy.d.root.position.copy(p); enemy.vel.set(vx, 0, vz);
}
function arabiHide(){ enemy.active = false; enemy.d.root.visible = false; enemy.state = 'roam'; }
function arabiAppear(pos, chase=true){ enemy.active = true; enemy.d.root.visible = true; enemy.pos.copy(pos); enemy.hp = enemy.maxHp || 100; enemy.d.downT = 0; enemy.cd = 0; enemy.state = chase ? 'chase' : 'roam'; const bi = blocksInfo.findIndex(b => Math.abs(pos.x-b.cx) < 26 && Math.abs(pos.z-b.cz) < 26); enemy.block = bi < 0 ? 0 : bi; enemy.t = 0; if (chase) say(enemy, rpick(['انت تاني يا طيارة!','لقيتك!','فاكر إنك هتستخبى مني؟']), 2.5, 'angry'); }
function updateStalker(dt){
  if (!storyHostile() || ST2.d.enemyBusy || CUT.on) return;
  const busy = HOUSE.inside || JOB.kind || modeObj.job || ST.kind || hero.locked;
  if (busy){ if (enemy.active && !ST2.d.enemyBusy) arabiHide(); return; }
  const f = heroAt();
  if (enemy.active){
    if (enemy.d.downT > 0){ ST2.downT = (ST2.downT || 0) + dt; if (ST2.downT > 5){ ST2.downT = 0; arabiHide(); ST2.stalkT = R(110, 190); } return; }
    if (enemy.pos.distanceTo(f) > 75){ ST2.lostT = (ST2.lostT || 0) + dt; if (ST2.lostT > 5){ ST2.lostT = 0; arabiHide(); ST2.stalkT = R(60, 110); banner('هربت من العربي 😎', 'ok', 2); } } else ST2.lostT = 0;
    return;
  }
  ST2.stalkT -= dt; if (ST2.stalkT > 0) return;
  ST2.stalkT = R(40, 70); const p = randomSidewalkPoint(32, f); if (p.distanceTo(f) > 60) return;
  arabiAppear(p); banner('⚠️ العربي ظهر! اهرب أو واجهه', 'bad', 2.5);
}
function pickDrink(){ const M = MS[SAVE.m]; if (modeId === 'story' && M && ST2.phase === 'active'){ if (M.id === 'coffee' && Math.random() < .6) return 'قهوة'; if (M.id === 'tea' && Math.random() < .7) return 'شاي'; } return rpick(DRINKS); }
function storyAllowsThief(){ return modeId === 'story' && !SAVE.ended && SAVE.m > idx('islam') && SAVE.m <= idx('ringPhoto') && !ST2.d.noThief && ST2.phase === 'active'; }
function signLevel(){ return SAVE.ended ? .05 : SAVE.m > idx('islam') ? 1 : SAVE.m > idx('pizzaThief') ? .45 : SAVE.m > idx('snatch') ? .15 : 0; }
// ---------- missions: 8 chapters and the ending (about 60 missions), told by الحاج كامل ----------
const CHAPS = [['البداية','الحكاية'], ['الفصل الأول','صباح في بحري'], ['الفصل التاني','لقمة العيش'], ['الفصل التالت','العربي'], ['الفصل الرابع','الساندوتش الطاير'], ['الفصل الخامس','شمس'], ['الفصل السادس','الفخ'], ['الفصل السابع','ليلة الفرح'], ['الفصل التامن','الكوبري والقلعة'], ['الختام','الجامد']];
// the mission order before the story was rewritten (stage 4): old saves are moved to the same place in the new story
const OLD_ORDER = ["wake", "toCafe", "islamHi", "tea", "coffee", "rush", "spill", "domino", "wages", "rent", "foul", "azzouz", "pizza3", "flatTire", "tuk", "buyMoto", "race", "reno1", "snatch", "pizzaThief", "tail", "paper", "islam", "poster", "sayed", "clues", "nightWorkshop", "evidence", "checkpoints", "sighting", "arabiHelp", "parts", "thugs", "returnMoto", "friendRace", "invite", "weddingNight", "dance", "shamsWedding", "plan", "chase", "bossFight", "confess", "epilogue"];
const OLD_TO_NEW = { sayed: 'clues', arabiHelp: 'refuseDeal', parts: 'refuseDeal', thugs: 'refuseDeal', returnMoto: 'refuseDeal', friendRace: 'refuseDeal', tuk: 'buyMoto' };
const L = (who, text) => ({ say: who, text });
const shot = (p, dx=2.6, dy=1.3, dz=3.6, t=1.3) => ({ cam: [p.x+dx, (p.y||0)+dy+.4, p.z+dz], look: [p.x, (p.y||0)+1.45, p.z], t });
function heroTo(x, z){ if (hero.veh) exitVehicle(true); if (!HOUSE.inside) [x, z] = freeSpot(x, z); hero.pos.set(x, groundY(x, z), z); hero.vel.set(0,0,0); hero.knock.set(0,0,0); lookAt.copy(hero.pos); }
const npcAt = k => NP(k) ? NP(k).g.position : V(0,0,0);
const yEnt = { d: youssefD }, sEnt = { d: wantedD }, aEnt = { d: enemyD }, iEnt = { d: islamD };
const PL = { cafeIn: V(22.6,.15,25.4), cafeOut: V(20,.15,39), domino: V(30,.15,27.2), cart: V(35.6,.15,33.4), house: V(-24,.15,90), azz: V(119,.15,42.6), tuk: V(126,.15,-6.4), ws: V(260,.15,90.4), police: V(31,.15,40), wed: V(-72,.15,33), shop: SHOP.pos, corniche: V(168,.15,150) };
const reachU = (p, r=4) => () => near(heroAt(), p(), r);
const talkU = k => () => !!NP(k) && near(heroAt(), npcAt(k), 2.8);
const nPick = (d, n) => `(${pickups.filter(p => p.got).length}/${n})`;
const allPicked = () => pickups.length > 0 && pickups.every(p => p.got);
const nearestPick = () => { const f = heroAt(); let b = null, bd = 1e9; for (const p of pickups){ if (p.got) continue; const dd = p.pos.distanceTo(f); if (dd < bd){ bd = dd; b = p.pos; } } return b; };
const waitNight = (pos, r=14) => (p) => (!isNight() && near(p, pos(), r)) ? { text: '⏳ استنى لحد بالليل', fn: () => fadeTo(() => { applyTimeOfDay(21); SAVE.time = 21; banner('الدنيا ليلت 🌙', 'info', 2); }, .8) } : null;
function sidewalkNear(c, rad){ for (let i=0;i<60;i++){ const a = Math.random()*Math.PI*2, r = rad*(.6 + Math.random()*.6), x = c.x + Math.sin(a)*r, z = c.z + Math.cos(a)*r; if (inWorld(x, z) && !staticBlocked(x, z, .5)) return V(x, groundY(x, z), z); } return c.clone(); }
// --- arabi races on his own motorcycle along a road path ---
function ghostStart(d, moto, doll, path, speed){
  const mesh = moto.mesh || moto; mesh.visible = true; mesh.position.set(path[0][0], 0, path[0][1]);
  doll.root.visible = true; doll.P.legL.visible = doll.P.legR.visible = false; doll.blob.visible = false; doll.downT = 0;
  d.gh = { moto, mesh, doll, path, i: 1, speed, yaw: Math.atan2(path[1][0]-path[0][0], path[1][1]-path[0][1]) }; ghostPose(d.gh, 0);
}
function ghostPose(g, dt){ const p = g.mesh.position; g.mesh.rotation.set(0, g.yaw, 0); if (g.moto.mesh) g.moto.yaw = g.yaw; p.y = groundY(p.x, p.z); g.doll.root.position.set(p.x - Math.sin(g.yaw)*.25, p.y + .86 - g.doll.hipY, p.z - Math.cos(g.yaw)*.25); g.doll.faceYaw = g.yaw; animDoll(g.doll, 0, 0, dt, runTime); }
function ghostStep(g, dt, sp){
  if (g.i < g.path.length){ const p = g.mesh.position, [tx, tz] = g.path[g.i], dx = tx - p.x, dz = tz - p.z, dd = Math.hypot(dx, dz), s = sp*dt;
    if (dd <= s){ p.x = tx; p.z = tz; g.i++; } else { p.x += dx/dd*s; p.z += dz/dd*s; }
    if (dd > .01) g.yaw = lerpAngle(g.yaw, Math.atan2(dx, dz), damp(7, dt)); }
  ghostPose(g, dt); return g.i >= g.path.length;
}
function ghostEnd(d){ const g = d.gh; if (!g) return; g.doll.P.legL.visible = g.doll.P.legR.visible = true; g.doll.blob.visible = true; g.doll.root.visible = false; if (!g.moto.mesh) g.mesh.visible = false; d.gh = null; }
const pathLen = path => path.slice(1).reduce((s, p, i) => s + Math.hypot(p[0]-path[i][0], p[1]-path[i][1]), 0);
function raceM(o){
  return { ...o, spawn: PL.cafeOut,
    text: d => !d.go ? (hero.veh && hero.veh.type === 'moto' ? 'قرّب بالموتوسيكل من العربي… السباق هيبدأ لوحده 🏁' : 'اركب موتوسيكلك وقف جنب العربي قدام القهوة (★)') : `🏁 السباق لـ${o.goalName}! فاضل ${Math.max(0, Math.ceil(d.t))} ثانية`,
    target: d => d.go ? o.goal : arabiMoto.pos,
    start(d){ d.enemyBusy = true; arabiHide(); const sp = 14 * DIFF.enemySpd; d.t = pathLen(o.path) / sp * 1.6; ghostStart(d, arabiMoto, enemyD, o.path, sp); d.go = false; d.cd = null; d.noThief = true; },
    update(dt, d){
      const g = d.gh; if (!g) return;
      if (!d.go){ ghostPose(g, dt);
        if (hero.veh && hero.veh.type === 'moto' && near(hero.veh.pos, g.mesh.position, d.cd == null ? 14 : 40)){ const prev = d.cd ?? 3.99; d.cd = prev - dt; if (Math.ceil(d.cd) !== Math.ceil(prev)){ banner(d.cd > 0 ? `${Math.ceil(d.cd)}…` : '🏁 يلا!!', 'info', 1); tone(d.cd > 0 ? 440 : 880, d.cd > 0 ? 440 : 880, .2, 'square', .09); } if (d.cd <= 0){ d.go = true; say(aEnt, o.taunt, 2.5, 'angry'); } }
        else d.cd = null; return; }
      d.t -= dt; const arrived = ghostStep(g, dt, g.speed);
      if (near(heroAt(), o.goal, 9)) return true;
      if (arrived){ d.failMsg = 'العربي وصل قبلك'; return 'fail'; }
      if (d.t <= 0){ d.failMsg = 'الوقت خلص'; return 'fail'; }
    },
    cleanup(d){ ghostEnd(d); parkArabiMoto(); } };
}
function parkArabiMoto(){
  if (hero.veh === arabiMoto) return; const atWs = false;
  const [x, z, y] = atWs ? [262, 92.5, -Math.PI/2] : [25.6, 43.3, Math.PI/2]; arabiMoto.pos.set(x, 0, z); arabiMoto.yaw = y; arabiMoto.mesh.rotation.set(0, y, 0); arabiMoto.speed = 0;
}
// --- thugs (شمس's men) ---
function spawnThugs(d){
  d.thugs = [36, 37, 38].map(i => { const n = npcs[i]; const p = sidewalkNear(hero.pos, 9); n.role = 'thug'; n.thug = true; n.thugHits = 0; n.thugDone = false; n.g.visible = true; n.g.position.copy(p); n.state = 'fight'; n.fightT = 999; n.downT = 0; n.fall = 0; n.name = 'واحد من رجالة شمس'; return n; });
  d.thugs.forEach((n, k) => npcWear3D(n, k === 1 ? 'soldier' : 'thug'));   // شمس's men in 3D when the models are there
  say(d.thugs[0], 'إنتوا بتعملوا إيه هنا؟!', 2.5, 'angry');
}
function clearThugs(d){ (d.thugs || []).forEach(n => { npcTakeOff3D(n); n.thug = false; n.thugDone = false; n.state = 'hidden'; n.g.visible = false; n.role = null; n.g.rotation.x = 0; }); d.thugs = null; }

// ---- places and people used by the story (Alexandria) ----
const PL2 = { shadia: STORY_HOUSES.shadia.door, shadiaOut: V(-35, .15, 88), houseOut: V(-24, .15, 89), wall: V(60, .15, 152.3), villa: V(VILLA.cx - 4, .15, VILLA.cz + 6), port: V(PORT.door.x, .15, PORT.door.z + 2), portIn: PORT.inside, pier: V((PIER.x0 + PIER.x1) / 2, .15, 160), showroom: SHOWROOM.front, fortGate: V(96, .15, 262), fortIn: V(96, .15, 271), market: V(147, .15, -40), tramStop: V(72, .15, -53.6), wed: V(-72, .15, 33), roof: V(-24, 10.2, 79) };
const shEnt = { d: shadiaD }, fEnt = { d: fatherD }, lEnt = { d: leatherD }, kEnt = { d: kamelD || islamD };
const KN = id => ({ narr: id });
const camAt = (x, y, z, lx, ly, lz, t = 1.3) => ({ cam: [x, y, z], look: [lx, ly, lz], t });
const hideHero = () => ({ do: () => { SCENE.hideHero = true; } });
// before the very first chapter: الحاج كامل at the café starts the story
const PROLOGUE = () => [ hideHero(), camAt(33.5, 2.1, 30.2, 29.2, 1.15, 25.5, 0), { wait: .6 }, KN('kamel_00_1'), KN('kamel_00_2'), KN('kamel_00_3'), { do: () => { SCENE.hideHero = false; } } ];
const CHAP_NARR = { 1: 'kamel_01_1', 2: 'kamel_02_1', 3: 'kamel_03_1', 6: 'kamel_06_1', 8: 'kamel_08_1' };
// a car that drives away along a path, faster when you are near and slower when you fall back (the stolen red car)
function carRunStep(d, dt){
  const g = d.run, v = g.v, p = v.pos, [tx, tz] = g.path[Math.min(g.i, g.path.length - 1)], dx = tx - p.x, dz = tz - p.z, dd = Math.hypot(dx, dz), dist = heroAt().distanceTo(p);
  const sp = (dist > 70 ? 8 : dist > 35 ? 14 : 19) * DIFF.enemySpd, s = sp * dt;
  if (g.i < g.path.length){ if (dd <= s){ p.x = tx; p.z = tz; g.i++; } else { p.x += dx / dd * s; p.z += dz / dd * s; } if (dd > .01) v.yaw = lerpAngle(v.yaw, Math.atan2(dx, dz), damp(6, dt)); }
  v.mesh.rotation.set(0, v.yaw, 0); d.dist = dist; return g.i >= g.path.length;
}
// شمس's launch in the harbour: it runs along a path over the water
function launchRunStep(d, dt){
  const g = d.lr, p = shamsLaunch.position, [tx, tz] = g.path[Math.min(g.i, g.path.length - 1)], dx = tx - p.x, dz = tz - p.z, dd = Math.hypot(dx, dz), dist = heroAt().distanceTo(p);
  const sp = (dist > 60 ? 7 : dist > 25 ? 13 : 15.5) * DIFF.enemySpd, s = sp * dt;
  if (g.i < g.path.length){ if (dd <= s){ p.x = tx; p.z = tz; g.i++; } else { p.x += dx / dd * s; p.z += dz / dd * s; } if (dd > .01) g.yaw = lerpAngle(g.yaw, Math.atan2(dx, dz), damp(4, dt)); }
  shamsLaunch.rotation.set(0, g.yaw, Math.sin(runTime * 3) * .04); p.y = -.9 + Math.sin(runTime * 2) * .08; d.dist = dist; return g.i >= g.path.length;
}

const MS = [
  // ===== الفصل الأول: صباح في بحري =====
  { id: 'wake', ch: 1, title: 'صباح الخير يا طيارة', prologue: true, par: 40,
    intro: () => [ { cam: [-400.4, 2.2, -397.7], look: [-404, .8, -400.6], t: 0 }, { wait: .6 },
      L('phone', '📱 المعلم عبده: انت فين يا طيارة؟! الوردية بدأت من ساعة!'),
      L('tayara', 'يا نهار أبيض… نمت تاني!'),
      { do: () => { noise(.12, 300, .5); setTimeout(() => noise(.12, 300, .5), 250); shake = .25; } },
      L('landlord', '(بيخبط على الباب) يا طيارةةة! الإيجار متأخر شهرين يا ابني!'),
      L('landlord', 'آخر الأسبوع يا ١٠٠ جنيه يا تلم هدومك وتمشي. أنا مش جمعية خيرية!'),
      L('tayara', 'حاضر يا حاج محمود… ربنا يسهلها.'),
      L('tayara', 'يلا يا طيارة… النهارده يوم جديد. هنبقى الجامد 👑') ],
    text: () => 'اخرج من البيت 🚪 (الباب ورا)', target: () => HOUSE.inside ? HOUSE_SPOTS.door : null,
    update: () => !!ST2.ev.exitHouse || !HOUSE.inside },
  { id: 'laundry', ch: 1, title: 'الغسيل', par: 60,
    intro: () => [ { do: () => { heroTo(PL2.houseOut.x, PL2.houseOut.z); const sh = new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.1), new THREE.MeshStandardMaterial({ color: 0x5b8fd6, side: THREE.DoubleSide, roughness: .9 })); scene.add(sh); SCENE.shirt = sh; tween(1.6, k => { sh.position.set(-35 + 11 * k, 10 - 8.1 * k * k, 87 + 2 * k); sh.rotation.set(k * 5, k * 3, k * 2); }, () => { sh.position.set(hero.pos.x, 1.9, hero.pos.z); sh.rotation.set(-1.4, 0, 0); noise(.15, 500, .2); }); } },
      camAt(-18, 3.4, 95, -26, 2.6, 87, 1.4), { wait: 1.2 },
      L('tayara', 'إيه ده؟! قميص… نازل عليّا من السما؟'),
      { do: () => showActor(shadiaD, PL2.shadiaOut.x, PL2.shadiaOut.z) }, { walk: [shadiaD, -28.5, 88.6, 2.2] },
      L('shadia', 'يا نهار أبيض! القميص بتاعي… معلش والله، الهوا شاله.'),
      L('tayara', 'ولا يهمك… ده أحلى حاجة وقعت عليّا من شهور 😅'),
      L('shadia', 'انت طيارة؟ اللي بيقولوا عليه في القهوة؟'),
      L('tayara', 'هو بعينه… بس اللي بيقولوه نصه كدب.'),
      L('shadia', 'طب هات القميص… ولا هتاخده تذكار؟ 😄'),
      { do: () => { if (SCENE.shirt){ scene.remove(SCENE.shirt); SCENE.shirt = null; } hideActor(shadiaD); } } ],
    text: () => 'رجّع القميص لشادية عند باب بيتها (★) جنب بيتك', target: () => PL2.shadiaOut, update: reachU(() => PL2.shadiaOut, 2.6),
    outro: () => [ { do: () => showActor(shadiaD, PL2.shadiaOut.x, PL2.shadiaOut.z - .6) }, shot(PL2.shadiaOut, 2.4, 1.1, 3.2),
      L('shadia', 'شكراً يا طيارة. أنا شادية… جارتك من ساعة ما نقلنا.'),
      L('shadia', 'وبصوّر… الكاميرا دي حياتي كلها. يوم من الأيام هبقى أشهر مصورة في إسكندرية.'),
      L('tayara', 'وأنا يوم من الأيام هبقى صاحب القهوة… يبقى نتقابل على القمة 😎'),
      L('shadia', 'روح يا عم القمة… المعلم عبده بيزعّق من الصبح 😂'), { do: () => hideActor(shadiaD) } ] },
  { id: 'toCafe', ch: 1, title: 'على القهوة', par: 70,
    text: () => 'روح قهوة قصر الملوك (★). بعيدة؟ اركب توكتوك من المحطة 🚏 اللي جنب البيت.', target: () => PL.cafeOut,
    update: reachU(() => PL.cafeOut, 6),
    outro: () => [ { do: () => heroTo(PL.cafeIn.x - 1.5, PL.cafeIn.z + .4) }, shot(npcAt('moallem'), -2.6, 1, 3.2),
      L('moallem', 'أهلاً بالبيه! ده لو ميت كان جه بدري 😒'),
      L('tayara', 'معلش يا معلم… المنبه بايظ.'),
      L('moallem', 'المنبه بايظ ولا انت اللي بايظ؟ يلا… سلّم على صاحبك الأول، وبعدين عندي ليك درس.') ] },
  { id: 'islamHi', ch: 1, title: 'إسلام', par: 40,
    text: () => 'إسلام قاعد على ترابيزة الدومنو… سلّم عليه (★)', target: () => SPOT.domino,
    update: reachU(() => SPOT.domino, 2.8),
    outro: () => [ shot(SPOT.domino, 2.4, 1.1, 3),
      L('islam', 'طيارة! أخيراً يا عم 😂 المعلم كان هيعلّق صورتك على الحيطة ومكتوب عليها «مفقود».'),
      L('tayara', 'ههه… إيه الأخبار يا إسلام؟ وشك منوّر كده ليه؟'),
      L('islam', 'عندي خبر حلو أوي… بس مش دلوقتي. اشتغل الأول قبل ما المعلم يرفدك 😄') ] },
  { id: 'tea', ch: 1, title: 'درس الشاي', at: () => SPOT.counter, atR: 6, goText: 'روح للمعلم عبده عند النَصبة (★)', par: 150,
    intro: () => [ shot(npcAt('moallem'), -2.4, 1, 3),
      L('moallem', 'بص يا طيارة… الشاي عندنا ليه أصول، وأنا هقولهالك خطوة خطوة.'),
      L('moallem', '١- ادخل النَصبة. ٢- حط الشاي والميه في البراد وسيبه يغلي. ٣- صب في الكوباية. ٤- حط السكر على مزاج الزبون وقلّب.'),
      L('moallem', 'سادة يعني من غير سكر، مظبوط معلقتين، زيادة تلاتة. وكل زبون فوق راسه طلبه والوقت بتاعه.'),
      L('moallem', 'قدّم ٣ كوبايات شاي… ووريني الشطارة.') ],
    start: d => mark(d, 'tea'), text: d => `اشتغل وردية (E عند النَصبة ☕) وقدّم ٣ شاي (${Math.min(prog(d,'tea'),3)}/3)`, target: () => modeObj.job ? null : SPOT.counter,
    update: (dt, d) => prog(d, 'tea') >= 3,
    outro: () => [ L('moallem', 'ماشي… مش وحش. الشاي اتشرب على الأقل 😏') ] },
  { id: 'coffee', ch: 1, title: 'درس القهوة', par: 150,
    intro: () => [ L('moallem', 'القهوة غير الشاي يا طيارة. البن والسكر في الكنكة مع الميه، وعلى النار.'),
      L('moallem', 'مظبوط يعني معلقة سكر، وزيادة معلقتين. وأول ما توش وتعلى، شيلها قبل ما تفور!'),
      L('moallem', 'قدّم ٢ قهوة.') ],
    start: d => mark(d, 'coffee'), text: d => `قدّم ٢ قهوة ☕ (${Math.min(prog(d,'coffee'),2)}/2) · لو الوردية خلصت ابدأ واحدة جديدة من النَصبة`, target: () => modeObj.job ? null : SPOT.counter,
    update: (dt, d) => prog(d, 'coffee') >= 2 },
  { id: 'domino', ch: 1, title: 'دومنو الحاج كامل', at: () => SPOT.domino, atR: 4, goText: 'الحاج كامل بيناديك على ترابيزة الدومنو (★)', par: 600,
    intro: () => [ shot(SPOT.domino, -2.4, 1.1, 3),
      L('sayed', 'اقعد يا طيارة… الدومنو بيعلّم الصبر، والصبر هو اللي بيعمل الرجالة.'),
      L('sayed', 'اللي معاه الدش يفتح أول دور. اللي يخلّص حجارته ياخد نِمر اللي قصاده… متقرّبة لأقرب عشرة، والماتش لـ ٢٥٠.'),
      L('sayed', 'ولو الدور قفل، اللي نِمره أقل ياخد نِمر التاني. والكسبان هو اللي يفتح اللي بعده.'),
      L('sayed', 'العب لوحدك قصادي، أو انت وإسلام قصاد شمس والعربي… اختار.') ],
    start: d => mark(d, 'dom'), text: () => 'اكسب ماتش دومنو (E عند الترابيزة) 🎲', target: () => SPOT.domino,
    update: (dt, d) => prog(d, 'dom') >= 1,
    outro: () => [ L('sayed', 'برافو عليك… إيدك خفيفة زي أبوك الله يرحمه.'), KN('kamel_01_end') ] },

  // ===== الفصل التاني: لقمة العيش =====
  { id: 'rush', ch: 2, title: 'زحمة الضهر', par: 160,
    intro: () => [ L('moallem', 'الضهر جه والقهوة هتتملي! وصّل ٦ طلبات في وردية واحدة.'), L('moallem', 'ولو ٣ زباين مشيوا زعلانين… هتروّح من غير يومية!') ],
    start: d => { mark(d, 'ahwa'); d.jobSeen = false; }, text: d => `وردية واحدة: وصّل ٦ طلبات (${Math.min(prog(d,'ahwa'),6)}/6) من غير ما ٣ يزعلوا`, target: () => modeObj.job ? null : SPOT.counter,
    update: (dt, d) => { if (modeObj.job === 'ahwa') d.jobSeen = true; if (prog(d, 'ahwa') >= 6) return true; if (d.jobSeen && !modeObj.job){ d.failMsg = 'الوردية خلصت قبل ٦ طلبات'; return 'fail'; } } },
  { id: 'wages', ch: 2, title: 'اليومية', reward: 60, par: 40,
    text: () => 'خد يوميتك من المعلم عبده (★)', target: () => npcAt('moallem'), update: talkU('moallem'),
    outro: () => [ shot(npcAt('moallem'), -2.4, 1, 3),
      L('moallem', 'خد يا سيدي… ٦٠ جنيه يوميتك. تعبت النهارده.'),
      L('tayara', 'تسلم يا معلم… هو صحيح فيه ناس عايزة تشتري القهوة؟ سمعت الزباين بيتكلموا.'),
      L('moallem', 'كلام كتير يا ابني… فيه ناس عندها فلوس وفاكرة إن كل حاجة بتتباع.'),
      L('moallem', 'القهوة دي أبويا فتحها، ومش هتتقفل وأنا عايش. روح شوف رزقك.') ] },
  { id: 'rent', ch: 2, title: 'الإيجار', par: 240,
    text: () => `ادفع الإيجار ١٠٠ جنيه للحاج محمود عند البيت (★) · معاك ${egp(hero.money)}`, target: () => npcAt('landlord'),
    action: (p, d) => near(p, npcAt('landlord'), 2.8) ? { text: 'ادفع الإيجار (١٠٠ جنيه)', fn: () => { if (hero.money < 100){ banner(`محتاج ${egp(100 - hero.money)} كمان… اشتغل في القهوة أو العب دومنو`, 'bad', 3); buzz(40); return; } hero.money -= 100; coin(); d.paid = true; } } : null,
    update: (dt, d) => !!d.paid,
    outro: () => [ shot(npcAt('landlord'), 2.4, 1, 3),
      L('landlord', 'بارك الله فيك يا ابني… كنت عارف إنك راجل.'),
      L('landlord', 'بس البيت ده عايز يتظبط شوية. لو حوّشت، جدّده من الترابيزة اللي جوه.') ] },
  { id: 'foul', ch: 2, title: 'عربية الفول', at: () => PL.cart, atR: 6, goText: 'الحاج فتحي بتاع الفول عايزك (★)', par: 200,
    intro: () => [ shot(npcAt('fathi'), 2.4, 1, 3),
      L('fathi', 'إيه يا طيارة! عايز تزوّد دخلك؟ تعالى ساعدني على العربية.'),
      L('fathi', 'الطلب مكتوب فوق كل زبون. الفول في الطبق وعليه اللي طالبه، والطعمية تتقلي لحد ما تحمر… متسيبهاش تتحرق!'),
      L('fathi', 'بيع ٤ طلبات.') ],
    start: d => mark(d, 'foul'), text: d => `اشتغل على عربية الفول (E) وبيع ٤ طلبات (${Math.min(prog(d,'foul'),4)}/4)`, target: () => modeObj.job ? null : SPOT.cart,
    update: (dt, d) => prog(d, 'foul') >= 4, outro: () => [ L('fathi', 'إيدك تتلف في حرير يا طيارة 🧆') ] },
  { id: 'azzouz', ch: 2, title: 'مطعم عزوز', par: 90,
    text: () => 'عزوز صاحب مطعم البيتزا عايز طيّار ديليفري. روحله في شارع المطاعم (★) — بعيد؟ اركب من المحطة 🚏', target: () => SPOT.azzouz,
    update: reachU(() => SPOT.azzouz, 5),
    outro: () => [ shot(npcAt('azzouz'), 2.4, 1, 3),
      L('azzouz', 'انت طيارة؟ اسم على مسمى والله 😂'),
      L('azzouz', 'الموتوسيكل الأحمر ده للديليفري. البيتزا لازم توصل سخنة… وكل ما تتخبط العلبة بتبوظ.'),
      L('azzouz', 'كل طلب ١٢ جنيه، والبقشيش على حسب السرعة.') ] },
  { id: 'pizza3', ch: 2, title: 'أول ديليفري', par: 240,
    start: d => mark(d, 'pizza'), text: d => `وصّل ٣ طلبات بيتزا 🍕 (ابدأ من عند عزوز E) (${Math.min(prog(d,'pizza'),3)}/3)`, target: () => JOB.kind ? null : SPOT.azzouz,
    update: (dt, d) => prog(d, 'pizza') >= 3 },
  { id: 'buyMoto', ch: 2, title: 'موتوسيكل باسمي', par: 600,
    intro: () => [ L('phone', '📱 إسلام: يا طيارة! فيه موتوسيكل مستعمل للبيع قدام القهوة بـ ٣٠٠ جنيه. حوّش واشتريه… مش هتفضل ماشي على رجلك!') ],
    text: () => `اشتري الموتوسيكل المستعمل قدام القهوة (★) · ${egp(hero.money)} / ٣٠٠<br><small>الفلوس: وردية قهوة ☕ · فول 🧆 · بيتزا 🍕 · توكتوك 🛺 · دومنو 🎲</small>`, target: () => heroMoto.pos,
    update: () => SAVE.owned.moto, outro: () => [ L('tayara', 'أخيراً… موتوسيكل باسمي! 🏍️ اركبه يا طيارة.') ] },
  { id: 'shadiaRide', ch: 2, title: 'توصيلة للكورنيش', par: 120,
    intro: () => [ L('phone', '📱 شادية: طيارة؟ أنا شادية… الشمس هتغرب كمان شوية وعايزة أصوّرها من على الكورنيش.'), L('phone', '📱 شادية: ممكن توصلني بالموتوسيكل؟ هستناك قدام البيت.') ],
    start: d => { d.picked = false; d.t = 0; showIdle(shadiaD, PL2.shadiaOut.x, PL2.shadiaOut.z); },
    text: d => d.picked ? `وصّل شادية للكورنيش (★) قبل الغروب 🌅 · ${Math.max(0, Math.ceil(90 - d.t))} ثانية` : 'اركب موتوسيكلك وروح لشادية قدام بيتها (★)',
    target: d => d.picked ? V(150, 0, 150) : PL2.shadiaOut,
    update(dt, d){
      if (!d.picked){ if (hero.veh && hero.veh.type === 'moto' && near(hero.veh.pos, PL2.shadiaOut, 6)){ d.picked = true; ST2.idle.delete(shadiaD); shadiaD.root.visible = false; banner('شادية ركبت ورا 🏍️', 'ok', 2); } return; }
      d.t += dt; if (d.t > 90){ d.failMsg = 'الشمس غربت قبل ما توصل'; return 'fail'; }
      return near(heroAt(), V(150, 0, 150), 9);
    },
    cleanup: () => { ST2.idle.delete(shadiaD); shadiaD.root.visible = false; },
    outro: () => [ { do: () => { if (hero.veh) exitVehicle(true); heroTo(148, 151); showActor(shadiaD, 150.4, 152.4); applyTimeOfDay(18.2); } }, camAt(143, 2.2, 146, 152, 1.6, 158, 1.4),
      L('shadia', 'بص… بص على البحر! مفيش حاجة في الدنيا أحلى من غروب إسكندرية.'),
      L('tayara', 'أنا بقالي عمري هنا… عمري ما وقفت أبص كده.'),
      L('shadia', 'عشان انت دايماً جري… بين القهوة والفول والبيتزا. استنى ثانية… (تِك) خدتلك صورة 📸'),
      L('tayara', 'صورة ليّا أنا؟ هتعمليها إيه؟'),
      L('shadia', 'هعلّقها… «طيارة وهو واقف مكانه لأول مرة» 😂'), { do: () => hideActor(shadiaD) } ] },
  { id: 'gas', ch: 2, title: 'الأنبوبة', par: 180,
    intro: () => [ shot(npcAt('landlord'), 2.4, 1, 3), L('landlord', 'يا طيارة يا ابني… الأنبوبة خلصت وأم شادية عايزة تطبخ.'), L('landlord', 'هات واحدة مليانة من المستودع اللي عند السوق. وبالراحة! الأنبوبة مش كورة.') ],
    start: d => { addPickup(PL2.market); d.dmg0 = null; },
    text: d => allPicked() ? 'رجّع الأنبوبة لبيت شادية (★) — بالراحة، لو خبطت جامد هتقع!' : 'روح المستودع عند السوق وخد الأنبوبة (★)',
    target: d => allPicked() ? PL2.shadiaOut : nearestPick(),
    update(dt, d){
      if (!allPicked()) return;
      if (hero.veh){ if (d.dmg0 === null || d.veh !== hero.veh){ d.veh = hero.veh; d.dmg0 = hero.veh.dmg || 0; } if ((hero.veh.dmg || 0) - d.dmg0 > 20){ d.failMsg = 'الأنبوبة وقعت واتدحرجت 😬'; return 'fail'; } }
      return near(heroAt(), PL2.shadiaOut, 4);
    },
    outro: () => [ { do: () => { if (hero.veh) exitVehicle(true); showActor(shadiaD, PL2.shadiaOut.x, PL2.shadiaOut.z - .6); } }, shot(PL2.shadiaOut, 2.4, 1.1, 3.2),
      L('mother', 'تسلم إيدك يا ابني… ربنا يكرمك ويجعلك من نصيب اللي تستاهلك.'),
      L('shadia', 'ماما!! 😳'), L('tayara', 'آمين يا رب… آمين 😅'),
      { do: () => hideActor(shadiaD) },
      // meanwhile: يوسف looks for work all day, and nobody takes him
      hideHero(), { do: () => { showActor(youssefD, 33, 40.5); } }, camAt(26, 2.6, 46, 31, 1.4, 40, 1.4), KN('kamel_02_y1'),
      { walk: [youssefD, 25.5, 40, 2] }, L('youssef', 'يا معلم عبده… محتاج حد يشيل صواني؟ أنا سريع والله.'), L('moallem', 'مفيش مكان يا ابني… طيارة مالي الدنيا.'),
      { do: () => showActor(youssefD, 128, -4) }, camAt(122, 2.6, 2, 127, 1.4, -5, 1.2), L('youssef', 'يا أسطى رضا… أي حاجة، حتى أمسح التكاتك.'), L('mechanic', 'تعالى بكرة يا يوسف… بكرة.'),
      { do: () => showActor(youssefD, 118, 41) }, camAt(114, 2.6, 47, 119, 1.4, 40, 1.2), KN('kamel_02_y2'),
      { do: () => { showActor(youssefD, PL2.wall.x, PL2.wall.z); youssefD.forceMove = 'sit'; } }, camAt(55, 2.2, 146, 60, 1.1, 153, 1.6), KN('kamel_02_y3'), KN('kamel_02_end'),
      { do: () => { hideActor(youssefD); SCENE.hideHero = false; } } ] },

  // ===== الفصل التالت: العربي =====
  { id: 'arabiArrives', ch: 3, title: 'العرض', at: () => PL.cafeOut, atR: 9, goText: 'ارجع القهوة (★) — فيه عربية حمرا واقفة قدامها', par: 30,
    intro: () => [ { do: () => { heroTo(19, 38.5); if (arabiCar){ arabiCar.mesh.visible = true; arabiCar.pos.set(70, 0, 51); arabiCar.yaw = -Math.PI / 2; arabiCar.mesh.rotation.set(0, -Math.PI / 2, 0); tween(3, k => { const e = 1 - (1 - k) * (1 - k); arabiCar.pos.set(70 - 44 * e, 0, 51 - 7.8 * Math.min(1, e * 1.6)); }); horn(); } } },
      camAt(16, 2.4, 36.5, 30, 1.2, 46, 1.4), { wait: 2.2 }, { do: () => showActor(enemyD, 25.5, 41.4) }, { walk: [enemyD, 22, 39.6, 1.8] },
      L('arabi', 'مساء الفل يا قصر الملوك 😎 العربية دي؟ هدية صغيرة من أبويا.'),
      L('arabi', 'الحاج العربي الكبير عايز يشتري القهوة… والشارع كله لحد البحر. هيبني برج.'),
      L('moallem', 'القهوة دي مش للبيع يا عربي. لا لأبوك ولا لغيره.'),
      L('arabi', 'كله بيتباع يا معلم… السؤال بكام بس. وانت يا صبي القهوة… هتشتغل عندنا في البرج، تمسح السلالم 😂'),
      L('tayara', 'أنا مش للبيع برضه يا عربي.'),
      L('arabi', 'هنشوف يا طيارة… هنشوف.'), { do: () => hideActor(enemyD) } ],
    update: () => true },
  { id: 'villaFlash', ch: 3, title: 'جوه الفيلا', par: 20,
    intro: () => [ { flash: true }, hideHero(), { do: () => { showActor(fatherD, VILLA.cx - 2, VILLA.cz + 2); showActor(enemyD, VILLA.cx + .4, VILLA.cz + 4.6); fatherD.faceYaw = Math.PI * .8; } },
      camAt(VILLA.cx - 7, 2.8, VILLA.cz + 13, VILLA.cx - 1, 1.4, VILLA.cz + 3, 0), KN('kamel_03_f1'),
      L('father', 'رجعت؟ … ورجعت إيدك فاضية زي كل مرة.'),
      L('arabi', 'يا بابا المعلم عبده دماغه ناشفة… مش راضي يبيع.'),
      L('father', 'خمسة وعشرين سنة وانت مش نافع في حاجة غير العربيات والسهر.'),
      L('father', 'الواد اللي شغال على القهوة ده… طيارة… أجدع منك.'),
      KN('kamel_03_f2'), { do: () => { hideActor(fatherD); hideActor(enemyD); } }, { flash: false } ],
    update: () => true },
  { id: 'spill', ch: 3, title: 'صينية الشاي', at: () => PL.cafeIn, atR: 9, goText: 'المعلم عايزك (★)', par: 90,
    intro: () => [ { do: () => { heroTo(19.4, 36); parkArabiMoto(); showActor(enemyD, 31, 42.5); } }, { cam: [21, 2.3, 34.2], look: [26.5, 1.3, 42], t: 1.2 },
      { walk: [enemyD, 25.2, 40.2, 2.4] },
      L('arabi', 'شاي يا قهوة! ولا هنا الشاي بالحجز؟ 😏'),
      L('moallem', 'يا طيارة! خد الصينية للأستاذ العربي… على حسابي، خلينا نصفّي النفوس.'),
      { do: () => { trayGroup.visible = true; } }, { walk: [hero.d, 24.4, 41.6, 1.8] },
      { do: () => { trayGroup.visible = false; clink(); noise(.3, 900, .5); shake = .35; puff(V(25.6, .8, 43.3), .8); say(aEnt, '😱', 1.5); } }, shot(V(25.6, 0, 43.3), 2.2, .6, 2.6, .6),
      L('arabi', 'انت عملت إيه!!! الشاي على القميص الإيطالي!'),
      L('tayara', 'والله غصب عني يا عربي… رجلي اتكعبلت.'),
      L('arabi', 'غصب عنك؟! أبويا بيقولي كل يوم إنك أجدع مني… أهو الأجدع دلق الشاي عليّا!'),
      L('arabi', 'اسمع يا طيارة… من النهارده هتشوفني في كل حتة تروحها. مش هسيبك!'),
      L('moallem', 'اجري يا طيارة! الواد ده اتجنن!') ],
    start: d => { arabiAppear(sidewalkNear(V(27, 0, 40.5), 3)); enemy.cd = 1.2; }, text: () => 'اهرب من العربي (ابعد عنه لحد ما يتوه) أو وقّعه في خناقة 👊', target: () => null,
    update: () => !enemy.active || enemy.d.downT > 0,
    outro: () => [ L('phone', '📱 إسلام: سمعت اللي حصل! العربي ده أبوه مطلّع عينه… وهو بيطلّعها عليك. خلي بالك منه.') ] },
  { id: 'flatTire', ch: 3, title: 'الكاوتش', at: () => SPOT.azzouz, atR: 7, goText: 'ارجع لعزوز (★)', reward: 40, spawn: PL.azz, par: 90,
    intro: () => [ { do: () => { heroTo(PL.azz.x, PL.azz.z); showActor(enemyD, 126, 44); } }, shot(pizzaMoto.pos, -3, 1, 3.4),
      L('arabi', 'إيه يا طيارة؟ الكاوتش نايم؟ 😂 حظك وحش!'),
      L('tayara', 'انت اللي خرمته يا عربي؟!'),
      L('arabi', 'أثبت! ولو عايزني… تعالى خدني.') ],
    start: d => { d.enemyBusy = true; arabiAppear(sidewalkNear(V(126, 0, 44), 2)); mark(d, 'edown'); }, text: () => 'العربي خرّم الكاوتش! الحقه ووقّعه 👊', target: () => enemy.pos,
    update: (dt, d) => { if (!enemy.active) arabiAppear(sidewalkNear(heroAt(), 25)); return prog(d, 'edown') >= 1; },
    outro: () => [ { do: () => { enemy.active = false; showActor(enemyD, enemy.pos.x, enemy.pos.z); enemyD.downT = 4; } }, shot(enemy.pos, 2.2, 1, 3),
      L('arabi', 'ماشي يا طيارة… دي جولة بس.'), L('azzouz', 'سيبك منه. خد ٤٠ جنيه تمن الكاوتش… وكمّل شغل.') ] },
  raceM({ id: 'race', ch: 3, title: 'سباق الكورنيش', reward: 80, at: () => PL.cafeOut, atR: 8, goText: 'العربي واقف قدام القهوة… ومستنيك (★)', goal: V(150, 0, 144), goalName: 'الكورنيش', time: 50, par: 70,
    path: [[30, 51], [141, 51], [141, 141], [150, 141]], taunt: 'هتاكل تراب يا طيارة!',
    intro: () => [ { do: () => showActor(enemyD, 27, 41) }, shot(V(27, .15, 41), 2.4, 1, 3.2),
      L('arabi', 'عملت فيها صاحب موتوسيكل؟ 😏 العربية الحمرا في التوكيل… هسابقك بالموتوسيكل الأزرق وبرضه هكسبك.'),
      L('arabi', 'نتسابق للكورنيش. اللي يخسر يشيل الصينية قدام الحتة كلها.'), L('tayara', 'اتفقنا… جهّز نفسك للتراب.') ],
    outro: () => [ L('arabi', 'ماشي… المرة الجاية مش هسيبك!') ] }),
  { id: 'flirt', ch: 3, title: 'العربي وشادية', at: () => PL2.shadiaOut, atR: 12, goText: 'فيه دوشة قدام بيت شادية (★)', par: 90,
    intro: () => [ { do: () => { heroTo(-20, 92); showActor(shadiaD, PL2.shadiaOut.x, PL2.shadiaOut.z); showActor(enemyD, -33.2, 89.4); } }, camAt(-25, 2.6, 96, -34, 1.4, 88, 1.2),
      L('arabi', 'تيجي نلف بالعربية الحمرا يا قمر؟ الكورنيش كله هيبص علينا.'),
      L('shadia', 'لا شكراً… أنا بركب ترام.'),
      L('arabi', 'ترام؟! ده أنا أشتريلك الترام باللي فيه 😎'),
      L('tayara', 'سيبها في حالها يا عربي.'),
      L('arabi', 'وانت مالك يا صبي القهوة؟ … ولا الحكاية فيها حاجة؟ 😏'), { do: () => hideActor(shadiaD) } ],
    start: d => { d.enemyBusy = true; arabiAppear(sidewalkNear(V(-33, 0, 89), 2)); mark(d, 'edown'); }, text: () => 'العربي مش راضي يمشي… وقّعه 👊', target: () => enemy.pos,
    update: (dt, d) => { if (!enemy.active) arabiAppear(sidewalkNear(heroAt(), 20)); return prog(d, 'edown') >= 1; },
    outro: () => [ { do: () => { enemy.active = false; showActor(enemyD, enemy.pos.x, enemy.pos.z); enemyD.downT = 4; showActor(shadiaD, PL2.shadiaOut.x, PL2.shadiaOut.z); } }, shot(PL2.shadiaOut, 2.4, 1.1, 3.4),
      L('arabi', 'دي مش آخرتها يا طيارة…'),
      L('shadia', 'شكراً يا طيارة… بس مكانش لازم تتخانق عشاني.'),
      L('tayara', 'أنا ماتخانقتش عشانك… اتخانقت عشان… عشان الحتة يعني 😅'),
      L('shadia', 'آه… الحتة 😄 ماشي يا بتاع الحتة.'), { do: () => { hideActor(shadiaD); hideActor(enemyD); } } ] },
  { id: 'reno1', ch: 3, title: 'نوّر البيت', par: 600,
    text: () => `جدّد البيت أول مرة (٢٥٠ جنيه) من الترابيزة جوه البيت 🏠 (★) · ${egp(hero.money)} / ٢٥٠`, target: () => HOUSE.inside ? HOUSE_SPOTS.table : SPOT.house,
    update: () => SAVE.house >= 1, outro: () => [ L('landlord', 'ما شاء الله يا طيارة! البيت نوّر… ربنا يكرمك يا ابني.'), KN('kamel_03_end') ] },

  // ===== الفصل الرابع: الساندوتش الطاير =====
  { id: 'recruit', ch: 4, title: 'الشغلانة', par: 20,
    intro: () => [ hideHero(), { do: () => { applyTimeOfDay(21.5); showActor(youssefD, PL2.wall.x, PL2.wall.z); youssefD.forceMove = 'sit'; showActor(leatherD, PL2.wall.x - 7, PL2.wall.z - 3); } },
      camAt(54, 2.2, 146, 60, 1.1, 153, 0), KN('kamel_04_y1'), { walk: [leatherD, PL2.wall.x - 1.2, PL2.wall.z - .6, 1.6] },
      L('leather', 'انت يوسف؟ … قاعد هنا كل يوم جعان.'),
      L('leather', 'عايز تشتغل؟ الشغل عندنا سهل… وفلوسه حلوة.'),
      L('youssef', 'شغل إيه بالظبط؟ أنا مبعرفش أعمل حاجة غير إني أجري… وأهزر 😅'),
      L('leather', 'ما هو الجري هو الشغل. متسألش كتير… هتعرف بكرة.'),
      KN('kamel_04_y2'), KN('kamel_04_1'), { do: () => { hideActor(youssefD); hideActor(leatherD); SCENE.hideHero = false; } } ],
    update: () => true },
  { id: 'snatch', ch: 4, title: 'الساندوتش', at: () => PL.cart, atR: 8, goText: 'روح عربية الفول (★)', spawn: V(36, .15, 35.5), par: 60,
    intro: () => [ { do: () => showActor(youssefD, 33.6, 33.8) }, shot(V(34, .15, 33), 2.6, 1.1, 3.4),
      L('fathi', 'يوسف إبراهيم!! حط الساندوتش ده مكانه!'), L('youssef', 'ده ساندوتش واحد يا حاج… مش هتفرق 😅'), L('tayara', 'يوسف! استنى عندك!') ],
    start: d => { d.noThief = true; thiefStart(); }, text: () => 'يوسف خطف ساندوتش! الحقه وامسكه (النقطة الحمرا) 🏃', target: () => thief.pos,
    update: (dt, d) => { if (thief.caught) return true; if (!thief.active){ d.failMsg = 'يوسف هرب'; return 'fail'; } },
    outro: () => [ { do: () => { showActor(youssefD, thief.pos.x, thief.pos.z); } }, shot(thief.pos, 2.2, 1, 3),
      L('youssef', 'خلاص يا طيارة والله جعان… مش هعملها تاني 😅'),
      L('fathi', 'كل يوم نفس الكلمة! أنا هكتب يافطة وأعلقها:'),
      L('fathi', '«ممنوع دخول يوسف إبراهيم» 🚫') ] },
  { id: 'pizzaThief', ch: 4, title: 'البيتزا الطايرة', at: () => SPOT.azzouz, atR: 7, goText: 'عزوز عايزك في المطعم (★)', spawn: PL.azz, par: 60,
    intro: () => [ { do: () => { heroTo(PL.azz.x - 2, PL.azz.z + .8); pizzaBox.visible = true; showActor(youssefD, 113.4, 44.6); } }, shot(pizzaMoto.pos, 3, 1, 3.4),
      { do: () => { pizzaBox.visible = false; noise(.1, 1400, .3); } },
      L('azzouz', 'البيتزا!! يوسف خد البيتزا من على الموتوسيكل!'), L('youssef', 'دي هتبرد يا عزوز… أنا بنقذها 😂') ],
    start: d => { d.noThief = true; thiefStart(V(113.4, .15, 44.6), 'بيتزا ببلاش 🍕', '🚨 يوسف خطف البيتزا! الحقه'); }, text: () => 'يوسف خطف البيتزا! الحقه (النقطة الحمرا) 🍕', target: () => thief.pos,
    update: (dt, d) => { if (thief.caught) return true; if (!thief.active){ d.failMsg = 'يوسف هرب بالبيتزا'; return 'fail'; } },
    outro: () => [ L('azzouz', 'حتى البيتزا يا يوسف؟! اليافطة هتتعلق عندي كمان.'), L('azzouz', 'والمحلات كلها هتعمل زيي… شوف بنفسك.') ] },
  { id: 'cameraThief', ch: 4, title: 'الكاميرا', at: () => V(150, .15, 150), atR: 12, goText: 'شادية بتصوّر على الكورنيش… عدّي عليها (★)', par: 60,
    intro: () => [ { do: () => { heroTo(146, 148); showActor(shadiaD, 151, 152.2); showActor(youssefD, 158, 150); } }, camAt(142, 2.4, 145, 152, 1.3, 152, 1.2),
      L('shadia', 'طيارة! تعالى شوف الصورة دي… البحر النهارده رايق.'),
      { walk: [youssefD, 151.6, 151.4, 5] }, { do: () => { noise(.12, 1500, .3); say(yEnt, '📸😅', 1.5); } },
      L('shadia', 'الكاميرا!!! يوسف خد الكاميرا!'), L('youssef', 'دي كاميرا؟ أنا افتكرتها علبة كشري 😅'), { do: () => hideActor(shadiaD) } ],
    start: d => { d.noThief = true; thiefStart(V(151.6, .15, 151.4), 'دي هتجيب كام دي؟ 📸', '🚨 يوسف خطف كاميرا شادية! الحقه'); }, text: () => 'يوسف خطف كاميرا شادية! الحقه (النقطة الحمرا) 📸', target: () => thief.pos,
    update: (dt, d) => { if (thief.caught) return true; if (!thief.active){ d.failMsg = 'يوسف هرب بالكاميرا'; return 'fail'; } },
    outro: () => [ { do: () => showActor(youssefD, thief.pos.x, thief.pos.z) }, shot(thief.pos, 2.2, 1, 3),
      L('youssef', 'خد يا عم خد… أنا مش عارف أصوّر بيها أصلاً 😅'),
      L('tayara', 'يوسف… انت بتعمل كده ليه؟ انت مكنتش كده.'),
      L('youssef', '(سكت، وبص في الأرض)… أنا لازم أمشي.'), { do: () => hideActor(youssefD) },
      L('tayara', 'فيه حاجة غلط… هامشي وراه.') ] },
  { id: 'tail', ch: 4, title: 'ورا يوسف', spawn: V(124, .15, 41.5), par: 120,
    intro: () => [ L('tayara', 'يوسف ماشي ناحية البحر… وبيبص وراه كل شوية. رايح فين؟'), L('tayara', 'هامشي وراه من بعيد… من غير ما يشوفني.') ],
    start: d => { d.noThief = true; d.path = [[136, 40.6], [240.6, 40.6], [240.6, 126.5], [PORT.door.x, 126.5]]; d.tp = V(136, .15, 40.6); d.i = 1; d.warn = 0; d.lost = 0; d.lookT = 5; youssefD.root.visible = true; youssefD.downT = 0; youssefD.root.position.copy(d.tp); },
    text: d => `امشي ورا يوسف من بعيد (١٠–٤٠ متر) 👀 · المسافة ${Math.round(d.dist || 0)} م · اتشافت ${d.warn || 0}/3`, target: d => d.tp,
    update(dt, d){
      const p = d.tp, [tx, tz] = d.path[Math.min(d.i, d.path.length - 1)], dx = tx - p.x, dz = tz - p.z, dd = Math.hypot(dx, dz), s = 3.1*dt; let vx = 0, vz = 0;
      if (d.i < d.path.length){ if (dd <= s){ p.x = tx; p.z = tz; d.i++; } else { vx = dx/dd*3.1; vz = dz/dd*3.1; p.x += vx*dt; p.z += vz*dt; } }
      youssefD.root.position.set(p.x, groundY(p.x, p.z), p.z); animDoll(youssefD, vx, vz, dt, runTime);
      const f = heroAt(), dist = Math.hypot(f.x - p.x, f.z - p.z); d.dist = dist;
      if (dist < 4){ d.failMsg = 'يوسف شافك'; return 'fail'; }
      d.lookT -= dt; if (d.lookT <= 0){ d.lookT = 3 + Math.random()*3; say(yEnt, '🤨', 1.2); if (dist < (hero.veh ? 18 : 10)){ d.warn++; banner(`👀 يوسف كان هيشوفك! (${d.warn}/3)`, 'bad', 2); buzz(40); if (d.warn >= 3){ d.failMsg = 'يوسف شافك'; return 'fail'; } } }
      if (dist > 55){ d.lost += dt; if (d.lost > 6){ d.failMsg = 'ضيّعت يوسف'; return 'fail'; } } else d.lost = 0;
      return d.i >= d.path.length;
    },
    cleanup: () => { youssefD.root.visible = false; },
    outro: () => [ { do: () => { heroTo(246, 128); showActor(youssefD, PORT.door.x - 1.5, 124); showActor(wantedD, PORT.door.x + 1.5, 123.4); } }, camAt(250, 2.6, 131, PORT.door.x, 1.3, 123.5, 1.2),
      L('shams', 'اتأخرت.'),
      L('youssef', 'كنت بجيب ساندوتش… عشانك والله يا أسطى 😅'),
      L('shams', 'بكرة. الشنطة دي تروح الكورنيش. ولا كلمة لحد.'),
      L('youssef', 'حاضر يا أسطى… (وقعت منه ورقة)'),
      { do: () => { hideActor(youssefD); hideActor(wantedD); } },
      L('tayara', 'شمس؟! … ده مخزن في الميناء. وشمس ده مين أصلاً؟') ] },
  { id: 'paper', ch: 4, title: 'الورقة', par: 40,
    start: d => addPickup(V(PORT.door.x - 1, .15, 125)), text: d => `خد الورقة اللي وقعت من يوسف (★) ${nPick(d, 1)}`, target: () => nearestPick(), update: allPicked,
    outro: () => [ L('tayara', 'ليستة… محلات الحتة ومواعيد قفلها… وعنوان فيلا الحاج العربي!'), L('tayara', 'لازم أحكي لإسلام.') ] },
  { id: 'islam', ch: 4, title: 'الحكاية', par: 120,
    text: () => 'روح احكي لإسلام على ترابيزة الدومنو (★)', target: () => SPOT.domino, update: reachU(() => SPOT.domino, 2.8),
    outro: () => [ shot(SPOT.domino, 2.4, 1.1, 3),
      L('islam', 'شمس؟! ده كان أشطر ميكانيكي في المنطقة… الحتة كلها كانت بتصلّح عنده.'),
      L('islam', 'وبعدين اختفى سنين. واللي بيقولوه إنه رجع… بس مش زي ما كان. ويوسف الغلبان ماشي وراه عشان اللقمة.'),
      { do: () => setNoEntryShown(1) }, { cam: [16, 3.6, 46], look: [21, 2, 36], t: 1.6 },
      L('islam', 'وبص حواليك يا طيارة… كل محل في الحتة علّق اليافطة 😂 «ممنوع دخول يوسف إبراهيم»!') ] },
  { id: 'ringPhoto', ch: 4, title: 'الصورة', par: 120,
    intro: () => [ L('phone', '📱 شادية: طيارة! تعالى بسرعة… لقيت حاجة غريبة في الصور اللي صورتها على الكورنيش.') ],
    text: () => 'روح لشادية عند بيتها (★)', target: () => PL2.shadiaOut, update: reachU(() => PL2.shadiaOut, 2.8),
    outro: () => [ { do: () => showActor(shadiaD, PL2.shadiaOut.x, PL2.shadiaOut.z - .6) }, shot(PL2.shadiaOut, 2.4, 1.1, 3.2),
      L('shadia', 'بص هنا… الصورة دي يوم ما يوسف خطف الكاميرا. ورا يوسف… الراجل ده.'),
      L('shadia', 'لابس خاتم كبير… عليه شمس دهب.'),
      L('tayara', 'خاتم الشمس… ده هو. ده شمس!'),
      L('shadia', 'مين شمس؟'), L('tayara', 'واحد… الحتة كلها لسه مش عارفة هو مين. بس هتعرف.'),
      { do: () => hideActor(shadiaD) }, KN('kamel_04_end') ] },

  // ===== الفصل الخامس: شمس =====
  { id: 'shamsF1', ch: 5, title: 'الميكانيكي', par: 20,
    intro: () => [ { flash: true }, hideHero(), { do: () => { showActor(wantedD, SPOT.workshop.x - 2, SPOT.workshop.z - 1); showActor(fatherD, SPOT.workshop.x + 1.4, SPOT.workshop.z + .4); } },
      camAt(SPOT.workshop.x - 6, 2.4, SPOT.workshop.z + 6, SPOT.workshop.x, 1.2, SPOT.workshop.z - 1, 0), KN('kamel_05_f1'),
      L('father', 'يا أسطى شمس… معاييش فلوس النهارده.'),
      L('shams', 'خد موتوسيكلك يا حاج… ولما ربنا يفرجها.'),
      { do: () => { hideActor(wantedD); hideActor(fatherD); } }, { flash: false } ],
    update: () => true },
  { id: 'poster', ch: 5, title: 'البوستر', at: () => PL.cafeOut, atR: 10, goText: 'فيه دوشة قدام القهوة (★)', par: 20,
    intro: () => [ { do: () => { setPostersShown(true); heroTo(22, 38.6); } }, shot(npcAt('officer'), 2.4, 1, 3.2),
      L('police', 'يا جماعة! المطلوب ده اسمه شمس… عصابة سرقة وتهريب.'),
      L('police', 'المكافأة ١٠٠٠ جنيه لأي حد يساعد في القبض عليه.'),
      L('tayara', 'هو ده… الراجل اللي في صورة شادية. خاتم الشمس.') ],
    update: () => true },
  { id: 'shamsF2', ch: 5, title: 'الديون', par: 20,
    intro: () => [ { flash: true }, hideHero(), { do: () => { showActor(wantedD, SPOT.workshop.x, SPOT.workshop.z - 1); showActor(leatherD, SPOT.workshop.x + 2.2, SPOT.workshop.z + 1.4); } },
      camAt(SPOT.workshop.x - 5, 2.4, SPOT.workshop.z + 6, SPOT.workshop.x + 1, 1.2, SPOT.workshop.z, 0), KN('kamel_05_f2'),
      L('leather', 'الفلوس يا شمس… آخر مرة بنقولها بالذوق.'),
      L('shams', 'استنوا عليا شهر… الورشة هتكبر وهسدد كل حاجة.'),
      L('leather', 'الورشة؟ الورشة بقت بتاعتنا يا أسطى.'),
      { do: () => { hideActor(wantedD); hideActor(leatherD); } }, { flash: false } ],
    update: () => true },
  { id: 'clues', ch: 5, title: 'الأدلة', par: 200,
    start: () => { addPickup(V(219, .15, -7.4)); addPickup(V(147, .15, -47.6)); addPickup(V(153, .15, 151.6)); },
    text: d => `دوّر على ٣ أدلة: عند الملعب، والسوق، والكورنيش (النقط الصفرا) ${nPick(d, 3)}`, target: () => nearestPick(), update: allPicked,
    outro: () => [ L('tayara', 'ورق عربيات… ونِمر متقطعة… ورسومات لأرض على البحر. كله بيروح لورشة شمس.') ] },
  { id: 'nightWorkshop', ch: 5, title: 'الورشة بالليل', par: 200,
    text: () => isNight() ? 'روح ورشة شمس (★) واتسحب من غير ما حد يشوفك 🌙' : 'لازم تروح الورشة بالليل 🌙 — نام في البيت لحد ٩ بالليل، أو روح هناك واستنى.', target: () => SPOT.workshop,
    action: waitNight(() => SPOT.workshop), update: () => isNight() && near(heroAt(), SPOT.workshop, 9),
    outro: () => [ { do: () => { heroTo(250, 84.5); showActor(wantedD, 263, 89.4); showActor(youssefD, 268, 90.6); } }, { cam: [252, 2.6, 84], look: [262, 1.3, 89.4], t: 1.2 },
      L('shams', 'البضاعة تطلع من الميناء على اللانش. الليلة.'),
      L('shams', 'يوسف. عينك على الشارع.'), L('youssef', 'حاضر يا أسطى… عيني على الشارع، والتانية على الساندوتشات 😅'),
      { do: () => { hideActor(wantedD); hideActor(youssefD); } },
      L('tayara', 'لازم أصوّر الحاجات اللي هناك قبل ما يرجعوا.') ] },
  { id: 'evidence', ch: 5, title: 'الصور', par: 90,
    start: () => { addPickup(V(255.4, .15, 88.6)); addPickup(V(272.6, .15, 88.6)); }, text: d => `صوّر الدليلين 📸 (النقط الصفرا) ${nPick(d, 2)}`, target: () => nearestPick(), update: allPicked,
    outro: () => [ L('youssef', '🎵 (صفّارة عالية)'), L('shams', 'مين هناك؟! الحقوه!'), L('tayara', 'يلا يا طيارة… اجري!') ] },
  { id: 'shamsF3', ch: 5, title: 'ليلة الميناء', par: 20,
    intro: () => [ { flash: true }, hideHero(), { do: () => { applyTimeOfDay(23); showActor(wantedD, PL2.pier.x, PL2.pier.z + 6); showActor(leatherD, PL2.pier.x + .4, PL2.pier.z + 9); } },
      camAt(PL2.pier.x - 7, 3, PL2.pier.z + 1, PL2.pier.x, 1.2, PL2.pier.z + 7, 0), KN('kamel_05_f3'),
      L('leather', 'شيل الصندوق ده من اللانش… ومتسألش فيه إيه.'),
      L('shams', '(ساكت… وشال الصندوق)'),
      KN('kamel_05_f4'), { do: () => { hideActor(wantedD); hideActor(leatherD); } }, { flash: false } ],
    update: () => true },
  { id: 'checkpoints', ch: 5, title: 'الكماين', reward: 150, spawn: PL.ws, par: 120,
    intro: () => [ L('police', '📱 الظابط: طيارة؟ عرفت إن معاك أدلة. البوليس عامل كماين في الطرق… لو وقفوك بيها هيفتكروك منهم!'),
      L('police', 'تعالى القسم جنب القهوة (★) من غير ما تعدي على أي كمين (النقط الحمرا والزرقا على الخريطة).') ],
    start: d => { addCheckpoint(192, 48); addCheckpoint(96, 48); addCheckpoint(144, 96); d.grace = 2; },
    text: () => 'وصّل الأدلة للظابط جنب القهوة (★)… ولف من بعيد عن الكماين 🚓', target: () => PL.police,
    update(dt, d){ d.grace -= dt; const f = heroAt(); if (d.grace <= 0 && checkpoints.some(c => near(f, c.pos, c.r))){ d.failMsg = 'الكمين وقفك'; return 'fail'; } return near(f, PL.police, 5); },
    outro: () => [ shot(npcAt('officer'), 2.4, 1, 3.2), L('police', 'الأدلة دي تقيلة يا طيارة… برافو عليك.'), L('police', 'بس من غير شمس نفسه منقدرش نعمل حاجة. خليك صاحي.') ] },
  { id: 'sighting', ch: 5, title: 'شمس في السوق', par: 90,
    intro: () => [ L('police', '📱 الظابط: شمس اتشاف في السوق دلوقتي! الحقه قبل ما يختفي!') ],
    start: () => { spawnWanted(); wanted.pos.set(148, .15, -47.6); }, text: () => 'الحق شمس في السوق (النقطة الحمرا) وامسكه 🏃', target: () => wanted.pos,
    update: () => !!ST2.ev.arrest,
    outro: () => [ { do: () => { wanted.active = false; showActor(wantedD, wanted.pos.x, wanted.pos.z); heroTo(wanted.pos.x + 1.4, wanted.pos.z + .6); } }, shot(wanted.pos, 2.2, 1, 3),
      L('shams', 'طيارة بتاع القهوة.'),
      L('shams', 'الأرض اللي على البحر دي… بتاعتي. والبرج اللي العربي عايز يبنيه؟ ستارة. ومن وراها أنا.'),
      L('tayara', 'يعني الحاج العربي شغال معاك؟!'),
      L('shams', 'هو لسه مايعرفش.'),
      { do: () => { flash(); thwack(); shake = .5; hero.d.downT = 2; } }, { fade: () => hideActor(wantedD) },
      L('tayara', 'آه… هرب. بس دلوقتي عرفت هو عايز إيه.') ] },
  { id: 'awning', ch: 5, title: 'التندة', par: 70,
    intro: () => [ { do: () => { applyTimeOfDay(22); heroTo(20, 38); awningFire(true); } }, camAt(14, 3, 40, 18, 3.4, 23, 1.2),
      L('crowd', 'الحقوا!! تندة القهوة بتولع!!'), L('moallem', 'يا طيارة!! الميه! هات جرادل الميه من عند عربية الفول!') ],
    start: d => { awningFire(true); for (const [x, z] of [[37.4, 33.6], [34, 30], [38.4, 29.6]]) addPickup(V(x, .15, z)); d.t = 0; d.got = 0; },
    text: d => `هات ٣ جرادل ميه وطفّي النار 🔥 (${pickups.filter(p => p.got).length}/3) · ${Math.max(0, Math.ceil(75 - d.t))} ثانية`, target: () => nearestPick() || PL.cafeIn,
    update(dt, d){ d.t += dt; const g = pickups.filter(p => p.got).length; while (FIRES.length > 3 - g){ const f = FIRES.pop(); scene.remove(f.g); puff(f.g.position, 1.4); noise(.4, 800, .3); }
      if (allPicked()) return true; if (d.t > 75){ d.failMsg = 'النار مسكت في التندة كلها'; return 'fail'; } },
    cleanup: () => { clearFires(); },
    outro: () => [ { do: () => { awningBurnt(true); } }, shot(PL.cafeIn, -2.2, 1.4, 4),
      L('moallem', 'الحمد لله إنها جت على قد التندة…'),
      L('tayara', 'يا معلم… فيه ورقة متعلقة على العمود.'),
      L('phone', '«سيبوا الأرض اللي على البحر. — ش»'), KN('kamel_05_end') ] },

  // ===== الفصل السادس: الفخ =====
  { id: 'refuseDeal', ch: 6, title: 'الصفقة', par: 20,
    intro: () => [ hideHero(), { do: () => { showActor(fatherD, VILLA.cx - 2, VILLA.cz + 2); showActor(leatherD, VILLA.cx + 1.6, VILLA.cz + 4); } },
      camAt(VILLA.cx - 7, 2.8, VILLA.cz + 13, VILLA.cx, 1.4, VILLA.cz + 3, 0),
      L('leather', 'الحاج العربي… الناس بتاعتي مستعجلة على أرض البحر.'),
      L('father', 'الصفقة اتلغت. عرفت مين اللي ورا الفلوس دي. أنا مبشتغلش مع ناس زيكم.'),
      L('leather', 'انت متأكد يا حاج؟ … الحاجات الغالية بتتحرق بسرعة.'),
      { do: () => { hideActor(fatherD); hideActor(leatherD); SCENE.hideHero = false; } } ],
    update: () => true },
  { id: 'carStolen', ch: 6, title: 'العربية الحمرا', at: () => PL.cafeOut, atR: 10, goText: 'ارجع القهوة (★)', par: 120,
    intro: () => [ hideHero(), { do: () => { applyTimeOfDay(21.5); showroomFire(true); } }, camAt(SHOWROOM.cx - 12, 7, SHOWROOM.cz + 20, SHOWROOM.cx, 3, SHOWROOM.cz - 2, 0), KN('kamel_06_fire'),
      { do: () => { SCENE.hideHero = false; heroTo(19, 38.5); if (arabiCar){ arabiCar.mesh.visible = true; arabiCar.pos.set(26, 0, 43.2); arabiCar.yaw = Math.PI / 2; arabiCar.mesh.rotation.set(0, Math.PI / 2, 0); } showActor(enemyD, 22, 40); } }, camAt(17, 2.4, 36, 27, 1.2, 44, 1.2),
      { do: () => { noise(.3, 200, .5); horn(); } }, L('arabi', 'العربية!!! حد ركب عربيتي!!'), L('tayara', 'اركب يا طيارة… مش هيبعد!') ],
    start: d => { if (!arabiCar) return; d.run = { v: arabiCar, i: 1, path: [[34, 51], [240.6, 51], [240.6, 141], [258, 141], [PORT.door.x, 127]] }; d.far = 0; showroomFire(false); },
    text: d => `الحق العربية الحمرا (النقطة الحمرا) ومتسيبهاش تبعد 🚗 · ${Math.round(d.dist || 0)} م`, target: d => arabiCar ? arabiCar.pos : null,
    update(dt, d){ if (!d.run) return true; const done = carRunStep(d, dt); ST2.d.shamsPos = arabiCar.pos; if (d.dist > 95){ d.far += dt; if (d.far > 7){ d.failMsg = 'العربية اختفت'; return 'fail'; } } else d.far = 0; return done; },
    cleanup: d => { ST2.d.shamsPos = null; hideActor(enemyD); },
    outro: () => [ camAt(PORT.door.x - 8, 3, PORT.door.z + 9, PORT.door.x, 1.3, PORT.door.z - 2, 1.2),
      { do: () => { if (arabiCar){ arabiCar.pos.copy(PORT.inside); arabiCar.mesh.rotation.set(0, Math.PI, 0); } } },
      L('tayara', 'دخلت مخزن الميناء… نفس المخزن اللي يوسف كان رايحه.'), L('tayara', 'لوحدي مش هعرف أعمل حاجة. لازم أستنى.') ] },
  { id: 'papers', ch: 6, title: 'الورق', par: 20,
    intro: () => [ hideHero(), { do: () => { showActor(fatherD, VILLA.cx - 2, VILLA.cz + 2); showActor(enemyD, VILLA.cx + 1.4, VILLA.cz + 5); } },
      camAt(VILLA.cx - 6, 2.6, VILLA.cz + 12, VILLA.cx - 1, 1.3, VILLA.cz + 3, 0),
      L('phone', '📱 صوت ناشف: المعرض اتحرق… والعربية الحمرا عندنا. ولسه.'),
      L('phone', '📱 صوت ناشف: عندنا ورق بإمضتك إنك بتهرّب في عربياتك. يا تكمّل الصفقة… يا الورق ده يروح للبوليس.'),
      L('father', '(قعد على الكرسي… ومردّش)'),
      KN('kamel_06_fear'),
      L('arabi', 'بابا… انت كويس؟'),
      L('father', 'روح يا ابني… روح.'),
      { do: () => { hideActor(fatherD); hideActor(enemyD); SCENE.hideHero = false; } } ],
    update: () => true },
  { id: 'needYou', ch: 6, title: 'نص الليل', par: 200,
    text: () => isNight() ? 'روح البيت (★)… الدنيا ليلت' : 'روح البيت ونام لحد بالليل 🌙 (★)', target: () => SPOT.house,
    action: waitNight(() => SPOT.house, 6), update: () => isNight() && near(heroAt(), SPOT.house, 6),
    outro: () => [ { do: () => { if (hero.veh) exitVehicle(true); applyTimeOfDay(0.2); heroTo(PL2.houseOut.x, PL2.houseOut.z - .4); showActor(enemyD, PL2.houseOut.x + 1.6, PL2.houseOut.z + 2.2); noise(.12, 300, .5); setTimeout(() => noise(.12, 300, .5), 260); } },
      camAt(-18, 2.2, 94, -24, 1.4, 88.6, 1.2),
      L('tayara', 'العربي؟! الساعة ١٢ بالليل… جاي تكمّل الخناقة؟'),
      L('arabi', 'أنا مش جاي أتخانق يا طيارة.'),
      L('arabi', 'أبويا… الراجل اللي الحتة كلها بتخاف منه… شفته النهارده خايف.'),
      KN('kamel_06_2'),
      L('arabi', 'محتاجك.'),
      L('tayara', '… يلا بينا.') ] },
  { id: 'prepare', ch: 6, title: 'الشومة', koFail: true, par: 120,
    intro: () => [ { do: () => { heroTo(PL2.port.x - 8, PL2.port.z + 10); showActor(enemyD, PL2.port.x - 6.5, PL2.port.z + 10.5); } }, camAt(PL2.port.x - 13, 2.4, PL2.port.z + 15, PL2.port.x - 7, 1.2, PL2.port.z + 10, 1.2),
      L('arabi', 'خد دي.'), { do: () => giveStick(true) },
      L('tayara', 'شومة؟! هو احنا رايحين نتخانق ولا نتفسح؟'),
      L('arabi', 'رجالة شمس مش هيقابلونا بالورد. واقفين على باب الميناء.'),
      L('tayara', 'كتف في كتف يا عربي.') ],
    start: d => spawnThugs(d), text: d => `اضرب حرس الميناء مع العربي 👊 الشومة بتوقّعهم أسرع (${(d.thugs||[]).filter(n => n.thugDone).length}/3)`, target: () => null,
    update(dt, d){ if (!d.thugs) return; for (const n of d.thugs){ if (!n.thugDone && (n.state === 'walk' || n.state === 'goto') && !hero.veh){ n.state = 'fight'; n.fightT = 999; } } return d.thugs.every(n => n.thugDone); },
    cleanup: d => clearThugs(d), outro: () => [ L('arabi', 'هاهاها! شفت؟ إحنا الاتنين مع بعض محدش يقف قدامنا.') ] },
  { id: 'nawaRaid', ch: 6, title: 'ليلة النوّة', koFail: true, par: 180,
    intro: () => [ { rain: true }, { do: () => { applyTimeOfDay(1); } }, camAt(PL2.port.x + 10, 5, PL2.port.z + 12, PL2.port.x, 1.5, PL2.port.z - 4, 1.4), KN('kamel_06_nawa'),
      L('arabi', 'نوّة المكنسة… محدش هيسمعنا وسط الرعد ده.'), L('tayara', 'جوه المخزن: الورق الأصلي… ومفتاح عربيتك.') ],
    start: d => { setRain(true); addPickup(V(PORT.shed.x0 + 4, .15, PORT.shed.z0 + 12)); addPickup(V(PORT.shed.x1 - 4, .15, PORT.shed.z0 + 3)); spawnThugs(d); },
    text: d => `ادخل المخزن وهات الورق والمفتاح ${nPick(d, 2)} · رجالة شمس جوه 👊`, target: () => nearestPick(), update: allPicked,
    cleanup: d => clearThugs(d),
    outro: () => [ L('tayara', 'الورق أهو… بس ده نسخة! فين الأصل؟'),
      { do: () => { shamsLaunch.visible = true; shamsLaunch.position.set(PIER.x1 + 4, -.9, 168); } }, camAt(PL2.pier.x - 6, 3.2, PL2.pier.z - 6, PL2.pier.x + 4, 1, 168, 1.2),
      L('shams', '(بيركب اللانش ومعاه الشنطة) الأصل معايا يا طيارة. الحقني لو تعرف.'),
      L('arabi', 'اللانشات على الرصيف! يلا!') ] },
  { id: 'launchChase', ch: 6, title: 'مطاردة اللانشات', par: 120,
    start: d => { setRain(true); d.boatOK = true; shamsLaunch.visible = true; shamsLaunch.position.set(PIER.x1 + 4, -.9, 168); d.lr = { i: 1, yaw: 0, path: [[PIER.x1 + 6, 190], [250, 214], [200, 232], [170, 238], [150, 300], [180, 360], [240, 380]] }; d.close = 0; d.far = 0; },
    text: d => !(hero.veh && hero.veh.type === 'boat') ? 'اركب لانش من على الرصيف (★)' : `الحق لانش شمس 🚤 · قرّب منه ٣ ثواني (${d.close.toFixed(1)}/3) · ${Math.round(d.dist || 0)} م`,
    target: d => !(hero.veh && hero.veh.type === 'boat') ? launches[0].pos : shamsLaunch.position,
    update(dt, d){
      if (!(hero.veh && hero.veh.type === 'boat')) return;
      const done = launchRunStep(d, dt); ST2.d.shamsPos = shamsLaunch.position;
      if (d.dist < 16){ d.close += dt; if (d.close >= 3) return true; } else d.close = Math.max(0, d.close - dt * .5);
      if (d.dist > 110){ d.far += dt; if (d.far > 6){ d.failMsg = 'لانش شمس اختفى في الضلمة'; return 'fail'; } } else d.far = 0;
      if (done){ d.failMsg = 'شمس هرب في البحر'; return 'fail'; }
    },
    cleanup: d => { ST2.d.shamsPos = null; },
    outro: () => [ camAt(shamsLaunch.position.x - 10, 3, shamsLaunch.position.z - 8, shamsLaunch.position.x, 1, shamsLaunch.position.z, 1),
      L('shams', '(رمى الشنطة في اللانش بتاعك) خدوا ورقكم… اللعبة لسه في أولها.'),
      L('shams', 'هرجع يا طيارة… في أحلى ليلة في الحتة.'),
      { do: () => { tween(4, k => { shamsLaunch.position.z += .6; }, () => { shamsLaunch.visible = false; }); } }, { wait: 2 },
      L('tayara', 'الورق الأصلي… معانا! يلا نرجّع عربيتك يا عربي.') ] },
  { id: 'carBack', ch: 6, title: 'رجّع العربية', par: 160,
    start: d => { d.arabiCar = true; setRain(true); if (hero.veh && hero.veh.type === 'boat') exitVehicle(true); if (arabiCar){ arabiCar.mesh.visible = true; arabiCar.pos.copy(PORT.inside); } },
    text: () => hero.veh === arabiCar ? 'سوق عربية العربي الحمرا لحد القهوة (★)' : 'اركب العربية الحمرا اللي في المخزن (★)', target: () => hero.veh === arabiCar ? PL.cafeOut : (arabiCar ? arabiCar.pos : PL.cafeOut),
    update: () => !arabiCar || (hero.veh === arabiCar && near(arabiCar.pos, PL.cafeOut, 9)),
    cleanup: () => { setRain(false); giveStick(false); },
    outro: () => [ { rain: false }, { do: () => { if (hero.veh) exitVehicle(true); applyTimeOfDay(7); heroTo(19, 38.5); if (arabiCar){ arabiCar.pos.set(26, 0, 43.2); arabiCar.yaw = Math.PI / 2; arabiCar.mesh.rotation.set(0, Math.PI / 2, 0); } showActor(enemyD, 22.2, 40.2); showActor(fatherD, 24, 39.4); } }, camAt(16, 2.4, 36, 23, 1.3, 40, 1.4),
      L('father', 'العربية… والورق. انتوا الاتنين عملتوها؟'),
      L('arabi', 'طيارة هو اللي…'),
      L('tayara', 'إحنا الاتنين يا حاج. كتف في كتف.'),
      L('father', 'يا طيارة… أنا غلطت لما قارنتك بابني. انتوا الاتنين رجالة.'),
      L('arabi', 'من النهارده… أنا وانت إخوات.'), KN('kamel_06_end'),
      { do: () => { hideActor(fatherD); hideActor(enemyD); } } ] },

  // ===== الفصل السابع: ليلة الفرح =====
  { id: 'islamFlash', ch: 7, title: 'الترام', par: 20,
    intro: () => [ { flash: true }, hideHero(), { do: () => { tram.x = TRAM.stations[1]; tram.stopT = 99; tram.at = tram.x; showActor(islamD, tram.x - 1.4, TRAM.z - 2.2); showActor(haidyD, tram.x + .6, TRAM.z - 2.2); haidyD.faceYaw = -Math.PI / 2; islamD.faceYaw = Math.PI / 2; } },
      camAt(TRAM.stations[1] - 3, 2.2, TRAM.z - 8, TRAM.stations[1], 1.3, TRAM.z - 2, 0), KN('kamel_07_f1'),
      L('islam', 'لو سمحتي… هي المحطة الجاية إيه؟'),
      L('haidy', 'هي المحطة اللي انت كان المفروض تنزل فيها من ساعة 😄'),
      L('islam', 'آه… ما أنا… بحب الترام أوي يعني.'),
      KN('kamel_07_f2'), { do: () => { hideActor(islamD); hideActor(haidyD); tram.stopT = 2; } }, { flash: false } ],
    update: () => true },
  { id: 'invite', ch: 7, title: 'الخبر الحلو', at: () => SPOT.domino, atR: 4, goText: 'إسلام عايزك على الدومنو (★)', par: 240,
    intro: () => [ shot(SPOT.domino, 2.4, 1.1, 3),
      L('islam', 'طيارة! فاكر الخبر الحلو اللي قلتلك عليه من أول يوم؟'),
      L('islam', 'أنا وهايدي هنتجوز!! 💍 والفرح في الساحة، وانت أول واحد لازم يبقى جنبي.'),
      L('tayara', 'ألف مبروك يا إسلام!! ده أحلى خبر سمعته من سنين!'),
      L('islam', 'بس لازم تبقى شيك… هات حاجة حلوة من محل الأناقة 😎') ],
    text: () => 'اشتري حاجة شيك للفرح من محل الأناقة (★) — ساعة أو سلسلة أو نضارة', target: () => SHOP.pos,
    update: () => !!(SAVE.acc.watch || SAVE.acc.chain || SAVE.acc.glasses), outro: () => [ L('tayara', 'كده تمام… طيارة الجامد جاهز للفرح 😎') ] },
  { id: 'prep', ch: 7, title: 'تجهيز الفرح', par: 150,
    intro: () => [ L('phone', '📱 إسلام: يا طيارة… الكراسي والزينة والإضاءة لسه في الساحة متكومة! تعالى ساعدني.') ],
    start: () => { for (const [x, z] of [[-80, 28], [-64, 28], [-80, 38], [-64, 38]]) addPickup(V(x, .15, z), 'part'); },
    text: d => `رتّب الفرح: لم ٤ حاجات من الساحة (النقط الصفرا) ${nPick(d, 4)}`, target: () => nearestPick(), update: allPicked,
    outro: () => [ L('islam', 'الله ينوّر عليك! الساحة بقت تجنن.') ] },
  { id: 'weddingNight', ch: 7, title: 'ليلة الفرح', par: 200,
    text: () => isNight() ? 'روح الفرح في الساحة (★) 🎉' : 'الفرح بالليل 🌙 — نام في البيت لحد بالليل، أو روح الساحة (★) واستنى.', target: () => PL.wed,
    action: waitNight(() => PL.wed), update: () => isNight() && near(heroAt(), PL.wed, 10),
    outro: () => [ { do: () => { heroTo(-72, 30.5); showActor(islamD, -76, 42); showActor(haidyD, -75.3, 42); } }, { cam: [-64, 4, 26], look: [-72, 1.6, 36], t: 1.6 }, KN('kamel_07_1'),
      { walk: [islamD, -72.4, 36.6, 1.1], noWait: true }, { walk: [haidyD, -71.7, 36.6, 1.1] },
      L('crowd', 'ززززغرررررطة!! 🎉'),
      L('islam', 'منوّر يا طيارة! هايدي… ده طيارة اللي كلمتك عنه.'),
      L('haidy', 'أهلاً يا طيارة! إسلام بيحكي عنك أكتر ما بيحكي عني 😄'),
      L('arabi', 'الدي جي شغّال مهرجانات… انزل يا طيارة!'),
      L('crowd', 'طيارة! طيارة! طيارة! 👏') ] },
  { id: 'dance', ch: 7, title: 'الرقصة', par: 120,
    start: d => { heroTo(-72, 34.4); d.res = null; d.dancing = true; playWedding().then(r => { d.res = r; }); },
    text: () => 'ارقص على المزيكا! دوس على الخانة لما النوتة توصل للخط 💃', target: () => null,
    update: (dt, d) => { if (!d.res) return; const need = DIFF.pat > 1 ? .4 : .55; if (d.res.pct >= need) return true; d.failMsg = `الرقص مكانش حلو (${Math.round(d.res.pct*100)}%)`; return 'fail'; },
    outro: () => [ L('islam', 'إيه الرقص ده يا طيارة!! الحتة كلها هتتكلم عليك بكرة 😂') ] },
  { id: 'shamsWedding', ch: 7, title: 'هجوم على الفرح', par: 120,
    intro: () => [ { do: () => showActor(shadiaD, -66, 31) }, L('shadia', 'طيارة!! حد خد الكاميرا من إيدي… فيها كل صور شمس!'), L('crowd', 'الحقوا!! شمس!!'), L('tayara', 'شمس!! في فرح إسلام؟! مش هسيبه المرة دي.'), { do: () => hideActor(shadiaD) } ],
    start: () => { spawnWanted(); wanted.pos.set(-57, .15, 41); }, text: () => 'الحق شمس في حواري بحري (النقطة الحمرا) وامسكه 🏃', target: () => wanted.pos,
    update: () => !!ST2.ev.arrest,
    outro: () => [ { do: () => { wanted.active = false; showActor(wantedD, wanted.pos.x, wanted.pos.z); heroTo(wanted.pos.x + 1.4, wanted.pos.z + .6); } }, shot(wanted.pos, 2.2, 1, 3),
      L('shams', 'وعدتك بأحلى ليلة في الحتة يا طيارة.'), { do: () => { flash(); thwack(); shake = .4; hero.d.downT = 1.5; } }, { fade: () => hideActor(wantedD) },
      L('tayara', 'آه… الكاميرا لسه معاه. وهرب في الحواري.') ] },
  { id: 'youssefStand', ch: 7, title: 'يوسف', par: 20,
    intro: () => [ { do: () => { heroTo(-50, 46); showActor(wantedD, -46, 49.6); showActor(youssefD, -47.6, 48.2); } }, camAt(-53, 2.4, 44, -46.5, 1.3, 49, 1.2),
      L('youssef', 'كفاية يا أسطى… سيب الكاميرا. سيبهم في حالهم.'),
      L('shams', 'انت؟ … انت بتقف قصادي؟'),
      L('youssef', 'أيوه. أول مرة… بس أيوه.'),
      { do: () => { noise(.2, 700, .3); } }, L('shams', '(رمى الكاميرا على الأرض ومشي)'), { do: () => hideActor(wantedD) },
      L('youssef', 'خد يا طيارة… الكاميرا. وفيه حاجة تانية لازم تعرفها.'),
      L('youssef', 'مخبأ شمس جوه القلعة… في البرج القديم. وبكرة بالليل آخر شحنة… هيهرب بعدها.'),
      L('tayara', 'شكراً يا يوسف. والله ما هنساها.'), { do: () => hideActor(youssefD) } ],
    update: () => true },
  { id: 'plan', ch: 7, title: 'الخطة', par: 120,
    text: () => 'روح للظابط جنب القهوة (★) واحكيله', target: () => PL.police, update: reachU(() => PL.police, 4),
    outro: () => [ { do: () => showActor(enemyD, PL.police.x + 1.6, PL.police.z + 1.2) }, shot(npcAt('officer'), 2.4, 1, 3.4),
      L('police', 'القلعة… آخر شحنة. يبقى دي آخر فرصة.'),
      L('police', 'إحنا هنقفل الكوبري من ناحية القلعة. انت امشي وراه من الكورنيش بالموتوسيكل، وماتسيبوش.'),
      L('arabi', 'وأنا معاك يا طيارة. المرة دي سوا.'),
      L('phone', '📱 إسلام: وأنا هدعيلك… لسه عريس جديد 😅'), KN('kamel_07_end') ] },

  // ===== الفصل التامن: الكوبري والقلعة =====
  { id: 'chase', ch: 8, title: 'مطاردة الكورنيش', at: () => PL.corniche, atR: 10, goText: 'روح الكورنيش (★) — شمس هيعدي من هناك', spawn: PL.corniche, par: 120,
    intro: () => [ { do: () => { applyTimeOfDay(22); SAVE.time = 22; heroTo(PL.corniche.x, PL.corniche.z); if (SAVE.owned.moto){ heroMoto.pos.set(164, 0, 147); heroMoto.yaw = -Math.PI/2; heroMoto.mesh.rotation.set(0, -Math.PI/2, 0); } } },
      { cam: [176, 4, 156], look: [196, 1, 141], t: 1.6 },
      L('shams', '(بيعدي بالموتوسيكل) محدش هيوقفني النهارده!'), L('tayara', 'لا يا شمس… النهارده آخرها. اركب يا طيارة!') ],
    start: d => { d.noThief = true; ghostStart(d, shamsMoto, wantedD, [[214, 141], [150, 141], [99, 141], [96, 160], [96, 262]], 12); d.far = 0; },
    text: d => `الحق شمس (النقطة الحمرا) ومتسيبوش يبعد 🏍️ · المسافة ${Math.round(d.dist || 0)} م`, target: d => d.gh ? d.gh.mesh.position : null,
    update(dt, d){ const g = d.gh; if (!g) return; const dist = heroAt().distanceTo(g.mesh.position); d.dist = dist; ST2.d.shamsPos = g.mesh.position;
      const sp = (dist > 60 ? 7 : dist > 30 ? 13 : 19) * DIFF.enemySpd; const done = ghostStep(g, dt, sp);
      if (dist > 95){ d.far += dt; if (d.far > 6){ d.failMsg = 'شمس هرب'; return 'fail'; } } else d.far = 0;
      return done; },
    cleanup: d => { ghostEnd(d); ST2.d.shamsPos = null; } },
  { id: 'bossFight', ch: 8, title: 'جوه القلعة', reward: 1000, koFail: true, spawn: V(92, 0, 270), par: 120,
    intro: () => [ { do: () => { if (hero.veh) exitVehicle(true); heroTo(92, 270); showActor(wantedD, 100, 276); } }, camAt(86, 3, 264, 97, 1.4, 274, 1.4),
      L('shams', 'وصلت لحد هنا؟ … القلعة دي شافت ناس أجمد منك يا طيارة.'),
      L('tayara', 'مش عايز أكسبك يا شمس… عايزك ترجع الميكانيكي اللي كان بيصلّح ببلاش.'),
      L('shams', 'الميكانيكي مات.') ],
    start: () => { heroTo(92, 270); boss.active = true; boss.hp = DIFF.dmg < 1 ? 120 : 160; boss.downs = 0; boss.atk = 1.2; boss.pos.set(100, 0, 276); wantedD.root.visible = true; wantedD.P.legL.visible = wantedD.P.legR.visible = true; wantedD.blob.visible = true; wantedD.downT = 0; },
    text: () => `وقّع شمس مرتين 👊 (${boss.downs}/2) · ${'❤️'.repeat(Math.ceil(boss.hp / 40))}`, target: () => null,
    update: () => boss.downs >= 2, cleanup: () => { boss.active = false; } },
  { id: 'policeArrive', ch: 8, title: 'الصور', par: 20,
    intro: () => [ { do: () => { showActor(wantedD, boss.pos.x || 100, boss.pos.z || 276); wantedD.downT = 30; showActor(shadiaD, 94, 266.5); copCar.pos.set(96, 0, 256); copCar.yaw = 0; copCar.mesh.rotation.set(0, 0, 0); } }, camAt(88, 2.6, 268, 97, 1.3, 273, 1.2),
      L('police', 'محدش يتحرك!'),
      L('shadia', 'الصور دي فيها كل حاجة يا باشا… الشحنات، والعربيات، والميناء.'),
      L('police', 'شمس… انت مقبوض عليك.'),
      { do: () => { wantedD.downT = 0; } },
      L('shams', 'ابني عنده خمس سنين… قولوله إن أبوه كان ميكانيكي شاطر.'),
      L('tayara', 'هقوله يا شمس… وهقوله إنك سلّمت نفسك.'),
      { do: () => { hideActor(wantedD); hideActor(shadiaD); } } ],
    update: () => true },
  { id: 'confess', ch: 8, title: 'يوسف لاقى نفسه', at: () => PL.cart, atR: 7, goText: 'يوسف مستنيك عند عربية الفول (★)', par: 200,
    intro: () => [ { do: () => showActor(youssefD, 33.4, 34.4) }, shot(V(34, .15, 34), 2.4, 1, 3.2),
      L('youssef', 'طيارة… أنا رايح القسم. هقول كل حاجة عملتها.'),
      L('youssef', 'بس عمري ما سرقت غير ساندوتشات وبيتزا… وكاميرا واحدة 😅 والله العظيم.'),
      L('tayara', 'وأنا هقف جنبك. ولما تخرج… تعالى اشتغل معايا عند عزوز بدل اللف ده.'),
      L('youssef', 'بجد؟! … طب واليافطات؟'),
      L('fathi', 'لو اتعدلت يا يوسف، أشيلها بإيدي.'), KN('kamel_08_y') ],
    update: () => true },

  // ===== الختام: الجامد =====
  { id: 'epilogue', ch: 9, title: 'الجامد', at: () => PL.cafeIn, atR: 12, goText: 'ارجع قهوة قصر الملوك (★)… الكل مستنيك', par: 60,
    intro: () => [ { do: () => { awningBurnt(false); showroomBurnt(false); heroTo(21.4, 30); showActor(enemyD, 19.4, 24.8); showActor(youssefD, 25.6, 29.4); setNoEntryShown(.05); } }, { cam: [17, 3, 37], look: [22, 1.3, 27], t: 1.8 },
      KN('kamel_09_1'),
      L('moallem', 'طيارة… القهوة اتجددت، والتندة رجعت أحسن من الأول، والحتة كلها بتتكلم عليك.'),
      L('moallem', 'ومن النهارده انت مش قهوجي بس… انت شريكي في قصر الملوك 🤝'),
      L('arabi', 'وأنا مسؤول الوردية الليلي… وبرضه هفضل أتريق عليك 😏'),
      L('youssef', 'واليافطات اتشالت كلها… إلا واحدة 😅'),
      L('fathi', 'دي للذكرى يا يوسف 😂'),
      shot(SPOT.domino, 2.4, 1.1, 3),
      L('islam', 'طيارة الجامد… الحتة من غيرك ماتحلاش.'),
      // the roof: a kite, and شادية taking a picture
      { do: () => { hideActor(enemyD); hideActor(youssefD); hero.pos.set(PL2.roof.x - .8, PL2.roof.y, PL2.roof.z); showActor(shadiaD, PL2.roof.x + .8, PL2.roof.z); shadiaD.root.position.y = PL2.roof.y; kiteShow(true); } },
      camAt(PL2.roof.x - 5, PL2.roof.y + 2.2, PL2.roof.z + 7, PL2.roof.x, PL2.roof.y + 2.5, PL2.roof.z - 3, 1.8), KN('kamel_09_2'),
      L('shadia', 'اثبت يا طيارة… الطيارة الورق ورا راسك بالظبط 📸'),
      L('tayara', 'إحنا كلنا الجامدين 👑'), KN('kamel_09_3'),
      { do: () => { kiteShow(false); hideActor(shadiaD); heroTo(21.4, 30); } } ],
    update: () => true },
];

const idx = id => MS.findIndex(m => m.id === id);
const curM = () => MS[SAVE.m] || null;
const unlocked = id => SAVE.m > idx(id) || (SAVE.m === idx(id) && ST2.phase === 'active');
const storyHostile = () => modeId === 'story' && !SAVE.ended && SAVE.m >= idx('spill') && SAVE.m < idx('refuseDeal') && !(SAVE.m === idx('spill') && ST2.phase !== 'active');
const storyAlly = () => modeId === 'story' && SAVE.m >= idx('prepare') && SAVE.m <= idx('carBack') && !(SAVE.m === idx('prepare') && ST2.phase !== 'active');
// an old save (before the rewrite) continues from the same point of the new story
if (SAVE.v !== STORY_V && (SAVE.started || SAVE.m > 0)){
  if (!SAVE.ended){ const old = OLD_ORDER[SAVE.m], id = OLD_TO_NEW[old] || old; SAVE.m = Math.max(0, idx(id)); }
  SAVE.introSeen = -1; SAVE.chSeen = -1; SAVE.v = STORY_V; store.set(STORY_KEY, JSON.stringify(SAVE));
}
// ---------- mission runner ----------
// phases: idle → goto (walk to the start point) → intro (cutscene) → active → outro (cutscene) → wait → next mission
ST2.idle = new Set();
function chapterCardBig(ch){ const el = $('chap'); if (ch === false || ch == null){ el.classList.remove('big'); el.hidden = true; return; } const c = CHAPS[ch] || CHAPS[0]; el.querySelector('small').textContent = c[0]; el.querySelector('b').textContent = c[1]; el.classList.add('big'); el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); tone(392, 392, .25, 'triangle', .1); tone(523, 523, .35, 'triangle', .08, .2); }
function chapterCard(ch){ const el = $('chap'), c = CHAPS[ch] || CHAPS[0]; el.querySelector('small').textContent = c[0]; el.querySelector('b').textContent = c[1]; el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); tone(392, 392, .25, 'triangle', .12); tone(523, 523, .35, 'triangle', .12, .25); clearTimeout(chapterCard.t); chapterCard.t = setTimeout(() => { el.hidden = true; }, 3600); }
async function cut(steps){ await playCut(steps); for (const d of [...CUT.idle]) hideActor(d); for (const d of [hero.d, enemyD, wantedD, youssefD]) d.downT = Math.min(d.downT, 0); applyStoryWorld(); }
function beginMission(){
  const M = curM(); if (!M) return;
  ST2.d = { base: {} }; ST2.ev = {};
  const seen = SAVE.introSeen === SAVE.m;
  if (!seen && M.at){ ST2.phase = 'goto'; return; }
  playIntro(M, seen);
}
async function playIntro(M, seen){
  ST2.phase = 'intro';
  const steps = (!seen && M.intro) ? M.intro() : [];
  if (!seen && SAVE.chSeen !== M.ch){ SAVE.chSeen = M.ch; const pre = M.prologue ? PROLOGUE() : []; pre.push({ card: M.ch }, CHAP_NARR[M.ch] ? KN(CHAP_NARR[M.ch]) : { wait: 2.6 }, { card: false }); steps.unshift(...pre); }
  if (steps.length) await cut(steps);
  if (curM() !== M || modeId !== 'story' || state !== 'play') return;
  SAVE.introSeen = SAVE.m; saveStory();
  startActive(M);
  banner(`📱 ${M.title}`, 'info', 2.6);
}
function startActive(M){ ST2.d = { base: {} }; ST2.ev = {}; ST2.phase = 'active'; ST2.t0 = runTime; applyStoryWorld(); if (M.start) M.start(ST2.d); }
async function finishMission(){
  const M = curM(); ST2.phase = 'outro';
  if (M.cleanup) M.cleanup(ST2.d);
  if (modeObj.job) endJob(false); if (JOB.kind) endJob2(true);
  if (RHY.on) { RHY.t = RHY.dur + 2; }
  storyReset();
  const steps = M.outro ? M.outro(ST2.d) : [];
  if (steps.length) await cut(steps);
  if (modeId !== 'story') return;
  easyOff(); ST2.fails = 0; ST2.asked = false;
  if (REPLAY.on){ coin(); buzz(40); heroCheer(); banner(`✅ ${M.title}`, 'ok', 2.5); setTimeout(() => endReplay(M), 1600); return; }
  if (M.reward) hero.money += M.reward;
  if (!ST2.skipping) missionCard(M, runTime - (ST2.t0 ?? runTime), ST2.fails || 0, M.reward); ST2.skipping = false;
  SAVE.rep += 5; SAVE.m++; coin(); buzz(40);
  banner(`✅ ${M.title}${M.reward ? ' · +' + M.reward + ' جنيه' : ''}`, 'ok', 3); heroCheer();
  ST2.d = { base: {} }; parkArabiMoto(); applyStoryWorld();
  if (SAVE.m >= MS.length){ SAVE.ended = true; saveStory(); ST2.phase = 'done'; applyStoryWorld(); setTimeout(showStoryEnd, 1200); return; }
  saveStory(); ST2.phase = 'wait'; ST2.waitT = 2.2;
}
function failMission(msg){
  const M = curM(); ST2.phase = 'failed'; ST2.waitT = 3;
  if (ST2.failsFor !== M.id){ ST2.failsFor = M.id; ST2.fails = 0; ST2.asked = false; }
  ST2.fails++;
  if (M.cleanup) M.cleanup(ST2.d);
  if (modeObj.job) endJob(true); if (JOB.kind) endJob2(true);
  storyReset(); parkArabiMoto(); applyStoryWorld();
  banner(`❌ ${msg || 'المهمة فشلت'} · هتتعاد تاني`, 'bad', 3.5); buzz(60);
}
function retryMission(){
  const M = curM(); if (!M) return;
  if (M.spawn && heroAt().distanceTo(M.spawn) > 30) fadeTo(() => { heroTo(M.spawn.x, M.spawn.z); startActive(M); }, .3);
  else startActive(M);
}
function storyReset(){
  clearPickups(); clearCheckpoints(); boss.active = false; ghostEnd(ST2.d); clearThugs(ST2.d); ST2.d.shamsPos = null;
  if (wanted.active){ wanted.active = false; wantedD.root.visible = false; }
  if (thief.active && !thief.caught){ thief.active = false; youssefD.root.visible = false; thief.next = R(90, 160); }
  race.active = false; shamsMoto.visible = false; copCar.pos.set(copCar.home.x, copCar.home.y || 0, copCar.home.z); copCar.yaw = copCar.home.yaw; copCar.mesh.rotation.set(0, copCar.yaw, 0);
}
function showIdle(d, x, z){ d.root.visible = true; d.root.position.set(x, groundY(x, z), z); d.P.legL.visible = d.P.legR.visible = true; d.blob.visible = true; d.downT = 0; ST2.idle.add(d); }
// places and props that change with the story (Alexandria stage 4)
function storyWorld2(m, I){
  awningBurnt(m > I('awning') && m < I('epilogue'));
  showroomBurnt(m >= I('carStolen') && m < I('epilogue'));
  setRain(m >= I('nawaRaid') && m <= I('carBack') && ST2.phase === 'active');
  giveStick(m >= I('prepare') && m <= I('carBack') && ST2.phase === 'active');
  if (arabiCar && hero.veh !== arabiCar){
    const away = m < I('arabiArrives'), inPort = m > I('carStolen') && m <= I('carBack');
    arabiCar.mesh.visible = !away;
    if (away) arabiCar.pos.set(-600, 0, -600); else if (inPort) arabiCar.pos.copy(PORT.inside); else if (!(m === I('carStolen') && ST2.phase === 'active')){ arabiCar.pos.set(26, 0, 43.2); arabiCar.yaw = Math.PI / 2; }
    arabiCar.mesh.rotation.set(0, arabiCar.yaw, 0);
  }
  ST2.idle.delete(shadiaD);
  if (m > I('laundry') && !(m >= I('weddingNight') && m <= I('shamsWedding')) && ST2.phase !== 'intro' && ST2.phase !== 'outro' && !(curM() && curM().id === 'shadiaRide')) showIdle(shadiaD, -36.4, 87.6);
  else if (!CUT.on) shadiaD.root.visible = false;
}
function applyStoryWorld(){
  if (modeId !== 'story') return;
  const m = SAVE.m, I = idx;
  setNoEntryShown(signLevel()); setPostersShown(m > I('poster') && m <= I('bossFight'));
  wedding.visible = m >= I('weddingNight') && m <= I('plan');
  const atWed = m >= I('weddingNight') && m <= I('shamsWedding');
  ST2.idle.clear();
  if (atWed){ showIdle(islamD, -72, 38.4); ST2.idle.delete(islamD); }
  else { islamD.P.legL.visible = islamD.P.legR.visible = false; islamD.blob.visible = false; seatIslam(true); }
  const off = NP('officer'); if (off) off.g.visible = m >= I('poster');
  arabiMoto.mesh.visible = m >= I('spill');
  if (!thief.active) youssefD.root.visible = false;
  // العربي: enemy (chapters 1–4), ally (chapter 5), then a friend working at the café
  if (storyAlly()){ enemy.ally = true; enemy.active = true; enemy.state = 'roam'; enemy.d.downT = 0; enemy.hp = 100; }
  else { enemy.ally = false; if (!storyHostile()) arabiHide(); else if (enemy.active && !ST2.d.enemyBusy && ST2.phase !== 'active') arabiHide(); }
  storyWorld2(m, I);
  if (!storyAlly() && !storyHostile() && m > I('carBack')){ if (atWed) showIdle(enemyD, -68.6, 33.6); else showIdle(enemyD, 19.2, 24.8); }
  if (m > I('confess') && !thief.active) showIdle(youssefD, 118.4, 41.4);
  if (m > I('bossFight') || SAVE.ended){ wantedD.root.visible = boss.active; }
}
function storyTarget(){
  const M = curM();
  if (JOB.kind) return jobTarget();
  if (!M) return null;
  if (ST2.phase === 'goto') return M.at();
  if (ST2.phase === 'active' && M.target) return M.target(ST2.d);
  return null;
}
function storyMapMarks(t){
  if (modeId !== 'story') return [];
  const out = [], tg = storyTarget(); if (tg) out.push({ x: tg.x, z: tg.z, star: true });
  for (const p of pickups) if (!p.got) out.push({ x: p.pos.x, z: p.pos.z, r: 3.5, c: '#ffd34d' });
  for (const c of checkpoints) out.push({ x: c.pos.x, z: c.pos.z, r: 5, c: Math.floor(t*4)%2 ? '#ff2020' : '#3a6bff' });
  const sp = ST2.d.shamsPos || (boss.active ? boss.pos : null); if (sp) out.push({ x: sp.x, z: sp.z, r: 4.5, c: Math.floor(t*4)%2 ? '#ff2020' : '#ffffff' });
  if (ST2.d.tp && youssefD.root.visible) out.push({ x: ST2.d.tp.x, z: ST2.d.tp.z, r: 4, c: '#ffd34d' });
  return out;
}
function storyTick(dt){
  const M = curM(); if (!M || state !== 'play') return;
  if (ST2.phase === 'idle') return beginMission();
  if (ST2.phase === 'goto'){ if (!CUT.on && !hero.locked && near(heroAt(), M.at(), M.atR || 5)) playIntro(M, false); return; }
  if (ST2.phase === 'wait'){ ST2.waitT -= dt; if (ST2.waitT <= 0) ST2.phase = 'idle'; return; }
  if (ST2.phase === 'failed'){ ST2.waitT -= dt; if (ST2.waitT <= 0){ if (ST2.fails >= 3 && !ST2.asked && !EASY.on){ ST2.asked = true; ST2.phase = 'asking'; openFailAsk(); } else { ST2.phase = 'retrying'; retryMission(); } } return; }
  if (ST2.phase !== 'active' || CUT.on) return;
  const r = M.update ? M.update(dt, ST2.d) : false;
  if (r === true) finishMission(); else if (r === 'fail') failMission(ST2.d.failMsg);
}
function showStoryEnd(){ if (modeId !== 'story') return; hero.locked = true; $('storyEnd').hidden = false; tone(523,523,.15,'triangle',.2); tone(659,659,.15,'triangle',.2,.15); tone(784,1046,.5,'triangle',.22,.3); }
$('storyEndBtn').onclick = () => { $('storyEnd').hidden = true; hero.locked = false; };
// small talk with the named people
const NAMED_LINES = {
  moallem: ['الشغل مش عيب يا طيارة','الشاي التقيل لزبون الصبح','فين الصينية يا ابني؟','القهوة دي بيتي التاني'],
  landlord: ['البيت بيتك يا ابني… بس الإيجار إيجار 😄','ربنا يكرمك يا طيارة','شد حيلك يا ابني'],
  azzouz: ['البيتزا بتبرد يا طيارة!','عندي طلبات كتير النهارده','أحسن بيتزا في مصر عند عزوز 🍕'],
  fathi: ['الفول بالزيت الحار؟','الطعمية لسه طالعة من الزيت','يوسف لو جه قولي'],
  officer: ['عينك على الشارع يا طيارة','لو شفت حاجة غريبة بلّغني','المكافأة لسه موجودة'],
  reda: ['التوكتوك مستنيك','اللي يطلع من الشغل نصين','حافظ عليه زي عينيك'],
};
function storyAction(){
  const p = hero.pos, m = modeObj, M = curM(), d = ST2.d;
  if (ST2.phase === 'active' && M && M.action){ const a = M.action(p, d); if (a) return a; }
  if (m.job === 'ahwa'){
    if (p.distanceTo(SPOT.counter) < 2.6) return { text: 'ادخل النَصبة وحضّر الطلبات', fn: () => enterStation('ahwa') };
    const c = m.patrons.find(n => n.state === 'customer' && n.order && Math.hypot(n.g.position.x-p.x, n.g.position.z-p.z) < 2);
    if (c) return { text: `قدّم ${c.order.drink} ${c.order.sugar} لـ ${c.name}`, fn: () => serveAhwa(c) };
    return null;
  }
  if (m.job === 'foul') return Math.hypot(p.x-SPOT.cart.x, p.z-SPOT.cart.z) < 2.8 ? { text: 'ارجع لعربية الفول', fn: () => enterStation('foul') } : null;
  if (JOB.kind) return null;
  if (p.distanceTo(SHOP.pos) < 2.6) return { text: 'ادخل محل الأناقة', fn: openShop };
  for (const [v, kind] of [[heroMoto,'moto'],[heroCar,'car']]) if (!SAVE.owned[kind] && Math.hypot(v.pos.x-p.x, v.pos.z-p.z) < 3.2) return { text: `اشتري ${kind === 'moto' ? 'الموتوسيكل' : 'العربية'} (${PRICE[kind]} جنيه)`, fn: () => buyVehicle(kind) };
  if (near(p, SPOT.house, 2.4)) return { text: 'ادخل البيت 🏠', fn: enterHouse };
  if (unlocked('tea') && p.distanceTo(SPOT.counter) < 2.6) return { text: 'اشتغل وردية قهوجي ☕', fn: () => startJob('ahwa') };
  if (unlocked('foul') && Math.hypot(p.x-SPOT.cart.x, p.z-SPOT.cart.z) < 2.8) return { text: 'اشتغل على عربية الفول 🧆', fn: () => startJob('foul') };
  if (unlocked('pizza3') && near(p, SPOT.azzouz, 3.2)) return { text: 'اشتغل ديليفري بيتزا 🍕', fn: startPizzaJob };
  if (unlocked('pizza3') && near(p, tukVeh.pos, 4.4)) return { text: 'اشتغل على التوكتوك 🛺', fn: startTukJob };
  for (const [k, n] of Object.entries(ST2.npcs)) if (n.g.visible && n.state === 'idle' && near(p, n.g.position, 2.2)) return { text: `كلّم ${n.name}`, fn: () => { say(n, rpick(NAMED_LINES[k] || ['أهلاً يا طيارة']), 2.6); n.yaw = Math.atan2(p.x - n.g.position.x, p.z - n.g.position.z); } };
  return null;
}
function storyHudTitle(){ const m = modeObj; if (m.job === 'ahwa') return 'وردية قهوجي ☕'; if (m.job === 'foul') return 'شغل الفول 🧆'; if (JOB.kind === 'pizza') return 'ديليفري عزوز 🍕'; if (JOB.kind === 'tuk') return 'سواق توكتوك 🛺'; const M = curM(); return M ? `📱 ${M.title}` : 'طيارة الجامد 👑'; }
function storyHud(){
  const m = modeObj, M = curM(); let s;
  if (m.job) s = `الوقت: <b style="display:inline;color:#fff">${fmtTime(m.time||0)}</b> · بعت: ${m.served} · زعلانين: <b style="display:inline;color:#ff9a9a">${m.angry}/٣</b><br>كسبت: ${egp(m.earned)}${m.job === 'ahwa' ? '<br>روح النَصبة (E) ووزّع على الزباين.' : ''}`;
  else if (JOB.kind) s = jobHud();
  else if (!M) s = 'خلصت القصة! لف في الحتة براحتك: اشتغل، العب دومنو، وجدّد البيت.';
  else if (ST2.phase === 'goto') s = M.goText || 'روح للعلامة (★)';
  else if (ST2.phase === 'active') s = M.text ? M.text(ST2.d) : '…';
  else s = '…';
  if (M && ST2.phase === 'active' && (m.job || JOB.kind) && M.text) s += `<br><small style="color:#ffd98a">📱 ${M.text(ST2.d)}</small>`;
  const c = CHAPS[M ? M.ch : 8];
  return s + `<br><small style="color:#c2b7a3">🕐 ${clockText()} · ${c[0]}: ${c[1]}</small>`;
}
function updateStory(dt){
  motoTag.visible = !SAVE.owned.moto && !CUT.on; carTag.visible = !SAVE.owned.car && !CUT.on;
  motoTag.position.set(heroMoto.pos.x, 2.1, heroMoto.pos.z); carTag.position.set(heroCar.pos.x, 2.6, heroCar.pos.z);
  storyTick(dt);
  // the clock: one game hour every 40 seconds
  TOD.h = (TOD.h + dt/40) % 24; ST2.todT = (ST2.todT || 0) - dt; if (ST2.todT <= 0){ ST2.todT = .5; applyTimeOfDay(TOD.h); }
  updatePickups(dt, runTime); updateStalker(dt); updateBoss(dt, runTime);
  for (const d of ST2.idle) if (d.root.visible && !CUT.idle.has(d)) animDoll(d, 0, 0, dt, runTime);
  const tgt = storyTarget();
  missionMark.visible = !!tgt && !ST.kind && !HOUSE.inside && !CUT.on;
  if (tgt){ missionMark.position.set(tgt.x, 0, tgt.z); missionMark.children[1].rotation.z += dt; }
  const m = modeObj; m.saveT = (m.saveT || 0) - dt; if (m.saveT <= 0){ m.saveT = 5; saveStory(); }
}

function resetWorld(){
  clearBubbles();
  if (JOB.kind) endJob2(true); if (CUT.on) CUT.skip = true; if (ACT.kind) actEnd(null);
  if (RHY.on){ RHY.on = false; RHY.res = null; $('rhy').hidden = true; $('rhyNotes').innerHTML = ''; document.body.classList.remove('in-rhythm'); }
  leavePlaces();
  if (HOUSE.inside){ HOUSE.inside = false; if (HOUSE.prevCam) camTarget = HOUSE.prevCam; }
  storyReset(); wedding.visible = false; ST2.idle.clear(); ST2.phase = 'off'; enemy.ally = false; pizzaBox.visible = false; $('chap').hidden = true;
  for (const d of [youssefD, enemyD, wantedD]){ d.root.visible = false; d.P.legL.visible = d.P.legR.visible = true; d.blob.visible = true; d.downT = 0; }
  islamD.P.legL.visible = islamD.P.legR.visible = false; islamD.blob.visible = false;
  vehicles.forEach(v => { v.pos.set(v.home.x, v.home.y||0, v.home.z); v.yaw = v.home.yaw; v.mesh.rotation.set(0, v.yaw, 0); v.speed = 0; v.dmg = 0; v.broke = false; });
  seatIslam(false); seatKamel(false); thiefReset();
  motoTag.visible = carTag.visible = false; missionMark.visible = false; race.active = false; enemy.boss = false; enemy.maxHp = 100; $('shop').hidden = true; $('storyEnd').hidden = true;
  npcs.forEach(n => { if (n.thug) npcTakeOff3D(n); n.state = 'hidden'; n.g.visible = false; n.role = null; n.onArrive = null; n.thug = false; n.thugDone = false; n.g.rotation.x = 0; });
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
  seatNPC(a, SPOT.domino.x-.85, SPOT.domino.z, Math.PI/2); a.state = 'domino'; a.name = 'الحاج كامل';
  if (seatKamel(true)){ a.state = 'hidden'; a.g.visible = false; }   // the 3D الحاج كامل takes the seat
  seatNPC(b, SPOT.domino.x+.85, SPOT.domino.z, -Math.PI/2); b.state = 'hidden'; b.g.visible = false; seatIslam(true);
  let k = start+2; [0,3,5,8,10].forEach(si => { const s = SEATS[si]; seatNPC(npcs[k], s.x, s.z, s.ry); k++; });
  const v = npcs[k]; seatNPC(v, SPOT.cartHero.x, SPOT.cartHero.z, 0); v.state = 'idle'; v.g.position.y = .15; k++;
  return k;
}

function startMode(id){
  initAudio(); if (arabiCar && id !== 'story'){ arabiCar.mesh.visible = true; } setRain(false); giveStick(false); clearFires(); if (isTouch && !document.fullscreenElement) goFull();
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
    tawla: () => { const r = M_.free(); hero.pos.set(TAWLA_SPOT.x, .15, TAWLA_SPOT.z + 1.6); setTimeout(openTawla, 200); return r; },
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
      seatNPC(a, SPOT.domino.x-.85, SPOT.domino.z, Math.PI/2); a.state = 'domino'; a.name = 'الحاج كامل';
      if (seatKamel(true)){ a.state = 'hidden'; a.g.visible = false; }
      seatNPC(b, SPOT.domino.x+.85, SPOT.domino.z, -Math.PI/2); b.state = 'hidden'; b.g.visible = false; seatIslam(true);
      decoGlasses.forEach(g => g.visible = false);
      setupNamed(); arabiHide(); enemy.boss = false; enemy.maxHp = 100; hero.pos.copy(SPOT.spawn);
      ST2.phase = SAVE.m >= MS.length ? 'done' : 'idle'; ST2.d = { base: {} }; ST2.ev = {}; ST2.stalkT = 45; SAVE.started = true;
      const M = curM();
      if (SAVE.m === 0 && SAVE.introSeen !== 0){ HOUSE.inside = true; HOUSE.prevCam = camTarget; camTarget = Math.min(camTarget, 3.4); camDist = camTarget; hero.pos.set(-403.6, 0, -399.6); CAM.orbit = CAM.orbitSm = 0; }
      else if (M && M.spawn && SAVE.introSeen === SAVE.m) hero.pos.copy(M.spawn);
      houseVisual(); TOD.h = SAVE.time ?? 9; applyTimeOfDay(TOD.h); parkArabiMoto(); applyStoryWorld();
      const patrons = npcs.slice(free+2, free+14), pool = npcs.slice(free+14, free+20);
      return { vehicles: true, cafe: true, story: true, title: 'القصة', job: null, patrons, pool, tray: [], seatsTaken: new Set(), queue: [], served: 0, angry: 0, earned: 0, spawnT: 1, domBet: 20,
        canDrive: v => (v === heroMoto && SAVE.owned.moto) || (v === heroCar && SAVE.owned.car) || (!!v.jobOnly && v.jobOnly === JOB.kind) || (v === arabiMoto && !!ST2.d.arabiMoto) || (!!v.jobOnly && v.jobOnly === ACT.kind) || (v === arabiCar && !!ST2.d.arabiCar) || (v.type === 'boat' && !!ST2.d.boatOK),
        hud: storyHud, hudTitle: storyHudTitle, action: storyAction,
        onServe: (kind, drink) => { SAVE.cnt[kind] = (SAVE.cnt[kind]||0) + 1; if (drink === 'شاي') SAVE.cnt.tea = (SAVE.cnt.tea||0) + 1; if (drink === 'قهوة') SAVE.cnt.coffee = (SAVE.cnt.coffee||0) + 1; },
        onDomino: w => { const bet = Math.min(modeObj.domBet, Math.max(0, Math.floor(hero.money))); if (w){ hero.money += bet; SAVE.cnt.dom = (SAVE.cnt.dom||0) + 1; } else hero.money -= bet; saveStory(); return bet; },
        onEnemyDown: () => { SAVE.cnt.edown = (SAVE.cnt.edown||0) + 1; saveStory(); },
        onArrest: () => { onStoryEvent('arrest'); coin(); },
        onKO: why => { knockout(why); const M = curM(); if (M && ST2.phase === 'active' && M.koFail){ hero.hp = 100; failMission('اتبهدلت'); } },
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
  if (id !== 'story' || !REPLAY.on) REPLAY.last = -1;
  if (id !== 'story'){ const h0 = PROG.ramadan && (id === 'free' || id === 'domino') ? 21 : 15; TOD.h = h0; applyTimeOfDay(h0); setNoEntryShown(1); setPostersShown(true); }
  modeObj = M_[id](); if (modeObj.init) modeObj.init();
  
  setObjective(modeObj.title, '');
  camera.position.set(hero.pos.x, 4, hero.pos.z + 6); lookAt.copy(hero.pos);
  refreshTray(); updateHud(); if (id === 'foul') enterStation('foul');
  banner({ story: SAVE.started && SAVE.m ? 'رجعت الحتة يا ' + heroName + ' 👑' : 'يلا يا ' + heroName + '… نبقى الجامد 👑', free:'أهلاً بيك في الحتة يا ' + heroName, police:'المطلوب في الحتة… اركب البوكس 🚓', cash:'دوّر على رزم الفلوس 💵', ahwa:'الزباين جايين… جهّز النَصبة ☕', foul:'افتح العربية… الزباين جايين 🧆', domino:'اقعد يا ' + heroName, tawla:'عم رجب مستنيك على الطاولة 🎯' }[id], 'info', 2.6);
}
function bestScore(key, v){ const b = parseFloat(store.get('ty_best_'+key)||'0'); if (v > b){ store.set('ty_best_'+key, String(v)); return 'رقم قياسي جديد! 🏆'; } return `أحسن غلة: ${egp(b)}`; }
function endMode(title, text, best=''){
  if (state !== 'play') return; state = 'end';
  if (sirenGain) sirenGain.gain.value = 0;
  $('endTitle').textContent = title; $('endText').textContent = text; $('endBest').textContent = best;
  exitStation(true); $('domino').hidden = true; document.body.classList.remove('in-domino'); hero.locked = false;
  setTimeout(() => { $('hud').hidden = true; $('end').hidden = false; }, 700);
}
function openMenu(){ if (REPLAY.on) stopReplay(); else saveStory(); easyOff(); REPLAY.last = -1; mmPage('mmMain'); closePause(); renderModes(); state = 'menu'; $('hud').hidden = true; $('domino').hidden = true; $('end').hidden = true; $('menu').hidden = false; clearBubbles(); exitStation(true); document.body.classList.remove('in-domino'); if (sirenGain) sirenGain.gain.value = 0; try { speechSynthesis.cancel(); } catch(e){} }
$('againBtn').onclick = () => REPLAY.last >= 0 && modeId === 'story' ? startReplay(REPLAY.last) : startMode(modeId);
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
  const pay = 5 + tip + cb; modeObj.served++; modeObj.earned += pay; hero.money += pay; if (modeObj.onServe) modeObj.onServe('ahwa', item.drink); stat('drinks');
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
      n.onArrive = n2 => { seatNPC(n2, s.x, s.z, s.ry); n2.state = 'customer'; const rg = REGULARS[n2.name]; n2.order = rg && Math.random() < .75 ? { ...rg, reg: true } : { drink: pickDrink(), sugar: rpick(SUGARS) }; n2.maxPat = 120*DIFF.pat; n2.patience = n2.maxPat; n2.bubble = orderBubble(n2); say(n2, n2.order.reg ? `زي العادة يا ${heroName}! ${n2.order.drink} ${n2.order.sugar}` : `واحد ${n2.order.drink} ${n2.order.sugar} يا ريس!`, 0); buzz(15); };
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
// on short (landscape phone) screens the mission card is clamped; tap it to read all of it
document.querySelector('.card.obj').addEventListener('pointerdown', e => { e.stopPropagation(); e.currentTarget.classList.toggle('open'); });

// ---- 21-domino-egyptian-rules-2-players.js ----
// ================= domino (Egyptian rules: 1v1 and 2v2) =================
// 1v1: 7 tiles each, 14 in the boneyard (الكومة): draw until you can play. 2v2: 7 each, no boneyard, partners sit opposite.
// The match is to 250. The side that goes out takes the pips left in the losing side's hands, rounded to the nearest 10,
// and a 5 goes down: 25 → 20, 26 → 30, 1–5 → 0.
// Who opens: the first hand (and after a redeal or a tied قفلة) the holder of الدش (6-6) opens with it. After that the winner of
// the last hand opens with any tile.
// Redeal: anyone dealt 5 doubles, or 6 tiles of one number.
// باب = how many tiles of one number you hold. مسبعين = a side holds all 7 of a number. Both are shown only; no points.
// قفلة (blocked game): the side with fewer pips takes the other side's pips (rounded); a tie scores nothing.
// Cheating, and catching cheats, is only in the optional fun mode («غش للهزار»).
const NUMN = ['أبيض','يك','دو','سيه','جوهار','بانج','شيش'];
const DBL = ['البلاطة','الهبياك','الدوبارة','الدوسة','الدورجي','الدبش','الدش'];
const tName = t => t[0] === t[1] ? DBL[t[0]] : `${NUMN[Math.max(t[0],t[1])]} ${NUMN[Math.min(t[0],t[1])]}`;
const pipsOf = arr => arr.reduce((s,t) => s + t[0] + t[1], 0);
const sameT = (a,b) => (a[0]===b[0] && a[1]===b[1]) || (a[0]===b[1] && a[1]===b[0]);
const touches = (t, v) => t[0] === v || t[1] === v;
const ALL_TILES = []; for (let a=0;a<=6;a++) for (let b=a;b<=6;b++) ALL_TILES.push([a,b]);
const round10 = x => { const r = x % 10; return r <= 5 ? x - r : x + 10 - r; };   // 25 → 20, 26 → 30
const babCounts = h => [0,1,2,3,4,5,6].map(v => h.filter(t => touches(t, v)).length);
const DOM = { mode: null, seats: [], hands: [], dealt: [], bone: [], board: [], start: 0, L: null, R: null, turn: 0, sel: null, selCheat: false, score: [0,0], target: 250, over: true, matchOver: true, mustStart: null, lastWinner: null, weak: [], cheats: [], accused: false, lastSide: 'R', endBy: { L: -1, R: -1 }, aiTimer: null,
  diff: ['easy','normal','hard'].includes(store.get('ty_dom_diff')) ? store.get('ty_dom_diff') : 'normal', cheat: store.get('ty_dom_cheat') === '1' };
const PIPS = { 0:[], 1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8] };
const tileHTML = (t, cls='', attrs='') => `<span class="tile ${t[0]===t[1] ? 'dbl' : ''} ${cls}" ${attrs}>${[t[0],t[1]].map(v => `<span class="half">${[...Array(9)].map((_,i) => PIPS[v].includes(i) ? '<i class="pip"></i>' : '<i></i>').join('')}</span>`).join('')}</span>`;
const teamOf = s => s % 2;          // seat 0 (you) and 2 (partner) are team 0
const isMe = s => s === 0;
const NS = () => DOM.seats.length;
const hand = s => DOM.hands[s];
const teamName = tm => DOM.mode === '1v1' ? (tm === 0 ? heroName : 'الحاج كامل') : (tm === 0 ? 'إحنا' : 'هما');
function openDomino(){
  hero.locked = true; $('domino').hidden = false; document.body.classList.add('in-domino');
  if (DOM.matchOver){ $('dPick').hidden = false; $('dGame').hidden = true; renderDomOpts(); $('dScore').textContent = modeObj.domBet ? `الرهان ${Math.min(modeObj.domBet, Math.floor(hero.money))} جنيه` : ''; }
  else { $('dPick').hidden = true; $('dGame').hidden = false; renderDomino(); if (!DOM.over && !isMe(DOM.turn)) scheduleAI(); }
}
function closeDomino(){ $('domino').hidden = true; hero.locked = false; document.body.classList.remove('in-domino'); clearTimeout(DOM.aiTimer); }
$('dExit').onclick = closeDomino;
document.querySelectorAll('[data-dm]').forEach(b => b.onclick = () => newDominoMatch(b.dataset.dm));
$('dAgain').onclick = () => { if (DOM.matchOver){ $('dPick').hidden = false; $('dGame').hidden = true; renderDomOpts(); } else newDominoRound(); };
// match options: how good the others play, and the fun cheating mode
function renderDomOpts(){
  document.querySelectorAll('[data-dd]').forEach(b => b.classList.toggle('on', b.dataset.dd === DOM.diff));
  $('dCheatMode').classList.toggle('on', DOM.cheat); $('dCheatMode').textContent = DOM.cheat ? '😈 الغش شغال (للهزار)' : '😇 من غير غش';
}
document.querySelectorAll('[data-dd]').forEach(b => b.onclick = () => { DOM.diff = b.dataset.dd; store.set('ty_dom_diff', DOM.diff); renderDomOpts(); });
$('dCheatMode').onclick = () => { DOM.cheat = !DOM.cheat; store.set('ty_dom_cheat', DOM.cheat ? '1' : '0'); renderDomOpts(); };
function newDominoMatch(mode){
  DOM.mode = mode; DOM.score = [0,0]; DOM.matchOver = false; DOM.lastWinner = null; DOM.target = 250;
  DOM.seats = mode === '1v1'
    ? [{ name: heroName, face: CH.hero.img.face }, { name: 'الحاج كامل', face: null }]
    : [{ name: heroName, face: CH.hero.img.face }, { name: 'شمس', face: CH.wanted.img.face }, { name: 'إسلام', face: CH.islam.img.face }, { name: 'العربي', face: CH.enemy.img.face }];
  $('dPick').hidden = true; $('dGame').hidden = false; document.querySelector('.seats').classList.toggle('four', mode === '2v2');
  newDominoRound();
}
// deal; deal again while anyone has 5 doubles or 6 of one number
function dealDomino(){
  for (let tries = 0; tries < 50; tries++){
    const all = ALL_TILES.map(t => [...t]);
    for (let i=all.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [all[i],all[j]] = [all[j],all[i]]; }
    const hands = []; for (let s=0;s<NS();s++) hands.push(all.slice(s*7, s*7+7));
    const bad = hands.findIndex(h => h.filter(t => t[0] === t[1]).length >= 5 || Math.max(...babCounts(h)) >= 6);
    if (bad < 0 || tries === 49) return { hands, bone: all.slice(NS()*7), redeals: tries };
  }
}
function newDominoRound(){
  clearTimeout(DOM.aiTimer);
  const d = dealDomino();
  DOM.hands = d.hands; DOM.bone = d.bone; DOM.dealt = d.hands.map(h => h.map(t => [...t]));
  DOM.hands[0].sort((a,b) => (b[0]+b[1]) - (a[0]+a[1]));
  Object.assign(DOM, { board: [], start: 0, L: null, R: null, sel: null, selCheat: false, over: false, weak: DOM.seats.map(() => []), cheats: [], accused: false, mustStart: null, endBy: { L: -1, R: -1 } });
  if (d.redeals) DOM.lastWinner = null;          // after a redeal الدش opens again
  let who, msg;
  if (DOM.lastWinner !== null){ who = DOM.lastWinner; msg = isMe(who) ? 'كسبت الدور اللي فات… ابدأ بأي حجر' : `${DOM.seats[who].name} كسب الدور اللي فات… هو اللي هيبدأ`; }
  else {
    // الدش; if it is in the boneyard (1v1), the highest double; no double at all: the heaviest tile
    let st = null;
    for (let dd=6; dd>=0 && !st; dd--) for (let s=0; s<NS() && !st; s++) if (hand(s).some(t => t[0]===dd && t[1]===dd)) st = { s, t: [dd,dd] };
    if (!st){ let best = null; for (let s=0;s<NS();s++) for (const t of hand(s)) if (!best || t[0]+t[1] > best.t[0]+best.t[1]) best = { s, t }; st = best; }
    who = st.s; DOM.mustStart = st.t; msg = isMe(who) ? `معاك ${tName(st.t)}… ابدأ بيه 👇` : `${DOM.seats[who].name} معاه ${tName(st.t)}… هو اللي هيبدأ`;
  }
  if (d.redeals) msg = `اتفرّقت تاني ${d.redeals === 1 ? '' : d.redeals + ' مرات '}(حد كان معاه ٥ دبش أو ٦ من باب) · ` + msg;
  DOM.turn = who; dMsg(msg); renderDomino(); if (!isMe(who)) scheduleAI(1400);
}
function fits(t){ if (!DOM.board.length) return !DOM.mustStart || sameT(t, DOM.mustStart); return touches(t, DOM.L) || touches(t, DOM.R); }
function placeTile(t, side, cheat){
  if (!DOM.board.length){ DOM.board.push([t[0],t[1]]); DOM.start = 0; DOM.L = t[0]; DOM.R = t[1]; return 'R'; }
  let o;
  if (side === 'L'){ if (t[1]===DOM.L) o = [t[0],t[1]]; else if (t[0]===DOM.L) o = [t[1],t[0]]; else if (cheat) o = [t[0],t[1]]; else return null; DOM.board.unshift(o); DOM.start++; DOM.L = o[0]; return 'L'; }
  if (t[0]===DOM.R) o = [t[0],t[1]]; else if (t[1]===DOM.R) o = [t[1],t[0]]; else if (cheat) o = [t[0],t[1]]; else return null; DOM.board.push(o); DOM.R = o[1]; return 'R';
}
function unplace(side, prev){ if (side === 'L'){ DOM.board.shift(); DOM.start--; } else DOM.board.pop(); DOM.L = prev.L; DOM.R = prev.R; }
// blocked when every tile with either end number is already on the table (visible to everyone)
const endsBlocked = (L, R, board) => ALL_TILES.filter(t => touches(t, L) || touches(t, R)).every(t => board.some(b => sameT(b, t)));
function isBlocked(){ return DOM.board.length > 0 && endsBlocked(DOM.L, DOM.R, DOM.board); }
function dMsg(t){ $('dMsg').textContent = t; }
function nextTurn(){ DOM.turn = (DOM.turn + 1) % NS(); DOM.sel = null; DOM.selCheat = false; renderDomino(); if (!isMe(DOM.turn) && !DOM.over) scheduleAI(); }
// a person thinks a bit longer when there is more to choose from
function scheduleAI(ms){
  clearTimeout(DOM.aiTimer);
  if (ms === undefined){ const n = DOM.over ? 0 : aiLegal(DOM.turn).length, c = DOM_AI[DOM.diff]; ms = c.think[0] + Math.min(1, Math.max(0, n - 1) / 4) * (c.think[1] - c.think[0]) + Math.random() * 350; }
  DOM.aiTimer = setTimeout(aiTurn, ms);
}
// باب: the numbers you hold 3 or more of
function babText(h){
  const c = babCounts(h).map((n, v) => ({ n, v })).filter(x => x.n >= 3).sort((a, b) => b.n - a.n);
  return c.length ? 'بابك: ' + c.map(x => `${NUMN[x.v]} <b>${x.n}</b>`).join(' · ') : '';
}

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
  $('dPass').hidden = !(myTurn && started && ((!canPlay && (!DOM.bone.length || DOM.mode === '2v2')) || DOM.cheat));
  $('dCheat').hidden = !(DOM.cheat && myTurn && DOM.board.length > 1 && !DOM.accused);
  $('dBab').innerHTML = babText(hand(0));
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
    if (!DOM.cheat){ dMsg(`${tName(t)} مش راكب على الـ${NUMN[DOM.L]} ولا الـ${NUMN[DOM.R]}`); return renderDomino(); }
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
function commitPlayer(i, side, cheat=false){
  const t = hand(0)[i], prev = { L: DOM.L, R: DOM.R }, first = !DOM.board.length;
  const s = placeTile(t, side, cheat); if (!s) return;
  hand(0).splice(i,1); DOM.sel = null; DOM.selCheat = false; DOM.lastSide = s; DOM.cheats = []; DOM.accused = false;
  if (first) DOM.endBy = { L: 0, R: 0 }; else DOM.endBy[s] = 0;
  tileClack(); buzz(10);
  if (cheat){
    if (Math.random() < .6){ unplace(s, prev); hand(0).splice(i, 0, t); DOM.score[1] += 50; tone(300,150,.4,'sawtooth',.1); buzz(60); dMsg(`🚨 اتمسكت بتغش! +٥٠ لـ ${teamName(1)}`); speak('بتغش؟'); renderDomino(); checkMatch(); return; }
    dMsg(`نزّلت ${tName(t)} غش… محدش خد باله 🤫`);
  } else dMsg(`نزّلت ${tName(t)}`);
  afterPlay(0);
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
    if (!DOM.cheat) return dMsg('معاك حجر بيركب… مينفعش تفوّت');
    if (Math.random() < .5){ DOM.score[1] += 50; buzz(60); dMsg(`🚨 فوّت وانت معاك؟! اتمسكت… +٥٠ لـ ${teamName(1)}`); renderDomino(); if (checkMatch()) return; }
    else dMsg('فوّت وانت معاك… محدش خد باله 🤫');
  } else { dMsg('فوّت'); DOM.weak[0] = [...new Set([...DOM.weak[0], DOM.L, DOM.R])]; }
  DOM.cheats = []; nextTurn();
};
$('dCheat').onclick = () => {
  if (DOM.accused || !DOM.cheat) return; DOM.accused = true;
  const c = DOM.cheats.find(x => teamOf(x.seat) === 1);
  if (c){
    DOM.score[0] += 50; coin();
    if (c.type === 'tile'){ const endT = c.side === 'L' ? DOM.board[0] : DOM.board[DOM.board.length-1]; if (endT && sameT(endT, c.t)){ unplace(c.side, c.prev); hand(c.seat).push(c.t); } }
    dMsg(`🚨 مسكت ${DOM.seats[c.seat].name} بيغش! +٥٠ لـ ${teamName(0)}`); speak('خلاص خلاص… مسكتني');
  } else dMsg('ظلمتهم… محدش كان بيغش 😅');
  DOM.cheats = DOM.cheats.filter(x => x !== c); renderDomino(); checkMatch();
};

// ---------- after any move ----------
function afterPlay(seat){
  if (!hand(seat).length) return endRound({ type: 'out', seat });
  if (isBlocked()) return endRound({ type: 'block', seat });
  nextTurn();
}

// ---------- computer players ----------
// easy: plays almost at random among what fits. normal: plays well with a bit of noise.
// hard: counts the tiles, remembers who passed on what, plays for the partner and against the next player.
const DOM_AI = {
  easy:   { think: [900, 1700], noise: 10, know: false, look: 0,  partner: 0 },
  normal: { think: [800, 1700], noise: 3,  know: true,  look: .6, partner: .5 },
  hard:   { think: [700, 2100], noise: .7, know: true,  look: 1,  partner: 1 },
};
function aiLegal(seat){
  const o = [];
  if (!DOM.board.length){ hand(seat).forEach(t => { if (!DOM.mustStart || sameT(t, DOM.mustStart)) o.push({ t, side: 'R' }); }); return o; }
  hand(seat).forEach(t => { if (touches(t, DOM.L)) o.push({ t, side: 'L' }); if (touches(t, DOM.R) && (DOM.L !== DOM.R || !touches(t, DOM.L))) o.push({ t, side: 'R' }); });
  return o;
}
// the tiles a seat can't see: not on the table and not in its own hand
const unseenBy = seat => ALL_TILES.filter(t => !DOM.board.some(b => sameT(b, t)) && !hand(seat).some(h => sameT(h, t)));
// chance that seat s holds a tile for the ends (L, R), worked out from what is unseen and the numbers s has passed on
function pCanPlay(s, L, R, pool){
  const W = DOM.weak[s] || [];
  const possible = pool.filter(t => !W.includes(t[0]) && !W.includes(t[1]));
  const N = possible.length, k = possible.filter(t => touches(t, L) || touches(t, R)).length, h = hand(s).length;
  if (!k || !h) return 0; if (h >= N) return 1;
  let none = 1; for (let i = 0; i < h; i++) none *= Math.max(0, N - k - i) / (N - i);
  return 1 - none;
}
function aiEval(seat, o, cfg, pool){
  const t = o.t, rest = hand(seat).filter(x => x !== t);
  let L = DOM.L, R = DOM.R;
  if (!DOM.board.length){ L = t[0]; R = t[1]; }
  else if (o.side === 'L') L = t[0] === DOM.L ? t[1] : t[0];
  else R = t[0] === DOM.R ? t[1] : t[0];
  if (!rest.length) return 1e6;                                             // going out
  const oppMin = Math.min(...DOM.seats.map((_, s) => teamOf(s) !== teamOf(seat) ? hand(s).length : 99));
  let sc = (t[0] + t[1]) * (oppMin <= 2 ? 1.6 : .8);                        // get rid of heavy tiles, faster when someone is nearly out
  if (t[0] === t[1]) sc += 6;                                               // doubles are hard to place later
  sc += rest.filter(x => touches(x, L) || touches(x, R)).length * 2.5;      // keep something to play next turn
  sc += new Set(rest.flat()).size;                                          // keep different numbers
  if (cfg.know){
    for (let k = 1; k < NS(); k++){
      const s = (seat + k) % NS(), w = k === 1 ? 1 : .45, p = pCanPlay(s, L, R, pool);
      if (teamOf(s) !== teamOf(seat)) sc -= 16 * p * w * cfg.look;          // make the other side pass
      else sc += 10 * p * w * cfg.partner;                                   // leave something for the partner
    }
    if (NS() === 4 && DOM.board.length && DOM.endBy[o.side] === (seat + 2) % 4) sc -= 5 * cfg.partner;   // don't cover what the partner just opened
  }
  if (endsBlocked(L, R, [...DOM.board, t])){
    // closing the game: worth it only if this side has fewer pips (own hand exact, the others guessed)
    const avg = pool.length ? pipsOf(pool) / pool.length : 6;
    let ours = pipsOf(rest), theirs = 0;
    DOM.seats.forEach((_, s) => { if (s === seat) return; const est = hand(s).length * avg; if (teamOf(s) === teamOf(seat)) ours += est; else theirs += est; });
    sc += (ours < theirs ? 45 : -45) * (cfg.know ? 1 : .3);
  }
  return sc + (Math.random() * 2 - 1) * cfg.noise * 3;
}
const TALK = ['اتلمّ يا ' + heroName, 'دي لعبتي من زمان', 'ركّز يا ابني', 'هتعمل إيه دلوقتي؟', 'شوف دي بقى', 'ماشي ماشي', 'العب يا عم', 'الحجر ده كان مستنيك'];
function aiTurn(){
  if (DOM.over || isMe(DOM.turn) || $('domino').hidden) return;
  const seat = DOM.turn, p = DOM.seats[seat], opp = teamOf(seat) === 1, cfg = DOM_AI[DOM.diff];
  let opts = aiLegal(seat);
  // fun mode only: the other side cheats now and then
  if (DOM.cheat && DOM.board.length && opp && opts.length && Math.random() < .05){ DOM.cheats.push({ seat, type: 'pass' }); dMsg(`${p.name}: «فوّت»`); return nextTurn(); }
  if (DOM.cheat && DOM.board.length && opp && Math.random() < .04 && hand(seat).length > 1){ const bad = hand(seat).find(t => !touches(t, DOM.L) && !touches(t, DOM.R)); if (bad){ const prev = { L: DOM.L, R: DOM.R }, side = Math.random() < .5 ? 'L' : 'R'; placeTile(bad, side, true); hand(seat).splice(hand(seat).indexOf(bad), 1); DOM.lastSide = side; DOM.endBy[side] = seat; DOM.cheats.push({ seat, type: 'tile', t: bad, side, prev }); dMsg(`${p.name} نزل ${tName(bad)}`); tileClack(); return afterPlay(seat); } }
  let drew = 0;
  if (DOM.mode === '1v1') while (!opts.length && DOM.bone.length){ DOM.weak[seat] = [...new Set([...DOM.weak[seat], DOM.L, DOM.R])]; hand(seat).push(DOM.bone.pop()); drew++; opts = aiLegal(seat); }
  if (!opts.length){ DOM.weak[seat] = [...new Set([...DOM.weak[seat], DOM.L, DOM.R])]; dMsg(drew ? `${p.name} سحب ${drew} وفوّت` : `${p.name} فوّت`); return nextTurn(); }
  const pool = unseenBy(seat);
  const scored = opts.map(o => ({ o, s: aiEval(seat, o, cfg, pool) })).sort((a, b) => b.s - a.s);
  const o = scored[0].o, first = !DOM.board.length;
  placeTile(o.t, o.side); hand(seat).splice(hand(seat).indexOf(o.t), 1); DOM.lastSide = o.side;
  if (first) DOM.endBy = { L: seat, R: seat }; else DOM.endBy[o.side] = seat;
  tileClack();
  const blocked = isBlocked();
  dMsg(`${drew ? `${p.name} سحب ${drew} ونزل ` : `${p.name} نزل `}${tName(o.t)}${blocked ? ' وقال «قفلة!» 🔒' : ''}${!blocked && hand(seat).length && Math.random() < .22 ? ' · «' + rpick(TALK) + '»' : ''}`);
  if (Math.random() < .5) speak(blocked ? 'قفلة' : tName(o.t));
  afterPlay(seat);
}

// ---------- round and match end ----------
function endRound(res){
  DOM.over = true; clearTimeout(DOM.aiTimer);
  const teamPips = tm => DOM.hands.reduce((s, h, i) => s + (teamOf(i) === tm ? pipsOf(h) : 0), 0);
  let txt = '';
  if (res.type === 'out'){
    const tm = teamOf(res.seat), raw = teamPips(1 - tm), pts = round10(raw); DOM.score[tm] += pts; DOM.lastWinner = res.seat;
    txt = `${DOM.seats[res.seat].name} خلّص حجارته 🎉 ${raw} نقطة ← +${pts} لـ ${teamName(tm)}`;
  } else {
    const a = teamPips(0), b = teamPips(1);
    if (a !== b){
      const w = a < b ? 0 : 1, pts = round10(w === 0 ? b : a); DOM.score[w] += pts; DOM.lastWinner = lowestSeat(w);
      txt = `قفلة 🔒 ${teamName(0)} ${a} و${teamName(1)} ${b}… +${pts} لـ ${teamName(w)}`;
      if (w === 0 && isMe(res.seat)) stat('qafla');
    } else { DOM.lastWinner = null; txt = `قفلة 🔒 متعادلين (${a})… محدش ياخد حاجة، والدش يبدأ`; }
  }
  const sab = sab3een(); if (sab) txt += ' · ' + sab;
  if (!checkMatch(txt)) dMsg(txt);
  renderDomino();
}
// مسبعين: a side that was dealt all 7 tiles of one number (shown only)
function sab3een(){
  const out = [];
  for (let tm = 0; tm < 2; tm++){ const h = DOM.dealt.filter((_, s) => teamOf(s) === tm).flat(); for (let v = 0; v <= 6; v++) if (h.filter(t => touches(t, v)).length === 7) out.push(`${teamName(tm)} ${DOM.mode === '1v1' ? 'كان' : 'كانوا'} مسبعين في الـ${NUMN[v]} 7️⃣`); }
  return out.join(' · ');
}
function lowestSeat(tm){ let best = null; DOM.hands.forEach((h, i) => { if (teamOf(i) === tm && (best === null || pipsOf(h) < pipsOf(DOM.hands[best]))) best = i; }); return best; }
function checkMatch(prefix=''){
  const [a, b] = DOM.score;
  if (a < DOM.target && b < DOM.target) return false;
  DOM.over = true; DOM.matchOver = true; clearTimeout(DOM.aiTimer); const w = a >= b;
  if (w){ stat('domWin'); if (DOM.mode === '2v2') stat('domWin2'); }
  let betTxt = ''; if (modeObj.onDomino){ const bt = modeObj.onDomino(w); if (bt) betTxt = w ? ` · +${bt} جنيه` : ` · -${bt} جنيه`; }
  dMsg(`${prefix ? prefix + ' — ' : ''}${w ? `🏆 كسبتوا الماتش ${a}–${b}!` : `${teamName(1)} كسب الماتش ${b}–${a} 😅`}${betTxt}`.replace('كسبتوا', DOM.mode === '1v1' ? 'كسبت' : 'كسبتوا'));
  if (w) coin(); speak(w ? 'ماشي… كسبتوا المرة دي' : 'اتعلم يا ابني');
  renderDomino(); return true;
}
addEventListener('resize', () => { if (!$('domino').hidden && !$('dGame').hidden) drawBoard(); });

// ---- 22-camera.js ----
let BUILD_CULL2 = 215 * 215;   // set by gfxWorld(): buildings further than the fog aren't drawn
// ================= camera =================
const lookAt = new THREE.Vector3(); let camYaw = 0;
const ray = new THREE.Ray(), headPos = new THREE.Vector3(), _t = new THREE.Vector3();
function updateCamera(dt){
  const v = hero.veh;
  if (CUT.on){ /* the cutscene moves the camera */ } else if (ACT.cam){ camera.position.lerp(ACT.cam.p, damp(5, dt)); lookAt.lerp(ACT.cam.l, damp(6, dt)); } else if (ST.kind){ stationCamera(dt); } else if (v){
    // look-around offset from dragging; it eases back behind the vehicle after a moment
    if (performance.now() - CAM.lastDrag > 1400) CAM.veh *= Math.exp(-dt*2.5);
    const sp = clamp(Math.abs(v.speed) / v.max, 0, 1);
    const fv = (CAM.vmode === 2 ? 62 : 46) + sp*12; if (Math.abs(camera.fov - fv) > .2){ camera.fov += (fv - camera.fov)*damp(3, dt); camera.updateProjectionMatrix(); }
    // the camera's own heading swings round after the car's (quicker when going fast), so turns feel smooth, not stiff
    let dy = v.yaw - CAM.cy; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); CAM.cy += dy * damp(2.2 + sp*3, dt);
    if (CAM.vmode === 2){
      // inside: just above the bonnet, looking down the road
      const fx = Math.sin(v.yaw + CAM.veh), fz = Math.cos(v.yaw + CAM.veh), h = v.type === 'moto' ? 1.55 : v.type === 'tuk' ? 1.6 : 1.4, fwd = v.type === 'moto' ? .1 : v.type === 'tuk' ? .6 : 1.85;
      camera.position.set(v.pos.x + Math.sin(v.yaw)*fwd, v.pos.y + h, v.pos.z + Math.cos(v.yaw)*fwd);
      lookAt.set(v.pos.x + fx*12, v.pos.y + h - .55, v.pos.z + fz*12);
    } else {
      const far = CAM.vmode === 1, vy = CAM.cy + CAM.veh, fx = Math.sin(vy), fz = Math.cos(vy);
      const back = (v.type === 'moto' ? 5.6 : 7.2) * (far ? 1.55 : 1) + sp*1.2, up = (v.type === 'moto' ? 2.4 : 3) * (.6 + CAM.tilt*.9) * (far ? 1.45 : 1);
      _t.set(v.pos.x - fx*back, v.pos.y + up, v.pos.z - fz*back);
      camera.position.x = _t.x; camera.position.z = _t.z; camera.position.y += (_t.y - camera.position.y) * damp(6, dt);
      // look a little ahead of the car, more at speed
      const ahead = 2.5 + sp*5, ly = v.yaw; lookAt.lerp(_t.set(v.pos.x + Math.sin(ly)*ahead, v.pos.y + 1.1, v.pos.z + Math.cos(ly)*ahead), damp(10, dt));
    }
  } else {
    if (Math.abs(camera.fov - 46) > .2){ camera.fov += (46 - camera.fov)*damp(4, dt); camera.updateProjectionMatrix(); }
    camDist += (camTarget - camDist) * damp(5, dt); const p = hero.pos;
    if (keys.KeyQ) CAM.orbit += dt*2; if (keys.KeyR) CAM.orbit -= dt*2;
    CAM.orbitSm += (CAM.orbit - CAM.orbitSm) * damp(14, dt);
    lookAt.lerp(_t.set(p.x, p.y + 1.2, p.z), damp(9, dt));
    const o = CAM.orbitSm, hgt = .4 + camDist*CAM.tilt;
    camera.position.set(lookAt.x + Math.sin(o)*camDist, lookAt.y - .1 + hgt, lookAt.z + Math.cos(o)*camDist);
    if (HOUSE.inside){ const r = HOUSE.room; camera.position.x = clamp(camera.position.x, r.x0 + .25, r.x1 - .25); camera.position.z = clamp(camera.position.z, r.z0 + .25, r.z1 - .1); camera.position.y = Math.min(camera.position.y, 2.75); }
  }
  if (shake > 0){ shake -= dt; camera.position.x += (Math.random()-.5)*shake*.5; camera.position.y += (Math.random()-.5)*shake*.5; }
  camera.lookAt(lookAt);
  camYaw = Math.atan2(camera.position.x - lookAt.x, camera.position.z - lookAt.z);
  // fade buildings between the camera and the focus point
  const f = CUT.on ? lookAt : v ? v.pos : hero.pos; headPos.set(f.x, f.y + (CUT.on ? 0 : 1.4), f.z);   // in a scene: whatever the camera looks at
  ray.origin.copy(camera.position); ray.direction.copy(headPos).sub(camera.position); const segLen = ray.direction.length(); ray.direction.normalize();
  for (const b of buildings){
    if (b.cx === undefined){ b.box.getCenter(_t); b.cx = _t.x; b.cz = _t.z; }
    const ddx = b.cx - f.x, ddz = b.cz - f.z, vis = ddx*ddx + ddz*ddz < BUILD_CULL2; if (b.grp.visible !== vis) b.grp.visible = vis; if (!vis) continue;
    const hit = ray.intersectBox(b.box, _t); const blocking = hit && camera.position.distanceTo(_t) < segLen - .3;
    const target = blocking ? .18 : 1;
    if (Math.abs(b.opacity - target) > .005){ b.opacity += (target - b.opacity) * damp(10, dt); const tr = b.opacity < .98; for (const m of b.mats){ m.opacity = b.opacity; if (m.transparent !== tr){ m.transparent = tr; m.depthWrite = !tr; m.needsUpdate = true; } } }
  }
  sun.target.position.copy(f); sun.position.copy(f).addScaledVector(sunDir, 120);
}

// ---- 23-radar.js ----
// ================= radar / minimap and full map =================
// A 1 m = 1 px picture of the whole map is drawn once; the minimap shows the part around طيارة, the full map shows all of it.
const MAP = { x0: X0 - 12, z0: Z0 - 12, x1: XMAX + 12, z1: FAR.z1 + 4 };
const mapBase = document.createElement('canvas'); mapBase.width = Math.ceil(MAP.x1 - MAP.x0); mapBase.height = Math.ceil(MAP.z1 - MAP.z0);
const MX = x => x - MAP.x0, MZ = z => z - MAP.z0;
{
  const g = mapBase.getContext('2d');
  g.fillStyle = '#3c5a2c'; g.fillRect(0, 0, mapBase.width, mapBase.height);
  g.fillStyle = '#1f6f8b'; g.fillRect(0, MZ(NILE_Z), mapBase.width, mapBase.height);   // the sea
  g.fillStyle = '#3d3a35'; g.fillRect(MX(X0-6), MZ(Z0-6), XMAX - X0 + 12, NILE_Z - Z0 + 6);
  g.fillRect(MX(BRIDGE.x - BRIDGE.w/2), MZ(NILE_Z - 2), BRIDGE.w, BRIDGE.z1 - NILE_Z + 4);
  g.fillStyle = '#8a8070'; g.fillRect(MX(FAR.x0), MZ(FAR.z0), FAR.x1 - FAR.x0, FAR.z1 - FAR.z0);
  const tint = { hara: '#857a68', market: '#94764e', food: '#8c6a5c', stadium: '#6f8060', works: '#6c6c70', corniche: '#9a8a70' };
  blocksInfo.forEach(b => { g.fillStyle = b.type === 'park' ? '#3d5a2b' : b.type === 'pitch' ? '#3f8f3a' : tint[b.dist] || '#857a68'; g.fillRect(MX(b.cx - BW/2), MZ(b.cz - BW/2), BW, BW); });
  g.fillStyle = 'rgba(30,26,22,.85)'; obstacles.filter(o => o.building).forEach(o => g.fillRect(MX(o.minX), MZ(o.minZ), o.maxX - o.minX, o.maxZ - o.minZ));
}
const radar = $('radar'), rctx = radar.getContext('2d'); const RW = 150, RANGE = 150;
let radarC = { x: 0, z: 0 };
const rx = x => (x - radarC.x) / RANGE * RW + RW/2, rz = z => (z - radarC.z) / RANGE * RW + RW/2;
function dot(x, z, r, c){ const px = clamp(rx(x), 4, RW-4), pz = clamp(rz(z), 4, RW-4); rctx.fillStyle = c; rctx.beginPath(); rctx.arc(px, pz, r, 0, 7); rctx.fill(); }
function star(x, z, t){ const px = clamp(rx(x), 8, RW-8), pz = clamp(rz(z), 8, RW-8); rctx.fillStyle = Math.floor(t*3)%2 ? '#ffc94a' : '#fff3c4'; rctx.font = 'bold 16px sans-serif'; rctx.textAlign = 'center'; rctx.textBaseline = 'middle'; rctx.strokeStyle = '#000'; rctx.lineWidth = 3; rctx.strokeText('★', px, pz); rctx.fillText('★', px, pz); }
function radarMarks(t){
  const m = [];
  if (chaser.active) m.push({ x: chaserCar.position.x, z: chaserCar.position.z, r: 4, c: Math.floor(t*6)%2 ? '#ff3347' : '#3a6bff' });
  if (enemy.active && enemy.d.root.visible) m.push({ x: enemy.pos.x, z: enemy.pos.z, r: 3.5, c: enemy.ally ? '#7be07a' : '#ff8a3d' });
  if (thief.active && !thief.caught) m.push({ x: thief.pos.x, z: thief.pos.z, r: 4, c: Math.floor(t*5)%2 ? '#ff4d4d' : '#ffd34d' });
  if (wanted.active && !wanted.caught) m.push({ x: wanted.pos.x, z: wanted.pos.z, r: 4.5, c: Math.floor(t*4)%2 ? '#ff2020' : '#ffffff' });
  if (modeId === 'cash') cash.forEach(c => { if (!c.taken) m.push({ x: c.x, z: c.z, r: 3, c: '#ffd34d' }); });
  if (typeof storyMapMarks === 'function') m.push(...storyMapMarks(t));
  m.push(...actMapMarks(t));
  return m;
}
function drawRadar(t){
  const f = hero.veh ? hero.veh.pos : hero.pos; radarC = { x: f.x, z: f.z };
  rctx.fillStyle = '#1a1712'; rctx.fillRect(0, 0, RW, RW);
  rctx.drawImage(mapBase, MX(f.x - RANGE/2), MZ(f.z - RANGE/2), RANGE, RANGE, 0, 0, RW, RW);
  if (GPS.on && GPS.path.length){ rctx.strokeStyle = '#4fc3ff'; rctx.lineWidth = 3.5; rctx.lineJoin = 'round'; rctx.beginPath(); GPS.path.forEach((q, i) => i ? rctx.lineTo(rx(q.x), rz(q.z)) : rctx.moveTo(rx(q.x), rz(q.z))); rctx.stroke(); }
  for (const k of radarMarks(t)){ if (k.star) star(k.x, k.z, t); else dot(k.x, k.z, k.r || 3, k.c); }
  if (GPS.on) dot(GPS.to.x, GPS.to.z, 4.5, Math.floor(t * 3) % 2 ? '#4fc3ff' : '#ffffff');
  // player arrow pointing where the camera looks
  rctx.save(); rctx.translate(RW/2, RW/2); rctx.rotate(-camYaw + Math.PI); rctx.fillStyle = '#fff'; rctx.strokeStyle = '#000'; rctx.lineWidth = 1.5;
  rctx.beginPath(); rctx.moveTo(0, -7); rctx.lineTo(5, 5); rctx.lineTo(0, 2); rctx.lineTo(-5, 5); rctx.closePath(); rctx.fill(); rctx.stroke(); rctx.restore();
  rctx.fillStyle = 'rgba(0,0,0,.55)'; rctx.fillRect(0, RW - 18, RW, 18); rctx.fillStyle = '#ffe9b0'; rctx.font = '700 12px Cairo, sans-serif'; rctx.textAlign = 'center'; rctx.textBaseline = 'middle'; rctx.direction = 'rtl';
  rctx.fillText(DISTRICT_NAMES[districtAt(f.x, f.z)] || '', RW/2, RW - 9);
}
// full map
function openMap(){
  if (state !== 'play') return;
  $('mapOv').hidden = false; drawFullMap();
}
function drawFullMap(){
  const cv = $('mapCanvas'), W = mapBase.width, H = mapBase.height, sc = Math.min((innerWidth - 40) / W, (innerHeight - (innerHeight < 520 ? 124 : 110)) / H, 2.2);
  const SHORT = { works: 'الورش', food: 'المطاعم', corniche: 'الكورنيش', bridge: 'الكوبري', bank: 'القلعة', market: 'السوق', stadium: 'الملعب', hara: 'الحتة' };
  cv.width = Math.round(W*sc); cv.height = Math.round(H*sc); const g = cv.getContext('2d');
  g.drawImage(mapBase, 0, 0, cv.width, cv.height);
  const P = (x, z) => [MX(x)*sc, MZ(z)*sc];
  const labels = { hara: [0, 0], market: [144, -48], food: [144, 48], stadium: [240, -48], works: [240, 48], corniche: [96, 120], bridge: [96, 210], bank: [96, 278] };
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
  for (const [k, [x, z]] of Object.entries(labels)){ const [px, pz] = P(x, z); g.font = `900 ${Math.round(15*Math.max(sc,.8))}px Cairo, sans-serif`; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(sc < 1.2 ? SHORT[k] : DISTRICT_NAMES[k], px, pz); g.fillStyle = '#ffe9b0'; g.fillText(sc < 1.2 ? SHORT[k] : DISTRICT_NAMES[k], px, pz); }
  for (const s of STOPS){ const [px, pz] = P(s.pos.x, s.pos.z); g.fillStyle = '#1e66d0'; g.beginPath(); g.arc(px, pz, 6, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '700 9px sans-serif'; g.fillText('🚌', px, pz); }
  const marks = radarMarks(performance.now()/1000);
  for (const k of marks){ const [px, pz] = P(k.x, k.z); if (k.star){ g.font = 'bold 22px sans-serif'; g.lineWidth = 4; g.strokeStyle = '#000'; g.strokeText('★', px, pz); g.fillStyle = '#ffc94a'; g.fillText('★', px, pz); } else { g.fillStyle = k.c; g.beginPath(); g.arc(px, pz, (k.r||3)+1, 0, 7); g.fill(); } }
  if (GPS.on && GPS.path.length){ g.strokeStyle = '#4fc3ff'; g.lineWidth = 4; g.lineJoin = 'round'; g.beginPath(); GPS.path.forEach((q, i) => { const [px, pz] = P(q.x, q.z); i ? g.lineTo(px, pz) : g.moveTo(px, pz); }); g.stroke(); const [tx, tz] = P(GPS.to.x, GPS.to.z); g.fillStyle = '#4fc3ff'; g.beginPath(); g.arc(tx, tz, 7, 0, 7); g.fill(); }
  const f = hero.veh ? hero.veh.pos : hero.pos; const [hx, hz] = P(f.x, f.z);
  g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.arc(hx, hz, 7, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#000'; g.font = '900 9px Cairo, sans-serif'; g.fillText('انت', hx, hz);
}
radar.style.pointerEvents = 'auto'; radar.style.cursor = 'pointer';
radar.addEventListener('pointerdown', e => { e.stopPropagation(); openMap(); });
$('mapClose').onclick = () => { $('mapOv').hidden = true; };
addEventListener('keydown', e => { if (e.code === 'KeyM' && state === 'play'){ if ($('mapOv').hidden) openMap(); else $('mapOv').hidden = true; } });

// ---- 23b-menus.js ----
// ================= menus: loading, main menu pages, missions, pause, "too hard?", credits, the back button =================

// ---- loading: the main menu stays dim (nothing can be pressed) until everything is built ----
function loadDone(){
  loadStep(1, 'جاهزة! يلا بينا 👑');
  setTimeout(() => { $('menu').classList.remove('loading'); $('menu').classList.add('ready'); }, 300);
}

// ---- main menu pages: the side panel shows one page at a time ----
function mmPage(id){ for (const p of document.querySelectorAll('.mm-page')) p.hidden = p.id !== id; }
$('mmGames').onclick = () => mmPage('mmGamesPage');
document.querySelectorAll('.mm-page [data-back]').forEach(b => b.onclick = () => mmPage('mmMain'));
$('mmMissions').onclick = () => openMissions();
$('mmCred').onclick = () => { $('credits').hidden = false; };
$('credClose').onclick = () => { $('credits').hidden = true; };

// ---- missions: every chapter and its missions. Finished ones can be played again; the real save is not touched ----
let misCh = 0;
const storyChapter = () => SAVE.ended ? MS[MS.length - 1].ch : (MS[SAVE.m] || MS[MS.length - 1]).ch;
function openMissions(){ misCh = storyChapter(); renderMissions(); $('missions').hidden = false; }
function renderMissions(){
  const has = SAVE.started || SAVE.m > 0, now = storyChapter();
  const chs = [...new Set(MS.map(m => m.ch))];
  $('misN').textContent = `خلّصت ${SAVE.ended ? MS.length : SAVE.m} من ${MS.length}`;
  $('misChaps').innerHTML = chs.map(c => { const lock = !SAVE.ended && c > now; return `<button data-ch="${c}" class="${c === misCh ? 'on' : ''}${lock ? ' lock' : ''}">${lock ? '🔒 ' : ''}${CHAPS[c][0]}</button>`; }).join('');
  const rows = MS.map((m, i) => ({ m, i })).filter(r => r.m.ch === misCh);
  $('misList').innerHTML = `<div class="mis-title">${CHAPS[misCh][0]}: <b>${CHAPS[misCh][1]}</b></div>` + rows.map(({ m, i }) => {
    const done = SAVE.ended || i < SAVE.m, cur = !SAVE.ended && i === SAVE.m;
    const note = done ? (SAVE.skipped && SAVE.skipped[m.id] ? 'عدّيتها ⏭️' : 'خلصت ✓') : cur ? (has ? 'دي اللي عليك دلوقتي' : 'أول مهمة') : 'لسه مقفولة';
    const btn = done ? `<button data-replay="${i}">↻ العبها تاني</button>` : cur ? `<button data-go>▶ ${has ? 'كمّل' : 'ابدأ'}</button>` : '';
    return `<div class="mis-row ${done ? 'done' : cur ? 'cur' : 'lock'}"><span class="mi">${done ? '✓' : cur ? '▶' : '🔒'}</span><span class="mt">${done || cur ? m.title : '؟؟؟'}<small>${note}</small></span>${btn}</div>`;
  }).join('') + (has ? `<div class="mis-foot"><button class="diffbtn danger" id="misReset">↺ ابدأ القصة من الأول</button></div>` : '');
  $('misChaps').querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { misCh = +b.dataset.ch; renderMissions(); });
  $('misList').querySelectorAll('[data-replay]').forEach(b => b.onclick = () => startReplay(+b.dataset.replay));
  $('misList').querySelectorAll('[data-go]').forEach(b => b.onclick = () => { $('missions').hidden = true; startMode('story'); });
  const rs = $('misReset');
  if (rs) rs.onclick = () => { if (!rs.dataset.armed){ rs.dataset.armed = '1'; rs.textContent = 'متأكد؟ هتبدأ من الصفر… دوس تاني'; return; } SAVE = newStory(); store.set(STORY_KEY, JSON.stringify(SAVE)); applyAccessories(); renderModes(); misCh = 0; renderMissions(); };
  const on = $('misChaps').querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
}
$('misClose').onclick = () => { $('missions').hidden = true; };
function startReplay(i){
  if (!REPLAY.on) REPLAY.back = SAVE;
  SAVE = JSON.parse(JSON.stringify(REPLAY.back));
  Object.assign(SAVE, { m: i, introSeen: -1, chSeen: -1, ended: false, started: true });
  REPLAY.on = true; REPLAY.i = i; REPLAY.last = i;
  $('missions').hidden = true; startMode('story');
}
function stopReplay(){ if (!REPLAY.on) return; SAVE = REPLAY.back; REPLAY.on = false; REPLAY.back = null; }
function endReplay(M){ stopReplay(); applyAccessories(); endMode('خلّصتها تاني 👏', `«${M.title}» خلصت. قصتك الأصلية زي ما هي.`); }

// ---- make it easier: for the rest of this mission only (after 3 fails) ----
const EASY = { on: false };
function easyOn(){ EASY.on = true; DIFF = { ...DIFFS.easy, pat: 2.2, dmg: .3, enemySpd: .7, spill: 1.2, heat: .55, fry: 1.9, race: 1.6 }; hero.hp = 100; }
function easyOff(){ if (!EASY.on) return; EASY.on = false; DIFF = DIFFS[diffKey]; }

// ---- skip a mission (pause menu, or after 3 fails). Things a mission gives you are given anyway ----
const SKIP_GIVES = { buyMoto: () => { SAVE.owned.moto = true; }, reno1: () => { SAVE.house = Math.max(SAVE.house, 1); houseVisual(); } };
function canSkip(){ return modeId === 'story' && !!curM() && !CUT.on && ['goto', 'active', 'failed', 'retrying', 'asking'].includes(ST2.phase); }
function skipMission(){
  if (!canSkip()) return false;
  const M = curM();
  closePanels();
  if (!REPLAY.on){ (SAVE.skipped ||= {})[M.id] = 1; if (SKIP_GIVES[M.id]) SKIP_GIVES[M.id](); }
  banner(`⏭️ عدّيت «${M.title}»`, 'info', 2.2);
  ST2.skipping = true; finishMission();
  return true;
}
// close the small windows that lock the hero (before skipping or leaving)
function closePanels(){
  if (!$('shop').hidden){ $('shop').hidden = true; hero.locked = false; }
  if (!$('domino').hidden) closeDomino();
  if (!$('tawla').hidden) closeTawla();
  if (!$('mapOv').hidden) $('mapOv').hidden = true;
  if (ST.kind && modeId !== 'foul') exitStation(true);
}

// ---- "too hard?" after the 3rd fail of the same mission ----
function openFailAsk(){ const M = curM(); $('faSub').textContent = M ? `«${M.title}» فشلت ${ST2.fails} مرات. عادي… كلنا بنتزنق.` : ''; state = 'pause'; $('failAsk').hidden = false; }
function closeFailAsk(){ $('failAsk').hidden = true; if (state === 'pause') state = 'play'; }
$('faEasy').onclick = () => { closeFailAsk(); easyOn(); ST2.phase = 'retrying'; retryMission(); banner('😌 سهّلناها: وقت أكتر، ضرب أخف، والناس أهدى', 'ok', 3); };
$('faSkip').onclick = () => { closeFailAsk(); skipMission(); };
$('faRetry').onclick = () => { closeFailAsk(); ST2.phase = 'retrying'; retryMission(); };

// ---- pause menu (☰, Escape, Android back) ----
function openPause(){
  if (state !== 'play' || CUT.on) return;
  state = 'pause'; for (const k in keys) keys[k] = false;
  const M = curM(), story = modeId === 'story';
  $('psSub').innerHTML = story ? (M ? `${CHAPS[M.ch][0]}: ${CHAPS[M.ch][1]}<br><b>📱 ${M.title}</b>${REPLAY.on ? ' (إعادة)' : ''}` : 'خلصت القصة 👑') : (modeObj.title || '');
  const sk = $('psSkip'); sk.hidden = !story || !M; sk.disabled = !canSkip(); sk.dataset.armed = ''; sk.classList.remove('armed'); sk.textContent = '⏭️ عدّي المهمة';
  $('pause').hidden = false;
}
function closePause(){ if ($('pause').hidden) return; $('pause').hidden = true; if (state === 'pause') state = 'play'; }
$('psResume').onclick = closePause;
$('psMap').onclick = () => { closePause(); openMap(); };
$('psSet').onclick = () => { renderModes(); $('resetStory').parentElement.hidden = true; $('settings').hidden = false; };   // no wiping the story from inside it
$('psHome').onclick = () => { closePause(); closePanels(); openMenu(); };
$('psSkip').onclick = () => { const b = $('psSkip'); if (!b.dataset.armed){ b.dataset.armed = '1'; b.classList.add('armed'); b.textContent = 'متأكد؟ دوس تاني'; return; } closePause(); skipMission(); };

// ---- back: closes whatever is on top. Android back button, Escape on a computer ----
function uiBack(){
  const open = id => !$(id).hidden;
  if (open('intro')){ endIntro(); return true; }
  if (open('introStart')){ $('introStartSkip').click(); return true; }
  if (CUT.on && state === 'play') return true;                      // a cutscene has its own skip button; back does nothing (no skipping by mistake)
  if (open('tut')){ $('tutNext').click(); return true; }
  if (open('phone')){ if (PHONE.app !== 'home'){ PHONE.app = 'home'; renderPhone(); } else closePhone(); return true; }
  if (open('failAsk')){ $('faRetry').click(); return true; }
  if (open('settings')){ $('setClose').click(); return true; }
  for (const id of ['credits', 'achOv', 'missions', 'mapOv']) if (open(id)){ $(id).hidden = true; return true; }
  if (open('shop')){ $('shopClose').click(); return true; }
  if (open('photoShot')){ $('phBack').click(); return true; }
  if (PHOTO.on){ closePhoto(); return true; }
  if (open('tawla')){ closeTawla(); return true; }
  if (open('domino')){ closeDomino(); return true; }
  if (ST.kind && modeId !== 'foul'){ exitStation(); return true; }
  if (open('storyEnd')){ $('storyEndBtn').click(); return true; }
  if (open('pause')){ closePause(); return true; }
  if (open('end')){ openMenu(); return true; }
  if (state === 'play'){ openPause(); return true; }
  if (state === 'menu' && $('mmMain').hidden){ mmPage('mmMain'); return true; }
  return false;                                  // main menu with nothing open
}
addEventListener('keydown', e => { if (e.code === 'Escape' && !e.repeat && !CUT.on && !(e.target && e.target.tagName === 'INPUT')){ e.preventDefault(); uiBack(); } });
// on the main menu, back twice (within 2 s) leaves the game
let backArmT = -9999;
function backPressed(){
  if (uiBack()) return false;
  const now = performance.now();
  if (now - backArmT < 2000) return true;
  backArmT = now; const t = $('backToast'); t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800);
  return false;
}
const capApp = (() => { try { const C = window.Capacitor; if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null; return (C.Plugins && C.Plugins.App) || (C.registerPlugin ? C.registerPlugin('App') : null); } catch(e){ return null; } })();
if (capApp){ try { capApp.addListener('backButton', () => { if (backPressed()) capApp.exitApp(); }); } catch(e){ console.warn('back button', e); } }
else if (isTouch){
  // phone browser: keep one history step so the back gesture comes here instead of leaving the page
  let pushed = false;
  addEventListener('pointerdown', () => { if (!pushed){ pushed = true; history.pushState({ ty: 1 }, ''); } }, true);
  addEventListener('popstate', () => { if (backPressed()) history.back(); else history.pushState({ ty: 1 }, ''); });
}

// ---- 24-main-update.js ----
// ================= main update =================
let chatterT = 3;
function update(dt, t){
  tickCutscene(dt);
  beatTick(); sfxUpdate(dt, t);
  const playing = state === 'play';
  if (document.body.classList.contains('driving') !== !!hero.veh){ document.body.classList.toggle('driving', !!hero.veh); hideSteerHint(); for (const k in pedal) pedal[k] = false; }
  if (playing){
    runTime += dt;
    if (modeObj.time !== undefined){ modeObj.time -= dt; if (modeObj.time <= 0){ modeObj.time = 0; modeObj.onTime && modeObj.onTime(); } }
    // input
    let ix = 0, iz = 0;
    if (keys.KeyW || keys.ArrowUp) iz -= 1; if (keys.KeyS || keys.ArrowDown) iz += 1; if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
    ix += joy.vx; iz += joy.vz; let mag = Math.hypot(ix, iz); if (mag > 1){ ix /= mag; iz /= mag; mag = 1; }
    if (hero.locked){ ix = iz = 0; mag = 0; }
    if (hero.veh){
      const tz = clamp(iz + (pedal.brake ? 1 : 0) - (pedal.gas ? 1 : 0), -1, 1);
      driveVehicle(hero.veh, dt, isTouch && joy.id !== null ? Math.sign(ix) * Math.pow(Math.abs(ix), 1.35) : ix, tz, keys.Space || runBtn);
      if (hero.veh) hero.pos.copy(hero.veh.pos);
      // run over NPCs
      if (hero.veh && Math.abs(hero.veh.speed) > 3) for (const n of npcs){ if (n.state === 'hidden' || n.state === 'down') continue; for (const c of vCircles(hero.veh)) if (Math.hypot(c.x-n.g.position.x, c.z-n.g.position.z) < c.r + .45){ npcHit(n, 2); break; } }
      if (hero.veh === copCar){ const on = Math.floor(t*7)%2 === 0; copCar.mesh.userData.red.emissiveIntensity = on ? 3 : .2; copCar.mesh.userData.blue.emissiveIntensity = on ? .2 : 3; if (sirenGain && !chaser.active) sirenGain.gain.value = .05; }
      else if (sirenGain && !chaser.active) sirenGain.gain.value = 0;
    } else if (CUT.on){ if (!SCENE.lockY) hero.pos.y += (groundY(hero.pos.x, hero.pos.z) - hero.pos.y) * damp(18, dt); } else {
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
      const stuck = blocked(p.x, p.z);
      if (stuck || !blocked(p.x+mx, p.z)) p.x += mx; else { hero.vel.x = 0; hero.knock.x = 0; }
      if (stuck || !blocked(p.x, p.z+mz)) p.z += mz; else { hero.vel.z = 0; hero.knock.z = 0; }
      p.y += (groundY(p.x, p.z) - p.y) * damp(18, dt);
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
    updateJobs(dt); updateRhythm(dt); updateExtras(dt, t); updateActivities(dt, t); updateLife(dt, t);
    // traffic hits on foot
    if (!hero.veh && hero.inv <= 0 && !CUT.on && !HOUSE.inside) for (const c of traffic){ const L = carLocal(c, hero.pos); if (Math.abs(L.along) < c.userData.len && Math.abs(L.lat) < 1.2){ heroDamage((modeId === 'cash' ? 34 : 25) * DIFF.dmg, 'car'); hero.inv = 1.6; const fx = Math.sin(c.rotation.y), fz = Math.cos(c.rotation.y), side = L.lat >= 0 ? 1 : -1; hero.knock.set(fz*side*9 + fx*c.userData.speed*.5, 0, -fx*side*9 + fz*c.userData.speed*.5); horn(); break; } }
    // random street chatter
    chatterT -= dt;
    if (chatterT <= 0 && !CUT.on){ chatterT = R(4, 8); const near = npcs.filter(n => (n.state === 'walk' || n.state === 'sit' || n.state === 'domino') && n.g.position.distanceTo(hero.pos) < 16); if (near.length){ const n = rpick(near); say(n, rpick(n.state === 'domino' ? ['دومنو يا جدعان!','قفلتها عليك','هات الشيش'] : ['صباح الفل يا معلم','إزيك يا '+heroName+'!','الجو حر النهارده','حد شاف الواد ده؟','يا عم ركز في الطريق','الشاي هنا مفيش زيه','فين أيامك يا '+heroName,'الماتش النهارده الساعة كام؟']), 2.6); } }
  }
  // traffic
  for (const c of traffic){
    trafficStep(c, dt, t, playing);
    if (playing && Math.random() < dt*.01 && c.position.distanceTo(hero.pos) < 30) horn();
  }
  updateTram(dt, t, playing);
  storyFxTick(dt, t); updateStage5(dt, t);
  waterTex.offset.x += dt * .006; waterTex.offset.y = Math.sin(t * .35) * .03;   // the sea moves a little
  npcs.forEach(n => updateNPC(n, dt));
  if (playing && !CUT.on){ updateEnemy(dt); updateWanted(dt); updateThief(dt, t); }
  for (const f of feluccas){ f.g.position.x += f.sp*dt; if (f.g.position.x > 300) f.g.position.x = -90; else if (f.g.position.x < -90) f.g.position.x = 300; f.g.position.y = -1 + Math.sin(t*.8 + f.ph)*.06; f.g.rotation.z = Math.sin(t*.6 + f.ph)*.03; }
  updatePhotoSeats(dt, t);
  // cash animation
  for (const c of cash){ if (!c.g.visible) continue; if (c.taken){ c.pop += dt; c.g.position.y = c.pop*6; c.g.scale.setScalar(Math.max(0, 1 - c.pop*2.5)); if (c.pop > .4) c.g.visible = false; continue; } c.st.rotation.y = t*1.6; c.st.position.y = 1 + Math.sin(t*2.4 + c.x)*.15; }
  // hero visuals
  const hd = hero.d;
  if (hero.veh){
    const v = hero.veh;
    if (v.type === 'moto'){ hd.root.visible = true; hd.P.legL.visible = hd.P.legR.visible = false; hd.root.position.set(v.pos.x - Math.sin(v.yaw)*.25, v.pos.y + .86 - hd.hipY, v.pos.z - Math.cos(v.yaw)*.25); hd.faceYaw = v.yaw; animDoll(hd, 0, 0, dt, t); }
    else hd.root.visible = false;
  } else { hd.root.visible = !ST.kind && !TRAMR.on && !SCENE.hideHero; hd.P.legL.visible = hd.P.legR.visible = true; hd.root.position.copy(hero.pos); animDoll(hd, hero.vel.x, hero.vel.z, dt, t); cheerPose(dt); hd.doll.visible = !(hero.inv > 0 && Math.floor(hero.inv*12) % 2 === 1); }
  if (enemy.active && !CUT.idle.has(enemy.d)) animDoll(enemy.d, enemy.vel.x, enemy.vel.z, dt, t);
  if (wanted.active && !CUT.idle.has(wanted.d)) animDoll(wanted.d, wanted.vx||0, wanted.vz||0, dt, t);
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
    hudT -= dt; if (hudT <= 0){ hudT = .2; updateHud(); if (ACT.kind && ACTS[ACT.kind].hud){ $('objText').innerHTML = ACTS[ACT.kind].hud(ACT.d); $('objTitle').textContent = '🎮 نشاط'; } else if (JOB.kind && modeId !== 'story'){ $('objText').innerHTML = jobHud(); $('objTitle').textContent = JOB_NAME[JOB.kind] || '🍕 ديليفري'; } else { if (modeObj.hud) $('objText').innerHTML = modeObj.hud(); if (modeObj.hudTitle) $('objTitle').textContent = modeObj.hudTitle(); } }
    drawRadar(t);
  }
}
let hudT = 0;

addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });   // pixel ratio is kept by applyGfx()
hero.pos.copy(SPOT.spawn); resetWorld(); seatDeco(WALKERS); applyTimeOfDay(15); setNoEntryShown(1); setPostersShown(true);
camera.position.set(SPOT.spawn.x + 6, 5, SPOT.spawn.z + 9); lookAt.copy(SPOT.spawn);
const clock = new THREE.Clock(); let elapsed = 0;
let fpsAcc = 0, fpsN = 0, pxr = renderer.getPixelRatio();
// graphics + FPS settings
const GFX_NAME = { low: '🔋 خفيف', mid: '⚖️ عادي', high: '✨ عالي' };
let showFps = store.get('ty_fps') === '1'; const fpsT = { n: 0, t: 0 };
function renderGfxBtns(){ $('gfxBtn').textContent = GFX_NAME[GFX]; $('fpsBtn').textContent = showFps ? '👁️ ظاهر' : 'مخفي'; $('fpsBox').hidden = !showFps; }
$('gfxBtn').onclick = () => { GFX = GFX === 'low' ? 'mid' : GFX === 'mid' ? 'high' : 'low'; store.set('ty_gfx', GFX); applyGfx(); gfxWorld(); renderGfxBtns(); banner('عدد الناس والعربيات في الشارع بيتغير لما تفتح اللعبة تاني', 'info', 2.5); };
$('fpsBtn').onclick = () => { showFps = !showFps; store.set('ty_fps', showFps ? '1' : '0'); renderGfxBtns(); };
// the parts of the graphics level that touch the world (after it is built)
function gfxWorld(){
  BUILD_CULL2 = (scene.fog.far + 15) ** 2;
  for (const b of buildings) b.grp.children.forEach(m => { m.castShadow = GFX === 'high'; });   // buildings cast shadows on high only; people and cars always do
}
gfxWorld();
renderGfxBtns();
renderer.setAnimationLoop(() => { const raw = clock.getDelta(), dt = Math.min(raw, .05); if (showFps){ fpsT.n++; fpsT.t += raw; if (fpsT.t >= .5){ $('fpsBox').textContent = `${Math.round(fpsT.n / fpsT.t)} FPS · ${GFX_NAME[GFX]}`; fpsT.n = 0; fpsT.t = 0; } } elapsed += dt; if (PHOTO.on) photoTick(dt, elapsed); else update(dt, elapsed); renderer.render(scene, camera);
  if (state === 'play'){ fpsAcc += raw; fpsN++; if (fpsN >= 150){ const avg = fpsAcc/fpsN; if (avg > 1/30 && pxr > .8){ pxr = Math.max(.8, pxr - .2); renderer.setPixelRatio(pxr); renderer.setSize(innerWidth, innerHeight); } else if (avg > 1/24 && sun.castShadow){ sun.castShadow = false; } fpsAcc = 0; fpsN = 0; } } });
renderModes();
loadDone(); introOnLoad();
window.__game = { hero, enemy, wanted, vehicles, npcs, keys, get state(){ return state; }, get mode(){ return modeObj; }, startMode, action, punch, dbg: { WEAP, setWeapon, POL, GPS, gpsSet, gpsPlaces, openPhone, closePhone, PHONE, ACTS, actStart, TUTS, inSea, vCircles, CUT, MS, curM, NARR, setRain, giveStick, launches, arabiCar, setCam: (d, tl) => { camTarget = camDist = d; CAM.tilt = tl; }, tram, TRAMR, SHOPS, enterShop, exitShop, FORT, VILLA, traffic, vehicles, heroCar, copCar, enterVehicle, CAM, pedal, joy, dom: { DOM, round10, newDominoMatch, newDominoRound, commitPlayer, aiLegal, aiEval, unseenBy, DOM_AI, aiTurn, babCounts, isBlocked, hand: s => DOM.hands[s] }, say, failMission, skipMission, uiBack, startReplay, ST2, REPLAY, EASY, get SAVE(){ return SAVE; }, get DIFF(){ return DIFF; }, RIG_MS, renderer, scene, camera, SFX, spawnThugs, npcWear3D, playIntroSeq, endIntro, makePosterImage, introLayout, VOICE, playVoice, vHash, voiceLeft, heroCheer, cats, mesa, PROG_R: () => PROG.ramadan, nightVisuals, openGarage, applyGarage, GARAGE_POS, TW, openTawla, twRoll, twPlayerMove, twStartGame, closeTawla, sequences, TAWLA_SPOT, ACT, ACTS, actStart, actEnd, kameenSpawn, pigeons, RAMPS, parkCar, LOT, PEN, COOP, PROG, ACH, achCheck, openAch, openPhoto, closePhoto, takePhoto, PHOTO, goldGlasses, staticBlocked, blocked, obstacles, freeSpot, SPOT, STOPS, ST, AH, FL, DOM, ahwaTap, ahwaHold, foulTap, stationBtn, enterStation, exitStation, openDomino, playerPick, SA, SF, get SAVE(){ return SAVE; }, startJob, endJob, race, buyVehicle, MS, ST2, CUT, JOB, RHY, HOUSE, TOD, boss, pickups, checkpoints, idx, curM, finishMission, failMission, applyStoryWorld, playCut, dlgTap, applyTimeOfDay, enterHouse, exitHouse, houseAction, openTransit, ride, startPizzaJob, startTukJob, endJob2, playWedding, rhyHit, pizzaMoto, tukVeh, arabiMoto, heroMoto, storyAction, openShop, renderModes, thief, thiefStart, thiefCaught, islamD, CAM }, step(n=60){ for (let i=0;i<n;i++){ elapsed += 1/60; update(1/60, elapsed); } renderer.render(scene, camera); } };
