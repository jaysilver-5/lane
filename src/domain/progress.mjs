/** Personal study history only: never use this data as proof of a purchase or a test pass. */
export function validSession(s) {
  return !!s && typeof s.id === 'string' && typeof s.title === 'string' && ['quick','topic','mistakes','saved','mock'].includes(s.mode) &&
    typeof s.startedAt === 'string' && Number.isFinite(Date.parse(s.startedAt)) &&
    Array.isArray(s.questionIds) && s.questionIds.length > 0 && s.questionIds.length <= 100 && new Set(s.questionIds).size === s.questionIds.length && s.questionIds.every(id=>typeof id==='string') &&
    Array.isArray(s.answers) && s.answers.length <= s.questionIds.length && s.answers.every((a,i)=>a && a.questionId===s.questionIds[i] && typeof a.correct==='boolean' && typeof a.conceptId==='string' && typeof a.optionId==='string' && typeof a.revisionId==='string' && typeof a.topic==='string' && ['road_signs','road_rules'].includes(a.section) && Number.isFinite(Date.parse(a.at))) &&
    Number.isInteger(s.index) && s.index>=0 && s.index<s.questionIds.length;
}
function bookmarkOps(snapshot) {
  const map = new Map();
  for(const id of Array.isArray(snapshot?.bookmarks)?snapshot.bookmarks:[]) if(typeof id==='string') map.set(id,{bookmarked:true,at:'1970-01-01T00:00:00.000Z'});
  if(snapshot?.bookmarkChanges && typeof snapshot.bookmarkChanges==='object') for(const [id,change] of Object.entries(snapshot.bookmarkChanges)) if(change && typeof change.bookmarked==='boolean' && typeof change.at==='string' && Number.isFinite(Date.parse(change.at))) map.set(id,change);
  return map;
}
export function mergeProgress(a = {}, b = {}) {
  const sessions = new Map();
  for(const s of [...(Array.isArray(a.sessions)?a.sessions:[]),...(Array.isArray(b.sessions)?b.sessions:[])]) {
    if(!validSession(s) || !s.finishedAt || !Number.isFinite(Date.parse(s.finishedAt)) || s.answers.length!==s.questionIds.length) continue;
    const prev=sessions.get(s.id);
    if(!prev || JSON.stringify(s)<JSON.stringify(prev)) sessions.set(s.id,s); // deterministic conflict resolution; completed attempts are immutable
  }
  const changes=bookmarkOps(a);
  for(const [id,op] of bookmarkOps(b)) { const prev=changes.get(id); if(!prev || Date.parse(op.at)>Date.parse(prev.at) || (Date.parse(op.at)===Date.parse(prev.at) && !op.bookmarked)) changes.set(id,op); }
  const bookmarkChanges=Object.fromEntries([...changes].sort(([a],[b])=>a.localeCompare(b)));
  return {sessions:[...sessions.values()].sort((x,y)=>x.startedAt.localeCompare(y.startedAt)||x.id.localeCompare(y.id)),bookmarks:Object.keys(bookmarkChanges).filter(id=>bookmarkChanges[id].bookmarked),bookmarkChanges};
}
export function normaliseState(saved, defaults) {
  const clean=JSON.parse(JSON.stringify(defaults));
  if(!saved || typeof saved!=='object')return clean;
  const p=saved.preferences||{};
  for(const k of ['haptics','reduceMotion','reminders','onboarded']) if(typeof p[k]==='boolean')clean.preferences[k]=p[k];
  if(typeof p.name==='string')clean.preferences.name=p.name.slice(0,40);
  if(['light','dark','system'].includes(p.theme))clean.preferences.theme=p.theme;
  if([5,10,20].includes(p.goal))clean.preferences.goal=p.goal;
  if(Number.isInteger(p.reminderHour)&&p.reminderHour>=0&&p.reminderHour<=23)clean.preferences.reminderHour=p.reminderHour;
  if(typeof p.targetDate==='string')clean.preferences.targetDate=p.targetDate;
  Object.assign(clean,mergeProgress(saved,{}));
  if(validSession(saved.active)&&!saved.active.finishedAt)clean.active=saved.active;
  if(validSession(saved.pausedPremium)&&!saved.pausedPremium.finishedAt)clean.pausedPremium=saved.pausedPremium;
  clean.downloaded=saved.downloaded===true;
  clean.reports=Array.isArray(saved.reports)?saved.reports.filter(x=>x&&typeof x.id==='string'&&typeof x.message==='string'&&typeof x.sent==='boolean').slice(-500):[];
  return clean;
}
