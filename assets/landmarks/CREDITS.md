# Landmark models — credits & licences

All landmark geometry in this folder was modelled procedurally in Blender (scripts in
`tools/models/landmarks/scripts/`, git-ignored) unless listed below. No AI 3D generation was used.

## Third-party 3D models

| Used in | Asset | Author | Licence | Source | Changes |
|---|---|---|---|---|---|
| `saad-zaghloul.glb` (the standing figure) | "Dennis Posed 004 - Male Standing Business Model" | renderpeople | CC BY 4.0 | https://sketchfab.com/3d-models/e211ffd52a96416e89c0cc415a388d61 | Decimated 100k → 7.5k faces, original texture removed, recoloured as patinated bronze, scaled to 4.6 m; lower legs and hip area replaced by a modelled long overcoat, straight legs and shoes, one arm pulled in, walking cane and tarboosh (fez) added. |
| `mohamed-ali.glb` (horse and rider) | "Equestrian statue of Napoleon" | norgeotloic | CC BY 4.0 | https://sketchfab.com/3d-models/ad3fe0536f4f40c5a2de5b5649b2e639 | Decimated 68.5k → 11k faces, texture removed, recoloured bronze, bicorne hat removed and replaced by a modelled turban, scaled to 5.5 m, placed on a modelled marble pedestal. |

Required attribution text (CC BY 4.0):
"Dennis Posed 004 - Male Standing Business Model" by renderpeople (https://sketchfab.com/renderpeople), licensed under CC BY 4.0, modified.
"Equestrian statue of Napoleon" by norgeotloic (https://sketchfab.com/norgeotloic), licensed under CC BY 4.0, modified.

## Textures (Poly Haven, CC0 — no attribution required, credited anyway)

| Used in | Texture | Author | Notes |
|---|---|---|---|
| `qaitbay.glb` | Sandstone Blocks 05 — https://polyhaven.com/a/sandstone_blocks_05 | Rob Tuytel | diffuse 2k warm-tinted, normal 1k |
| `qaitbay.glb` | Marble Cliff 03 — https://polyhaven.com/a/marble_cliff_03 | Amal Kumar | diffuse 1k desaturated, normal 1k (rocky spit / sea boulders) |
| `mursi-mosque.glb` | Sandstone Blocks 08 — https://polyhaven.com/a/sandstone_blocks_08 | Rob Tuytel | diffuse 1k tinted cream, normal 1k |
| `unknown-soldier.glb` | White Sandstone Blocks 02 — https://polyhaven.com/a/white_sandstone_blocks_02 | Rob Tuytel | diffuse 1k whitened (marble look), normal 1k |
| `saad-zaghloul.glb` | Granite Tile 03 — https://polyhaven.com/a/granite_tile_03 | Charlotte Baglioni | diffuse 1k tinted Aswan red granite, normal 1k |
| `pompey.glb` | Marble Cliff 03 — https://polyhaven.com/a/marble_cliff_03 | Amal Kumar | diffuse 1k tinted sandy limestone, normal 1k (hill) |
| `roman-theatre.glb` | White Sandstone Blocks 02 — https://polyhaven.com/a/white_sandstone_blocks_02 | Rob Tuytel | marble tiers (whitened diffuse + normal) |
| `roman-theatre.glb`, `raseltin.glb` | Sandstone Blocks 05 — https://polyhaven.com/a/sandstone_blocks_05 | Rob Tuytel | warm-tinted diffuse 1k + normal 512 |

`tram.glb`, `tram-blue.glb`, `raml-station.glb`, `sidigaber-station.glb`, `stadium.glb` and the flat-coloured parts of the other batch-2
models use a generated colour-palette PNG (own work). `cecil.glb` uses flat colours.

Generated textures (own work, procedural, free to use): `bib_granite_letters_1k` (granite wall with carved letters —
glyph shapes rendered from Windows system fonts Arial, Nirmala UI, Microsoft YaHei, Ebrima, Gadugi, Segoe UI Historic),
`bib_roof_512` (library roof panels), `stanley_deck_1k` (road deck with lanes and sidewalks), `brick_red_512`
(Misr station brick), `pompey_granite_512` (Pompey's Pillar granite).

## Map data (layout / footprints)

Footprints and layout (Qaitbay outer & inner walls, keep, coastline; Mursi mosque; Unknown Soldier memorial;
Cecil Hotel; Raml terminus canopy; Bibliotheca Alexandrina disc, pool and planetarium; Stanley Bridge alignment;
Pompey's Pillar site; Kom el-Dikka theatre; Misr station facade line; Sidi Gaber station; Ras el-Tin Palace outline;
Alexandria Stadium stands) traced from OpenStreetMap — © OpenStreetMap contributors, ODbL 1.0
(https://www.openstreetmap.org/copyright). Please keep an "© OpenStreetMap contributors" credit in the game's credits.

## Reference only (not included in any file)

Photos from Wikimedia Commons (categories: Citadel of Qaitbay, Abu el-Abbas el-Mursi Mosque, Ismail Monument
Alexandria, Statue of Saad Zaghloul in Alexandria, Cecil Hotel (Alexandria), Trams in Alexandria, Ramleh Station,
Bibliotheca Alexandrina, Stanley Bridge, Muhammad Ali Pasha statue in Alexandria, Pompey's Pillar, Kom el-Dikka, Alexandria Misr Station, Sidi Gaber, Ras el-Tin Palace)
and Esri World Imagery were used only as visual reference for proportions and colours.
