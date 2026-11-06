import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { Chess } from 'chess.js';

const caro = process.argv.includes('--caro');
const vienna = process.argv.includes('--vienna');
if (caro && vienna) throw new Error('Choose one opening to prepare');
let openingId = 'scotch';
if (caro) openingId = 'caro';
if (vienna) openingId = 'vienna';
const directory = openingId === 'scotch' ? 'data' : 'data/' + openingId;
const repertoireColor = caro ? 'b' : 'w';
let sample;
try { sample = JSON.parse(await readFile(directory+'/public-sample.json', 'utf8')); }
catch (cause) { throw new Error('Cannot load the collected public sample. Run collect_public.py first.', { cause }); }
const root = sample.filters.rootUCI;
const engine = spawn('.tools/stockfish/stockfish-linux-x86-64-universal', [], { stdio: ['pipe', 'pipe', 'inherit'] });
let waiter = null;
const reader = createInterface({ input: engine.stdout });
reader.on('line', line => waiter?.(line));
function send(text) { engine.stdin.write(text + '\n'); }
function waitFor(test) { return new Promise((resolve, reject) => { const timer = setTimeout(() => { waiter = null; reject(new Error('UCI timeout')); }, 30000); waiter = line => { if (test(line)) { clearTimeout(timer); waiter = null; resolve(line); } }; }); }
let ready = waitFor(line => line === 'uciok'); send('uci'); await ready;
send('setoption name Threads value 1'); send('setoption name Hash value 64'); send('setoption name MultiPV value 4');
ready = waitFor(line => line === 'readyok'); send('isready'); await ready;
let cache = {}; try { cache = JSON.parse(await readFile('data/engine-cache.json', 'utf8')); } catch {}
function boardFor(moves) { const board = new Chess(); for (const uci of moves) board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); return board; }
async function analyze(board) {
  const fen = board.fen(); if (cache[fen]) return cache[fen];
  const entries = new Map();
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { waiter = null; reject(new Error('Analysis timed out')); }, 30000);
    waiter = text => {
      if (text.startsWith('info ')) {
        const score = text.match(/score (cp|mate) (-?\d+)/), pv = text.match(/ pv (.+)/), index = text.match(/multipv (\d+)/), depth = text.match(/depth (\d+)/);
        if (score && pv && index) entries.set(Number(index[1]), { type: score[1], value: Number(score[2]), pv: pv[1].split(' '), depth: Number(depth?.[1] || 0) });
      }
      if (text.startsWith('bestmove ')) { clearTimeout(timer); waiter = null; resolve([...entries.entries()].sort((a,b) => a[0]-b[0]).map(e => e[1])); }
    };
    send('position fen ' + fen); send('go nodes 180000');
  });
  if (!result.length && !board.isGameOver()) throw new Error('Missing engine result');
  cache[fen] = result;
  return result;
}
function score(pv) { return pv.type === 'mate' ? Math.sign(pv.value) * 100000 : pv.value; }
const trie = new Map();
for (const game of sample.games) {
  for (let ply = root.length; ply < game.moves.length; ply++) {
    const key = game.moves.slice(0, ply).join(' '); const map = trie.get(key) || new Map();
    const move = game.moves[ply]; map.set(move, (map.get(move) || 0) + 1); trie.set(key, map);
  }
}
function counts(path) { return [...(trie.get(path.join(' ')) || [])].map(([uci, count]) => ({ uci, count })).sort((a,b) => b.count-a.count || a.uci.localeCompare(b.uci)); }
async function whiteMove(path) {
  const board = boardFor(path), analysis = await analyze(board); if (!analysis.length) return null;
  const options = counts(path);
  // Favor practical popular choices only when present in the top engine candidates
  // and within 0.40 pawns of the best. Otherwise choose the engine recommendation.
  const popular = options.find(option => { const pv = analysis.find(p => p.pv[0] === option.uci); return option.count >= 3 && pv && score(analysis[0]) - score(pv) <= 40; });
  return popular?.uci || analysis[0].pv[0];
}
let leaves = [{ path: root, weight: 1 }];
if (caro) {
  // Deliberate coverage, not a claim to rank the twenty most probable full games.
  const seeds = [
    ['d2d4','d7d5','e4e5'], ['d2d4','d7d5','b1c3'],
    ['d2d4','d7d5','b1d2'], ['d2d4','d7d5','e4d5','c6d5','c2c4'],
    ['d2d4','d7d5','e4d5','c6d5','f1d3'], ['d2d4','d7d5','f2f3'],
    ['b1c3','d7d5','g1f3'], ['g1f3','d7d5','d2d3']
  ];
  leaves = seeds.map(tail => ({path:[...root,...tail],weight:sample.games.filter(game=>[...root,...tail].every((move,index)=>game.moves[index]===move)).length/sample.games.length})).filter(item=>item.weight*sample.games.length>=3);
  if (leaves.length < 5) throw new Error('Insufficient supported Caro–Kann family coverage');
}
if (vienna) {
  const replies = counts(root).filter(option => option.count >= 3);
  for (const required of ['d7d5', 'e5f4']) {
    if (!replies.some(option => option.uci === required)) throw new Error('Collect more Vienna games: missing supported ' + required);
  }
  leaves = replies.slice(0, 8).map(option => ({ path: [...root, option.uci], weight: option.count / sample.games.length }));
}
while (leaves.length < 20) {
  const candidates = leaves.filter(l => !l.closed && l.path.length < 26).sort((a,b) => b.weight-a.weight || a.path.length-b.path.length);
  if (!candidates.length) throw new Error('Sample cannot produce 20 distinct branches; increase sample instead of fabricating popularity');
  const item = candidates[0]; const board = boardFor(item.path);
  if (board.isGameOver()) { item.closed = true; continue; }
  if (board.turn() === repertoireColor) { const move = await whiteMove(item.path); if (!move) { item.closed = true; continue; } item.path = [...item.path, move]; continue; }
  const options = counts(item.path).filter(o => o.count >= 3);
  if (!options.length) { item.closed = true; continue; }
  const total = counts(item.path).reduce((sum,o) => sum+o.count,0);
  const chosen = options.slice(0, Math.min(4, 21-leaves.length));
  if (chosen.length === 1) { item.path = [...item.path, chosen[0].uci]; item.weight *= chosen[0].count/total; continue; }
  leaves.splice(leaves.indexOf(item), 1, ...chosen.map(o => ({ path: [...item.path,o.uci], weight: item.weight*o.count/total })));
}
function familyFor(path, steps) {
  if (vienna) return {d7d5:'Central counterstrike',e5f4:'Gambit accepted',d7d6:'Quiet ...d6 decline',b8c6:'Knight development',f8c5:'Bishop development'}[path[5]] || 'Other decline · ' + steps[5].san;
  if (!caro) return steps[7].san;
  if (path[2] !== 'd2d4') return path[2] === 'b1c3' ? 'Two Knights' : 'Quiet sideline';
  return {e4e5:'Advance',b1c3:'Classical Nc3',b1d2:'Classical Nd2',f2f3:'Fantasy'}[path[4]] || (path[6] === 'c2c4' ? 'Panov' : 'Exchange');
}
const lines = [];
for (const [i, leaf] of leaves.sort((a,b)=>b.weight-a.weight).entries()) {
  let path = [...leaf.path];
  while (path.length < 40) {
    const board = boardFor(path); if (board.isGameOver()) throw new Error('A branch terminates before move 20; select another branch');
    const options = counts(path), analysis = await analyze(board);
    const uci = board.turn() === repertoireColor ? await whiteMove(path) : (options[0]?.count >= 3 ? options[0].uci : analysis[0].pv[0]);
    path.push(uci);
  }
  const board = new Chess(); let boundary = null; const steps = [];
  for (const [ply, uci] of path.entries()) {
    const beforeFen = board.fen(); const before = await analyze(board);
    const available = ply >= root.length ? counts(path.slice(0,ply)) : [];
    const count = available.find(o => o.uci === uci)?.count || 0, total = available.reduce((n,o)=>n+o.count,0);
    if (ply >= root.length && boundary === null && count < 3) boundary = ply;
    const move = board.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci[4] });
    if (!move) throw new Error('Illegal line move');
    const after = await analyze(board);
    steps.push({ uci, san: move.san, beforeFen, fen: board.fen(), before, after,
      source: ply < root.length ? 'opening-prefix' : boundary !== null ? 'engine-continuation' : 'sample-supported',
      count: boundary === null ? count : null, total: boundary === null ? total : null });
  }
  const family = familyFor(path, steps);
  lines.push({ id: openingId+'-'+(i+1), rank: i+1, family, weight: leaf.weight, branchPly: leaf.path.length,
    name: steps.slice(root.length,Math.min(leaf.path.length,15)).filter((_,j)=>j%2===0).map(s=>s.san).join(' · '), engineFromPly: boundary, steps });
  await writeFile('data/engine-cache.json', JSON.stringify(cache));
  console.log(`prepared=${i+1}/20 positions=${Object.keys(cache).length}`, { family, branch: lines.at(-1).name });
}
const metadata = { ...sample }; delete metadata.games;
await mkdir('data', { recursive: true });
await mkdir(directory, { recursive: true });
await writeFile(directory+'/repertoire.json', JSON.stringify({ metadata, openingId, repertoireColor, engine: 'Stockfish 19; 180000 nodes; MultiPV 4; bounded analysis, not a proof of perfect play', supportThreshold: 3, lines }, null, 2));
engine.stdin.end('quit\n'); reader.close();
console.log('REPERTOIRE_PREPARED_OK');
