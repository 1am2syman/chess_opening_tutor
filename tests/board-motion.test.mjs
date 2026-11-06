import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { pieceTransitions } from '../src/chess_opening_tutor/board-motion.mjs';

test('single moves slide forwards and backwards; position jumps do not',()=>{
  const board=new Chess(),start=board.fen();board.move('e4');const next=board.fen();
  assert.deepEqual(pieceTransitions(start,next),[['e2','e4']]);
  assert.deepEqual(pieceTransitions(next,start),[['e4','e2']]);
  board.move('e5');assert.deepEqual(pieceTransitions(start,board.fen()),[]);
});
test('castling animates both king and rook in either direction',()=>{
  const board=new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const before=board.fen();board.move('O-O');const after=board.fen();
  assert.deepEqual(pieceTransitions(before,after),[['e1','g1'],['h1','f1']]);
  assert.deepEqual(pieceTransitions(after,before),[['g1','e1'],['f1','h1']]);
});
