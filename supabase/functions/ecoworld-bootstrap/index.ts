import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
async function sha256(value:string){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST") return json({error:"Method not allowed"},405);
  try{
    const body=await req.json(); const email=String(body?.email||"").trim().toLowerCase(); const password=String(body?.password||""); const setupToken=String(body?.setupToken||"");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:"Enter a valid email."},400);
    if(password.length<8) return json({error:"Password must contain at least 8 characters."},400);
    if(!setupToken) return json({error:"Setup token is required."},400);
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
    const {data:bootstrap,error:bootstrapError}=await admin.from("ecoworld_bootstrap").select("setup_token_hash,claimed_at").eq("id",1).single();
    if(bootstrapError||!bootstrap) return json({error:"Bootstrap configuration is unavailable."},500);
    if(bootstrap.claimed_at) return json({error:"Management setup has already been completed."},409);
    if(await sha256(setupToken)!==bootstrap.setup_token_hash) return json({error:"Invalid setup token."},403);
    const {data:usersData,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000}); if(listError) throw listError;
    let user=usersData.users.find(item=>String(item.email||"").toLowerCase()===email)||null;
    if(!user){const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{ecoworld_portal:true}});if(createError) throw createError;user=created.user;}
    else{const {data:updated,error:updateError}=await admin.auth.admin.updateUserById(user.id,{password,email_confirm:true,user_metadata:{...(user.user_metadata||{}),ecoworld_portal:true}});if(updateError) throw updateError;user=updated.user;}
    const now=new Date().toISOString();
    const {error:profileError}=await admin.from("ecoworld_profiles").upsert({user_id:user.id,consultant_key:null,display_name:"Internal",email,role:"Management",active:true,updated_at:now},{onConflict:"user_id"});if(profileError) throw profileError;
    const {data:claimed,error:claimError}=await admin.from("ecoworld_bootstrap").update({claimed_at:now,claimed_by:user.id}).eq("id",1).is("claimed_at",null).select("id");if(claimError) throw claimError;
    if(!claimed?.length) return json({error:"Management setup was completed by another request."},409);
    await admin.from("ecoworld_audit_log").insert({actor_user_id:user.id,action:"management_bootstrap",entity_type:"profile",entity_id:user.id,details:{email}});
    return json({ok:true,email});
  }catch(error){console.error(error);return json({error:error instanceof Error?error.message:"Setup failed."},400);}
});
