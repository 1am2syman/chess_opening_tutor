import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try {
  const css = await readFile('src/chess_opening_tutor/tutor.css','utf8');
  for (const [width,height] of [[393,720],[393,852],[414,896],[360,640]]) {
    const page = await browser.newPage({viewport:{width,height}});
    await page.setContent(`<style>${css}</style><main class="shell"><div class="workspace"><div class="primary"><div class="boardwrap"><div class="evalbar"></div><div class="board"></div></div></div></div></main>`);
    const size = await page.evaluate(() => ({board:document.querySelector('.board').getBoundingClientRect().width,primary:document.querySelector('.primary').getBoundingClientRect().width,bar:document.querySelector('.evalbar').getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth}));
    console.log({width,height,...size});
    assert.ok(Math.abs(size.board-(size.primary-16))<1,'Board must fill available mobile width regardless of browser height');
    assert.equal(size.bar,12); assert.equal(size.overflow,false);
    await page.close();
  }
} finally { await browser.close(); }
console.log('MOBILE_SIZING_OK');
