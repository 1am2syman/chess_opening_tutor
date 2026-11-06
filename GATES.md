# Gates: Scotch Gambit tutor

Scope: working single-HTML tutor with twenty legal forty-half-move repertoire branches, public-data evidence, idea-led teaching, study and recall, approved mobile layout, and live engine evaluation. Functional build is delivered separately from the unfinished editorial-quality requirement.

- [x] G1: The delivered repertoire contains twenty distinct legal forty-ply lines and all statistical counts match independent recounts of the public sample.
  CHECK: node --test tests/repertoire.test.mjs
  EXPECT: fail 0
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/home/acer_vps/GitHub/chess_opening_tutor; path=3ba617b2e949/11 entries; output=ℹ todo 0 | ℹ duration_ms 8988.754346

- [x] G2: Public-data provenance, filters, dates, uncertainty, and engine-tail boundaries are visible and reproducible; no site-wide or exact normalized-rating claim is made.
  EVIDENCE: scripts/collect_public.py completed with PUBLIC_SAMPLE_OK scanned=3000000 matched=413; data/public-sample.json records September 1–2, 2026, both ratings 1800–2200, rapid estimated duration [480,1500), CC0 source archive and ETag. tests/repertoire.test.mjs independently recounted every displayed prefix and verified null popularity in engine tails. User explicitly approved public downloads after explorer HTTP 401. docs/data-methodology.md and the HTML disclose convenience sampling and approximate audience mapping.

- [ ] G3: Every covered move has individually considered, original idea-led coaching of masterclass quality explaining the problem, rationale, follow-up, and tactical or positional considerations against the exact position.
  EVIDENCE: UNMET. Every half-move has fields and legal engine calculations, but only 52 of 609 unique move-position lessons currently use tailored opening-specific copy. Remaining lessons are position-derived prompts. Passing legality or field-completeness tests does not prove teaching quality. Sequential authoring/review is now running through scripts/run-editorial.mjs using cliproxyapi/gpt-6-astra at high effort, starting with the full Nf6/e5/d5 line. Each accepted line is integrated and tested before the next begins. This gate remains open until coverage and editorial quality are verified; agent self-acceptance and field checks alone are not proof of masterclass quality.

- [x] G4: The final HTML supports legal navigation for all lines, a left drawer, full recall with hints, local progress, usable failure states, and a twelve-pixel bar/board/controls fitting the iPhone 11 viewport.
  CHECK: node scripts/verify-browser.mjs
  EXPECT: BROWSER_VERIFIED_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/home/acer_vps/GitHub/chess_opening_tutor; path=3ba617b2e949/11 entries; output="Engine and storage failures leave the chessboard and navigation usable." | ]

- [x] G5: The UCI adapter cancels old searches, suppresses stale results, orients centipawn/mate scores correctly, and real browser engine output is observed.
  CHECK: node --test tests/engine.test.mjs
  EXPECT: fail 0
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/home/acer_vps/GitHub/chess_opening_tutor; path=3ba617b2e949/11 entries; output=ℹ todo 0 | ℹ duration_ms 68.023956

- [x] G6: Compact header, coaching-before-board hierarchy, left drawer, and touch move controls match the approved prototype without the original top selectors.
  EVIDENCE: visually reviewed artifacts/iphone11.png, drawer.png and desktop.png after the integrated browser pass. Header is a single line; Study/Recall and compact coaching precede the board. Expanded details intentionally allow scrolling. Browser geometry is also enforced by G4.

- [x] G7: The published HTML exactly matches the local build, has license/source notices and honest limits, and does not contain a Lichess token.
  CHECK: node scripts/verify-delivery.mjs
  EXPECT: DELIVERY_VERIFIED_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/home/acer_vps/GitHub/chess_opening_tutor; path=3ba617b2e949/11 entries; output=DELIVERY_VERIFIED_OK
