import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';
import { positionDraft } from '../src/chess_opening_tutor/caro-coaching.mjs';
import { openings, methodology } from '../src/chess_opening_tutor/openings.mjs';

function load(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (cause) { throw new Error('Cannot load Vienna verification input: ' + path, { cause }); }
}
const source = load('data/vienna/repertoire.json');
const compiled = load('data/vienna/lessons.json');
const sample = load('data/vienna/public-sample.json');
const accepted = existsSync('data/vienna/editorial/accepted.json') ? load('data/vienna/editorial/accepted.json') : { lessons: {}, lines: {} };
const root = ['e2e4', 'e7e5', 'b1c3', 'g8f6', 'f2f4'];
const fields = ['title', 'question', 'takeaway', 'intent', 'plan', 'tactic', 'theme', 'alternativeNote'];
function play(board, uci) { return board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); }
function validateLine(line) {
  assert.equal(line.steps.length, 40);
  const board = new Chess();
  for (const step of line.steps) {
    assert.equal(step.beforeFen, board.fen());
    assert.equal(play(board, step.uci).san, step.san);
    assert.equal(step.fen, board.fen());
    for (const [fen, candidates] of [[step.beforeFen, step.before], [step.fen, step.after]]) {
      assert.ok(candidates.length > 0 || new Chess(fen).isGameOver());
      for (const candidate of candidates) {
        const variation = new Chess(fen);
        for (const uci of candidate.pv.slice(0, 8)) play(variation, uci);
      }
    }
  }
  assert.equal(board.moveNumber(), 21);
  assert.equal(board.turn(), 'w');
}
function recount(line) {
  const prefix = [];
  let boundary = null;
  for (const [ply, step] of line.steps.entries()) {
    if (ply < root.length) {
      assert.equal(step.source, 'opening-prefix');
      assert.equal(step.count, 0);
      assert.equal(step.total, 0);
    } else {
      const eligible = sample.games.filter(game => game.moves.length > ply && prefix.every((uci, index) => game.moves[index] === uci));
      const count = eligible.filter(game => game.moves[ply] === step.uci).length;
      if (count < 3 && boundary === null) boundary = ply;
      assert.equal(step.source, boundary === null ? 'sample-supported' : 'engine-continuation');
      assert.equal(step.count, boundary === null ? count : null);
      assert.equal(step.total, boundary === null ? eligible.length : null);
    }
    prefix.push(step.uci);
  }
  assert.equal(line.engineFromPly, boundary);
}

test('Vienna has twenty distinct legal forty-ply White lines including the counterstrike and accepted gambit', () => {
  assert.equal(source.openingId, 'vienna');
  assert.equal(source.repertoireColor, 'w');
  assert.equal(compiled.lines.length, 20);
  assert.equal(new Set(compiled.lines.map(line => line.steps.map(step => step.uci).join(' '))).size, 20);
  const replies = new Set(compiled.lines.map(line => line.steps[5].uci));
  for (const uci of ['d7d5', 'e5f4']) assert.ok(replies.has(uci));
  assert.ok(replies.size >= 3, 'Include supported declining replies');
  for (const line of compiled.lines) {
    assert.deepEqual(line.steps.slice(0, root.length).map(step => step.uci), root);
    assert.deepEqual(line.steps.map(({ lesson, ...step }) => step), source.lines.find(item => item.id === line.id).steps);
    validateLine(line);
  }
  const illegal = structuredClone(compiled.lines[0]);
  illegal.steps[4].uci = 'f2f5';
  assert.throws(() => validateLine(illegal));
});

test('Vienna public filters, source metadata and every sample boundary recount independently', () => {
  assert.deepEqual(sample.filters.rootUCI, root);
  assert.equal(sample.license, 'CC0');
  assert.match(sample.source, /^https:\/\/database\.lichess\.org\/standard\/lichess_db_standard_rated_\d{4}-\d{2}\.pgn\.zst$/);
  assert.ok(sample.collectedAt && sample.archiveETag && sample.firstScannedDate && sample.lastScannedDate);
  assert.equal(sample.matchedGames, sample.games.length);
  assert.ok(sample.scannedGames >= sample.matchedGames);
  assert.equal(new Set(sample.games.map(game => game.url)).size, sample.games.length);
  for (const game of sample.games) {
    assert.deepEqual(game.moves.slice(0, root.length), root);
    assert.ok(game.ratings.every(rating => rating >= 1800 && rating <= 2200));
    const [base, increment] = game.timeControl.split('+').map(Number);
    assert.ok(base + 40 * increment >= 480 && base + 40 * increment < 1500);
    assert.ok(game.moves.length <= 40);
    const board = new Chess();
    for (const uci of game.moves) play(board, uci);
  }
  for (const line of compiled.lines) recount(line);
  const incorrectCount = structuredClone(compiled.lines[0]);
  incorrectCount.steps[root.length].count++;
  assert.throws(() => recount(incorrectCount));
  const { games, ...metadata } = sample;
  assert.deepEqual(source.metadata, metadata);
  assert.deepEqual(compiled.metadata, metadata);
  assert.match(methodology(compiled, openings.vienna).join(' '), /chronological prefix sample/);
});

test('Vienna explanations have isolated provenance, legal factual drafts and exact reviewed overrides', () => {
  assert.match(compiled.introduction.takeaway, /d5/);
  assert.doesNotMatch(JSON.stringify(compiled.introduction), /Scotch|Caro/);
  for (const line of compiled.lines) for (const step of line.steps) {
    const key = step.beforeFen + ' ' + step.uci;
    const base = positionDraft(step, 'Vienna Gambit');
    const reviewed = accepted.lessons[key];
    for (const field of fields) assert.ok(step.lesson[field].length >= (field === 'title' ? 8 : 15));
    assert.doesNotMatch(JSON.stringify(base), /Scotch|Caro/);
    assert.equal(base.facts.check, new Chess(step.fen).isCheck());
    if (reviewed) {
      assert.equal(step.lesson.authored, 'astra-reviewed');
      assert.equal(step.lesson.model, 'cliproxyapi/gpt-6-astra');
      for (const field of fields) assert.equal(step.lesson[field], reviewed[field]);
    } else assert.deepEqual(step.lesson, base);
  }
  for (const [id, status] of Object.entries(accepted.lines)) {
    assert.equal(status.status, 'accepted');
    const line = compiled.lines.find(item => item.id === id);
    assert.ok(line);
    for (const step of line.steps) assert.ok(accepted.lessons[step.beforeFen + ' ' + step.uci]);
  }
  const takeaways = Object.values(accepted.lessons).map(lesson => lesson.takeaway);
  assert.equal(new Set(takeaways).size, takeaways.length);
  assert.equal(compiled.editorial.reviewedLessons, Object.keys(accepted.lessons).length);
  assert.equal(compiled.editorial.acceptedLines, Object.keys(accepted.lines).length);
  assert.equal(compiled.editorial.totalUniqueLessons, new Set(compiled.lines.flatMap(line => line.steps.map(step => step.beforeFen + ' ' + step.uci))).size);
});

test('single HTML embeds Vienna alongside Scotch and Caro with independent storage identities', () => {
  const html = readFileSync('src/chess_opening_tutor/index.html', 'utf8');
  let embedded;
  try { embedded = JSON.parse(html.match(/window\.OPENBOARD_DATA=(.*?);<\/script>/s)[1]); }
  catch (cause) { throw new Error('Missing or malformed embedded repertoire', { cause }); }
  assert.deepEqual(embedded.vienna, compiled);
  assert.deepEqual(embedded.scotch, load('data/lessons.json'));
  assert.deepEqual(embedded.caro, load('data/caro/lessons.json'));
  assert.equal(new Set(Object.values(openings).map(opening => opening.storageKey)).size, 3);
  assert.equal(openings.vienna.color, 'w');
});
