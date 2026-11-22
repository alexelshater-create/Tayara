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
