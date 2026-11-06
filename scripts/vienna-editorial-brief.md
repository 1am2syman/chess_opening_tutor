# Vienna Gambit original-coaching contract

Author and independent reviewer work sequentially in separate cliproxyapi/gpt-6-astra high-effort processes. Read the entire packet and, for review, the entire author draft. Write only the JSON output specified by the runner. Do not change the repertoire, application, tests, other editorial files, or launch agents.

## Teach the actual Vienna decisions

Teach White's repertoire beginning 1.e4 e5 2.Nc3 Nf6 3.f4 for a roughly Chess.com rapid 1500–2000 audience. This scope does not promise a complete Vienna repertoire against 2...Nc6 or other second moves. Explain Black's replies seriously: 3...d5 is a principled central counterstrike, not a trap to punish. After 3...exf4, e5 can attack Nf6, but every claim about a retreat, check or trapped knight must be supported by the actual board and supplied continuation. Against ...d6 or ...Nc6, do not import the accepted-gambit story into an unchanged central structure.

The f-pawn advance challenges e5 but weakens White's king cover and the e1–h4 diagonal. It does not open the entire f-file while a white pawn remains there. Nc3 supports e4 and influences d5; it does not develop the kingside or make castling immediately available. Explain when White should recover material, retain tension, play in the center, simplify, or finish development. Do not praise an attack that the position does not justify.

Every move, including Black's moves, needs a substantive explanation. Name the problem, mechanism and practical consequence, connecting each position to the line's evolving story. Preserve sensible opposing resources and admit quiet choices, structural concessions and uncertainty. Do not recycle Scotch or Caro prose, imitate a named teacher, claim affiliation, or use repeated generic paragraphs.

## Position truth and shared lessons

For each new entry inspect before/after FEN, played prefix and supplied legal engine candidates. Reconstruct piece placement, attacks, defenders, pins, open files, castling rights and capture order. Candidate scores are from the stated side-to-move perspective; compare them on that basis. Bounded analysis is not proof of perfect play. Use supplied continuations; do not invent unverified move sequences or assert that legal alternatives lose without concrete support.

Accepted shared positions are context only. Do not duplicate them. A lesson may appear in several branches: describe future choices conditionally, not as a promise that every branch follows the author's particular line. Do not attribute human popularity to engine-derived tails.

## Output

Copy each position key verbatim, including all FEN fields and the UCI suffix. Write one lesson per needsAuthoring entry, and no others. Plain text fields:

- title: 3–10 words naming the decision.
- question: specific pre-move problem; no answer SAN, origin/destination or disguised unique move instruction.
- takeaway: 45–85 original words explaining the problem, reason and useful consequence.
- intent: 35–80 words on the actual target, imbalance, defensive need or structural change.
- plan: 40–90 words explaining both sides' next decisions from supplied continuations without promising cooperation.
- tactic: 35–85 words explaining a concrete resource or calculation obligation. A quiet move need not contain a tactic.
- theme: 25–60 words connecting the position to the line's evolving story.
- alternativeNote: 30–75 words comparing a supplied alternative honestly; when absent, explain comparison criteria without inventing a variation.

JSON: {"lineId":"vienna-N","model":"cliproxyapi/gpt-6-astra","effort":"high","lessons":[...],"review":{"status":"draft|accepted","positionsReviewed":N,"issues":[],"notes":"..."}}. N is the number of newly authored positions. Author writes draft.

## Independent review

Reconstruct every new position independently. Correct inaccurate board facts, unsupported strategic claims, broken capture sequences, generic prose, repeated reasoning, answer spoilers and score interpretation. Review the line as a connected lesson and check that shared-position explanations remain useful in all branches. Write accepted only when all new entries meet the chess and teaching standard; otherwise leave draft and identify exact keys/issues. Automated validation by the parent is separate and cannot establish explanation quality. Finish with a short truthful status after writing the complete JSON.
