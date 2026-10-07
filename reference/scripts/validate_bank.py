"""Validate a draft pack; --release intentionally rejects this unapproved draft.
Requires jsonschema>=4.18,<5. Structural checks do not verify the driving facts.
"""
from __future__ import annotations
import argparse, collections, hashlib, json, re, sys
from datetime import date
from pathlib import Path
from difflib import SequenceMatcher
from jsonschema import Draft202012Validator, FormatChecker
ROOT=Path(__file__).resolve().parents[1]
DEFAULT=ROOT/'content'/'ontario_g1_500.v0.1.0.json'
def normalized(text:str)->str:
 return re.sub(r'[^a-z0-9]+',' ',text.casefold()).strip()
def validate(bank:dict,release:bool=False)->dict:
 schema=json.loads((ROOT/'schemas'/'question-bank.schema.json').read_text())
 errors=[f"schema {'.'.join(str(p) for p in e.path)}: {e.message}" for e in Draft202012Validator(schema,format_checker=FormatChecker()).iter_errors(bank)]
 if errors: return {'structural_pass':False,'errors':errors,'release_eligible':False}
 qs=bank['questions']; cs=bank['concepts']; sources={s['id']:s for s in bank['sources']}; concepts={c['id']:c for c in cs}
 def check(test:bool,msg:str):
  if not test: errors.append(msg)
 for key in ['id','code','revision_id']:
  check(len({q[key] for q in qs})==len(qs),f'Duplicate question {key}')
 check(len(sources)==len(bank['sources']),'Duplicate source ID')
 check(len(concepts)==len(cs),'Duplicate concept ID')
 check(len({normalized(q['prompt']) for q in qs})==len(qs),'Duplicate normalized prompt')
 sections=collections.Counter(q['section'] for q in qs)
 check(len(qs)==bank['counts']['questions'],'Question count metadata mismatch')
 check(len(cs)==bank['counts']['concepts'],'Concept count metadata mismatch')
 for section in ['road_signs','road_rules']:
  check(sections[section]==bank['counts'][section],f'{section} count mismatch')
 concept_counts=collections.Counter(q['concept_id'] for q in qs)
 option_positions=collections.Counter()
 review_due=[]; lengths=[]
 for q in qs:
  label=q['code']; opts=q['options']; oids=[o['id'] for o in opts]
  check(len(set(oids))==4,f'{label}: duplicate option IDs')
  check(len({normalized(o['text']) for o in opts})==4,f'{label}: duplicate option texts')
  check(oids.count(q['correct_option_id'])==1,f'{label}: invalid answer reference')
  check(q['pack_key']==bank['pack']['key'],f'{label}: wrong pack')
  check(q['jurisdiction_code']==bank['pack']['jurisdiction_code'],f'{label}: wrong jurisdiction')
  check(q['locale']==bank['pack']['locale'],f'{label}: wrong locale')
  check(q['concept_id'] in concepts,f'{label}: missing concept')
  if q['concept_id'] in concepts:
   check(concepts[q['concept_id']]['section']==q['section'],f'{label}: concept section mismatch')
   check(concepts[q['concept_id']]['topic']==q['topic'],f'{label}: concept topic mismatch')
  for e in q['evidence']:
   check(e['source_id'] in sources,f'{label}: missing source')
   if e['source_id'] in sources:
    check(e['source_url']==sources[e['source_id']]['url'],f'{label}: inconsistent source URL')
  check(not q['media']['required'] or bool(q['media']['asset_id']),f'{label}: missing required media')
  check(not re.search(r'\b(?:option|answer|choice) [A-D]\b',q['explanation']),f'{label}: positional answer reference')
  if q['correct_option_id'] in oids: option_positions[str(oids.index(q['correct_option_id'])+1)]+=1
  if date.fromisoformat(q['review']['next_source_review_due'])<date.today(): review_due.append(label)
  lengths.append(len(q['explanation'].split()))
 check(all(n==bank['counts']['variants_per_concept'] for n in concept_counts.values()),'Concept variant counts mismatch')
 for cid in concepts:
  variants={q['variant'] for q in qs if q['concept_id']==cid}
  check(variants=={'knowledge','application'},f'{cid}: missing differentiated variant type')
 check(sum(q['review']['independent_review']['status']=='approved' for q in qs)==bank['counts']['independently_approved_questions'],'Approval metadata mismatch')
 check(sum(q['media']['visual_recognition_assessed'] for q in qs)==bank['counts']['visual_sign_questions'],'Visual count metadata mismatch')
 release_blockers=[]
 if not bank['pack']['production_ready']: release_blockers.append('Pack production_ready is false.')
 if not bank['usage']['public_release_allowed']: release_blockers.append('Public release is disabled.')
 if bank['exam_template']['status']!='approved': release_blockers.append('Exam template lacks authority confirmation.')
 if not bank['provenance']['complete_print_handbook_reviewed']: release_blockers.append('Full handbook coverage audit is not completed.')
 pending_content=0; pending_rights=0
 for q in qs:
  for field in ['independent_review','rights_review']:
   r=q['review'][field]
   ok=r['status']=='approved' and r.get('reviewer_id') and r.get('reviewed_on') and r['reviewer_id']!=q['author_id']
   if not ok:
    if field=='independent_review': pending_content+=1
    else: pending_rights+=1
 if pending_content: release_blockers.append(f'{pending_content} questions lack independent content approval.')
 if pending_rights: release_blockers.append(f'{pending_rights} questions lack documented rights approval.')
 if any(q['review']['publication_status'] not in ('approved','published') or not q['review']['publishable'] for q in qs):
  release_blockers.append('One or more revisions remain in a non-publishable draft state.')
 if any(not q['selection']['mock_exam_eligible'] for q in qs): release_blockers.append('Mock-exam eligibility is disabled for at least one item.')
 if bank['counts']['visual_sign_questions']==0: release_blockers.append('No visual sign-recognition items/assets; do not release an official-format visual mock.')
 warnings=['Structural validation is not factual, legal, pedagogical or rights approval.','Two variants of a concept must not be treated as independent evidence of mastery.']
 if review_due: warnings.append(f'{len(review_due)} scheduled review dates are in the past on this machine; check the actual operating date.')
 result={'structural_pass':not errors,'release_eligible':not errors and not release_blockers,'errors':errors,'release_blockers':release_blockers,'warnings':warnings,'counts':{'questions':len(qs),'concepts':len(cs),'sources':len(sources),'sections':dict(sections),'by_topic':dict(collections.Counter(q['topic'] for q in qs)),'answer_position_distribution':dict(sorted(option_positions.items()))},'checks':{'unique_question_ids':len({q['id'] for q in qs})==len(qs),'unique_revision_ids':len({q['revision_id'] for q in qs})==len(qs),'unique_normalized_prompts':len({normalized(q['prompt']) for q in qs})==len(qs),'four_options_and_valid_answer_keys':not any('option' in e or 'answer reference' in e for e in errors),'all_evidence_references_resolve':not any('source' in e for e in errors),'no_missing_required_media':not any('media' in e for e in errors)},'checked_on':date.today().isoformat(),'mode':'release' if release else 'draft'}
 return result

def main()->int:
 ap=argparse.ArgumentParser();ap.add_argument('bank',nargs='?',type=Path,default=DEFAULT);ap.add_argument('--release',action='store_true');ap.add_argument('--report',type=Path)
 args=ap.parse_args()
 try: bank=json.loads(args.bank.read_text(encoding='utf-8')); report=validate(bank,args.release)
 except (OSError,ValueError,KeyError) as exc:
  print(f'Validation could not complete: {exc}',file=sys.stderr);return 2
 report['file_sha256']=hashlib.sha256(args.bank.read_bytes()).hexdigest()
 if args.report:
  args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(report,indent=2))
 return 0 if report['structural_pass'] and (not args.release or report['release_eligible']) else 2
if __name__=='__main__':sys.exit(main())
