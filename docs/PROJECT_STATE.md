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

## Proof boundaries
No browser or physical-device playtesting requested. No runtime WebMCP validation. The source implements gameplay; successful build and deployment will confirm packaging/publication only.

## RESUME HERE
Artwork is integrated. Run Sites workflow with a single production build, push the same commit to the private GitHub backup, save the packaged version, set public access as explicitly requested, deploy, and confirm terminal deployment success. Return the native successful URL and stop.
