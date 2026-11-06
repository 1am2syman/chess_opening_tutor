import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';

const html = await readFile('src/chess_opening_tutor/index.html');
let vienna;
try { vienna = JSON.parse(await readFile('data/vienna/lessons.json', 'utf8')); }
catch (cause) { throw new Error('Build Vienna before browser verification', { cause }); }
const server = createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 414, height: 896 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const state = () => page.evaluate(() => window.openboard.getState());
async function choose(id) {
  await page.click('#menu');
  await page.locator('#openingChoices').evaluate(element => element.closest('details').open = true);
  await page.click(`[data-opening="${id}"]`);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('drawer').getBoundingClientRect().right <= 0);
  assert.equal((await state()).opening, id);
}
async function hidden() {
  assert.equal(await page.locator('#lesson').isVisible(), false);
  assert.equal(await page.locator('#engineLines').isVisible(), false);
  assert.equal(await page.locator('#showLines').isDisabled(), true);
  assert.equal(await page.textContent('#evalscore'), '—');
  assert.match(await page.textContent('#lineHeading'), /^Recall/);
  const current = await state();
  for (const text of (await page.locator('#timeline button').allTextContents()).slice(current.cursor)) assert.match(text, /\?$/);
}
async function answer(uci) {
  await page.click(`[data-square="${uci.slice(0, 2)}"]`);
  await page.click(`[data-square="${uci.slice(2, 4)}"]`);
  if (uci[4]) await page.getByRole('button', { name: { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' }[uci[4]], exact: true }).click();
}
try {
  await page.goto('http://127.0.0.1:' + server.address().port);
  await page.waitForSelector('.sq');
  await page.click('#menu');
  await page.uncheck('#liveToggle');
  await page.keyboard.press('Escape');
  const scotchSaved = await page.evaluate(() => localStorage.getItem('openboard.scotch.v1'));
  await choose('caro');
  const caroSaved = await page.evaluate(() => localStorage.getItem('openboard.caro.v1'));
  await choose('vienna');
  assert.match(await page.title(), /Vienna Gambit/);
  assert.equal(await page.textContent('#bottomPlayer'), 'You · White');
  assert.equal(await page.textContent('#familyType'), 'Black response');
  assert.equal((await state()).cursor, 5);
  assert.match(await page.textContent('#methodology'), /1\.e4 e5 2\.Nc3 Nf6 3\.f4/);
  assert.doesNotMatch(await page.textContent('#methodology'), /Scotch|Caro/);
  await page.click('#menu');
  assert.ok((await page.locator('#lineChoices small').allTextContents()).every(text => text.includes('White repertoire')));
  await page.keyboard.press('Escape');
  for (let index = 0; index < vienna.lines.length; index++) {
    await page.evaluate(index => window.openboard.selectLine(index), index);
    await page.click('#last');
    assert.equal((await state()).fen, vienna.lines[index].steps[39].fen);
    await page.click('#first');
    assert.equal((await state()).cursor, 0);
  }
  await page.evaluate(() => window.openboard.selectLine(0));
  await page.click('#first');
  assert.match(await page.textContent('#takeaway'), /d5/);
  await page.waitForFunction(() => /complete/.test(document.getElementById('evalstatus').textContent), null, { timeout: 60000 });
  assert.match(await page.textContent('#evalscore'), /^[+-]?\d+\.\d$|^-?M\d+$/);
  await page.click('#practice');
  await hidden();
  assert.equal((await state()).cursor, 0);
  await answer('e2e5');
  assert.match(await page.textContent('#feedback'), /not legal/);
  await answer('d2d4');
  assert.match(await page.textContent('#feedback'), /legal alternative/);
  assert.equal((await state()).cursor, 0);
  await answer('e2e4');
  assert.equal((await state()).cursor, 1);
  assert.equal(await page.locator('#lesson').isVisible(), true);
  await page.click('#continue');
  assert.equal((await state()).fen, vienna.lines[0].steps[1].fen);
  await hidden();
  await page.click('#hint');
  await page.click('#reveal');
  await page.click('#continue');
  assert.equal((await state()).cursor, 4);
  assert.doesNotMatch(await page.textContent('#practiceQuestion'), /\bf4\b|\bf2\b/);
  // Complete all remaining White turns, including ply 39, and auto-play Black's final reply.
  for (let turn = 2; turn < 20; turn++) {
    await hidden();
    await answer(vienna.lines[0].steps[turn * 2].uci);
    await page.click('#continue');
  }
  assert.equal((await state()).cursor, 40);
  assert.equal((await state()).complete, true);
  assert.match(await page.textContent('#savedProgress'), /19 \/ 20 White/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('openboard.vienna.v1')));
  assert.equal(saved.learned['vienna-1'].length, 19);
  assert.ok(saved.learned['vienna-1'].includes(39));
  assert.ok(!saved.learned['vienna-1'].includes(3));
  assert.ok(saved.learned['vienna-1'].every(ply => ply % 2 === 1));
  await page.reload();
  await page.waitForSelector('.sq');
  assert.equal((await state()).opening, 'vienna');
  assert.equal((await state()).cursor, 40);
  assert.match(await page.textContent('#savedProgress'), /19 \/ 20 White/);
  assert.equal(await page.evaluate(() => localStorage.getItem('openboard.scotch.v1')), scotchSaved);
  assert.equal(await page.evaluate(() => localStorage.getItem('openboard.caro.v1')), caroSaved);
  await choose('scotch');
  assert.equal(await page.textContent('#bottomPlayer'), 'You · White');
  await choose('caro');
  assert.equal(await page.textContent('#bottomPlayer'), 'You · Black');
  await choose('vienna');
  assert.match(await page.textContent('#savedProgress'), /19 \/ 20 White/);
  await page.click('#menu');
  await page.click('#clearProgress');
  await page.keyboard.press('Escape');
  assert.match(await page.textContent('#savedProgress'), /0 \/ 20 White/);
  assert.equal(await page.evaluate(() => localStorage.getItem('openboard.scotch.v1')), scotchSaved);
  assert.equal(await page.evaluate(() => localStorage.getItem('openboard.caro.v1')), caroSaved);
  await page.evaluate(() => window.openboard.selectLine(0));
  const geometry = await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth, board: document.getElementById('board').getBoundingClientRect().width, controlsBottom: document.querySelector('.controls').getBoundingClientRect().bottom, height: innerHeight }));
  assert.equal(geometry.overflow, false);
  assert.ok(geometry.controlsBottom < geometry.height);
  const directory = process.env.BROWSER_ARTIFACT_DIR || 'artifacts/vienna-editorial';
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: directory + '/vienna-iphone11.png', fullPage: true, animations: 'disabled' });
  assert.deepEqual(errors, []);
  await writeFile(directory + '/vienna-browser-evidence.json', JSON.stringify({ linesNavigated: vienna.lines.length, completeWhiteRecall: true, unassistedMoves: 19, isolatedProgress: true, liveEngine: true, geometry, pageErrors: errors }, null, 2));
  console.log('VIENNA_BROWSER_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
