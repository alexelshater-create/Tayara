// ================= 3D characters: loading =================
// a 2048 picture takes 22 MB of the phone's graphics memory, a 1024 one 5.5 MB: on عادي and خفيف the character
// pictures are drawn smaller once when they load (on a phone screen the difference can't be seen)
function shrinkMaps(mat, max){
  for (const k of ['map', 'normalMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'aoMap']){
    const t = mat[k], im = t && t.image; if (!im || !(im.width > max || im.height > max)) continue;
    const s = max / Math.max(im.width, im.height), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); t.image = c; t.needsUpdate = true;
  }
}
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
    shrinkMaps(m, GFX === 'high' ? 2048 : 1024);
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
