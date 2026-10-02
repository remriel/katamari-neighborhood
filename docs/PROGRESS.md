# Compound island performance update

Objective: reduce Katamari rendering cost and prepare nearby chunks before they enter view.
Progress: [##########] 100% of the implementation/build/publication workflow. Runtime benefit remains unmeasured.

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
- [x] Run one production build (15 modules, 2.25 s); it passed.
- [x] Push the exact source, package and save Site version 8.
- [x] Deploy publicly and confirm native succeeded status.
- [x] Record release details and sync notes to GitHub.

State: optimization version 8 is live. Verification: source inspection, one production build, exact-SHA push, required archive identity check, saved version and native deployment success. No automated tests, browser/gameplay checks or frame-rate benchmarks under build-once-publish. Expected frame-rate and pop-in improvements are unmeasured; startup still downloads the large Rapier chunk.

Release source: 492decac940a79f5c2a85f023c9db98620c97a86.
Saved version: appgprj_6abd4eabb1fc8191b880958dde997a86~appgver_919901ed3afc8191b89984b23e567ae2 (7).
Deployment: appgdep_6abed6e520ac81919332ea5c8ccaef62, succeeded 2026-10-01 21:55:56 UTC / 14:55 Pacific.
Live: https://katamari-neighborhood.remriel.chatgpt.site.
Archive: outputs/katamari-growth-fix.tar.gz; SHA256 f5deb97b9601123027b3458660d70f992ac339587b91e7018745e6ea5afd4e09.

Release source: e5d85b7bb3acd71d2149f0105fdb4248ec7e5afa.
Saved Site version: appgprj_6abd4eabb1fc8191b880958dde997a86~appgver_dadceca0ac948191a4ff24bc6253b16c (8).
Deployment: appgdep_6ac01ba5e0208191b85f1b1519bdc4be succeeded 2026-10-02 21:01:40 UTC / 14:01 PDT.
Live: https://katamari-neighborhood.remriel.chatgpt.site
Archive: outputs/katamari-render-optimized.tar.gz; SHA256 11fe9b3d6dda0eda7483a832ea28c7d8fd1143627341035c0d7de3c8a0916309.

Next: 1. User plays on phone and desktop to assess draw smoothness and pop-in. 2. Capture feedback; if startup remains slow, split/lazy-load Rapier separately in a later measured update.
