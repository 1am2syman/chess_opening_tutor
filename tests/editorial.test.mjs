import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
let compiled,accepted;
try{compiled=JSON.parse(readFileSync('data/lessons.json','utf8'));}catch(cause){throw new Error('Build the tutor first',{cause});}
try{accepted=JSON.parse(readFileSync('data/editorial/accepted.json','utf8'));}catch(cause){if(cause.code!=='ENOENT')throw cause;accepted={lessons:{},lines:{}};}
const fields=['title','question','takeaway','intent','plan','tactic','theme','alternativeNote'];
test('reviewed editorial lessons override derived copy at every matching position',()=>{
  for(const line of compiled.lines)for(const step of line.steps){const key=step.beforeFen+' '+step.uci,lesson=accepted.lessons[key];if(!lesson)continue;
    assert.equal(step.lesson.authored,'astra-reviewed');assert.equal(step.lesson.model,'cliproxyapi/gpt-6-astra');assert.equal(step.lesson.effort,'high');
    for(const field of fields){assert.equal(step.lesson[field],lesson[field]);assert.ok(lesson[field].trim().length>=(field==='title'?8:15));}
  }
});
test('an accepted line has full reviewed forty-position coverage and no duplicate substitute lessons',()=>{
  for(const [id,status] of Object.entries(accepted.lines)){assert.equal(status.status,'accepted');const line=compiled.lines.find(l=>l.id===id);assert.ok(line);
    for(const step of line.steps)assert.ok(accepted.lessons[step.beforeFen+' '+step.uci],id+' missing reviewed lesson');
  }
  const takeaways=Object.values(accepted.lessons).map(l=>l.takeaway);assert.equal(new Set(takeaways).size,takeaways.length,'Different positions must not share identical canned takeaway copy');
});
test('compiled editorial progress matches accepted sources',()=>{
  assert.equal(compiled.editorial.acceptedLines,Object.keys(accepted.lines).length);assert.equal(compiled.editorial.reviewedLessons,Object.keys(accepted.lessons).length);
});
