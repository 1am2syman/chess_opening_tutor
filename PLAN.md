# Scotch Gambit Tutor — Implementation Plan

## Status

Implementation approved by the user on 2026-10-07. The approved prototype establishes the production layout: one menu icon opens a left navigation drawer; a single-line openboard/opening header is followed by Study/Recall and compact idea-led coaching, then the full board and move controls. A twelve-pixel live Stockfish evaluation bar sits to the board's left. Original intuitive coaching is the primary product requirement. Acceptance outcomes are tracked in GATES.md. The user subsequently approved public data instead of token setup. Collection is complete: 413 qualifying games from the first 3,000,000 games of the September 2026 public Lichess archive (scanned September 1–2), both ratings 1800–2200 and rapid duration filters. A working single-HTML build is at src/chess_opening_tutor/index.html with twenty legal forty-ply lines. Six functional/evidence gates passed. The user authorized sequential education authoring and specified cliproxyapi as the provider: gpt-6-astra at high effort. scripts/run-editorial.mjs runs one line at a time through author, independent review, coverage validation, build and tests; accepted lessons replace drafts in the app after every line. Shared accepted positions are reused. The editorial-quality gate remains open until complete coverage and positional/editorial review are verified.

## Goal

Deliver a mobile-first chess opening tutor as a single HTML file. Teach understanding rather than rote memorization, starting with a practical Scotch Gambit repertoire for White aimed at players around Chess.com rapid 1500–2000.

## Confirmed decisions

1. **Delivery:** one HTML file with online dependencies. Stockfish and assets may load online. This supersedes the original embedded/offline request: the deliverable has no offline guarantee.
2. **Repertoire:** twenty practical White-repertoire branches covering common Black responses, rather than the twenty most frequent complete sequences regardless of quality. Explain both sides and recommend White’s choices.
3. **Audience/time control:** rapid, targeting approximately Chess.com 1500–2000 strength.
4. **Evidence:** Lichess-backed first version. Use real rapid statistics and transparent approximate rating matching. Chess.com references only where verifiable; a Chess.com statistical sample is not required for this version.
5. **Depth:** each line runs from the initial position through Black’s twentieth move: forty half-moves total. Label engine continuations when database support becomes thin.
6. **Navigation:** three collapsible selection cards: Opening → Black response family → Line. Scotch Gambit is the only enabled opening initially; design data to permit additions later.
7. **Instruction:** a short, position-specific takeaway for each move, with expandable Intent, Plan, Tactic/Threat, and Theme sections and optional board highlights. Do not invent tactics for quiet moves.
8. **Learning modes:** guided study plus recall practice, playing White against the selected Black branch with hints.
9. **Engine:** revised during prototype review: automatic live evaluation in a slim twelve-pixel bar beside the board, using bounded mobile-friendly searches; candidate lines can be expanded on demand. Allow pausing evaluation to protect battery. Stockfish does not generate coaching prose.

## Requested experience

- Familiar Chess.com-style green-and-cream board and classic pieces, using appropriately licensed artwork rather than assuming permission to redistribute proprietary assets.
- Touch-first interface and icon controls for changing moves.
- Original conversational coaching: identify plans, candidate moves, threats, positional tradeoffs, and the reason for each move. The user cited Daniel Naroditsky as an instructional reference; write original material, without impersonation or claimed affiliation.
- Explain how a move fits the overall opening theme, not merely what notation it represents.

## Implementation defaults accepted with build approval

- Explain every half-move, including the shared opening prefix. Scotch Gambit entry: `1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Bc4`.
- Rank branches by common Black responses conditional on recommended White moves. Do not call them the twenty most frequent complete games or twenty globally most probable lines.
- Practice uses progressive hints. Distinguish a sound alternative from the repertoire move rather than automatically calling it a mistake. Confirm the exact assessment behavior before implementation.
- Persist progress locally; no account, backend, or live AI service.
- Engine-loading failures leave lessons and navigation usable and display a clear notice. Engine-dependent alternative assessment must disclose unavailability.
- Choose sample-support thresholds, data window, rating bands, branch-selection algorithm, engine build, analysis budget, and browser support after research; document them explicitly rather than silently assuming them.

## Statistical methodology

### Known constraints

- Lichess Opening Explorer documents filtering by game speed and rating buckets.
- Chess.com’s documented public API provides player game archives; initial research did not find a documented rating-filtered, site-wide opening-statistics endpoint. Do not turn that limited finding into a claim that no such capability exists anywhere.
- Cross-platform rating conversions are empirical estimates, not exact identities. Matching percentiles alone is not proof of equal playing strength.
- Deep branches become sparse. Frequencies at a position are conditional move frequencies, not automatically the observed frequency of a complete forty-half-move sequence.
- Transpositions require care: position-based counts may aggregate different move orders. Multiplying conditional frequencies is at most a modeled path estimate, not a directly observed game count.

### Research and collection steps

1. Read official Lichess explorer documentation and test endpoint access and applicable usage limits.
2. Find defensible rapid-specific rating-comparison evidence covering the intended audience. Do not extrapolate an out-of-range conversion formula.
3. Select and disclose Lichess rating buckets and an explicit collection date/window. If evidence cannot substantiate equivalence, label the sample as an approximate audience proxy, not normalized Chess.com statistics.
4. Implemented alternative approved by the user: stream a bounded public monthly PGN archive, filter rapid and both-player ratings, and retain exact Scotch Gambit prefixes with reproducible source metadata. Do not use unavailable explorer counts.
5. Record source URL/query, filters, timestamp, position, legal move, total sample count, move count, and results where available.
6. Establish a minimum-support policy before selecting branches. Display counts and uncertainty; do not disguise sparse results with precise-looking percentages.
7. Select twenty distinct, educationally useful Black-response branches while fixing sound White repertoire choices. Document pruning, overlap, transpositions, and ranking method.
8. Where support ends, complete through move twenty using checked engine continuations. Preserve the exact boundary between database-supported and engine-derived moves; no invented counts for engine tails.
9. Include a compact methodology/provenance panel and frozen snapshot in the HTML. No requirement to query databases during normal app use.

### Initial reference leads to verify

- Official Lichess API specification: https://github.com/lichess-org/api/blob/master/doc/specs/lichess-api.yaml
- Lichess explorer host: https://explorer.lichess.org
- Chess.com Published-Data API: https://www.chess.com/announcements/view/published-data-api
- Chess.com PubAPI overview: https://support.chess.com/en/articles/9650547-what-is-the-pubapi-and-how-do-i-use-it
- Rating-conversion surveys are research leads, not approved calibration yet. Verify original methodology, date, applicable range, and uncertainty before using any mapping.

## Content curation

For each unique covered position/move, write:

- **Takeaway:** concise practical explanation.
- **Intent:** the immediate purpose of the move.
- **Plan:** the follow-up or positional improvement it enables.
- **Tactic/Threat:** a concrete threat, tactical motif, defensive resource, or an explicit statement that no immediate tactic is central.
- **Theme:** connection to development, initiative, central control, king safety, pawn structure, or transition into the middlegame.
- **Highlights:** only squares/arrows supported by the actual position.

Shared positions may reuse explanations when their context is genuinely the same. Avoid generic templates that merely repeat piece names. Check tactical assertions, threatened captures, and proposed follow-ups against legal positions and engine analysis. Engine evaluation alone does not prove that prose is accurate.

## Implementation shape

The public deliverable is one HTML file; development sources, collection scripts, and tests may be separate. Inspect the existing repository before choosing the tooling or editing code.

Keep responsibilities distinct even if bundled into one file:

- **Chess rules:** legal moves, SAN/UCI conversion, FEN, castling, en passant, promotion, checks, and game termination. Prefer a proven library with a documented license.
- **Lesson data:** repertoire branches, move annotations, provenance, and statistical/engine boundaries.
- **Tutor state:** selected opening/family/line, move cursor, mode, hints, and progress.
- **Rendering:** board, pieces, selection cards, annotation sections, move list, highlights, and controls.
- **Engine adapter:** worker startup, UCI readiness, MultiPV, cancellation, analysis budgets, and failures.
- **Storage adapter:** versioned local progress with safe fallback when browser storage is unavailable.

Select an engine distribution that runs in targeted mobile browsers without assuming cross-origin isolation or server headers that a downloaded HTML cannot provide. Verify its worker/WASM paths, CORS behavior, license obligations, and loading from the final delivery context. Loading dependencies online does not guarantee direct `file://` compatibility; test and document the supported launch method.

## UI behavior

- Board dominates the mobile view, scales without horizontal overflow, and keeps move controls within convenient reach.
- Selection cards collapse to conserve vertical space; selected opening, family, and line remain identifiable.
- Provide first/previous/next/last icons with accessible labels, disabled boundary states, and suitable touch targets. Add keyboard equivalents where appropriate.
- Show current move, whose turn it is, branch identity, and statistical-versus-engine provenance clearly.
- Keep detailed coaching collapsible. Highlights are optional and reversible.
- Recall mode hides the answer until attempted or requested. Present feedback without falsely equating off-repertoire play with bad chess.
- Live evaluation runs bounded searches after position changes, can be paused from Settings, and must never apply stale results to a new position.
- Handle dependency failures visibly without replacing the board with an unexplained blank state.

## Work phases after approval

1. **Repository discovery:** inspect README, current source, tooling, instructions, and existing functionality.
2. **Evidence and feasibility:** verify APIs, rating-proxy policy, dependency licenses, and mobile engine loading. Surface blockers before proceeding.
3. **Repertoire snapshot:** collect data, select twenty branches, establish depth boundaries, and validate all moves.
4. **Coaching content:** author position-specific explanations and check tactical assertions.
5. **Vertical slice:** one line with board, navigation, explanations, and working on-demand engine. Validate on a narrow mobile viewport before scaling content.
6. **Complete tutor:** add all branches, hierarchical selectors, recall mode, hints, and local progress if confirmed.
7. **Validation:** run behavioral tests and browser checks against the actual final HTML and dependency-loading context.
8. **Delivery:** provide the HTML path, preview URL, evidence summary, supported launch method, licenses/source notices, and known limitations.

## Acceptance gates

- Exactly twenty selected Scotch Gambit repertoire branches, each legal through Black’s move twenty; shared prefixes are allowed, but branches must not be duplicates.
- Every half-move has a position-specific coaching takeaway and expandable teaching details.
- Statistical data are real, reproducible from recorded queries, and clearly attributed to Lichess rapid.
- Rating matching is transparently approximate; no exact Chess.com-equivalence claim without evidence.
- Sparse-data and engine-derived tails are explicitly labeled; no fabricated popularity values.
- All navigation produces the correct board position, annotations, and highlights.
- Opening → Family → Line selection works and resets cursor/practice state predictably.
- Recall mode correctly handles legal and illegal input, repertoire answers, hints, and line changes. Test promotions and other special moves where relevant to the rules adapter.
- Stockfish completes a real analysis on the final page, reports evaluation and three lines, supports cancellation, and rejects stale results.
- Verify engine scoring perspective and mate-score presentation.
- Test at narrow phone widths, touch interactions, and desktop size; no horizontal overflow or inaccessible controls.
- Test dependency/engine failure and browser storage failure.
- Confirm licenses, attribution, and engine redistribution/source requirements for the chosen dependencies.
- No offline claim: online dependencies are part of the accepted delivery contract.
- Publish using the existing `preview` helper, not new Funnel routes. Print the final URL and verify the shared Tailscale Serve route remains intact.

## Explicit exclusions

- Additional openings in the first content release.
- Guaranteed offline operation or embedded Stockfish binary.
- Claims of site-wide Chess.com opening statistics.
- Exact cross-platform rating conversion.
- Unbounded continuous engine analysis, free engine sparring, accounts, cloud sync, backend services, or live AI-written explanations. Bounded automatic evaluation was explicitly approved during prototype review.

## Approval checkpoint

Build approval and the public-data collection policy have been received. Preserve the approved layout and teaching emphasis; surface rating-calibration limitations and incomplete editorial work instead of claiming the masterclass-quality content is finished.
