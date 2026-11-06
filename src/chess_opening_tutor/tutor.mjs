import { Chess } from 'chess.js';
import { EngineAdapter, scoreLabel } from './engine.mjs';
import { animatePieces } from './board-motion.mjs';
import { openings, methodology } from './openings.mjs';
let previousBoardFrame = null;

const datasets = window.OPENBOARD_DATA;
const $ = id => document.getElementById(id);
let opening=openings.scotch, data=datasets.scotch;
const state = { line:0, cursor:7, mode:'study', flipped:false, highlights:true, selected:null, hints:0, complete:false, live:true, learned:{}, lastEvaluation:null, board:null, lastFen:null, practiceReady:false };
let storageAvailable=true;
const sessionProgress=new Map();
function restoreOpening() {
  Object.assign(state,{line:0,cursor:data.metadata.filters.rootUCI.length,mode:'study',flipped:opening.color==='b',selected:null,hints:0,complete:false,live:true,learned:{},lastEvaluation:null,lastFen:null,practiceReady:false});
  try {
    const raw=sessionProgress.has(opening.id)?null:localStorage.getItem(opening.storageKey);
    if(raw)sessionProgress.set(opening.id,JSON.parse(raw));
  } catch { storageAvailable=false; }
  const saved=sessionProgress.get(opening.id);
  if(saved){if(saved.version===1){state.line=Number.isInteger(saved.line)&&saved.line>=0&&saved.line<data.lines.length?saved.line:0;state.cursor=Number.isInteger(saved.cursor)&&saved.cursor>=0&&saved.cursor<=40?saved.cursor:state.cursor;state.live=saved.live!==false;state.learned=Object.fromEntries(Object.entries(saved.learned||{}).filter(([key,value])=>data.lines.some(l=>l.id===key)&&Array.isArray(value)).map(([key,value])=>[key,[...new Set(value.filter(ply=>Number.isInteger(ply)&&ply>=1&&ply<=40&&ply%2===(opening.color==='w'?1:0)))]]));}}
}
try { const id=localStorage.getItem('openboard.opening.v1');if(Object.prototype.hasOwnProperty.call(openings,id)){opening=openings[id];data=datasets[id];} } catch { storageAvailable=false; }
restoreOpening();
function persist(){const saved={version:1,line:state.line,cursor:state.cursor,live:state.live,learned:state.learned};sessionProgress.set(opening.id,saved);try{localStorage.setItem(opening.storageKey,JSON.stringify(saved));}catch{storageAvailable=false;} $('storageStatus').textContent=storageAvailable?'Progress is saved on this device.':'Local storage is unavailable; this session still works.';}
function line(){return data.lines[state.line];}
function step(){return line().steps[Math.max(0,state.cursor-1)];}
function expected(){return line().steps[state.cursor];}
function makeBoard(ply){return new Chess(ply===0?undefined:line().steps[ply-1].fen);}
function pieceName(piece){return {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'}[piece];}
function applyUci(board,uci){return board.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});}
function variation(fen,pv){const board=new Chess(fen),text=[];for(const uci of pv.slice(0,8)){try{const number=board.moveNumber(),color=board.turn(),move=applyUci(board,uci);text.push((color==='w'?number+'.':number+'…')+move.san);}catch{break;}}return text.join(' ');}
let engine = new EngineAdapter(message=>{$('evalstatus').textContent=message; if(message.includes('unavailable')||message.includes('could not')||message.includes('timed out'))$('evalscore').textContent='—';});
function recalling(){return state.mode==='practice'&&!state.practiceReady&&!state.complete;}
function evaluation(){
  if(recalling()){
    engine.pause();state.lastFen=null;state.lastEvaluation=null;
    $('evalscore').textContent='—';$('evalwhite').style.height='50%';$('evalbar').setAttribute('aria-label','Evaluation hidden during recall');$('evalstatus').textContent='Analysis hidden until you answer';
    document.querySelectorAll('.pv').forEach(row=>{row.querySelector('b').textContent='—';row.querySelector('span').textContent='Hidden during recall';});
    return;
  }
  const fen=state.board.fen();
  if(fen===state.lastFen)return;
  state.lastFen=fen;state.lastEvaluation=null;
  $('evalscore').textContent=state.live?'…':'—';$('evalwhite').style.height='50%';$('evalbar').setAttribute('aria-label',state.live?'Evaluation loading':'Evaluation paused');
  document.querySelectorAll('.pv').forEach(row=>{row.querySelector('b').textContent='…';row.querySelector('span').textContent=state.live?'Waiting for engine':'Analysis paused';});
  if(!state.live){engine.pause();$('evalstatus').textContent='Evaluation paused · enable in Settings';return;}
  $('evalstatus').textContent=engine.ready?'Analyzing…':'Loading Stockfish…';
  engine.request(fen,result=>{
    if(state.board.fen()!==fen)return;
    const row=document.querySelectorAll('.pv')[result.index];if(row){row.querySelector('b').textContent=scoreLabel(result);row.querySelector('span').textContent=variation(fen,result.pv);}
    if(result.index===0){state.lastEvaluation=result;const label=scoreLabel(result);$('evalscore').textContent=label;$('evalwhite').style.height=(result.type==='mate'?(result.value>0?98:2):Math.max(3,Math.min(97,50+45*Math.tanh(result.value/400))))+'%';$('evalbar').setAttribute('aria-label','Evaluation '+label+', positive favors White');$('evalstatus').textContent='Stockfish 10 · depth '+result.depth+' · White perspective';}
  },results=>{if(state.board.fen()===fen&&results.length)$('evalstatus').textContent+=' · complete';});
}
function renderBoard(){
  const last=state.cursor>0?step():null, board=state.board;
  const files=state.flipped?'hgfedcba':'abcdefgh',ranks=state.flipped?'12345678':'87654321';
  const legal=state.selected?new Set(board.moves({square:state.selected,verbose:true}).map(m=>m.to)):new Set();
  const nodes=[];
  for(const rank of ranks)for(const file of files){
    const square=file+rank,piece=board.get(square),button=document.createElement('button');
    button.className='sq'+((Number(rank)+'abcdefgh'.indexOf(file))%2?' dark':'')+(state.highlights&&last&&[last.uci.slice(0,2),last.uci.slice(2,4)].includes(square)?' mark':'')+(state.selected===square?' selected':'')+(legal.has(square)?' legal':'');
    button.setAttribute('aria-label',square+(piece?' '+(piece.color==='w'?'White ':'Black ')+pieceName(piece.type):' empty'));button.dataset.square=square;
    if(piece){const img=document.createElement('img');img.src='https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/'+piece.color+piece.type.toUpperCase()+'.svg';img.alt='';button.append(img);}
    if(file===files[0]){const label=document.createElement('span');label.className='coord';label.textContent=rank;button.append(label);}if(rank===ranks[7]){const label=document.createElement('span');label.className='coord file';label.textContent=file;button.append(label);}
    button.onclick=()=>tap(square);nodes.push(button);
  }
  $('board').getAnimations({subtree:true}).forEach(animation=>animation.cancel());
  $('board').replaceChildren(...nodes);
  previousBoardFrame=animatePieces($('board'),previousBoardFrame,board.fen(),state.flipped);
  $('evalbar').classList.toggle('flipped',state.flipped);
  const label=color=>(color===opening.color?'You · ':'')+(color==='w'?'White':'Black');
  $('topPlayer').textContent=label(state.flipped?'w':'b');$('bottomPlayer').textContent=label(state.flipped?'b':'w');
  $('topAvatar').textContent=state.flipped?'W':'B';$('bottomAvatar').textContent=state.flipped?'B':'W';
  $('turn').textContent=(board.turn()==='w'?'White':'Black')+' to move';
}
function recallQuestion(){
  // Target-independent: authored post-move explanations belong behind the answer or Hint.
  return state.board.isCheck()?opening.side+' is in check. Which legal response also improves the resulting position?':opening.side+' to move. Compare central tension, development and king safety before choosing a candidate.';
}
function renderLesson(){
  const lesson=state.cursor===0?data.introduction:step().lesson;
  $('moveLabel').textContent=state.cursor?Math.ceil(state.cursor/2)+(state.cursor%2?'. ':'… ')+step().san+' · '+(state.cursor%2?'White':'Black'):'Before the first move';
  for(const id of ['title','takeaway','question','intent','plan','tactic','theme'])$(id).textContent=lesson[id];
  $('calculation').textContent=lesson.calculation?'Calculate: '+lesson.calculation:'';
  $('alternative').textContent=lesson.alternative?(lesson.alternative+' — '+lesson.alternativeNote):(lesson.alternativeNote||'No alternative is supplied for this position. Use the live panel to explore candidates.');
  const lessonStatus=state.cursor===0?'Opening introduction; move-by-move review status is shown below.':lesson.authored==='astra-reviewed'?'This move has reviewed original coaching.':'Draft · position-derived facts only; original coaching awaits independent review.';
  $('lessonStatus').textContent=lessonStatus;
  $('editorialStatus').textContent=data.editorial.reviewedLessons+' / '+data.editorial.totalUniqueLessons+' unique lessons individually authored and reviewed · '+data.editorial.acceptedLines+' / 20 complete lines. '+lessonStatus;
  const hide=state.mode==='practice'&&!state.practiceReady&&!state.complete;
  $('lesson').classList.toggle('hidden',hide);$('practiceBox').classList.toggle('hidden',state.mode!=='practice');
  if(state.mode==='practice'){
    $('practiceTitle').textContent=state.complete?'Line complete. What did you learn?':state.practiceReady?'Good. Now connect the moves.':'Find a move with a purpose.';
    $('practiceQuestion').textContent=state.complete?'You reached move 20. Review the moments where you needed hints.':!state.practiceReady?recallQuestion():'Read the reason, then continue to '+opening.opponent+'’s reply.';
    $('continue').classList.toggle('hidden',!state.practiceReady||state.complete);$('hint').disabled=$('reveal').disabled=state.practiceReady||state.complete;
  }
}
function renderSelections(){
  const families=[...new Set(data.lines.map(l=>l.family))];
  $('familyLabel').textContent=opening.familyPrefix+line().family;$('lineLabel').textContent='Line '+line().rank+(recalling()?'':' · '+line().name);
  $('families').replaceChildren(...families.map(family=>{const button=document.createElement('button');button.textContent=opening.familyPrefix+family;button.className=family===line().family?'active':'';const count=document.createElement('small');count.textContent=data.lines.filter(l=>l.family===family).length+' repertoire branches';button.append(count);button.onclick=()=>{state.line=data.lines.findIndex(l=>l.family===family);resetStudy();render();$('lineChoices').closest('details').open=true;};return button;}));
  $('lineChoices').replaceChildren(...data.lines.filter(l=>l.family===line().family).map(l=>{const button=document.createElement('button');button.className=l.id===line().id?'active':'';button.textContent=recalling()?'Line '+l.rank:l.rank+'. '+l.name;const small=document.createElement('small');const first=l.steps[data.metadata.filters.rootUCI.length];small.textContent=opening.id==='scotch'?first.count+' / '+first.total+' sample games at 4…'+l.family:l.family+' · 20 moves · '+opening.side+' repertoire';button.append(small);button.onclick=()=>{state.line=data.lines.findIndex(item=>item.id===l.id);resetStudy();render();drawer(false);};return button;}));
}
function render(){
  state.board=makeBoard(state.cursor);renderBoard();renderLesson();renderSelections();
  $('study').classList.toggle('active',state.mode==='study');$('practice').classList.toggle('active',state.mode==='practice');$('study').setAttribute('aria-pressed',String(state.mode==='study'));$('practice').setAttribute('aria-pressed',String(state.mode==='practice'));
  $('timeline').replaceChildren(...line().steps.map((entry,index)=>{const b=document.createElement('button');b.textContent=(index%2? '':Math.ceil((index+1)/2)+'. ')+(state.mode==='practice'&&index>=state.cursor?'?':entry.san);b.className=state.cursor===index+1?'current':'';b.disabled=state.mode==='practice';b.onclick=()=>navigate(index+1);return b;}));
  const current=$('timeline').querySelector('.current');if(current)$('timeline').scrollLeft=current.offsetLeft-$('timeline').offsetLeft-$('timeline').clientWidth/2;
  $('first').disabled=$('prev').disabled=state.cursor===0||state.mode==='practice';$('next').disabled=$('last').disabled=state.cursor===40||state.mode==='practice';
  $('highlight').textContent='Highlights '+(state.highlights?'on':'off');$('progress').style.width=state.cursor/40*100+'%';
  const source=state.cursor?step().source:'opening-prefix';
  $('positionNote').textContent='Line '+line().rank+' / 20 · move '+Math.ceil(state.cursor/2)+' / 20 · '+({ 'opening-prefix':'shared opening', 'sample-supported':'sample-supported', 'engine-continuation':'engine continuation' }[source]);
  $('lineHeading').textContent=state.mode==='practice'?'Recall · line '+line().rank:'Line '+line().rank+' · '+line().name;
  $('lineDescription').textContent=opening.familyPrefix+line().family+' branch. '+(line().engineFromPly===null?'Every selected move appears in at least three retained games.':'Engine-derived continuation starts at ply '+(line().engineFromPly+1)+' (move '+Math.ceil((line().engineFromPly+1)/2)+').');
  $('lineStats').textContent=source==='sample-supported'?`${step().count} of ${step().total} retained games at this exact prefix played ${step().san} (${Math.round(step().count/step().total*100)}%). Small-sample frequency, not site-wide probability.`:source==='engine-continuation'?'No popularity percentage is assigned to this engine continuation.':'Statistical branches begin after '+opening.rootNotation+'. Counts cover only the public sample.';
  $('savedProgress').textContent=(state.learned[line().id]?.length||0)+' / 20 '+opening.side+' moves recalled without hints on this device.';
  if(state.mode==='practice'&&!state.practiceReady&&!state.complete){$('lineDescription').textContent='Play '+opening.side+'’s move before revealing the answer. Future moves in the move list are hidden.';$('lineStats').textContent='Look at the position first; use a hint only when you have an idea to compare.';$('engineLines').classList.add('hidden');$('showLines').textContent='Show candidate lines';$('showLines').setAttribute('aria-expanded','false');}
  $('showLines').disabled=recalling();$('practiceSide').textContent='Your turn · '+opening.side;
  $('liveToggle').checked=state.live;persist();evaluation();
}
function resetStudy(){state.mode='study';state.cursor=data.metadata.filters.rootUCI.length;state.selected=null;state.hints=0;state.complete=false;state.practiceReady=false;$('feedback').textContent='';$('toast').textContent='';}
function navigate(cursor){if(state.mode!=='study')return;state.cursor=Math.max(0,Math.min(40,cursor));state.selected=null;render();}
function startPractice(){state.mode='practice';state.cursor=0;state.selected=null;state.hints=0;state.complete=false;state.practiceReady=false;$('feedback').textContent='';advanceOpponent();render();}
function advanceOpponent(){if(state.cursor<40&&makeBoard(state.cursor).turn()!==opening.color)state.cursor++;}
function tap(square){
  if(state.mode!=='practice'||state.practiceReady||state.complete)return;
  if(state.board.turn()!==opening.color)return;
  const piece=state.board.get(square);
  if(piece?.color===opening.color){state.selected=square;renderBoard();return;}
  if(!state.selected)return;
  const candidates=state.board.moves({square:state.selected,verbose:true}).filter(m=>m.to===square);
  if(!candidates.length){$('feedback').textContent='That move is not legal here. Select another destination.';return;}
  const from=state.selected;
  if(candidates.some(m=>m.promotion)){promote(from,square,candidates);return;}
  attempt(from+square);
}
function promote(from,to,candidates){
  $('promotion').classList.remove('hidden');$('promotionChoices').replaceChildren(...candidates.map(move=>{const b=document.createElement('button');b.textContent=pieceName(move.promotion);b.onclick=()=>{$('promotion').classList.add('hidden');attempt(from+to+move.promotion);};return b;}));$('promotionChoices').querySelector('button').focus();
}
function attempt(uci){
  const target=expected(),board=new Chess(state.board.fen());let move;
  try{move=applyUci(board,uci);}catch{$('feedback').textContent='That move is not legal here.';return;}
  state.selected=null;
  if(uci!==target.uci){$('feedback').textContent=move.san+' is a legal alternative, not automatically a mistake. This exercise asks for the repertoire idea. Use a hint or compare candidates in Study.';renderBoard();return;}
  state.cursor++;state.practiceReady=true;if(state.hints===0)state.learned[line().id]=[...new Set([...(state.learned[line().id]||[]),state.cursor])];
  $('feedback').textContent='Yes — '+move.san+'. '+target.lesson.title+'.';render();
}
function continuePractice(){
  advanceOpponent();
  state.practiceReady=false;state.hints=0;state.selected=null;$('feedback').textContent='';if(state.cursor>=40)state.complete=true;render();
}
function drawer(open){$('drawer').classList.toggle('open',open);$('drawer').inert=!open;$('backdrop').classList.toggle('hidden',!open);$('menu').setAttribute('aria-expanded',String(open));document.body.style.overflow=open?'hidden':'';document.querySelector('.shell').inert=open;(open?$('closeMenu'):$('menu')).focus();}
$('menu').onclick=()=>drawer(true);$('closeMenu').onclick=() => drawer(false);$('backdrop').onclick=()=>drawer(false);
$('study').onclick=()=>{state.mode='study';state.selected=null;render();};$('practice').onclick=startPractice;$('restartPractice').onclick=startPractice;
$('hint').onclick=()=>{state.hints++;const target=expected(),piece=state.board.get(target.uci.slice(0,2));$('feedback').textContent=state.hints===1?target.lesson.intent:state.hints===2?'Consider the '+pieceName(piece.type)+' on '+target.uci.slice(0,2)+'.':'The repertoire move is '+target.san+'.';};
$('reveal').onclick=()=>{state.hints++;attempt(expected().uci);};$('continue').onclick=continuePractice;
$('first').onclick=()=>navigate(0);$('prev').onclick=()=>navigate(state.cursor-1);$('next').onclick=()=>navigate(state.cursor+1);$('last').onclick=()=>navigate(40);
$('flip').onclick=()=>{state.flipped=!state.flipped;renderBoard();};$('highlight').onclick=()=>{state.highlights=!state.highlights;render();};
$('showLines').onclick=()=>{if(recalling())return;const hidden=$('engineLines').classList.toggle('hidden');$('showLines').textContent=hidden?'Show candidate lines':'Hide candidate lines';$('showLines').setAttribute('aria-expanded',String(!hidden));};
$('liveToggle').onchange=()=>{state.live=$('liveToggle').checked;state.lastFen=null;if(state.live&&!engine.worker){engine.dispose();engine=new EngineAdapter(message=>$('evalstatus').textContent=message);engine.load();}render();};
$('retryEngine').onclick=()=>{engine.dispose();engine=new EngineAdapter(message=>$('evalstatus').textContent=message);state.live=true;state.lastFen=null;engine.load();render();};
$('clearProgress').onclick=()=>{state.learned={};persist();$('storageStatus').textContent=storageAvailable?'Saved recall progress cleared.':'Storage unavailable; session progress cleared.';render();};
$('cancelPromotion').onclick=()=>{$('promotion').classList.add('hidden');$('board').querySelector('[data-square="'+state.selected+'"]')?.focus();};
document.addEventListener('keydown',event=>{
  if(!$('drawer').inert){if(event.key==='Escape'){drawer(false);return;}if(event.key==='Tab'){const focusable=[...$('drawer').querySelectorAll('button:not(:disabled),summary,input,select')].filter(el=>el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}return;}
  if(!$('promotion').classList.contains('hidden')){if(event.key==='Escape')$('cancelPromotion').click();return;}
  if(event.target.closest('input,select,textarea,[contenteditable]'))return;
  if(event.key==='ArrowLeft'){event.preventDefault();navigate(state.cursor-1);}if(event.key==='ArrowRight'){event.preventDefault();navigate(state.cursor+1);}if(event.key==='Home'){event.preventDefault();navigate(0);}if(event.key==='End'){event.preventDefault();navigate(40);}
});
function renderOpening(){
  document.title='Openboard · '+opening.title+' tutor';$('openingTitle').textContent=$('openingLabel').textContent=opening.title;
  $('familyType').textContent=opening.familyLabel;
  $('studyInstructions').textContent='Before revealing a move, ask what the position needs. Read the takeaway, then compare a candidate line. In recall mode, play '+opening.side+'’s moves by tapping a piece and destination. '+opening.opponent+'’s moves are automatic. A legal alternative is not automatically a mistake.';
  $('openingChoices').replaceChildren(...Object.values(openings).map(item=>{const button=document.createElement('button');button.textContent=item.title;button.dataset.opening=item.id;button.className=item.id===opening.id?'active':'';const small=document.createElement('small');small.textContent='Twenty '+item.side+'-repertoire branches';button.append(small);button.onclick=()=>switchOpening(item.id);return button;}));
  $('methodology').replaceChildren(...methodology(data,opening).map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));
  for(const [name,url] of [['Public archive',data.metadata.source],['Rating survey','https://chessgoals.com/rating-comparison/']]){const p=document.createElement('p'),a=document.createElement('a');a.href=url;a.textContent=name;p.append(a);$('methodology').append(p);}
}
function switchOpening(id){
  if(!Object.prototype.hasOwnProperty.call(openings,id))throw new Error('Invalid opening');
  if(id===opening.id)return;
  persist();engine.pause();opening=openings[id];data=datasets[id];restoreOpening();previousBoardFrame=null;
  $('feedback').textContent=$('toast').textContent='';$('promotion').classList.add('hidden');
  $('engineLines').classList.add('hidden');$('showLines').textContent='Show candidate lines';$('showLines').setAttribute('aria-expanded','false');
  try{localStorage.setItem('openboard.opening.v1',id);}catch{storageAvailable=false;}
  renderOpening();render();if(state.live&&!engine.worker)engine.load();
}
renderOpening();render();if(state.live)engine.load();window.addEventListener('pagehide',()=>engine.dispose());window.addEventListener('pageshow',event=>{if(event.persisted&&state.live){engine=new EngineAdapter(message=>$('evalstatus').textContent=message);state.lastFen=null;engine.load();render();}});
// Deliberately narrow validation handle; no credentials or privileged operations.
window.openboard={getState:()=>({opening:opening.id,color:opening.color,line:state.line,cursor:state.cursor,mode:state.mode,fen:state.board.fen(),engineReady:engine.ready,complete:state.complete,practiceReady:state.practiceReady}),selectLine:index=>{if(!Number.isInteger(index)||index<0||index>=data.lines.length)throw new Error('Invalid line');state.line=index;resetStudy();render();}};
