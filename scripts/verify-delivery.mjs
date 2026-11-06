import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const local=await readFile('src/chess_opening_tutor/index.html','utf8');
const response=await fetch(process.env.OPENBOARD_DELIVERY_URL||'https://acer.taildd3bd9.ts.net/scotch-ui/index.html',{signal:AbortSignal.timeout(15000)});
assert.equal(response.status,200);assert.equal(await response.text(),local);
for(const notice of ['Redistribution and use in source and binary forms','GPLv3 source','CC BY-SA 3.0','approximate audience proxy','chronological prefix sample','not a human-authored'])assert.ok(local.toLowerCase().includes(notice.toLowerCase()),'missing notice '+notice);
assert.ok(!local.includes('LICHESS_TOKEN='));
const embedded=JSON.parse(local.match(/window\.OPENBOARD_DATA=(.*?);<\/script>/s)[1]);
for(const [id,path] of [['scotch','data/lessons.json'],['caro','data/caro/lessons.json'],['vienna','data/vienna/lessons.json']]){
  assert.deepEqual(embedded[id],JSON.parse(await readFile(path,'utf8')));
  assert.equal(embedded[id].lines.length,20);assert.ok(embedded[id].lines.every(line=>line.steps.length===40));
}
assert.equal(embedded.scotch.editorial.reviewedLessons,609);
console.log('DELIVERY_VERIFIED_OK');
