import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set(["https://einsteinminds.com","https://www.einsteinminds.com","http://localhost:8888"]);
const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://einsteinminds.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
});
const reply = (body: unknown, status=200, origin: string | null=null) =>
  new Response(JSON.stringify(body), {status,headers:{...cors(origin),"Content-Type":"application/json","Cache-Control":"public, max-age=30, stale-while-revalidate=120"}});
const STAGES = new Set(["pre_k","kindergarten","primary","middle","secondary","vocational","undergraduate","graduate","doctoral","professional","entrepreneur","lifelong"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function safeStoredHttps(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") &&
      !/^(localhost|.*\.local|.*\.internal)$/i.test(url.hostname) &&
      !/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname);
  } catch { return false; }
}
const orderRows = (rows:any[], sort:string) => rows.sort((a,b) => {
  if (sort === "name_desc") return String(b.name).localeCompare(String(a.name));
  if (sort === "recently_checked") {
    const ta = a.last_checked_at ? Date.parse(a.last_checked_at) : 0;
    const tb = b.last_checked_at ? Date.parse(b.last_checked_at) : 0;
    return tb - ta || String(a.name).localeCompare(String(b.name));
  }
  return String(a.name).localeCompare(String(b.name));
});
const mapRows = (rows:any[]) => rows.map((row:any) => ({
  ...row,
  categories: (row.resource_category_links || []).map((link:any) => ({
    slug:link.resource_categories?.slug, name:link.resource_categories?.name
  })).filter((item:any) => item.slug)
}));

Deno.serve(async (req:Request)=>{
 const origin=req.headers.get("Origin");
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors(origin)});
 if(origin&&!allowedOrigins.has(origin))return reply({error:"Origin not allowed"},403,origin);
 if(req.method!=="POST")return reply({error:"Method not allowed"},405,origin);
 try{
  const body=await req.json();
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_ANON_KEY");
  if(!url||!key)return reply({error:"Catalogue service is not configured"},503,origin);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

  if(body?.action==="stats"){
   const [{data:categories,error:catError},{count:total,error:countError}]=await Promise.all([
    db.rpc("resource_category_counts"),
    db.from("resources").select("id",{count:"exact",head:true}).eq("is_published",true)
   ]);
   if(catError||countError)return reply({error:"Catalogue statistics unavailable"},503,origin);
   return reply({categories:categories||[],total:total||0},200,origin);
  }

  const q=typeof body?.query==="string"?body.query.trim().slice(0,180):"";
  const category=typeof body?.category==="string"?body.category.trim().slice(0,64):"";
  const level=typeof body?.learning_level==="string"?body.learning_level:"all";
  const page=Math.max(1,Math.min(100000,Number.isInteger(body?.page)?body.page:1));
  const pageSize=Math.max(1,Math.min(48,Number.isInteger(body?.page_size)?body.page_size:12));
  const sort=["name_desc","recently_checked"].includes(body?.sort)?body.sort:"name_asc";
  const requestedId=typeof body?.resource_id==="string"?body.resource_id:"";
  const resourceIds=Array.isArray(body?.resource_ids)?body.resource_ids.slice(0,500).map(String):null;
  const resourceUrls=Array.isArray(body?.resource_urls)?body.resource_urls.slice(0,500).map(String):null;
  if(category&&!/^[a-z0-9-]{2,64}$/.test(category))return reply({error:"Invalid category"},400,origin);
  if(level!=="all"&&level!=="unspecified"&&!STAGES.has(level))return reply({error:"Unsupported learning level"},400,origin);
  if(requestedId&&!UUID.test(requestedId))return reply({error:"Invalid resource identifier"},400,origin);
  if(resourceIds&&resourceIds.some(id=>!UUID.test(id)))return reply({error:"Invalid saved resource identifier"},400,origin);
  if(resourceUrls&&resourceUrls.some(value=>!safeStoredHttps(value)))return reply({error:"Invalid saved resource URL"},400,origin);
  if((resourceIds||resourceUrls)&&resourceIds?.length===0&&resourceUrls?.length===0)return reply({items:[],total:0,page,page_size:pageSize},200,origin);

  const selectFields="id,canonical_url,official_domain,name,resource_type,directory_description,provider_introduction,intro_status,intro_source_url,intro_language,original_language,supported_languages,country_or_region,cost_model,pricing_url,accessibility_metadata,licensing_metadata,privacy_url,evidence_status,source_status,editorial_status,learning_stages,learning_stage_evidence_url,learning_stage_reviewed_at,last_checked_at,last_successful_link_check,resource_category_links!inner(category_id,resource_categories!inner(slug,name))";
  async function baseQuery(){
   let query=db.from("resources").select(selectFields,{count:"exact"}).eq("is_published",true);
   if(category){
    const {data:cat,error:catError}=await db.from("resource_categories").select("id").eq("slug",category).eq("is_active",true).maybeSingle();
    if(catError)throw catError;
    if(!cat)return null;
    query=query.eq("resource_category_links.category_id",cat.id);
   }
   if(level==="unspecified")query=query.eq("learning_stages","{}");
   else if(level!=="all")query=query.contains("learning_stages",[level]);
   if(q)query=query.textSearch("search_document",q,{type:"websearch",config:"simple"});
   return { query };
  }

  if(resourceIds||resourceUrls){
   const jobs=[];
   if(resourceIds?.length){let query=(await baseQuery()).query;if(query)jobs.push(query.in("id",resourceIds).limit(500));}
   if(resourceUrls?.length){let query=(await baseQuery()).query;if(query)jobs.push(query.in("canonical_url",resourceUrls).limit(500));}
   const results=await Promise.all(jobs);
   if(results.some(result=>result.error)){console.error("saved-resource query error",results.find(result=>result.error)?.error?.message);return reply({error:"Saved resource search failed"},503,origin);}
   const unique=new Map();
   results.forEach(result=>(result.data||[]).forEach((row:any)=>unique.set(row.id,row)));
   const all=orderRows([...unique.values()],sort);
   const from=(page-1)*pageSize;
   return reply({items:mapRows(all.slice(from,from+pageSize)),total:all.length,page,page_size:pageSize},200,origin);
  }

  let query=(await baseQuery()).query;
  if(!query)return reply({items:[],total:0,page,page_size:pageSize},200,origin);
  if(requestedId)query=query.eq("id",requestedId);
  if(sort==="name_desc")query=query.order("name",{ascending:false});
  else if(sort==="recently_checked")query=query.order("last_checked_at",{ascending:false,nullsFirst:false}).order("name",{ascending:true});
  else query=query.order("name",{ascending:true});
  if(requestedId)query=query.limit(1);
  else query=query.range((page-1)*pageSize,(page*pageSize)-1);
  const {data,count,error}=await query;
  if(error){console.error("resource-search database error",error.message);return reply({error:"Catalogue query failed"},503,origin);}
  return reply({items:mapRows(data||[]),total:count??(data||[]).length,page,page_size:pageSize},200,origin);
 }catch(error){console.error("resource-search error",error);return reply({error:"Invalid catalogue search request"},400,origin);}
});