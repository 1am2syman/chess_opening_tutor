import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { coachStep } from '../src/chess_opening_tutor/coaching.mjs';
let repertoire,sample;
try{repertoire=JSON.parse(readFileSync('data/lessons.json','utf8'));sample=JSON.parse(readFileSync('data/public-sample.json','utf8'));}catch(cause){throw new Error('Build and collect the dataset before testing',{cause});}
function apply(board,uci){return board.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});}
function validateLine(line){assert.equal(line.steps.length,40);const board=new Chess();for(const step of line.steps){assert.equal(board.fen(),step.beforeFen);const move=apply(board,step.uci);assert.equal(move.san,step.san);assert.equal(board.fen(),step.fen);}assert.equal(board.turn(),'w');assert.equal(board.moveNumber(),21);}
test('20 distinct legal forty-ply lines; checker rejects an illegal positive control',()=>{
  assert.equal(repertoire.lines.length,20);assert.equal(new Set(repertoire.lines.map(l=>l.steps.map(s=>s.uci).join(' '))).size,20);
  for(const line of repertoire.lines)validateLine(line);
  const bad=structuredClone(repertoire.lines[0]);bad.steps[0].uci='e2e7';assert.throws(()=>validateLine(bad));
});
test('all statistics are independently counted from the public games and tails are explicit',()=>{
  assert.equal(sample.matchedGames,sample.games.length);assert.equal(sample.scannedGames,3000000);
  for(const game of sample.games){assert.ok(game.ratings.every(r=>r>=1800&&r<=2200));const [base,increment]=game.timeControl.split('+').map(Number);assert.ok(base+40*increment>=480&&base+40*increment<1500);const b=new Chess();for(const uci of game.moves)apply(b,uci);}
  for(const line of repertoire.lines){const path=[];let tail=false;for(const [ply,step] of line.steps.entries()){
    if(ply>=7){const eligible=sample.games.filter(g=>g.moves.length>ply&&path.every((u,i)=>g.moves[i]===u));const count=eligible.filter(g=>g.moves[ply]===step.uci).length;
      if(count<3)tail=true;assert.equal(step.source,tail?'engine-continuation':'sample-supported');
      if(!tail){assert.equal(step.total,eligible.length);assert.equal(step.count,count);}else{assert.equal(step.count,null);assert.equal(step.total,null);}
    }path.push(step.uci);
  }}
});
test('every annotation has a positional question, reasoning and legal engine calculations',()=>{
  const fields=['title','question','takeaway','intent','plan','tactic','theme'];
  for(const line of repertoire.lines)for(const [ply,step] of line.steps.entries()){
    for(const key of fields)assert.ok(step.lesson[key]?.length>=(key==='title'?8:15),`${line.id} ${ply} missing ${key}`);
    for(const [fen,pvs] of [[step.beforeFen,step.before],[step.fen,step.after]])for(const pv of pvs){const board=new Chess(fen);for(const uci of pv.pv.slice(0,8))apply(board,uci);}
    assert.equal(step.lesson.facts.check,new Chess(step.fen).isCheck());
    assert.ok(!/\b[ijkz][1-8]\b|\b[a-h][09]\b/.test(step.lesson.takeaway));
    if(step.lesson.authored!=='astra-reviewed')assert.equal(coachStep(step,ply).takeaway,step.lesson.takeaway);
  }
});
test('rules library supports castling, en passant, promotion, check and checkmate',()=>{
  const castle=new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');assert.equal(castle.move('O-O').san,'O-O');assert.equal(castle.get('f1').type,'r');
  const ep=new Chess();for(const move of ['e4','a6','e5','d5'])ep.move(move);assert.ok(ep.move('exd6').isEnPassant());assert.equal(ep.get('d5'),undefined);
  const promotion=new Chess('8/P7/8/8/8/7k/8/7K w - - 0 1');promotion.move({from:'a7',to:'a8',promotion:'n'});assert.equal(promotion.get('a8').type,'n');
  const mate=new Chess();for(const move of ['f3','e5','g4','Qh4#'])mate.move(move);assert.ok(mate.isCheckmate());
});
