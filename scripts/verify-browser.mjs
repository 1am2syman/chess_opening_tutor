import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';

const html=await readFile('src/chess_opening_tutor/index.html');
const server=createServer((request,response)=>{response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});response.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:414,height:896}});
const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
const artifactDirectory=process.env.BROWSER_ARTIFACT_DIR||'artifacts';
const evidence=[];
const caro=JSON.parse(await readFile('data/caro/lessons.json','utf8'));
async function chooseOpening(id){
  await page.click('#menu');await page.locator('#openingChoices').evaluate(el=>el.closest('details').open=true);
  await page.click('[data-opening="'+id+'"]');await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.getElementById('drawer').getBoundingClientRect().right<=0);
  assert.equal((await page.evaluate(()=>window.openboard.getState())).opening,id);
}
async function assertHiddenRecall(){
  assert.equal(await page.locator('#lesson').isVisible(),false);
  assert.equal(await page.locator('#engineLines').isVisible(),false);
  assert.equal(await page.locator('#showLines').isDisabled(),true);
  assert.equal(await page.textContent('#evalscore'),'—');
  const state=await page.evaluate(()=>window.openboard.getState());
  const future=await page.locator('#timeline button').allTextContents();
  for(const text of future.slice(state.cursor))assert.match(text,/\?$/);
  assert.equal(await page.textContent('#lineHeading'),'Recall · line '+(state.line+1));
}
try{
  await page.goto(url);await page.waitForSelector('.sq');
  assert.equal(await page.locator('.sq').count(),64);
  const geometry=await page.evaluate(()=>({board:document.getElementById('board').getBoundingClientRect().toJSON(),controls:document.querySelector('.controls').getBoundingClientRect().toJSON(),width:innerWidth,scroll:document.documentElement.scrollWidth,height:innerHeight,bar:document.getElementById('evalbar').getBoundingClientRect().width}));
  assert.ok(geometry.controls.bottom<geometry.height);assert.ok(geometry.board.bottom<geometry.height);assert.ok(geometry.scroll<=geometry.width);assert.equal(geometry.bar,12);evidence.push({iphone11:geometry});
  await mkdir(artifactDirectory,{recursive:true});await page.screenshot({path:artifactDirectory+'/iphone11.png',fullPage:true,animations:'disabled'});
  await page.click('#menu');assert.equal(await page.locator('#menu').getAttribute('aria-expanded'),'true');await page.screenshot({path:artifactDirectory+'/drawer.png',animations:'disabled'});await page.keyboard.press('Escape');
  // Navigate every production branch to its end and back; checks are independent of labels.
  for(let index=0;index<20;index++){
    await page.evaluate(index=>window.openboard.selectLine(index),index);await page.click('#last');
    const state=await page.evaluate(()=>window.openboard.getState());assert.equal(state.cursor,40);assert.equal(state.fen.split(' ')[5],'21');
    await page.click('#first');assert.equal((await page.evaluate(()=>window.openboard.getState())).cursor,0);
  }
  evidence.push('All twenty branches navigate to move 20 and the initial position.');
  await page.evaluate(()=>window.openboard.selectLine(0));await page.click('#practice');
  await assertHiddenRecall();
  await page.click('[data-square="e2"]');await page.click('[data-square="e5"]');assert.match(await page.textContent('#feedback'),/not legal/);
  await page.click('[data-square="d2"]');await page.click('[data-square="d4"]');assert.match(await page.textContent('#feedback'),/legal alternative/);assert.equal((await page.evaluate(()=>window.openboard.getState())).cursor,0);
  await page.click('[data-square="e2"]');await page.click('[data-square="e4"]');assert.match(await page.textContent('#feedback'),/Yes/);await page.click('#continue');assert.equal((await page.evaluate(()=>window.openboard.getState())).cursor,2);
  await page.click('#hint');assert.ok((await page.textContent('#feedback')).length>10);await page.click('#reveal');assert.equal((await page.evaluate(()=>window.openboard.getState())).cursor,3);
  for(let turn=2;turn<20;turn++){await page.click('#continue');await page.click('#reveal');}await page.click('#continue');assert.equal((await page.evaluate(()=>window.openboard.getState())).cursor,40);assert.match(await page.textContent('#practiceTitle'),/complete/);
  evidence.push('Recall handles illegal moves, legal alternatives, correct answers, hints, reveal and full-line completion.');
  await page.click('#study');await page.click('#first');await page.keyboard.press('ArrowRight');assert.equal((await page.evaluate(()=>window.openboard.getState())).cursor,1);
  await page.evaluate(()=>window.openboard.selectLine(0));
  await page.waitForFunction(()=>/complete/.test(document.getElementById('evalstatus').textContent),null,{timeout:60000});
  const firstEngine=await page.textContent('#evalstatus');const firstScore=await page.textContent('#evalscore');assert.match(firstScore,/^[+-]?\d+\.\d$|^-?M\d+$/);
  await page.click('#next');await page.waitForFunction(()=>/complete/.test(document.getElementById('evalstatus').textContent),null,{timeout:20000});
  const secondScore=await page.textContent('#evalscore');assert.match(secondScore,/^[+-]?\d+\.\d$|^-?M\d+$/);
  await page.click('#showLines');for(const row of await page.locator('.pv span').allTextContents())assert.ok(!/Waiting/.test(row));
  evidence.push({engine:firstEngine,firstScore,secondScore});
  // Rapid navigation must end with analysis belonging to the final board.
  await page.click('#next');await page.click('#prev');await page.click('#next');await page.waitForFunction(()=>/complete/.test(document.getElementById('evalstatus').textContent),null,{timeout:20000});
  await page.click('#flip');assert.ok(await page.locator('#evalbar').evaluate(el=>el.classList.contains('flipped')));await page.click('#flip');
  await page.click('#menu');await page.uncheck('#liveToggle');await page.keyboard.press('Escape');assert.match(await page.textContent('#evalstatus'),/paused/);
  await page.reload();await page.waitForSelector('.sq');assert.match(await page.textContent('#evalstatus'),/paused/);evidence.push('Live engine verifies real output, new positions, rapid changes, flip and persisted pause.');
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:artifactDirectory+'/desktop.png',fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:375,height:667});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  // Opening selection is exercised through the drawer, not a test-only setter.
  const scotchSaved=await page.evaluate(()=>localStorage.getItem('openboard.scotch.v1'));
  assert.equal(JSON.parse(scotchSaved).learned['scotch-1'].length,1);
  await chooseOpening('caro');
  assert.match(await page.title(),/Caro–Kann/);assert.equal(await page.textContent('#bottomPlayer'),'You · Black');
  assert.equal(await page.textContent('#familyType'),'White setup');
  assert.match(await page.textContent('#methodology'),/2,000|2000/);assert.match(await page.textContent('#methodology'),/1\.e4 c6/);
  assert.doesNotMatch(await page.textContent('#methodology'),/Scotch|4\.Bc4/);
  assert.equal((await page.evaluate(()=>window.openboard.getState())).cursor,2);
  if(caro.editorial.reviewedLessons===0)assert.match(await page.textContent('#lessonStatus'),/Draft/);
  await page.click('#first');assert.match(await page.textContent('#takeaway'),/c6 supports a later d5/);
  for(let index=0;index<20;index++){
    await page.evaluate(index=>window.openboard.selectLine(index),index);await page.click('#last');
    assert.equal((await page.evaluate(()=>window.openboard.getState())).fen,caro.lines[index].steps[39].fen);
    await page.click('#first');assert.equal((await page.evaluate(()=>window.openboard.getState())).cursor,0);
  }
  // Live analysis survives switching from a paused Scotch opening to active Caro.
  await page.evaluate(()=>window.openboard.selectLine(0));
  await page.waitForFunction(()=>/complete/.test(document.getElementById('evalstatus').textContent),null,{timeout:60000});
  assert.match(await page.textContent('#evalscore'),/^[+-]?\d+\.\d$|^-?M\d+$/);
  await page.click('#showLines');assert.equal(await page.locator('#engineLines').isVisible(),true);
  // Capture actual Web Animations API calls, including auto White opening and replies.
  await page.evaluate(()=>{window.recordedAnimations=[];const animate=Element.prototype.animate;Element.prototype.animate=function(...args){window.recordedAnimations.push({square:this.parentElement?.dataset.square,duration:args[1]?.duration});return animate.apply(this,args);};});
  await page.click('#first');
  const originalQuestion=await page.evaluate(()=>{const lesson=window.OPENBOARD_DATA.caro.lines[0].steps[1].lesson;const question=lesson.question;lesson.question='Spoiler canary: play c6 from c7 now';return question;});
  await page.click('#practice');assert.doesNotMatch(await page.textContent('#practiceQuestion'),/Spoiler canary|c6|c7/);
  await page.evaluate(question=>{window.OPENBOARD_DATA.caro.lines[0].steps[1].lesson.question=question;},originalQuestion);
  assert.equal((await page.evaluate(()=>window.openboard.getState())).cursor,1);
  assert.equal((await page.evaluate(()=>window.openboard.getState())).fen,caro.lines[0].steps[0].fen);
  assert.match(await page.textContent('#practiceSide'),/Black/);await assertHiddenRecall();
  assert.doesNotMatch(await page.textContent('#practiceQuestion'),/\bc6\b/);
  await page.click('[data-square="e2"]');assert.equal(await page.locator('.sq.selected').count(),0);
  await page.click('[data-square="c7"]');await page.click('[data-square="c4"]');assert.match(await page.textContent('#feedback'),/not legal/);
  await page.click('[data-square="c7"]');await page.click('[data-square="c5"]');assert.match(await page.textContent('#feedback'),/legal alternative/);
  assert.equal((await page.evaluate(()=>window.openboard.getState())).cursor,1);
  await page.click('[data-square="c7"]');await page.click('[data-square="c6"]');assert.match(await page.textContent('#feedback'),/Yes/);
  assert.equal((await page.evaluate(()=>window.openboard.getState())).cursor,2);
  assert.match(await page.textContent('#savedProgress'),/1 \/ 20 Black/);
  await page.click('#continue');assert.equal((await page.evaluate(()=>window.openboard.getState())).fen,caro.lines[0].steps[2].fen);await assertHiddenRecall();
  await page.click('#hint');assert.ok((await page.textContent('#feedback')).length>10);await page.click('#reveal');
  assert.equal((await page.evaluate(()=>window.openboard.getState())).cursor,4);
  for(let turn=2;turn<20;turn++){await page.click('#continue');await assertHiddenRecall();await page.click('#reveal');}
  await page.click('#continue');assert.equal((await page.evaluate(()=>window.openboard.getState())).complete,true);
  assert.equal((await page.evaluate(()=>window.openboard.getState())).cursor,40);assert.match(await page.textContent('#practiceTitle'),/complete/);
  assert.match(await page.textContent('#savedProgress'),/1 \/ 20 Black/);
  const animations=await page.evaluate(()=>window.recordedAnimations);assert.ok(animations.some(a=>a.square==='e4'&&a.duration===280));assert.ok(animations.some(a=>a.square==='c6'&&a.duration===280));assert.ok(animations.some(a=>a.square===caro.lines[0].steps[2].uci.slice(2,4)));
  assert.equal(await page.evaluate(()=>localStorage.getItem('openboard.scotch.v1')),scotchSaved);
  const caroSaved=await page.evaluate(()=>localStorage.getItem('openboard.caro.v1'));
  assert.deepEqual(JSON.parse(caroSaved).learned['caro-1'],[2]);
  await page.reload();await page.waitForSelector('.sq');assert.equal((await page.evaluate(()=>window.openboard.getState())).opening,'caro');assert.match(await page.textContent('#savedProgress'),/1 \/ 20 Black/);
  // Last Black move is independently recallable and persists as ply 40 (even parity).
  await page.click('#practice');
  for(let turn=0;turn<19;turn++){await page.click('#reveal');await page.click('#continue');}
  const last=caro.lines[0].steps[39];await page.click('[data-square="'+last.uci.slice(0,2)+'"]');await page.click('[data-square="'+last.uci.slice(2,4)+'"]');
  if(last.uci[4])await page.getByRole('button',{name:({q:'queen',r:'rook',b:'bishop',n:'knight'})[last.uci[4]],exact:true}).click();
  await page.click('#continue');assert.match(await page.textContent('#savedProgress'),/2 \/ 20 Black/);
  await page.reload();await page.waitForSelector('.sq');assert.match(await page.textContent('#savedProgress'),/2 \/ 20 Black/);
  await chooseOpening('scotch');assert.equal(await page.textContent('#bottomPlayer'),'You · White');assert.equal(await page.evaluate(()=>localStorage.getItem('openboard.scotch.v1')),scotchSaved);
  assert.match(await page.textContent('#savedProgress'),/1 \/ 20 White/);assert.match(await page.textContent('#evalstatus'),/paused/);
  await chooseOpening('caro');await page.click('#menu');await page.click('#clearProgress');await page.keyboard.press('Escape');assert.match(await page.textContent('#savedProgress'),/0 \/ 20 Black/);
  await chooseOpening('scotch');assert.match(await page.textContent('#savedProgress'),/1 \/ 20 White/);
  // Switching mid-recall clears selections/feedback and restores the other opening's cursor.
  await page.click('#practice');await page.click('[data-square="e2"]');await chooseOpening('caro');assert.equal(await page.locator('.sq.selected').count(),0);assert.equal((await page.evaluate(()=>window.openboard.getState())).mode,'study');
  await page.setViewportSize({width:414,height:896});await page.evaluate(()=>window.openboard.selectLine(0));
  const caroGeometry=await page.evaluate(()=>({board:document.getElementById('board').getBoundingClientRect().toJSON(),controls:document.querySelector('.controls').getBoundingClientRect().toJSON(),width:innerWidth,scroll:document.documentElement.scrollWidth,height:innerHeight}));
  assert.ok(caroGeometry.controls.bottom<caroGeometry.height);assert.ok(caroGeometry.scroll<=caroGeometry.width);
  await page.screenshot({path:artifactDirectory+'/caro-iphone11.png',fullPage:true,animations:'disabled'});
  evidence.push({caro:'All twenty lines; drawer switch; automatic White opening/replies; Black illegal/alternative/correct recall; no engine/timeline spoilers; hints, reveal, completion, even-ply progress reload and independent clear; live engine; real move animations.',caroGeometry,animationCount:animations.length});
  // Failure context: block engine fetch and make storage throw.
  const fail=await browser.newContext({viewport:{width:414,height:896}});await fail.route('**/stockfish@*/**',route=>route.abort());
  await fail.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked');}});});
  const fallback=await fail.newPage();await fallback.goto(url);await fallback.waitForSelector('.sq');await fallback.waitForFunction(()=>/could not load/.test(document.getElementById('evalstatus').textContent));await fallback.click('#next');assert.equal(await fallback.locator('.sq').count(),64);await fallback.click('#menu');assert.match(await fallback.textContent('#storageStatus'),/unavailable/);
  await fallback.keyboard.press('Escape');await fallback.click('#practice');await fallback.click('[data-square="e2"]');await fallback.click('[data-square="e4"]');
  await fallback.click('#menu');await fallback.locator('#openingChoices').evaluate(el=>el.closest('details').open=true);await fallback.click('[data-opening="caro"]');await fallback.click('[data-opening="scotch"]');await fallback.keyboard.press('Escape');
  assert.match(await fallback.textContent('#savedProgress'),/1 \/ 20 White/);await fail.close();
  evidence.push('Engine and storage failures leave the chessboard and navigation usable.');
  assert.deepEqual(errors,[]);await writeFile(artifactDirectory+'/browser-evidence.json',JSON.stringify(evidence,null,2));console.log('BROWSER_VERIFIED_OK');console.log(JSON.stringify(evidence,null,2));
}finally{await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
