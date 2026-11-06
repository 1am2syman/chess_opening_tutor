import { readFile, writeFile, mkdir, rename, rmdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { build } from 'esbuild';
import { coachStep } from '../src/chess_opening_tutor/coaching.mjs';
import { caroDraft, positionDraft } from '../src/chess_opening_tutor/caro-coaching.mjs';
import { caroIntroduction, viennaIntroduction } from '../src/chess_opening_tutor/openings.mjs';

async function compile(directory, draft = coachStep, introduction) {
let repertoire;
try { repertoire=JSON.parse(await readFile(directory+'/repertoire.json','utf8')); }
catch(cause){throw new Error('Missing or invalid repertoire snapshot; prepare it before building.',{cause});}
let editorial={lessons:{},lines:{}};
try { editorial=JSON.parse(await readFile(directory+'/editorial/accepted.json','utf8')); }
catch(cause){if(cause.code!=='ENOENT')throw new Error('Invalid accepted editorial data',{cause});}
for(const line of repertoire.lines){
  for(const [ply,step] of line.steps.entries()){
    const base=draft(step,ply), authored=editorial.lessons[step.beforeFen+' '+step.uci];
    step.lesson=authored?{...base,...authored}:base;
  }
  // Names must identify the actual diverging choice, not a duplicated short prefix.
  const peers=repertoire.lines.filter(other=>other.id!==line.id&&other.family===line.family);
  let distinguish=repertoire.metadata.filters.rootUCI.length;
  for(const other of peers){let index=repertoire.metadata.filters.rootUCI.length;while(index<40&&line.steps[index].uci===other.steps[index].uci)index++;if(index===40)throw new Error('Duplicate repertoire line: '+line.id);distinguish=Math.max(distinguish,index);}
  const step=line.steps[distinguish];
  line.name=Math.ceil((distinguish+1)/2)+(distinguish%2?'…':'.')+step.san+' · '+step.lesson.title;
}
repertoire.introduction=introduction||{title:'Learn the decisions, not a string of moves',question:'What does the Scotch Gambit buy—and how will you use it?',takeaway:'White offers time for a pawn: faster development, open lines, and central pressure. The deal works only if your moves make those advantages concrete. At every turn, ask what the position needs—not what you remember.',intent:'Begin with 1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Bc4.',plan:'Study a Black response, then replay White’s choices with the reasons hidden. Compare legal alternatives without assuming they are bad moves.',tactic:'A gambit is not permission to sacrifice every attacking piece. Calculate checks, captures, and the opponent’s best defense.',theme:'Activity and king safety turn a temporary lead in development into a lasting position.'};
repertoire.editorial={acceptedLines:Object.keys(editorial.lines).length,reviewedLessons:Object.keys(editorial.lessons).length,totalUniqueLessons:new Set(repertoire.lines.flatMap(line=>line.steps.map(step=>step.beforeFen+' '+step.uci))).size,provider:editorial.provider||null,model:editorial.model||null,effort:editorial.effort||null};
return repertoire;
}
// Multiple opening editors publish the same HTML. Serialize reads and writes so
// a slower build cannot replace a newer snapshot; publish each file atomically.
await mkdir('artifacts', { recursive: true });
const lock = 'artifacts/openboard-build.lock';
const deadline = Date.now() + 120000;
while (true) {
  try { await mkdir(lock); break; }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (Date.now() >= deadline) throw new Error('Build lock timed out; check for a running build before removing ' + lock);
    await delay(100);
  }
}
async function publish(path, content) {
  const temporary = path + '.pending-' + process.pid;
  await writeFile(temporary, content);
  await rename(temporary, path);
}
try {
const repertoire=await compile('data');
const caro=await compile('data/caro',step=>caroDraft(step),caroIntroduction);
const vienna=await compile('data/vienna',step=>positionDraft(step,'Vienna Gambit'),viennaIntroduction);
const bundle=await build({entryPoints:['src/chess_opening_tutor/tutor.mjs'],bundle:true,write:false,format:'iife',target:['safari15','chrome100'],minify:false,legalComments:'inline'});
const [template,css,rulesLicense]=await Promise.all([readFile('src/chess_opening_tutor/tutor.template.html','utf8'),readFile('src/chess_opening_tutor/tutor.css','utf8'),readFile('node_modules/chess.js/LICENSE','utf8')]);
const safeJSON=JSON.stringify({scotch:repertoire,caro,vienna}).replaceAll('<','\\u003c');
const html=('<!-- chess.js BSD-2-Clause license\n'+rulesLicense+'\n-->\n'+template).replace('/*__CSS__*/',css).replace('/*__DATA__*/','window.OPENBOARD_DATA='+safeJSON+';').replace('/*__APP__*/',()=>bundle.outputFiles[0].text.replaceAll('</script','<\\/script'));
await publish('src/chess_opening_tutor/index.html',html);
await publish('data/lessons.json',JSON.stringify(repertoire,null,2));
await publish('data/caro/lessons.json',JSON.stringify(caro,null,2));
await publish('data/vienna/lessons.json',JSON.stringify(vienna,null,2));
const unique=new Set(repertoire.lines.flatMap(l=>l.steps.map(s=>s.beforeFen+' '+s.uci)));
const bespoke=new Set(repertoire.lines.flatMap(l=>l.steps.filter(s=>s.lesson.authored==='opening-specific').map(s=>s.beforeFen+' '+s.uci)));
console.log(`BUILD_OK lines=${repertoire.lines.length} uniqueMoveLessons=${unique.size} openingSpecific=${bespoke.size} astraReviewed=${repertoire.editorial.reviewedLessons} reviewedLines=${repertoire.editorial.acceptedLines} caroLines=${caro.lines.length} caroReviewed=${caro.editorial.reviewedLessons}/${caro.editorial.totalUniqueLessons} viennaReviewed=${vienna.editorial.reviewedLessons}/${vienna.editorial.totalUniqueLessons} htmlBytes=${Buffer.byteLength(html)}`);
} finally {
  await rmdir(lock);
}
