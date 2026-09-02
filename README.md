# LUPA Atlas｜Lunar Soil Particle Morphology Database

Moon soil particle morphology database for browsing the real STL meshes stored in
`dataset/`. The web viewer uses compact meshes derived from those source files so
the static site remains practical to load.

## Function

- Browse 20 real particle meshes by category and file number
- Interactive 3D viewer: rotate, zoom, clip, and switch between surface, point cloud, and wireframe modes
- Trace every browser record back to its source STL filename
- Inspect the dataset's category and file composition
- Responsive layout for desktop and mobile devices

## Run Locally

```bash
npm install
npm run dev
```

## GitHub Pages

<https://wanglingxin-hit.github.io/lunar-regolith-atlas/>

## Data explanation

The 20 ASCII STL files in `dataset/` are the current source of truth. Filename
prefixes are indexed as follows: `JJW` (胶结物), `BLZ` (玻璃珠), `YX` (岩屑),
and `DKW` (单矿物).

The site does not currently infer particle dimensions or morphology descriptors
from the meshes. The previous demonstration IDs, shape parameters, classifier
scores, and synthetic statistics have been removed.

Browser assets in `public/models/` are normalized, lightweight derivatives used
only for visualization; the source STL files are unchanged. If source models are
updated, regenerate previews with:

```bash
python3 tools/build_mesh_assets.py
```

## TODO

- Connect an authoritative parameter table when it becomes available
- Add verified morphology and classification analysis

## Aknowledgements
- The basic evaluation procedure originates from LUPA: Lunar Regolith Particle Analyzer.
https://github.com/Catsup0059/LUPA-Lunar-Regolith-Particle-Analyzer
