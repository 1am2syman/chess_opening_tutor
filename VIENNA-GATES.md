# Vienna Gambit acceptance gates

Scope: add a twenty-line, forty-ply Vienna Gambit White repertoire beginning 1.e4 e5 2.Nc3 Nf6 3.f4 to the existing single HTML tutor. Preserve Scotch and the ongoing Caro editorial process. Data, packets and accepted Vienna lessons live under data/vienna; editorial artifact logs live under artifacts/vienna-editorial. One writer per opening; shared builds must not overlap.

- [x] V1: Public sample and twenty distinct legal lines have accurate source metadata, exact-prefix counts and labeled engine continuations.
  CHECK: node --test --test-reporter=tap tests/vienna.test.mjs
  EXPECT: # fail 0
  EVIDENCE: 2026-10-23, cwd=/home/acer_vps/GitHub/chess_opening_tutor, shell=/bin/sh, exit=0; 4 tests passed, # fail 0. Log artifacts/vienna-editorial/data-verification.log. Independently replays all 267 retained games and 20 forty-ply lines, recounts every count/boundary and rejects illegal-move and incorrect-count controls.
- [x] V2: Vienna selection, White recall, complete-line navigation and isolated persistent progress work in the browser.
  CHECK: node scripts/verify-vienna-browser.mjs
  EXPECT: VIENNA_BROWSER_OK
  EVIDENCE: 2026-10-23, cwd=/home/acer_vps/GitHub/chess_opening_tutor, shell=/bin/sh, exit=0; VIENNA_BROWSER_OK. Evidence artifacts/vienna-editorial/vienna-browser-evidence.json and vienna-iphone11.png. All 20 lines navigated; full White recall through ply 39 and automatic Black ply 40; 19 unaided moves plus one hinted move persisted correctly; all three storage keys isolated; live engine and no-spoiler checks passed; no page errors. Screenshot inspected.
- [x] V3: Existing tests, mobile layout and live delivery remain correct.
  CHECK: npm test && node scripts/verify-browser.mjs && node scripts/verify-mobile-sizing.mjs && node scripts/verify-delivery.mjs
  EXPECT: DELIVERY_VERIFIED_OK
  EVIDENCE: 2026-10-23, cwd=/home/acer_vps/GitHub/chess_opening_tutor, shell=/bin/sh, exit=0; all 24 tests pass; BROWSER_VERIFIED_OK; MOBILE_SIZING_OK across four viewports; DELIVERY_VERIFIED_OK and VIENNA_INTEGRATION_VERIFIED_OK. Logs under artifacts/vienna-editorial/{unit-tests,regression-browser,mobile-verification}.log. Both earlier repertoires remain functional; all 64 Scotch artifacts byte-identical. Live HTML equals the local build and embeds all three datasets.
- [ ] V4: Every unique Vienna move has original position-specific explanations accepted by an independent reviewer; concrete claims, alternatives and narrative progression receive qualitative inspection.
  EVIDENCE: 2026-10-23: 0/651 unique lessons accepted at launch. Sequential author/reviewer started in bt-7 (shell PID 424313), first author-start confirmed in artifacts/vienna-editorial/events.jsonl for vienna-1, 40 new positions. Introduction board facts checked with chess.js. This is not completion of the qualitative gate.
- [ ] V5: All Vienna lessons in the build match their accepted independent review, with complete coverage and no draft remainder.
  CHECK: node scripts/verify-caro-editorial.mjs --vienna
  EXPECT: VIENNA_EDITORIAL_COMPLETE
  EVIDENCE: negative control 2026-10-23: exit=1 with actual incomplete dataset, correctly identifying all twenty unreviewed lines. Full coverage remains pending.

Status: **3 technical gates met, 2 editorial gates pending, 0 abandoned**. Full explanation quality remains incomplete until V4 and V5 pass. Automated legality and field checks do not certify pedagogy.

## Delivery and ongoing review

The existing tailnet-only URL is https://acer.taildd3bd9.ts.net/scotch-ui/index.html . No Tailscale routes or public exposure changed. Select Vienna Gambit in the opening drawer. It has independent White recall/progress and 651 unique lessons; initial editorial coverage is 0/651 and visibly marked Draft.

The sole Vienna runner is PID 424776 under shell PID 424313 (background terminal bt-7); logs are artifacts/vienna-editorial/pipeline.log and events.jsonl. It runs sequential author then independent reviewer using cliproxyapi/gpt-6-astra high effort, checks each returned packet, and rebuilds after acceptance. The build lock prevents overlapping publication with the ongoing Caro editor. Launching this pipeline does not complete V4 or V5.
