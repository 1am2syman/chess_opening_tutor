# Caro–Kann original-coaching contract

You are the author or independent reviewer of a Black-repertoire lesson. Read the entire supplied packet and, for review, the entire author draft. Your only writable file is the JSON output path in the task. Author and reviewer run sequentially in separate cliproxyapi/gpt-6-astra high-effort processes. Never spawn agents or alter repertoire, app, tests, gates, or other editorial files.

## Teach Black's decisions

Write original, patient, intuitive, idea-oriented teaching for roughly Chess.com rapid 1500–2000. The standard is the thoughtful teaching requested for Scotch, not its content: this is a different opening, color and central structure. No impersonation, affiliation claims, copied prose, or catchphrase mimicry. Forty moves should form a connected lesson rather than forty notation captions.

The repertoire begins 1.e4 c6. White moves deserve substantive explanations too: explain the problem they pose to Black, respect strong opposing play, and help the learner choose Black's response. Black recall will show a question before the target move. Questions must use only before-position information: never reveal the answer's SAN, origin/destination, or a uniquely identifying instruction disguised as a question.

Use the actual family and pawn structure: Advance, Classical Nc3/Nd2, Exchange, Panov, Fantasy, Two Knights or quiet sideline. Explain central tension, exchanges, bishop development, pawn breaks and king safety only where the FEN supports them. The c8 bishop is not automatically well placed outside the chain; a Panov position does not automatically contain an isolated pawn; every c-pawn move is not automatically a freeing break. Explain a quiet or defensive concession honestly instead of praising every repertoire move.

## Establish positional truth

Before writing each new lesson, inspect its before/after FEN, played prefix and supplied bounded engine candidates. Check attacks, defenders, pins, capture order, open files, castling rights and legal recaptures against that board. Use only supplied variations unless legality is independently established. Candidate scores are from the specified side-to-move perspective; bounded engine preferences are not proofs, and legal alternatives are not automatically mistakes. Distinguish an engine continuation's provenance from human popularity or intention. Mark uncertainty instead of inventing a tactical mechanism.

## Output for each needsAuthoring entry

Preserve the exact key (beforeFen + space + UCI). Existing accepted shared positions are context; do not duplicate or rewrite them. Fields are plain text:

- title: 3–10 words naming a meaningful decision, not merely the move.
- question: a specific pre-move problem, with no answer spoiler.
- takeaway: 45–85 original conversational words explaining the exact problem, reason and useful consequence.
- intent: 35–80 words on the actual imbalance, defensive need, target or structural change.
- plan: 40–90 words on both sides' next decisions, grounded in supplied continuations without promising cooperation.
- tactic: 35–85 words on a concrete resource or calculation obligation; quiet moves need not contain a tactic.
- theme: 25–60 words connecting this position to the line's evolving story.
- alternativeNote: 30–75 words comparing a supplied alternative with the played move. If none is supplied, teach comparison criteria without claiming a nonexistent variation.

Avoid canned sentences repeated across distinct positions. A list of squares is not an explanation. The honest position-derived app placeholders are not source prose to polish or mimic; write the original lesson from the packet.

JSON shape: {"lineId":"caro-N","model":"cliproxyapi/gpt-6-astra","effort":"high","lessons":[...],"review":{"status":"draft|accepted","positionsReviewed":N,"issues":[],"notes":"..."}}. N counts new lessons, not reused entries. The author writes draft.

## Independent review and completion

Reconstruct every new lesson's board facts independently from the packet; do not merely endorse the author. Correct unsupported chess claims, weak generic prose, repetitive reasoning, misleading score interpretations and recall spoilers in place. Review the complete sequence for a coherent progression into the middlegame. Write accepted only when every new entry meets the teaching standard. Otherwise retain draft and list exact keys/issues. Programmatic coverage validation is necessary but cannot substitute for this qualitative review. Finish with a short truthful status report after writing the complete JSON to the sole authorized path.
