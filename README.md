# Cover Studio — GTA VI-style cover art maker

An offline web app that turns your own photos and a caption into a multi-panel GTA-VI-style poster
cover and exports it as a PNG. Plain static files: open `app/index.html`, no network, no build step.
Pan and zoom each photo in its panel, pick a 2/3/4-panel collage, choose a Vice Sunset / Neon Night /
Miami Pink / Noir grade, write the title and tagline, then export at 1080×1080 or 1080×1350.

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Teguhhardian12/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Teguhhardian12/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty — $250 in USDC shared by the top 50
entries. Entry in the open at [make.fun](https://make.fun).

## Run it

```
node serve.ts                      # serves app/ at http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # writes the dossier
node tools/shoot.mjs               # regenerates screenshots/
```

## What is in here

| Path | What it is |
|---|---|
| `app/` | the app: `index.html`, `styles`, ES modules for layout, grading, painting and the editor |
| `screenshots/` | three captures of the finished app (`1-cover.jpg` is the cover) |
| `shots.json` | the screenshot recipes (`?shot=` scenes) |
| `tools/shoot.mjs` | headless-Chrome screenshot runner |
| `main.ts` | copies `app/` and `screenshots/` to the output and writes `dossier.json` |
| `vendor/` | make.fun's dossier library, unmodified |

Licence: MIT (see `LICENSE`).
