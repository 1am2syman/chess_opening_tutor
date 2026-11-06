import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Captured before Caro integration: source sample/repertoire, compiled lessons,
// and every Scotch packet, draft, review and accepted file. This is a content
// regression guard, not an assertion that the pedagogy was manually re-reviewed.
const hashes=JSON.parse(readFileSync('tests/fixtures/scotch-preservation.json','utf8'));
test('Caro integration preserves all 64 Scotch artifacts byte-for-byte, including 609 accepted lessons',()=>{
  assert.equal(Object.keys(hashes).length,64);
  for(const [path,expected] of Object.entries(hashes)){
    assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),expected,path+' changed');
  }
  const accepted=JSON.parse(readFileSync('data/editorial/accepted.json','utf8'));
  assert.equal(Object.keys(accepted.lessons).length,609);
});
