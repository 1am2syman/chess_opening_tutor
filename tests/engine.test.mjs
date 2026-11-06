import test from 'node:test';
import assert from 'node:assert/strict';
import { EngineAdapter, scoreLabel } from '../src/chess_opening_tutor/engine.mjs';

test('UCI adapter discards stale output and orients scores to White',()=>{
  const commands=[],events=[],engine=new EngineAdapter(()=>{});
  engine.worker={postMessage:message=>commands.push(message),terminate:()=>{}};engine.ready=true;
  const whiteFen='8/8/8/8/8/8/4K3/6k1 w - - 0 1',blackFen=whiteFen.replace(' w ',' b ');
  engine.request(whiteFen,result=>events.push(['old',result]));
  engine.request(blackFen,result=>events.push(['new',result]));
  assert.ok(commands.includes('stop'));
  engine.receive('info depth 12 multipv 1 score cp 50 pv e2e3');assert.equal(events.length,0);
  engine.receive('bestmove e2e3');assert.ok(commands.includes('position fen '+blackFen));
  engine.receive('info depth 13 multipv 1 score cp 45 pv g1f1');assert.equal(events.length,1);assert.equal(events[0][0],'new');assert.equal(events[0][1].value,-45);
  engine.pause();engine.receive('info depth 14 multipv 1 score cp 99 pv g1f1');assert.equal(events.length,1);engine.receive('bestmove g1f1');engine.dispose();
});
test('rapid opening changes share one engine download and disposal prevents a late worker',async t=>{
  let downloads=0,finish;
  t.mock.method(globalThis,'fetch',()=>{downloads++;return new Promise(resolve=>{finish=resolve;});});
  const engine=new EngineAdapter(()=>{}),loading=engine.load();
  await engine.load();assert.equal(downloads,1);
  engine.dispose();finish({ok:true,text:async()=>''});await loading;
  assert.equal(engine.worker,null);assert.equal(engine.loading,false);
  await engine.load();assert.equal(downloads,1);
});
test('mate and centipawn score labels preserve sign',()=>{
  assert.equal(scoreLabel({type:'cp',value:80}),'+0.8');assert.equal(scoreLabel({type:'cp',value:-40}),'-0.4');assert.equal(scoreLabel({type:'cp',value:0}),'0.0');assert.equal(scoreLabel({type:'mate',value:3}),'M3');assert.equal(scoreLabel({type:'mate',value:-2}),'-M2');
});
