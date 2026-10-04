# Size checkpoint race and island-clearing finale (2026-10-04)

The latest user selected 100 → 200 → 300 → 400 m checkpoints and a race to grow as fast as possible. Stage travel happens immediately on reaching each physical size, retaining the same island, seed, attachments, collection ledger, powers and elapsed clock. There is no campaign deadline or timed stage advancement. At 400 m a fifth island-sweep stage unlocks. Reaching 400 m does not win: the player must grow enough to collect the 2,200 m island pickup (2,376 m eligibility under the ordinary 1.08 rule). Only that actual pickup completes the run. Paused time is excluded, the HUD counts upward, and fastest island-clear times use a new record key with fractional seconds and five stage splits. The separate four-minute quick challenge is retained.

Pacing: the opening snack sweep remains intact, followed by a 140-object trail spanning the small-to-landmark growth bands. Middle stops have 24 growth pickups with greater spacing; the finale has 96 giant pickups, with eight large final reserves. Objects retain physical sizes. Baseline movement speed is increased by exactly 10%. Power-up chunk eligibility falls from 30% to 21% (a 30% reduction); power durations/effects and regular .8 scenery density are retained. Full early scenery and actual rolling terrain remain intact.

The final island target is created only when its stage unlocks, in physical coordinates, and persists through rebase/rescale. It does not act as an oversized obstacle or suppress ordinary scenery; its model becomes visible once eligible, while its marker provides final guidance. This avoids blocking the opening or making the finale unplayable.

Validation: checkpoint boundaries below/at thresholds, continuous/pause-safe time, world and heap retention, normal collection across regions, mass availability, actual island pickup and terminal victory, record separation, fractional fastest finish, navigation, actors, terrain/powers, anchored vertices and 170-model/island invariants pass. Ordinary-control simulation completes both full island-clear races for seed 123456 (about 72.27 s Oʻahu, 82.23 s Lānaʻi). Twenty island/seed combinations have enough authored finale mass; minimum potential diameter is approximately 2,412 m. These tests demonstrate possibility, not human difficulty or phone performance. Browser and physical-phone acceptance remain unverified.

Release uses one production build and the same commit on GitHub feature/living-neighborhoods (PR #2) and the existing public Sites source. Bundled Sites workflow helpers remain absent from this environment; source is reconciled through authenticated fetch, followed by native archive save/deploy. Store the terminal receipt locally at outputs/katamari-island-race-release.json to preserve identical release heads.

Previous history follows.

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

# Mobile ground anchoring fix (2026-10-04)

Removed the flat mobile fallback plane that followed the ball beneath the real surface. Terrain vertices now use simulation surfaceHeight on a world-anchored power-of-two grid; shared heights are cached as the patch streams. The lightweight mobile texture shader and latest HUD/depth fixes are retained. Both islands pass anchoring and terrain/power regression checks. Production build passes; physical-phone visual acceptance remains unverified.

Publish the same release commit to GitHub feature/living-neighborhoods and the existing public Sites project. Record the native receipt locally in outputs/katamari-ground-anchoring-release.json; keep these tracked notes in the release commit.

# Power-up visibility

- [x] Enlarge all three power models to 3x their previous art scale.
- [x] Keep a 38 CSS-pixel minimum through zoom/growth and camera-facing symbols.
- [x] Add emissive models, soft halos, fading beacons and colored ground rings.
- [x] Include effects in culling, collection/reset cleanup and reduced-motion behavior.
- [x] Verify real meshes, actor streaming, power behavior, navigation and both island endings.
- [x] Compile/render the glow shaders offline and inspect the power-up preview.

Release source must be identical on GitHub and Sites, per the user's latest instruction. Publication uses the single production build and `outputs/katamari-neighborhood-v13.tar.gz`; native terminal status, exact commit and version/deployment IDs are recorded in the local `outputs/katamari-neighborhood-v13-release.json` receipt. This lets tracked release notes travel with the same commit as the deployed code. Browser/mobile acceptance remains unverified; the offline preview uses approximate model lighting.

Previous checkpoints follow below.

# Terrain, beaches, variety, HUD and three powers

- [x] Replace grass and add sand artwork with smaller mobile texture payloads.
- [x] Build beaches with surf/wet sand and 3D coastal collectibles.
- [x] Add distinct market/garden/highland scenery on both islands without increasing population.
- [x] Implement real up/down hill rolling, camera/prop elevation and slope effects.
- [x] Restyle HUD around the first-game reference.
- [x] Implement exactly three powers: magnet, turbo, lucky star.
- [x] Verify terrain/powers, actors, navigation, finite campaigns, 170 models and density.
- [x] Compile/render terrain offline and inspect Blender scenery preview.
- [x] Build, package, push exact source and publish public Sites version 12.
- [x] Update GitHub review PR #2 and release evidence.

Public Sites version 12 deployed successfully at 2026-10-03 21:59 PDT / 2026-10-04T04:59:02.951104+00:00. Live: https://katamari-neighborhood.remriel.chatgpt.site. Exact built/pushed source: `b6ee4f3122c5403660c82bac0a0f218cf2b93fff`. Saved version: `appgprj_6abd4eabb1fc8191b880958dde997a86~appgver_a768d1ca8e38819183d5ef982748be2e`. Deployment: `appgdep_6ac1dd069f60819190db38036470280a`, terminal status `succeeded`. Vite transformed 25 modules in one 1.39s production build; the 655.12 kB JS chunk warning is nonfatal.

Local package `outputs/katamari-neighborhood-v12.tar.gz`: 77 files, 5,221,833 compressed bytes, SHA256 `908abe5ca1bb2ae87185509c8128a368f107a24f90f199fc22cdc5271863d956`. Sites normalized tar: 7,823,360 bytes, SHA256 `4b5d9f01759451531f9a53205ed2d5d1a2a95e433430125056173dcbd9f70e67`, artifact `file_000000004dcc81f4850b9f267a8c9f8c`. Review PR #2: https://github.com/remriel/katamari-neighborhood/pull/2, updated to the full living-islands/terrain/power scope, open and unmerged. This release documentation follow-up leaves built game source unchanged.

Browser/mobile gameplay acceptance remains unverified; the linked original UI page is blocked by the cloud proxy. See PROJECT_STATE.md for precise evidence boundaries.

Previous checkpoints follow below.

# Living neighborhoods — cloud update

- [x] Reconcile cloud checkout, GitHub main, and public Sites version 10.
- [x] Replace surviving props with moving cars, neighbors, cats, dogs, and chickens while preserving .8 population thinning.
- [x] Create seven supplemental Blender meshes and editable source; inspect asset preview.
- [x] Verify actor routes, yielding, collection, pile retention, streaming and normalization.
- [x] Verify navigation recovery, both finite campaigns, and all 139 model meshes.
- [x] Compare 392 chunks / 13,693 slots to V10: counts and non-actor placements preserved.
- [x] Build, package, push exact source, and publish public Sites version 11.
- [x] Push GitHub branch and open review PR #2; record release evidence.

Release: public Sites version 11 deployed successfully on 2026-10-03 at 21:31 PDT (2026-10-04T04:31:07.848047+00:00). Live: https://katamari-neighborhood.remriel.chatgpt.site. Exact built/pushed source: `3863a0d2d0574bb6986675dbb497b8fcfba533eb`. Saved version: `appgprj_6abd4eabb1fc8191b880958dde997a86~appgver_552ec1112f388191a534d7bfc2ec9e4a`. Deployment: `appgdep_6ac1d67c2c008191971e9f52abff08cc`, terminal status `succeeded`. One Vite production build transformed 21 modules in 1.36 seconds; the 647.06 kB main JS chunk warning remains.

Local package `outputs/katamari-neighborhood-v11.tar.gz`: 75 files, 5,407,627 compressed bytes, SHA256 `4a9d1bf76305375e6ff496e16b6bee4916f738ef795825202a77291c95202076`. Sites stores its normalized tar as 7,598,080 bytes, SHA256 `a7398bb3049b3b36d99a3167abe6c724880431d44c3393ba4e822612b95e4dcf`, artifact `file_0000000032cc8210880204f54ccf0b2f`. GitHub review PR #2: https://github.com/remriel/katamari-neighborhood/pull/2, branch `feature/living-neighborhoods`, open and unmerged. This documentation follow-up changes no built game source and does not require a second build or deployment.

Browser/mobile QA is unavailable in this cloud runtime. Physical-device performance and natural campaign pacing remain unverified. The prior build-once restriction belongs to the completed V10 release; this follow-up performed meaningful checks before its production build.

Previous checkpoints follow below.

# Katamari Neighborhood — V10 release complete

Objective: publish the completed Oʻahu/Lānaʻi all-3D game state to Sites, package the production output, push it to GitHub, and merge before further development.
Progress: [##########] 100% for this release checkpoint. Sites version 10 is public, its exact production archive is recorded below, and GitHub PR #1 has been merged into main.

- [x] Reconcile the intended checkout, public Sites project, and GitHub main branch.
- [x] Complete both 3D island worlds, the 20% ordinary-object reduction, visibility/loading fixes, movement recovery, persistent bumpy pile, and finite progression.
- [x] Show existing mobile screenshots of the island picker and Lānaʻi play.
- [x] Run the single production build: 20 modules, 1.65 s.
- [x] Push exact source commit dc1358ddd39cbac71ad988610afad8b3a29f9be0 to the configured Sites branch and package it: 74 files, 7,383,040 bytes, SHA256 47dd2fb400da7d86ef02e3cbcaecfbf3d44f9ee27276548514df96cbcb7b748b.
- [x] Save and successfully deploy public Sites version 10 at https://katamari-neighborhood.remriel.chatgpt.site.
- [x] Push the GitHub release branch, merge PR #1 into main, and sync the merge to the checkout.
- [x] Record exact Site, package, deployment, PR, and merge evidence in PROJECT_STATE.md.

Site saved version: appgprj_6abd4eabb1fc8191b880958dde997a86~appgver_46cd20045cbc819194aa288b223952ea (10). Deployment appgdep_6ac1b5122fc08191a3316e76db957b92 succeeded at 2026-10-04 02:08:26 UTC (2026-10-03 19:08 PDT). GitHub PR: https://github.com/remriel/katamari-neighborhood/pull/1. Merge commit: f7b29a412e3d53ca426f3f8c24b5cdc4bbd13806. The build warned that the main JavaScript chunk is 642.58 kB; it did not fail. No test suite or browser checks were run after publication.

Next requested development: add moving 3D cars on roads, people in neighborhoods, and animals. Replace some existing props so the world retains its 20% population reduction. Keep these as new development work after this release; preserve both finite Hawaiian islands and the established all-3D rendering and stable-world rules.


The sections below describe the completed version 9 release.

- [x] Inspect the complete active repository and reconcile V8 baseline, source, and archived directions.
- [x] Create a Blender MCP library with 79 variants across 31 existing gameplay types, shared vertex colors, GLB and editable Blender source.
- [x] Integrate cached GLB models, instanced world/attachment rendering, billboard LOD and bottom-centered pivots.
- [x] Keep predictive chunk warming, spatial visibility queries, adaptive DPR and shared fake shadows.
- [x] Add F3 / ?performance HUD with FPS, frame/CPU/GPU times, DPR, draw calls, triangles, visible objects, chunks, models and retained pieces.
- [x] Run initial local browser checks at 1280 x 720 and 390 x 844; loader reported all 79 models, and warmed samples reached 60 FPS.
- [x] Implement the latest 20% regular-population reduction and reduce the visible ceiling from 650 to 520; preserve surviving IDs/positions and authored objectives.
- [x] Run the required production build once, push exact source, and package its output: 19 modules, 2.19 seconds.
- [x] Save Sites version 9, publish publicly and confirm terminal succeeded status.
- [x] Synchronize finished source to public GitHub; release notes are included in the handoff documentation commit.

Current implementation: production model assets exist. The initial diorama was rendered, then the source preview placements/lighting were corrected. The interrupted rebuild's Blender job handle is missing and the corrected preview render is unverified. No physical-phone benchmark, complete campaign playthrough, fast-movement pop-in proof, or final late-scale art review exists. Street categories absent from the current gameplay catalog (truck, mailbox, sign, trash can, hydrant) and more authored clustering remain unfinished in the broad brief.

Current blockers: none for the published current-state release. The full goal stays active because the outstanding broad requirements above are not proven. The user's latest build-once-publish invocation ends further polish/validation in this release turn.

Release: source b296457b6fcde6f6e1cbf8263cd235c963fd82d2; saved version appgprj_6abd4eabb1fc8191b880958dde997a86~appgver_019b68f6f9c48191b2e401803da0378b (9); deployment appgdep_6ac06f77362c81918771f508c7842b4a succeeded 2026-10-03 02:59:11 UTC / 2026-10-02 19:59 PDT. Live: https://katamari-neighborhood.remriel.chatgpt.site. Archive outputs/katamari-toy-town-density.tar.gz: 60 files, 11,386,880 bytes, SHA256 5e8ee330218c654a3e55ed806a4a6d2ec295c99e2b6bb0b047c253eaaffb471b. Warnings: main JS 632.24 kB and physics JS 4,336.63 kB minified; neither blocked the build.

Exact ordered next steps: 1. User manually accepts or reports defects in version 9. 2. When authorized to resume the broad art brief, address the recorded missing art/composition requirements and complete late-scale, fast-motion and phone evidence. 3. Build and publish that later code state under the user's selected workflow. This release turn stops after the handoff; no post-publication browser test or second build was run.

## Previous completed release history

- [x] Reconcile live V4, source, preserved compound draft and course change.
- [x] Preserve Eon prototype on archive/eon-roll-prototype and restore Katamari as active source.
- [x] Retain every object in the assembly and render all instances with rigid local transforms.
- [x] Add Rapier compound contact, protrusion-driven bumps/traction and pickup attachment motion.
- [x] Connect seven finite chapters, target guidance, combo/dash rewards, final heap inspection and personal bests.
- [x] Production build passed once (14 modules, 2.03 s).
- [x] Exact source pushed to Sites and public GitHub, packaged and saved as version 6.
- [x] Public deployment succeeded; release evidence recorded and manual acceptance handed to user.
- [x] Diagnose and fix runaway early growth, map zoom jump and same-frame progression/freeze; publish version 7.
- [x] Batch visible ground objects by artwork and share shadow geometry/material.
- [x] Refresh visibility about 10 times per second and query nearby spatial chunks.
- [x] Add velocity-prioritized idle chunk preloading and adaptive device pixel ratio.
- [x] Run one production build (15 modules, 2.25 s); it passed.
- [x] Push the exact source, package and save Site version 8.
- [x] Deploy publicly and confirm native succeeded status.
- [x] Record release details and sync notes to GitHub.

State: optimization version 8 is live. Verification: source inspection, one production build, exact-SHA push, required archive identity check, saved version and native deployment success. No automated tests, browser/gameplay checks or frame-rate benchmarks under build-once-publish. Expected frame-rate and pop-in improvements are unmeasured; startup still downloads the large Rapier chunk.

Release source: 492decac940a79f5c2a85f023c9db98620c97a86.
Saved version: appgprj_6abd4eabb1fc8191b880958dde997a86~appgver_919901ed3afc8191b89984b23e567ae2 (7).
Deployment: appgdep_6abed6e520ac81919332ea5c8ccaef62, succeeded 2026-10-01 21:55:56 UTC / 14:55 Pacific.
Live: https://katamari-neighborhood.remriel.chatgpt.site.
Archive: outputs/katamari-growth-fix.tar.gz; SHA256 f5deb97b9601123027b3458660d70f992ac339587b91e7018745e6ea5afd4e09.

Release source: e5d85b7bb3acd71d2149f0105fdb4248ec7e5afa.
Saved Site version: appgprj_6abd4eabb1fc8191b880958dde997a86~appgver_dadceca0ac948191a4ff24bc6253b16c (8).
Deployment: appgdep_6ac01ba5e0208191b85f1b1519bdc4be succeeded 2026-10-02 21:01:40 UTC / 14:01 PDT.
Live: https://katamari-neighborhood.remriel.chatgpt.site
Archive: outputs/katamari-render-optimized.tar.gz; SHA256 11fe9b3d6dda0eda7483a832ea28c7d8fd1143627341035c0d7de3c8a0916309.

The active objective and current ordered next steps are at the top of this document.
