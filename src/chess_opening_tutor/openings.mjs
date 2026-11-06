// Opening identity owns UI language; move roots and sample counts remain snapshot facts.
export const openings = {
  scotch: {
    id: 'scotch', title: 'Scotch Gambit', color: 'w', side: 'White', opponent: 'Black',
    storageKey: 'openboard.scotch.v1', familyPrefix: '4…', familyLabel: 'Black response',
    rootNotation: '1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Bc4',
    selection: 'Twenty branches of common Black responses within a White repertoire; not the twenty most frequent complete games. White favors sampled choices within 0.40 pawns of a top engine candidate, otherwise the engine recommendation.'
  },
  vienna: {
    id: 'vienna', title: 'Vienna Gambit', color: 'w', side: 'White', opponent: 'Black',
    storageKey: 'openboard.vienna.v1', familyPrefix: '', familyLabel: 'Black response',
    rootNotation: '1.e4 e5 2.Nc3 Nf6 3.f4',
    selection: 'Twenty White-repertoire branches cover the central 3…d5 counterstrike, 3…exf4 acceptance and supported declining replies. This entry requires 2…Nf6; other Black second moves are outside the repertoire. Initial replies require at least three retained games; these are not the twenty most frequent complete games. White favors sampled candidates within 0.40 pawns of the bounded engine best, otherwise its recommendation.'
  },
  caro: {
    id: 'caro', title: 'Caro–Kann', color: 'b', side: 'Black', opponent: 'White',
    storageKey: 'openboard.caro.v1', familyPrefix: '', familyLabel: 'White setup',
    rootNotation: '1.e4 c6',
    selection: 'Twenty Black-repertoire branches deliberately cover Advance, Classical Nc3/Nd2, Exchange, Panov, Fantasy, Two Knights and a quiet sideline. Coverage seeds are supported by at least three retained games; this is not a ranking of the twenty most frequent complete games. Subsequent Black choices favor sampled candidates within 0.40 pawns of the bounded engine best, otherwise its recommendation.'
  }
};

export const caroIntroduction = {
  title: 'Challenge the center before choosing a plan',
  question: 'How can Black challenge White’s center without deciding the whole pawn structure at once?',
  takeaway: 'After 1.e4, c6 supports a later d5: Black prepares to question the center rather than copy it. White’s response changes the lesson. An advance, an exchange, and a developing move leave different pawn maps. Learn to recognize that choice before memorizing Black’s next setup.',
  intent: 'The pawn on c6 controls d5 while the c8 bishop is not blocked by an e6 pawn. That leaves options, not a guarantee that the bishop should always develop immediately.',
  plan: 'Compare White’s e5 advance with exd5 and the Nc3/Nd2 setups. In the Panov, the extra c4 pawn challenge makes central exchanges a different calculation. Study the actual branch before choosing a pawn break or a bishop square.',
  tactic: 'Preparing d5 does not settle the exchanges. Check which pieces can recapture, whether a knight is attacked, and whether your king can safely remain in the center. The bounded engine continuations are legal examples, not forced scripts.',
  theme: 'Black’s repertoire is a set of responses to different centers, not one formation to play against everything.',
  authored: 'instructional-introduction'
};

export const viennaIntroduction = {
  title: 'Challenge the center without neglecting your king',
  question: 'What must White gain from advancing the f-pawn, and how can Black challenge that plan?',
  takeaway: 'After 1.e4 e5 2.Nc3 Nf6, White plays f4 to challenge the e5 pawn. Black chooses the kind of struggle: ...d5 strikes back in the center, ...exf4 accepts the pawn, and declining moves keep different tensions alive. Your task is to connect development with those changes while remembering that the f-pawn advance has also loosened your own king’s shelter.',
  intent: 'Nc3 protects e4 and controls d5, allowing White to challenge e5 before developing the kingside knight. The f-pawn move is a commitment: it weakens the e1–h4 diagonal and does not itself open the f-file. White needs useful development and central play to justify it.',
  plan: 'Against ...d5, first resolve the central confrontation and the pressure on e4. After ...exf4, examine whether advancing e5 gains time against Nf6, then develop and make the king safe. Against a decline, reassess the pawn tension before choosing exchanges. These branches need different decisions, not one automatic attacking setup.',
  tactic: 'Before chasing a knight, check every legal retreat and Black’s forcing replies. Before opening the f-file, count which pawns still occupy it. Checks along the weakened king diagonal and counterattacks in the center can matter more than a promising-looking kingside advance.',
  theme: 'The Vienna Gambit asks White to turn a pawn commitment into useful time and central influence. An attack is one possible result; sound development, regained material or a balanced middlegame can also be the right outcome.',
  authored: 'instructional-introduction'
};

export function methodology(data, opening) {
  const meta = data.metadata;
  return [
    `Public Lichess archive: ${meta.scannedGames.toLocaleString()} games scanned; ${meta.matchedGames} exact ${opening.title} games retained. Scanned date range: ${meta.firstScannedDate}–${meta.lastScannedDate}. Stop policy reached: ${meta.stopReason}.`,
    'Both players: Lichess 1800–2200. Rapid estimate: base + 40 × increment between 480 and 1499 seconds. This is an approximate audience proxy for Chess.com rapid 1500–2000, not an exact rating conversion.',
    `A chronological prefix sample, not random or site-wide. Counts require exact move order after ${opening.rootNotation}, exclude transposed entries, and have substantial sampling uncertainty. Support below ${data.supportThreshold} games triggers a labeled engine tail. Retained move records are truncated to forty plies; a game ending earlier cannot contribute a later reply count.`,
    opening.selection,
    'Reviewed original coaching replaces explicitly marked position-derived drafts. Legal moves and engine calculations do not certify explanation quality or complete the qualitative teaching review.',
    'Collected '+meta.collectedAt+'. Native analysis: '+data.engine+'. Live browser scores may differ from these bounded preparation searches.'
  ];
}
