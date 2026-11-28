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
scene.fog = new THREE.Fog(0xcdd6da, 55, 205);   // Alexandria's humid sea haze
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
  const sh = q !== 'low', st = q === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;   // the soft kind samples much more: عالي only
  if (renderer.shadowMap.enabled !== sh || renderer.shadowMap.type !== st){ renderer.shadowMap.enabled = sh; renderer.shadowMap.type = st; scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); }); }
  sun.castShadow = sh;
  const ms = q === 'high' ? 2048 : 1024, ext = q === 'high' ? 60 : 40;   // stage 17: the sun's shadows reach further (the street across, the next block)
  if (sun.shadow.mapSize.x !== ms){ sun.shadow.mapSize.set(ms, ms); if (sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; } }
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext }); sun.shadow.camera.updateProjectionMatrix();
  scene.fog.near = q === 'low' ? 40 : 55; scene.fog.far = q === 'low' ? 150 : 205;
  camera.far = scene.fog.far + 25; camera.updateProjectionMatrix();        // nothing past the fog is drawn
  renderer.setSize(innerWidth, innerHeight);
}
applyGfx();
