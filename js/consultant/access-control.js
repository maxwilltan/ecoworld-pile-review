/* Consultant accounts, authentication and project access */

let consultantAccessDraftV139 = null;
let consultantAccessActiveIdV139 = "jsw";

function accessPortalHierarchyV139(){
  const regionBusinessUnits =
    typeof getConfiguredRegionBusinessUnits === "function"
      ? getConfiguredRegionBusinessUnits()
      : REGION_BUSINESS_UNITS;

  const businessUnitProjects =
    typeof getConfiguredBusinessUnitProjects === "function"
      ? getConfiguredBusinessUnitProjects()
      : BUSINESS_UNIT_PROJECTS;

  return { regionBusinessUnits, businessUnitProjects };
}

function consultantProjectAccessKeyV139(region,businessUnit,project){
  return [region,businessUnit,project]
    .map(value => String(value || "").trim())
    .join("|||" );
}

function allPortalProjectEntriesV139(){
  const { regionBusinessUnits, businessUnitProjects } = accessPortalHierarchyV139();
  const entries = [];

  Object.entries(regionBusinessUnits || {}).forEach(([region,businessUnits]) => {
    (businessUnits || []).forEach(businessUnit => {
      (businessUnitProjects?.[businessUnit] || []).forEach(project => {
        entries.push({
          region,
          businessUnit,
          project,
          key: consultantProjectAccessKeyV139(region,businessUnit,project)
        });
      });
    });
  });

  return entries;
}

function defaultConsultantAccessSettingsV139(){
  const allKeys = allPortalProjectEntriesV139().map(item => item.key);
  const accounts = {};
  const accountOrder = [];

  CONSULTANT_ACCOUNT_DEFINITIONS.forEach(account => {
    accounts[account.id] = {
      id: account.id,
      name: account.name,
      email: account.email,
      password: account.password || "",
      active: true,
      builtin: false,
      projectKeys: [...allKeys]
    };
    accountOrder.push(account.id);
  });

  return { version:2, accounts, accountOrder };
}

function normaliseStoredConsultantAccountV144(id,saved,fallback=null){
  const base = fallback || {};
  const projectKeys = Array.isArray(saved?.projectKeys)
    ? [...new Set(saved.projectKeys.map(String))]
    : Array.isArray(base.projectKeys)
      ? [...base.projectKeys]
      : [];

  return {
    id,
    name: String(saved?.name ?? base.name ?? "Consultant").trim() || "Consultant",
    email: String(saved?.email ?? base.email ?? "").trim().toLowerCase(),
    password: String(saved?.password ?? base.password ?? ""),
    userId: String(saved?.userId ?? base.userId ?? ""),
    active: saved?.active !== undefined ? !!saved.active : (base.active !== undefined ? !!base.active : true),
    builtin: saved?.builtin !== undefined ? !!saved.builtin : !!base.builtin,
    projectKeys
  };
}

function getConsultantAccessSettings(){
  const defaults = defaultConsultantAccessSettingsV139();
  const stored = loadStorage(ECO_FRESH_STORAGE.consultantAccess, null);

  // First run only: seed the three initial consultant accounts.
  // After Internal saves the account list, the stored list becomes the source of truth,
  // so deleting any of the original three accounts is permanent.
  if(!stored?.accounts){
    return defaults;
  }

  const accounts = {};
  const accountOrder = [];
  const storedOrder = Array.isArray(stored.accountOrder)
    ? stored.accountOrder.map(String)
    : Object.keys(stored.accounts || {});

  storedOrder.forEach(id => {
    if(!stored.accounts?.[id] || accounts[id]) return;
    const fallback = defaults.accounts?.[id] || null;
    accounts[id] = normaliseStoredConsultantAccountV144(id,stored.accounts[id],fallback);
    accounts[id].builtin = false;
    accountOrder.push(id);
  });

  Object.keys(stored.accounts || {}).forEach(id => {
    if(accounts[id]) return;
    const fallback = defaults.accounts?.[id] || null;
    accounts[id] = normaliseStoredConsultantAccountV144(id,stored.accounts[id],fallback);
    accounts[id].builtin = false;
    accountOrder.push(id);
  });

  return { version:3, accounts, accountOrder };
}

function saveConsultantAccessSettings(settings){
  const clean = {
    version:3,
    accounts: settings?.accounts || {},
    accountOrder: Array.isArray(settings?.accountOrder)
      ? [...settings.accountOrder]
      : Object.keys(settings?.accounts || {})
  };
  saveStorage(ECO_FRESH_STORAGE.consultantAccess, clean);
}

function consultantAccountsInOrderV144(settings=getConsultantAccessSettings()){
  const order = Array.isArray(settings.accountOrder)
    ? settings.accountOrder
    : Object.keys(settings.accounts || {});
  return order.map(id => settings.accounts?.[id]).filter(Boolean);
}

function currentConsultantAccountId(){
  if(state.auth?.role !== "Consultant") return "";
  return state.auth?.accountId || "jsw";
}

function currentConsultantAccountConfig(){
  const id = currentConsultantAccountId();
  return getConsultantAccessSettings().accounts?.[id] || null;
}

function currentConsultantDisplayName(){
  if(state.auth?.role !== "Consultant") return "";
  const config = currentConsultantAccountConfig();
  return config?.name || state.auth?.name || "External";
}

function normaliseConsultantAuth(auth){
  if(!auth || auth.role !== "Consultant") return auth;

  const settings = getConsultantAccessSettings();
  let account = auth.accountId ? settings.accounts?.[auth.accountId] : null;

  // An explicit deleted account must never become another consultant's session.
  if(auth.accountId && !account) return null;

  if(!account && auth.email){
    account = consultantAccountsInOrderV144(settings).find(item =>
      item.email.toLowerCase() === String(auth.email || "").toLowerCase()
    );
  }

  // Legacy single-consultant sessions remain mapped to JSW.
  if(!account && !auth.accountId && !auth.email){
    account = settings.accounts?.jsw || consultantAccountsInOrderV144(settings)[0];
  }

  if(!account || !account.active) return null;

  return {
    ...auth,
    accountId:account.id,
    email:account.email || auth.email,
    name:account.name,
    role:"Consultant"
  };
}

function submissionOwnerAccountIdV139(item){
  return item?.consultantAccountId || "jsw";
}

function submissionBelongsToCurrentConsultant(item){
  if(state.auth?.role !== "Consultant") return true;
  return submissionOwnerAccountIdV139(item) === currentConsultantAccountId();
}

function consultantCanAccessProjectV139(region,businessUnit,project){
  if(state.auth?.role !== "Consultant") return true;
  const config = currentConsultantAccountConfig();
  if(!config || !config.active) return false;
  const key = consultantProjectAccessKeyV139(region,businessUnit,project);
  return config.projectKeys.includes(key);
}

function getConsultantAccessibleBusinessUnitProjects(){
  const { regionBusinessUnits, businessUnitProjects } = accessPortalHierarchyV139();
  const output = {};

  Object.entries(regionBusinessUnits || {}).forEach(([region,businessUnits]) => {
    (businessUnits || []).forEach(businessUnit => {
      const projects = (businessUnitProjects?.[businessUnit] || []).filter(project =>
        consultantCanAccessProjectV139(region,businessUnit,project)
      );
      if(projects.length){
        output[businessUnit] = projects;
      }
    });
  });

  return output;
}

function getConsultantAccessibleRegionBusinessUnits(){
  const { regionBusinessUnits } = accessPortalHierarchyV139();
  const projectMap = getConsultantAccessibleBusinessUnitProjects();
  const output = {};

  Object.entries(regionBusinessUnits || {}).forEach(([region,businessUnits]) => {
    const allowed = (businessUnits || []).filter(businessUnit =>
      Array.isArray(projectMap[businessUnit]) && projectMap[businessUnit].length
    );
    if(allowed.length){
      output[region] = allowed;
    }
  });

  return output;
}

function findPortalLoginAccountV144(email,password){
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPassword = String(password || "");

  const management = DEMO_ACCOUNTS.management;
  if(
    management &&
    management.email.toLowerCase() === cleanEmail &&
    management.password === cleanPassword
  ){
    return management;
  }

  const account = consultantAccountsInOrderV144().find(item =>
    item.active &&
    item.email &&
    item.email.toLowerCase() === cleanEmail &&
    item.password === cleanPassword
  );

  return account
    ? {
        id:account.id,
        name:account.name,
        email:account.email,
        password:account.password,
        role:"Consultant"
      }
    : null;
}

function cloneConsultantAccessV139(value){
  return JSON.parse(JSON.stringify(value));
}

function newConsultantAccountIdV144(){
  return `consultant-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
}

function validateConsultantAccessDraftV144(){
  const accounts = consultantAccountsInOrderV144(consultantAccessDraftV139);
  const emails = new Set();

  for(const account of accounts){
    account.name = String(account.name || "").trim();
    account.email = String(account.email || "").trim().toLowerCase();
    account.password = String(account.password || "");

    if(!account.name){
      return {ok:false,id:account.id,message:"Account name is required."};
    }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)){
      return {ok:false,id:account.id,message:`Enter a valid login email for ${account.name}.`};
    }
    if(state.auth?.role === "Management" && account.email === String(state.auth.email || "").toLowerCase()){
      return {ok:false,id:account.id,message:"This email is already used by the Internal account."};
    }
    if(emails.has(account.email)){
      return {ok:false,id:account.id,message:"Each consultant must use a unique login email."};
    }
    emails.add(account.email);
    if(!account.userId && account.password.length < 8){
      return {ok:false,id:account.id,message:`Set an initial password of at least 8 characters for ${account.name}.`};
    }
    if(account.userId && account.password && account.password.length < 8){
      return {ok:false,id:account.id,message:`A new password for ${account.name} must contain at least 8 characters.`};
    }
  }

  return {ok:true};
}
