/* One Edit workspace for consultant accounts, assignments and submissions. */
(function(){
  let savedDraft = "";
  let activeTab = "setup";
  let deleteArmed = "";

  const el = id => document.getElementById(id);
  const isManagement = () => state.auth?.role === "Management";
  const account = () => consultantAccessDraftV139?.accounts?.[consultantAccessActiveIdV139] || null;
  const dirty = () => !!consultantAccessDraftV139 && JSON.stringify(consultantAccessDraftV139) !== savedDraft;
  const projectKey = () => managementSettingsSelectedRegion && managementSettingsSelectedBusinessUnit && managementSettingsSelectedProject
    ? consultantProjectAccessKeyV139(managementSettingsSelectedRegion, managementSettingsSelectedBusinessUnit, managementSettingsSelectedProject)
    : "";

  function status(message){
    el("editSaveStatusV31").textContent = message || (dirty() ? "Unsaved consultant access changes" : "Consultant access is up to date.");
    el("editSaveStatusV31").classList.toggle("is-unsaved", dirty());
    el("editSaveAccessV31").disabled = !dirty();
  }

  function syncAccount(){
    const item = account();
    if(!item) return;
    item.name = el("editConsultantNameV31").value.trim();
    item.email = el("editConsultantEmailV31").value.trim().toLowerCase();
    item.password = el("editConsultantPasswordV31").value;
    item.active = el("editConsultantActiveV31").checked;
  }

  function renderSelector(){
    const items = consultantAccountsInOrderV144(consultantAccessDraftV139);
    const select = el("editConsultantSelectV31");
    select.innerHTML = items.length
      ? items.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name || "Unnamed consultant")}${item.active ? "" : " (inactive)"}</option>`).join("")
      : '<option value="">No consultants — add one to get started</option>';
    select.disabled = !items.length;
    select.value = consultantAccessActiveIdV139;
    const item = account();
    el("editAccountStateV31").textContent = item ? (item.active ? "Active account" : "Inactive account") : "";
    el("editAccountStateV31").classList.toggle("is-inactive", !!item && !item.active);
  }

  function renderAccount(){
    const item = account();
    [["editConsultantNameV31", "name"], ["editConsultantEmailV31", "email"], ["editConsultantPasswordV31", "password"]].forEach(([id, key]) => {
      el(id).value = item?.[key] || "";
      el(id).disabled = !item;
    });
    el("editConsultantActiveV31").checked = !!item?.active;
    el("editConsultantActiveV31").disabled = !item;
    el("editDeleteConsultantV31").disabled = !item;
    el("editShowPasswordV31").disabled = !item;
    el("editConsultantPasswordV31").type = "password";
    el("editShowPasswordV31").textContent = "Show";
    el("editShowPasswordV31").setAttribute("aria-pressed", "false");
    el("editDeleteConsultantV31").textContent = "Delete consultant";
    el("editDeleteConsultantV31").classList.remove("is-armed");
    deleteArmed = "";
    el("editAccessErrorV31").textContent = "";
    renderSelector();
    renderAssignments();
    renderPast();
    status();
  }

  function renderAssignments(){
    const item = account();
    const key = projectKey();
    const assigned = !!item?.projectKeys?.includes(key);
    el("editAssignProjectV31").checked = !!key && assigned;
    el("editAssignProjectV31").disabled = !item || !key;
    el("editAssignProjectLabelV31").textContent = `Assign this project to ${item?.name || "this consultant"}`;
    // Keep the assignment area clean: no instructional/helper description text.
    el("editAssignmentHintV31").textContent = "";
    const keys = item?.projectKeys || [];
    el("editAssignedCountV31").textContent = `Assigned projects (${keys.length})`;
    el("editAssignAllV31").disabled = !item;
    el("editClearAssignmentsV31").disabled = !keys.length;
    const available = new Map(allPortalProjectEntriesV139().map(entry => [entry.key, entry]));
    el("editAssignedListV31").innerHTML = `<div class="edit-list-table-v38 edit-assigned-table-v38">
      <div class="edit-list-head-v38"><span>Assigned Project</span></div>
      ${keys.length ? keys.map(key => {
        const entry = available.get(key);
        const parts = key.split("|||");
        const region = entry?.region || parts[0] || "";
        const businessUnit = entry?.businessUnit || parts[1] || "";
        const project = entry?.project || parts[2] || key;
        return `<div class="edit-list-row-v38 edit-assigned-row-v38">
          <div class="edit-list-main-v38 edit-static-project-v46">
            <strong>${escapeHtml(project)}</strong>
            <small>${escapeHtml(region)} · ${escapeHtml(businessUnit)}${entry ? "" : " · Removed from project list"}</small>
          </div>
          <button type="button" class="edit-remove-assignment-v31 edit-list-action-v38" data-edit-remove-project-v31="${escapeHtml(key)}" aria-label="Remove ${escapeHtml(project)} assignment" title="Remove assignment">×</button>
        </div>`;
      }).join("") : '<div class="edit-empty-v31 edit-empty-row-v39">No assigned project</div>'}
    </div>`;
  }

  function selectedSubmissions(){
    if(!account()) return [];
    // Past Submission is account-level history. It must remain independent
    // from the Region / Business Unit / Project selection used below.
    return getSubmissions().filter(item =>
      submissionOwnerAccountIdV139(item) === consultantAccessActiveIdV139
    ).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }

  function renderPast(){
    const items = selectedSubmissions();
    el("editPastCountV31").textContent = String(items.length);
    const savedAccount = getConsultantAccessSettings().accounts?.[consultantAccessActiveIdV139];
    el("editHistoryNoticeV31").textContent = !account() ? "Choose a consultant to see their submissions."
      : `Showing ${account().name || "this consultant"}'s submissions across all projects.`;
    el("editPastListV31").innerHTML = `<div class="edit-list-table-v38 edit-past-table-v38"><div class="edit-list-head-v38"><span>Past Submission</span></div>${items.length ? items.map(item => {
      const open = item.editAccess?.allowed === true;
      const key = consultantProjectAccessKeyV139(item.region, item.businessUnit, item.project);
      const canOpen = !!savedAccount?.active && savedAccount.projectKeys.includes(key);
      const date = item.updatedAt ? new Date(item.updatedAt) : null;
      const dateText = date && !Number.isNaN(date.getTime()) ? date.toLocaleString([], {dateStyle:"medium", timeStyle:"short"}) : "Date unavailable";
      return `<article class="edit-submission-row-v31 edit-submission-row-v38">
        <div class="edit-submission-main-v31 edit-list-main-v38">
          <strong>${escapeHtml(item.project || "Unnamed project")}</strong>
          <div class="edit-submission-meta-inline-v43">
            <small>${escapeHtml(item.region || "—")} · ${escapeHtml(item.businessUnit || "—")}</small>
            <span>${escapeHtml(item.revision || "—")}</span>
            <span>${escapeHtml(typeof submissionYearLabel === "function" ? submissionYearLabel(item) : item.year || "—")}</span>
          </div>
        </div>
        <div class="edit-submission-actions-v31 edit-submission-actions-v38">
          <button class="edit-permission-action-v43 ${open ? "is-open" : "is-locked"}" type="button" data-edit-permission-v31="${escapeHtml(item.id)}" data-allow="${open ? "false" : "true"}" ${!open && !canOpen ? "disabled" : ""}>
            <span class="edit-permission-dot-v43" aria-hidden="true"></span>
            <span>${open ? "Lock editing" : "Allow editing"}</span>
          </button>
          <button class="edit-delete-submission-v48" type="button" data-edit-delete-submission-v48="${escapeHtml(item.id)}">Delete submission</button>
        </div>
      </article>`;
    }).join("") : `<div class="edit-empty-v31 edit-empty-row-v39">${account() ? "No past submission" : "No consultant selected"}</div>`}</div>`;
  }

  function setTab(tab, focus=false){
    activeTab = tab;
    document.querySelectorAll("[data-edit-tab-v31]").forEach(button => {
      const selected = button.dataset.editTabV31 === tab;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
      if(selected && focus) button.focus();
    });
    if(el("editSetupPanelV31")) el("editSetupPanelV31").classList.remove("hidden");
    if(el("editPastPanelV31")) el("editPastPanelV31").classList.remove("hidden");
    renderPast();
  }

  async function saveAccess(){
    if(!isManagement() || !consultantAccessDraftV139) return false;
    syncAccount();
    const validation = validateConsultantAccessDraftV144();
    if(!validation.ok){
      consultantAccessActiveIdV139 = validation.id || consultantAccessActiveIdV139;
      renderAccount();
      el("editAccountDetailsV31").open = true;
      el("editAccessErrorV31").textContent = validation.message;
      el("editAccessErrorV31").scrollIntoView({block:"nearest"});
      return false;
    }
    try{
      el("editSaveAccessV31").disabled = true;
      el("editSaveStatusV31").textContent = "Saving consultant access…";
      if(window.EcoBackend){
        await window.EcoBackend.saveConsultantAccounts(consultantAccessDraftV139);
      }else{
        saveConsultantAccessSettings(consultantAccessDraftV139);
      }
      consultantAccessDraftV139 = cloneConsultantAccessV139(getConsultantAccessSettings());
      savedDraft = JSON.stringify(consultantAccessDraftV139);
      renderAccount();
      el("editClosePromptV31").classList.add("hidden");
      status("Consultant details and project assignments saved.");
      return true;
    }catch(error){
      console.error(error);
      el("editAccessErrorV31").textContent = error?.message || "Could not save consultant access. Please try again.";
      status();
      return false;
    }
  }

  window.beginManagementEditV31 = function(){
    if(!isManagement()) return;
    if(!dirty()){
      consultantAccessDraftV139 = cloneConsultantAccessV139(getConsultantAccessSettings());
      savedDraft = JSON.stringify(consultantAccessDraftV139);
    }
    if(!account()) consultantAccessActiveIdV139 = consultantAccessDraftV139.accountOrder[0] || "";
    el("editClosePromptV31").classList.add("hidden");
    renderAccount();
    setTab(activeTab);
  };

  window.managementEditMayCloseV31 = function(){
    if(!dirty()) return true;
    el("editClosePromptV31").classList.remove("hidden");
    el("editKeepEditingV31").focus();
    return false;
  };

  const renderHierarchy = renderManagementSettingsHierarchy;
  renderManagementSettingsHierarchy = function(){
    const result = renderHierarchy.apply(this, arguments);
    if(consultantAccessDraftV139 && el("editAssignProjectV31")){
      renderAssignments();
      renderPast();
    }
    return result;
  };

  document.addEventListener("DOMContentLoaded", () => {
    el("editConsultantSelectV31").addEventListener("change", event => {
      if(!isManagement()) return;
      syncAccount();
      consultantAccessActiveIdV139 = event.target.value;
      renderAccount();
    });

    ["editConsultantNameV31", "editConsultantEmailV31", "editConsultantPasswordV31", "editConsultantActiveV31"].forEach(id => {
      el(id).addEventListener(id === "editConsultantActiveV31" ? "change" : "input", () => {
        if(!isManagement()) return;
        syncAccount();
        renderSelector();
        renderAssignments();
        status();
        el("editAccessErrorV31").textContent = "";
      });
    });

    el("editAddConsultantV31").addEventListener("click", () => {
      if(!isManagement() || !consultantAccessDraftV139) return;
      syncAccount();
      const id = newConsultantAccountIdV144();
      consultantAccessDraftV139.accounts[id] = {id, name:"New Consultant", email:"", password:"", active:true, builtin:false, projectKeys:[]};
      consultantAccessDraftV139.accountOrder.push(id);
      consultantAccessActiveIdV139 = id;
      renderAccount();
      el("editAccountDetailsV31").open = true;
      el("editConsultantNameV31").focus();
      el("editConsultantNameV31").select();
    });

    el("editDeleteConsultantV31").addEventListener("click", () => {
      if(!isManagement() || !account()) return;
      if(deleteArmed !== account().id){
        deleteArmed = account().id;
        el("editDeleteConsultantV31").textContent = "Confirm delete consultant";
        el("editDeleteConsultantV31").classList.add("is-armed");
        return;
      }
      delete consultantAccessDraftV139.accounts[deleteArmed];
      consultantAccessDraftV139.accountOrder = consultantAccessDraftV139.accountOrder.filter(id => id !== deleteArmed);
      consultantAccessActiveIdV139 = consultantAccessDraftV139.accountOrder[0] || "";
      renderAccount();
    });

    el("editShowPasswordV31").addEventListener("click", () => {
      const show = el("editConsultantPasswordV31").type === "password";
      el("editConsultantPasswordV31").type = show ? "text" : "password";
      el("editShowPasswordV31").textContent = show ? "Hide" : "Show";
      el("editShowPasswordV31").setAttribute("aria-pressed", String(show));
    });

    el("editAssignProjectV31").addEventListener("change", event => {
      if(!isManagement() || !account() || !projectKey()) return;
      const keys = new Set(account().projectKeys);
      if(event.target.checked) keys.add(projectKey()); else keys.delete(projectKey());
      account().projectKeys = [...keys];
      renderAssignments();
      status();
    });

    el("editAssignAllV31").addEventListener("click", () => {
      if(!isManagement() || !account()) return;
      account().projectKeys = allPortalProjectEntriesV139().map(item => item.key);
      renderAssignments();
      status();
    });
    el("editClearAssignmentsV31").addEventListener("click", () => {
      if(!isManagement() || !account()) return;
      account().projectKeys = [];
      renderAssignments();
      status();
    });
    el("editAssignedListV31").addEventListener("click", event => {
      if(!isManagement() || !account()) return;
      const remove = event.target.closest("[data-edit-remove-project-v31]");
      if(remove){
        account().projectKeys = account().projectKeys.filter(key => key !== remove.dataset.editRemoveProjectV31);
        renderAssignments();
        status();
        return;
      }
    });

    document.querySelectorAll("[data-edit-tab-v31]").forEach(button => {
      button.addEventListener("click", () => setTab(button.dataset.editTabV31));
      button.addEventListener("keydown", event => {
        if(!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        setTab(event.key === "Home" ? "setup" : event.key === "End" ? "past" : activeTab === "setup" ? "past" : "setup", true);
      });
    });

    el("editPastListV31").addEventListener("click", async event => {
      if(!isManagement()) return;
      const deleteButton = event.target.closest("[data-edit-delete-submission-v48]");
      if(deleteButton){
        const item = selectedSubmissions().find(submission => String(submission.id) === String(deleteButton.dataset.editDeleteSubmissionV48));
        if(!item) return;
        showDeleteSubmissionConfirmV141(item, () => {
          renderPast();
          el("editHistoryNoticeV31").textContent = "Submission and its uploaded drawing files were deleted.";
        });
        return;
      }
      const versions = event.target.closest("[data-edit-versions-v31]");
      if(versions){
        window.showSubmissionVersionHistoryV31(versions.dataset.editVersionsV31);
        return;
      }
      const button = event.target.closest("[data-edit-permission-v31]");
      if(!button || button.disabled) return;
      try{
        const allow = button.dataset.allow === "true";
        await window.managementSetSubmissionEditingV31(button.dataset.editPermissionV31, allow);
        renderPast();
        el("editHistoryNoticeV31").textContent = allow ? "Editing allowed for this submission. The consultant can reopen it from History and resubmit." : "Submission locked. The consultant can view it but cannot change it.";
      }catch(error){
        el("editHistoryNoticeV31").textContent = error?.message || "Could not change editing permission. Please try again.";
      }
    });

    el("editSaveAccessV31").addEventListener("click", async () => { await saveAccess(); });
    el("editSaveCloseV31").addEventListener("click", async () => {
      if(await saveAccess()) window.closeManagementSubmissionSetupModalV121();
    });
    el("editDiscardCloseV31").addEventListener("click", () => {
      consultantAccessDraftV139 = null;
      savedDraft = "";
      el("editClosePromptV31").classList.add("hidden");
      window.closeManagementSubmissionSetupModalV121();
    });
    el("editKeepEditingV31").addEventListener("click", () => {
      el("editClosePromptV31").classList.add("hidden");
      el("editSaveAccessV31").focus();
    });

    window.addEventListener("storage", event => {
      if(event.key === ECO_FRESH_STORAGE.submissions && !el("managementSettingsModal").classList.contains("hidden")) renderPast();
    });
  });
})();
