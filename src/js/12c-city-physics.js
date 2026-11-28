// ================= the real city in the physics: where you can walk and drive, what's solid, where the ground is =================
// The old «حتة» keeps its own rules (its blocks, roads and obstacles); outside it the city raster answers (03c-city.js).
if (CITY){
  const _inWorldOld = inWorld, _staticOld = staticBlocked, _groundOld = groundY, _losOld = lineOfSight;
  // you can be anywhere that isn't open sea (buildings are solid, not "outside the world")
  const patchRim = (x, z) => Math.min(x - CPATCH[0], CPATCH[2] - x, z - CPATCH[1], CPATCH[3] - z) < 1.2;   // the last metre inside the «حتة»'s edge
  inWorld = function(x, z){ return _inWorldOld(x, z) || ((!inPatch(x, z) || patchRim(x, z)) && cityR(x, z) !== 0); };   // the old map's own parts (the «حتة», its pier) first
  staticBlocked = function(x, z, pad = PR, feet){ return _staticOld(x, z, pad, feet) || cityBlocked(x, z, pad, feet); };
  // the pavement and the blocks are 15 cm above the road; inside a city building (only when standing on its roof) its roof
  groundY = function(x, z){
    if (HOUSE.inside || inPatch(x, z) || _inWorldOld(x, z)) return _groundOld(x, z);
    const v = cityR(x, z); return v === 1 || v === 0 ? 0 : .15;
  };
  // police and anyone else can't see through city buildings (a 1 m march along the line)
  lineOfSight = function(ax, az, bx, bz){
    if (!_losOld(ax, az, bx, bz)) return false;
    const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L);
    for (let i = 1; i < n; i++){ const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (!inPatch(x, z) && cityR(x, z) >= 10) return false; }
    return true;
  };
}
// the height of a city roof at a point (0 when there is none) — for standing on roofs (19w)
const cityRoofAt = (x, z) => { if (!CITY || inPatch(x, z)) return 0; const v = cityR(x, z); return v >= 10 ? cityH(v) + .15 : 0; };
// the name of the part of town you're in (the phone, the photo watermark, the radar): the real district outside the «حتة»
if (CITY){
  const _districtOld = districtAt;
  districtAt = function(x, z){ if (inPatch(x, z) || HOUSE.inside) return _districtOld(x, z); const d = cityDistrict(x, z); if (!d) return _districtOld(x, z); const k = 'c_' + d.k; DISTRICT_NAMES[k] = d.name; return k; };
}
