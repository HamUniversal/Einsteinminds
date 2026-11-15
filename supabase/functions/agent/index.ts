import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
function demoReply(intent: string) {
  return `DEMO COACH (${intent}): try restating the task in your own words, then name the first small step you can justify. (Live model not reached — scripted fallback.)`;
}

const SYSTEM = `You are Einstein, a learning coach on Einsteinminds.
RULES:
- Never invent citations, statistics, institutions or URLs. If you mention a resource, use ONLY entries from the PROVIDED RESOURCE LIST (name + url).
- If the learner is stuck or wrong, offer a hint or guiding question BEFORE any full solution.
- Occasionally ask how confident they feel; a correct guess is not the same as understanding.
- Under 250 words, plain language, warm. Never a verdict on the learner's ability.
- If the message suggests self-harm or crisis: do not teach. Respond with care and direct them to a trusted adult or local emergency number (US: call/text 988).
- Say openly when you are uncertain.`;

const prefers = (id: string) =>
  /gpt-oss-120b|gpt-oss-20b|llama-3\.3-70b|llama-3\.1-8b|llama-4-scout|mixtral-8x7b|qwen3-32b/.test(id) ? 0 : 1;

async function chat(base: string, key: string, model: string, messages: any[]) {
  return fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, temperature: 0.4, max_tokens: 600, messages }),
  });
}

async function pickModel(base: string, key: string, fallback: string) {
  try {
    const r = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) return fallback;
    const d = await r.json();
    const ids: string[] = (d?.data || []).map((m: any) => m?.id).filter(Boolean);
    if (!ids.length) return fallback;
    ids.sort((a, b) => prefers(a) - prefers(b) || a.localeCompare(b));
    return ids[0];
  } catch { return fallback; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } }, auth: { persistSession: false },
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return json({ error: "Sign in required." }, 401);

    const body = await req.json();
    const prompt = String(body.prompt || "").slice(0, 4000);
    const intent = String(body.intent || "hint");
    const resources = Array.isArray(body.resources) ? body.resources.slice(0, 6) : [];
    if (!prompt.trim()) return json({ error: "Empty prompt." }, 400);

    const key = Deno.env.get("LLM_API_KEY");
    if (!key) { console.error("LLM_API_KEY missing"); return json({ demo: true, reason: "missing_key", reply: demoReply(intent) }); }

    const base = Deno.env.get("LLM_BASE_URL") || "https://api.groq.com/openai/v1";
    let model = Deno.env.get("LLM_MODEL") || "";
    const list = resources.length
      ? `\nPROVIDED RESOURCE LIST (only these may be cited):\n` + resources.map((r: any) => `- ${r.title}: ${r.url}`).join("\n")
      : "";
    const messages = [
      { role: "system", content: SYSTEM + list },
      { role: "user", content: `Coaching intent: ${intent}\nLearner message: ${prompt}` },
    ];

    if (!model) model = await pickModel(base, key, "llama-3.1-8b-instant");
    let r = await chat(base, key, model, messages);
    if (r.status === 404 || r.status === 400) {
      const discovered = await pickModel(base, key, model);
      if (discovered !== model) { model = discovered; r = await chat(base, key, model, messages); }
    }
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("LLM HTTP", r.status, detail.slice(0, 300));
      return json({ demo: true, reason: `provider_http_${r.status}`, reply: demoReply(intent) });
    }
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) { console.error("LLM empty reply"); return json({ demo: true, reason: "empty_reply", reply: demoReply(intent) }); }
    return json({ demo: false, model, reply });
  } catch (e) {
    console.error("agent function error", e);
    return json({ demo: true, reason: `exception:${String(e).slice(0, 120)}`, reply: demoReply("hint") });
  }
});