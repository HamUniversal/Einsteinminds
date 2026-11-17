import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const html = read('index.html');
const app = read('assets/einsteinminds-resource-network.js');
const core = read('assets/resource-network-core.js');
const guard = read('assets/auth-route-guard.js');
const workspaceMigration = read('supabase/migrations/20261117053941_user_workspace_and_institutional_requests.sql');
const migrationPaths = ['20261115022622_resource_network_v1.sql','20261115022922_resource_policy_performance_hardening.sql','20261115023213_resource_category_counts_rpc.sql','20261115025852_resource_category_admin_and_count_fix.sql','20261115180822_auth_least_privilege_grants.sql','20261115180838_grant_authenticated_evidence_review.sql','20261116153025_paypal_subscription_billing.sql','20261117053941_user_workspace_and_institutional_requests.sql'];
const seedCategories = read('supabase/seed/00_resource_categories.sql');
const seedResources = read('supabase/seed/01_resources.sql');
const seedMappings = read('supabase/seed/02_resource_category_links.sql');
const seedSources = read('supabase/seed/03_resource_sources.sql');
const paypal = read('supabase/functions/paypal-subscriptions/index.ts');
const agent = read('supabase/functions/agent/index.ts');
const hostingerWorkflow = read('.github/workflows/package-hostinger.yml');
const validateWorkflow = read('.github/workflows/validate.yml');
const readme = read('README.md');
const hostingerReadme = read('README-HOSTINGER.md');
const supabaseReadme = read('supabase/README.md');
const htaccess = read('.htaccess');

const catsStart = html.indexOf('const CATS=[');
const catsEnd = html.indexOf('const categoryLabel', catsStart);
const catsBlock = catsStart >= 0 && catsEnd > catsStart ? html.slice(catsStart, catsEnd) : '';

const checks = [
  [html.includes('/assets/resource-network-core.js'), 'index loads the resource-network core'],
  [html.includes('/assets/einsteinminds-resource-network.js'), 'index loads the live resource-network UI'],
  [html.includes('/assets/resource-network.css'), 'index loads the resource-network stylesheet'],
  [html.includes('/assets/auth-route-guard.js'), 'index loads the protected-route guard'],
  [guard.includes('privateRoutes'), 'auth route guard defines private routes'],
  [!html.includes('MASTER UPGRADE PATCH v9.0'), 'legacy synthetic v9 patch is absent'],
  [!html.includes('MASTER PATCH v9.2'), 'legacy synthetic v9.2 patch is absent'],
  [!html.includes('id="iabFrame"') && !html.includes('id="inAppBrowser"'), 'legacy iframe browser is absent'],
  [!app.includes('VirtualDB'), 'resource UI contains no synthetic resource generator'],
  [!html.includes('2,400,000'), 'application contains no fabricated 2.4M catalogue count'],
  [html.includes('const RESOURCE_INDEX=[];'), 'legacy provider seed index is empty'],
  [catsBlock.length > 0 && !/\bp\s*:\s*\[/.test(catsBlock), 'category metadata contains no sample provider arrays'],
  [html.includes('window.EinsteinmindsResourceNetwork?.state?.total'), 'navigation count uses the live directory total'],
  [html.includes('refreshHomeRecommendations(false)') && app.includes('function recommendationPayload()'), 'home recommendations use goal-aware live provider results'],
  [app.includes("'resource-search'"), 'resource UI calls the Supabase resource-search function'],
  [app.includes("'resource-outbound'"), 'provider links use the controlled outbound function'],
  [app.includes("'provider-introduction'"), 'provider details use the introduction function'],
  [app.includes('Auth.signedIn') && app.includes('S.saved') && app.includes('persist()'), 'saved providers are account-scoped and persisted'],
  [!app.includes('localStorage.getItem(SAVED_KEY)'), 'saved providers are not browser-global'],
  [html.includes('supabaseClient.auth.signUp') && html.includes('supabaseClient.auth.signInWithPassword'), 'signup and sign-in use Supabase Auth'],
  [html.includes('password.length<12') && html.includes('adultConfirm'), 'adult account and password safeguards are present'],
  [html.includes('CloudState.load(authUser.id)') && html.includes("from('user_workspaces')"), 'account workspace sync is wired to Supabase'],
  [!/CLOUD_STATE_KEYS=\[[^\]]*(journal|moods|child)/.test(html), 'private journal, mood and child data are excluded from cloud sync'],
  [html.includes('S.settings.cloudSync===0') && html.includes('workspace_dirty'), 'cloud sync opt-out and offline dirty-state recovery are implemented'],
  [workspaceMigration.includes('CREATE TABLE IF NOT EXISTS public.user_workspaces'), 'private account workspace table migration exists'],
  [workspaceMigration.includes('CREATE TABLE IF NOT EXISTS public.institutional_access_requests'), 'institutional interest-request table migration exists'],
  [workspaceMigration.includes('ENABLE ROW LEVEL SECURITY') && workspaceMigration.includes('(SELECT auth.uid()) = user_id'), 'workspace and request tables have owner-only RLS'],
  [html.includes('Agent.respond(prompt,[])') && html.includes('async checkProvider()'), 'Ask Einstein and educator drafting use the AI function and health check'],
  [agent.includes('action==="health"') && agent.includes('base+"/models"'), 'AI health endpoint checks the configured model provider'],
  [html.includes('Inst.submitRequest') && html.includes("from('institutional_access_requests')"), 'institutional interest form saves to Supabase'],
  [html.includes('Child accounts are disabled') && !html.includes('const CHILDREN='), 'child account access is explicitly disabled without fake child records'],
  [html.includes('This timer records only sessions you start inside Einstein Minds'), 'screen-time limits are accurately described as in-app only'],
  [html.includes('Journal entries, mood check-ins') && html.includes('this browser'), 'journal and mood storage is disclosed as device-local'],
  [html.includes('PayPal') && html.includes("action:'preflight'"), 'checkout calls PayPal configuration preflight'],
  [paypal.includes('action==="preflight"'), 'PayPal preflight endpoint is implemented'],
  [paypal.includes('checkPlan(monthly,8,"MONTH","Monthly")') && paypal.includes('checkPlan(yearly,60,"YEAR","Annual")'), 'PayPal plans are checked against USD 8 monthly and USD 60 annual'],
  [paypal.includes('PAYPAL_WEBHOOK_ID') && paypal.includes('v1/notifications/webhooks/'), 'PayPal webhook endpoint is checked'],
  [paypal.includes('BILLING.SUBSCRIPTION.ACTIVATED') && paypal.includes('PAYMENT.SALE.COMPLETED'), 'required PayPal webhook events are checked'],
  [!html.includes('Stripe') && !html.includes('Simulated checkout') && !html.includes('COPPA 2026'), 'obsolete Stripe and child-consent prototype copy is absent'],
  [!html.includes('verified educational sources'), 'AI does not claim all sources are independently verified'],
  [htaccess.includes('RewriteRule ^ index.html [L]'), 'Hostinger supports auth-route fallback'],
  [htaccess.includes('no-store, no-cache, must-revalidate'), 'Hostinger HTML is not cached stale'],
  [htaccess.includes('X-Content-Type-Options') && htaccess.includes('X-Frame-Options'), 'Hostinger security headers are present'],
  [hostingerWorkflow.includes('einsteinminds-hostinger-upload.zip') && hostingerWorkflow.includes('upload-artifact@v4'), 'Hostinger ZIP packaging workflow exists'],
  [validateWorkflow.includes('node --test tests/*.test.cjs'), 'CI runs the full automated test suite'],
  [readme.includes('Hostinger') && hostingerReadme.includes('public_html') && supabaseReadme.includes('Supabase backend'), 'deployment and backend documentation exist'],
  [migrationPaths.every((file) => fs.existsSync(path.join(root, 'supabase/migrations', file))), 'all eight historical migration SQL files are present'],
  [seedCategories.includes('jsonb_to_recordset') && seedResources.includes('jsonb_to_recordset') && seedMappings.includes('jsonb_to_recordset') && seedSources.includes('jsonb_to_recordset'), 'public catalogue snapshot seed files are complete'],
  [readme.includes('separate empty Supabase project'), 'fresh-project seed rehearsal is accurately disclosed'],
  [![readme,hostingerReadme,supabaseReadme,read('START-HERE.md'),read('SECURITY.md'),read('scripts/apply-update.mjs')].some((text) => /netlify/i.test(text)), 'project documentation and updater are Hostinger-only'],
  [!html.includes('SUPABASE_SERVICE_ROLE_KEY') && !html.includes('GROQ_API_KEY') && !html.includes('PAYPAL_CLIENT_SECRET'), 'server-side secrets are absent from browser source']
];

let failed = 0;
for (const [passed, label] of checks) {
  if (passed) console.log('PASS ' + label);
  else { console.error('FAIL ' + label); failed++; }
}
if (failed) {
  console.error(`Release validation failed: ${failed} of ${checks.length} checks.`);
  process.exit(1);
}
console.log(`Release validation passed: ${checks.length} checks.`);
