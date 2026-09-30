# Katamari Neighborhood

## Product
Public, mobile-first Katamari-inspired browser game; one neighborhood map. Independent fan game with original generated artwork. Primary loop: roll, collect smaller things, grow, unlock larger things. Four-minute challenge plus free roll on the same map.

## Architecture
Vite static export hosted through Sites; Three.js world with generated illustration billboards and a textured rolling sphere. Simulation owns sizes, pickups, collisions, timer, and progression independently from rendering. DOM touch joystick and game HUD. No backend or account requirements.

## Constraints
User requested build-once-publish: implement, one production build, publish, stop. No lint, tests, browser QA, or additional visual inspection. No subagents authorized. Only one map. Games are exempt from the user's website neo-brutalist design requirement.

## Decisions and relevant files
- `src/simulation.js`: deterministic 276-object map, continuous overlapping size bands, small-item opening cluster, acceleration, size eligibility, bump response, volume-based growth, 6 m goal, and four-minute challenge. Free roll uses the same map and rules without the timer.
- `src/main.js`: Three.js render adapter, generated-art billboards, quaternion ball rotation, up to 55 visible collected attachments, camera-relative touch/keyboard movement, camera rotation, dash, opt-in synthesized pickup notes, pause on focus loss, context-loss message, feature-detected browser tools.
- `src/style.css`: portrait-first layout with safe-area insets and compact landscape menus.
- `scripts/process-assets.py` and `art/PROMPTS.md`: artwork extraction/format pipeline and exact prompts. Raw originals stay in art/; public/assets/ contains shipping textures.
- The Sites manifest ID is `appgprj_6abd4eabb1fc8191b880958dde997a86`. Expected origin: https://katamari-neighborhood.remriel.chatgpt.site. Private GitHub backup: https://github.com/remriel/katamari-neighborhood.
- Windows npm shim failed under the Sites installer; direct Node invocation of the installed npm CLI succeeded. Use direct Node/Vite arguments for the one production build if necessary. Do not modify the shared Sites helpers.
- Windows packaging initially selected WSL bash, which has no installed distribution. Before launching Site workflow, prepend `C:\Program Files\Git\bin` to this process's PATH, set `TAR_OPTIONS=--force-local`, and use a forward-slash absolute Windows archive path. This permits the bundled packaging helper to use Git Bash and GNU tar. Reuse the successful dist output with empty commands; no second build was run.

## Proof boundaries
One production build and required packaging checks passed. No browser or physical-device playtesting requested. No runtime WebMCP validation. Build and deployment confirm packaging/publication only.

## RESUME HERE
Release v1 is public and deployment succeeded at https://katamari-neighborhood.remriel.chatgpt.site. Built/source commit: b91e1ba9c7de849b171ba45452904381db4d98b2. Saved version: appgprj_6abd4eabb1fc8191b880958dde997a86~appgver_9510834aebfc8191b32ea028e471e7b6. Deployment: appgdep_6abd558a8ea4819197e53f330a23f378. Private GitHub contains source, original artwork, prompt provenance, and these release notes. Manual device acceptance remains with the user; do not begin extra testing or changes without a new request. For a future edit, preserve the Site identity, open its existing source, and follow the current requested release workflow.
