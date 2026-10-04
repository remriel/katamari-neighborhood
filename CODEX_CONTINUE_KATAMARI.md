# Continue Katamari Neighborhood

Continue developing the private repository https://github.com/remriel/katamari-neighborhood and its existing public Site, https://katamari-neighborhood.remriel.chatgpt.site/.

Start with the applicable AGENTS.md, docs/PROJECT_STATE.md, docs/PROGRESS.md, docs/ACCEPTANCE.md, git status and git diff. Reconcile those notes with the actual source and newest release. Give an ETA, show progress screenshots, and update the two state documents after meaningful steps. Do not spawn subagents.

The current game has two finite Hawaiian islands: Oʻahu and Lānaʻi. Preserve both seven-stage campaigns, the deterministic 20% population thinning, fixed physical sizes, permanent collected objects, the 32 cm seed, and the bumpy pile. Continue this direction; the Earth-history experiment and endless world are archived.

Every collectible, attached object and rolling character has a Blender-authored 3D model. Keep the all-3D near/far renderer; there is no billboard fallback. The shared catalog contains 132 variants covering all 52 collectible families plus the explorer. Reuse vertex-color materials, geometry, cached models and instanced pages. Generate new production assets through Blender MCP or the applicable image-generation workflow rather than shipping placeholders. Keep the existing triangle budgets. If rebuilding the kit, run scripts/build_toytown_asset_kit.py through Blender MCP and scripts/optimize-toytown.ps1 afterward; it preserves raw source, produces both optimized GLBs and restores attachment-size metadata.

src/navigation.js gives movement a compact envelope and consistent obstacle sliding. The full compound controls floor support and rocking. Never couple navigation radius back to the furthest protrusion, and never let the pickup cadence stop obstacle checks. Rapier is removed; do not restore its startup download without an explicit need and measured benefit. Real 3D bounds support attached-piece ground contact while logical item size controls eligibility and growth.

Visibility is geometric: all readable on-screen objects render. Do not restore a nearest-N cutoff or a small fixed chunk-radius clamp. The camera determines coverage; hidden chunks prepare during idle time and the next two rings preload toward velocity. World coordinates, IDs and roads survive rebasing and normalization. Cache viewport dimensions once per cull; per-object layout reads were costly. Model LODs share one physical pivot/extent. Notifications use one compact top strip.

Next development priorities:

1. Play both campaigns naturally from start to finish. Tune snack trails, stage distances, time bonuses and objective guidance from observed runs. Favor interesting routes, anticipation and satisfying collections while preserving size gates and an intentional ending.
2. Measure representative Android/iPhone hardware, including sustained runs, thermal load and battery behavior. The recorded desktop-browser mobile-viewport measurements are useful evidence, not handset benchmarks. Use F3 / ?performance and preserve raw CPU/GPU, frame, draw-call, triangle and chunk-timing evidence.
3. Use measured handset bottlenecks to guide further rendering work. The pile already changes geometry by fixed-size family with shared pivots, persistent slots and cached render pages. Preserve this behavior and verify the rendered count equals the retained piece count through every quality change.
4. Improve scenery and routes on the existing two islands based on playtesting. Add another island only when the user requests it. Keep landmarks and neighborhoods authored in the shared physical-meter layout rather than independently moving with zoom.

Before a release, exercise the meaningful invariants in scripts/verify-navigation.mjs and scripts/verify-island-invariants.mjs, real control/normalization fixtures in accept-movement-browser.js, both island endings in accept-endings-browser.js, and boost/growth visibility tracing in trace-hawaii-visibility.js. Read the browser-script comments and keep the benchmark browser isolated; close only your own test contexts. Large-scale QA fixtures inject scale for coverage and do not prove natural campaign pacing. The QA API exists only in Vite DEV builds.

Use the existing Sites identity in .openai/hosting.json: appgprj_6abd4eabb1fc8191b880958dde997a86. Preserve public access. Follow the user's build-once-publish workflow: perform requested checks before the one production build, fix blockers, publish the successful output immediately, and stop after handoff. Keep credentials in memory/stdin only. Synchronize finished source and release documentation to GitHub. Return the live URL, screenshots, honest evidence boundaries, PROGRESS.md and PROJECT_STATE.md.
