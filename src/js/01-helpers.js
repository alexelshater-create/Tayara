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
// numbers on screen are Arabic digits (they were mixed: «٥٠ مشروب · 0/50»). ARH leaves tags and their attributes alone.
// on a phone, keyboard hints become the buttons («(E عند النَصبة)» → «(عند النَصبة)»)
const TOUCHK = s => !isTouch ? s : s.replace(/\bE\b/g, 'زرار الإيد').replace(/\bF\b/g, 'زرار الضرب').replace(/\bH\b/g, 'زرار الكلاكس');
const AR_D = '٠١٢٣٤٥٦٧٨٩', AR = s => TOUCHK(String(s)).replace(/ · /g, ' | ').replace(/[0-9]/g, d => AR_D[d]), ARH = s => String(s).replace(/(<[^>]*>)|([^<]+)/g, (m, tag, txt) => tag || AR(txt));
const egp = n => `${Math.round(n).toLocaleString('ar-EG')} جنيه`;
