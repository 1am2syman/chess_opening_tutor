# Caro–Kann acceptance gates

Scope: approved twenty-line, forty-ply Black repertoire in the existing single HTML tutor; preserve Scotch data and all 609 reviewed lessons. Work sequence: opening data/build → UI/recall/storage → isolated editorial runner → verification → detached editorial launch. No coding agents.

- [x] C1: Public sample retains source, rating/time filters and honest limitations; boundaries independently recounted.
  CHECK: node --test --test-reporter=tap tests/caro.test.mjs
  EXPECT: # fail 0
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/home/acer_vps/GitHub/chess_opening_tutor; path=1fe9df40604e/12 entries; output=# todo 0 | # duration_ms 15854.389415
- [x] C2: Twenty distinct legal forty-ply Black lines cover Advance, Classical, Exchange/Panov and supported sidelines, with engine tails labeled.
  CHECK: node --test --test-reporter=tap tests/caro.test.mjs
  EXPECT: # fail 0
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/home/acer_vps/GitHub/chess_opening_tutor; path=1fe9df40604e/12 entries; output=# todo 0 | # duration_ms 15656.453912
- [x] C3: Drawer switches openings without cross-opening progress leaks.
  CHECK: node scripts/verify-browser.mjs
  EXPECT: BROWSER_VERIFIED_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/home/acer_vps/GitHub/chess_opening_tutor; path=1fe9df40604e/12 entries; output="Engine and storage failures leave the chessboard and navigation usable." | ]
- [x] C4: Black recall includes automatic White opening/replies, no target spoilers, completion and persisted progress.
  CHECK: node scripts/verify-browser.mjs
  EXPECT: BROWSER_VERIFIED_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/home/acer_vps/GitHub/chess_opening_tutor; path=1fe9df40604e/12 entries; output="Engine and storage failures leave the chessboard and navigation usable." | ]
- [ ] C5: Every unique Caro position has individually authored and independently reviewed idea-oriented coaching; qualitative review is distinct from automated validation.
  EVIDENCE: partial coverage verified 2026-10-23: 385/594 unique Caro lessons and 11/20 lines accepted. Previous run stopped at caro-12 on a provider usage limit. Resumed the sole sequential author/reviewer runner in background terminal bt-1 (shell PID 408782), log artifacts/caro-editorial/resume.log. Direct spot-review of 16 accepted entries from Exchange, Panov, Fantasy and Two Knights found concrete positional explanations and honest concessions; this is not full qualitative certification. C5 remains open until the remaining lessons receive independent review and final inspection.
- [x] C6: Mobile width, animation, engine, single-file delivery and Scotch regressions remain working.
  CHECK: npm test && node scripts/verify-mobile-sizing.mjs && node scripts/verify-delivery.mjs
  EXPECT: DELIVERY_VERIFIED_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/home/acer_vps/GitHub/chess_opening_tutor; path=1fe9df40604e/12 entries; output=MOBILE_SIZING_OK | DELIVERY_VERIFIED_OK

- [ ] C7: All Caro lessons in the build match their accepted independent review, with complete coverage and no draft remainder.
  CHECK: node scripts/verify-caro-editorial.mjs
  EXPECT: CARO_EDITORIAL_COMPLETE
  EVIDENCE: negative control 2026-10-23: exit=1 against actual incomplete data, identifying the nine unaccepted lines; LSP found no diagnostics in the verifier. Full completion remains pending.

## Integration evidence

Status: **5 technical gates previously met, 1 qualitative gate and 1 full-editorial-coverage gate pending, 0 abandoned**. The following integration evidence is from the earlier integration run and must be refreshed after editorial completion. Final build contains both twenty-line repertoires; 19/19 npm tests pass with no failures or skips (`artifacts/caro-unit-tests.log`). All 64 pre-integration Scotch artifacts, including 609 accepted lessons, remain byte-for-byte identical; regression hashes live in `tests/fixtures/scotch-preservation.json`.

Browser checks ran twice through the gate verifier after the final code changes. Evidence: `artifacts/browser-evidence.json`, `artifacts/caro-iphone11.png`, `artifacts/caro-gate-verification.log`. They exercise all 40 branches, Black opening/replies, illegal and alternative moves, hints/reveal, complete Black recall, ply-40 progress reload, per-opening clear/storage separation, target-question spoiler canary, real animation calls, live engine output and failure fallbacks. At 414×896, Caro board width is 374px and controls end at y=816; no horizontal overflow. Four mobile width/height combinations pass the independent sizing check. Chromium evidence is not physical iPhone/Safari certification.

Delivered HTML at verification: 5,424,714 bytes; SHA-256 `ca1df287291e1b91e9ded59eae0a9d9cec228c83a3423ba0eef47e29f83da924`. `scripts/verify-delivery.mjs` confirms exact live/local equality and both embedded datasets. Existing delivery is **tailnet-only**: https://acer.taildd3bd9.ts.net/scotch-ui/index.html . Runtime Serve status shows `/scotch-ui` → localhost:8766 and no public Funnel; no routes or exposure were changed. The machine's actual status differs from the global sazzadvps preview convention, so no new Funnel was created.

## Authorized editorial process

- Command: `/home/acer_vps/.local/share/mise/installs/node/26.7.0/bin/node scripts/run-editorial.mjs --caro`
- Working directory: `/home/acer_vps/GitHub/chess_opening_tutor`
- Runner PID: `3449894` (detached, parent PID 1); launch time `2026-10-08T21:37:06.952Z`.
- Main log: `/home/acer_vps/GitHub/chess_opening_tutor/artifacts/caro-editorial/pipeline-2026-10-08T21-37-06.952Z.log`
- Launch record: `artifacts/caro-editorial/launch.json`; PID file: `artifacts/caro-editorial/run.pid`; events: `artifacts/caro-editorial/events.jsonl`.
- Initial author child: `3449905`, confirmed with `--provider cliproxyapi --model gpt-6-astra --thinking high --no-extensions --extension /home/acer_vps/.pi/agent/npm/node_modules/@router-for-me/pi-cliproxyapi-provider/extensions/index.ts`.
- Authorized scope: sequential author then independent reviewer for each of 20 lines. Writes: `data/caro/editorial/` and `artifacts/caro-editorial/`, plus normal integration build outputs. Accepted lines rebuild the shared HTML; the verified HTML hash above will therefore change as lessons are accepted.
- No coding agents were spawned. No hours-long completion wait was performed. C5 remains pending until full original coverage and qualitative review are evidenced; inspect the live accepted file and event log for subsequent progress.
