import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {renderReviewWorkbench} from '../scripts/content-review-template.mjs';
function workbench(ownerApproval=null){
 const questions=Array.from({length:500},(_,i)=>({id:`q${i}`,code:`ON-G1-${String(i+1).padStart(4,'0')}`,revision_id:`r${i}`,topic:'Topic',prompt:i===0?'Synthetic </script> prompt':'Synthetic prompt',options:[{id:'a',text:'A'},{id:'b',text:'B'}],correct_option_id:'a',explanation:'Synthetic explanation',evidence:[]}));
 const revisions=questions.map(q=>({sha256:'a'.repeat(64),tier:'paid'})),bank={version:'test',questions,sources:[],coverage:{known_gaps:['Synthetic review gap']}};
 const html=renderReviewWorkbench(bank,'b'.repeat(64),revisions,ownerApproval),elements=new Map(),storage=new Map();let exported;
 const el=()=>({value:'',textContent:'',children:[],append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},focus(){},click(){}});
 const get=id=>{if(!elements.has(id))elements.set(id,el());return elements.get(id);};get('data').textContent=html.match(/id="data">([\s\S]*?)<\/script>/)[1];get('filter').value='all';
 const source=html.match(/<script>([\s\S]*)<\/script>/)[1];
 vm.runInNewContext(source,{document:{getElementById:get,createElement:el,createTextNode:text=>text},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},Blob,URL:{createObjectURL:blob=>{exported=blob;return'blob:test';},revokeObjectURL(){}},setTimeout:()=>1});
 return{html,get,storage,exported:()=>exported};
}
test('review workbench starts with 500 unapproved exact revisions and safely embeds answer-key text',()=>{
 const f=workbench();assert.match(f.get('progress').textContent,/0 \/ 500/);assert.equal(f.get('prompt').textContent,'Synthetic </script> prompt');assert.equal(f.storage.size,0);assert.equal(f.get('export').disabled,true);
});
test('accepted editorial release is shown without fabricating separate human decisions',()=>{
 const f=workbench({version:'1.0.0',questionCount:500});
 assert.match(f.get('approval').textContent,/CONTENT APPROVED: 500 \/ 500/);
 assert.match(f.get('progress').textContent,/Optional independent decisions: 0 \/ 500/);
 assert.equal(f.storage.size,0);
});
test('anonymous decisions and correction flags without a reason are not saved',()=>{
 const f=workbench();f.get('save').onclick();assert.equal(f.storage.size,0);assert.match(f.get('status').textContent,/name or ID/);
 f.get('reviewer').value='Synthetic reviewer';f.get('factual').value='needs_changes';f.get('save').onclick();assert.equal(f.storage.size,0);assert.match(f.get('status').textContent,/Describe/);
});
test('a reviewer can jump directly to the last question without changing any decision',()=>{
 const f=workbench();f.get('jump').value='500';f.get('go').onclick();assert.equal(f.get('code').textContent,'ON-G1-0500');assert.equal(f.storage.size,0);assert.match(f.get('progress').textContent,/0 \/ 500/);
});
test('a named exact-revision review is saved locally and exported without authorizing publication',async()=>{
 const f=workbench();f.get('reviewer').value='Synthetic reviewer';f.get('factual').value='approved';f.get('rights').value='approved';f.get('notes').value='Synthetic test only';f.get('save').onclick();
 const saved=JSON.parse([...f.storage.values()][0]);assert.equal(Object.keys(saved.decisions).length,1);assert.equal(saved.decisions.r0.sha256,'a'.repeat(64));assert.equal(f.get('code').textContent,'ON-G1-0002');assert.match(f.get('progress').textContent,/1 \/ 500/);
 f.get('export').onclick();const result=JSON.parse(await f.exported().text());assert.equal(result.publication_requested,false);assert.equal(result.release_wide_checks,'pending');assert.equal(result.bank_sha256,'b'.repeat(64));assert.equal(result.decisions.length,1);
});
