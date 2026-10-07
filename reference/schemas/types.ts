/** Authoring contract. Run JSON Schema validation at the import/release boundary.
 * This is not a permission or billing model; JSON review flags are not authorization.
 */
export type Section = 'road_signs' | 'road_rules';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export interface Option { id: string; text: string }
export interface Evidence { source_id: string; source_url: string; locator: string; support_note: string }
export interface IndependentReview { status: ReviewStatus; reviewer_id: string | null; reviewed_on: string | null }
export interface Question {
  id: string;
  code: string;
  revision_id: string;
  revision: number;
  pack_key: string;
  jurisdiction_code: string;
  locale: string;
  concept_id: string;
  variant: 'knowledge' | 'application';
  section: Section;
  topic: string;
  learning_objective: string;
  type: 'single_choice';
  difficulty: { editorial_estimate: 'foundation' | 'application'; empirically_calibrated: boolean };
  prompt: string;
  options: Option[];
  correct_option_id: string;
  explanation: string;
  evidence: Evidence[];
  media: { required: boolean; asset_id: string | null; presentation: 'text' | 'text_description' | 'image'; visual_recognition_assessed: boolean };
  review: {
    source_check: { status: 'checked_against_retrieved_official_guidance' | 'pending' | 'recheck_required'; checked_on: string; checker_type: string; scope: string; retrieval_methods: string[] };
    independent_review: IndependentReview;
    rights_review: IndependentReview;
    publication_status: 'draft' | 'approved' | 'published' | 'withdrawn';
    publishable: boolean;
    priority_flags: string[];
    next_source_review_due: string;
  };
  selection: { shuffle_options: boolean; max_per_concept_per_session: 1; mock_exam_eligible: boolean; reason: string };
  author_id: string;
}
export interface SourceRecord {
  id: string; title: string; publisher: string; url: string; kind: string;
  retrieved_on: string; retrieval_method: string; page_updated_on: string | null;
  effective_date: string | null; rights_note: string;
}
export interface Concept { id: string; section: Section; topic: string; title: string; source_ids: string[] }
export interface QuestionBank {
  $schema: string;
  schema_version: '1.0.0';
  pack: {
    id: string; key: string; title: string; country_code: string; subdivision_code: string;
    jurisdiction_code: string; licence_class: string; locale: string; content_version: string;
    created_on: string; status: 'draft' | 'approved' | 'published' | 'withdrawn';
    production_ready: boolean; official_exam_bank: boolean; official_endorsement: boolean;
  };
  counts: { questions: number; concepts: number; road_signs: number; road_rules: number; variants_per_concept: number; independently_approved_questions: number; visual_sign_questions: number };
  provenance: { authorship: string; source_check_description: string; complete_print_handbook_reviewed: boolean; independent_ontario_reviewer_completed: boolean; rights_clearance_completed: boolean; retrieval_date: string };
  usage: { allowed_stage: string; public_release_allowed: boolean; answer_keys_included: boolean; notice: string };
  coverage: { allocation_is_editorial_not_official: boolean; road_signs_are_text_based: boolean; no_image_assets_included: boolean; concept_pairing: string; known_gaps: string[]; claims_to_avoid: string[] };
  exam_template: {
    id: string; status: 'pending_authority_confirmation' | 'approved'; enabled_for_public_use: boolean;
    total_questions_proposed: number;
    sections_proposed: { section: Section; question_count: number; minimum_correct: number }[];
    timing: { mode: 'untimed' | 'timed'; official_timer_seconds: number | null; basis_source_id: string; note: string };
    verification_note: string;
    selection_policy: { distinct_concepts: boolean; published_approved_revisions_only: boolean; same_pack_and_locale_only: boolean };
  };
  publication_requirements: string[];
  sources: SourceRecord[];
  concepts: Concept[];
  questions: Question[];
}
export interface PresentedQuestion {
  id: string; revision_id: string; section: Section; prompt: string;
  options: Option[]; media: Question['media'];
}
