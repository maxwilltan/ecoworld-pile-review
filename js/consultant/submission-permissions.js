/* individual correction permissions and immutable submission versions.
   This local portal stores permissions in the same browser as its records. */
function submissionOwnerV31(item){
  return String(item?.consultantAccountId || "jsw");
}

function submissionIdentityV31(item){
  return JSON.stringify([
    item?.region || "", item?.businessUnit || "", item?.project || "",
    item?.revision || "", submissionOwnerV31(item)
  ]);
}

function selectedSubmissionIdentityV31(){
  return submissionIdentityV31({
    region:state.selectedRegion, businessUnit:state.selectedBusinessUnit,
    project:state.selectedProject, revision:state.selectedRevision,
    consultantAccountId:currentConsultantAccountId()
  });
}

function currentSelectedSubmissionV31(items=getSubmissions()){
  const identity = selectedSubmissionIdentityV31();
  return items.find(item => item.id === state.editingId && submissionIdentityV31(item) === identity)
    || items.find(item => submissionIdentityV31(item) === identity) || null;
}

function canConsultantEditSubmissionV31(item){
  return !!(state.auth?.role === "Consultant" && canViewSubmissionV31(item) &&
    item.editAccess?.allowed === true);
}

function canViewSubmissionV31(item){
  if(!item) return false;
  if(state.auth?.role === "Management") return true;
  return !!(state.auth?.role === "Consultant" &&
    submissionOwnerV31(item) === currentConsultantAccountId() &&
    currentConsultantAccountConfig()?.active &&
    consultantCanAccessProjectV139(item.region,item.businessUnit,item.project));
}

function canEditCurrentSubmissionV31(){
  if(state.auth?.role !== "Consultant" || !hasSelectedProject()) return false;
  if(!currentConsultantAccountConfig()?.active ||
    !consultantCanAccessProjectV139(state.selectedRegion,state.selectedBusinessUnit,state.selectedProject)) return false;
  const existing = currentSelectedSubmissionV31();
  // A record removed while it was open must be reopened as a new selection.
  if(state.editingId && !existing) return false;
  return !existing || canConsultantEditSubmissionV31(existing);
}

function submissionContentTokenV31(item){
  if(!item) return null;
  return JSON.stringify([item.id,submissionIdentityV31(item),item.updatedAt,
    Number(item.versionNumber) || 1,item.formData]);
}

function assertSubmissionSaveAllowedV31(payload=null,items=getSubmissions()){
  if(state.auth?.role !== "Consultant" || !currentConsultantAccountConfig()?.active ||
    !consultantCanAccessProjectV139(state.selectedRegion,state.selectedBusinessUnit,state.selectedProject)){
    throw new Error("Your consultant account must be active and assigned to this project before submitting.");
  }
  if(payload && submissionIdentityV31(payload) !== selectedSubmissionIdentityV31()){
    throw new Error("The selected project, revision or account changed while saving. Please reopen the submission.");
  }
  const existing = currentSelectedSubmissionV31(items);
  if(state.editingId && (!existing || existing.id !== state.editingId)){
    throw new Error("This submission changed or was removed. Please reopen it before submitting.");
  }
  if(existing && !canConsultantEditSubmissionV31(existing)){
    throw new Error("This submission is locked. Management must allow editing for this individual submission first.");
  }
  if(existing && state.loadedSubmissionTokenV31 &&
    state.loadedSubmissionTokenV31 !== submissionContentTokenV31(existing)){
    throw new Error("A newer version of this submission is available. Please reopen it before making a correction.");
  }
  return existing;
}

function submissionSnapshotV31(item){
  const snapshot = structuredClone(item);
  delete snapshot.previousVersions;
  snapshot.versionNumber = Number(item.versionNumber) || 1;
  return snapshot;
}

function finaliseSubmissionVersionV31(payload,existing){
  const now = new Date().toISOString();
  const actor = state.auth?.email || currentConsultantAccountId();
  const version = existing ? (Number(existing.versionNumber) || 1) + 1 : 1;
  return {
    ...payload,
    id:existing?.id || payload.id,
    revision:existing?.revision || payload.revision,
    createdAt:existing?.createdAt || existing?.updatedAt || now,
    updatedAt:now,
    versionNumber:version,
    previousVersions:existing ? [
      ...(existing.previousVersions || []).map(submissionSnapshotV31),
      submissionSnapshotV31(existing)
    ] : [],
    editAccess:{allowed:false,changedAt:now,changedBy:actor},
    audit:[...(existing?.audit || []),{
      action:existing ? "resubmitted" : "submitted",at:now,by:actor,versionNumber:version
    }]
  };
}

async function managementSetSubmissionEditingV31(id,allowed){
  if(state.auth?.role !== "Management") throw new Error("Only Management can change submission editing access.");
  const items = getSubmissions();
  const item = items.find(entry => String(entry.id) === String(id));
  if(!item) throw new Error("Submission not found. Please refresh the list.");
  const now = new Date().toISOString();
  const by = state.auth.email || "Management";
  item.editAccess = {allowed:allowed === true,changedAt:now,changedBy:by};
  item.versionNumber = Number(item.versionNumber) || 1;
  item.audit = [...(item.audit || []),{
    action:allowed === true ? "editing_allowed" : "editing_locked",at:now,by
  }];
  if(window.EcoBackend){
    await window.EcoBackend.persistSubmission(item);
    await window.EcoBackend.audit(
      allowed === true ? "editing_allowed" : "editing_locked",
      "submission",
      item.id,
      {project:item.project,revision:item.revision}
    );
  }
  setSubmissions(items);
  return item;
}

function refreshSubmissionModalPermissionsV31(){
  const editable = canEditCurrentSubmissionV31();
  ["loadingCapacityModal","poundageCalculatorModal"].forEach(id => {
    const modal = $(id);
    modal?.querySelectorAll("input,select,textarea").forEach(control => { control.disabled = !editable; });
  });
  ["addLoadingRowBtn","toggleExcelPasteBtn","clearExcelPasteBtn","importExcelRowsBtn",
    "saveLoadingCapacityModal","applyPoundageCalculation"].forEach(id => {
    if($(id)) $(id).disabled = !editable;
  });
  $("loadingCapacityTableBody")?.querySelectorAll("[data-remove-loading-row]")
    .forEach(button => { button.disabled = !editable; });
  $("drawingFolderModal")?.querySelectorAll("[data-folder-remove-field]")
    .forEach(button => { button.hidden = !editable; button.disabled = !editable; });
}

// Other tabs can revoke editing or deactivate an account while a form is open.
window.addEventListener("storage",event => {
  if(![ECO_FRESH_STORAGE.submissions,ECO_FRESH_STORAGE.consultantAccess].includes(event.key)) return;
  if(state.auth?.role === "Consultant"){
    updateSubmissionLockState();
    refreshSubmissionModalPermissionsV31();
    if(state.currentView === "history") renderHistory();
  }
});
