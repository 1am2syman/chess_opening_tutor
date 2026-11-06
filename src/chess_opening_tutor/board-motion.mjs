import { Chess } from 'chess.js';

// Animate only a single legal move, not unrelated positions or line jumps.
export function pieceTransitions(beforeFen, afterFen) {
  if (!beforeFen || beforeFen === afterFen) return [];
  for (const [fromFen, toFen, reverse] of [[beforeFen, afterFen, false], [afterFen, beforeFen, true]]) {
    const board = new Chess(fromFen);
    for (const move of board.moves({ verbose: true })) {
      board.move(move);
      const matches = board.fen() === toFen;
      board.undo();
      if (!matches) continue;
      const pairs = [[move.from, move.to]];
      if (move.flags.includes('k')) pairs.push(['h' + move.from[1], 'f' + move.from[1]]);
      if (move.flags.includes('q')) pairs.push(['a' + move.from[1], 'd' + move.from[1]]);
      return reverse ? pairs.map(([from, to]) => [to, from]) : pairs;
    }
  }
  return [];
}

export function animatePieces(boardElement, previous, fen, flipped) {
  const next = { fen, flipped, positions: new Map() };
  for (const image of boardElement.querySelectorAll('.sq img')) {
    next.positions.set(image.parentElement.dataset.square, image.getBoundingClientRect());
  }
  if (!previous || previous.flipped !== flipped || matchMedia('(prefers-reduced-motion: reduce)').matches) return next;
  for (const [from, to] of pieceTransitions(previous.fen, fen)) {
    const old = previous.positions.get(from);
    const image = boardElement.querySelector(`[data-square="${to}"] img`);
    const target = next.positions.get(to);
    if (!old || !image || !target) continue;
    image.style.position = 'relative';
    image.style.zIndex = '3';
    const motion = image.animate([
      { transform: `translate(${old.left - target.left}px, ${old.top - target.top}px)` },
      { transform: 'translate(0, 0)' }
    ], { duration: 280, easing: 'cubic-bezier(.25,.1,.25,1)' });
    motion.onfinish = () => { image.style.zIndex = ''; };
  }
  return next;
}
