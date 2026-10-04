# Thirty-second stages, restored scenery and mountain relief (2026-10-04)

The latest user requests supersede the stage-based population and collection restrictions below. Both islands now run four 30-second stages, travel at 30/60/90 seconds and finish at 120 seconds. Stage medals use proportionally shorter thresholds; menu, HUD, result text, QA fixtures and WebMCP descriptions match. Campaign records use a new 30-second-tour key. The independent four-minute quick challenge is retained.

Restored the complete ordinary scenery catalog, buildings, plants, actors and regional dressing in early areas. Authored stage trails still supply increasingly large themed pickups, but no stage or destination can block collection: physical ball size alone determines eligibility everywhere, including magnets, obstacles and actor yielding. The existing .8 ordinary population pass, physical object sizes, collected IDs and heap retention remain intact.

Mountain amplitudes rise from 250/180 m to 620/420 m on Oʻahu/Lānaʻi, broad hills become taller, and an additional foothill wave creates smaller rises and valleys. Heights stay in physical meters across normalization and rebasing. Desktop and mobile terrain shade the real slopes and tint high peaks with rock colors. Test ridge samples reach approximately 569/408 m; town sampling shows 3.1/7.2 m relief.

Validation: exact stage boundaries, pause/early goals, persistent world/heap, physical-size collection of formerly stage-locked vans, old-record separation, restored early-area counts (1,887/2,012 objects in 49 sampled chunks, including 945/955 larger props), terrain/powers, anchored vertices, navigation, actors, 170-model/island invariants and engagement checks pass. Ordinary-control route simulation completes both 120-second tours. These are deterministic simulation checks, not browser or physical-phone acceptance. Browser QA remains unavailable through the supported preview workflow.

Release uses one production build, identical source on GitHub feature/living-neighborhoods (PR #2) and the existing public Sites project. Bundled Sites workflow helpers remain absent from this cloud image; source is reconciled by authenticated fetch and published through native archive save/deploy. Keep the native terminal receipt at outputs/katamari-30s-terrain-release.json, outside tracked source, to avoid desynchronizing release heads.

Previous history follows.

# Four one-minute stops on the same map (2026-10-04)

The user selected four stages of 60 active seconds each, automatic travel to different places on the same map, increasingly larger objects, and a growing ball with its attachments and collected-map progress retained. This supersedes the seven goal-gated stages and accumulated time bonuses described below. Both island choices use snack market / town square, beach, neighborhood / resort, and highland stops. Travel occurs at 60, 120 and 180 seconds; the run ends at 240 seconds. Early goals earn medals/score bonuses without ending the minute; missing a bonus goal does not skip a stop.

Pickup tiers unlock progressively: snacks/toys up to 0.8 m, beach finds/furniture up to 6 m, neighborhood objects up to 30 m, and all larger objects in the final stage. Authored physical sizes remain fixed. Regional catalogs belong to fixed physical areas, rather than the current stage clock. Each new stop has a 74-slot themed growth trail, accessible starter pickups and larger prizes; clearances persist across normalization/rebase. The same world, seed, collection ledger, compound, power timers and heap carry through travel. Camera/input face the new trail immediately. Ordinary population keeps the 0.8 thinning pass; original model assets and the anchored terrain are reused.

Menu, four stage stamps, per-stage timer, result recap, QA ending/normalization fixtures and WebMCP descriptions match the new run. Local records use a separate four-stage-tour key, so seven-stage scores/times are not mixed with the new mode. The separate quick challenge remains available. The actor regression now samples the neighborhood rather than the new snack-only area, and its visibility assertions reflect the already-shipped 22.8px/1.8x power art.

Validation: four exact timer boundaries, early-goal timing, pause, physical arrival positions, increasing prop sizes, collection/magnet tier gates, map/heap identity, normalization, source-region stability, record separation, navigation, actors, terrain and power behavior pass. Ordinary-control simulation completes all four minutes on both islands; this is not a physical-phone or browser playthrough. Phone visual/performance acceptance remains unverified. Build once from the final source, push the same release commit to GitHub and the public Sites source, and record the native save/deploy receipt locally at outputs/katamari-four-stages-release.json.

Previous release history follows.

# Latest power-up visibility and source synchronization

Power-up art is now 3x larger with a 38 CSS-pixel floor, camera-facing 3D symbols, emissive materials, halos, fading beacons and colored ground rings. The original three powers and physical collection behavior are retained. Read the newest entries in docs/PROJECT_STATE.md and docs/PROGRESS.md; run `node scripts/verify-living-world.mjs` for rendering/cleanup/reduced-motion regression checks alongside the terrain/power checks when changing powers.

The user explicitly requests that every release be pushed to GitHub as well as Sites. Push the same full release commit to GitHub `feature/living-neighborhoods` (review PR #2) and the configured Sites source branch. Include continuation documentation before building/publishing; record the native version/deployment receipt locally rather than adding a later documentation-only commit that desynchronizes those release heads. Preserve the existing public Site identity/audience. Current package/receipt names are `outputs/katamari-neighborhood-v13.tar.gz` and `outputs/katamari-neighborhood-v13-release.json`.

# Latest terrain and power-up continuation

Read the top of docs/PROJECT_STATE.md and docs/PROGRESS.md for the current combined release. Active additions are real rolling hills, grass/sand/beaches, regional map dressing, the first-game HUD reference, and exactly three powers (magnet/turbo/lucky star). Run `node scripts/verify-terrain-powerups.mjs` with the existing actor/navigation/island checks when changing them. Preserve physical-meter terrain/routes, .8 density, original coasts/finite campaigns, and 170 shared-palette models. Regenerate scenery with `blender -b --python scripts/build_map_variety.py` after any base/living-library regeneration. Browser and physical-device acceptance remain pending.

# Latest cloud continuation

The living-neighborhood feature is implemented on `feature/living-neighborhoods`. Read the top of docs/PROJECT_STATE.md and docs/PROGRESS.md for current publication evidence and limitations; the older next-priority list below is historical. Run `node scripts/verify-living-world.mjs` alongside the existing navigation/island invariant checks when changing actors. Run cloud Blender with `blender -b --python scripts/build_living_asset_kit.py` to regenerate only the supplemental models. Preserve the original GLBs, the dedicated `guide` manifest key, the .8 ordinary density pass, deterministic physical-meter routes and actor delay/collection identity. Browser and handset acceptance remain outstanding.

# Continue Katamari Neighborhood

Continue developing the public repository https://github.com/remriel/katamari-neighborhood and its existing public Site, https://katamari-neighborhood.remriel.chatgpt.site/.

Start with the applicable AGENTS.md, docs/PROJECT_STATE.md, docs/PROGRESS.md, docs/ACCEPTANCE.md, git status and git diff. Reconcile those notes with the actual source and newest release. Give an ETA, show progress screenshots, and update the two state documents after meaningful steps. Do not spawn subagents.

The current game has two finite Hawaiian islands: Oʻahu and Lānaʻi. Preserve both seven-stage campaigns, the deterministic 20% population thinning, fixed physical sizes, permanent collected objects, the 32 cm seed, and the bumpy pile. Continue this direction; the Earth-history experiment and endless world are archived.

Every collectible, attached object and rolling character has a Blender-authored 3D model. Keep the all-3D near/far renderer; there is no billboard fallback. The shared catalog contains 132 variants covering all 52 collectible families plus the explorer. Reuse vertex-color materials, geometry, cached models and instanced pages. Generate new production assets through Blender MCP or the applicable image-generation workflow rather than shipping placeholders. Keep the existing triangle budgets. If rebuilding the kit, run scripts/build_toytown_asset_kit.py through Blender MCP and scripts/optimize-toytown.ps1 afterward; it preserves raw source, produces both optimized GLBs and restores attachment-size metadata.

src/navigation.js gives movement a compact envelope and consistent obstacle sliding. The full compound controls floor support and rocking. Never couple navigation radius back to the furthest protrusion, and never let the pickup cadence stop obstacle checks. Rapier is removed; do not restore its startup download without an explicit need and measured benefit. Real 3D bounds support attached-piece ground contact while logical item size controls eligibility and growth.

Visibility is geometric: all readable on-screen objects render. Do not restore a nearest-N cutoff or a small fixed chunk-radius clamp. The camera determines coverage; hidden chunks prepare during idle time and the next two rings preload toward velocity. World coordinates, IDs and roads survive rebasing and normalization. Cache viewport dimensions once per cull; per-object layout reads were costly. Model LODs share one physical pivot/extent. Notifications use one compact top strip.

Next development priorities:

1. Implement the user's living-world request. Replace some existing static props rather than increasing object count, and preserve the 20% reduction in ordinary objects. Add moving 3D cars that stay on the winding roads, people moving through neighborhoods, and animals in yards/parks. Keep actor IDs and motion state stable across chunk loading, camera motion, rescaling, normalization and island changes so nothing pops, teleports or flies around. Reuse existing model families where suitable and add proper Blender-authored 3D models or gait variants where needed; do not ship placeholder geometry.
2. Validate the actors' road/sidewalk/park placement, scale and collision/collection interactions using deterministic simulation checks and a real mobile browser playthrough. Ensure the new motion cannot make the existing oversized-object gates, navigation recovery, visibility coverage or persistent bumpy ball regress.
3. Play both campaigns naturally from start to finish. Tune snack trails, stage distances, time bonuses and objective guidance from observed runs. Favor interesting routes, anticipation and satisfying collections while preserving size gates and an intentional ending.
4. Measure representative Android/iPhone hardware, including sustained runs, thermal load and battery behavior. Desktop mobile-viewport measurements are useful evidence, not handset benchmarks. Use F3 / ?performance and preserve raw CPU/GPU, frame, draw-call, triangle and chunk-timing evidence.
5. Use measured handset bottlenecks to guide rendering work. The pile already changes geometry by fixed-size family with shared pivots, persistent slots and cached render pages. Preserve this behavior and verify retained/rendered piece counts through each quality change. Improve scenery on the existing two islands; add another island only when the user asks.

Before a release, exercise the meaningful invariants in scripts/verify-navigation.mjs and scripts/verify-island-invariants.mjs, real control/normalization fixtures in accept-movement-browser.js, both island endings in accept-endings-browser.js, and boost/growth visibility tracing in trace-hawaii-visibility.js. Read the browser-script comments and keep the benchmark browser isolated; close only your own test contexts. Large-scale QA fixtures inject scale for coverage and do not prove natural campaign pacing. The QA API exists only in Vite DEV builds.

Use the existing Sites identity in .openai/hosting.json: appgprj_6abd4eabb1fc8191b880958dde997a86. Preserve public access. Follow the user's build-once-publish workflow: perform requested checks before the one production build, fix blockers, publish the successful output immediately, and stop after handoff. Keep credentials in memory/stdin only. Synchronize finished source and release documentation to GitHub. Return the live URL, screenshots, honest evidence boundaries, PROGRESS.md and PROJECT_STATE.md.
