# Katamari Neighborhood

A mobile-first, independent Katamari-inspired browser fan game with original generated artwork. One map: Sunny Side Neighborhood. Roll from 32 cm to a 6 m goal in four minutes, or explore the same map in free-roll mode.

## Play
Touch: drag the left thumbstick, hold GO! to dash, and tap the circular arrow to rotate the camera. Desktop: WASD or arrow keys to roll, Shift to dash, Q/E to rotate, Escape to pause. Roll over objects smaller than the ball. Larger objects block movement until the ball grows. Sound starts muted and can be enabled with the music button. Switching tabs or losing window focus pauses active play.

## Development
Install with `npm install`, run `npm run dev`, and build with `npm run build`. The static production output is `dist/`. Sites identity and output configuration live in `.openai/hosting.json`.

`src/simulation.js` owns the deterministic map and rules; `src/main.js` adapts the state to Three.js, input, sound, and DOM HUD. Artwork uses cropped transparent billboards in a 3D world, a lit textured rolling sphere, and a generated ground texture. No copied models, music, or original game assets. No login or server state.

Browser WebMCP registration is feature-detected and exposes status readback and new-game start through the same interface actions. Unsupported browsers continue normally.

## Release scope
The requested build-once-publish workflow performs a production build and confirms the hosting deployment status. Device playtesting, browser QA, performance measurement, and WebMCP runtime validation are left for manual acceptance.
