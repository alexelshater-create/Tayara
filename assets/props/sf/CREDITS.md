# Sketchfab props — credits & licences

All models below were downloaded from Sketchfab through the Blender MCP Sketchfab integration and
reworked in Blender (sources kept in `tools/models/props/<name>.blend`, previews in `previews/props/`).
Every one is licensed **CC BY 4.0** (licence and downloadability re-checked against the public
Sketchfab API on 2026-11-27). No AI 3D generation was used.

Conventions for every file: metres, origin on the ground at the footprint centre, front = glTF −Z
(Blender +Y), transforms applied, textures ≤ 512 px. Wheels are separate nodes with their origin at
the hub (spin them around their local X axis).

| File | Original title | Author | Licence | URL | What we changed |
|---|---|---|---|---|---|
| `lada-taxi.glb` | LADA Taxi | abbmo | CC BY 4.0 | https://sketchfab.com/3d-models/lada-taxi-e75073fa0888469b89cb5c9bae48a4ba | Rescaled to a real Lada (4.14 m), ground plane removed, front turned to −Z, grille decimated (2.4k → 0.3k), repainted as an Alexandria taxi (black lower body, yellow roof/pillars/upper body above the belt line, cut cleanly at 0.90 m), new white/black roof sign, wheels split into `wheel_FL/FR/RL/RR`, all flat-colour materials merged into one 16 px palette texture. |
| `lada-car.glb` | LADA Taxi | abbmo | CC BY 4.0 | https://sketchfab.com/3d-models/lada-taxi-e75073fa0888469b89cb5c9bae48a4ba | Same as the taxi but no roof sign; the whole paint is a separate material `lada_paint` (neutral beige-grey) so the game can tint private cars. |
| `cat.glb` | Cat by Sumpitueslag | Professor_E12 | CC BY 4.0 | https://sketchfab.com/3d-models/cat-by-sumpitueslag-93ea9cf8b1ea4f74ad5ee47447f336f1 | Armature removed (rest pose, static prop), turned to face −Z, 0.60 m nose-to-tail, three materials merged into one 512 px atlas (alpha-masked tail fur cards kept), specular map dropped. |
| `vendor-stall.glb` | Medieval Market Stall | AspectStudio | CC BY 4.0 | https://sketchfab.com/3d-models/medieval-market-stall-b5d87398b87a4e7ab8959da2c6a47056 | Barrel and the ragged medieval cloth (12k faces) removed; new clean sloped awning with a scalloped front valance in Egyptian red/yellow/blue/green/cream stripes; fruit crates and fruit decimated; scaled ×1.4 (2.35 m tall); all textures merged into one 512 px atlas, normal maps dropped. 21.7k → 2.5k triangles. |
| `old-tv.glb` | Grandma's TV | atskaheart | CC BY 4.0 | https://sketchfab.com/3d-models/grandmas-tv-b2310e7e18dc4c11b5758804cfcc7dab | Kept one screen (channel 1); the other 7 alternative screens, the transparent glass and the shadow decal removed; scaled ×1.9 (TV on its table 1.14 m tall). |
| `butane-cylinder.glb` | Old and Rusted Gas Cylinder | Jorge.Franco.Pena | CC BY 4.0 | https://sketchfab.com/3d-models/old-and-rusted-gas-cylinder-323acfb4bef44aa9983dad0debb23016 | One of the three cylinders kept, decimated 57k → 1.5k triangles, 0.60 m tall, body + valve merged into one 512 px atlas, normal/metal maps dropped. |
| `old-car-saratoga.glb` | Low Poly Car - Chrysler Saratoga 1960 | roh3d | CC BY 4.0 | https://sketchfab.com/3d-models/low-poly-car-chrysler-saratoga-1960-3fa89e6bf78b49aab111af4195efb6fe | Turned to face −Z, 5.50 m long, decimated 17.7k → 5.8k, wheels split into `wheel_FL/FR/RL/RR`, body/tyre/glass merged into one 512 px atlas (glass made opaque dark), 4096 px textures dropped. |
| `banknote-200egp.glb` | Egyptian pound | AYMAN_777 | CC BY 4.0 | https://sketchfab.com/3d-models/egyptian-pound-7794a41ba0e3461c874ca40044dbe4ba | Laid flat (front side up), 0.17 m long, front/back/edge merged into one 512 px atlas. |
| `cigarette.glb` | cigarette - smoke on | kamiaraskaridesign | CC BY 4.0 | https://sketchfab.com/3d-models/cigarette-smoke-on-952f2a35aa444e2f8e7a093b9c806686 | Lit end turned to −Z, 8.5 cm long, textures 1024 → 256 px, extra UV map removed. |
| `tuktuk.glb` | Autorikshaw - Indian Tuk Tuk | bhagathartworks | CC BY 4.0 | https://sketchfab.com/3d-models/autorikshaw-indian-tuk-tuk-5775d012693741008acff9dad410e92d | Recoloured as an Egyptian tuk-tuk (green body → deep red, yellow canopy → black), alpha removed, textures 1024 → 512/256 px, wheels split into `wheel_F`, `wheel_RL`, `wheel_RR`. |
| `peugeot-504-break.glb` | Peugeot 504 break | medraphc | CC BY 4.0 | https://sketchfab.com/3d-models/peugeot-504-break-71831821ad8a4884b78b5996e6039fc5 | Turned to face −Z, 4.80 m, steering wheel/rims/trim decimated (9.7k → 6.3k), wheels split into `wheel_FL/FR/RL/RR`, flat colours merged into a palette texture, glass darkened, paint is a separate tintable material `peugeot504_paint` (cream white, the classic Egyptian "Peugeot 7-seater"). |
| `vespa.glb` | Low Poly Vespa | 1artemiys1 | CC BY 4.0 | https://sketchfab.com/3d-models/low-poly-vespa-0de38b3ee68e4202a983c09eb05444af | 1.75 m, wheels split into `wheel_F` / `wheel_R` (origin on the axle), 20 materials merged into one palette texture. |
| `satellite-dish.glb` | Rusty House Satellite Dish | TomasKiniulis | CC BY 4.0 | https://sketchfab.com/3d-models/rusty-house-satellite-dish-929f056abe02416da19d7b1aa805d235 | Scaled to a 0.9 m dish, texture 2048 → 512 px (normal/metal maps dropped). Wall-mount prop: wall plane at z = 0, dish faces −Z, origin at the bottom. |
| `ac-unit.glb` | Air Conditioner Outdoor Unit | pertdoherty | CC BY 4.0 | https://sketchfab.com/3d-models/air-conditioner-outdoor-unit-940781484cb64c6db6c615473bee996a | Turned so the fan faces −Z, ×1.3 (0.78 m wide), texture 2048 → 512 px. Wall-mount prop: wall plane at z = 0, origin at the bottom of the brackets. |
| `water-tanks.glb` | Overhead Water tank | ar.jethin | CC BY 4.0 | https://sketchfab.com/3d-models/overhead-water-tank-1745c92e50b441c6bf6588e11cdba538 | Scaled to 1000 L rooftop tanks (1.1 m × 1.25 m), split into `tank_white` and `tank_black` (each with its own base-centre origin), texture 4096 → 512 px. |
| `palm-trees.glb` | Realistic Palm Tree Low Poly | hamzaunity3d | CC BY 4.0 | https://sketchfab.com/3d-models/realistic-palm-tree-low-poly-dc894acc16544bc69630e9a5232cf74c | Two of the five palms kept (`palm_a` 9.5 m, `palm_b` 7.8 m, origin at the trunk base), unlit material replaced by a lit alpha-masked one, texture 2048×1024 → 512×256. |
| `fishing-boat.glb` | Fishing Boat | yorre.detavernier | CC BY 4.0 | https://sketchfab.com/3d-models/fishing-boat-91aa32c513874d368f84eda14095068e | Pink trim/seats recoloured Alexandria (Anfoushi) blue, 4.50 m × 1.90 m, bow to −Z, texture 2048 → 512 px. |
| `foul-cart.glb` | STREET FOOD VENDORS CART | ajith009 | CC BY 4.0 | https://sketchfab.com/3d-models/street-food-vendors-cart-d835c7a31e504efc8877d03278ed42a7 | Indian snack-poster texture removed; repainted as an Egyptian foul cart (yellow body with green base, red canopy, steel counter, dark-green poles), modelled copper foul pot («قدرة») added on the counter, serving side turned to −Z, materials merged into one palette texture. |
| `street-lamp.glb` | Old Lamp Post (Free!) | StarTrekGuy | CC BY 4.0 | https://sketchfab.com/3d-models/old-lamp-post-free-0bc8eed63f654ed2adef2825d793f8d4 | 4.0 m, transparent glass replaced by an opaque warm emissive `lamp_glass` (separate node `lantern_glass` so the game can switch it on at night), post re-materialled as black iron. |

## Required attribution text (CC BY 4.0)

"LADA Taxi" by abbmo (https://sketchfab.com/3d-models/lada-taxi-e75073fa0888469b89cb5c9bae48a4ba), licensed under CC BY 4.0, modified.
"Cat by Sumpitueslag" by Professor_E12 (https://sketchfab.com/3d-models/cat-by-sumpitueslag-93ea9cf8b1ea4f74ad5ee47447f336f1), licensed under CC BY 4.0, modified.
"Medieval Market Stall" by AspectStudio (https://sketchfab.com/3d-models/medieval-market-stall-b5d87398b87a4e7ab8959da2c6a47056), licensed under CC BY 4.0, modified.
"Grandma's TV" by atskaheart (https://sketchfab.com/3d-models/grandmas-tv-b2310e7e18dc4c11b5758804cfcc7dab), licensed under CC BY 4.0, modified.
"Old and Rusted Gas Cylinder" by Jorge.Franco.Pena (https://sketchfab.com/3d-models/old-and-rusted-gas-cylinder-323acfb4bef44aa9983dad0debb23016), licensed under CC BY 4.0, modified.
"Low Poly Car - Chrysler Saratoga 1960" by roh3d (https://sketchfab.com/3d-models/low-poly-car-chrysler-saratoga-1960-3fa89e6bf78b49aab111af4195efb6fe), licensed under CC BY 4.0, modified.
"Egyptian pound" by AYMAN_777 (https://sketchfab.com/3d-models/egyptian-pound-7794a41ba0e3461c874ca40044dbe4ba), licensed under CC BY 4.0, modified.
"cigarette - smoke on" by kamiaraskaridesign (https://sketchfab.com/3d-models/cigarette-smoke-on-952f2a35aa444e2f8e7a093b9c806686), licensed under CC BY 4.0, modified.
"Autorikshaw - Indian Tuk Tuk" by bhagathartworks (https://sketchfab.com/3d-models/autorikshaw-indian-tuk-tuk-5775d012693741008acff9dad410e92d), licensed under CC BY 4.0, modified.
"Peugeot 504 break" by medraphc (https://sketchfab.com/3d-models/peugeot-504-break-71831821ad8a4884b78b5996e6039fc5), licensed under CC BY 4.0, modified.
"Low Poly Vespa" by 1artemiys1 (https://sketchfab.com/3d-models/low-poly-vespa-0de38b3ee68e4202a983c09eb05444af), licensed under CC BY 4.0, modified.
"Rusty House Satellite Dish" by TomasKiniulis (https://sketchfab.com/3d-models/rusty-house-satellite-dish-929f056abe02416da19d7b1aa805d235), licensed under CC BY 4.0, modified.
"Air Conditioner Outdoor Unit" by pertdoherty (https://sketchfab.com/3d-models/air-conditioner-outdoor-unit-940781484cb64c6db6c615473bee996a), licensed under CC BY 4.0, modified.
"Overhead Water tank" by ar.jethin (https://sketchfab.com/3d-models/overhead-water-tank-1745c92e50b441c6bf6588e11cdba538), licensed under CC BY 4.0, modified.
"Realistic Palm Tree Low Poly" by hamzaunity3d (https://sketchfab.com/3d-models/realistic-palm-tree-low-poly-dc894acc16544bc69630e9a5232cf74c), licensed under CC BY 4.0, modified.
"Fishing Boat" by yorre.detavernier (https://sketchfab.com/3d-models/fishing-boat-91aa32c513874d368f84eda14095068e), licensed under CC BY 4.0, modified.
"STREET FOOD VENDORS CART" by ajith009 (https://sketchfab.com/3d-models/street-food-vendors-cart-d835c7a31e504efc8877d03278ed42a7), licensed under CC BY 4.0, modified.
"Old Lamp Post (Free!)" by StarTrekGuy (https://sketchfab.com/3d-models/old-lamp-post-free-0bc8eed63f654ed2adef2825d793f8d4), licensed under CC BY 4.0, modified.
