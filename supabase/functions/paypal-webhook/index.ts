import { createClient } from "npm:@supabase/supabase-js@2";
const apiBase=()=>Deno.env.get("PAYPAL_MODE")==="sandbox"?"https://api-m.sandbox.paypal.com":"https://api-m.paypal.com";
async function paypalToken(){
 const id=Deno.env.get("PAYPAL_CLIENT_ID"),secret=Deno.env.get("PAYPAL_CLIENT_SECRET");if(!id||!secret)throw new Error("paypal_not_configured");
 const r=await fetch(apiBase()+"/v1/oauth2/token",{method:"POST",headers:{Authorization:"Basic "+btoa(id+":"+secret),"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials"});
 const d=await r.json();if(!r.ok||!d.access_token)throw new Error("paypal_auth_failed");return d.access_token as string;
}
async function paypalRequest(token:string,path:string,method="GET",body?:unknown){
 const r=await fetch(apiBase()+path,{method,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json","Accept":"application/json"},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error("paypal_api_"+r.status);return d;
}
async function verify(token:string,event:any,headers:Headers){
 const webhookId=Deno.env.get("PAYPAL_WEBHOOK_ID");if(!webhookId)throw new Error("webhook_not_configured");
 const payload={auth_algo:headers.get("paypal-auth-algo"),cert_url:headers.get("paypal-cert-url"),transmission_id:headers.get("paypal-transmission-id"),transmission_sig:headers.get("paypal-transmission-sig"),transmission_time:headers.get("paypal-transmission-time"),webhook_id:webhookId,webhook_event:event};
 if(Object.values(payload).some(v=>!v))return false;
 const result=await paypalRequest(token,"/v1/notifications/verify-webhook-signature","POST",payload);
 return result.verification_status==="SUCCESS";
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok");
 if(req.method!=="POST")return new Response("Method not allowed",{status:405});
 try{
  const raw=await req.text();if(raw.length>1024*1024)return new Response("Payload too large",{status:413});
  const event=JSON.parse(raw);if(!event?.id||!event?.event_type)return new Response("Invalid event",{status:400});
  const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!service)throw new Error("supabase_not_configured");
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:seen}=await admin.from("paypal_webhook_events").select("event_id").eq("event_id",event.id).maybeSingle();
  if(seen)return new Response("Already processed",{status:200});
  const token=await paypalToken();if(!await verify(token,event,req.headers))return new Response("Invalid PayPal signature",{status:400});
  const type=String(event.event_type),resource=event.resource||{};
  const subscriptionEvents=new Set(["BILLING.SUBSCRIPTION.CREATED","BILLING.SUBSCRIPTION.ACTIVATED","BILLING.SUBSCRIPTION.UPDATED","BILLING.SUBSCRIPTION.CANCELLED","BILLING.SUBSCRIPTION.SUSPENDED","BILLING.SUBSCRIPTION.EXPIRED","BILLING.SUBSCRIPTION.PAYMENT.FAILED"]);
  if(subscriptionEvents.has(type)){
   const id=String(resource.id||"");
   if(id){
    const sub=await paypalRequest(token,"/v1/billing/subscriptions/"+encodeURIComponent(id)),owner=String(sub.custom_id||"");
    if(!owner)throw new Error("subscription_owner_missing");
    const monthly=Deno.env.get("PAYPAL_PLAN_MONTHLY_ID")||"",yearly=Deno.env.get("PAYPAL_PLAN_YEARLY_ID")||"",planId=String(sub.plan_id||"");
    if(planId!==monthly&&planId!==yearly)throw new Error("unknown_subscription_plan");
    let forced:string|undefined;
    if(type==="BILLING.SUBSCRIPTION.CANCELLED")forced="CANCELLED";
    else if(type==="BILLING.SUBSCRIPTION.SUSPENDED")forced="SUSPENDED";
    else if(type==="BILLING.SUBSCRIPTION.EXPIRED")forced="EXPIRED";
    else if(type==="BILLING.SUBSCRIPTION.PAYMENT.FAILED")forced="PAYMENT_FAILED";
    const {data:previous}=await admin.from("paypal_subscriptions").select("payment_status").eq("paypal_subscription_id",id).maybeSingle();
    let status=forced||String(sub.status||"").toUpperCase();
    if(type==="BILLING.SUBSCRIPTION.UPDATED"&&status==="ACTIVE"&&previous?.payment_status==="FAILED")status="PAYMENT_FAILED";
    const row:any={user_id:owner,paypal_subscription_id:id,paypal_plan_id:planId,plan_key:planId===monthly?"monthly":"yearly",status,payer_email:sub.subscriber?.email_address||null,next_billing_time:sub.billing_info?.next_billing_time||null,updated_at:new Date().toISOString()};
    if(type==="BILLING.SUBSCRIPTION.PAYMENT.FAILED")row.payment_status="FAILED";
    const {error}=await admin.from("paypal_subscriptions").upsert(row,{onConflict:"paypal_subscription_id"});if(error)throw new Error("subscription_upsert_failed");
   }
  }else if(type.startsWith("PAYMENT.SALE.")){
   const id=String(resource.billing_agreement_id||resource.subscription_id||"");
   if(id){
    const patch:any={updated_at:new Date().toISOString()};
    if(type==="PAYMENT.SALE.COMPLETED"){
      patch.last_payment_at=resource.create_time||new Date().toISOString();patch.payment_status="COMPLETED";
      const sub=await paypalRequest(token,"/v1/billing/subscriptions/"+encodeURIComponent(id));
      if(sub.status==="ACTIVE")patch.status="ACTIVE";
    }else if(type==="PAYMENT.SALE.REFUNDED")patch.payment_status="REFUNDED";
    else if(type==="PAYMENT.SALE.REVERSED"){patch.payment_status="REVERSED";patch.status="SUSPENDED";}
    const {error}=await admin.from("paypal_subscriptions").update(patch).eq("paypal_subscription_id",id);if(error)throw new Error("payment_event_update_failed");
   }
  }
  const {error:ledgerError}=await admin.from("paypal_webhook_events").insert({event_id:event.id,event_type:type});
  if(ledgerError&&ledgerError.code!=="23505")throw new Error("webhook_ledger_write_failed");
  return new Response("OK",{status:200});
 }catch(error){console.error("paypal-webhook error",String(error));return new Response("Webhook processing failed",{status:500});}
});
