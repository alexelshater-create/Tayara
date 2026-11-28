# Street people, stage 18: credits, licences and rigs

All models below were downloaded from Sketchfab through the Blender MCP Sketchfab integration and
reworked in Blender. The sources are kept in `tools/models/people/<name>.blend` and the previews in `previews/people/`.
Every model is licensed **CC BY 4.0**. Licence and downloadability were re-checked against the public Sketchfab API
on 2026-11-28. No AI 3D generation was used, and no animations are included.

Conventions for every file:
- Metres, feet at y = 0, facing glTF −Z (Blender +Y), origin under the hips, transforms applied.
- Height is between 1.65 and 1.85 m. Each model has at most 15k triangles.
- All of each model's materials were merged into ONE 512 px atlas material, and all of its meshes into ONE mesh
  called `body`, so each person is a single draw call.

## Rig list

| File | Rigged? | Skeleton / bone naming | Pose | Tris | Height |
|---|---|---|---|---|---|
| `casual-man-polo.glb` | yes, skinned | Mixamo: 67 bones renamed `mixamorig:Hips`, `mixamorig:Spine` … (Sketchfab had stripped the prefix and added `_NN` suffixes), plus one extra root bone `GLTF_created_0_rootJoint` above `mixamorig:Hips`. Armature node `casual_man_polo_rig`. | A-pose | 12 296 | 1.85 m |
| `young-man-jacket.glb` | yes, skinned | Same Mixamo rig (67 `mixamorig:*` bones plus `GLTF_created_0_rootJoint`), armature `young_man_jacket_rig` | A-pose | 14 537 | 1.85 m |
| `man-galabeya.glb` | yes, skinned | Same Mixamo rig (67 `mixamorig:*` bones plus `GLTF_created_0_rootJoint`), armature `man_galabeya_rig` | A-pose | 14 543 | 1.83 m |
| `old-man-cap.glb` | yes, skinned | Mixamo: 65 `mixamorig:*` bones (the `_NN` suffixes removed) plus a `_rootJoint` root, armature `old_man_cap_rig` | T-pose | 12 132 | 1.70 m |
| `woman-hijab-abaya.glb` | no (static mesh) | — | T-pose | 14 532 | 1.65 m |
| `woman-hijab-suit.glb` | no (static mesh) | — | arms down | 14 550 | 1.65 m |
| `woman-headscarf-dress.glb` | no (static mesh) | — | arms down | 11 605 | 1.65 m |
| `teen-girl-hijab.glb` | no (static mesh) | — | T-pose | 9 981 | 1.65 m |

On the Mixamo rigs, the extra root joint sits at the origin and carries a 180° turn around Y. That turn makes
the character face −Z: Mixamo's own characters face +Z. `mixamorig:Hips` and everything below it keep their original
rest pose, so Mixamo clips that target `mixamorig:*` names should play under that root and also face −Z.
Retargeting and clip playback have **not** been tested in the game.

## Credits

| File | Original title | Author | Licence | URL | What we changed |
|---|---|---|---|---|---|
| `casual-man-polo.glb` | Casual Man -RIGGED- | NABEEL619 | CC BY 4.0 | https://sketchfab.com/3d-models/casual-man-rigged-304bad7d4e9b4addacb68c83e1a322cb | Turned to −Z, bones renamed to `mixamorig:*`, 9 materials merged into one 512 px atlas, meshes joined, normal and metal/roughness maps dropped. |
| `young-man-jacket.glb` | Cool Man _Rigged_ Free. | NABEEL619 | CC BY 4.0 | https://sketchfab.com/3d-models/cool-man--rigged--free-0b8c511a920b43208d38948e054efcc8 | Scaled to 1.85 m, decimated 15.4k → 14.5k, bones renamed, 9 materials merged into an alpha-masked 512 atlas, so the glasses lenses are now opaque dark. |
| `man-galabeya.glb` | arab man | yossif | CC BY 4.0 | https://sketchfab.com/3d-models/arab-man-4351f8dd5b894d2592aaf66df2b40870 | White galabeya and skullcap. Decimated 25.8k → 14.5k, bones renamed, 8 materials merged into one atlas. |
| `old-man-cap.glb` | Old Village Grandpa - Stylized Character | atomizr | CC BY 4.0 | https://sketchfab.com/3d-models/old-village-grandpa-stylized-character-c36bbe5b39364afc95a75ed6d9517e28 | Scaled to 1.70 m, bone suffixes removed, texture 1024 → 512, normal map dropped. |
| `woman-hijab-abaya.glb` | hijab muslim woman | Yasser.Hamedah | CC BY 4.0 | https://sketchfab.com/3d-models/hijab-muslim-woman-6f4d486e45464220beeda01fb6e495a5 | Turned to −Z, 1.54 → 1.65 m, decimated 37.7k → 14.5k, 14 materials merged into one 512 atlas (128 px per part). |
| `woman-hijab-suit.glb` | Female with hijab | hoyensze | CC BY 4.0 | https://sketchfab.com/3d-models/female-with-hijab-8fdcb1978bec43efa18f27ec64ae5b2e | Turned to −Z, 1.65 m, decimated 59.4k → 14.6k, texture 1024 → 512. |
| `woman-headscarf-dress.glb` | Malay lady with hijab | norhafizah | CC BY 4.0 | https://sketchfab.com/3d-models/malay-lady-with-hijab-37c6e4506a9f4de0a5fb887d073689f4 | Turned to −Z, 1.65 m, texture → 512. |
| `teen-girl-hijab.glb` | Anak SMA Hijab | trisutrisno | CC BY 4.0 | https://sketchfab.com/3d-models/anak-sma-hijab-e9213e921c6a4f29b144b9bb58af25fe | Turned to −Z, 1.65 m, texture 1024 → 512. School uniform with a white headscarf, used as the teenager. |

## Required attribution text (CC BY 4.0)

"Casual Man -RIGGED-" by NABEEL619 (https://sketchfab.com/3d-models/casual-man-rigged-304bad7d4e9b4addacb68c83e1a322cb), licensed under CC BY 4.0, modified.
"Cool Man _Rigged_ Free." by NABEEL619 (https://sketchfab.com/3d-models/cool-man--rigged--free-0b8c511a920b43208d38948e054efcc8), licensed under CC BY 4.0, modified.
"arab man" by yossif (https://sketchfab.com/3d-models/arab-man-4351f8dd5b894d2592aaf66df2b40870), licensed under CC BY 4.0, modified.
"Old Village Grandpa - Stylized Character" by atomizr (https://sketchfab.com/3d-models/old-village-grandpa-stylized-character-c36bbe5b39364afc95a75ed6d9517e28), licensed under CC BY 4.0, modified.
"hijab muslim woman" by Yasser.Hamedah (https://sketchfab.com/3d-models/hijab-muslim-woman-6f4d486e45464220beeda01fb6e495a5), licensed under CC BY 4.0, modified.
"Female with hijab" by hoyensze (https://sketchfab.com/3d-models/female-with-hijab-8fdcb1978bec43efa18f27ec64ae5b2e), licensed under CC BY 4.0, modified.
"Malay lady with hijab" by norhafizah (https://sketchfab.com/3d-models/malay-lady-with-hijab-37c6e4506a9f4de0a5fb887d073689f4), licensed under CC BY 4.0, modified.
"Anak SMA Hijab" by trisutrisno (https://sketchfab.com/3d-models/anak-sma-hijab-e9213e921c6a4f29b144b9bb58af25fe), licensed under CC BY 4.0, modified.

## Police officers (batch sf3, 2026-11-28)

| File | Based on | Author | Licence | URL | What we changed |
|---|---|---|---|---|---|
| `police-white.glb` | Casual Man -RIGGED- (`casual-man-polo.glb`) | NABEEL619 | CC BY 4.0 | https://sketchfab.com/3d-models/casual-man-rigged-304bad7d4e9b4addacb68c83e1a322cb | Egyptian summer uniform. Shirt and trousers repainted white, shoes black. Added and skinned to the Head/Shoulder/Hips bones: peaked cap (white crown, black band and visor, gold badge), black epaulettes with two gold stars, black belt with buckle. Same Mixamo skeleton, A-pose, 12.6k tris, one 512 px atlas. |
| `police-black.glb` | same | NABEEL619 | CC BY 4.0 | same | Winter uniform. All-black shirt and trousers, black beret with gold badge, navy epaulettes with gold stars, belt. 12.6k tris, one 512 px atlas. |
