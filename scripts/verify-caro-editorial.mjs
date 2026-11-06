import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function load(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (cause) {
    throw new Error(`Cannot verify editorial JSON: ${path}`, { cause });
  }
}
const openingId = process.argv.includes('--vienna') ? 'vienna' : 'caro';
const directory = 'data/' + openingId;
const repertoire = await load(directory + '/repertoire.json');
const compiled = await load(directory + '/lessons.json');
const accepted = await load(directory + '/editorial/accepted.json');
const fields = ['title', 'question', 'takeaway', 'intent', 'plan', 'tactic', 'theme', 'alternativeNote'];
const expected = new Set(repertoire.lines.flatMap(line => line.steps.map(step => step.beforeFen + ' ' + step.uci)));

// This checks coverage and review provenance, not the truth of chess prose.
assert.deepEqual(Object.keys(accepted.lines).sort(), repertoire.lines.map(line => line.id).sort(), 'Every repertoire line must have completed review');
assert.deepEqual(Object.keys(accepted.lessons).sort(), [...expected].sort(), 'Every unique position-move needs a reviewed lesson, with no stale extras');
const reviewedKeys = new Set();
for (const line of repertoire.lines) {
  assert.equal(accepted.lines[line.id].status, 'accepted');
  const packet = await load(`${directory}/editorial/${line.id}-packet.json`);
  const needed = packet.positions.filter(position => position.needsAuthoring);
  assert.equal(packet.lineId, line.id);
  assert.equal(packet.openingId, openingId);
  assert.equal(packet.repertoireColor, openingId === 'vienna' ? 'White' : 'Black');
  assert.deepEqual(packet.positions.map(position => position.key), line.steps.map(step => step.beforeFen + ' ' + step.uci));
  assert.equal(accepted.lines[line.id].newLessons, needed.length);
  if (!needed.length) continue; // A transposing line can reuse reviewed positions entirely.
  const review = await load(`${directory}/editorial/${line.id}-reviewed.json`);
  assert.equal(review.lineId, line.id);
  assert.equal(review.review.status, 'accepted');
  assert.equal(review.review.positionsReviewed, needed.length);
  assert.deepEqual(review.review.issues, []);
  assert.deepEqual(review.lessons.map(lesson => lesson.key).sort(), needed.map(position => position.key).sort());
  for (const lesson of review.lessons) {
    assert.ok(!reviewedKeys.has(lesson.key), 'A position should have one original review owner');
    reviewedKeys.add(lesson.key);
    const integrated = accepted.lessons[lesson.key];
    assert.equal(integrated.lineOrigin, line.id);
    assert.equal(integrated.authored, 'astra-reviewed');
    assert.ok(Number.isFinite(Date.parse(integrated.reviewedAt)));
    for (const field of fields) {
      assert.equal(typeof lesson[field], 'string', `${line.id}: missing ${field}`);
      assert.ok(lesson[field].trim().length >= (field === 'title' ? 8 : 15), `${line.id}: empty ${field}`);
      assert.equal(integrated[field], lesson[field], `${line.id}: ${field} differs from independent review`);
    }
    const words = lesson.takeaway.trim().split(/\s+/).length;
    assert.ok(words >= 35 && words <= 110, `${line.id}: takeaway outside editorial validation bounds`);
  }
}
assert.deepEqual([...reviewedKeys].sort(), [...expected].sort());
const takeaways = Object.values(accepted.lessons).map(lesson => lesson.takeaway);
assert.equal(new Set(takeaways).size, expected.size, 'Different positions must not reuse canned takeaways');
assert.deepEqual(compiled.lines.map(line => line.id), repertoire.lines.map(line => line.id));
for (const line of compiled.lines) for (const step of line.steps) {
  const lesson = accepted.lessons[step.beforeFen + ' ' + step.uci];
  assert.equal(step.lesson.authored, 'astra-reviewed', 'No draft lessons may remain');
  for (const field of fields) assert.equal(step.lesson[field], lesson[field]);
}
assert.equal(compiled.editorial.reviewedLessons, expected.size);
assert.equal(compiled.editorial.totalUniqueLessons, expected.size);
assert.equal(compiled.editorial.acceptedLines, repertoire.lines.length);
console.log(`${openingId.toUpperCase()}_EDITORIAL_COMPLETE lines=${repertoire.lines.length} uniqueLessons=${expected.size}`);
