import {readFile} from 'node:fs/promises';import {validateBank} from '../src/domain/engine.mjs';
const bank=JSON.parse(await readFile(new URL('../content/ontario-g1.draft.json',import.meta.url),'utf8'));
const errors=validateBank(bank);if(bank.questions.length!==500)errors.push('Expected 500 internal review questions.');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(JSON.stringify({questions:bank.questions.length,concepts:new Set(bank.questions.map(q=>q.concept_id)).size,roadSigns:bank.questions.filter(q=>q.section==='road_signs').length,roadRules:bank.questions.filter(q=>q.section==='road_rules').length,sourceRecords:bank.sources.length,status:'STRUCTURE PASS — independent approval is still pending'},null,2));
