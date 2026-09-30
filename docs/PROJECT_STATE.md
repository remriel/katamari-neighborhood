# Eon Roll project state

## Objective and architecture
Finite mobile-first Earth-history campaign, six independent era modules under src/eon/eras. Vite + Three.js + DOM shell at src/eon/main.js; Rapier compound physical contact in organism era. CampaignController owns seed/build/ledger/ancestry; SaveStore uses IndexedDB current/checkpoint/profile with localStorage fallback. Stable collected IDs reject duplicate rewards. Local scale exponents avoid extreme world coordinates. Earlier layers retain records and can be reconstructed by the archive inspector.

## Product decisions
Matter: magnetic recipes. Cells: membrane/resource management. Organisms: habitat adaptations and predators. Villages: connected buildings/resources/transport. Civilizations: cooperative regional network and launch. Planets: velocity matching/orbital capture/stabilization. Five adaptation choices carry ranks through chapters. First run is curated; replay uses two authored variants per era. Final chapter ends and unlocks replay/chapter selection. Local recovery preserves collection history.

## Assets
Six generated actor sheets plus six native 1254px ground textures saved in art/eon with exact prompts. scripts/eon/prepare-art.py extracts complete alpha components, associates detached details, and orders dominant silhouettes when an artwork subject crosses a nominal grid cell. Never crop at atlas cell boundaries. scripts/eon/sculpt-glbs.py authors 54 textured silhouette-volume GLBs and editable Blender files. public/eon/manifest.json is the runtime catalog. These are sculpted textured artwork volumes, not fully modeled characters with skeletal animation. Six soundscapes use synthesized audio.

## Preservation and publication
Unfinished V5 is preserved in commit 25d4c57, pushed on archive/katamari-v5-compound-island. Same Site appgprj_6abd4eabb1fc8191b880958dde997a86; public https://katamari-neighborhood.remriel.chatgpt.site; private GitHub https://github.com/remriel/katamari-neighborhood. Latest user demands publication promptly. No subagents. build-once-publish controls release: one production build, only repair blockers, no gameplay/browser/performance tests.

## Constraints and proof boundaries
30–45 minute pacing remains a design target, not measured. Mobile frame rate, complete playthrough balance, asset appearance in a running build and save restoration through a real browser have not been observed. The ending has a camera pullback and individually reconstructable body layers; a continuous six-layer cinematic cutaway remains a presentation limitation. Do not claim these as verified. Terrain UVs are fixed in world coordinates; collection transforms persist without object replacement. Windows publish uses Git bin PATH, TAR_OPTIONS=--force-local, credentials only in stdin/memory.

## RESUME HERE
All era mechanics, assets, renderer, mobile/keyboard input, adaptations, journal/layer inspector, recovery, saves, replay and chapter select are authored. Run production build once, fix only blockers, package/push/save/deploy same public Site, sync GitHub, record terminal deployment evidence. Manual gameplay acceptance follows user-selected workflow. Do not add tests or repeated visual audits.
