# Sketchfab props, batch sf3: credits and licences

Sources were downloaded from Sketchfab through a small downloader inside Blender that uses the Blender MCP
add-on's key. Before each download, licence, downloadability and size were checked against the public Sketchfab
API (2026-11-28). Every downloaded model is **CC BY 4.0**. No NC, ND, Editorial or paid licences were used, and no
AI 3D generation was used. The Blender sources are in `tools/models/props/sf3/` and the previews are in
`previews/props/sf3/`.

Conventions for every file:
- Metres. Origin on the ground at the footprint centre. Front = glTF −Z (Blender +Y). Transforms applied.
- Textures are ≤ 512 px (1024 px for the trams and the police box).

Vehicles keep `wheel_FL/FR/RL/RR` as separate nodes with their origin at the hub. The hantour uses `wheel_L` / `wheel_R`.

## Models made from downloaded Sketchfab models (CC BY 4.0)

| File | Original title | Author | Licence | URL | Download | What we changed |
|---|---|---|---|---|---|---|
| `tram-yellow.glb` | Stylized old tram | davihoff | CC BY 4.0 | https://sketchfab.com/models/cb48f890fe6c4459ae884305684f5a17 | usdz 10.7 MB | 267k → 7.7k tris. Body stretched and 7 window bays cloned, giving one 14.8 m car. Second bogie added. Pantograph added. Atlas 1024 px. |
| `tram-blue.glb` | Playground Tram | BizSD | CC BY 4.0 | https://sketchfab.com/models/2a6f78db7ea4403eb0aa5de268126799 | usdz 8.6 MB | Repainted as a blue/cream Raml tram. Window bays cloned to give a 14.2 m car. Added: side panels, glazing, pillars, two bogies and a pantograph. 7.6k tris. |
| `falafel-balls.glb`, `falafel-tray.glb` | Falafel Balls Free | Yitzy | CC BY 4.0 | https://sketchfab.com/models/5b9e2d5cba144ebaa90ae3176915b514 | glb 3.8 MB | 105k → 633 tris, 10 cm. The tray version has 8 copies on a new aluminium tray. |
| `ps2.glb` | Sony PlayStation 2 | Dolgov12 | CC BY 4.0 | https://sketchfab.com/models/b53f858aa1584229a7f906239fc158a2 | usdz 6.3 MB | 54k → 2.9k tris. One 512 px atlas. |
| `football-court.glb` | Football Court | colakart | CC BY 4.0 | https://sketchfab.com/models/9eb1fd3835d14a1a84343cdc36bc0c01 | gltf 1.4 MB | 138k → 9.4k tris. Floodlights and stands decimated. Tiny parts removed. Chain-link fence (alpha), rails and two goals added. |
| `football-goal.glb` (also the goals in the court) | Football Net | bryoka15 | CC BY 4.0 | https://sketchfab.com/models/b4652c82934d4d249ad023e3a0be84ab | gltf 1.4 MB | 72k → 1.1k tris. The original frame was kept. The heavy net was rebuilt as a sagging shell with an alpha-mask net texture. |
| `shop-shelf.glb`, `shop-counter.glb`, `grocery-rack.glb` | Mini market | Pasha. | CC BY 4.0 | https://sketchfab.com/models/3ed806f48c3f4eb2a652d075860dd7cd | gltf 7.8 MB | 1M-face scene split into props. Shelf: the goods were baked to a texture on a 256-tri gondola. Counter: 2.8k tris. Rack: goods baked onto alpha cards, 1.35k tris. |
| `police-box.glb` | Pickup Truck | 00amza | CC BY 4.0 | https://sketchfab.com/models/047615f53e2d45b9a1a2a4dd203d459c | glb 1.7 MB | Roll bar removed. Wheels split. Blue/white police livery (`policebox_paint`). Added: cage box with alpha mesh, light bar and POLICE text. 6.2k tris. |
| `horse.glb`, horse in `hantour.glb` | Horse free download | pgonarg | CC BY 4.0 | https://sketchfab.com/models/9b77bb7542354b10bb7b4c6a25866724 | glb 2.2 MB | 28k → 7.9k tris. Standing pose; the source has no animation. 2.1 m tall. Body 512 JPEG, tail 256 alpha. |
| `petrol-station.glb` | Gas station (OKKO) | S_F_Musashi | CC BY 4.0 | https://sketchfab.com/models/31f3319b46ea402f9915bdf589403dc0 | glb 0.85 MB | Totem and tanker removed. Scaled to 36 m. OKKO branding painted out and recoloured red/white. 2.7k tris. |
| `tetrapod.glb`, `tetrapod-pile.glb` | Tetrapod | akihiko_tarutani | CC BY 4.0 | https://sketchfab.com/models/58cc4e3db5c84bca9ae714b9e116cc04 | gltf 0.36 MB | Single block is 1.5 m tall. The pile is 8 blocks, 3.7k tris. |
| cars in `scrapyard.glb` | Rusty Old Car 3D Model Vintage Vehicle Low Poly | HolyCheese69 | CC BY 4.0 | https://sketchfab.com/models/c68b333f50ee4e89bcd54f8429bc5230 | glb 1.2 MB | Decimated and stacked. Fence, gate, scrap heap and tyres are our own. |
| cars in `scrapyard.glb` | Abandoned Generic Sedan 2 - Game Ready | rashad-brahimli | CC BY 4.0 | https://sketchfab.com/models/db2df46c49f9441286c84c66208ef7ac | usdz 4.5 MB | Decimated. Shares one atlas with the car above. |
| `electric-cabinet.glb` | Old Soviet Transformer Low-Poly | MrUnityCreations | CC BY 4.0 | https://sketchfab.com/models/13124cf4ef264a2eabe79b92679d6d49 | usdz 3.8 MB | Street electrical cabinet, 2 m. Atlas 512. |
| `taxi.glb` | [FREE] VAZ 2107 (from `sf2/lada2107.glb`) | mcflower | CC BY 4.0 | https://sketchfab.com/3d-models/free-vaz-2107-cc7c031cbfe246e98d5e5cfbc6b871a4 | (already local) | Alexandria taxi: black lower body (`taxi_black`), yellow upper body and roof (`taxi_paint`), white TAXI roof sign. |
| `lada-car.glb` | LADA Taxi (from `sf/lada-car.glb`) | abbmo | CC BY 4.0 | https://sketchfab.com/3d-models/lada-taxi-e75073fa0888469b89cb5c9bae48a4ba | (already local) | Face winding fixed per island; about 98 % of the area now faces outward. Wheels fixed too. |
| `police-elantra.glb` | Hyundai Elantra 2022 [ Ultra Low Poly ] (from `sf2/elantra.glb`) | ahmedeyt | CC BY 4.0 | https://sketchfab.com/3d-models/hyundai-elantra-2022-ultra-low-poly-b30d0baf6c3d4ca4adf2f484a90fc861 | (already local) | White/blue police livery (`police_paint`), POLICE text and a red/blue light bar. 8.1k tris. |

Downloaded but not used yet: "Falafel" by zoltanfood (https://sketchfab.com/models/c9a5377c36f54ef2921cd1781f65a648, CC BY, usdz 14.7 MB). It is a 500k-face photogrammetry scan; decimation broke its UVs and the rebuild was not finished, so there is no `falafel-plate.glb`. Also "Horse" by MAXDESIGN (https://sketchfab.com/models/d9af6902210645d995e37ba4319957b6, CC BY, glb 4.3 MB). Its skinned body imports at a broken scale. Total raw download: about 74 MB.

## Built in Blender by us (no third-party assets; textures are procedural)

`kiosk`, `newspaper-stand`, `beach-chair-white`, `beach-chair-blue`, `beach-umbrella`, `beach-cabin`, `beach-cabins-row`,
`corn-grill-cart`, `termis-cart`, `cotton-candy-pole`, `fresca-box`, `bench`, `fruit-veg-cart`, `fishing-boat-eg`,
`goods-wagon`, `footbridge`, `substation`, `bank-facade`, `villa-palace`, `hantour-carriage`, and the carriage part of `hantour`.

## Required attribution text (CC BY 4.0)

"Stylized old tram" by davihoff (https://sketchfab.com/models/cb48f890fe6c4459ae884305684f5a17), licensed under CC BY 4.0, modified.
"Playground Tram" by BizSD (https://sketchfab.com/models/2a6f78db7ea4403eb0aa5de268126799), licensed under CC BY 4.0, modified.
"Falafel Balls Free" by Yitzy (https://sketchfab.com/models/5b9e2d5cba144ebaa90ae3176915b514), licensed under CC BY 4.0, modified.
"Sony PlayStation 2" by Dolgov12 (https://sketchfab.com/models/b53f858aa1584229a7f906239fc158a2), licensed under CC BY 4.0, modified.
"Football Court" by colakart (https://sketchfab.com/models/9eb1fd3835d14a1a84343cdc36bc0c01), licensed under CC BY 4.0, modified.
"Football Net" by bryoka15 (https://sketchfab.com/models/b4652c82934d4d249ad023e3a0be84ab), licensed under CC BY 4.0, modified.
"Mini market" by Pasha. (https://sketchfab.com/models/3ed806f48c3f4eb2a652d075860dd7cd), licensed under CC BY 4.0, modified.
"Pickup Truck" by 00amza (https://sketchfab.com/models/047615f53e2d45b9a1a2a4dd203d459c), licensed under CC BY 4.0, modified.
"Horse free download" by pgonarg (https://sketchfab.com/models/9b77bb7542354b10bb7b4c6a25866724), licensed under CC BY 4.0, modified.
"Gas station (OKKO)" by S_F_Musashi (https://sketchfab.com/models/31f3319b46ea402f9915bdf589403dc0), licensed under CC BY 4.0, modified.
"Tetrapod" by akihiko_tarutani (https://sketchfab.com/models/58cc4e3db5c84bca9ae714b9e116cc04), licensed under CC BY 4.0, modified.
"Rusty Old Car 3D Model Vintage Vehicle Low Poly" by HolyCheese69 (https://sketchfab.com/models/c68b333f50ee4e89bcd54f8429bc5230), licensed under CC BY 4.0, modified.
"Abandoned Generic Sedan 2 - Game Ready" by rashad-brahimli (https://sketchfab.com/models/db2df46c49f9441286c84c66208ef7ac), licensed under CC BY 4.0, modified.
"Old Soviet Transformer Low-Poly" by MrUnityCreations (https://sketchfab.com/models/13124cf4ef264a2eabe79b92679d6d49), licensed under CC BY 4.0, modified.
"[FREE] VAZ 2107" by mcflower (https://sketchfab.com/3d-models/free-vaz-2107-cc7c031cbfe246e98d5e5cfbc6b871a4), licensed under CC BY 4.0, modified.
"LADA Taxi" by abbmo (https://sketchfab.com/3d-models/lada-taxi-e75073fa0888469b89cb5c9bae48a4ba), licensed under CC BY 4.0, modified.
"Hyundai Elantra 2022 [ Ultra Low Poly ]" by ahmedeyt (https://sketchfab.com/3d-models/hyundai-elantra-2022-ultra-low-poly-b30d0baf6c3d4ca4adf2f484a90fc861), licensed under CC BY 4.0, modified.
