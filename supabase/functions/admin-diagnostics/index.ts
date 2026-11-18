import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://einsteinminds.com",
  "https://www.einsteinminds.com",
]);
const allowedOrigin = (origin: string | null) => !!origin && allowedOrigins.has(origin);
const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": allowedOrigin(origin) ? origin! : "https://einsteinminds.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const reply = (body: unknown, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json", "Cache-Control": "no-store, max-age=0", "Pragma": "no-cache" },
  });

type Check = { id: string; label: string; status: "pass" | "fail" | "warn"; detail: string };
const check = (id: string, label: string, status: Check["status"], detail: string): Check =>
  ({ id, label, status, detail });

function publicKey() {
  const legacy = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    return String(keys.default || "");
  } catch {
    return "";
  }
}

function isAdministrator(user: any) {
  const app = user?.app_metadata || {};
  const roles = Array.isArray(app.roles) ? app.roles.map((role: unknown) => String(role).toLowerCase()) : [];
  const role = String(app.role || "").toLowerCase();
  const trustedAppClaim = role === "admin" || roles.includes("admin") || app.is_admin === true;

  const email = String(user?.email || "").trim().toLowerCase();
  const verified = !!user?.email_confirmed_at;
  const allowlist = (Deno.env.get("ADMIN_EMAILS") || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return trustedAppClaim || (verified && !!email && allowlist.includes(email));
}

async function checkSupabase(user: any): Promise<Check> {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceKey) {
    const missing = [!url ? "SUPABASE_URL" : "", !serviceKey ? "SUPABASE_SERVICE_ROLE_KEY" : ""].filter(Boolean);
    return check("supabase", "Supabase Auth & database", "fail", "Missing server configuration: " + missing.join(", ") + ".");
  }
  try {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await admin.from("profiles").select("id", { head: true, count: "exact" }).eq("id", user.id);
    if (error) return check("supabase", "Supabase Auth & database", "fail", "The authenticated session is valid, but the private profile database check failed.");
    return check("supabase", "Supabase Auth & database", "pass", "Signed-in identity verified and private database access succeeded.");
  } catch {
    return check("supabase", "Supabase Auth & database", "fail", "Could not complete the Supabase database check.");
  }
}

async function checkGroq(): Promise<Check> {
  const key = Deno.env.get("GROQ_API_KEY") || Deno.env.get("LLM_API_KEY") || "";
  if (!key) return check("groq", "Groq AI connection", "fail", "GROQ_API_KEY (or LLM_API_KEY) is not configured.");
  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: "Bearer " + key },
      signal: AbortSignal.timeout(12000),
    });
    if (response.ok) return check("groq", "Groq AI connection", "pass", "Groq accepted the configured key and returned the available-models endpoint.");
    if (response.status === 401 || response.status === 403) return check("groq", "Groq AI connection", "fail", "Groq rejected the configured API key. Replace it in Supabase Edge Function secrets.");
    return check("groq", "Groq AI connection", "fail", "Groq returned HTTP " + response.status + ". Check provider status and account access.");
  } catch {
    return check("groq", "Groq AI connection", "fail", "Could not reach the Groq API within the diagnostic time limit.");
  }
}

async function checkPayPal(): Promise<Check> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
  const monthlyId = Deno.env.get("PAYPAL_PLAN_MONTHLY_ID") || "";
  const yearlyId = Deno.env.get("PAYPAL_PLAN_YEARLY_ID") || "";
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID") || "";
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
  const missing = [
    !clientId ? "PAYPAL_CLIENT_ID" : "",
    !clientSecret ? "PAYPAL_CLIENT_SECRET" : "",
    !monthlyId ? "PAYPAL_PLAN_MONTHLY_ID" : "",
    !yearlyId ? "PAYPAL_PLAN_YEARLY_ID" : "",
    !webhookId ? "PAYPAL_WEBHOOK_ID" : "",
    !supabaseUrl ? "SUPABASE_URL" : "",
  ].filter(Boolean);
  const mode = Deno.env.get("PAYPAL_MODE") === "sandbox" ? "sandbox" : "live";
  if (missing.length) return check("paypal", "PayPal subscriptions", "fail", "Missing server configuration: " + missing.join(", ") + ".");

  const base = mode === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
  try {
    const tokenResponse = await fetch(base + "/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(clientId + ":" + clientSecret),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(12000),
    });
    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenData.access_token) {
      if (tokenResponse.status === 401 || tokenResponse.status === 403) return check("paypal", "PayPal subscriptions (" + mode + ")", "fail", "PayPal rejected the configured client credentials.");
      return check("paypal", "PayPal subscriptions (" + mode + ")", "fail", "PayPal OAuth returned HTTP " + tokenResponse.status + ".");
    }

    const token = String(tokenData.access_token);
    const getPayPal = async (path: string) => {
      const response = await fetch(base + path, {
        headers: { Authorization: "Bearer " + token, Accept: "application/json" },
        signal: AbortSignal.timeout(12000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("paypal_resource_" + response.status);
      return data;
    };
    const [monthly, yearly, webhook] = await Promise.all([
      getPayPal("/v1/billing/plans/" + encodeURIComponent(monthlyId)),
      getPayPal("/v1/billing/plans/" + encodeURIComponent(yearlyId)),
      getPayPal("/v1/notifications/webhooks/" + encodeURIComponent(webhookId)),
    ]);

    const issues: string[] = [];
    const verifyPlan = (plan: any, amount: number, unit: string, label: string) => {
      const cycle = (plan.billing_cycles || []).find((item: any) => item.tenure_type === "REGULAR");
      const price = cycle?.pricing_scheme?.fixed_price;
      const frequency = cycle?.frequency;
      if (String(plan.status || "").toUpperCase() !== "ACTIVE") issues.push(label + " plan is not ACTIVE.");
      if (!price || price.currency_code !== "USD" || Number(price.value) !== amount) issues.push(label + " plan is not configured for USD " + amount.toFixed(2) + ".");
      if (!frequency || frequency.interval_unit !== unit || Number(frequency.interval_count) !== 1) issues.push(label + " plan billing frequency is incorrect.");
    };
    verifyPlan(monthly, 8, "MONTH", "Monthly");
    verifyPlan(yearly, 60, "YEAR", "Annual");

    const expectedUrl = supabaseUrl + "/functions/v1/paypal-webhook";
    const actualUrl = String(webhook.url || "").replace(/\/+$/, "");
    if (actualUrl !== expectedUrl) issues.push("The PayPal webhook URL does not match the active Supabase webhook endpoint.");

    const requiredEvents = [
      "BILLING.SUBSCRIPTION.CREATED",
      "BILLING.SUBSCRIPTION.ACTIVATED",
      "BILLING.SUBSCRIPTION.UPDATED",
      "BILLING.SUBSCRIPTION.CANCELLED",
      "BILLING.SUBSCRIPTION.SUSPENDED",
      "BILLING.SUBSCRIPTION.EXPIRED",
      "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
      "PAYMENT.SALE.COMPLETED",
      "PAYMENT.SALE.REFUNDED",
      "PAYMENT.SALE.REVERSED",
    ];
    const enabledEvents = new Set((webhook.event_types || [])
      .filter((item: any) => String(item.status || "ENABLED").toUpperCase() !== "DISABLED")
      .map((item: any) => String(item.name || "")));
    const missingEvents = requiredEvents.filter((event) => !enabledEvents.has(event));
    if (missingEvents.length) issues.push("The PayPal webhook is missing " + missingEvents.length + " required event subscription(s).");

    return issues.length
      ? check("paypal", "PayPal subscriptions (" + mode + ")", "fail", issues.join(" "))
      : check("paypal", "PayPal subscriptions (" + mode + ")", "pass", "PayPal credentials, active monthly/yearly plans, pricing, billing frequency, webhook URL and required event subscriptions are verified. This is a configuration check, not a live purchase test.");
  } catch (error) {
    const message = String((error as Error)?.message || "");
    const status = message.match(/paypal_resource_(\d{3})/)?.[1];
    return check("paypal", "PayPal subscriptions (" + mode + ")", "fail", status ? "A PayPal plan or webhook lookup failed with HTTP " + status + ". Check the configured IDs and permissions." : "Could not complete the PayPal configuration checks.");
  }
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");
  if (!allowedOrigin(origin)) return reply({ error: "Origin not allowed." }, 403, origin);
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed." }, 405, origin);

  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = publicKey();
  if (!token || !url || !key) return reply({ error: "Sign in to Einstein Minds before running diagnostics." }, 401, origin);

  try {
    const auth = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error } = await auth.auth.getUser(token);
    if (error || !user) return reply({ error: "Your sign-in session is invalid or expired. Sign in again." }, 401, origin);
    if (!isAdministrator(user)) return reply({ error: "Administrator access is not enabled for this account. The project owner must configure ADMIN_EMAILS or a trusted app_metadata admin role." }, 403, origin);

    const checks = await Promise.all([
      checkSupabase(user),
      checkGroq(),
      checkPayPal(),
    ]);
    return reply({
      ok: checks.every((item) => item.status === "pass"),
      checked_at: new Date().toISOString(),
      checks,
      note: "Read-only diagnostics. No credentials, tokens, payment details or personal records are returned. A successful configuration check does not prove a completed customer purchase or webhook delivery.",
    }, 200, origin);
  } catch {
    return reply({ error: "Diagnostics could not be completed. Please try again." }, 500, origin);
  }
});
