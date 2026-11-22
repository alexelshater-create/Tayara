import * as THREE from 'three';
import { Sky } from 'three/addons/Sky.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';

const CH = await (await fetch('assets/chars.json')).json();
const $ = id => document.getElementById(id);
const store = { get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch(e){} } };
document.querySelectorAll('[data-face]').forEach(e => e.style.backgroundImage = `url(${CH.hero.img.face})`);
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');
const LOW = isTouch || (navigator.hardwareConcurrency||8) <= 4; const WALKERS = LOW ? 10 : 16;
if (store.get('ty_name')) $('nameIn').value = store.get('ty_name');
try { await Promise.race([document.fonts.load('900 40px Cairo'), new Promise(r => setTimeout(r, 1800))]); } catch(e){}
