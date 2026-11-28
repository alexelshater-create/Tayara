// ================= stage 17: the look — real skies, light by the hour, the sea, real ground, windows at night, a gentle grade =================
// Skies and light: three photographed skies (Poly Haven, CC0) — a partly cloudy day, a sunset, a night — blended by the hour as
// the background and as the light everything reflects. Ground: real photographed asphalt, pavement tiles, sand, stone (CC0).
// The sea: moving waves that reflect the sky, turquoise over the shallows, foam along the shore (assets/city/shore.png).
// Everything heavy stays off on «خفيف».
const GFXU = { uTime: { value: 0 }, uNight: { value: 0 } };

// ---- the grade: a touch more contrast and warmth after the filmic tone mapping (no extra pass: it's in every material) ----
THREE.ShaderChunk.tonemapping_fragment = `
#if defined( TONE_MAPPING )
  gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
  { vec3 c = max( gl_FragColor.rgb, 0.0 );
    float l = dot( c, vec3( .2126, .7152, .0722 ) );
    c = max( mix( vec3( l ), c, 1.08 ), 0.0 );                // a little more colour (never below zero: pow() of a negative is NaN)
    c = pow( c / .18 + 1e-6, vec3( 1.06 ) ) * .18;                   // a little more contrast round mid grey
    c *= vec3( 1.025, 1.0, .965 );                            // warm, like the Mediterranean light
    gl_FragColor.rgb = clamp( c, 0.0, 1.0 ); }
#endif
`;

// ---- real ground: photographed textures (diffuse; normal + roughness above «خفيف») ----
const GTL = new THREE.TextureLoader();
function GT(name, rx, ry, srgb = true){ const t = GTL.load(`assets/tex/${name}.webp`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = LOW ? 2 : 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }
function PBR(mat, base, rx, ry, o = {}){
  if (!mat) return; mat.map = GT(base + '_d', rx, ry);
  if (!LOW){ mat.normalMap = GT(base + '_n', rx, ry, false); mat.normalScale.set(o.ns ?? .8, o.ns ?? .8); mat.roughnessMap = GT(base + '_r', rx, ry, false); }
  mat.color.set(o.tint ?? 0xffffff); mat.roughness = o.rough ?? 1; mat.needsUpdate = true;
}
if (typeof CMAT !== 'undefined'){
  PBR(CMAT.road, 'asphalt', 3.4, 3.4, { tint: 0xffffff, ns: .9 });                // the road's UVs: 1 per 10 m → a texture every ~3 m
  PBR(CMAT.walk, 'pave', 2, 2, { tint: 0xf3ece0, ns: .7 });                       // 1 per 4 m → the grey 40 cm tiles of the pavements
  PBR(CMAT.plaza, 'concrete', 2, 2, { tint: 0xf1e7d6, ns: .7 });
  PBR(CMAT.seawall, 'stone', .5, 1.25, { tint: 0xd8cbb3, ns: 1 });                  // the corniche's big stone blocks
  PBR(CMAT.parapet, 'stone', .5, .33, { tint: 0xe6dcc6, ns: 1 });
}
if (typeof CMAT !== 'undefined' && CMAT.park){ CMAT.park.color.set(0xa8b48c); CMAT.park.needsUpdate = true; }   // the grass less lime
if (typeof asphalt !== 'undefined'){ const s = asphalt.geometry.parameters; PBR(asphalt.material, 'asphalt', s.width / 3, s.height / 3, { tint: 0xffffff, ns: .9 }); }

// ---- the facades: darker at the foot (the street's shade), and at night some windows lit warm ----
function facadeShader(mat){
  if (!mat || mat.userData.gfx) return; mat.userData.gfx = true;
  mat.onBeforeCompile = sh => {
    sh.uniforms.uNight = GFXU.uNight;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWY;').replace('#include <project_vertex>', '#include <project_vertex>\nvWY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying float vWY;
uniform float uNight;
float fh1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float fn1(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(fh1(i), fh1(i + vec2(1, 0)), f.x), mix(fh1(i + vec2(0, 1)), fh1(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  diffuseColor.rgb *= mix(.78, 1., smoothstep(.15, 3.6, vWY));
  #ifdef USE_MAP
  { float u = vMapUv.x * 16.;   // metres along the wall
    float streak = smoothstep(.62, .95, fn1(vec2(u * 1.7, vWY * .09))) * smoothstep(.3, .9, fn1(vec2(u * .21, 3.1)));   // rain streaks down from the sills
    float salt = smoothstep(.55, .85, fn1(vec2(u * .35, vWY * .3) + 7.)) * .5;                                          // salt-washed, faded patches
    float damp = (1. - smoothstep(3.7, 6.5, vWY)) * smoothstep(.4, .8, fn1(vec2(u * .5, 1.7)));                       // damp rising from the street
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * .8, streak * .55);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(.33))) * 1.08, salt * .35);
    diffuseColor.rgb *= 1. - damp * .14; }
  #endif`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  #ifdef USE_MAP
  { float lum = dot(diffuseColor.rgb, vec3(.3, .59, .11)); vec2 cell = floor(vMapUv * vec2(16., 12.8));
    float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
    totalEmissiveRadiance += uNight * step(lum, .2) * step(.74, h) * step(4.2, vWY) * mix(vec3(1., .79, .53), vec3(.87, .91, 1.), step(.95, h)) * (1.05 + fract(h * 7.31) * .6); }
  #endif`);
  };
  mat.needsUpdate = true;
}
if (typeof CMAT !== 'undefined'){ for (const m of CMAT.fac) facadeShader(m); facadeShader(CMAT.band); }

// ---- the sea ----
(() => {
  if (typeof water === 'undefined') return;
  const nrm = GT('water_n', 1, 1, false), shore = new THREE.TextureLoader().load('assets/city/shore.png');
  shore.flipY = false; shore.colorSpace = THREE.NoColorSpace; shore.minFilter = THREE.LinearFilter; shore.generateMipmaps = false;
  const W = CITY ? [CITY.x0, CITY.z0, CITY.x1 - CITY.x0, CITY.z1 - CITY.z0] : [-1e5, -1e5, 2e5, 2e5];
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: LOW ? .2 : .1, metalness: 0, envMapIntensity: .65, normalMap: nrm, normalScale: new THREE.Vector2(LOW ? .3 : .38, LOW ? .3 : .38) });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uTime: GFXU.uTime, uShore: { value: shore }, uWorld: { value: new THREE.Vector4(...W) }, uPatch: { value: new THREE.Vector4(...(CITY && CITY.patch ? CITY.patch : [0, 0, 0, 0])) }, uShallow: { value: new THREE.Color(0x2c8590) }, uDeep: { value: new THREE.Color(0x114e6a) }, uNight: GFXU.uNight });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWP; uniform float uTime; uniform sampler2D uShore; uniform vec4 uWorld; uniform vec4 uPatch; uniform vec3 uShallow; uniform vec3 uDeep; uniform float uNight;
float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(hsh(i), hsh(i + vec2(1, 0)), f.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  { vec2 su = vec2((vWP.x - uWorld.x) / uWorld.z, (vWP.z - uWorld.y) / uWorld.w);
    float d = (su.x < 0. || su.y < 0. || su.x > 1. || su.y > 1.) ? 64. : texture2D(uShore, su).r * 64.;   // metres to the shore
    if (vWP.x > uPatch.x && vWP.x < uPatch.z && vWP.z > uPatch.y && vWP.z < uPatch.w) d = 12.;   // the old «حتة» keeps its own water (its raster is all land)
    vec3 c = mix(uShallow, uDeep, smoothstep(.5, 11., d));
    float n = vnoise(vWP.xz * .35 + uTime * vec2(.35, .2)) * .6 + vnoise(vWP.xz * 1.1 - uTime * .5) * .4;
    float band = (1. - smoothstep(.0, 1.6, d + n * 1.2 - (sin(uTime * 1.3 + d * .9) * .5 + .5) * .8)) * smoothstep(.5, .8, n + .25);   // the foam comes and goes on the shore
    c = mix(c, vec3(.9, .94, .95), clamp(band, 0., 1.) * .7 * (1. - uNight * .6));
    diffuseColor.rgb = c * mix(1., .35, uNight); }`)
      .replace('gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );', 'gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor * .6 );')
      .replace('texture2D( normalMap, vNormalMapUv ).xyz', '(texture2D( normalMap, vWP.xz / 25. + uTime * vec2(.011, .007) ).xyz + texture2D( normalMap, vWP.xz / 6. - uTime * vec2(.03, .042) ).xyz) * .5');
  };
  water.material = m; water.receiveShadow = !LOW;
})();

// ---- the skies: three photographed skies blended by the hour, as the background, the fog's colour and the light everything reflects ----
const SKYX = { ready: false, dome: null, env: {}, k: {}, horizon: {}, rot: {} };
(async () => {
  try {
    const { RGBELoader } = await import('three/addons/RGBELoader.js'); const L = new RGBELoader();
    for (const k of ['day', 'dusk', 'night']){
      const t = await L.loadAsync(`assets/sky/${k}.hdr`); t.mapping = THREE.EquirectangularReflectionMapping;
      SKYX[k] = t; SKYX.env[k] = pmrem.fromEquirectangular(t).texture;
      // the horizon's colour (for the fog) and where the sun is in the photo (to line it up with our sun)
      const { width: w, height: h, data } = t.image, half = t.type === THREE.HalfFloatType, get = i => half ? THREE.DataUtils.fromHalfFloat(data[i]) : data[i];
      let r = 0, g = 0, b = 0, n = 0, best = -1, bu = .5;
      for (let y = Math.floor(h * .44); y < Math.floor(h * .49); y++) for (let x = 0; x < w; x += 4){ const i = (y * w + x) * 4; r += get(i); g += get(i + 1); b += get(i + 2); n++; }
      for (let y = 0; y < Math.floor(h * .5); y += 2) for (let x = 0; x < w; x += 2){ const i = (y * w + x) * 4, l = get(i) + get(i + 1) + get(i + 2); if (l > best){ best = l; bu = x / w; } }
      SKYX.horizon[k] = new THREE.Color(r / n, g / n, b / n);
      if (k === 'night') SKYX.horizon[k] = new THREE.Color(0x1e2a3d).multiplyScalar(Math.max((r + g + b) / n / 3, 1e-4) / .3);   // the fog comes out at #1e2a3d after the sky's own scale (.3 / lum)
      if (k === 'dusk'){ const c = new THREE.Color(0xe3a36c); SKYX.horizon[k].lerp(c.multiplyScalar((r + g + b) / n / 3 / ((c.r + c.g + c.b) / 3)), .55); }
      const lum = (r + g + b) / n / 3; SKYX.k[k] = (k === 'night' ? .3 : k === 'dusk' ? .88 : .62) / Math.max(lum, 1e-4);
      SKYX.rot[k] = (bu - .5) * Math.PI * 2;   // the sun's angle round the horizon in the photo (atan(z, x))
    }
    const mat = new THREE.ShaderMaterial({
      uniforms: { tDay: { value: SKYX.day }, tDusk: { value: SKYX.dusk }, tNight: { value: SKYX.night }, w: { value: new THREE.Vector3(1, 0, 0) }, k: { value: new THREE.Vector3(SKYX.k.day, SKYX.k.dusk, SKYX.k.night) },
        rot: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color() } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = p.xyww; }`,
      fragmentShader: `uniform sampler2D tDay, tDusk, tNight; uniform vec3 w, k, rot; uniform vec3 uFog; varying vec3 vDir;
        vec2 eq(vec3 d, float a){ float c = cos(a), s = sin(a); d = vec3(c * d.x - s * d.z, d.y, s * d.x + c * d.z); return vec2(atan(d.z, d.x) * .15915494 + .5, asin(clamp(d.y, -1., 1.)) * .31830988 + .5); }
        void main(){ vec3 d = normalize(vDir);
          vec3 c = vec3(0.);
          if (w.x > .001) c += texture2D(tDay, eq(d, rot.x)).rgb * k.x * w.x;
          if (w.y > .001) c += texture2D(tDusk, eq(d, rot.y)).rgb * k.y * w.y;
          if (w.z > .001) c += texture2D(tNight, eq(d, rot.z)).rgb * vec3(.62, .78, 1.2) * k.z * w.z;   // a clean blue night, not a brown smog
          float hz = 1. - smoothstep(-.02, .16, d.y);   // the sea haze at the horizon, the fog's colour below it
          c = mix(c, uFog, hz * .85);
          gl_FragColor = vec4(c, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false, toneMapped: true });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(100, 48, 24), mat); dome.frustumCulled = false; dome.renderOrder = -10;
    scene.add(dome); SKYX.dome = dome; sky.visible = false; SKYX.ready = true;
    applyTimeOfDay(TOD.h);
  } catch (e){ console.warn('skies failed, keeping the drawn sky', e); }
})();
{
  const _tod = applyTimeOfDay;
  applyTimeOfDay = function(h){
    _tod(h);
    const n = nightAmount(TOD.h), d = duskAmount(TOD.h); GFXU.uNight.value = n;
    // the city at night: a bright, bluish moonlight and the glow of the streets, so the streets read
    hemi.intensity += .32 * n; sun.intensity += .3 * n; renderer.toneMappingExposure = .86 + n * .2;
    if (!SKYX.ready) return;
    const wn = n, wd = Math.min(1 - wn, d * 1.15), wy = Math.max(0, 1 - wn - wd), U = SKYX.dome.material.uniforms;
    U.w.value.set(wy, wd, wn);
    // line the photo's sun up with ours
    const la = Math.atan2(sunDir.z, sunDir.x);
    U.rot.value.set(SKYX.rot.day - la, SKYX.rot.dusk - la, SKYX.rot.night - la);
    // the fog takes the horizon's colour (so the city melts into the sky the same way at every hour)
    const f = new THREE.Color(0, 0, 0);
    for (const [kk, ww] of [['day', wy], ['dusk', wd], ['night', wn]]) f.add(SKYX.horizon[kk].clone().multiplyScalar(SKYX.k[kk] * ww));
    scene.fog.color.setRGB(Math.min(1, f.r), Math.min(1, f.g), Math.min(1, f.b), THREE.LinearSRGBColorSpace); U.uFog.value.copy(scene.fog.color);
    const envK = wn > .5 ? 'night' : wd > .45 ? 'dusk' : 'day';
    if (scene.environment !== SKYX.env[envK]) scene.environment = SKYX.env[envK];
  };
}
