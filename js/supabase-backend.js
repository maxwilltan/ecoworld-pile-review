/* EcoWorld production backend adapter.
   Shared data lives in Supabase; localStorage is kept only as a fast UI cache. */
(function(){
  const SUPABASE_URL = "https://yqxwiitsdxmypemwgows.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_K8L3IhB63xeahlLRr7Wyhw_o4rkxA8j";
  const STORAGE_BUCKET = "ecoworld-drawings";

  if(!window.supabase?.createClient){
    console.error("Supabase client library did not load.");
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth:{
        persistSession:true,
        autoRefreshToken:true,
        detectSessionInUrl:true
      }
    }
  );

  const CONFIG_STORAGE_TO_DB = {
    [ECO_FRESH_STORAGE.tableSettings]: "table_settings",
    [ECO_FRESH_STORAGE.portalHierarchy]: "portal_hierarchy",
    [ECO_FRESH_STORAGE.dropdownOptions]: "dropdown_options",
    [ECO_FRESH_STORAGE.pileReference]: "pile_reference",
    [ECO_FRESH_STORAGE.pileOptimisation]: "pile_optimisation"
  };

  const CONFIG_DB_TO_STORAGE = Object.fromEntries(
    Object.entries(CONFIG_STORAGE_TO_DB).map(([storageKey,dbKey]) => [dbKey,storageKey])
  );

  function rawSetStorage(key,value){
    try{
      localStorage.setItem(key,JSON.stringify(value));
    }catch(error){
      console.error(`Unable to update local cache ${key}`,error);
    }
  }

  function rawRemoveStorage(key){
    try{ localStorage.removeItem(key); }catch(error){}
  }

  function profileToAuth(profile){
    if(!profile) return null;
    return {
      email:String(profile.email || "").toLowerCase(),
      role:profile.role,
      accountId:profile.consultant_key || "",
      name:profile.display_name || (profile.role === "Management" ? "Internal" : "Consultant"),
      userId:profile.user_id || ""
    };
  }

  async function getSessionUser(){
    const {data,error} = await client.auth.getSession();
    if(error) throw error;
    return data?.session?.user || null;
  }

  async function getCurrentProfile(userId=null){
    const id = userId || (await getSessionUser())?.id;
    if(!id) return null;
    const {data,error} = await client
      .from("ecoworld_profiles")
      .select("user_id,consultant_key,display_name,email,role,active")
      .eq("user_id",id)
      .maybeSingle();
    if(error) throw error;
    return data || null;
  }

  async function hydrateConfig(){
    Object.keys(CONFIG_STORAGE_TO_DB).forEach(rawRemoveStorage);
    const {data,error} = await client
      .from("ecoworld_config")
      .select("key,value");
    if(error) throw error;
    (data || []).forEach(row => {
      const storageKey = CONFIG_DB_TO_STORAGE[row.key];
      if(storageKey) rawSetStorage(storageKey,row.value);
    });
  }

  async function hydrateAccess(profile){
    let profilesQuery = client
      .from("ecoworld_profiles")
      .select("user_id,consultant_key,display_name,email,role,active")
      .eq("role","Consultant");

    if(profile?.role === "Consultant"){
      profilesQuery = profilesQuery.eq("user_id",profile.user_id);
    }

    const [profilesResult,accessResult] = await Promise.all([
      profilesQuery,
      client.from("ecoworld_project_access")
        .select("user_id,project_key,region,business_unit,project")
    ]);

    if(profilesResult.error) throw profilesResult.error;
    if(accessResult.error) throw accessResult.error;

    const accessByUser = new Map();
    (accessResult.data || []).forEach(row => {
      if(!accessByUser.has(row.user_id)) accessByUser.set(row.user_id,[]);
      accessByUser.get(row.user_id).push(row.project_key || [row.region,row.business_unit,row.project].join("|||"));
    });

    const accounts = {};
    const accountOrder = [];
    (profilesResult.data || [])
      .slice()
      .sort((a,b) => String(a.display_name || "").localeCompare(String(b.display_name || "")))
      .forEach(row => {
        const id = row.consultant_key || `consultant-${String(row.user_id).slice(0,8)}`;
        accounts[id] = {
          id,
          userId:row.user_id,
          name:row.display_name || "Consultant",
          email:String(row.email || "").toLowerCase(),
          password:"",
          active:row.active !== false,
          builtin:false,
          projectKeys:[...new Set(accessByUser.get(row.user_id) || [])]
        };
        accountOrder.push(id);
      });

    rawSetStorage(ECO_FRESH_STORAGE.consultantAccess,{version:4,accounts,accountOrder});
  }

  async function hydrateSubmissions(){
    const {data,error} = await client
      .from("ecoworld_submissions")
      .select("id,owner_user_id,consultant_key,region,business_unit,project,revision,year,version_number,edit_allowed,payload,created_at,updated_at")
      .order("updated_at",{ascending:false});

    if(error) throw error;

    const items = (data || []).map(row => {
      const payload = row.payload && typeof row.payload === "object"
        ? structuredClone(row.payload)
        : {};
      return {
        ...payload,
        id:row.id,
        ownerUserId:row.owner_user_id,
        consultantAccountId:payload.consultantAccountId || row.consultant_key || "",
        region:payload.region || row.region || "",
        businessUnit:payload.businessUnit || row.business_unit || "",
        project:payload.project || row.project || "",
        revision:payload.revision || row.revision || "",
        year:payload.year || row.year || "",
        versionNumber:Number(row.version_number) || Number(payload.versionNumber) || 1,
        createdAt:payload.createdAt || row.created_at,
        updatedAt:payload.updatedAt || row.updated_at,
        editAccess:{
          ...(payload.editAccess || {}),
          allowed:row.edit_allowed === true
        }
      };
    });

    rawSetStorage(ECO_FRESH_STORAGE.submissions,items);
    return items;
  }

  async function hydrate(profile=null){
    const activeProfile = profile || await getCurrentProfile();
    if(!activeProfile || activeProfile.active === false){
      throw new Error("This portal account is inactive or has not been configured by Management.");
    }
    await Promise.all([
      hydrateConfig(),
      hydrateAccess(activeProfile),
      hydrateSubmissions()
    ]);
    return activeProfile;
  }

  async function signIn(email,password){
    const {data,error} = await client.auth.signInWithPassword({
      email:String(email || "").trim().toLowerCase(),
      password:String(password || "")
    });
    if(error) throw error;

    const profile = await getCurrentProfile(data.user?.id);
    if(!profile || profile.active === false){
      await client.auth.signOut();
      throw new Error("This portal account is inactive or has not been configured by Management.");
    }

    await hydrate(profile);
    return profileToAuth(profile);
  }

  async function signOut(){
    try{ await client.auth.signOut(); }catch(error){ console.error(error); }
    rawRemoveStorage(ECO_FRESH_STORAGE.auth);
  }

  async function boot(){
    try{
      const user = await getSessionUser();
      if(!user){
        rawRemoveStorage(ECO_FRESH_STORAGE.auth);
        return false;
      }
      const profile = await getCurrentProfile(user.id);
      if(!profile || profile.active === false){
        await signOut();
        return false;
      }
      await hydrate(profile);
      if(typeof setAuth === "function") setAuth(profileToAuth(profile));
      return true;
    }catch(error){
      console.error("Unable to restore EcoWorld cloud session",error);
      await signOut();
      return false;
    }
  }

  async function persistConfig(storageKey,value){
    const dbKey = CONFIG_STORAGE_TO_DB[storageKey];
    if(!dbKey || state?.auth?.role !== "Management") return;
    const user = await getSessionUser();
    if(!user) throw new Error("Your session has expired. Please log in again.");
    const {error} = await client.from("ecoworld_config").upsert({
      key:dbKey,
      value,
      updated_by:user.id
    },{onConflict:"key"});
    if(error) throw error;
  }

  async function persistSubmission(item){
    if(!item?.id) throw new Error("Submission ID is missing.");
    const user = await getSessionUser();
    if(!user) throw new Error("Your session has expired. Please log in again.");

    let ownerUserId = state?.auth?.role === "Consultant"
      ? user.id
      : item.ownerUserId;

    if(!ownerUserId){
      const {data:existing,error:existingError} = await client
        .from("ecoworld_submissions")
        .select("owner_user_id")
        .eq("id",item.id)
        .maybeSingle();
      if(existingError) throw existingError;
      ownerUserId = existing?.owner_user_id || null;
    }
    if(!ownerUserId) throw new Error("Submission owner could not be resolved.");

    const row = {
      id:item.id,
      owner_user_id:ownerUserId,
      consultant_key:item.consultantAccountId || "",
      region:item.region || "",
      business_unit:item.businessUnit || "",
      project:item.project || "",
      revision:item.revision || "",
      year:item.year || null,
      version_number:Number(item.versionNumber) || 1,
      edit_allowed:item.editAccess?.allowed === true,
      payload:item
    };

    const {data,error} = await client
      .from("ecoworld_submissions")
      .upsert(row,{onConflict:"id"})
      .select("id,owner_user_id,updated_at")
      .single();
    if(error) throw error;
    item.ownerUserId = data.owner_user_id;
    return data;
  }

  async function deleteSubmission(id){
    const {error} = await client.from("ecoworld_submissions").delete().eq("id",id);
    if(error) throw error;
  }

  async function audit(action,entityType,entityId,details={}){
    try{
      const user = await getSessionUser();
      if(!user) return;
      await client.from("ecoworld_audit_log").insert({
        actor_user_id:user.id,
        action,
        entity_type:entityType,
        entity_id:entityId || null,
        details
      });
    }catch(error){
      console.warn("Audit log write failed",error);
    }
  }

  async function saveConsultantAccounts(settings){
    const order = Array.isArray(settings?.accountOrder)
      ? settings.accountOrder
      : Object.keys(settings?.accounts || {});
    const accounts = order
      .map(id => settings?.accounts?.[id])
      .filter(Boolean)
      .map(account => ({
        id:account.id,
        name:account.name,
        email:account.email,
        password:account.password || "",
        active:account.active !== false,
        projectKeys:Array.isArray(account.projectKeys) ? account.projectKeys : []
      }));

    const {data,error} = await client.functions.invoke("ecoworld-manage-consultants",{
      body:{accounts}
    });
    if(error) throw error;
    if(data?.error) throw new Error(data.error);

    const profile = await getCurrentProfile();
    await hydrateAccess(profile);
    return data;
  }

  async function bootstrapManagement({email,password,setupToken}){
    const {data,error} = await client.functions.invoke("ecoworld-bootstrap",{
      body:{email,password,setupToken}
    });
    if(error) throw error;
    if(data?.error) throw new Error(data.error);
    return data;
  }

  function safeFileName(name){
    return String(name || "upload")
      .replace(/[^a-zA-Z0-9._-]+/g,"_")
      .replace(/^_+|_+$/g,"")
      .slice(-120) || "upload";
  }

  async function uploadFile(blob,metadata={}){
    const user = await getSessionUser();
    if(!user) throw new Error("Your session has expired. Please log in again.");
    const path = `${user.id}/${crypto.randomUUID()}_${safeFileName(metadata.name)}`;
    const {error} = await client.storage.from(STORAGE_BUCKET).upload(path,blob,{
      contentType:metadata.type || blob.type || "application/octet-stream",
      upsert:false
    });
    if(error) throw error;
    return {
      blobId:path,
      storagePath:path,
      name:metadata.name || "Uploaded file",
      type:metadata.type || blob.type || "application/octet-stream",
      size:metadata.size ?? blob.size ?? 0,
      lastModified:metadata.lastModified || Date.now()
    };
  }

  async function downloadFile(path){
    const {data,error} = await client.storage.from(STORAGE_BUCKET).download(path);
    if(error) throw error;
    return data;
  }

  async function removeFile(path){
    const {error} = await client.storage.from(STORAGE_BUCKET).remove([path]);
    if(error) throw error;
  }

  const backend = {
    client,
    signIn,
    signOut,
    boot,
    hydrate,
    refreshSubmissions:hydrateSubmissions,
    persistConfig,
    persistSubmission,
    deleteSubmission,
    audit,
    saveConsultantAccounts,
    bootstrapManagement,
    uploadFile,
    downloadFile,
    removeFile,
    getCurrentProfile,
    getSessionUser
  };

  window.EcoBackend = backend;

  /* Keep the existing synchronous UI storage API, but mirror Management
     configuration changes to Supabase. */
  if(typeof saveStorage === "function"){
    const localSaveStorage = saveStorage;
    saveStorage = function(key,value){
      localSaveStorage(key,value);
      if(CONFIG_STORAGE_TO_DB[key] && state?.auth?.role === "Management"){
        backend.persistConfig(key,value).catch(error => {
          console.error("Unable to sync Management setting to Supabase",error);
        });
      }
    };
  }

  /* Route drawing bytes to Supabase Storage in production while retaining the
     original IndexedDB functions as a fallback for legacy/local files. */
  if(typeof saveEcoFileBlob === "function"){
    const localSaveEcoFileBlob = saveEcoFileBlob;
    saveEcoFileBlob = async function(blob,metadata={}){
      try{
        if(await getSessionUser()) return await backend.uploadFile(blob,metadata);
      }catch(error){
        console.error("Cloud file upload failed",error);
        throw error;
      }
      return localSaveEcoFileBlob(blob,metadata);
    };
  }

  if(typeof getEcoFileBlob === "function"){
    const localGetEcoFileBlob = getEcoFileBlob;
    getEcoFileBlob = async function(blobId){
      if(blobId && String(blobId).includes("/")){
        const blob = await backend.downloadFile(blobId);
        return {id:blobId,blob};
      }
      return localGetEcoFileBlob(blobId);
    };
  }

  if(typeof deleteEcoFileBlob === "function"){
    const localDeleteEcoFileBlob = deleteEcoFileBlob;
    deleteEcoFileBlob = async function(blobId){
      if(blobId && String(blobId).includes("/")){
        await backend.removeFile(blobId);
        return;
      }
      return localDeleteEcoFileBlob(blobId);
    };
  }

  document.addEventListener("DOMContentLoaded",() => {
    const open = document.getElementById("firstTimeSetupBtn");
    const modal = document.getElementById("managementSetupModal");
    const close = document.getElementById("closeManagementSetupBtn");
    const cancel = document.getElementById("cancelManagementSetupBtn");
    const form = document.getElementById("managementSetupForm");
    const errorEl = document.getElementById("managementSetupError");

    const hide = () => modal?.classList.add("hidden");
    const show = () => {
      if(errorEl) errorEl.textContent = "";
      modal?.classList.remove("hidden");
      document.getElementById("setupManagementEmail")?.focus();
    };

    open?.addEventListener("click",show);
    close?.addEventListener("click",hide);
    cancel?.addEventListener("click",hide);
    modal?.addEventListener("click",event => { if(event.target === modal) hide(); });

    form?.addEventListener("submit",async event => {
      event.preventDefault();
      if(errorEl) errorEl.textContent = "";
      const submit = document.getElementById("createManagementAccountBtn");
      const original = submit?.textContent || "Create Management Account";
      if(submit){ submit.disabled = true; submit.textContent = "Creating…"; }
      try{
        const email = document.getElementById("setupManagementEmail")?.value.trim().toLowerCase() || "";
        const password = document.getElementById("setupManagementPassword")?.value || "";
        const setupToken = document.getElementById("setupManagementToken")?.value.trim() || "";
        await backend.bootstrapManagement({email,password,setupToken});
        hide();
        if(document.getElementById("emailInput")) document.getElementById("emailInput").value = email;
        if(document.getElementById("passwordInput")) document.getElementById("passwordInput").value = "";
        if(document.getElementById("loginError")) document.getElementById("loginError").textContent = "Management account created. You can log in now.";
      }catch(error){
        console.error(error);
        if(errorEl) errorEl.textContent = error?.message || "Unable to create the Management account.";
      }finally{
        if(submit){ submit.disabled = false; submit.textContent = original; }
      }
    });
  });
})();
