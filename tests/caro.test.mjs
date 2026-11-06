import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';
import { caroDraft } from '../src/chess_opening_tutor/caro-coaching.mjs';
import { openings, methodology } from '../src/chess_opening_tutor/openings.mjs';

const load=path=>JSON.parse(readFileSync(path,'utf8'));
const compiled=load('data/caro/lessons.json'), source=load('data/caro/repertoire.json'), sample=load('data/caro/public-sample.json');
const accepted=existsSync('data/caro/editorial/accepted.json')?load('data/caro/editorial/accepted.json'):{lessons:{},lines:{}};
const fields=['title','question','takeaway','intent','plan','tactic','theme','alternativeNote'];
function play(board,uci){return board.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});}
function legalLine(line){
  assert.equal(line.steps.length,40);const board=new Chess();
  for(const step of line.steps){assert.equal(board.fen(),step.beforeFen);assert.equal(play(board,step.uci).san,step.san);assert.equal(board.fen(),step.fen);}
  assert.equal(board.turn(),'w');assert.equal(board.moveNumber(),21);
}
function recount(line){
  const path=[];let boundary=null;
  for(const [ply,step] of line.steps.entries()){
    if(ply<2){assert.equal(step.source,'opening-prefix');assert.equal(step.count,0);assert.equal(step.total,0);}
    else {
      const eligible=sample.games.filter(game=>game.moves.length>ply&&path.every((uci,index)=>game.moves[index]===uci));
      const count=eligible.filter(game=>game.moves[ply]===step.uci).length;
      if(count<3&&boundary===null)boundary=ply;
      assert.equal(step.source,boundary===null?'sample-supported':'engine-continuation');
      assert.equal(step.count,boundary===null?count:null);assert.equal(step.total,boundary===null?eligible.length:null);
    }
    path.push(step.uci);
  }
  assert.equal(line.engineFromPly,boundary);
}

test('Caro has twenty distinct legal forty-ply Black lines and all eight core setup families',()=>{
  assert.equal(source.repertoireColor,'b');assert.equal(compiled.lines.length,20);
  assert.equal(new Set(compiled.lines.map(line=>line.steps.map(s=>s.uci).join(' '))).size,20);
  assert.deepEqual([...new Set(compiled.lines.map(line=>line.family))].sort(),['Advance','Classical Nc3','Classical Nd2','Exchange','Fantasy','Panov','Quiet sideline','Two Knights'].sort());
  for(const line of compiled.lines){
    legalLine(line);const moves=line.steps.map(s=>s.san);
    assert.deepEqual(line.steps.slice(0,2).map(s=>s.uci),['e2e4','c7c6']);
    const family=moves[2]==='d4'?({e5:'Advance',Nc3:'Classical Nc3',Nd2:'Classical Nd2',f3:'Fantasy'}[moves[4]]||(moves[6]==='c4'?'Panov':'Exchange')):moves[2]==='Nc3'?'Two Knights':'Quiet sideline';
    assert.equal(line.family,family);
    const seedLength=['Panov','Exchange'].includes(family)?7:5;
    const seed=line.steps.slice(0,seedLength).map(s=>s.uci);
    assert.ok(sample.games.filter(game=>seed.every((uci,index)=>game.moves[index]===uci)).length>=3);
    assert.deepEqual(line.steps.map(({lesson,...step})=>step),source.lines.find(item=>item.id===line.id).steps);
  }
  const bad=structuredClone(compiled.lines[0]);bad.steps[1].uci='c7c3';assert.throws(()=>legalLine(bad));
});
test('Caro source filters, every public game and every boundary independently recount truthfully',()=>{
  assert.equal(sample.games.length,2000);assert.equal(sample.matchedGames,sample.games.length);
  assert.equal(sample.scannedGames,1186755);assert.equal(sample.stopReason,'target-matches');
  assert.match(sample.source,/^https:\/\/database\.lichess\.org\/standard\/lichess_db_standard_rated_2026-09\.pgn\.zst$/);
  assert.equal(sample.license,'CC0');assert.ok(sample.collectedAt);assert.ok(sample.archiveETag);
  assert.equal(sample.firstScannedDate,'2026.09.01');assert.equal(sample.lastScannedDate,'2026.09.01');
  assert.deepEqual(sample.filters.rootUCI,['e2e4','c7c6']);assert.equal(sample.limitations.length,4);
  assert.equal(new Set(sample.games.map(g=>g.url)).size,2000);
  for(const game of sample.games){
    assert.deepEqual(game.moves.slice(0,2),sample.filters.rootUCI);assert.equal(game.date,'2026.09.01');
    assert.ok(game.ratings.every(r=>r>=1800&&r<=2200));const [base,increment]=game.timeControl.split('+').map(Number);assert.ok(base+40*increment>=480&&base+40*increment<1500);
    assert.ok(game.moves.length<=40);const board=new Chess();for(const uci of game.moves)play(board,uci);
  }
  for(const line of compiled.lines)recount(line);
  const bad=structuredClone(compiled.lines[0]);bad.steps[2].count++;assert.throws(()=>recount(bad));
  const badBoundary=structuredClone(compiled.lines[0]);badBoundary.engineFromPly++;assert.throws(()=>recount(badBoundary));
  assert.deepEqual(compiled.metadata,source.metadata);const {games,...metadata}=sample;assert.deepEqual(source.metadata,metadata);
  const text=methodology(compiled,openings.caro).join(' ');assert.match(text,/chronological prefix sample/);assert.match(text,/not a ranking/);assert.match(text,/transposed/);assert.match(text,/truncated to forty plies/);
});
test('Caro baseline is position-specific and legal, never Scotch coaching; accepted overrides are exact',()=>{
  assert.match(compiled.introduction.takeaway,/c6 supports a later d5/);
  assert.doesNotMatch(compiled.introduction.takeaway,/gambit/i);
  for(const line of compiled.lines)for(const step of line.steps){
    const key=step.beforeFen+' '+step.uci,base=caroDraft(step),reviewed=accepted.lessons[key];
    assert.equal(base.facts.check,new Chess(step.fen).isCheck());
    assert.ok(base.takeaway.includes(step.uci.slice(0,2)));assert.ok(base.takeaway.includes(step.uci.slice(2,4)));
    assert.doesNotMatch(base.question,/\b[a-h][1-8]\b/);assert.doesNotMatch(JSON.stringify(base),/Scotch|gambit/i);
    for(const field of fields)assert.ok(step.lesson[field].length>=(field==='title'?8:15));
    for(const [fen,pvs] of [[step.beforeFen,step.before],[step.fen,step.after]])for(const pv of pvs){const board=new Chess(fen);for(const uci of pv.pv.slice(0,8))play(board,uci);}
    if(reviewed){assert.equal(step.lesson.authored,'astra-reviewed');assert.equal(step.lesson.model,'cliproxyapi/gpt-6-astra');assert.equal(step.lesson.effort,'high');for(const field of fields)assert.equal(step.lesson[field],reviewed[field]);}
    else assert.deepEqual(step.lesson,base);
  }
  for(const [id,status] of Object.entries(accepted.lines)){assert.equal(status.status,'accepted');const line=compiled.lines.find(line=>line.id===id);assert.ok(line);for(const step of line.steps)assert.ok(accepted.lessons[step.beforeFen+' '+step.uci]);}
  const takeaways=Object.values(accepted.lessons).map(l=>l.takeaway);assert.equal(new Set(takeaways).size,takeaways.length);
  assert.equal(compiled.editorial.reviewedLessons,Object.keys(accepted.lessons).length);assert.equal(compiled.editorial.acceptedLines,Object.keys(accepted.lines).length);
  assert.equal(compiled.editorial.totalUniqueLessons,new Set(compiled.lines.flatMap(l=>l.steps.map(s=>s.beforeFen+' '+s.uci))).size);
});
test('single HTML embeds both complete datasets and retains all 609 Scotch reviewed lessons',()=>{
  const html=readFileSync('src/chess_opening_tutor/index.html','utf8');
  const data=JSON.parse(html.match(/window\.OPENBOARD_DATA=(.*?);<\/script>/s)[1]);
  assert.deepEqual(data.caro,compiled);assert.deepEqual(data.scotch,load('data/lessons.json'));
  assert.equal(Object.keys(load('data/editorial/accepted.json').lessons).length,609);
  assert.notEqual(openings.scotch.storageKey,openings.caro.storageKey);
});
