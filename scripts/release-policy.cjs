const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const releasePath = 'content/release/ontario-g1.approved.json';
function readApproved(root) { return JSON.parse(fs.readFileSync(path.join(root, releasePath), 'utf8')); }
function contentIssues(bank, root) {
  const issues = [];
  if (bank?.usage?.public_release_allowed !== true) issues.push('The bank has no public-release approval.');
  if (bank?.provenance?.independent_review_completed !== true || bank?.provenance?.rights_clearance_completed !== true) issues.push('Independent/rights approval is incomplete.');
  if (bank?.exam_template?.enabled_for_public_use !== true) issues.push('The rehearsal template has not been approved for public use.');
  if (!Array.isArray(bank?.questions) || bank.questions.length !== 500) issues.push('The release must contain the promised 500 questions.');
  const rows = Array.isArray(bank?.questions) ? bank.questions.filter(q=>q&&typeof q==='object') : [];
  if (rows.length !== bank?.questions?.length) issues.push('Malformed question entry.');
  const pending = rows.filter(q => q.review?.publishable !== true || q.review?.publication_status !== 'approved' || q.review?.independent_review?.status !== 'approved' || q.review?.rights_review?.status !== 'approved' || !q.review?.independent_review?.reviewer_id || !q.review?.rights_review?.reviewer_id || !q.review?.independent_review?.reviewed_on || !q.review?.rights_review?.reviewed_on || q.review?.independent_review?.reviewer_id === q.author_id);
  if (pending.length) issues.push(`${pending.length} question revisions lack independent and rights sign-off.`);
  if (rows.some(q => q.media?.required || q.media?.visual_recognition_assessed)) issues.push('Required learning media needs a reviewed renderer before publication.');
  if (new Set(rows.map(q => q.id)).size !== rows.length || new Set(rows.map(q => q.revision_id)).size !== rows.length) issues.push('Duplicate question/revision IDs.');
  if (rows.some(q => q.pack_key !== 'CA-ON-G1' || !Array.isArray(q.options) || q.options.length !== 4 || new Set(q.options.map(o => o?.id)).size !== 4 || !q.options.some(o => o?.id === q.correct_option_id) || !q.evidence?.length)) issues.push('Invalid question structure.');
  for (const section of ['road_signs','road_rules']) if (new Set(rows.filter(q => q.section === section).map(q => q.concept_id)).size < 20) issues.push(`Insufficient distinct ${section} concepts for a rehearsal.`);
  if (root) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/sample-manifest.json'), 'utf8'));
    const ids = new Set(rows.map(q => q.id));
    if (manifest.freeQuestionIds.length !== 40 || new Set(manifest.freeQuestionIds).size !== 40 || manifest.guestQuestionIds.length !== 10 || new Set(manifest.guestQuestionIds).size !== 10 || manifest.freeQuestionIds.some(id => !ids.has(id)) || manifest.guestQuestionIds.some(id => !manifest.freeQuestionIds.includes(id))) issues.push('The fixed sample manifest is invalid for this release.');
  }
  return issues;
}
function releaseIssues(root, env, { checkBundle = true } = {}) {
  const issues = [];
  if (env.EXPO_PUBLIC_APP_MODE !== 'production') issues.push('Set EXPO_PUBLIC_APP_MODE=production for the release build.');
  const required = ['EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY','EXPO_PUBLIC_REVENUECAT_IOS_KEY','EXPO_PUBLIC_REVENUECAT_ANDROID_KEY','EXPO_PUBLIC_SUPPORT_EMAIL','EXPO_PUBLIC_OPERATOR_NAME','EXPO_PUBLIC_PRIVACY_URL','EXPO_PUBLIC_TERMS_URL','EXPO_PUBLIC_ACCOUNT_DELETION_URL','FIRSTLANE_IOS_BUNDLE_ID','FIRSTLANE_ANDROID_PACKAGE','EAS_PROJECT_ID'];
  for (const key of required) if (!env[key]?.trim()) issues.push(`Missing ${key}.`);
  for (const key of ['EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_PRIVACY_URL','EXPO_PUBLIC_TERMS_URL','EXPO_PUBLIC_ACCOUNT_DELETION_URL']) if (env[key]) { try { const u = new URL(env[key]); if (u.protocol !== 'https:' || /(^|\.)(example\.(com|org)|localhost)$/.test(u.hostname)) throw new Error(); } catch { issues.push(`Invalid production HTTPS URL: ${key}.`); } }
  if (env.EXPO_PUBLIC_SUPPORT_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.EXPO_PUBLIC_SUPPORT_EMAIL)) issues.push('Support email is invalid.');
  for (const key of ['FIRSTLANE_IOS_BUNDLE_ID','FIRSTLANE_ANDROID_PACKAGE']) if (env[key] && (!/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*){2,}$/.test(env[key]) || /yourcompany|example|\.dev$/.test(env[key]))) issues.push(`Use the publisher's registered identifier for ${key}.`);
  if (env.EAS_PROJECT_ID && !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(env.EAS_PROJECT_ID)) issues.push('EAS_PROJECT_ID must be a project UUID.');
  for (const [key,prefix] of [['EXPO_PUBLIC_REVENUECAT_IOS_KEY','appl_'],['EXPO_PUBLIC_REVENUECAT_ANDROID_KEY','goog_']]) if (env[key] && !env[key].startsWith(prefix)) issues.push(`${key} must be the platform public SDK key, not a test/secret key.`);
  const k = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
  if (k && !k.startsWith('sb_publishable_') && k.split('.').length !== 3) issues.push('Use a Supabase publishable key or legacy anon JWT.');
  if (k.startsWith('sb_secret_')) issues.push('A secret Supabase key must never be shipped in the app.');
  if (k.split('.').length === 3) { try { if (JSON.parse(Buffer.from(k.split('.')[1], 'base64url')).role !== 'anon') issues.push('The legacy Supabase JWT must have anon role.'); } catch { issues.push('Invalid Supabase public JWT.'); } }
  let approved;
  try { approved = readApproved(root); issues.push(...contentIssues(approved, root)); } catch { issues.push(`Missing or unreadable ${releasePath}. Drafts are never promoted automatically.`); }
  if (checkBundle) {
    try {
      const bundle = JSON.parse(fs.readFileSync(path.join(root, 'src/data/generated-bank.json'), 'utf8'));
      const hash = approved ? crypto.createHash('sha256').update(fs.readFileSync(path.join(root,releasePath))).digest('hex') : '';
      if (bundle.approved !== true || bundle.questions.length !== 40 || bundle.sourceSha256 !== hash) issues.push('Generate the approved 40-question client bundle with npm run content:bundle.');
    } catch { issues.push('Public sample bundle is missing.'); }
  }
  const checks = ['storePricingVerified','iosSandboxPassed','androidSandboxPassed','refundAndRestorePassed','accountDeletionPassed','backendSecurityPassed','nativeAccessibilityPassed','legalReviewed','contentDeliveryPassed','dependencyReviewPassed','refundReversalPassed','expoWebRegressionPassed'];
  try { const qa = JSON.parse(fs.readFileSync(path.join(root, 'release-approvals.json'), 'utf8')); for (const check of checks) if (qa[check] !== true) issues.push(`Release acceptance still needed: ${check}.`); if (!qa.reviewer || !qa.reviewedAt) issues.push('Release acceptance needs a named reviewer and date.'); }
  catch { issues.push('Complete release-approvals.json after real release acceptance tests.'); }
  return issues;
}
module.exports = { releasePath, readApproved, contentIssues, releaseIssues };
