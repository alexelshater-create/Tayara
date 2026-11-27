"""Build the real Alexandria city for the game from OpenStreetMap data (stages 14-16).

Input : the Overpass JSON files fetched by fetch2.py (roads, bld0..8, coast, green, rail, poi, places)
Output: assets/city/
  index.json        frame, chunk list, districts, landmarks, shops, stops
  graph.json        road graph: nodes [x,z], edges {a,b,pts,w,cls,ow,name}
  c/<i>_<k>.bin     one binary per 128 m chunk (roads, sidewalks/land, parks, kerbs, markings, buildings)
  r/<i>_<k>.png     the 1 m raster per 256 m tile: 0 sea, 1 road, 2 land, 3 park, 4 plaza/pedestrian, 10+ building (h / 0.5)
  map.webp          dark GPS-style base picture in WORLD orientation, 1 px = 2 m (the radar / big map)
  walk.json, parked.json

The game frame: real north -> +z, real east -> -x (the real map turned 180 degrees so the sea stays on +z like the old map),
positions scaled by S = 0.5 (road widths and building heights stay human size). The old «حتة» patch (x -96..96,
z -96..154) sits in Anfoushi; OSM roads / buildings inside it are dropped and its grid streets join the network.

Run:  python tools/city/build_city.py <osm_dir>
"""
import json, math, os, sys, random, struct, time
import numpy as np
from shapely.geometry import LineString, Polygon, MultiPolygon, Point, box, GeometryCollection, MultiLineString
from shapely.ops import unary_union, linemerge, polygonize
from shapely import affinity, make_valid
import mapbox_earcut as earcut
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OSM = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'tools', 'osm')
OUT = os.path.join(ROOT, 'assets', 'city')
random.seed(7)
t0 = time.time()
def log(*a): print(f'[{time.time() - t0:6.1f}s]', *a, flush=True)

# ---------------- the frame ----------------
S = 0.5
CFG = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frame.json'), encoding='utf-8'))
LAT0, LON0 = CFG['anchor']            # the real point that becomes the old map's (0, 0) (the «حتة» centre)
KX = 111320 * math.cos(math.radians(LAT0)); KY = 110574
def P(lon, lat): return (-(lon - LON0) * KX * S, (lat - LAT0) * KY * S)
def PL(geom): return [P(g['lon'], g['lat']) for g in geom]
BB = CFG['bbox']                      # S, W, N, E
x_a, z_a = P(BB[1], BB[0]); x_b, z_b = P(BB[3], BB[2])
X0, X1 = min(x_a, x_b), max(x_a, x_b); Z0, Z1 = min(z_a, z_b), max(z_a, z_b)
X0, Z0 = math.floor(X0 / 128) * 128, math.floor(Z0 / 128) * 128
X1, Z1 = math.ceil(X1 / 128) * 128, math.ceil(Z1 / 128) * 128
log('world', X0, X1, Z0, Z1, 'size', X1 - X0, Z1 - Z0)
WORLD = box(X0, Z0, X1, Z1)
PATCH = box(*CFG['patch'])            # the old map's «حتة» (kept from the old game)
PATCH_SEA = box(*CFG['patchSea'])     # forced sea in front of its corniche
REMOTES = []
SETS_OUT = []
TRAM_WAYS = []
RAML_WAYS = []
CLEARS = [Point(c['x'], c['z']).buffer(c['r']) for c in CFG.get('clear', [])]   # room for the story's own buildings / landmarks

def load(name):
    p = os.path.join(OSM, name + '.json')
    if not os.path.exists(p): log('missing', name); return []
    return json.load(open(p, encoding='utf-8'))['elements']

# ---------------- coast: land / sea ----------------
def coast_land():
    """land = everything the sea flood doesn't reach: the coastline is drawn as a wall at 2 m, the sea is flooded from
    points known to be open water (CFG seaSeeds, lat/lon), then the land is turned back into polygons."""
    els = load('coast')
    k = 0.5   # px per metre
    W = int((X1 - X0) * k); H = int((Z1 - Z0) * k)
    im = Image.new('L', (W, H), 0); d = ImageDraw.Draw(im)
    for e in els:
        t = e.get('tags', {})
        if e['type'] == 'way' and 'geometry' in e and (t.get('natural') == 'coastline' or t.get('man_made') in ('breakwater', 'pier', 'groyne')):
            pts = [((x - X0) * k, (z - Z0) * k) for x, z in PL(e['geometry'])]
            if len(pts) > 1: d.line(pts, fill=255, width=3 if t.get('natural') == 'coastline' else 2)
    # the streets are on land: they stop the flood where the coastline has gaps (the corniche runs along the whole coast)
    for e in load('roads'):
        t = e.get('tags', {})
        if e['type'] == 'way' and 'geometry' in e and t.get('highway') in CLS and t.get('bridge') != 'yes' and t.get('highway') != 'service':
            pts = [((x - X0) * k, (z - Z0) * k) for x, z in PL(e['geometry'])]
            if len(pts) > 1: d.line(pts, fill=255, width=4)
    for lat, lon in CFG['seaSeeds']:
        x, z = P(lon, lat); px, pz = int((x - X0) * k), int((z - Z0) * k)
        if 0 <= px < W and 0 <= pz < H and im.getpixel((px, pz)) == 0: ImageDraw.floodfill(im, (px, pz), 128)
    a = np.array(im)
    land_mask = (a != 128).astype(np.uint8)
    # land polygons from the mask: rows of runs merged per 4 px band, then unioned (coarse but robust)
    polys = []
    for z0 in range(0, H, 4):
        band = land_mask[z0:z0 + 4].min(axis=0) if z0 + 4 <= H else land_mask[z0:].min(axis=0)
        row = np.concatenate([[0], band, [0]]); dif = np.diff(row.astype(np.int8)); starts = np.where(dif == 1)[0]; ends = np.where(dif == -1)[0]
        for s, e in zip(starts, ends):
            polys.append(box(X0 + s / k, Z0 + z0 / k, X0 + e / k, Z0 + min(H, z0 + 4) / k))
    L = unary_union(polys).buffer(1.0).buffer(-1.0).simplify(1.0)
    water = []
    for e in els:
        t = e.get('tags', {})
        if t.get('natural') == 'water' and e['type'] == 'way' and 'geometry' in e and len(e['geometry']) > 3:
            try: water.append(Polygon(PL(e['geometry'])).buffer(0))
            except Exception: pass
    if water: L = L.difference(unary_union(water))
    L = L.difference(PATCH_SEA).union(PATCH)
    return make_valid(L.buffer(0))

# ---------------- roads ----------------
# widths: the city is half size but people and cars aren't, so streets are narrower than real (like GTA's cities):
# the big roads stay wide, side streets are two narrow lanes, the tiny alleys / service roads are left out
CLS = {'motorway': ('major', 15), 'trunk': ('major', 14), 'primary': ('major', 12), 'secondary': ('major', 10), 'tertiary': ('minor', 8),
       'motorway_link': ('major', 7), 'trunk_link': ('major', 7), 'primary_link': ('major', 7), 'secondary_link': ('minor', 6.5), 'tertiary_link': ('minor', 6.5),
       'residential': ('minor', 6), 'unclassified': ('minor', 6), 'living_street': ('minor', 5), 'road': ('minor', 6),
       'pedestrian': ('ped', 5)}
OLDQ = {'bahary', 'manshiya', 'attarin', 'karmouz', 'moharram'}
def old_quarter(x, z):
    best = None; bd = 1e18
    for d in CFG['districts']:
        dd = (d['x'] - x) ** 2 + (d['z'] - z) ** 2
        if dd < bd: bd, best = dd, d.get('h')
    return best in OLDQ
def roads():
    els = load('roads'); out = []
    for e in els:
        if e['type'] != 'way' or 'geometry' not in e: continue
        t = e.get('tags', {}); h = t.get('highway')
        if h not in CLS: continue
        if t.get('area') == 'yes': continue
        cls, w = CLS[h]
        try:
            if 'lanes' in t and cls == 'major': w = max(w, min(18, float(t['lanes'].split(';')[0]) * 3 + 1))
        except ValueError: pass
        pts = PL(e['geometry'])
        if len(pts) < 2: continue
        ln = LineString(pts)
        if not ln.intersects(WORLD): continue
        ow = t.get('oneway') in ('yes', '1', 'true') or t.get('junction') == 'roundabout'
        name = t.get('name:ar') or t.get('name') or ''
        if cls == 'minor' and h in ('residential', 'unclassified', 'living_street', 'road') and old_quarter(ln.centroid.x, ln.centroid.y): w = 4.6 if h != 'living_street' else 4
        out.append({'ln': ln, 'cls': cls, 'w': w, 'ow': ow, 'name': name, 'bridge': t.get('bridge') == 'yes', 'hw': h})
    log('roads', len(out))
    return out

# the old «حتة» grid streets (they join the real network)
def patch_roads():
    xs = [-96, -48, 0, 48, 96]; zs = [-96, -48, 0, 48, 96, 144]
    out = []
    for x in xs: out.append({'ln': LineString([(x, -96), (x, 144)]), 'cls': 'minor', 'w': 12, 'ow': False, 'name': '', 'bridge': False, 'hw': 'patch', 'patch': True})
    for z in zs: out.append({'ln': LineString([(-96, z), (96, z)]), 'cls': 'major' if z == 144 else 'minor', 'w': 12, 'ow': False, 'name': 'كورنيش الحتة' if z == 144 else '', 'bridge': False, 'hw': 'patch', 'patch': True})
    return out

def main():
    os.makedirs(os.path.join(OUT, 'c'), exist_ok=True); os.makedirs(os.path.join(OUT, 'r'), exist_ok=True)
    for sub, ext in (('c', '.bin'), ('r', '.png')):   # no stale tiles / chunks from an older build
        for f in os.listdir(os.path.join(OUT, sub)):
            if f.endswith(ext): os.remove(os.path.join(OUT, sub, f))
    land = coast_land(); log('land area km2', round(land.area / 1e6, 2))
    R = roads()
    # the moved places of the old map (market, restaurants, stadium, workshops, the villa, the showroom): each keeps its old
    # blocks and the streets round them, put down whole at its real place (its own little grid, like the «حتة»)
    global REMOTES
    REMOTES = []
    for rm in CFG.get('remote', []):
        tx, tz = P(rm['lon'], rm['lat'])
        ox = -96 + (rm['j0'] + rm['j1'] + 1) * 24; oz = -96 + (rm['k0'] + rm['k1'] + 1) * 24
        best = None
        def cut(cx, cz):
            bb = box(cx - (rm['j1'] - rm['j0'] + 1) * 24 - 6, cz - (rm['k1'] - rm['k0'] + 1) * 24 - 6, cx + (rm['j1'] - rm['j0'] + 1) * 24 + 6, cz + (rm['k1'] - rm['k0'] + 1) * 24 + 6)
            s = 0
            for r in R:
                if r['cls'] == 'major' or (r['name'] and r['cls'] == 'minor'):
                    if r['ln'].intersects(bb): s += r['ln'].intersection(bb).length * (3 if r['cls'] == 'major' else 1)
            if not land.buffer(-2).contains(bb.centroid): s += 1e6
            return s
        for dxx in range(-260, 261, 20):
            for dzz in range(-260, 261, 20):
                if dxx * dxx + dzz * dzz > 260 * 260: continue
                sc = cut(tx + dxx, tz + dzz) + math.hypot(dxx, dzz) * .6
                if best is None or sc < best[0]: best = (sc, tx + dxx, tz + dzz)
        if best: log('remote', rm['name'], 'shifted', round(math.hypot(best[1] - tx, best[2] - tz)), 'm, road cut', round(best[0])); tx, tz = best[1], best[2]
        dx, dz = round(tx - ox, 1), round(tz - oz, 1)
        x0 = -96 + rm['j0'] * 48 + dx; x1 = -96 + (rm['j1'] + 1) * 48 + dx; z0 = -96 + rm['k0'] * 48 + dz; z1 = -96 + (rm['k1'] + 1) * 48 + dz
        REMOTES.append({**rm, 'dx': dx, 'dz': dz, 'core': box(x0, z0, x1, z1), 'rect': box(x0 - 6, z0 - 6, x1 + 6, z1 + 6), 'xs': [x0 + 48 * i for i in range(rm['j1'] - rm['j0'] + 2)], 'zs': [z0 + 48 * i for i in range(rm['k1'] - rm['k0'] + 2)], 'bx': (x0, z0, x1, z1)})
    pads = [PATCH] + [r['rect'] for r in REMOTES]
    padU = unary_union(pads)
    # drop / clip real roads where the old map's pieces sit; keep the parts outside
    R2 = []
    for r in R:
        g = r['ln'].difference(padU.buffer(2))
        for part in (g.geoms if hasattr(g, 'geoms') else [g]):
            if part.length > 6: R2.append({**r, 'ln': part})
    R = R2 + patch_roads()
    for rm in REMOTES:
        x0, z0, x1, z1 = rm['bx']
        for x in rm['xs']: R.append({'ln': LineString([(x, z0), (x, z1)]), 'cls': 'minor', 'w': 12, 'ow': False, 'name': '', 'bridge': False, 'hw': 'patch', 'grid': True})
        for z in rm['zs']: R.append({'ln': LineString([(x0, z), (x1, z)]), 'cls': 'minor', 'w': 12, 'ow': False, 'name': '', 'bridge': False, 'hw': 'patch', 'grid': True})
    # links: every grid street end reaches out to the nearest real road, and every cut real road reaches in to the grid
    real = [r for r in R if r.get('hw') not in ('patch',) and r['cls'] in ('major', 'minor')]
    grids = [r for r in R if r.get('hw') == 'patch']
    links = []
    def link(a, q):
        if a.distance(q) < 1.5: return
        links.append({'ln': LineString([(a.x, a.y), (q.x, q.y)]), 'cls': 'minor', 'w': 9, 'ow': False, 'name': '', 'bridge': False, 'hw': 'link'})
    pieces = [(PATCH, [-96, -48, 0, 48, 96], [-96, -48, 0, 48, 96, 144])] + [(rm['rect'], rm['xs'], rm['zs']) for rm in REMOTES]
    for pad, xs, zs in pieces:
        bx0, bz0, bx1, bz1 = min(xs), min(zs), max(xs), max(zs)
        ends = [(x, bz0, 0, -1) for x in xs] + [(x, bz1, 0, 1) for x in xs] + [(bx0, z, -1, 0) for z in zs] + [(bx1, z, 1, 0) for z in zs]
        if pad is PATCH: ends = [e for e in ends if not (e[3] == 1)]   # the «حتة»'s corniche side is the sea
        for (x, z, dx, dz) in ends:
            p = Point(x + dx * 8, z + dz * 8); best = None; bd = 45
            for r in real:
                d = r['ln'].distance(p)
                if d < bd: bd, best = d, r
            if best is None: continue
            q = best['ln'].interpolate(best['ln'].project(p))
            links.append({'ln': LineString([(x, z), (x + dx * 7, z + dz * 7), (q.x, q.y)]), 'cls': 'minor', 'w': 9, 'ow': False, 'name': '', 'bridge': False, 'hw': 'link'})
        gl = unary_union([g['ln'] for g in grids if g['ln'].within(pad.buffer(1))])
        edge = pad.buffer(3).boundary
        for r in real:
            for e in (Point(r['ln'].coords[0]), Point(r['ln'].coords[-1])):
                if e.distance(pad) < 4.5 and not gl.is_empty:
                    q = gl.interpolate(gl.project(e)) if gl.geom_type == 'LineString' else min((g.interpolate(g.project(e)) for g in gl.geoms), key=lambda qq: qq.distance(e))
                    if q.distance(e) < 30: link(e, q)
    R += links
    log('roads with patch + links', len(R))
    land = land.union(unary_union([rm['rect'].buffer(4) for rm in REMOTES])) if REMOTES else land
    # road surfaces
    car = [r for r in R if r['cls'] != 'ped']
    road_poly = unary_union([r['ln'].buffer(r['w'] / 2, cap_style=2 if (r.get('patch') or r.get('grid')) else 1, join_style=1) for r in car]).buffer(0)
    ped_poly = unary_union([r['ln'].buffer(r['w'] / 2) for r in R if r['cls'] == 'ped']).buffer(0) if any(r['cls'] == 'ped' for r in R) else Polygon()
    # roads over the sea only where they are bridges (or the patch)
    bridges = unary_union([r['ln'].buffer(r['w'] / 2) for r in car if r['bridge']]) if any(r['bridge'] for r in car) else Polygon()
    road_poly = road_poly.intersection(land.buffer(3)).union(bridges).buffer(0)
    # sidewalk band: buildings stand back from the road edge (2.2 m on the avenues, 1.6 m on the side streets)
    walk_space = unary_union([r['ln'].buffer(r['w'] / 2 + (2.2 if r['cls'] == 'major' else 1.6), cap_style=2 if (r.get('patch') or r.get('grid')) else 1, join_style=1) for r in car]).intersection(land.buffer(3)).union(road_poly).buffer(0)
    global TRAM_WAYS
    TRAM_WAYS = []; rails = []
    for e in load('rail'):
        tg = e.get('tags', {})
        if e['type'] == 'way' and 'geometry' in e and tg.get('railway') in ('tram', 'rail') and tg.get('service') not in ('yard', 'siding', 'spur'):
            ln = LineString(PL(e['geometry']))
            if ln.length < 2: continue
            (TRAM_WAYS if tg['railway'] == 'tram' else rails).append(ln)
    # the Raml tram (the blue one): OSM has its tracks as disused while the line is being rebuilt; the game keeps it running
    global RAML_WAYS
    RAML_WAYS = []
    for e in load('rail_extra'):
        tg = e.get('tags', {})
        if e['type'] == 'way' and 'geometry' in e and tg.get('railway') == 'disused' and not tg.get('disused:railway') and sum(g['lon'] for g in e['geometry']) / len(e['geometry']) > 29.898:
            ln = LineString(PL(e['geometry'])).intersection(WORLD.buffer(-40))
            if ln.is_empty or ln.geom_type != 'LineString': continue
            if ln.length > 2 and min(y for _, y in ln.coords) > P(29.9, 31.1995)[1]: RAML_WAYS.append(ln); TRAM_WAYS.append(ln)
    log('raml tram ways', len(RAML_WAYS))
    track_poly = unary_union([l.buffer(3.0, cap_style=2) for l in TRAM_WAYS] + [l.buffer(4.0, cap_style=2) for l in rails]).difference(PATCH.buffer(4)).intersection(land).buffer(0) if (TRAM_WAYS or rails) else Polygon()
    walk_space = walk_space.union(track_poly.buffer(1.5))
    log('track corridors km2', round(track_poly.area / 1e6, 3))
    # green
    parks = []
    for e in load('green'):
        if e['type'] == 'way' and 'geometry' in e and len(e['geometry']) > 3:
            t = e.get('tags', {})
            try: g = Polygon(PL(e['geometry'])).buffer(0)
            except Exception: continue
            kind = 'park' if t.get('leisure') in ('park', 'garden', 'playground') or t.get('landuse') in ('grass', 'recreation_ground', 'forest', 'cemetery') else 'pitch' if t.get('leisure') in ('pitch', 'stadium', 'sports_centre') else 'plaza' if t.get('place') == 'square' or t.get('highway') == 'pedestrian' else None
            if kind: parks.append((kind, g))
    park_poly = unary_union([g for k, g in parks if k in ('park', 'pitch')]).difference(PATCH).intersection(land).difference(road_poly).buffer(0) if parks else Polygon()
    log('parks', len(parks))
    # ---------------- buildings ----------------
    blds = []
    for i in range(25):
        for e in load(f'bld{i}'):
            t = e.get('tags', {})
            rings = []
            if e['type'] == 'way' and 'geometry' in e: rings = [PL(e['geometry'])]
            elif e['type'] == 'relation':
                for m in e.get('members', []):
                    if m.get('role') == 'outer' and 'geometry' in m: rings.append(PL(m['geometry']))
            for ring in rings:
                if len(ring) < 4: continue
                try: g = Polygon(ring).buffer(0)
                except Exception: continue
                if g.is_empty or g.area < 6: continue
                lv = None
                for k in ('building:levels', 'levels'):
                    try: lv = float(t[k].split(';')[0]); break
                    except (KeyError, ValueError): pass
                hgt = None
                try: hgt = float(t['height'].split(' ')[0])
                except (KeyError, ValueError): pass
                blds.append({'g': g, 'lv': lv, 'h': hgt, 'id': e['id'], 'tags': t})
    log('buildings raw', len(blds))
    # one building per id/footprint (the tiles overlap)
    seen = set(); B2 = []
    for b in blds:
        k = (b['id'], round(b['g'].centroid.x, 1), round(b['g'].centroid.y, 1))
        if k in seen: continue
        seen.add(k); B2.append(b)
    blds = B2
    # the story's set pieces: each goes into the nearest real block it fits (facing its nearest street), with room cleared
    global SETS_OUT
    SETS_OUT = []
    free_blocks = land.difference(walk_space).difference(PATCH.buffer(4)).buffer(0)
    for rm in REMOTES: free_blocks = free_blocks.difference(rm['rect'].buffer(4))
    for cz in CLEARS: free_blocks = free_blocks.difference(cz)
    for s in CFG.get('sets', []):
        half = math.hypot(s['w'], s['d']) / 2 * .78
        inner = free_blocks.buffer(-half)
        tp = Point(s['x'], s['z'])
        if inner.is_empty: SETS_OUT.append(dict(s)); continue
        from shapely.ops import nearest_points
        q = nearest_points(inner, tp)[0]
        out = {**s, 'x': round(q.x, 1), 'z': round(q.y, 1)}
        SETS_OUT.append(out); CLEARS.append(Point(q.x, q.y).buffer(math.hypot(s['w'], s['d']) / 2 + 2))
        free_blocks = free_blocks.difference(Point(q.x, q.y).buffer(math.hypot(s['w'], s['d']) / 2 + 6))
        log('set', s['k'], 'moved', round(q.distance(tp)), 'm')
    blocked = unary_union([walk_space, PATCH.buffer(1), PATCH_SEA, park_poly.buffer(-0.5) if not park_poly.is_empty else Polygon()] + CLEARS + [rm['rect'].buffer(3) for rm in REMOTES])
    from shapely.strtree import STRtree
    out_b = []
    for b in blds:
        g = b['g']
        if not g.intersects(land) or g.within(blocked): continue
        g = g.difference(blocked).intersection(land)
        if g.is_empty: continue
        for part in (g.geoms if hasattr(g, 'geoms') else [g]):
            if part.geom_type != 'Polygon' or part.area < 14: continue
            part = part.simplify(0.25, preserve_topology=True)
            if part.area < 14 or part.is_empty: continue
            out_b.append({**b, 'g': part})
    log('buildings kept', len(out_b))
    # ---- fill the blocks OSM left empty: a ring of buildings along each block's edge, cut into lots ----
    from shapely import voronoi_polygons, MultiPoint
    bl_union = unary_union([b['g'] for b in out_b]).buffer(0.6) if out_b else Polygon()
    try: prepare_ok = True; from shapely import prepare; prepare(bl_union)
    except Exception: pass
    blocks = land.difference(walk_space).difference(PATCH.buffer(2)).difference(PATCH_SEA)
    for rm in REMOTES: blocks = blocks.difference(rm['rect'].buffer(3))
    if not park_poly.is_empty: blocks = blocks.difference(park_poly.buffer(1))
    if not ped_poly.is_empty: blocks = blocks.difference(ped_poly.buffer(2))
    for cz in CLEARS: blocks = blocks.difference(cz)
    green_no = unary_union([g for k, g in parks if k == 'pitch']) if parks else Polygon()
    if not green_no.is_empty: blocks = blocks.difference(green_no)
    made = 0
    DENSE = {'bahary', 'manshiya', 'attarin', 'karmouz', 'moharram', 'raml'}
    def hood(x, z):
        best = None; bd = 1e18
        for d in CFG['districts']:
            dd = (d['x'] - x) ** 2 + (d['z'] - z) ** 2
            if dd < bd: bd, best = dd, d.get('h')
        return best
    for B in iter_polys(blocks.buffer(0)):
        if B.area < 40: continue
        free = B.difference(bl_union) if not bl_union.is_empty and B.intersects(bl_union) else B
        dense = hood(B.centroid.x, B.centroid.y) in DENSE and B.area < 25000
        if not dense and free.area < 0.25 * B.area and B.area > 400: continue      # OSM already has most of it
        depth = 99 if dense else 13 if B.area > 2200 else 10 if B.area > 800 else 99
        zone = B if depth == 99 else B.difference(B.buffer(-depth))
        zone = zone.intersection(free).buffer(0)
        if zone.is_empty: continue
        # lots: a point every 9-14 m along the edge (inset), Voronoi cells cut the zone
        ring = B.exterior; L = ring.length; pts = []; s = 0
        while s < L:
            q = ring.interpolate(s); pts.append(q); s += random.uniform(7, 12)
        if len(pts) < 2: pts = [B.centroid]
        try: cells = voronoi_polygons(MultiPoint(pts), extend_to=B.buffer(30))
        except Exception: cells = GeometryCollection([B])
        for cell in getattr(cells, 'geoms', [cells]):
            piece = zone.intersection(cell)
            for part in iter_polys(piece):
                part = part.buffer(-0.15).simplify(0.3, preserve_topology=True)
                if part.is_empty or part.area < 12: continue
                for pp in iter_polys(part):
                    if pp.area < 12: continue
                    out_b.append({'g': pp, 'lv': None, 'h': None, 'id': -1, 'tags': {'building': 'yes'}}); made += 1
    log('buildings made to fill blocks', made, 'total', len(out_b))
    # heights: tags, else by district character (old city lower, the corniche and Smouha taller)
    def default_floors(x, z):
        d = dist_to(x, z)
        if d == 'bahary' and random.random() < .15: return random.randint(10, 14)
        base = {'bahary': (4, 10), 'attarin': (4, 8), 'manshiya': (5, 9), 'raml': (6, 11), 'corniche': (10, 16), 'smouha': (9, 16), 'karmouz': (3, 7), 'moharram': (5, 10), 'sidigaber': (7, 13), 'shatby': (6, 12)}.get(d, (4, 8))
        return random.randint(*base)
    # districts (from the frame config)
    DIST = CFG['districts']
    def dist_to(x, z):
        best = None; bd = 1e18
        for d in DIST:
            dd = (d['x'] - x) ** 2 + (d['z'] - z) ** 2
            if dd < bd: bd, best = dd, d['h']
        return best
    for b in out_b:
        c = b['g'].centroid
        if b['h']: h = b['h']
        elif b['lv']: h = b['lv'] * 3.2 + 1
        else: h = default_floors(c.x, c.y) * 3.2 + 1
        t = b['tags']
        if t.get('building') in ('mosque', 'church'): h = max(h, 12)
        if t.get('building') in ('kiosk', 'hut', 'shed', 'garage', 'roof'): h = min(h, 4)
        b['height'] = max(3.5, min(110, h))
        b['style'] = random.randint(0, 5) if t.get('building') not in ('mosque', 'church', 'industrial', 'warehouse') else 6 if t.get('building') in ('mosque', 'church') else 7
        b['dist'] = dist_to(c.x, c.y)
    # ---------------- graph ----------------
    graph = build_graph([r for r in R if r['cls'] != 'ped'])
    log('graph', len(graph['nodes']), 'nodes', len(graph['edges']), 'edges')
    # ---------------- raster (1 m) ----------------
    W = int(X1 - X0); H = int(Z1 - Z0)
    img = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(img)
    def fill(geom, v):
        for p in iter_polys(geom):
            dr.polygon([(x - X0, z - Z0) for x, z in p.exterior.coords], fill=v)
            for hole in p.interiors: dr.polygon([(x - X0, z - Z0) for x, z in hole.coords], fill=0 if v == 2 else 2)
    fill(land, 2); fill(ped_poly.intersection(land) if not ped_poly.is_empty else Polygon(), 4); fill(park_poly, 3); fill(track_poly.difference(road_poly), 4); fill(road_poly, 1)
    for b in out_b:
        v = min(255, 10 + int(round(b['height'] / 0.5)))
        dr.polygon([(x - X0, z - Z0) for x, z in b['g'].exterior.coords], fill=v)
    # the patch is the old game's own: walkable land there (its buildings are its own obstacles), roads as roads
    patch_img = Image.new('L', (W, H), 0)
    px0, pz0, px1, pz1 = CFG['patch']
    dr.rectangle([px0 - X0, pz0 - Z0, px1 - X0, pz1 - Z0], fill=2)
    for x in (-96, -48, 0, 48, 96): dr.rectangle([x - 6 - X0, -96 - 6 - Z0, x + 6 - X0, 144 + 6 - Z0], fill=1)
    for z in (-96, -48, 0, 48, 96, 144): dr.rectangle([-96 - 6 - X0, z - 6 - Z0, 96 + 6 - X0, z + 6 - Z0], fill=1)
    arr = np.array(img)
    # PIL mis-fills where the coastline ring pinches (Stanley bay came out as land): every plain-land pixel is checked against the land itself
    import shapely as _sh
    LP = land.union(PATCH).buffer(1.0); _sh.prepare(LP)
    for r0 in range(0, H, 256):
        ys, xs = np.nonzero(arr[r0:r0 + 256] == 2)
        if not len(xs): continue
        bad = ~_sh.contains_xy(LP, X0 + xs + .5, Z0 + r0 + ys + .5)
        arr[r0 + ys[bad], xs[bad]] = 0
    TS = 256
    for ti in range(0, W, TS):
        for tk in range(0, H, TS):
            tile = arr[tk:tk + TS, ti:ti + TS]
            if tile.max() == 0: continue
            Image.fromarray(tile).save(os.path.join(OUT, 'r', f'{ti // TS}_{tk // TS}.png'), optimize=True)
    log('raster', W, H)
    # ---------------- shopfronts ----------------
    shops, lms = pois(out_b, land, road_poly)
    BAND_OF = {'fish': 1, 'cafe': 2, 'clothes': 3, 'gold': 3, 'food': 10, 'sweets': 4, 'bakery': 4, 'butcher': 10, 'juice': 11, 'pharmacy': 5, 'market': 5, 'phones': 6, 'books': 0, 'barber': 0}
    DW = {'bahary': [(1, 25), (10, 15), (12, 20), (5, 12), (7, 10), (0, 8), (11, 10)], 'manshiya': [(3, 30), (11, 25), (4, 10), (5, 10), (6, 10), (7, 5), (0, 10)],
          'attarin': [(9, 45), (3, 10), (5, 10), (10, 10), (7, 10), (0, 15)], 'raml': [(4, 25), (2, 20), (3, 15), (6, 10), (5, 10), (0, 10), (10, 10)],
          'corniche': [(12, 45), (10, 25), (4, 15), (0, 15)], 'shatby': [(2, 25), (4, 20), (5, 20), (10, 10), (0, 25)],
          'karmouz': [(8, 40), (5, 15), (10, 15), (7, 15), (0, 15)], 'moharram': [(8, 30), (5, 20), (10, 15), (4, 10), (7, 10), (0, 15)],
          'smouha': [(2, 35), (6, 20), (3, 20), (5, 15), (4, 10)], 'sidigaber': [(2, 25), (5, 20), (4, 20), (6, 15), (3, 10), (0, 10)]}
    def wpick(ws):
        r = random.uniform(0, sum(w for _, w in ws))
        for v, w in ws:
            r -= w
            if r <= 0: return v
        return ws[-1][0]
    from shapely.strtree import STRtree as _T
    sp = [Point(s[1], s[2]) for s in shops]; stree = _T(sp) if sp else None
    for b in out_b:
        c = b['g'].centroid; band = None
        if stree is not None:
            j = stree.nearest(c)
            if j is not None and sp[j].distance(c) < 22: band = BAND_OF.get(shops[j][0])
        b['band'] = band if band is not None else wpick(DW.get(b['dist'], [(0, 30), (5, 20), (4, 15), (7, 15), (6, 10), (2, 10)]))
    # ---------------- chunks ----------------
    CH = 128
    chunks = []
    sidewalk = land.difference(road_poly).difference(PATCH)
    for rm in REMOTES: sidewalk = sidewalk.difference(rm['core'])   # the old blocks bring their own pavement
    sidewalk = sidewalk.buffer(0)
    road_vis = road_poly.difference(PATCH.buffer(-0.01)).union(unary_union([r['ln'].buffer(r['w'] / 2, cap_style=2) for r in R if r.get('hw') == 'link'])).buffer(0)
    marks = markings([r for r in R if r['cls'] == 'major' and not r.get('patch')], road_poly)
    from shapely.strtree import STRtree
    btree = STRtree([b['g'] for b in out_b])
    from shapely import prepare
    for g in (road_vis, sidewalk, park_poly, ped_poly, marks, land): 
        try: prepare(g)
        except Exception: pass
    for ci in range(int((X1 - X0) / CH)):
        for ck in range(int((Z1 - Z0) / CH)):
            cx0, cz0 = X0 + ci * CH, Z0 + ck * CH
            cb = box(cx0, cz0, cx0 + CH, cz0 + CH)
            rd = road_vis.intersection(cb); sw = sidewalk.intersection(cb); pk = park_poly.intersection(cb) if not park_poly.is_empty else Polygon()
            pd = ped_poly.intersection(cb).intersection(land) if not ped_poly.is_empty else Polygon()
            mk = marks.intersection(cb) if not marks.is_empty else Polygon()
            kerb = land.boundary.intersection(cb)       # the sea wall
            idx = btree.query(cb)
            bl = []
            for j in idx:
                b = out_b[j]; c = b['g'].centroid
                if cx0 <= c.x < cx0 + CH and cz0 <= c.y < cz0 + CH: bl.append(b)
            if rd.is_empty and sw.is_empty and not bl: continue
            curb = sidewalk.boundary.intersection(cb).difference(land.boundary.buffer(0.3))
            data = pack_chunk(cx0, cz0, rd, sw, pk, pd, mk, kerb, curb, bl)
            name = f'{ci}_{ck}'
            open(os.path.join(OUT, 'c', name + '.bin'), 'wb').write(data)
            chunks.append([ci, ck, len(data)])
    log('chunks', len(chunks), 'total MB', round(sum(c[2] for c in chunks) / 1e6, 2))
    # ---------------- walkers / parked cars ----------------
    walk = walk_rings(sidewalk)
    parked = parked_spots(graph)
    log('walk rings', len(walk), 'parked', len(parked))
    # ---------------- POIs ----------------
    # ---------------- beaches (sand on the land side of the real beaches) ----------------
    beaches = []
    for e in load('beach'):
        rings = [PL(e['geometry'])] if e['type'] == 'way' and 'geometry' in e else [PL(m['geometry']) for m in e.get('members', []) if m.get('role') == 'outer' and 'geometry' in m]
        for ring in rings:
            if len(ring) < 4: continue
            try: g = Polygon(ring).buffer(0).intersection(land).difference(road_poly.buffer(1.5))
            except Exception: continue
            for q in iter_polys(g):
                q = q.simplify(.8)
                if q.area > 60: v, i = tri(q); beaches.append({'v': [[round(x, 1), round(z, 1)] for x, z in v], 'i': i, 'c': [round(q.centroid.x, 1), round(q.centroid.y, 1)], 'a': round(q.area)})
    json.dump(beaches, open(os.path.join(OUT, 'beaches.json'), 'w'), separators=(',', ':'))
    # the tram lines (OSM railway=tram): the blue Raml line (its corridor north-east of Raml station) and the yellow city line; the real stops
    cols = {0: [], 1: []}
    raml_u = unary_union(RAML_WAYS).buffer(1) if RAML_WAYS else Polygon()
    for ln in TRAM_WAYS:
        blue_way = (not raml_u.is_empty) and raml_u.contains(ln)
        for part in (lambda g: g.geoms if hasattr(g, 'geoms') else [g])(ln.difference(PATCH.buffer(4))):
            if part.length < 2: continue
            cols[1 if blue_way else 0].append(part)
    lines = []
    for blue, parts in cols.items():
        if not parts: continue
        m = linemerge(unary_union(parts))
        for g in (m.geoms if hasattr(m, 'geoms') else [m]):
            if g.length > 60: lines.append({'p': [[round(x, 1), round(z, 1)] for x, z in g.simplify(.6).coords], 'L': round(g.length), 'blue': blue})
    stops = []
    for e in load('rail'):
        tg = e.get('tags', {})
        if e['type'] == 'node' and tg.get('railway') == 'tram_stop':
            x, z = PL([{'lat': e['lat'], 'lon': e['lon']}])[0]
            nm = tg.get('name:ar') or tg.get('name') or ''
            if not any(math.hypot(x - s['x'], z - s['z']) < 25 for s in stops): stops.append({'x': round(x, 1), 'z': round(z, 1), 'name': nm})
    json.dump({'lines': lines, 'stops': stops}, open(os.path.join(OUT, 'trams.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    log('tram lines', len(lines), 'km', round(sum(l['L'] for l in lines) / 1000, 1), 'stops', len(stops))
    log('beaches', len(beaches))
    # ---------------- map picture ----------------
    draw_map(land, road_poly, R, park_poly, out_b, W, H)
    index = {'S': S, 'anchor': [LAT0, LON0], 'kx': KX, 'ky': KY, 'x0': X0, 'z0': Z0, 'x1': X1, 'z1': Z1, 'chunk': CH, 'tile': TS,
             'chunks': chunks, 'districts': DIST, 'patch': CFG['patch'], 'landmarks': lms, 'shops': shops, 'anchors': CFG.get('anchors', {}), 'remote': [{k: rm[k] for k in ('name', 'j0', 'j1', 'k0', 'k1', 'dx', 'dz')} for rm in REMOTES], 'sets': SETS_OUT, 'places': snap_places(CFG.get('places', []), arr), 'tiles': sorted(f[:-4] for f in os.listdir(os.path.join(OUT, 'r')) if f.endswith('.png'))}
    json.dump(index, open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(graph, open(os.path.join(OUT, 'graph.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(walk, open(os.path.join(OUT, 'walk.json'), 'w'), separators=(',', ':'))
    json.dump(parked, open(os.path.join(OUT, 'parked.json'), 'w'), separators=(',', ':'))
    log('done')

def snap_places(places, arr):
    # a place's pin goes on the nearest open ground (pavement, a square, a park) within 80 m, not inside its building or the sea
    out = []
    for pl in places:
        x, z = pl['x'], pl['z']; best = None
        for r in range(0, 81, 2):
            for k in range(max(1, r * 3)):
                a = k / max(1, r * 3) * 2 * math.pi; px, pz = int(x + math.sin(a) * r - X0), int(z + math.cos(a) * r - Z0)
                if 0 <= pz < arr.shape[0] and 0 <= px < arr.shape[1] and 2 <= arr[pz, px] < 10: best = (x + math.sin(a) * r, z + math.cos(a) * r); break
            if best: break
        out.append({**pl, 'x': round(best[0], 1), 'z': round(best[1], 1)} if best else pl)
    return out

def iter_polys(g):
    if g is None or g.is_empty: return
    if g.geom_type == 'Polygon': yield g
    elif hasattr(g, 'geoms'):
        for x in g.geoms: yield from iter_polys(x)

def iter_lines(g):
    if g is None or g.is_empty: return
    if g.geom_type in ('LineString', 'LinearRing'): yield g
    elif hasattr(g, 'geoms'):
        for x in g.geoms: yield from iter_lines(x)

def tri(poly):
    """earcut a polygon with holes -> (verts [[x,z]...], idx [...])"""
    rings = [list(poly.exterior.coords)[:-1]] + [list(h.coords)[:-1] for h in poly.interiors]
    rings = [r for r in rings if len(r) >= 3]
    if not rings: return [], []
    verts = np.array([p for r in rings for p in r], dtype=np.float64)
    ends = np.cumsum([len(r) for r in rings]).astype(np.uint32)
    try: idx = earcut.triangulate_float64(verts, ends)
    except Exception: return [], []
    return verts.tolist(), list(map(int, idx))

def tri_area(v, i): return sum(abs((v[i[k+1]][0]-v[i[k]][0])*(v[i[k+2]][1]-v[i[k]][1])-(v[i[k+2]][0]-v[i[k]][0])*(v[i[k+1]][1]-v[i[k]][1]))/2 for k in range(0, len(i), 3))
def tri_ok(p, depth=0):
    if p.is_empty or p.area < .01: return [], []
    v, i = tri(p)
    if i and abs(tri_area(v, i) - p.area) <= max(.5, p.area * .01): return v, i
    try:
        from shapely import constrained_delaunay_triangles
        V = []; I = []; idx = {}
        for tr in constrained_delaunay_triangles(p.buffer(0)).geoms:
            for x, z in list(tr.exterior.coords)[:3]:
                k = (round(x, 2), round(z, 2))
                if k not in idx: idx[k] = len(V); V.append([x, z])
                I.append(idx[k])
        if I and abs(tri_area(V, I) - p.area) <= max(.5, p.area * .02): return V, I
    except Exception: pass
    if depth > 3: return v, i
    x0, z0, x1, z1 = p.bounds; V = []; I = []; st = 16 if depth == 0 else 6
    xs = np.arange(x0, x1 + st, st); zs = np.arange(z0, z1 + st, st)
    for a in xs:
        for b in zs:
            q = p.intersection(box(a, b, a + st, b + st))
            for qq in iter_polys(q):
                vv, ii = tri_ok(qq, depth + 1)
                if ii: base = len(V); V.extend(vv); I.extend([base + k for k in ii])
    return V, I

def pack_mesh(geom, ox, oz):
    for tol in (0.05, 0.3, 0.8, 1.5):
        V = []; I = []; lost = 0.0
        for p in iter_polys(geom):
            p = p.simplify(tol, preserve_topology=True)
            v, i = tri_ok(p)
            if not i: lost += p.area; continue
            b = len(V); V.extend(v); I.extend([b + k for k in i])
        if len(V) <= 65000: break
    if len(V) > 65000: log('MESH TOO BIG', ox, oz, len(V)); V, I = V[:0], []
    if lost > 50: log('mesh lost m2', round(lost), 'at', ox, oz)
    out = struct.pack('<II', len(V), len(I))
    out += np.array([[round((x - ox) * 10), round((z - oz) * 10)] for x, z in V], dtype=np.int16).tobytes() if V else b''
    out += np.array(I, dtype=np.uint16).tobytes() if I else b''
    if len(I) % 2: out += b'\0\0'
    return out

def pack_lines(geom, ox, oz):
    segs = []
    for ln in iter_lines(geom):
        c = list(ln.coords)
        for a, b in zip(c, c[1:]): segs.append((a[0] - ox, a[1] - oz, b[0] - ox, b[1] - oz))
    out = struct.pack('<I', len(segs))
    if segs: out += np.round(np.array(segs) * 10).astype(np.int16).tobytes()
    return out

def pack_chunk(ox, oz, rd, sw, pk, pd, mk, kerb, curb, bl):
    out = b'CITY' + struct.pack('<ff', ox, oz)
    out += pack_mesh(rd, ox, oz) + pack_mesh(sw, ox, oz) + pack_mesh(pk, ox, oz) + pack_mesh(pd, ox, oz) + pack_mesh(mk, ox, oz) + pack_lines(kerb, ox, oz) + pack_lines(curb, ox, oz)
    # buildings: count; each: style u8, dist u8, height u16 (dm), ring n u16, ring xz int16 pairs, roof idx count u16 + idx u16
    out += struct.pack('<I', len(bl))
    for b in bl:
        g = b['g']; ring = list(g.exterior.coords)[:-1]
        if g.exterior.is_ccw: ring = ring[::-1]
        if len(ring) > 400: ring = ring[:400]
        v, i = tri(Polygon(ring))
        out += struct.pack('<BBHH', (b.get('band', 0) << 4) | (b['style'] & 15), DKEYS.get(b['dist'], 0), int(b['height'] * 10), len(ring))
        out += np.array([[round((x - ox) * 10), round((z - oz) * 10)] for x, z in ring], dtype=np.int16).tobytes()
        out += struct.pack('<H', len(i)) + np.array(i, dtype=np.uint16).tobytes()
    return out

DKEYS = {k: i for i, k in enumerate(['', 'bahary', 'manshiya', 'raml', 'corniche', 'smouha', 'karmouz', 'moharram', 'sidigaber', 'shatby', 'attarin'])}

def markings(majors, road_poly):
    """dashed centre lines on the big roads"""
    dashes = []
    for r in majors:
        ln = r['ln']; L = ln.length; s = 2.0
        while s + 3 < L:
            a = ln.interpolate(s); b = ln.interpolate(s + 3)
            dashes.append(LineString([a, b]).buffer(0.12, cap_style=2))
            s += 9
    if not dashes: return Polygon()
    return unary_union(dashes).intersection(road_poly)

def build_graph(R):
    """nodes where roads meet or end; edges = the polyline between them"""
    from collections import defaultdict
    # snap points to a 0.5 m grid so shared OSM nodes meet
    key = lambda p: (round(p[0] * 2), round(p[1] * 2))
    count = defaultdict(int)
    for r in R:
        cs = list(r['ln'].coords)
        for i, p in enumerate(cs): count[key(p)] += 2 if i in (0, len(cs) - 1) else 1
    # crossings with the patch grid / links that don't share OSM points: split by intersection
    nodes = {}; N = []; E = []
    def nid(p):
        k = key(p)
        if k not in nodes: nodes[k] = len(N); N.append([round(p[0], 2), round(p[1], 2)])
        return nodes[k]
    # split every road at points shared with others (count >= 2), plus intersections between patch / link roads and the rest
    extra = defaultdict(list)
    special = [r for r in R if r.get('patch') or r.get('hw') == 'link']
    others = R
    for s in special:
        for o in others:
            if o is s: continue
            x = s['ln'].intersection(o['ln'])
            for pt in (x.geoms if hasattr(x, 'geoms') else [x]):
                if pt.geom_type == 'Point':
                    extra[id(s)].append(pt); extra[id(o)].append(pt); count[key((pt.x, pt.y))] += 2
    for r in R:
        ln = r['ln']
        for pt in extra.get(id(r), []):
            pass
        cs = list(ln.coords)
        # insert the extra split points
        if extra.get(id(r)):
            ds = sorted(set([0.0, ln.length] + [ln.project(p) for p in extra[id(r)]]))
            new = []
            for a, b in zip(ds, ds[1:]):
                if b - a < 0.3: continue
                seg = substring(ln, a, b)
                new.append(list(seg.coords))
            pieces = new
        else: pieces = [cs]
        for cs in pieces:
            cur = [cs[0]]
            for i in range(1, len(cs)):
                cur.append(cs[i])
                if i == len(cs) - 1 or count[key(cs[i])] >= 2:
                    if len(cur) >= 2:
                        a, b = nid(cur[0]), nid(cur[-1])
                        if a != b:
                            seg = LineString(cur).simplify(0.4)
                            E.append({'a': a, 'b': b, 'pts': [[round(x, 2), round(z, 2)] for x, z in seg.coords], 'w': r['w'], 'cls': r['cls'], 'ow': 1 if r['ow'] else 0, 'name': r['name'], 'len': round(seg.length, 1)})
                    cur = [cs[i]]
    deg = defaultdict(int); outs = defaultdict(int); ins = defaultdict(int); two = defaultdict(int)
    for e in E:
        deg[e['a']] += 1; deg[e['b']] += 1
        if e['ow']: outs[e['a']] += 1; ins[e['b']] += 1
        else: two[e['a']] += 1; two[e['b']] += 1
    from shapely.strtree import STRtree
    pts = [Point(x, z) for x, z in N]; tree = STRtree(pts); joined = 0
    for n in range(len(N)):
        if deg[n] != 1: continue
        best = None
        for k in tree.query(pts[n].buffer(3)):
            k = int(k)
            if k == n: continue
            d = pts[n].distance(pts[k])
            if d <= 3 and (best is None or d < best[0]): best = (d, k)
        if best:
            k = best[1]; E.append({'a': n, 'b': k, 'pts': [N[n], N[k]], 'w': 8, 'cls': 'minor', 'ow': 0, 'name': '', 'len': round(best[0], 1)}); joined += 1
    fixed = 0
    for e in E:
        if not e['ow']: continue
        a, b = e['a'], e['b']
        if (ins[a] == 0 and two[a] == 0) or (outs[b] == 0 and two[b] == 0 and deg[b] > 1): e['ow'] = 0; fixed += 1
    log('graph joins', joined, 'one-way made two-way', fixed)
    return {'nodes': N, 'edges': E}

def substring(ln, a, b):
    from shapely.ops import substring as ss
    return ss(ln, a, b)

def walk_rings(sidewalk):
    """people walk around the blocks: each block's outline pulled 1.4 m in from the kerb"""
    out = []
    for p in iter_polys(sidewalk):
        if p.area < 300: continue
        inner = Polygon(p.exterior).buffer(-0.85)   # the side streets have 1.6 m pavements now
        for q in iter_polys(inner):
            r = q.exterior.simplify(0.6)
            L = r.length
            if L < 40 or L > 900: continue
            cs = list(r.coords)
            out.append({'c': [round(q.centroid.x, 1), round(q.centroid.y, 1)], 'p': [[round(x, 1), round(z, 1)] for x, z in cs], 'L': round(L, 1)})
    return out

def parked_spots(graph):
    out = []
    for e in graph['edges']:
        if e['cls'] not in ('minor',) or e['len'] < 30 or e['w'] < 6: continue
        ln = LineString(e['pts']); L = ln.length; s = 12
        while s < L - 12:
            a = ln.interpolate(s); b = ln.interpolate(min(L, s + 1))
            dx, dz = b.x - a.x, b.y - a.y; n = math.hypot(dx, dz) or 1
            nx, nz = dz / n, -dx / n
            for side in (1, -1):
                if random.random() < 0.42:
                    off = e['w'] / 2 - 1.15
                    out.append([round(a.x + nx * off * side, 2), round(a.y + nz * off * side, 2), round(math.atan2(dx, dz) + (0 if side > 0 else math.pi), 3)])
            s += 7.5
    return out

def pois(out_b, land, road_poly):
    shops = []
    TYPE = {'pharmacy': 'pharmacy', 'chemist': 'pharmacy', 'hairdresser': 'barber', 'barber': 'barber', 'juice': 'juice', 'beverages': 'juice', 'mobile_phone': 'phones', 'electronics': 'phones',
            'supermarket': 'market', 'convenience': 'market', 'grocery': 'market', 'bakery': 'bakery', 'clothes': 'clothes', 'shoes': 'clothes', 'fashion': 'clothes', 'butcher': 'butcher', 'seafood': 'fish',
            'jewelry': 'gold', 'confectionery': 'sweets', 'pastry': 'sweets', 'books': 'books', 'cafe': 'cafe', 'restaurant': 'food', 'fast_food': 'food'}
    for e in load('poi'):
        t = e.get('tags', {})
        if e['type'] != 'node': continue
        k = TYPE.get(t.get('shop', '')) or TYPE.get(t.get('amenity', ''))
        if not k: continue
        x, z = P(e['lon'], e['lat'])
        if not (X0 < x < X1 and Z0 < z < Z1) or PATCH.buffer(4).contains(Point(x, z)): continue
        shops.append([k, round(x, 1), round(z, 1), (t.get('name:ar') or t.get('name') or '')[:40]])
    lms = []
    for L in CFG.get('landmarks', []):
        x, z = P(L['lon'], L['lat']); lms.append({**L, 'x': round(x, 1), 'z': round(z, 1)})
    log('shops', len(shops), 'landmarks', len(lms))
    return shops, lms

def draw_map(land, road_poly, R, park_poly, out_b, W, H):
    k = 0.5   # px per metre
    im = Image.new('RGB', (int(W * k), int(H * k)), (14, 35, 51)); d = ImageDraw.Draw(im)
    def poly(g, col):
        for p in iter_polys(g):
            d.polygon([((x - X0) * k, (z - Z0) * k) for x, z in p.exterior.coords], fill=col)
            for h in p.interiors: d.polygon([((x - X0) * k, (z - Z0) * k) for x, z in h.coords], fill=(14, 35, 51))
    poly(land, (27, 31, 36)); poly(park_poly, (31, 53, 38))
    for b in out_b: d.polygon([((x - X0) * k, (z - Z0) * k) for x, z in b['g'].exterior.coords], fill=(44, 49, 56))
    poly(road_poly, (90, 98, 108))
    im.save(os.path.join(OUT, 'map.webp'), quality=82)
    log('map', im.size)

if __name__ == '__main__':
    main()
