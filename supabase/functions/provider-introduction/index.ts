import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set(["https://einsteinminds.com","https://www.einsteinminds.com","http://localhost:8888"]);
const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://einsteinminds.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body: unknown, status=200, origin: string | null=null) =>
  new Response(JSON.stringify(body), { status, headers:{...cors(origin),"Content-Type":"application/json","Cache-Control":"no-store"} });

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,"<").replace(/&gt;/gi,">")
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(0x10ffff,Number(n))))
    .replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(Math.min(0x10ffff,parseInt(n,16))));
}
function isPrivateAddress(value: string) {
  const ip = value.toLowerCase();
  if (ip.includes(":")) return ip === "::" || ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe8") || ip.startsWith("fe9") || ip.startsWith("fea") || ip.startsWith("feb") || ip.startsWith("ff") || ip.startsWith("::ffff:");
  const a = ip.split(".").map(Number);
  if (a.length !== 4 || a.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [x,y] = a;
  return x===0 || x===10 || x===127 || (x===169&&y===254) || (x===172&&y>=16&&y<=31) ||
    (x===192&&y===168) || (x===100&&y>=64&&y<=127) || x>=224;
}
async function assertPublicHost(host: string) {
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host) || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[")) throw new Error("private_or_ip_host");
  const resolver = (Deno as any).resolveDns;
  if (typeof resolver === "function") {
    const answers: string[] = [];
    for (const type of ["A","AAAA"]) {
      try { answers.push(...await resolver(host,type)); } catch (_) { /* Host may not publish this record type. */ }
    }
    if (!answers.length || answers.some(isPrivateAddress)) throw new Error("host_not_public");
  }
}
function findDescription(html: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const candidates: Array<{kind:string,value:string}> = [];
  for (const tag of tags) {
    const attrs: Record<string,string> = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    const key = (attrs.property || attrs.name || "").toLowerCase();
    if (key === "og:description") candidates.push({kind:"og:description",value:attrs.content||""});
    else if (key === "description") candidates.push({kind:"meta:description",value:attrs.content||""});
    else if (key === "twitter:description") candidates.push({kind:"twitter:description",value:attrs.content||""});
  }
  const found = candidates.find(x => x.value.trim());
  if (!found) return null;
  const text = decodeEntities(found.value).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,300);
  return text ? {introduction:text,source_kind:found.kind} : null;
}
async function readBounded(response: Response, maxBytes: number) {
  const length = Number(response.headers.get("content-length") || 0);
  if (length > maxBytes) throw new Error("provider_page_too_large");
  if (!response.body) throw new Error("provider_body_unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let total=0;
  while(true) {
    const {done,value}=await reader.read(); if(done) break;
    total+=value.byteLength; if(total>maxBytes){await reader.cancel();throw new Error("provider_page_too_large");}
    chunks.push(value);
  }
  const joined=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.byteLength;}
  return new TextDecoder("utf-8",{fatal:false}).decode(joined);
}
async function fetchProviderDescription(raw: string, host: string) {
  let current = new URL(raw);
  for (let redirect=0; redirect<=2; redirect++) {
    if(current.protocol!=="https:" || current.username || current.password || (current.port && current.port!=="443") || current.hostname.toLowerCase()!==host) throw new Error("provider_host_changed");
    await assertPublicHost(host);
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8500);
    let response:Response;
    try {
      response=await fetch(current.href,{method:"GET",redirect:"manual",signal:controller.signal,headers:{
        "User-Agent":"EinsteinmindsResourceMetadata/1.0 (+https://einsteinminds.com)",
        "Accept":"text/html,application/xhtml+xml;q=0.9"
      }});
    } finally { clearTimeout(timer); }
    if([301,302,303,307,308].includes(response.status)){
      const location=response.headers.get("location");if(!location||redirect===2)throw new Error("provider_redirect_limit");
      current=new URL(location,current);continue;
    }
    if(!response.ok)throw new Error("provider_http_"+response.status);
    const contentType=response.headers.get("content-type")||"";
    if(!/text\/html|application\/xhtml\+xml/i.test(contentType))throw new Error("provider_not_html");
    const description=findDescription(await readBounded(response,600000));
    return description ? {...description,source_url:current.href} : null;
  }
  throw new Error("provider_redirect_limit");
}

Deno.serve(async (req:Request)=>{
  const origin=req.headers.get("Origin");
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors(origin)});
  if(origin&&!allowedOrigins.has(origin))return json({error:"Origin not allowed"},403,origin);
  if(req.method!=="POST")return json({error:"Method not allowed"},405,origin);
  try {
    const body=await req.json();const id=String(body?.resource_id||"");
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return json({error:"Valid resource ID required"},400,origin);
    const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!url||!anon||!service)return json({error:"Provider metadata service is not configured"},503,origin);
    const readClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
    const writeClient=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:resource,error}=await readClient.from("resources")
      .select("id,canonical_url,official_domain,provider_introduction,intro_status,intro_source_url,intro_language,intro_retrieved_at,is_published")
      .eq("id",id).eq("is_published",true).maybeSingle();
    if(error||!resource)return json({error:"Resource not found"},404,origin);
    const age=resource.intro_retrieved_at?Date.now()-Date.parse(resource.intro_retrieved_at):Infinity;
    const ttl=resource.intro_status==="unavailable"?24*60*60*1000:30*24*60*60*1000;
    if(resource.intro_retrieved_at&&age<ttl){
      return json({introduction:resource.provider_introduction||null,source_url:resource.intro_source_url||resource.canonical_url,
        source_kind:resource.intro_status,retrieved_at:resource.intro_retrieved_at,cached:true},200,origin);
    }
    const canonical=new URL(resource.canonical_url);
    const host=resource.official_domain.toLowerCase();
    if(canonical.protocol!=="https:"||canonical.hostname.toLowerCase()!==host) return json({error:"Stored provider URL failed host validation"},409,origin);
    let metadata=null;
    try{metadata=await fetchProviderDescription(canonical.href,host);}catch(error){console.warn("Provider metadata retrieval:",id,String(error));}
    const updatedAt=new Date().toISOString();
    const update={
      provider_introduction:metadata?.introduction||null,
      intro_status:metadata?"official_meta":"unavailable",
      intro_source_url:metadata?.source_url||canonical.href,
      intro_language:resource.intro_language||null,
      intro_retrieved_at:updatedAt,
      last_checked_at:updatedAt
    };
    const {error:updateError}=await writeClient.from("resources").update(update).eq("id",id);
    if(updateError)console.error("Provider intro cache update failed:",updateError.message);
    return json({introduction:update.provider_introduction,source_url:update.intro_source_url,
      source_kind:update.intro_status,retrieved_at:updatedAt,cached:false},200,origin);
  }catch(error){console.error("provider-introduction error:",error);return json({error:"Unable to retrieve provider metadata"},400,origin);}
});