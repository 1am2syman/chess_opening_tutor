# Openboard — Scotch Gambit, Caro–Kann & Vienna Gambit tutor

A mobile-first single HTML with three twenty-line, forty-ply repertoires: **Scotch Gambit as White**, **Caro–Kann as Black**, and **Vienna Gambit as White**. The drawer selects the opening, family and line. Rules, data and lessons are embedded; piece artwork and live Stockfish require internet access. No account, token, backend or live AI is needed to study.

- Build: `src/chess_opening_tutor/index.html` (size grows as reviewed explanations are added).
- Existing tailnet-only delivery: https://acer.taildd3bd9.ts.net/scotch-ui/index.html
- Chromium browser checks include mobile viewports; physical iPhone/Safari and direct `file://` use are not certified.

## Teaching status

**Scotch: all 609 reviewed original lessons across 20 lines are preserved.** Caro and Vienna have independent author/reviewer pipelines. Their live editorial counters show the current coverage. Opening introductions teach the central choices; unreviewed moves explicitly display **Draft**, using exact board facts and legal bounded-engine examples—not borrowed Scotch prose or invented strategic claims.

`CARO-GATES.md` and `VIENNA-GATES.md` record integration and editorial evidence. The qualitative teaching gate remains open: legal moves, field coverage and passing tests do not establish good pedagogy. There is no affiliation with Chess.com or Daniel Naroditsky, and no impersonation or claim of endorsement.

## Study and recall

Study with the timeline, navigation buttons, arrow keys or Home/End; expand Intent, Plan, Tactic, Theme and Compare. Flip changes orientation, not your repertoire color.

Recall plays your opening's color. White's initial e4 and subsequent White replies are automatic for Caro; Black replies are automatic for Scotch and Vienna. A correct answer pauses for explanation before Continue. Future notation, branch titles and engine candidates are hidden while answering; the pre-move prompt uses current-position facts, not target-move text. Hint/Reveal answers do not count as unaided recall. Legal alternatives are not automatically mistakes.

Progress, last line/position and evaluation preference are independent per opening. Existing `openboard.scotch.v1` progress is retained; Caro uses `openboard.caro.v1` and Vienna uses `openboard.vienna.v1`. Clearing progress affects only the selected opening. If storage is blocked, progress survives opening switches within the session but not reloads. Positive engine scores always favor White, including while playing Black.

## Data and limitations

All three snapshots are chronological convenience samples of the public September 2026 Lichess CC0 archive, **not random samples or site-wide popularity estimates**:

| Opening | Retained games | Scanned games | Scanned dates |
| --- | ---: | ---: | --- |
| Scotch | 413 | 3,000,000 | September 1–2 |
| Caro | 2,000 | 1,186,755 | September 1 |
| Vienna | 267 | 5,000,000 | September 1–2 |

Both players must be Lichess 1800–2200; estimated duration is `base + 40 × increment` in [480,1500) seconds. This is an approximate audience proxy for Chess.com rapid 1500–2000, not a rating conversion. Exact entry orders are required; transpositions are excluded. Retained moves stop at ply 40; games ending earlier do not contribute later reply counts.

Caro deliberately covers Advance, Classical Nc3/Nd2, Exchange, Panov, Fantasy, Two Knights and a quiet sideline. These are repertoire branches, not the twenty most frequent complete games. Once exact-prefix support drops below three games, the entire remaining tail is labeled engine-derived with no popularity percentage. Tests independently recount every boundary. See `docs/data-methodology.md`.

Vienna begins **1.e4 e5 2.Nc3 Nf6 3.f4**; other Black second moves, including `2...Nc6`, are outside this repertoire. It covers the central `3...d5` counterstrike, `3...exf4` acceptance and supported declining replies. The 1,500-game collection target was not reached: the scan cap yielded the 267 games shown above.

Preparation uses Stockfish 19, 180,000 nodes, MultiPV 4; browser analysis uses Stockfish.js 10. Different search budgets can disagree; neither proves perfect play.

## Build and verify

```bash
npm ci
npm run build
npm test
node scripts/verify-browser.mjs
node scripts/verify-vienna-browser.mjs
node scripts/verify-mobile-sizing.mjs
node scripts/verify-delivery.mjs
```

Browser checks require `/usr/bin/chromium`; delivery defaults to the tailnet URL above (`OPENBOARD_DELIVERY_URL` overrides it). Browser evidence defaults to `artifacts/` (`BROWSER_ARTIFACT_DIR` overrides it). Checks retain the Scotch assertions and add Caro legality/counts, isolation, Black recall including ply 40, completion, persistence, actual animations, live engine and failure fallbacks.

To regenerate source data (requires Python/uv and native Stockfish at `.tools/stockfish/stockfish-linux-x86-64-universal`):

```bash
uv run scripts/collect_public.py --opening caro --month 2026-09 --target 2000
node scripts/prepare-repertoire.mjs --caro
npm run build
```

Use `--opening vienna --target 1500 --max-games 5000000` for Vienna collection and `--vienna` for preparation. Omit `--caro` for Scotch preparation; use the documented Scotch collector limits in `docs/data-methodology.md`. Collection streams a large archive and can consume significant bandwidth/CPU. Recheck all evidence after regenerating.

## Editorial operation

```bash
node scripts/run-editorial.mjs --vienna # Vienna author → independent reviewer → validate/build/test
node scripts/run-editorial.mjs --caro  # Caro author → independent reviewer → validate/build/test, sequentially
node scripts/run-editorial.mjs         # existing Scotch behavior
node scripts/verify-caro-editorial.mjs # requires all Caro lines/lessons to match accepted independent reviews
node scripts/verify-caro-editorial.mjs --vienna # same complete-coverage check for Vienna
```

The completion check intentionally fails while any line of the selected opening is unfinished. It verifies complete coverage, review provenance and compiled content; it does not certify the accuracy or teaching quality of the prose.

Every Astra subprocess explicitly loads the installed CLIProxyAPI provider extension and uses `--provider cliproxyapi --model gpt-6-astra --thinking high`. No coding agents are involved. Caro's independent brief is `scripts/caro-editorial-brief.md`; packets/drafts/reviews/accepted content stay in `data/caro/editorial/`, logs and final browser evidence in `artifacts/caro-editorial/`. Scotch remains in `data/editorial/` and `artifacts/editorial/`. Vienna uses `scripts/vienna-editorial-brief.md`, `data/vienna/editorial/` and `artifacts/vienna-editorial/`. Accepted shared positions are reused only within their opening. Resume skips accepted lines; run only one writer per opening. Each accepted line rebuilds the single HTML. Builds serialize through `artifacts/openboard-build.lock` and atomically replace outputs, so multiple opening editors cannot publish a partially written file. If a build is forcibly killed, confirm no build remains active before removing a stale lock directory. The live progress counter, not this README, is the current editorial count; launch details are recorded in the opening's gates file.

## Source and licensing

UI: `tutor.mjs`, `tutor.template.html`, `tutor.css`; opening language: `openings.mjs`; Caro/Vienna factual drafts: `caro-coaching.mjs`; preserved Scotch coaching: `coaching.mjs`; browser engine/animation adapters: `engine.mjs`, `board-motion.mjs`, under `src/chess_opening_tutor/`. `scripts/build.mjs` produces the HTML and all three `lessons.json` files. The earlier `ui-prototype.html` is not the tutor.

- Public games: [Lichess CC0](https://database.lichess.org/).
- Unmodified Cburnett pieces: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), [source](https://github.com/lichess-org/lila/tree/master/public/piece/cburnett).
- Rules: [chess.js 1.4.0, BSD-2-Clause](https://github.com/jhlywa/chess.js/tree/v1.4.0).
- Browser engine: [Stockfish.js 10, GPLv3 source](https://github.com/nmrugg/stockfish.js/tree/10.0.2).
- Native engine: [Stockfish 19, GPLv3 source](https://github.com/official-stockfish/Stockfish/releases/tag/sf_19).

Retain attribution, licenses and source notices when distributing the HTML. No Chess.com assets or proprietary engine are redistributed.
