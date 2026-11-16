import { createClient } from "npm:@supabase/supabase-js@2";
const origins = new Set(["https://einsteinminds.com","https://www.einsteinminds.com","http://localhost:8888"]);
const cors = (origin:string|null) => ({"Access-Control-Allow-Origin":origin&&origins.has(origin)?origin:"https://einsteinminds.com","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"});
const reply=(body:unknown,status=200,origin:string|null=null)=>new Response(JSON.stringify(body),{status,headers:{...cors(origin),"Content-Type":"application/json","Cache-Control":"no-store"}});
const apiBase=()=>Deno.env.get("PAYPAL_MODE")==="sandbox"?"https://api-m.sandbox.paypal.com":"https://api-m.paypal.com";
async function paypalToken(){
 const id=Deno.env.get("PAYPAL_CLIENT_ID"),secret=Deno.env.get("PAYPAL_CLIENT_SECRET");
 if(!id||!secret)throw new Error("paypal_not_configured");
 const r=await fetch(apiBase()+"/v1/oauth2/token",{method:"POST",headers:{Authorization:"Basic "+btoa(id+":"+secret),"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials"});
 const d=await r.json();if(!r.ok||!d.access_token)throw new Error("paypal_auth_failed");return d.access_token as string;
}
async function paypalRequest(token:string,path:string,method="GET",body?:unknown){
 const r=await fetch(apiBase()+path,{method,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json","Accept":"application/json"},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const d=await r.json().catch(()=>({}));if(!r.ok){console.error("PayPal API failed",method,path,r.status,d?.name||d?.error);throw new Error("paypal_request_failed");}return d;
}
function planConfig(key:string){
 if(key==="monthly")return {planId:Deno.env.get("PAYPAL_PLAN_MONTHLY_ID")||"",key:"monthly"};
 if(key==="yearly")return {planId:Deno.env.get("PAYPAL_PLAN_YEARLY_ID")||"",key:"yearly"};
 throw new Error("invalid_plan");
}
async function getUser(req:Request){
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),authorization=req.headers.get("Authorization")||"";
 if(!url||!anon||!service||!authorization.startsWith("Bearer "))throw new Error("auth_required");
 const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await userClient.auth.getUser();if(error||!data.user)throw new Error("auth_required");
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 return {user:data.user,admin};
}
async function persistSubscription(admin:any,userId:string,sub:any,forcedStatus?:string){
 const monthly=Deno.env.get("PAYPAL_PLAN_MONTHLY_ID")||"",yearly=Deno.env.get("PAYPAL_PLAN_YEARLY_ID")||"",planId=String(sub.plan_id||"");
 const planKey=planId===monthly?"monthly":planId===yearly?"yearly":"";
 if(!planKey)throw new Error("unknown_paypal_plan");
 const status=forcedStatus||String(sub.status||"").toUpperCase();
 const allowed=new Set(["APPROVAL_PENDING","APPROVED","ACTIVE","SUSPENDED","CANCELLED","EXPIRED","PAYMENT_FAILED"]);
 if(!allowed.has(status))throw new Error("unknown_subscription_status");
 const row={user_id:userId,paypal_subscription_id:String(sub.id),paypal_plan_id:planId,plan_key:planKey,status,payer_email:sub.subscriber?.email_address||null,next_billing_time:sub.billing_info?.next_billing_time||null,updated_at:new Date().toISOString()};
 const {error}=await admin.from("paypal_subscriptions").upsert(row,{onConflict:"paypal_subscription_id"});if(error)throw new Error("subscription_save_failed");return row;
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("Origin");
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors(origin)});
 if(origin&&!origins.has(origin))return reply({error:"Origin not allowed"},403,origin);
 if(req.method!=="POST")return reply({error:"Method not allowed"},405,origin);
 try{
  const {user,admin}=await getUser(req),body=await req.json().catch(()=>({})),action=String(body.action||""),token=await paypalToken();
  if(action==="create"){
   const config=planConfig(String(body.plan_key||""));if(!config.planId)return reply({error:"Subscription plan is not configured yet."},503,origin);
   const {data:existing,error:existingError}=await admin.from("paypal_subscriptions").select("paypal_subscription_id,status").eq("user_id",user.id).in("status",["APPROVAL_PENDING","APPROVED","ACTIVE","SUSPENDED","PAYMENT_FAILED"]).order("updated_at",{ascending:false}).limit(1).maybeSingle();
   if(existingError)throw new Error("subscription_lookup_failed");
   if(existing)return reply({error:"An existing subscription is already pending or active. Manage it before starting another.",code:"subscription_exists"},409,origin);
   const appUrl=(Deno.env.get("APP_URL")||"https://einsteinminds.com").replace(/\/+$/,"");
   const sub=await paypalRequest(token,"/v1/billing/subscriptions","POST",{plan_id:config.planId,custom_id:user.id,application_context:{brand_name:"Einstein Minds",locale:"en-US",shipping_preference:"NO_SHIPPING",user_action:"SUBSCRIBE_NOW",return_url:appUrl+"/?paypal=success",cancel_url:appUrl+"/?paypal=cancel"}});
   const approval=(sub.links||[]).find((x:any)=>x.rel==="approve")?.href;if(!sub.id||!approval)throw new Error("paypal_approval_link_missing");
   try{await persistSubscription(admin,user.id,sub);}catch(error){try{await paypalRequest(token,"/v1/billing/subscriptions/"+encodeURIComponent(sub.id)+"/cancel","POST",{reason:"Local subscription record could not be created"});}catch(_){}throw error;}
   return reply({approval_url:approval,subscription_id:sub.id},200,origin);
  }
  if(action==="sync"||action==="cancel"){
   const id=String(body.subscription_id||"");if(!/^I-[A-Z0-9]+$/i.test(id))return reply({error:"Invalid subscription reference."},400,origin);
   const sub=await paypalRequest(token,"/v1/billing/subscriptions/"+encodeURIComponent(id));
   if(sub.custom_id!==user.id)return reply({error:"Subscription ownership could not be verified."},403,origin);
   if(action==="sync"){const row=await persistSubscription(admin,user.id,sub);return reply({status:row.status,plan_key:row.plan_key},200,origin);}
   if(["CANCELLED","EXPIRED"].includes(String(sub.status||"").toUpperCase()))return reply({status:sub.status},200,origin);
   await paypalRequest(token,"/v1/billing/subscriptions/"+encodeURIComponent(id)+"/cancel","POST",{reason:"Cancelled by subscriber"});
   const {error}=await admin.from("paypal_subscriptions").update({cancel_requested_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("paypal_subscription_id",id).eq("user_id",user.id);
   if(error)throw new Error("subscription_cancel_record_failed");return reply({status:"CANCELLATION_REQUESTED"},200,origin);
  }
  if(action==="status"){
   const {data,error}=await admin.from("paypal_subscriptions").select("plan_key,status,payer_email,next_billing_time,cancel_requested_at,created_at").eq("user_id",user.id).order("updated_at",{ascending:false}).limit(1).maybeSingle();
   if(error)throw new Error("subscription_lookup_failed");return reply({subscription:data||null},200,origin);
  }
  return reply({error:"Unsupported action."},400,origin);
 }catch(error){
  const message=String(error),status=message.includes("auth_required")?401:message.includes("paypal_not_configured")?503:400;
  console.error("paypal-subscriptions error",message);
  return reply({error:status===503?"PayPal is not configured yet.":status===401?"Please sign in again.":"The subscription request could not be completed."},status,origin);
 }
});
