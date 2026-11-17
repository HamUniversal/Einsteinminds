import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins=new Set(["https://einsteinminds.com","https://www.einsteinminds.com","https://darkturquoise-magpie-142020.hostingersite.com","https://honeydew-giraffe-234540.hostingersite.com","http://localhost:8888"]);
const isAllowedOrigin = (origin:string|null) => {
  if (!origin || allowedOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && !url.port && url.hostname.endsWith(".hostingersite.com");
  } catch { return false; }
};
const cors=(origin:string|null)=>({"Access-Control-Allow-Origin":origin&&isAllowedOrigin(origin)?origin:"https://einsteinminds.com","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"});
const json=(body:unknown,status=200,origin:string|null=null)=>new Response(JSON.stringify(body),{status,headers:{...cors(origin),"Content-Type":"application/json","Cache-Control":"no-store"}});
function safeDestination(raw:string,expectedHost:string){
 const url=new URL(raw);
 if(url.protocol!=="https:"||url.username||url.password||(url.port&&url.port!=="443"))throw new Error("Unsafe provider URL");
 if(url.hostname.toLowerCase()!==expectedHost.toLowerCase())throw new Error("Provider host mismatch");
 if(/^(localhost|.*\.local|.*\.internal)$/i.test(url.hostname)||/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname))throw new Error("Non-public provider host");
 return url;
}
function mayAppendCampaign(url:URL){
 const keys=[...url.searchParams.keys()].map(x=>x.toLowerCase());
 const signed=/^(sig|signature|token|access_token|auth|authorization|expires|x-amz-|x-goog-|key|code|state|redirect_uri)/;
 if(keys.some(k=>signed.test(k)))return false;
 if(["utm_source","utm_medium","utm_campaign"].some(k=>url.searchParams.has(k)))return false;
 return true;
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("Origin");
 if(!isAllowedOrigin(origin)) return json({error:"Origin not allowed"},403,origin);
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors(origin)});
 if(req.method!=="POST")return json({error:"Method not allowed"},405,origin);
 try{
  const body=await req.json(),id=String(body?.resource_id||""),category=String(body?.category_slug||"").slice(0,64),addUtm=body?.add_utm!==false;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return json({error:"Valid resource identifier required"},400,origin);
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_ANON_KEY");
  if(!url||!key)return json({error:"Outbound gateway is not configured"},503,origin);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:resource,error}=await db.from("resources").select("id,canonical_url,official_domain,is_published").eq("id",id).eq("is_published",true).maybeSingle();
  if(error||!resource)return json({error:"Resource unavailable"},404,origin);
  const destination=safeDestination(resource.canonical_url,resource.official_domain);
  const utmApplied=addUtm&&mayAppendCampaign(destination);
  if(utmApplied){
   destination.searchParams.set("utm_source","einsteinminds");
   destination.searchParams.set("utm_medium","referral");
   destination.searchParams.set("utm_campaign","resource_discovery");
   if(/^[a-z0-9-]{2,64}$/.test(category))destination.searchParams.set("utm_content",category);
  }
  const {error:logError}=await db.from("resource_outbound_events").insert({
   resource_id:resource.id,category_slug:/^[a-z0-9-]{2,64}$/.test(category)?category:null,
   provider_host:resource.official_domain,utm_applied:utmApplied
  });
  if(logError)console.error("Outbound event was not recorded:",logError.message);
  return json({destination_url:destination.toString(),provider_host:resource.official_domain,utm_applied:utmApplied,tracked:!logError},200,origin);
 }catch(error){console.error("Outbound gateway error:",error);return json({error:"Unable to prepare this external destination"},400,origin);}
});