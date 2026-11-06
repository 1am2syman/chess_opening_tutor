import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
const exec=promisify(execFile);

// Run the real orchestration against a fake Pi executable: no network or model calls.
for(const openingId of ['scotch','caro','vienna'])test(`editorial runner ${openingId} isolates files and runs author then independent reviewer`,async()=>{
  const caro=openingId==='caro',vienna=openingId==='vienna';
  const flags=openingId==='scotch'?[]:['--'+openingId];
  const cwd=await mkdtemp(join(tmpdir(),'openboard-editorial-'));
  try {
    const directory=openingId==='scotch'?'data':'data/'+openingId,artifacts=openingId==='scotch'?'artifacts/editorial':'artifacts/'+openingId+'-editorial';
    for(const path of ['scripts','tests','bin',directory,'data/editorial'])await mkdir(join(cwd,path),{recursive:true});
    // Resolve dependencies from the repo while keeping every subprocess write in the sandbox.
    const runner=(await readFile('scripts/run-editorial.mjs','utf8')).replace("from 'chess.js'",`from '${resolve('node_modules/chess.js/dist/esm/chess.js')}'`);
    await writeFile(join(cwd,'scripts/run-editorial.mjs'),runner);
    const repertoire=JSON.parse(await readFile(directory+'/repertoire.json','utf8'));repertoire.lines=repertoire.lines.slice(0,2);
    await writeFile(join(cwd,directory,'repertoire.json'),JSON.stringify(repertoire));
    if(caro||vienna)await writeFile(join(cwd,'data/editorial/accepted.json'),'Scotch sentinel');
    await writeFile(join(cwd,'package.json'),JSON.stringify({scripts:{build:'node -e "process.exit(0)"'}}));
    for(const path of ['tests/repertoire.test.mjs','tests/editorial.test.mjs','tests/caro.test.mjs','tests/scotch-preservation.test.mjs','tests/vienna.test.mjs','scripts/verify-caro-editorial.mjs','scripts/verify-vienna-browser.mjs','scripts/verify-browser.mjs','scripts/verify-delivery.mjs'])await writeFile(join(cwd,path),'');
    await writeFile(join(cwd,'bin/pi'),`#!${process.execPath}
const fs=require('node:fs');
const args=process.argv.slice(2),prompt=args.at(-1);
fs.appendFileSync('calls.jsonl',JSON.stringify(args)+'\\n');
const packet=JSON.parse(fs.readFileSync(prompt.match(/and (.+?-packet.json) completely/)[1],'utf8'));
const output=prompt.match(/(?:reviewed JSON to |write JSON to )(.+?\\.json)\\./)[1];
const reviewed=prompt.includes('independent reviewer');
const fields=['title','question','takeaway','intent','plan','tactic','theme','alternativeNote'];
const lessons=packet.positions.filter(p=>p.needsAuthoring).map(p=>({key:p.key,...Object.fromEntries(fields.map(field=>[field,Array(40).fill('Fixture').join(' ')+' '+p.ply]))}));
fs.writeFileSync(output,JSON.stringify({lineId:packet.lineId,lessons,review:{status:reviewed&&!process.env.FAKE_REJECT?'accepted':'draft',positionsReviewed:lessons.length,issues:[]}}));
`);
    await chmod(join(cwd,'bin/pi'),0o755);
    const env={...process.env,PATH:join(cwd,'bin')+':'+process.env.PATH,EDITORIAL_LINE_LIMIT:'2'};
    const result=await exec(process.execPath,['scripts/run-editorial.mjs',...flags],{cwd,env,timeout:20000});
    assert.match(result.stdout,/ASTRA_EDITORIAL_PIPELINE_OK/);
    const calls=(await readFile(join(cwd,'calls.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(calls.length,4);
    for(const [index,args] of calls.entries()){
      for(const [flag,value] of [['--provider','cliproxyapi'],['--model','gpt-6-astra'],['--thinking','high'],['--tools','read,write']])assert.equal(args[args.indexOf(flag)+1],value);
      assert.ok(args.includes('--no-extensions'));assert.match(args[args.indexOf('--extension')+1],/pi-cliproxyapi-provider\/extensions\/index.ts$/);
      assert.match(args.at(-1),index%2?/independent reviewer/:/the author/);
      assert.ok(args.at(-1).includes(openingId==='scotch'?'editorial-brief.md':openingId+'-editorial-brief.md'));
    }
    const accepted=JSON.parse(await readFile(join(cwd,directory,'editorial/accepted.json'),'utf8'));
    assert.equal(Object.keys(accepted.lines).length,2);assert.ok(Object.keys(accepted.lessons).length>40);
    const events=(await readFile(join(cwd,artifacts,'events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
    assert.deepEqual(events.map(e=>e.type),['author-start','review-start','line-integrated','author-start','review-start','line-integrated','pipeline-complete']);
    const packet=JSON.parse(await readFile(join(cwd,directory,'editorial',repertoire.lines[0].id+'-packet.json'),'utf8'));
    assert.equal(packet.openingId,openingId);assert.equal(packet.repertoireColor,caro?'Black':'White');
    if(caro||vienna){assert.equal(await readFile(join(cwd,'data/editorial/accepted.json'),'utf8'),'Scotch sentinel');await assert.rejects(readFile(join(cwd,'artifacts/editorial/events.jsonl')));}
    const resumed=await exec(process.execPath,['scripts/run-editorial.mjs',...flags],{cwd,env,timeout:20000});
    assert.match(resumed.stdout,/skip-accepted/);assert.equal((await readFile(join(cwd,'calls.jsonl'),'utf8')).trim().split('\n').length,4);
    await writeFile(join(cwd,directory,'editorial/accepted.json'),JSON.stringify({lessons:{},lines:{}}));
    await assert.rejects(exec(process.execPath,['scripts/run-editorial.mjs',...flags],{cwd,env:{...env,EDITORIAL_LINE_LIMIT:'1',FAKE_REJECT:'1'},timeout:20000}),/Editorial reviewer has not accepted/);
    const rejected=JSON.parse(await readFile(join(cwd,directory,'editorial/accepted.json'),'utf8'));assert.deepEqual(rejected,{lessons:{},lines:{}});
  } finally {await rm(cwd,{recursive:true,force:true});}
});
