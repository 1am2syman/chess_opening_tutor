# Public-data policy

The user approved public downloads instead of a Lichess token. The collection script streams the official monthly standard-rated PGN archive at https://database.lichess.org/ and retains complete games meeting the exact Scotch Gambit move order, with both players rated 1800–2200 and estimated duration `base + 40 × increment` in [480,1500) seconds (Lichess rapid thresholds). Games are read in archive order. Collection stops at 600 qualifying games or 3,000,000 scanned games. This is a bounded chronological convenience sample, **not a random sample or a site-wide opening explorer**. All displayed counts refer only to retained games. Game URLs and metadata are retained for reproducibility; the app does not embed player names.

## Caro–Kann sample and Black repertoire

The Caro collector uses `--opening caro --target 2000` and exact `1.e4 c6` entry. The retained snapshot stopped at 2,000 matches after 1,186,755 scanned games on September 1, with the same rating/time filters as Scotch. Source metadata and games are isolated under `data/caro/`. The move arrays store at most forty plies from complete parsed games; games ending earlier are excluded from later-prefix denominators.

Caro preparation (`--caro`) deliberately seeds supported Advance, Classical Nc3/Nd2, Exchange, Panov, Fantasy, Two Knights and quiet-sideline setups before expanding to twenty branches. These seeds establish coverage, not a global popularity ranking. Later Black choices favor supported sampled engine candidates within 0.40 pawns of the bounded best; White branches follow supported sample replies. Once support drops below three at any selected move, all later moves are labeled engine continuations without percentages. Tests replay all retained games and independently recount each line's first unsupported boundary. No Scotch lessons or accepted editorial entries are used to author Caro.

## Vienna Gambit sample and White repertoire

The Vienna collector uses `--opening vienna --target 1500 --max-games 5000000` with exact entry `1.e4 e5 2.Nc3 Nf6 3.f4`. It uses the same public archive, rating and time-control filters; `data/vienna/public-sample.json` records the actual retained count and stopping reason. The target is a collection limit, not a claim that 1,500 games were retained. This repertoire does not cover alternative Black second moves such as `2...Nc6`.

Preparation (`--vienna`) starts with up to eight Black replies supported by at least three games and requires both `3...d5` and `3...exf4`. White choices favor sampled moves among Stockfish's four candidates within 0.40 pawns of its best, otherwise the engine recommendation. Supported Black replies expand to twenty distinct branches; preparation fails if the sample cannot support that branching. After exact-prefix support drops below three, the complete remaining tail is labeled engine-derived. The sample does not establish site-wide frequencies or the twenty most popular complete games.

Vienna's original explanations are authored and independently reviewed under `scripts/vienna-editorial-brief.md`. Accepted lessons are reused only within Vienna; Scotch and Caro coaching are not its source material. The factual draft generator is shared because legal moves, attack maps and candidate notation are opening-independent; drafts stay visibly marked until replaced by reviewed prose.

## Rating proxy

The ChessGoals survey publisher's current tables at https://chessgoals.com/rating-comparison/ relate both platforms to a Chess.com blitz anchor. The row with Chess.com rapid 1500 corresponds to Lichess rapid 1795; the row with Chess.com rapid 1995 corresponds to Lichess rapid 2165. Rounded outward, a Lichess rapid 1800–2200 band is a practical proxy for the intended Chess.com rapid 1500–2000 audience, not an exact conversion. The publisher reports substantial individual variation (roughly ±115 for Chess.com rapid and ±90 for Lichess rapid in its tables); chaining regressions adds uncertainty. This does not establish equal populations or personal playing strength. Recheck the source when recollecting data.

## Scotch repertoire selection

White choices are fixed repertoire recommendations checked by Stockfish. Black branches are selected by conditional sample counts along that repertoire. Exact-prefix counts avoid conflating transpositions. Support is considered thin below three games. Once a selected line loses that support, continuation moves are explicitly engine-derived; subsequent statistical claims must not be fabricated. A branch's modeled conditional likelihood is not the number of games following its complete twenty-move sequence. The UI must not market this as the twenty most frequent complete games.

## Source and licensing

- Public archives, format, and CC0 release: https://database.lichess.org/
- Rating comparison and methodology: https://chessgoals.com/rating-comparison/
- Explorer's official specification, showing authentication requirement: https://github.com/lichess-org/api/blob/master/doc/specs/tags/openingexplorer/lichess.yaml
- Native line checking: official Stockfish release https://github.com/official-stockfish/Stockfish/releases/tag/sf_19

The initial failed unauthenticated explorer call is not used as data. No token is required by this collection path and no frequency claim may be based on the earlier prototype.
