# Compound island progress

Objective: resume Katamari Neighborhood and publish persistent stuck objects, shape-driven bumpy rolling and a finite, rewarding island campaign.
Progress: [##########] 100% of the bug-fix/build/publication workflow. Gameplay acceptance remains unmeasured.

- [x] Reconcile live V4, source, preserved compound draft and course change.
- [x] Preserve Eon prototype on archive/eon-roll-prototype and restore Katamari as active source.
- [x] Retain every object in the assembly and render all instances with rigid local transforms.
- [x] Add Rapier compound contact, protrusion-driven bumps/traction and pickup attachment motion.
- [x] Connect seven finite chapters, target guidance, combo/dash rewards, final heap inspection and personal bests.
- [x] Production build passed once (14 modules, 2.03 s).
- [x] Exact source pushed to Sites and private GitHub, packaged and saved as version 6.
- [x] Public deployment succeeded; release evidence recorded and manual acceptance handed to user.
- [x] Diagnose and fix runaway early growth, map zoom jump and same-frame progression/freeze; publish version 7.

State: public corrected compound island release. Root cause was attachment Y using world-space ball height, causing downward stacking and an inflated support envelope; progression also used that envelope as pickup size. Version 7 fixes the local frame, uses controlled mass-based growth, caps pickups per frame and advances one chapter per frame. Verification: source diagnosis, one production build, exact-SHA source confirmation, required archive identity checks, native saved version and terminal deployment success. No automated tests, browser/gameplay checks or performance/pacing measurement under build-once-publish. Build warned about large runtime chunks. Installer reported a dependency advisory; no unrelated dependency upgrades performed.

Release source: 492decac940a79f5c2a85f023c9db98620c97a86.
Saved version: appgprj_6abd4eabb1fc8191b880958dde997a86~appgver_919901ed3afc8191b89984b23e567ae2 (7).
Deployment: appgdep_6abed6e520ac81919332ea5c8ccaef62, succeeded 2026-10-01 21:55:56 UTC / 14:55 Pacific.
Live: https://katamari-neighborhood.remriel.chatgpt.site.
Archive: outputs/katamari-growth-fix.tar.gz; SHA256 f5deb97b9601123027b3458660d70f992ac339587b91e7018745e6ea5afd4e09.

Next: 1. User plays the public update. 2. Capture concrete feedback on bumpy contact, retained pieces, stages and pacing. 3. Make requested corrections using the same build-once-publish release path. No unsolicited additional testing or refinement.
