/** Pure functions shared by React Native and the offline browser design preview. */
export function shuffle(items, random = Math.random) {
 const result = [...items];
 for (let i=result.length-1;i>0;i--) {const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
/** @param {any[]} bank @param {{mode?: string, topic?: string, ids?: string[], count?: number}} options */
export function selectQuestions(bank, {mode='quick',topic,ids=[],count=10}={}, random=Math.random) {
 let pool=bank.filter(q=>q.pack_key==='CA-ON-G1');
 if (topic) pool=pool.filter(q=>q.topic===topic);
 if (mode==='saved'||mode==='mistakes') pool=pool.filter(q=>ids.includes(q.id));
 const used=new Set(); const unique=shuffle(pool,random).filter(q=> {if(used.has(q.concept_id))return false;used.add(q.concept_id);return true;});
 if (mode==='mock') return shuffle([...unique.filter(q=>q.section==='road_signs').slice(0,20),...unique.filter(q=>q.section==='road_rules').slice(0,20)],random);
 // Mixed practice deliberately samples both sections rather than over-weighting rule variants.
 if (mode==='quick'&&!topic) return shuffle([...unique.filter(q=>q.section==='road_signs').slice(0,Math.ceil(count/2)),...unique.filter(q=>q.section==='road_rules').slice(0,Math.floor(count/2))],random);
 return unique.slice(0,count);
}
export function checkAnswer(question, optionId) {
 if (!question.options.some(option=>option.id===optionId)) throw new Error('This answer is not an option for this question.');
 return optionId===question.correct_option_id;
}
export function summarize(answers) {
 const total=answers.length, correct=answers.filter(a=>a.correct).length;
 return {total,correct,accuracy:total?Math.round(correct/total*100):0,sections:['road_signs','road_rules'].map(section=> {const group=answers.filter(a=>a.section===section); return {section,total:group.length,correct:group.filter(a=>a.correct).length};})};
}
export function latestMistakes(sessions) {
 const last=new Map();for(const session of sessions)for(const a of session.answers){const prev=last.get(a.conceptId);if(!prev||a.at>=prev.at)last.set(a.conceptId,a);}
 return [...last.values()].filter(a=>!a.correct).map(a=>a.questionId);
}
export function localDay(date) {const d=new Date(date);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
export function activity(sessions, now=new Date()) {
 const answers=sessions.flatMap(s=>s.answers);const days=new Set(answers.map(a=>localDay(a.at)));
 let cursor=new Date(now),streak=0;if(!days.has(localDay(cursor)))cursor.setDate(cursor.getDate()-1);
 while(days.has(localDay(cursor))){streak++;cursor.setDate(cursor.getDate()-1);}
 const week=Array.from({length:7},(_,i)=>{const date=new Date(now);date.setDate(date.getDate()-(6-i));const key=localDay(date);return {key,label:date.toLocaleDateString('en',{weekday:'narrow'}),count:answers.filter(a=>localDay(a.at)===key).length};});
 return {streak,week,today:answers.filter(a=>localDay(a.at)===localDay(now)).length,concepts:new Set(answers.map(a=>a.conceptId)).size,...summarize(answers)};
}
export function validateBank(bank) {
 const errors=[]; const ids=new Set(), revisions=new Set();
 for(const q of bank.questions){if(ids.has(q.id))errors.push('Duplicate ID: '+q.id);ids.add(q.id);if(revisions.has(q.revision_id))errors.push('Duplicate revision: '+q.revision_id);revisions.add(q.revision_id);if(q.options.length!==4||new Set(q.options.map(o=>o.id)).size!==4)errors.push(q.code+': invalid options');if(!q.options.some(o=>o.id===q.correct_option_id))errors.push(q.code+': invalid correct option');if(!q.evidence.length)errors.push(q.code+': missing evidence');}
 return errors;
}
