# Katamari Neighborhood

https://katamari-neighborhood.remriel.chatgpt.site/

A mobile-first Katamari-inspired fan game with original artwork and Blender-authored 3D objects. Choose Oʻahu or Lānaʻi and race through size checkpoints at 100, 200, 300 and 400 meters. Each checkpoint immediately moves you to a new area on the same island. At 400 m the island sweep unlocks: grow through giant landmarks until you can collect the island itself, which wins the run. The island is a 2,200 m final pickup requiring a 2,376 m ball under the ordinary size rule.

Race time counts upward without a deadline. Your fastest island-clear time is saved separately from earlier timed tours. The ball, attached objects, score and collected-map progress carry between checkpoints. Objects retain their physical sizes and can be collected anywhere once the ball is large enough. The full early scenery, rolling terrain and optional four-minute quick challenge remain. Baseline roll speed is 10% higher; power-up chunk eligibility is 21% instead of 30%, a 30% reduction.

Touch controls: drag the thumbstick, hold GO! to dash, and tap the circular arrow to rotate the camera. Desktop: WASD/arrows to roll, Shift to dash, Q/E to rotate and Escape to pause. Sound begins muted. Changing tabs or losing focus pauses active play.

Install with `npm install`, run `npm run dev`, and build with `npm run build`. The static output is `dist/`; the existing Sites identity lives in `.openai/hosting.json`. Simulation, stage timing and persistent collection live in `src/simulation.js`, with the four stops defined in `src/campaign.js`. `src/main.js` adapts the game to Three.js, controls and the HUD. Terrain vertices use the same physical heights as the simulation on a fixed world grid.

`node scripts/verify-four-stage-campaign.mjs` covers size boundaries, island-only victory, relocation, growing object tiers, retained collection/heap state, pause and records. Other invariant scripts cover navigation, actors, terrain and the model library. Ordinary-control simulation is available through `scripts/playtest-pacing.mjs`; browser and handset acceptance are separate checks. Browser WebMCP tools expose status and new-game actions when supported.
