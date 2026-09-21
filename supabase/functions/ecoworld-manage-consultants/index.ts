import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
function parseProjectKey(projectKey:string){const [region="",businessUnit="",project=""]=String(projectKey||"").split("|||");return{projectKey,region,businessUnit,project};}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST") return json({error:"Method not allowed"},405);
  try{
    const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,""); if(!token) return json({error:"Unauthorized"},401);
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
    const {data:userData,error:userError}=await admin.auth.getUser(token); if(userError||!userData.user) return json({error:"Unauthorized"},401); const actor=userData.user;
    const {data:actorProfile,error:actorProfileError}=await admin.from("ecoworld_profiles").select("role,active").eq("user_id",actor.id).single();
    if(actorProfileError||actorProfile?.role!=="Management"||actorProfile?.active!==true) return json({error:"Management access required."},403);
    const body=await req.json(); const accounts=Array.isArray(body?.accounts)?body.accounts:[]; const seenKeys=new Set<string>(); const seenEmails=new Set<string>();
    for(const raw of accounts){const consultantKey=String(raw?.id||"").trim();const name=String(raw?.name||"").trim();const email=String(raw?.email||"").trim().toLowerCase();const password=String(raw?.password||"");
      if(!consultantKey||!/^[a-zA-Z0-9_-]+$/.test(consultantKey)) return json({error:"Invalid consultant account ID."},400); if(!name) return json({error:"Consultant name is required."},400);
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:`Invalid email for ${name}.`},400); if(seenKeys.has(consultantKey)) return json({error:"Duplicate consultant account ID."},400); if(seenEmails.has(email)) return json({error:"Each consultant must use a unique email."},400);
      if(password&&password.length<8) return json({error:`Password for ${name} must contain at least 8 characters.`},400); seenKeys.add(consultantKey);seenEmails.add(email);
    }
    const {data:existingProfiles,error:profilesError}=await admin.from("ecoworld_profiles").select("user_id,consultant_key,display_name,email,active").eq("role","Consultant");if(profilesError) throw profilesError;
    const byKey=new Map((existingProfiles||[]).map((p:any)=>[p.consultant_key,p])); const {data:usersData,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000});if(listError) throw listError;
    const authByEmail=new Map(usersData.users.map((u:any)=>[String(u.email||"").toLowerCase(),u])); const finalAccounts:any[]=[];
    for(const raw of accounts){const consultantKey=String(raw.id).trim();const name=String(raw.name).trim();const email=String(raw.email).trim().toLowerCase();const password=String(raw.password||"");const active=raw.active!==false;const projectKeys=Array.isArray(raw.projectKeys)?[...new Set(raw.projectKeys.map(String))]:[];const existing=byKey.get(consultantKey) as any;let authUser:any=null;
      if(existing){const updates:Record<string,unknown>={};if(String(existing.email||"").toLowerCase()!==email) updates.email=email;if(password) updates.password=password;if(Object.keys(updates).length){const {data:updated,error:updateError}=await admin.auth.admin.updateUserById(existing.user_id,updates);if(updateError) throw updateError;authUser=updated.user;}else authUser=usersData.users.find((u:any)=>u.id===existing.user_id)||null;}
      else{authUser=authByEmail.get(email)||null;if(!authUser){if(!password) return json({error:`Set an initial password for ${name}.`},400);const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{ecoworld_portal:true}});if(createError) throw createError;authUser=created.user;}else if(password){const {data:updated,error:updateError}=await admin.auth.admin.updateUserById(authUser.id,{password});if(updateError) throw updateError;authUser=updated.user;}}
      if(!authUser?.id) return json({error:`Unable to resolve login for ${name}.`},400);
      const {error:upsertProfileError}=await admin.from("ecoworld_profiles").upsert({user_id:authUser.id,consultant_key:consultantKey,display_name:name,email,role:"Consultant",active},{onConflict:"user_id"});if(upsertProfileError) throw upsertProfileError;
      const {error:deleteAccessError}=await admin.from("ecoworld_project_access").delete().eq("user_id",authUser.id);if(deleteAccessError) throw deleteAccessError;
      const accessRows=projectKeys.map((key:string)=>{const parsed=parseProjectKey(key);return{user_id:authUser.id,project_key:parsed.projectKey,region:parsed.region,business_unit:parsed.businessUnit,project:parsed.project,assigned_by:actor.id};}).filter((row:any)=>row.region&&row.business_unit&&row.project);
      if(accessRows.length){const {error:insertAccessError}=await admin.from("ecoworld_project_access").insert(accessRows);if(insertAccessError) throw insertAccessError;}
      finalAccounts.push({id:consultantKey,userId:authUser.id,name,email,active,projectKeys});
    }
    const requestedKeys=new Set(accounts.map((a:any)=>String(a.id||"").trim())); for(const profile of existingProfiles||[]){if(!requestedKeys.has(String(profile.consultant_key||""))){const {error:removeError}=await admin.from("ecoworld_profiles").delete().eq("user_id",profile.user_id);if(removeError) throw removeError;}}
    await admin.from("ecoworld_audit_log").insert({actor_user_id:actor.id,action:"consultant_accounts_saved",entity_type:"consultant_access",entity_id:null,details:{account_count:finalAccounts.length}});
    return json({ok:true,accounts:finalAccounts});
  }catch(error){console.error(error);return json({error:error instanceof Error?error.message:"Unable to save consultant accounts."},400);}
});
