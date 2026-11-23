// ================= 3D characters: loading =================
// load a model made by tools/shrink_model.py; null when it is missing or broken (the game then keeps the photo character)
async function loadModel3D(name){
  try {
    const { GLTFLoader } = await import('three/addons/GLTFLoader.js');
    const g = await new GLTFLoader().loadAsync(`assets/models/${name}.glb`);
    let src = null; g.scene.traverse(o => { if (o.isMesh && !src) src = o; });
    if (!src) return null;
    const R = rigModel(src);
    const m = R.mesh.material; m.side = THREE.FrontSide; if (m.map) m.map.anisotropy = 4;
    R.mesh.castShadow = !LOW;
    return R;
  } catch (e){ console.warn('3D model failed, using the photo:', name, e); return null; }
}
// which models exist is written by build.py; anyone without a model keeps the photo character.
// Only the characters the game already places are loaded (shadia and haidy, islam's bride, join when their scenes are built).
const MODELS_USED = ['tayara', 'arabi', 'islam', 'shams', 'youssef', 'kamel', 'thug', 'soldier', 'npc'];
const MODEL_LIST = store.get('chars2d') === '1' ? [] : (await fetch('assets/models/index.json').then(r => r.json()).catch(() => [])).filter(n => MODELS_USED.includes(n));
const MODELS3D = Object.fromEntries(await Promise.all(MODEL_LIST.map(async n => [n, await loadModel3D(n)])));

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
