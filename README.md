# Katamari Neighborhood

A mobile-first, independent Katamari-inspired browser fan game with original generated artwork. One continuous map: Endless Sunny Side. Start at 32 cm and roll forever through procedurally generated districts, or try the optional four-minute 6 m challenge.

## Play
Touch: drag the left thumbstick, hold GO! to dash, and tap the circular arrow to rotate the camera. Desktop: WASD or arrow keys to roll, Shift to dash, Q/E to rotate, Escape to pause. Roll over objects smaller than the ball. Larger objects block movement until the ball grows. Sound starts muted and can be enabled with the music button. Switching tabs or losing window focus pauses active play.

## Development
Install with `npm install`, run `npm run dev`, and build with `npm run build`. The static production output is `dist/`. Sites identity and output configuration live in `.openai/hosting.json`.

`src/simulation.js` owns seeded neighborhood chunks, pickups, collision substeps, size normalization, floating origin, and rules. Each fresh roll has a new seed; block layout is deterministic for that seed and scale. At most 81 active blocks stay loaded. Growth retains the visible population, with up to 4096 nearby retained slots before any additional visible objects, and protects that area from replacement spawns. A bounded 384-block ledger preserves recent collection/skipped-spawn state; revisiting sufficiently remote evicted blocks can replenish their objects. Growth scale increases indefinitely while local numbers remain small. Display units advance from cm to m, km, and exponent notation.

`src/main.js` adapts state to Three.js, input, sound, and the DOM HUD. Corrected art uses complete alpha-connected cutouts with transparent gutters. Attachments sit fully outside the ball and disappear as whole cutouts on the ground-facing underside. Adaptive camera depth and scale rebasing preserve rendering precision.

`src/terrain.js` blends native-resolution generated meadow and paving into meandering roads and curved diagonal branches. Roads and texture samples use fixed logical world coordinates, with exact bounded phases derived from the BigInt origin. Chunk generation never changes terrain coordinates. Multiple fixed road/detail scales fade with camera zoom; road spacing and texture scale do not animate. The camera's padding also scales with growth normalization so it does not add a second zoom at a size transition. Mipmaps and anisotropic filtering keep terrain sharp; canvas renders at device DPR up to 3. No copied models, music, or original game assets. No login or server state.

Browser WebMCP registration is feature-detected and exposes status readback and new-game start through the same interface actions. Unsupported browsers continue normally.

## Release scope
The requested build-once-publish workflow performs a production build and confirms the hosting deployment status. Device playtesting, browser QA, performance measurement, and WebMCP runtime validation are left for manual acceptance.
