# Katamari Neighborhood

A mobile-first, independent Katamari-inspired browser fan game with original generated artwork. One continuous map: Endless Sunny Side. Start at 32 cm and roll forever through procedurally generated districts, or try the optional four-minute 6 m challenge.

V4 adds 24 original illustrated objects, bringing the catalog to 42 collectibles. Twelve new everyday props join buses, giant oaks, apartments, windmills, Ferris wheels, water towers, clock towers, castles, stadiums, skyscrapers, mountains, and islands. Sizes range from 16 cm sushi to a 2.2 km island. Regular objects have fixed physical sizes, so houses remain about 5 m as the ball grows beyond them. New catalog tiers appear in fresh areas; existing visible objects keep their positions and sizes. At later scales, mountain ranges and island chains continue to grow for endless play. Scale milestones and pickup size labels show the progression.

## Play
Touch: drag the left thumbstick, hold GO! to dash, and tap the circular arrow to rotate the camera. Desktop: WASD or arrow keys to roll, Shift to dash, Q/E to rotate, Escape to pause. Roll over objects smaller than the ball. Larger objects block movement until the ball grows. Sound starts muted and can be enabled with the music button. Switching tabs or losing window focus pauses active play.

## Development
Install with `npm install`, run `npm run dev`, and build with `npm run build`. The static production output is `dist/`. Sites identity and output configuration live in `.openai/hosting.json`.

`src/simulation.js` owns seeded neighborhood chunks, pickups, collision substeps, size normalization, floating origin, and rules. Each fresh roll has a new seed; block layout is deterministic for that seed and scale. At most 81 active blocks stay loaded. Growth retains the visible population, with up to 4096 nearby retained slots before any additional visible objects, and protects that area from replacement spawns. A bounded 384-block ledger preserves recent collection/skipped-spawn state; revisiting sufficiently remote evicted blocks can replenish their objects. Growth scale increases indefinitely while local numbers remain small. Display units advance from cm to m, km, and exponent notation.

Object catalogs convert fixed physical sizes to normalized local sizes and select eligible types for each growth tier. Blocks attempt 96 spaced placements with small/medium pickup trails and larger landmarks. Collision lookup includes the maximum supported footprint. Original source sheets and exact prompts for the new objects are in art/V4-PROMPTS.md; --sprite-set extends the alpha-extraction pipeline without recutting original assets.

`src/main.js` adapts state to Three.js, input, sound, and the DOM HUD. Corrected art uses complete alpha-connected cutouts with transparent gutters. Attachments sit fully outside the ball and disappear as whole cutouts on the ground-facing underside. Adaptive camera depth and scale rebasing preserve rendering precision.

`src/terrain.js` blends native-resolution generated meadow and paving into meandering roads and curved diagonal branches. Roads and texture samples use fixed logical world coordinates, with exact bounded phases derived from the BigInt origin. Chunk generation never changes terrain coordinates. Multiple fixed road/detail scales fade with camera zoom; road spacing and texture scale do not animate. The camera's padding also scales with growth normalization so it does not add a second zoom at a size transition. Mipmaps and anisotropic filtering keep terrain sharp; canvas renders at device DPR up to 3. No copied models, music, or original game assets. No login or server state.

Browser WebMCP registration is feature-detected and exposes status readback and new-game start through the same interface actions. Unsupported browsers continue normally.

## Release scope
The requested build-once-publish workflow performs a production build and confirms the hosting deployment status. Device playtesting, browser QA, performance measurement, and WebMCP runtime validation are left for manual acceptance.
