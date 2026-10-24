const fs = require('node:fs');
const path = require('node:path');
const { readApproved, contentIssues } = require('./release-policy.cjs');
function webAuthenticationIssues(root, qa) {
  try {
    const scope=JSON.parse(fs.readFileSync(path.join(root,'web-launch-scope.json'),'utf8'));
    const methods=scope.authenticationMethods;
    if(!Array.isArray(methods)||!methods.includes('email_password')||methods.some(method=>!['email_password','oauth_google','oauth_apple'].includes(method))) return ['Select supported web authentication methods in web-launch-scope.json.'];
    return methods.some(method=>method.startsWith('oauth_'))&&qa.clerkSocialSignInPassed!==true ? ['Web acceptance needed: clerkSocialSignInPassed.'] : [];
  } catch { return ['Web authentication launch scope is missing or invalid.']; }
}
function webReleaseIssues(root, env) {
  const issues=[];
  if(!env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_'))issues.push('Public launch requires a Clerk production publishable key.');
  for(const key of ['EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY','EXPO_PUBLIC_WEB_APP_URL','EXPO_PUBLIC_PADDLE_CLIENT_TOKEN','EXPO_PUBLIC_SUPPORT_EMAIL','EXPO_PUBLIC_OPERATOR_NAME','EXPO_PUBLIC_PRIVACY_URL','EXPO_PUBLIC_TERMS_URL','EXPO_PUBLIC_ACCOUNT_DELETION_URL']) if(!env[key]?.trim()) issues.push(`Missing ${key}.`);
  if(env.EXPO_PUBLIC_PADDLE_ENVIRONMENT!=='live'||!env.EXPO_PUBLIC_PADDLE_CLIENT_TOKEN?.startsWith('live_')) issues.push('Public launch requires Paddle live configuration. Use connected mode for sandbox staging.');
  if(env.EXPO_PUBLIC_WEB_APP_URL && env.EXPO_PUBLIC_WEB_APP_URL!=='https://www.getfirstlane.com/app') issues.push('Use https://www.getfirstlane.com/app as the production web app URL.');
  if((env.EXPO_PUBLIC_WEB_BASE_PATH ?? '/app')!=='/app') issues.push('The production web export must use /app as its base path.');
  for(const key of ['EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_WEB_APP_URL','EXPO_PUBLIC_PRIVACY_URL','EXPO_PUBLIC_TERMS_URL','EXPO_PUBLIC_ACCOUNT_DELETION_URL']) if(env[key]) {try{const url=new URL(env[key]);if(url.protocol!=='https:'||url.username||url.password||/localhost|example\.(com|org)/.test(url.hostname))throw new Error();}catch{issues.push(`Invalid HTTPS URL: ${key}.`);}}
  const publicKey=env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
  if(publicKey&&!publicKey.startsWith('sb_publishable_')) {try{if(JSON.parse(Buffer.from(publicKey.split('.')[1],'base64url')).role!=='anon')throw new Error();}catch{issues.push('Use a public Supabase publishable or anon key.');}}
  try{issues.push(...contentIssues(readApproved(root),root));}catch{issues.push('Reviewed Ontario release content is required.');}
  const checks=['newSupabaseProjectVerified','authEmailAndRecoveryPassed','clerkSupabaseIntegrationPassed','webProgressSyncPassed','backendSecurityPassed','paddleSandboxPassed','paddleLiveConfigured','refundAndReplayPassed','accountDeletionPassed','contentDeliveryPassed','webAccessibilityPassed','legalReviewed'];
  try{const qa=JSON.parse(fs.readFileSync(path.join(root,'web-release-approvals.json'),'utf8'));issues.push(...webAuthenticationIssues(root,qa));for(const key of checks)if(qa[key]!==true)issues.push(`Web acceptance needed: ${key}.`);if(!qa.reviewer||!qa.reviewedAt)issues.push('Record a named reviewer and date.');}catch{issues.push('Web release acceptance is missing.');}
  return issues;
}
module.exports={webReleaseIssues,webAuthenticationIssues};
