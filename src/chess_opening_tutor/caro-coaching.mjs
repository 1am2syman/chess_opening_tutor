import { Chess } from 'chess.js';

// Preserve the existing Caro draft contract; all board facts are opening-independent.
export const caroDraft = positionDraft;

const names = {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
function play(board, uci) {
  return board.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});
}
function variation(fen, pv) {
  const board = new Chess(fen);
  return pv.slice(0,4).map(uci => {
    const prefix = board.moveNumber()+(board.turn()==='w'?'.':'…');
    return prefix+play(board,uci).san;
  }).join(' ');
}

// A factual baseline, deliberately not simulated expert coaching. Never calls Scotch coachStep.
export function positionDraft(step, openingTitle = 'Caro–Kann') {
  const before = new Chess(step.beforeFen), after = new Chess(step.fen);
  const move = play(new Chess(step.beforeFen),step.uci);
  const side = move.color==='w'?'White':'Black', other = move.color==='w'?'b':'w';
  const centralControl = ['d4','e4','d5','e5'].filter(square=>after.attackers(square,move.color).includes(move.to));
  const underAttack = after.isAttacked(move.to,other);
  const attackers = after.attackers(move.to,other);
  const pawnMap = after.board().flat().filter(piece=>piece?.type==='p').map(piece=>(piece.color==='w'?'White ':'Black ')+piece.square).join(', ');
  const candidate = step.before.find(p=>p.pv[0]!==step.uci);
  const calculation = variation(step.fen,step.after[0]?.pv || []);
  const alternative = candidate?variation(step.beforeFen,candidate.pv):null;
  const change = `${side} moves the ${names[move.piece]} from ${move.from} to ${move.to}.`;
  const capture = move.captured ? ` It captures a ${names[move.captured]}${move.isEnPassant()?' en passant':' on '+move.to}.` : '';
  const check = after.isCheck();
  return {
    title: `Draft · ${side} ${move.san}: inspect the change`,
    // Pre-move facts only: no SAN, source/destination, or after-position clues.
    question: before.isCheck() ? `${side} is in check. Which legal response also helps the position after the king’s immediate problem is solved?` : `${side} to move. Compare the central pawn tension and king safety before choosing a candidate; what needs attention first?`,
    takeaway: `${change}${capture} ${check?'The resulting position is check; the opponent must make a legal evasion.':'The resulting position is not check.'} ${centralControl.length?'The moved piece attacks these central squares: '+centralControl.join(', ')+'.':'The moved piece does not directly attack d4, e4, d5 or e5 from its new square.'} These are board facts, not a reviewed explanation of why this move was chosen.`,
    intent: `Draft facts, not an inferred intention: ${change}${capture} ${move.isKingsideCastle()||move.isQueensideCastle()?'Castling also relocates the rook.':'Compare the before and after positions before assigning a strategic purpose.'}`,
    plan: `Use this legal bounded engine candidate as a calculation exercise: ${calculation || 'no continuation supplied'}. It is not a forced reply sequence or a promise of an advantage. Pawn map after the move: ${pawnMap}.`,
    tactic: underAttack ? `The ${names[move.piece]} on ${move.to} is attacked from ${attackers.join(', ')}. Attack maps alone do not prove a piece is lost: calculate legal captures and recaptures.` : `No enemy piece currently attacks the moved piece on ${move.to}. That fact alone does not establish safety or rule out a tactic elsewhere. Check the supplied candidate continuation.`,
    theme: openingTitle+' draft: compare the actual central structure and available exchanges. A reviewed original lesson will explain how this decision fits this particular branch; this baseline does not claim that work is complete.',
    calculation, alternative,
    alternativeNote: alternative?'This is a different legal engine candidate from the same starting position. Compare the resulting positions; a bounded ranking does not make the alternative a mistake.':'No different engine candidate was supplied here. Do not invent a variation; compare legal choices in Study.',
    highlights:[move.from,move.to], authored:'position-derived-draft',
    facts:{check,capture:move.captured||null,underAttack,centralControl}
  };
}
