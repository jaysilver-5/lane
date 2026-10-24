import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as access from '../src/domain/access.mjs';
import * as progress from '../src/domain/progress.mjs';
import * as availability from '../src/domain/availability.mjs';

const element=(type,props)=>({type,props:props||{}});
const ui=Object.fromEntries(['Button','Card','Chip','Copy','Divider','Empty','Eyebrow','Heading','MenuItem','Muted','Note','Row','Screen','SectionHead'].map(name=>[name,name]));
const load=(path,imports,globals={})=>{
  const source=fs.readFileSync(new URL(path,import.meta.url),'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const ctx={exports:{},require:name=>{if(name==='react/jsx-runtime')return{jsx:element,jsxs:element,Fragment:'Fragment'};assert.ok(name in imports,name);return imports[name];},...globals};
  vm.runInNewContext(js,ctx);return ctx.exports;
};
const pack=(count,approved=true)=>({packKey:'CA-ON-G1',version:`v${count}`,approved,questions:Array.from({length:count},(_,i)=>({id:`q${i}`,revision_id:`r${i}`,concept_id:`c${i}`,section:i%2?'road_rules':'road_signs',pack_key:'CA-ON-G1',topic:'Topic',options:[{id:'correct'},{id:'wrong'}]}))});
function loader({full=pack(500),sample=pack(40),fullError=false,sampleError=false,pending=false}={}){
  const calls=[];return{calls,...load('../src/lib/webQuestions.ts',{'./content':{
    downloadFreeQuestions:async id=>{calls.push(['samples',id]);if(sampleError)throw Error('samples unavailable');return sample;},
    downloadContentPack:async id=>{calls.push(['complete',id]);if(pending)throw Object.assign(Error('Awaiting publication'),{code:'content_not_published'});if(fullError)throw Error('connection failed');return full;},
  }})};
}
test('verified free visits fetch exactly the fixed sample payload without a paid request',async()=>{
  const f=loader(),result=await f.loadWebQuestions('A',false);assert.equal(result.pack.questions.length,40);assert.equal(result.error,'');assert.deepEqual(f.calls,[['samples','A']]);
});
test('paid visits automatically use the approved full bank',async()=>{
  const f=loader(),result=await f.loadWebQuestions('A',true);assert.equal(result.pack.questions.length,500);assert.equal(result.error,'');assert.deepEqual(f.calls,[['samples','A'],['complete','A']]);
});
test('an unavailable approved release retains fixed samples and exposes a retryable failure',async()=>{
  const f=loader({fullError:true}),result=await f.loadWebQuestions('A',true);assert.equal(result.pack.questions.length,40);assert.match(result.error,/keep practising/);assert.doesNotMatch(result.error,/download|offline/i);
});
test('pending publication is a ready sample state, not a retryable loading failure',async()=>{
  const result=await loader({pending:true}).loadWebQuestions('A',true);assert.equal(result.pack.questions.length,40);assert.equal(result.availability,'awaiting-review');assert.equal(result.error,'');
});
test('samples become usable before a slow full-bank request settles',async()=>{
  let finish;const shown=[];const f=load('../src/lib/webQuestions.ts',{'./content':{downloadFreeQuestions:async()=>pack(40),downloadContentPack:()=>new Promise(resolve=>{finish=resolve;})}});
  const request=f.loadWebQuestions('A',true,p=>shown.push(p.questions.length));await Promise.resolve();await Promise.resolve();assert.deepEqual(shown,[40]);finish(pack(500));assert.equal((await request).availability,'complete');
});
test('a slow sample response cannot replace a full bank that is already ready',async()=>{
  let finish;const shown=[];const f=load('../src/lib/webQuestions.ts',{'./content':{downloadFreeQuestions:()=>new Promise(resolve=>{finish=resolve;}),downloadContentPack:async()=>pack(500)}});
  assert.equal((await f.loadWebQuestions('A',true,p=>shown.push(p))).availability,'complete');finish(pack(40));await Promise.resolve();assert.deepEqual(shown,[]);
});
test('unapproved or incomplete responses cannot be presented as a complete bank',async()=>{
  for(const full of[pack(500,false),pack(40)]){const f=loader({full}),result=await f.loadWebQuestions('A',true);assert.equal(result.pack.questions.length,40);assert.notEqual(result.error,'');}
});
test('a free-sample outage cannot hide a valid full release; total failure is explicit',async()=>{
  assert.equal((await loader({sampleError:true}).loadWebQuestions('A',true)).pack.questions.length,500);
  await assert.rejects(loader({sampleError:true,fullError:true}).loadWebQuestions('A',true),/could not load/);
});
test('web content loading never prompts to install or save an offline pack',async()=>{
  let prompts=0;const web=load('../src/lib/downloadConsent.web.ts',{}, {globalThis:{confirm:()=>{prompts++;throw Error('Unexpected prompt');}}});
  assert.equal(await web.confirmPackDownload(1000000),true);assert.equal(prompts,0);
});
test('old web downloads URLs continue to Practice rather than rendering pack management',()=>{
  const page=load('../app/downloads.web.tsx',{react:{},'expo-router':{Redirect:'Redirect'}}).default();assert.equal(page.type,'Redirect');assert.equal(page.props.href,'/study');
});
test('profile pack controls are absent on web and remain available to native',()=>{
  for(const platform of['web','ios']){
    const page=load('../app/(tabs)/profile.tsx',{react:{},'react-native':{Platform:{OS:platform},View:'View'},'expo-router':{useRouter:()=>({})},'../../src/state/AppState':{useApp:()=>({state:{preferences:{name:'',goal:10}},colors:{},identity:null,access:{kind:'guest'}})},'../../src/config':{config:{offer:{label:'CA$14.99'}}},'../../src/components/Icon':{Icon:'Icon'},'../../src/components/UI':ui}).default();
    assert.equal(JSON.stringify(page).includes('Offline packs'),platform!=='web');
  }
});

function hooks(){
  const slots=[],effects=[];let index=0,changed=true;
  const memo=(fn,deps)=>{const slot=index++,prior=slots[slot];if(!prior||deps.some((dep,i)=>!Object.is(dep,prior.deps[i])))slots[slot]={value:fn(),deps};return slots[slot].value;};
  return{react:{createContext:()=>({Provider:'Provider'}),useMemo:memo,useCallback:(fn,deps)=>memo(()=>fn,deps),useRef:initial=>{const slot=index++;return slots[slot]||={current:initial};},useState(initial){const slot=index++;if(!(slot in slots))slots[slot]=typeof initial==='function'?initial():initial;return[slots[slot],value=>{const next=typeof value==='function'?value(slots[slot]):value;if(!Object.is(next,slots[slot])){slots[slot]=next;changed=true;}}];},useEffect(fn,deps){const slot=index++,prior=slots[slot];if(!prior||deps.some((dep,i)=>!Object.is(dep,prior.deps[i]))){slots[slot]={deps};effects.push(()=>{prior?.cleanup?.();slots[slot].cleanup=fn();});}}},render(component){index=0;changed=false;const tree=component();effects.splice(0).forEach(fn=>fn());return tree;},get changed(){return changed;}};
}
function provider(){
  const h=hooks(),requests=[],cacheCalls=[];
  const defaults={preferences:{name:'',theme:'light',goal:10,onboarded:true},bookmarks:[],bookmarkChanges:{},sessions:[],active:null,pausedPremium:null,reports:[],downloaded:false};
  const web={enabled:true,ready:true,identity:{id:'A',name:'',confirmed:true},refresh:async()=>{}};
  const bank={questions:pack(10).questions,questionMap:new Map(),bundledContent:{version:'sample'},replaceQuestionBank(q=pack(10).questions){bank.questions=q;bank.questionMap=new Map(q.map(item=>[item.id,item]));}};
  const paid={paid:{startsAt:'2020-01-01T00:00:00Z',lifetime:true,endsAt:null}};
  const content={downloadContentPack:async()=>{throw Error('Native install must not run');}};
  const exports=load('../src/state/AppState.tsx',{
    react:h.react,'react-native':{Platform:{OS:'web'},AppState:{addEventListener:()=>({remove(){}})},AccessibilityInfo:{isReduceMotionEnabled:async()=>false,addEventListener:()=>({remove(){}})},useColorScheme:()=> 'light'},
    'expo-crypto':{randomUUID:()=> 'session'},'../domain/types':{defaults},'../data/bank':bank,
    '../domain/engine.mjs':{selectQuestions:(items,{count})=>items.slice(0,count),checkAnswer:(_q,id)=>id==='correct',latestMistakes:()=>[],activity:()=>({})},'../domain/progress.mjs':progress,'../domain/content.mjs':{validateQuestionPayload:()=>[]},
    '../lib/storage':{storage:{load:async()=>structuredClone(defaults),save:async()=>{},loadPack:async()=>{cacheCalls.push('read');return pack(500);},installPack:async()=>cacheCalls.push('write')}},
    '../lib/supabase':{supabase:{},humanError:error=>error.message},'../theme/tokens':{palette:{light:{}}},'../config':{config:{mode:'connected',packKey:'CA-ON-G1'}},'../lib/reminders':{},'../domain/access.mjs':access,
    '../../content/sample-manifest.json':{guestQuestionIds:pack(10).questions.map(q=>q.id),freeQuestionIds:pack(40).questions.map(q=>q.id)},'../domain/availability.mjs':availability,'../lib/demoAccount':{},
    '../lib/billing':{readAccess:async()=>paid},'../lib/accessCache':{cacheAccess:async()=>{},permitsOfflineFallback:()=>false},'../lib/content':content,'../lib/webQuestions':{loadWebQuestions:(id,isPaid,onSamples)=>new Promise((resolve,reject)=>requests.push({id,isPaid,onSamples,resolve:value=>resolve({...value,availability:value.availability|| (value.pack.questions.length===500?'complete':'samples')}),reject})),completeQuestionsUnavailable:'Complete questions unavailable'},'../lib/sync':{},'../lib/webAccount':{useWebAccount:()=>web},
  },{setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},window:{addEventListener(){},removeEventListener(){}},document:{visibilityState:'visible'}});
  let tree;const render=()=>{tree=h.render(()=>exports.AppProvider({children:null}));};render();
  return{requests,cacheCalls,bank,get value(){return tree.props.value;},async flush(){for(let i=0;i<50;i++){await Promise.resolve();if(h.changed)render();}},async switchOwner(id){web.identity=id?{id,name:'',confirmed:true}:null;render();await this.flush();},async revoke(){paid.paid=null;await this.value.reloadAccess();await this.flush();}};
}
test('web provider automatically loads current questions without reading or installing a cached pack',async()=>{
  const f=provider();await f.flush();const request=f.requests.findLast(r=>r.isPaid);assert.equal(request.id,'A');request.resolve({pack:pack(500),error:''});await f.flush();assert.equal(f.bank.questions.length,500);assert.deepEqual(f.cacheCalls,[]);
  await f.value.retryQuestions();await f.flush();assert.ok(f.requests.filter(r=>r.isPaid).length>=2);
});
test('a late question response cannot cross an account switch',async()=>{
  const f=provider();await f.flush();const old=f.requests.findLast(r=>r.isPaid);await f.switchOwner('B');old.resolve({pack:pack(500),error:''});await f.flush();assert.notEqual(f.bank.questions.length,500);
  f.requests.findLast(r=>r.id==='B'&&r.isPaid).resolve({pack:pack(500),error:''});await f.flush();assert.equal(f.value.owner,'B');assert.equal(f.bank.questions.length,500);
});
test('a paid account can practise retained samples while unavailable Complete content cannot start a rehearsal',async()=>{
  const f=provider();await f.flush();f.requests.findLast(r=>r.isPaid).resolve({pack:pack(40),error:'Complete questions unavailable'});await f.flush();
  assert.equal(f.value.access.full,true);assert.equal(f.value.bankError,'Complete questions unavailable');assert.equal(f.value.begin('mock'),false);assert.equal(f.value.begin('quick'),true);await f.flush();assert.equal(f.value.state.active.continuous,true);assert.equal(f.value.state.active.questionIds.length,1);
});
test('the provider releases sample practice while full content is still loading',async()=>{
  const f=provider();await f.flush();const r=f.requests.findLast(r=>r.isPaid);r.onSamples(pack(40));await f.flush();assert.equal(f.value.bankLoading,false);assert.equal(f.value.bankAvailability,'samples');assert.equal(f.value.begin('quick'),true);assert.equal(f.value.begin('mock'),false);
  r.resolve({pack:pack(40),error:'',availability:'awaiting-review'});await f.flush();assert.equal(f.value.bankError,'');assert.equal(f.value.bankAvailability,'awaiting-review');
});
test('revocation rejects a late full-bank response; samples stay usable without enabling rehearsal',async()=>{
  const f=provider();await f.flush();const old=f.requests.findLast(r=>r.isPaid);await f.revoke();old.resolve({pack:pack(500),error:''});await f.flush();assert.notEqual(f.bank.questions.length,500);
  f.requests.findLast(r=>!r.isPaid).resolve({pack:pack(40),error:''});await f.flush();assert.equal(f.bank.questions.length,40);assert.equal(f.value.access.full,false);assert.equal(f.value.begin('mock'),false);assert.equal(f.value.begin('quick',undefined,10),true);
});

test('a chosen long session never silently shrinks to the available sample bank',async()=>{
  const f=provider();await f.flush();f.requests.findLast(r=>r.isPaid).resolve({pack:pack(40),error:'',availability:'awaiting-review'});await f.flush();
  assert.equal(f.value.begin('quick',undefined,60),false);await f.flush();assert.equal(f.value.state.active,null);
  assert.equal(f.value.begin('quick',undefined,40),true);await f.flush();assert.equal(f.value.state.active.questionIds.length,40);assert.equal(f.value.state.preferences.goal,10);
});

test('paid session length is independent of the daily goal and preserves an unfinished session',async()=>{
  const f=provider();await f.flush();f.requests.findLast(r=>r.isPaid).resolve({pack:pack(500),error:''});await f.flush();
  assert.equal(f.value.begin('quick',undefined,60),true);await f.flush();assert.equal(f.value.state.active.questionIds.length,60);assert.equal(f.value.state.preferences.goal,10);
  assert.equal(f.value.begin('quick',undefined,5),true);await f.flush();assert.equal(f.value.state.active.questionIds.length,60);
});

test('free accounts can select 40 but cannot start a 60-question session or an invalid length',async()=>{
  const f=provider();await f.flush();await f.revoke();f.requests.findLast(r=>!r.isPaid).resolve({pack:pack(40),error:''});await f.flush();
  assert.equal(f.value.begin('quick',undefined,60),false);assert.equal(f.value.begin('quick',undefined,500),false);await f.flush();assert.equal(f.value.state.active,null);
  assert.equal(f.value.begin('quick',undefined,40),true);await f.flush();assert.equal(f.value.state.active.questionIds.length,40);
});

test('changing an active mixed session preserves reached questions and answers while enforcing access',async()=>{
  const f=provider();await f.flush();await f.revoke();f.requests.findLast(r=>!r.isPaid).resolve({pack:pack(40),error:''});await f.flush();
  f.value.begin('quick',undefined,10);await f.flush();const original=JSON.stringify(f.value.state.active.questionIds);
  f.value.answer('correct');await f.flush();const answer=JSON.stringify(f.value.state.active.answers);
  assert.equal(f.value.changeQuickLength(40),true);await f.flush();assert.equal(f.value.state.active.questionIds.length,40);
  assert.equal(JSON.stringify(f.value.state.active.questionIds.slice(0,10)),original);assert.equal(JSON.stringify(f.value.state.active.answers),answer);
  assert.equal(f.value.changeQuickLength(60),false);await f.flush();assert.equal(f.value.state.active.questionIds.length,40);
  assert.equal(f.value.changeQuickLength(5),true);await f.flush();assert.equal(f.value.state.active.questionIds.length,5);assert.equal(JSON.stringify(f.value.state.active.answers),answer);
});

test('finishing early saves only answered questions as a durable completed attempt',async()=>{
  const f=provider();await f.flush();f.requests.findLast(r=>r.isPaid).resolve({pack:pack(40),error:''});await f.flush();
  assert.equal(f.value.finishPractice(),false);f.value.begin('quick',undefined,10);await f.flush();assert.equal(f.value.finishPractice(),false);
  for(let i=0;i<3;i++){f.value.answer(i%2?'wrong':'correct');await f.flush();f.value.advance();await f.flush();}
  assert.equal(f.value.finishPractice(),true);await f.flush();assert.equal(f.value.state.active,null);
  const done=f.value.state.sessions[0];assert.equal(done.answers.length,3);assert.equal(done.questionIds.length,3);assert.equal(done.index,2);
  assert.equal(progress.mergeProgress({sessions:[done]},{}).sessions.length,1);assert.equal(f.value.finishPractice(),false);
});

test('resizing cannot remove reached questions, bypass missing content, or alter a rehearsal',async()=>{
  const f=provider();await f.flush();f.requests.findLast(r=>r.isPaid).resolve({pack:pack(40),error:''});await f.flush();
  f.value.begin('quick',undefined,10);await f.flush();assert.equal(f.value.changeQuickLength(60),false);
  for(let i=0;i<6;i++){f.value.answer('correct');await f.flush();f.value.advance();await f.flush();}
  assert.equal(f.value.changeQuickLength(5),false);await f.flush();assert.equal(f.value.state.active.questionIds.length,10);assert.equal(f.value.state.active.answers.length,6);
  const rehearsal={...f.value.state.active,mode:'mock'};assert.equal(availability.finishedPracticeSession(rehearsal),null);assert.equal(availability.resizedQuickSession(rehearsal,f.bank.questions,20),null);
});

test('Complete Keep going cycles available questions beyond 100 answers and finishes only on request',async()=>{
  const f=provider();await f.flush();f.requests.findLast(r=>r.isPaid).resolve({pack:pack(10),error:''});await f.flush();assert.equal(f.value.access.full,true);
  assert.equal(f.value.begin('quick',undefined,'continuous'),true);await f.flush();
  for(let i=0;i<125;i++){
    assert.ok(f.value.state.active.questionIds.every(id=>/^q[0-9]$/.test(id)));
    f.value.answer(i%2?'wrong':'correct');await f.flush();assert.equal(f.value.advance(),false);await f.flush();
  }
  const active=f.value.state.active;assert.equal(active.continuous,true);assert.equal(active.index,125);assert.equal(active.answers.length,125);assert.equal(f.value.state.sessions.length,0);
  assert.equal(new Set(active.questionIds.slice(0,10)).size,10);assert.equal(new Set(active.questionIds.slice(10,20)).size,10);
  const cleanDefaults={...f.value.state,active:null,sessions:[]};const restored=progress.normaliseState({active},cleanDefaults);assert.equal(restored.active.index,125);assert.equal(restored.active.continuous,true);
  assert.equal(f.value.finishPractice(),true);await f.flush();const done=f.value.state.sessions[0];assert.equal(done.answers.length,125);assert.equal(done.questionIds.length,125);
  assert.equal(progress.mergeProgress({sessions:[done]},{}).sessions.length,1);assert.equal(progress.validSession({...done,continuous:false}),false);assert.equal(progress.validSession({...done,mode:'mock'}),false);
});

test('Keep going can continue a fixed Complete session without changing its answers or finish line behavior for other sessions',async()=>{
  const f=provider();await f.flush();f.requests.findLast(r=>r.isPaid).resolve({pack:pack(40),error:''});await f.flush();
  f.value.begin('quick',undefined,5);await f.flush();f.value.answer('correct');await f.flush();const before=JSON.stringify(f.value.state.active.answers);
  assert.equal(f.value.changeQuickLength('continuous'),true);await f.flush();assert.equal(JSON.stringify(f.value.state.active.answers),before);
  f.value.advance();await f.flush();for(let i=1;i<45;i++){f.value.answer('correct');await f.flush();assert.equal(f.value.advance(),false);await f.flush();}
  assert.equal(f.value.state.active.index,45);assert.equal(f.value.state.sessions.length,0);assert.ok(f.value.state.active.questionIds.every(id=>Number(id.slice(1))<40));
  assert.equal(f.value.changeQuickLength(40),false);assert.equal(f.value.state.active.continuous,true);
  const short=provider();await short.flush();short.requests.findLast(r=>r.isPaid).resolve({pack:pack(40),error:''});await short.flush();short.value.begin('quick',undefined,5);await short.flush();
  short.value.changeQuickLength('continuous');await short.flush();assert.equal(short.value.changeQuickLength(5),true);await short.flush();assert.equal(short.value.state.active.continuous,false);
  for(let i=0;i<5;i++){short.value.answer('correct');await short.flush();assert.equal(short.value.advance(),i===4);await short.flush();}
  assert.equal(short.value.state.active,null);assert.equal(short.value.state.sessions.length,1);
});

test('Keep going is the paid default while guest and free starts and conversions are gated',async()=>{
  const paid=provider();await paid.flush();paid.requests.findLast(r=>r.isPaid).resolve({pack:pack(40),error:''});await paid.flush();
  assert.equal(paid.value.begin('quick'),true);await paid.flush();assert.equal(paid.value.state.active.continuous,true);assert.equal(paid.value.state.active.answers.length,0);
  for(const tier of ['guest','free']){
    const f=provider();await f.flush();if(tier==='guest')await f.switchOwner(null);else{await f.revoke();f.requests.findLast(r=>!r.isPaid).resolve({pack:pack(40),error:''});await f.flush();}
    assert.equal(f.value.begin('quick'),false);assert.equal(f.value.begin('quick',undefined,'continuous'),false);await f.flush();assert.equal(f.value.state.active,null);assert.match(f.value.accessGate,/Keep going.*Complete/);
    assert.equal(f.value.begin('quick',undefined,5),true);await f.flush();const before=JSON.stringify(f.value.state.active);
    assert.equal(f.value.changeQuickLength('continuous'),false);await f.flush();assert.equal(JSON.stringify(f.value.state.active),before);
  }
});

test('revoked Keep going cannot resume, answer or advance and its progress stays parked',async()=>{
  const f=provider();await f.flush();f.requests.findLast(r=>r.isPaid).resolve({pack:pack(40),error:''});await f.flush();f.value.begin('quick');await f.flush();f.value.answer('correct');await f.flush();
  await f.revoke();f.requests.findLast(r=>!r.isPaid).resolve({pack:pack(40),error:''});await f.flush();const before=JSON.stringify(f.value.state.active);
  assert.equal(f.value.begin('quick'),false);assert.equal(f.value.advance(),false);f.value.answer('wrong');await f.flush();assert.equal(JSON.stringify(f.value.state.active),before);
  assert.equal(availability.sessionRequiresUpgrade(f.value.state.active,f.value.access,{freeQuestionIds:pack(40).questions.map(q=>q.id)}),true);
  f.value.parkPremiumSession();await f.flush();assert.equal(f.value.state.active,null);assert.equal(JSON.stringify(f.value.state.pausedPremium),before);
  assert.equal(f.value.begin('quick',undefined,5),true);await f.flush();assert.equal(f.value.state.active.continuous,false);assert.equal(JSON.stringify(f.value.state.pausedPremium),before);
});

test('Home selects Keep going by default and identifies the locked option without hiding fixed counts',()=>{
  const nodes=tree=>!tree||typeof tree!=='object'?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...nodes(tree.props?.children)];
  for(const full of [false,true]){
    const calls=[];const page=load('../app/(tabs)/index.tsx',{
      react:{useState:initial=>[initial,()=>{}]},'react-native':{Platform:{OS:'web'},Pressable:'Pressable',Text:'Text',View:'View',useWindowDimensions:()=>({width:320,fontScale:1})},
      'expo-router':{useRouter:()=>({push(){}})},'../../src/state/AppState':{useApp:()=>({state:{preferences:{goal:10,name:''},active:null,sessions:[]},colors:{},access:{kind:full?'paid':'guest',full},begin:(...args)=>{calls.push(args);return full;},setAccessGate(){}}),useStats:()=>({streak:0,today:0,total:0,concepts:0})},
      '../../src/components/Icon':{Icon:'Icon'},'../../src/components/RoadSketch':{RoadSketch:'RoadSketch'},'../../src/components/QuestionBankNotice':{QuestionBankNotice:'QuestionBankNotice'},'../../src/components/UI':ui,'../../src/domain/engine.mjs':{latestMistakes:()=>[]},
    }).default();
    const all=nodes(page),option=all.find(n=>n.props.accessibilityLabel===(full?'Keep going':'Keep going, Complete required'));
    assert.equal(option.props.accessibilityState.selected,true);for(const count of [5,10,20,40,60])assert.ok(all.some(n=>n.props.accessibilityLabel?.startsWith(count+' questions')));
    const start=all.find(n=>n.props.children===(full?'Start practising':'Unlock Keep going'));assert.ok(start);start.props.onPress();assert.equal(calls[0][2],'continuous');
  }
});
