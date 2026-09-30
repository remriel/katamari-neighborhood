# Katamari Neighborhood project state

## Product and release rules
Public, mobile-first independent Katamari-inspired fan game with original artwork. One continuous procedural neighborhood, endless rolling/growth by default, optional four-minute 6 m challenge. No backend, login, or copied original game assets.
User requested build-once-publish: one production build per code state, fix only shipping blockers, publish, stop. No tests/browser QA unless requested. No subagents. Games are exempt from the user's app/website brutalist design rule.

## Architecture
- Vite static output in dist/. Sites manifest: .openai/hosting.json.
- src/simulation.js owns seeded procedural blocks, pickup eligibility, stepped circle collisions, growth, timer, milestones, and readable size units. No render state in game rules.
- CHUNK_SIZE=18 local meters; a fresh roll gets a new seed. Chunk coordinates and scale determine each block's district/objects. Active grid is limited to 81 blocks; collected history is limited to 384 blocks. Very remote evicted areas may replenish when revisited.
- Growth normalizes local diameter below 8 by dividing positions, sizes, velocities, and volume while increasing the logical scale exponent. The entire visible population survives scale changes; nearby retention fills up to 4096 slots while visible items are never dropped for that limit. Eight growth guards protect retained scene regions from replacement spawns; skipped slots persist in the bounded block ledger. BigInt origin coordinates and chunk-aligned rebasing prevent precision loss. Simulation returns transforms for camera, attachments, and effects.
- src/main.js renders Three.js cutout sprites, a lit generated-texture sphere, up to 48 exterior attachments, DOM HUD, touch/keyboard input, dash, camera rotation, opt-in notes, auto-pause, and context-loss handling. Streamed view removal disposes materials/shadow geometry. Visibility budget is 650 nearby projected objects.
- src/terrain.js renders winding roads and curved diagonal branches over detailed meadow/paving. Terrain is anchored to logical world coordinates, independently of camera-following carrier geometry and object chunks. originPhase/pow2mod calculate exact bounded phases from BigInt origin/scale; five fixed road scales and two grass-detail scales blend with zoom without moving their paths. Native textures: 1254 x 1254, mipmaps, anisotropy up to 8, device DPR up to 3.
- Attached cutouts are offset beyond the sphere by their full half-diagonal; entire underside objects hide before intersecting ground. Adaptive camera depth and portrait framing avoid sphere/frustum clipping as size increases.
- Feature-detected browser tools read status and start a fresh roll through the same UI actions. Unsupported browsers continue normally; WebMCP runtime validation has not been performed.

## Assets and expensive discoveries
- V2 animated road spacing/texture size back toward fixed values after each growth normalization, making the background expand/slide. Never animate those coordinates. V3 computes immutable logical-world phases, winding road fields, and zoom-based detail blends instead. The extra constant 6-unit camera padding also caused another zoom after normalization; padding now scales with the logical world.
- V2 discarded nearby objects beyond the closest 512 and generated an entire fresh chunk layer during growth. V3 retains every visible object and blocks new spawns throughout the retained region. This addresses the user's report of objects flying/resetting as the ball grows. Preserve object IDs, local positions, scales, and camera transforms together.
- User reported random cropped object fragments. Original art/props-source.png places some sprites across nominal grid boundaries. Equal-cell atlas slicing caused fragments and missing parts. Never return to grid cropping.
- scripts/process-assets.py extracts complete connected alpha silhouettes, assigns detached nearby details, sorts row-major, and adds transparent gutters before WebP conversion. public/assets/props-metadata.json records actual source bounds. Original artwork and exact prompts remain in art/.
- Generated grass/paving textures are retained at native resolution. Requested 2048px generation returned 1254px images; increased local repeat density, not upscaling, supplies the sharp terrain detail.
- Windows npm shim fails under the shared installer. Dependencies are installed. Build through direct Node/Vite arguments if needed; don't modify shared Sites helpers.
- Windows packaging must use Git Bash: prepend C:\Program Files\Git\bin to the workflow process PATH, set TAR_OPTIONS=--force-local, and give a forward-slash absolute Windows archive path. Empty commands reuse a successful build on packaging-only retries.
- The Sites plugin cache directory disappeared during v2 work. Native Sites tools remain available. Temporary ../site-publish-fallback.mjs performs the same direct build, credential-in-stdin source push, exact-SHA confirmation, BSD-tar static packaging, and required archive identity check. Reuse the normal bundled helper when it is available again; never store credentials in source or command arguments.

## Hosting and backup
Project: appgprj_6abd4eabb1fc8191b880958dde997a86. Audience: public.
URL: https://katamari-neighborhood.remriel.chatgpt.site
Private source backup: https://github.com/remriel/katamari-neighborhood
Opening state for this edit: commit 3dc1b8259303419bbe852a4a890609e318cd9335. Preserve the Site identity. Credentials stay in session memory/stdin only.

## Proof boundary / RESUME HERE
V3 authorized: stop moving background and objects at generation/growth, replace grid with winding roads. Implementation complete. Run one production build, push/package the exact state with the existing fallback publisher, save/deploy publicly, confirm native terminal success, record release, and sync GitHub. No tests/browser QA requested; continue build-once-publish. V2 remains live until the new deployment completes.
