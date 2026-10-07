import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { allowedQuestions, resolveAccess } from '../src/domain/access.mjs';
import { normaliseState } from '../src/domain/progress.mjs';
import { topicAvailability, sessionRequiresUpgrade, parkIncompatibleSession, recoverCompatibleSession, freePlanLabel } from '../src/domain/availability.mjs';
const read = name => fs.readFileSync(new URL('../'+name, import.meta.url), 'utf8');
const bank = JSON.parse(read('content/ontario-g1.draft.json')).questions;
const manifest = JSON.parse(read('content/sample-manifest.json'));
const topics = JSON.parse(read('src/data/generated-bank.json')).topics;
const guest = resolveAccess(null), free = resolveAccess({confirmed:true});
const paid = {kind:'paid',full:true};
const freeSession = {id:'ordinary-session',mode:'quick',questionIds:manifest.guestQuestionIds.slice(),answers:[{questionId:manifest.guestQuestionIds[0]}],index:1};
const premiumId = bank.find(q => !manifest.freeQuestionIds.includes(q.id)).id;
const premiumSession = {...freeSession,id:'complete-session',questionIds:[premiumId]};
const state = active => ({active,pausedPremium:null,sessions:[],bookmarks:[],preferences:{theme:'light'}});
for (const [name, access] of [['guest',guest],['free',free],['paid',paid]]) {
  test(`${name}: every topic promise equals the actual tier-filtered pool`, () => {
    for (const topic of topics) {
      const info = topicAvailability(topic,bank,access,manifest);
      const expected = allowedQuestions(bank,access,manifest).filter(q=>q.topic===topic.title);
      assert.equal(info.availableCount, expected.length, topic.title);
      assert.deepEqual(info.available.map(q=>q.id), expected.map(q=>q.id));
      assert.deepEqual(info.objectives,[...new Set(expected.map(q=>q.learning_objective))]);
      assert.equal(info.locked,!access.full&&expected.length===0);
    }
  });
}
test('P1 guest topic differentiates one sample from the full-bank count',()=>{
  const topic=topics.find(t=>t.title==='Basic shapes and sign families');
  const info=topicAvailability(topic,bank,guest,manifest);
  assert.equal(info.availableCount,1); assert.match(info.label,/1 guest sample/); assert.match(info.label,/20 in Complete/);
});
test('P1 free topic differentiates four samples from the full-bank count',()=>{
  const info=topicAvailability(topics.find(t=>t.title==='Basic shapes and sign families'),bank,free,manifest);
  assert.equal(info.availableCount,4); assert.match(info.label,/4 free samples/); assert.match(info.label,/20 in Complete/);
});
test('zero-sample topics are locked and expose no premium objectives',()=>{
  const locked=topics.map(t=>topicAvailability(t,bank,guest,manifest)).filter(i=>i.locked);
  assert.ok(locked.length>0);
  for(const info of locked){assert.equal(info.availableCount,0);assert.deepEqual(info.objectives,[]);assert.match(info.label,/no guest samples/);}
});
test('paid access with only the sample bundle asks for the pack, not an upgrade',()=>{
  const topic=topics.find(t=>t.title==='Basic shapes and sign families');
  const info=topicAvailability(topic,allowedQuestions(bank,free,manifest),paid,manifest);
  assert.equal(info.locked,false); assert.equal(info.needsDownload,true); assert.equal(info.availableCount,4); assert.match(info.label,/4 loaded/);
});
test('P1 a gated rehearsal must not park or mutate a guest session',()=>{
  const current=state(freeSession);const before=structuredClone(current);
  assert.strictEqual(parkIncompatibleSession(current,guest,manifest),current);
  assert.deepEqual(current,before); assert.equal(current.active.id,'ordinary-session');
});
test('P1 a gated action must not park a verified-free session',()=>{
  const current=state({...freeSession,questionIds:manifest.freeQuestionIds.slice(0,10)});
  assert.strictEqual(parkIncompatibleSession(current,free,manifest),current);
});
test('only a genuinely incompatible session is parked',()=>{
  const current=state(premiumSession);const next=parkIncompatibleSession(current,free,manifest);
  assert.equal(next.active,null);assert.strictEqual(next.pausedPremium,premiumSession);assert.strictEqual(current.active,premiumSession);
});
test('rehearsal is premium even when its IDs are free samples',()=>{
  assert.equal(sessionRequiresUpgrade({...freeSession,mode:'mock'},free,manifest),true);
});
test('paid sessions are not unnecessarily parked',()=>{
  const current=state(premiumSession);assert.strictEqual(parkIncompatibleSession(current,paid,manifest),current);
});
test('a prompt with no active session does not discard an already paused session',()=>{
  const current={...state(null),pausedPremium:premiumSession};assert.strictEqual(parkIncompatibleSession(current,free,manifest),current);
});
test('legacy stranded guest progress recovers without a purchase',()=>{
  const current={...state(null),pausedPremium:freeSession};const next=recoverCompatibleSession(current,guest,manifest);
  assert.strictEqual(next.active,freeSession);assert.equal(next.pausedPremium,null);
});
test('legacy recovery never overwrites the current session',()=>{
  const current={...state(freeSession),pausedPremium:premiumSession};assert.strictEqual(recoverCompatibleSession(current,free,manifest),current);
});
test('legacy recovery cannot unlock an incompatible Complete session',()=>{
  const current={...state(null),pausedPremium:premiumSession};assert.strictEqual(recoverCompatibleSession(current,guest,manifest),current);
});
test('guest, verified free, and paid plan labels stay distinct',()=>{
  assert.equal(freePlanLabel(guest),'Available after free signup');assert.equal(freePlanLabel(free),'Your plan');assert.equal(freePlanLabel(paid),'Always available');
});
test('Home/Practice/Progress/Account replace ambiguous dock labels',()=>{
  const text=read('app/(tabs)/_layout.tsx');for(const label of ['Home','Practice','Progress','Account'])assert.ok(text.includes(`label: '${label}'`));assert.doesNotMatch(text,/label: 'Today'/);
});
test('new installs default to light; existing explicit theme choices are retained',()=>{
  assert.match(read('src/domain/types.ts'),/name: '', theme: 'light'/);
  const defaults={preferences:{theme:'light'},sessions:[],bookmarks:[],bookmarkChanges:{},active:null,pausedPremium:null,reports:[]};
  for(const theme of ['light','dark','system'])assert.equal(normaliseState({preferences:{theme}},defaults).preferences.theme,theme);
});
test('web checkbox has native click/Space semantics, Enter handling and focus feedback',()=>{
  const text=read('src/components/Checkbox.web.tsx');assert.match(text,/<input[^>]+type="checkbox"/);assert.match(text,/aria-checked=\{checked\}/);assert.match(text,/onChange=\{event => onChange\(event.currentTarget.checked\)/);assert.match(text,/event.key === 'Enter'/);assert.match(text,/outline: focused/);assert.match(text,/<label htmlFor=\{id\}/);
});
test('results use portable SVG transform and an uncrowded score caption',()=>{
  const text=read('app/results.tsx');assert.match(text,/transform="rotate\(-90 72 72\)"/);assert.doesNotMatch(text,/origin=|rotation=|PRACTICE ACCURACY/);
});
test('checkout never inserts its empty error string into a View',()=>{
  const text=read('app/checkout.tsx');assert.doesNotMatch(text,/\{error\s*&&/);assert.match(text,/\{!!error && <Note/);
});
test('web reminders do not evaluate native Notifications',()=>{
  assert.doesNotMatch(read('src/lib/reminders.web.ts'),/from ['"]expo-notifications/);
});
function palette(name){const block=read('src/theme/tokens.ts').match(new RegExp(name+': \\{([^}]+)'))[1];return Object.fromEntries([...block.matchAll(/(\w+): '(#[0-9a-f]{6})'/gi)].map(m=>[m[1],m[2]]));}
function luminance(hex){const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const mode of ['light','dark'])test(`${mode}: normal text contrast meets 4.5:1 on main surfaces`,()=>{
  const p=palette(mode);for(const [fg,bg] of [['text','background'],['text','surface'],['muted','background'],['muted','sage'],['success','sage'],['accentText','accent'],['onForest','forest']])assert.ok(contrast(p[fg],p[bg])>=4.5,`${fg}/${bg}: ${contrast(p[fg],p[bg])}`);
});
test('refund reversal migration is App Store scoped, ordered, owner-pinned and service-only',()=>{
  const s=read('supabase/migrations/202610070001_refund_reversal.sql');
  for(const fragment of ["et='REFUND_REVERSED' and st<>'APP_STORE'",'Transaction belongs to another account','event_time<lifecycle.event_at','ignored_stale_lifecycle','awaiting_original_purchase','delete from firstlane_private.refund_tombstones','original.purchased_at','grant execute on function public.firstlane_apply_commerce_event(jsonb) to service_role'])assert.ok(s.includes(fragment),fragment);
});
