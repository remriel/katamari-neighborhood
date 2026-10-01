# Katamari Neighborhood project state

## Current direction and preservation
2026-10-01: user resumed the Katamari game from the restored public V4 and repeated the persistent monstrosity / bumpy roll / engaging finite progression brief. Eon Roll is inactive; its complete source and artwork are preserved on private GitHub branch archive/eon-roll-prototype at bb17622. Prior unfinished compound island draft is preserved at 25d4c57 on archive/katamari-v5-compound-island. Active source was restored from that draft, then completed here. Do not reintroduce the Earth-history runtime without an explicit change of direction.

## Architecture and physical accumulation
Vite + Three.js static game; src/main.js is the active entry, src/simulation.js owns rules and seeded world state, src/terrain.js renders fixed winding road fields. Original 44 generated art IDs and native high-resolution ground textures remain in public/assets. Complete alpha silhouette extraction avoids atlas-grid clipping. Ocean artwork came from the preserved island draft.

src/compound-ball.js owns every collected object's stable ID, local position, orientation, dimensions, corners and pickup source. The seed core stays 16 cm; it shrinks only in normalized local coordinates. Gameplay diameter comes from the assembly envelope, not a growing sphere. Every piece is retained; no attachment cap or removal of underside objects. Scale normalization changes all coordinates together and keeps rigid local relationships.

src/compound-view.js renders all pieces in instanced textured geometry with 256 instances per page/art ID. Only new pickups and rescaled transforms need matrix updates. New pickups ease into their permanent position over 180 ms; reduced motion skips this. Finished assemblies remain inspectable with camera rotation.

src/compound-contact.js initializes dynamically imported Rapier 0.21.0. One convex collision envelope uses the compound support witnesses; it is rebuilt only on collection or normalization. Simulation controls planar travel; the physics bridge resolves vertical contact and rocking, raises penetrations, and applies a small impact hop. Protrusions affect support radius, orientation, height and traction. Renderer follows physical orientation. Custom CompoundBall.advance remains the pure support-contact fallback/prototype routine.

## Finite island and progression
src/campaign.js defines one bounded island (half-width 6 km) and seven chapters: 1 m / 20 items; marked convertible at 6 m / 45; apartment at 30 m / 70; castle at 120 m / 95; skyscraper at 500 m / 115; mountain at 1.8 km / 135; Sunny Side Island at 2.5 km / 150. Every objective landmark is authored and retained across streaming/scaling. Completion freezes gameplay and shows the whole final heap. No endless mode. Optional four-minute / 6 m challenge also ends.

Campaign starts with 150 seconds; each chapter earns 60 more, capped at 600. Combos multiply score up to 5x. Dash has rechargeable energy and receives 7 energy per pickup, encouraging object trails; empty charge recovers before another burst. Direction/distance/name plus a ground ring identify the current target. Seven-stage tracker, stage recap and separate campaign/challenge personal bests support replay. Bests persist on this device; in-progress runs do not autosave.

## Stability constraints and failures to avoid
Terrain UV/road phases are fixed in logical world coordinates; never animate spacing back toward defaults. Preserve object IDs/positions across growth and retain visible populations with protected spawn regions. Collected-ID history is now retained for the entire finite run, even if chunk masks are evicted. Do not calculate coast clearance from the whole heap radius: long appendages could otherwise block reaching the final objective; constrain the seed center instead.

## Publication and proof boundaries
Same Site appgprj_6abd4eabb1fc8191b880958dde997a86; audience public; URL https://katamari-neighborhood.remriel.chatgpt.site. Private GitHub https://github.com/remriel/katamari-neighborhood. Baseline was restored public V4. The compound island update is now saved version 7 and public. No subagents. Continue user-selected build-once-publish: one production build per source state, repair blocking failures only, publish, hand manual acceptance to user. No browser/gameplay/performance tests unless requested. Contact behavior, pacing and mobile frame rate have not been observed in a running game.

RTK 0.48.0 is available now; prefix commands with rtk. Use fresh native source credentials immediately before release; keep tokens in stdin/memory. Bundled Sites helper is missing again; ../launch-katamari-release.ps1 runs the preserved ../site-publish-fallback.mjs with Git bin PATH and TAR_OPTIONS=--force-local. Fallback takes build:false for a packaging-only retry and accepts a task-specific commitMessage. Do not rebuild after a packaging-only failure.

## Release evidence
2026-10-01: version 6 build passed, 14 modules, 2.03 seconds. Exact source 9fe9e3f3519ce5c7f4f27455f95199d2db481bc0 was published before the growth correction. Version 7 build passed, 14 modules, 2.94 seconds. Exact corrected source 492decac940a79f5c2a85f023c9db98620c97a86 pushed to Sites and GitHub main. Native saved version 7: appgprj_6abd4eabb1fc8191b880958dde997a86~appgver_919901ed3afc8191b89984b23e567ae2. Public deployment appgdep_6abed6e520ac81919332ea5c8ccaef62 succeeded at 2026-10-01 21:55:56 UTC (14:55 Pacific). Archive outputs/katamari-growth-fix.tar.gz accepted: 58 files, 9,082,880 bytes, SHA256 f5deb97b9601123027b3458660d70f992ac339587b91e7018745e6ea5afd4e09. Vite warned about large chunks: main 537 KB, dynamic physics 4,337 KB; build did not fail. No lint, automated/gameplay/browser tests or performance audit.

## RESUME HERE
Compound island version 7 is public. The runaway-growth fix is now the active release: local attachment placement no longer uses world height, material diameter advances with a per-pickup band cap, pickup cadence is limited, and chapter progression advances once per frame. Await user play feedback before further changes. Manual acceptance still needs to assess rolling feel, pickup/terrain stability through normalization, full campaign pacing/solvability and mobile performance. Preserve both archival branches and the current Site identity.
