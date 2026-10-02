# Compound island performance update

Objective: reduce Katamari rendering cost and prepare nearby chunks before they enter view.
Progress: [########--] 80% toward a built and published update.

- [x] Reconcile live V4, source, preserved compound draft and course change.
- [x] Preserve Eon prototype on archive/eon-roll-prototype and restore Katamari as active source.
- [x] Retain every object in the assembly and render all instances with rigid local transforms.
- [x] Add Rapier compound contact, protrusion-driven bumps/traction and pickup attachment motion.
- [x] Connect seven finite chapters, target guidance, combo/dash rewards, final heap inspection and personal bests.
- [x] Production build passed once (14 modules, 2.03 s).
- [x] Exact source pushed to Sites and private GitHub, packaged and saved as version 6.
- [x] Public deployment succeeded; release evidence recorded and manual acceptance handed to user.
- [x] Diagnose and fix runaway early growth, map zoom jump and same-frame progression/freeze; publish version 7.
- [x] Batch visible ground objects by artwork and share shadow geometry/material.
- [x] Refresh visibility about 10 times per second and query nearby spatial chunks.
- [x] Add velocity-prioritized idle chunk preloading and adaptive device pixel ratio.
- [ ] Run one production build, save and publish the optimized version.
- [ ] Sync release notes/source to GitHub and record deployment evidence.

State: render optimizations implemented locally; no build yet. Blockers: none known. Verification: source inspection only. No automated tests, browser/gameplay checks, profiling, or frame-rate benchmarks under build-once-publish. Expected frame-rate gains remain unmeasured.

Release source: 492decac940a79f5c2a85f023c9db98620c97a86.
Saved version: appgprj_6abd4eabb1fc8191b880958dde997a86~appgver_919901ed3afc8191b89984b23e567ae2 (7).
Deployment: appgdep_6abed6e520ac81919332ea5c8ccaef62, succeeded 2026-10-01 21:55:56 UTC / 14:55 Pacific.
Live: https://katamari-neighborhood.remriel.chatgpt.site.
Archive: outputs/katamari-growth-fix.tar.gz; SHA256 f5deb97b9601123027b3458660d70f992ac339587b91e7018745e6ea5afd4e09.

Next: 1. Run the production build once. 2. Push and package the exact source. 3. Save and deploy the public Site. 4. Sync GitHub and record release evidence. 5. Hand device acceptance to the user without extra benchmarking.
