# Sketchfab props, stage 18 (street cars, trees): credits and licences

All models below were downloaded from Sketchfab through the Blender MCP Sketchfab integration and
reworked in Blender. The sources are kept in `tools/models/props/<name>.blend` and the previews in `previews/props/`.
Every model is licensed **CC BY 4.0**. Licence, downloadability and author were re-checked against the public
Sketchfab API on 2026-11-28. No AI 3D generation was used.

Conventions for every file: metres, origin on the ground at the footprint centre (trees: at the trunk base),
front = glTF −Z (Blender +Y), transforms applied, textures ≤ 512 px.

**Vehicles:** the wheels are separate nodes with their origin at the hub. Spin them around their local X axis.
- Cars and the microbus use `wheel_FL / wheel_FR / wheel_RL / wheel_RR`. FL is −X, front.
- The motorcycle and the bicycle use `wheel_F / wheel_R`.

**Tinting:** the paint material is called `<name>_paint`. To tint it, multiply `material.color`.
- On `lanos`, `elantra` and `microbus` the paint is a flat colour.
- On `corolla`, `lada2107` and `sunny` the paint keeps its texture: the paint pixels were made neutral grey, so a
  multiply tint works. The default colour sits in `baseColorFactor`.
- On `corolla`, some window, light and trim pixels are inside paint faces, so they take a slight tint too.

**Trees and the hedge:** the leaves use alpha-mask (`alphaMode: MASK`) cards and are double-sided.

| File | Original title | Author | Licence | URL | What we changed |
|---|---|---|---|---|---|
| `lanos.glb` | low-poly Daewoo Lanos | DU1701 | CC BY 4.0 | https://sketchfab.com/3d-models/low-poly-daewoo-lanos-537cf27c1f354cd79c4d990759d2da4c | Front turned to −Z, 4.24 m. Interior, trim and wheels decimated (26.3k → 7.8k tris). Wheels split into `wheel_FL/FR/RL/RR`. Flat colours merged into one palette texture, glass darkened. Blue paint replaced by a tintable silver `lanos_paint`. |
| `corolla.glb` | Toyota Corolla 1994 | abdelrahmanbesso82 | CC BY 4.0 | https://sketchfab.com/3d-models/toyota-corolla-1994-9840ed86df66467d9666c3574bd17b27 | 4.30 m. Wheels cut out of the single mesh into `wheel_FL/FR/RL/RR`. Texture 1024 → 512 (JPEG). Body faces split into `corolla_mat` and the tintable silver `corolla_paint`. |
| `elantra.glb` | Hyundai Elantra 2022 [ Ultra Low Poly ] | ahmedeyt | CC BY 4.0 | https://sketchfab.com/3d-models/hyundai-elantra-2022-ultra-low-poly-b30d0baf6c3d4ca4adf2f484a90fc861 | 4.675 m. Decimated 20.4k → 8.2k. Wheels split. Palette texture. Lime DRL colour changed to white. Blue paint changed to the tintable silver `elantra_paint`. |
| `lada2107.glb` | [FREE] VAZ 2107 | mcflower | CC BY 4.0 | https://sketchfab.com/3d-models/free-vaz-2107-cc7c031cbfe246e98d5e5cfbc6b871a4 | 4.13 m. Drift animation dropped. Wheels split. Atlas 1024 → 512 with the beige paint made neutral; beige is kept as the `lada2107_paint` factor. The four small textured materials (lights, grille, glass, mirrors) became one palette, with white headlights and red tail lights. |
| `sunny.glb` | Nissan Pulsar/Sunny N13 (PS 1 Low-poly) | aleko2144 | CC BY 4.0 | https://sketchfab.com/3d-models/nissan-pulsarsunny-n13-ps-1-low-poly-bcc1e3520b7548b6bcbd84f9839f8c9e | 4.15 m. Showroom floor and baked shadow quad removed. Wheels split. Red paint made neutral and tintable (`sunny_paint`, red by default). Windows darkened. Russian number plate blanked. |
| `microbus.glb` | Low Poly 2013 Toyota HiAce | Alvin.Woodly | CC BY 4.0 | https://sketchfab.com/3d-models/low-poly-2013-toyota-hiace-f83b4ed4d8534efb81def77b6c1b642d | Turned so the front faces −Z, 4.70 m. Two rear side windows cut into the panel-van body on both sides, so it reads as a passenger microbus. Chrome, badges and wheels decimated (17.9k → 11.8k). Wheels split. Palette texture. White tintable `microbus_paint`. |
| `motorcycle.glb` | Simson S51 low-poly | mostar15 | CC BY 4.0 | https://sketchfab.com/3d-models/simson-s51-low-poly-e477933771784117987856150be2e973 | Front turned to −Z, 1.89 m. Both wheels (tyre, rim and spokes) cut out into `wheel_F` / `wheel_R`, origin at the axle. Texture kept at 512 (JPEG). |
| `bicycle.glb` | Low-Poly Vintage Bicycle Model | wasabicats | CC BY 4.0 | https://sketchfab.com/3d-models/low-poly-vintage-bicycle-model-5297f7525763435c8ef2e97fd3a6d30d | 1.80 m. Wheels and spoke cards joined into `wheel_F` / `wheel_R`. Frame materials merged into one palette texture. Spoke texture 512 → 256, alpha-masked. |
| `ficus-tree.glb` | Low Poly Tree | calp1 | CC BY 4.0 | https://sketchfab.com/3d-models/low-poly-tree-731fb33ce41f4c95824b30e128a13490 | Used as the Alexandria street ficus (Indian laurel), 9.7 m. About 32 % of the leaf cards kept and enlarged ×1.45 (10.8k → 3.8k tris). Trunk decimated. Leaves tinted dark green and alpha-blend changed to alpha-mask. Normal map dropped. Textures ≤ 512. |
| `mediterranean-tree.glb` | Low poly green tree | markuzo | CC BY 4.0 | https://sketchfab.com/3d-models/low-poly-green-tree-f1f439b9cb8a46a697299413558bd3f3 | 7.5 m. About 55 % of the leaf cards kept and enlarged ×1.25 (6.5k → 3.9k). Leaves tinted olive green and alpha-masked. Normal map dropped. Textures ≤ 512. |
| `hedge-bush.glb` | Bush | 7thFlare | CC BY 4.0 | https://sketchfab.com/3d-models/bush-6f1920d84d5445f9857da7ba8238fd38 | 3.0 × 1.4 × 1.2 m hedge segment, long side along X. Texture 1024 → 512, alpha-masked. |
| `date-palm.glb` | Palm Tree Realistic | 00amza | CC BY 4.0 | https://sketchfab.com/3d-models/palm-tree-realistic-ced3b31f14f940d0b7480a83e6f8c9c0 | 7.2 m, origin at the trunk base. Material rebuilt as alpha-mask. Texture 1024 → 512. |

## Required attribution text (CC BY 4.0)

"low-poly Daewoo Lanos" by DU1701 (https://sketchfab.com/3d-models/low-poly-daewoo-lanos-537cf27c1f354cd79c4d990759d2da4c), licensed under CC BY 4.0, modified.
"Toyota Corolla 1994" by abdelrahmanbesso82 (https://sketchfab.com/3d-models/toyota-corolla-1994-9840ed86df66467d9666c3574bd17b27), licensed under CC BY 4.0, modified.
"Hyundai Elantra 2022 [ Ultra Low Poly ]" by ahmedeyt (https://sketchfab.com/3d-models/hyundai-elantra-2022-ultra-low-poly-b30d0baf6c3d4ca4adf2f484a90fc861), licensed under CC BY 4.0, modified.
"[FREE] VAZ 2107" by mcflower (https://sketchfab.com/3d-models/free-vaz-2107-cc7c031cbfe246e98d5e5cfbc6b871a4), licensed under CC BY 4.0, modified.
"Nissan Pulsar/Sunny N13 (PS 1 Low-poly)" by aleko2144 (https://sketchfab.com/3d-models/nissan-pulsarsunny-n13-ps-1-low-poly-bcc1e3520b7548b6bcbd84f9839f8c9e), licensed under CC BY 4.0, modified.
"Low Poly 2013 Toyota HiAce" by Alvin.Woodly (https://sketchfab.com/3d-models/low-poly-2013-toyota-hiace-f83b4ed4d8534efb81def77b6c1b642d), licensed under CC BY 4.0, modified.
"Simson S51 low-poly" by mostar15 (https://sketchfab.com/3d-models/simson-s51-low-poly-e477933771784117987856150be2e973), licensed under CC BY 4.0, modified.
"Low-Poly Vintage Bicycle Model" by wasabicats (https://sketchfab.com/3d-models/low-poly-vintage-bicycle-model-5297f7525763435c8ef2e97fd3a6d30d), licensed under CC BY 4.0, modified.
"Low Poly Tree" by calp1 (https://sketchfab.com/3d-models/low-poly-tree-731fb33ce41f4c95824b30e128a13490), licensed under CC BY 4.0, modified.
"Low poly green tree" by markuzo (https://sketchfab.com/3d-models/low-poly-green-tree-f1f439b9cb8a46a697299413558bd3f3), licensed under CC BY 4.0, modified.
"Bush" by 7thFlare (https://sketchfab.com/3d-models/bush-6f1920d84d5445f9857da7ba8238fd38), licensed under CC BY 4.0, modified.
"Palm Tree Realistic" by 00amza (https://sketchfab.com/3d-models/palm-tree-realistic-ced3b31f14f940d0b7480a83e6f8c9c0), licensed under CC BY 4.0, modified.
