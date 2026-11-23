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
