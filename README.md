# Katamari Neighborhood

https://katamari-neighborhood.remriel.chatgpt.site/

A mobile-first Katamari-inspired fan game with original artwork and Blender-authored 3D objects. Choose Oʻahu or Lānaʻi and play four 30-second stages on that same island. The game moves your growing ball to a new area at 0:30, 1:00 and 1:30, then finishes after two minutes.

Each stop offers larger pickups: snacks and toys, beach furniture and boats, vehicles and houses, then large buildings and landmarks. The ball, attached objects, score and collected-map progress carry between stops. Objects keep their physical sizes; you can collect any object anywhere once the ball is large enough. Stage goals earn bonus points and medals while the 30-second clock continues. The optional single four-minute quick challenge is also available.

Touch controls: drag the thumbstick, hold GO! to dash, and tap the circular arrow to rotate the camera. Desktop: WASD/arrows to roll, Shift to dash, Q/E to rotate and Escape to pause. Sound begins muted. Changing tabs or losing focus pauses active play.

Install with `npm install`, run `npm run dev`, and build with `npm run build`. The static output is `dist/`; the existing Sites identity lives in `.openai/hosting.json`. Simulation, stage timing and persistent collection live in `src/simulation.js`, with the four stops defined in `src/campaign.js`. `src/main.js` adapts the game to Three.js, controls and the HUD. Terrain vertices use the same physical heights as the simulation on a fixed world grid.

`node scripts/verify-four-stage-campaign.mjs` covers timing, relocation, growing object tiers, retained collection/heap state, pause and records. Other invariant scripts cover navigation, actors, terrain and the model library. Ordinary-control simulation is available through `scripts/playtest-pacing.mjs`; browser and handset acceptance are separate checks. Browser WebMCP tools expose status and new-game actions when supported.
