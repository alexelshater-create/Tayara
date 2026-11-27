// Perf probe for Tayara: paste into the page (window.__perf(spots) -> per-spot draw calls, triangles, render and update ms)
window.__perf = async function(spots){
  const g = __game, D = g.dbg, R = D.renderer, S = D.scene, C = D.camera, gl = R.getContext(), px = new Uint8Array(4);
  const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  R.info.autoReset = false;
  const out = {};
  for (const [name, x, z] of spots){
    g.hero.pos.set(x, .15, z); if (g.hero.vel) g.hero.vel.set(0, 0, 0);
    g.step(30); sync();
    R.info.reset(); R.render(S, C); sync();
    const calls = R.info.render.calls, tris = R.info.render.triangles;
    let t0 = performance.now(); for (let k = 0; k < 4; k++) R.render(S, C); sync(); const rMs = (performance.now() - t0) / 4;
    t0 = performance.now(); for (let k = 0; k < 30; k++){ D.__upd ? D.__upd() : null; }
    // update-only time: step renders once at the end, so time step(30) and remove one render
    t0 = performance.now(); g.step(30); sync(); const uMs = Math.max(0, (performance.now() - t0 - rMs) / 30);
    out[name] = { calls, tris, renderMs: +rMs.toFixed(1), updateMs: +uMs.toFixed(2) };
  }
  R.info.autoReset = true;
  let meshes = 0, vis = 0, cast = 0; S.traverse(o => { if (o.isMesh){ meshes++; if (o.visible) vis++; if (o.castShadow) cast++; } });
  out._scene = { meshes, vis, cast, geos: R.info.memory.geometries, tex: R.info.memory.textures, programs: R.info.programs.length, pr: R.getPixelRatio(), shadows: R.shadowMap.enabled, w: innerWidth, h: innerHeight };
  return out;
};
window.__SPOTS = [['cafe', 20, 39], ['house', -24, 88.4], ['shops', 78, -40], ['fish', 72, 140], ['citadel', 96, 255], ['port', 263, 122.5]];
window.__run = async function(){
  for (let i = 0; i < 80 && !(window.__game && __game.state === 'menu'); i++) await new Promise(r => setTimeout(r, 500));
  __game.startMode('free'); await new Promise(r => setTimeout(r, 2500));
  const r = await __perf(__SPOTS); let n = 0; __game.dbg.scene.traverse(o => { if (o.isInstancedMesh) n++; }); r._scene.instanced = n;
  const sum = k => Object.entries(r).filter(([a]) => a[0] !== '_').reduce((s, [, v]) => s + v[k], 0);
  r._avg = { calls: Math.round(sum('calls') / __SPOTS.length), tris: Math.round(sum('tris') / __SPOTS.length), renderMs: +(sum('renderMs') / __SPOTS.length).toFixed(1) };
  return JSON.stringify(r);
};
