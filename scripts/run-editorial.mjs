import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, appendFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Chess } from 'chess.js';

const root=process.cwd();
const provider='cliproxyapi',model='gpt-6-astra',effort='high';
async function json(path){try{return JSON.parse(await readFile(path,'utf8'));}catch(cause){throw new Error('Cannot read JSON: '+path,{cause});}}
const caro=process.argv.includes('--caro'),vienna=process.argv.includes('--vienna');
if(caro&&vienna)throw new Error('Choose one opening for editorial review');
let openingId='scotch';
if(caro)openingId='caro';
if(vienna)openingId='vienna';
const repertoireColor=caro?'Black':'White';
const dataDirectory=openingId==='scotch'?'data':'data/'+openingId;
const editorialDirectory=dataDirectory+'/editorial';
const artifactDirectory=openingId==='scotch'?'artifacts/editorial':'artifacts/'+openingId+'-editorial';
const repertoire=await json(dataDirectory+'/repertoire.json');
await mkdir(editorialDirectory,{recursive:true});await mkdir(artifactDirectory,{recursive:true});
const brief=resolve(openingId==='scotch'?'scripts/editorial-brief.md':'scripts/'+openingId+'-editorial-brief.md');
const acceptedPath=editorialDirectory+'/accepted.json';
let accepted={version:1,provider,model,effort,lessons:{},lines:{}};
try{accepted=await json(acceptedPath);}catch(error){if(error.cause?.code!=='ENOENT')throw error;await writeFile(acceptedPath,JSON.stringify(accepted,null,2));}
function key(step){return step.beforeFen+' '+step.uci;}
function legalVariation(fen,pv){const board=new Chess(fen),result=[];for(const uci of pv.slice(0,8)){const number=board.moveNumber(),color=board.turn();const move=board.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});result.push((color==='w'?number+'.':number+'…')+move.san);}return result.join(' ');}
async function event(type,detail){const message={at:new Date().toISOString(),type,...detail};await appendFile(artifactDirectory+'/events.jsonl',JSON.stringify(message)+'\n');console.log(JSON.stringify(message));}
function run(command,args,log,timeout=1800000){return new Promise((resolveRun,reject)=>{
  const child=spawn(command,args,{cwd:root,env:{...process.env,...(caro||vienna?{BROWSER_ARTIFACT_DIR:resolve(artifactDirectory)}:{})},stdio:['ignore','pipe','pipe']});let output='';
  const collect=chunk=>{const text=chunk.toString();output=(output+text).slice(-5000);appendFile(log,text).catch(()=>{});};child.stdout.on('data',collect);child.stderr.on('data',collect);
  const timer=setTimeout(()=>child.kill('SIGTERM'),timeout);
  child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('close',code=>{clearTimeout(timer);if(code===0)resolveRun(output);else reject(new Error(command+' exit '+code+'; inspect '+log+'\n'+output));});
});}
const fields=['title','question','takeaway','intent','plan','tactic','theme','alternativeNote'];
function validate(document,packet,reviewed){
  if(document.lineId!==packet.lineId)throw new Error('Wrong line ID');
  const wanted=packet.positions.filter(p=>p.needsAuthoring);if(!Array.isArray(document.lessons)||document.lessons.length!==wanted.length)throw new Error('Incomplete authored coverage');
  const entries=new Map(document.lessons.map(l=>[l.key,l]));if(entries.size!==wanted.length)throw new Error('Duplicate lesson keys');
  for(const position of wanted){const lesson=entries.get(position.key);if(!lesson)throw new Error('Missing '+position.ply);
    for(const field of fields){if(typeof lesson[field]!=='string'||lesson[field].trim().length<(field==='title'?8:15))throw new Error('Missing/short '+field+' at '+position.ply);}
    const words=lesson.takeaway.trim().split(/\s+/).length;if(words<35||words>110)throw new Error('Takeaway length '+words+' at '+position.ply);
    if(/as (Daniel|Naroditsky)|I(?:’|'| a)m (Daniel|Naroditsky)/i.test(JSON.stringify(lesson)))throw new Error('Impersonation text');
  }
  if(reviewed&&(document.review?.status!=='accepted'||document.review?.positionsReviewed!==wanted.length||document.review?.issues?.length!==0))throw new Error('Editorial reviewer has not accepted the full packet');
}
async function delegate(role,packetPath,outputPath,draftPath){
  const prompt=`You are the ${role} for the Openboard ${openingId} ${repertoireColor}-repertoire sequential education pipeline. Provider/model is ${provider}/${model}, effort ${effort}. Read ${brief} and ${resolve(packetPath)} completely. ${draftPath?'Read the complete author draft at '+resolve(draftPath)+'. Independently review every new lesson. Correct weaknesses and chess inaccuracies, then write the complete reviewed JSON to '+resolve(outputPath)+'. Do not merely endorse the draft.':'Author every needsAuthoring position in this line, preserving its narrative progression; write JSON to '+resolve(outputPath)+'.'} Your only permitted write path is ${resolve(outputPath)}. Do not modify other files or spawn tools/agents. Use the supplied exact FENs, legal candidate sequences, and accepted shared lessons. Copy each key verbatim from the packet, including all FEN fields and UCI suffix; never reconstruct or normalize it. The parent runner independently performs programmatic JSON, key coverage, word count, and field validation after your output. You are not required or permitted to execute those checks. Reviewer status accepted means your chess and teaching review is complete with no substantive unresolved issues; do not withhold editorial acceptance solely because automated execution tools are unavailable. Finish only after writing valid JSON with all requested fields. Report a short summary.`;
  await run('pi',['--print','--no-session','--provider',provider,'--model',model,'--thinking',effort,'--no-extensions','--extension','/home/acer_vps/.pi/agent/npm/node_modules/@router-for-me/pi-cliproxyapi-provider/extensions/index.ts','--no-skills','--no-prompt-templates','--no-context-files','--tools','read,write','--append-system-prompt','You are a scoped editorial subagent. Follow the supplied contract. No impersonation, unsupported chess claims, or writes outside your one authorized JSON output.',prompt],resolve(artifactDirectory+'/'+outputPath.split('/').at(-1)+'.log'));
}
const limit=Number(process.env.EDITORIAL_LINE_LIMIT||20);
for(const line of repertoire.lines.slice(0,limit)){
  if(accepted.lines[line.id]?.status==='accepted'){await event('skip-accepted',{line:line.id});continue;}
  const positions=line.steps.map((step,index)=>({key:key(step),ply:index+1,moveNumber:Math.ceil((index+1)/2),side:index%2?'Black':'White',san:step.san,uci:step.uci,beforeFen:step.beforeFen,afterFen:step.fen,source:step.source,
    playedPrefix:line.steps.slice(0,index+1).map(s=>s.san).join(' '),needsAuthoring:!accepted.lessons[key(step)],existingAccepted:accepted.lessons[key(step)]||null,
    candidatesBefore:step.before.map(p=>({score:p.type+' '+p.value+' from side-to-move perspective',depth:p.depth,moves:legalVariation(step.beforeFen,p.pv)})),
    candidatesAfter:step.after.map(p=>({score:p.type+' '+p.value+' from side-to-move perspective',depth:p.depth,moves:legalVariation(step.fen,p.pv)}))}));
  const packet={openingId,repertoireColor,rootUCI:repertoire.metadata.filters.rootUCI,lineId:line.id,rank:line.rank,family:line.family,completeSequence:line.steps.map((s,index)=>(index%2?'':Math.ceil((index+1)/2)+'.')+s.san).join(' '),positions};
  const needed=positions.filter(p=>p.needsAuthoring).length;
  const packetPath=editorialDirectory+'/'+line.id+'-packet.json',draftPath=editorialDirectory+'/'+line.id+'-draft.json',reviewPath=editorialDirectory+'/'+line.id+'-reviewed.json';
  await writeFile(packetPath,JSON.stringify(packet,null,2));await event('author-start',{line:line.id,newLessons:needed,provider,model,effort});
  if(needed){
    let success=false;
    for(let attempt=1;attempt<=2&&!success;attempt++){
      try{
        await delegate('author',packetPath,draftPath);const draft=await json(draftPath);validate(draft,packet,false);await event('review-start',{line:line.id,newLessons:needed});
        await delegate('independent reviewer',packetPath,reviewPath,draftPath);const reviewed=await json(reviewPath);validate(reviewed,packet,true);
        for(const lesson of reviewed.lessons)accepted.lessons[lesson.key]={key:lesson.key,...Object.fromEntries(fields.map(field=>[field,lesson[field]])),authored:'astra-reviewed',model:provider+'/'+model,effort,reviewedAt:new Date().toISOString(),lineOrigin:line.id};success=true;
      }catch(error){await event('attempt-failed',{line:line.id,attempt,error:error.message});if(attempt===2)throw error;}
    }
  }
  accepted.lines[line.id]={status:'accepted',at:new Date().toISOString(),newLessons:needed};
  await writeFile(acceptedPath+'.pending',JSON.stringify(accepted,null,2));
  // This process is the sole owner of the accepted editorial file.
  await rename(acceptedPath+'.pending',acceptedPath);
  await run('npm',['run','build'],resolve(artifactDirectory+'/'+line.id+'-integration.log'),120000);
  await run('node',['--test','tests/repertoire.test.mjs','tests/editorial.test.mjs',...(caro||vienna?['tests/caro.test.mjs','tests/scotch-preservation.test.mjs']:[]),...(vienna?['tests/vienna.test.mjs']:[])],resolve(artifactDirectory+'/'+line.id+'-integration.log'),120000);
  await event('line-integrated',{line:line.id,acceptedLines:Object.keys(accepted.lines).length,reviewedLessons:Object.keys(accepted.lessons).length,openingId,output:'src/chess_opening_tutor/index.html'});
}
if(vienna){
  await run('node',['scripts/verify-caro-editorial.mjs','--vienna'],resolve(artifactDirectory+'/final-coverage.log'),120000);
  await run('node',['scripts/verify-vienna-browser.mjs'],resolve(artifactDirectory+'/final-vienna-browser.log'),180000);
}
await run('node',['scripts/verify-browser.mjs'],resolve(artifactDirectory+'/final-browser.log'),180000);
await run('node',['scripts/verify-delivery.mjs'],resolve(artifactDirectory+'/final-delivery.log'),120000);
await event('pipeline-complete',{acceptedLines:Object.keys(accepted.lines).length,reviewedLessons:Object.keys(accepted.lessons).length});
console.log('ASTRA_EDITORIAL_PIPELINE_OK');
