function bindEvents(){
  $("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = $("emailInput").value.trim().toLowerCase();
    const password = $("passwordInput").value;
    const submitButton = $("loginSubmitBtn");
    const originalText = submitButton?.textContent || "Login";

    $("loginError").textContent = "";
    if(submitButton){ submitButton.disabled = true; submitButton.textContent = "Signing in…"; }

    try{
      if(!window.EcoBackend) throw new Error("Cloud connection is unavailable. Please refresh and try again.");
      const auth = await window.EcoBackend.signIn(email,password);
      setAuth(auth);
      $("passwordInput").value = "";
      launchApp();
    }catch(error){
      console.error("Login failed",error);
      $("loginError").textContent = error?.message || "Invalid email or password.";
    }finally{
      if(submitButton){ submitButton.disabled = false; submitButton.textContent = originalText; }
    }
  });

  document.querySelector(".demo-box")?.addEventListener("click", event => {
    const btn = event.target.closest(".demo-account");
    if(!btn) return;

    const consultantId = btn.dataset.consultantLoginId;
    if(consultantId && typeof getConsultantAccessSettings === "function"){
      const account = getConsultantAccessSettings().accounts?.[consultantId];
      if(!account) return;
      $("emailInput").value = account.email || "";
      $("passwordInput").value = "";
      $("passwordInput").focus();
      return;
    }

    const demo = DEMO_ACCOUNTS[btn.dataset.demo];
    if(!demo) return;
    $("emailInput").value = demo.email;
    $("passwordInput").value = demo.password;
  });

  $("logoutBtn").addEventListener("click", async () => {
    if(window.EcoBackend) await window.EcoBackend.signOut();
    setAuth(null);
    $("appShell").classList.add("hidden");
    $("loginPage").classList.remove("hidden");
  });

  $("managementHeaderLogoutBtn")?.addEventListener("click", async () => {
    if(window.EcoBackend) await window.EcoBackend.signOut();
    setAuth(null);
    $("appShell").classList.add("hidden");
    $("loginPage").classList.remove("hidden");
  });

  $("sidebarToggle").addEventListener("click", () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    applySidebarState();
  });

  $("sideNav").addEventListener("click", (event) => {
    const btn = event.target.closest(".side-nav-btn");
    if(!btn) return;
    showView(btn.dataset.view);
  });

  $("regionSelect").addEventListener("change", (event) => {
    state.selectedRegion = event.target.value;
    state.selectedBusinessUnit = "";
    state.selectedProject = "";
    $("projectSearchInput").value = "";
    populateBusinessUnitSelect();
    populateProjectSelect();
    updateCurrentSelectionPill();
    loadFormForCurrentSelection();
  });

  $("businessUnitSelect").addEventListener("change", (event) => {
    state.selectedBusinessUnit = event.target.value;
    state.selectedProject = "";
    $("projectSearchInput").value = "";
    populateProjectSelect();
    updateCurrentSelectionPill();
    loadFormForCurrentSelection();
  });

  $("projectSelect").addEventListener("change", (event) => {
    setSelectedProject(event.target.value.trim());
  });

  $("projectSearchInput").addEventListener("input", (event) => {
    renderProjectSearchResults(event.target.value);
  });

  $("projectSearchInput").addEventListener("focus", (event) => {
    if(event.target.value.trim()){
      renderProjectSearchResults(event.target.value);
    }
  });

  $("projectSearchResults").addEventListener("click", (event) => {
    const button=event.target.closest("[data-search-project]");
    if(!button)return;

    selectProjectFromSearch({
      region:button.dataset.searchRegion,
      businessUnit:button.dataset.searchBusinessUnit,
      project:button.dataset.searchProject
    });
  });

  document.addEventListener("click", (event) => {
    if(!event.target.closest(".project-search-wrap")){
      closeProjectSearchResults();
    }
  });

  $("revisionSelect").addEventListener("change", (event) => {
    state.selectedRevision = event.target.value;
    loadFormForCurrentSelection();
  });

  $("yearSelect")?.addEventListener("change", (event) => {
    if(!canEditCurrentSubmissionV31()) return;
    state.selectedYear = event.target.value;
    updateSaveStatus(`Year set to ${state.selectedYear}. Unsaved changes.`);
  });

  $("overviewTableBody").addEventListener("input", (event) => {
    const target = event.target;

    if(
      target.matches("[data-field]") &&
      target.tagName !== "SELECT"
    ){
      handleFieldChange(target);
    }
  });

  $("overviewTableBody").addEventListener("change", async (event) => {
    const target = event.target;

    if(
      target.matches("[data-field]") &&
      target.tagName === "SELECT"
    ){
      handleFieldChange(target);
    }

    if(target.matches("[data-file-field]")){
      await handleFileChange(target);
    }
  });

  $("overviewTableBody").addEventListener("click", (event) => {
    const folderButton =
      event.target.closest(
        "[data-open-drawing-folder]"
      );

    if(folderButton){
      openDrawingFolderModal(
        folderButton.dataset.openDrawingFolder
      );
    }
  });

  $("closeDrawingFolderModal").addEventListener(
    "click",
    closeDrawingFolderModal
  );

  $("doneDrawingFolderModal").addEventListener(
    "click",
    closeDrawingFolderModal
  );

  $("drawingFolderModal").addEventListener(
    "click",
    async (event) => {
      if(event.target === $("drawingFolderModal")){
        closeDrawingFolderModal();
        return;
      }

      const openStoredFileButton =
        event.target.closest(
          "[data-open-stored-file]"
        );

      if(openStoredFileButton){
        const blobId = openStoredFileButton.dataset.openStoredFile;
        await openEcoStoredFile({ blobId });
        return;
      }

      const removeButton =
        event.target.closest(
          "[data-folder-remove-field]"
        );

      if(removeButton){
        if(!canEditCurrentSubmissionV31()) return;
        const fieldKey =
          removeButton.dataset.folderRemoveField;

        const fileIndex =
          Number(
            removeButton.dataset.folderRemoveIndex
          );

        const files =
          normaliseDrawingFiles(
            state.formData[fieldKey]
          );

        if(
          fileIndex >= 0 &&
          fileIndex < files.length
        ){
          files.splice(fileIndex, 1);
          state.formData[fieldKey] = files;
          // Saved and archived versions may still reference this drawing blob.

          renderDrawingFolderModal(fieldKey);
          renderOverviewTable();

          updateSaveStatus(
            "Drawing file removed."
          );
        }
      }
    }
  );

  $("clearFormBtn").addEventListener("click", () => {
    if(!canEditCurrentSubmissionV31()) return;
    if(!confirm("Clear the current form values?")) return;
    resetForm();
  });

  $("submitBtn").addEventListener("click", saveSubmission);

  $("overviewTableBody").addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-loading-table]");
    if(trigger){
      openLoadingCapacityModal();
    }
  });

  $("closeLoadingCapacityModal").addEventListener("click", closeLoadingCapacityModal);
  $("cancelLoadingCapacityModal").addEventListener("click", closeLoadingCapacityModal);

  $("loadingCapacityModal").addEventListener("click", (event) => {
    if(event.target === $("loadingCapacityModal")){
      closeLoadingCapacityModal();
    }
  });

  $("addLoadingRowBtn").addEventListener("click", addLoadingCapacityRow);

  $("toggleExcelPasteBtn").addEventListener("click", () => {
    if(!canEditCurrentSubmissionV31()) return;
    $("excelPastePanel").classList.toggle("hidden");
    if(!$("excelPastePanel").classList.contains("hidden")){
      $("excelPasteInput").focus();
    }
  });

  $("clearExcelPasteBtn").addEventListener("click", () => {
    if(!canEditCurrentSubmissionV31()) return;
    $("excelPasteInput").value = "";
    $("excelPasteInput").focus();
  });

  const openExcelPasteGuide = () => {
    $("excelGuideModal").classList.remove("hidden");
  };

  const closeExcelPasteGuide = () => {
    $("excelGuideModal").classList.add("hidden");
  };

  $("openExcelPasteGuideBtn").addEventListener("click", openExcelPasteGuide);
  $("closeExcelPasteGuideBtn").addEventListener("click", closeExcelPasteGuide);
  $("closeExcelPasteGuideBtnSecondary").addEventListener("click", closeExcelPasteGuide);
  $("excelGuideModal").addEventListener("click", (event) => {
    if(event.target === $("excelGuideModal")){
      closeExcelPasteGuide();
    }
  });

  $("importExcelRowsBtn").addEventListener("click", importExcelLoadingRows);

  $("loadingCapacityTableBody").addEventListener("change", (event) => {
    const target = event.target;

    if(target.matches("[data-loading-index][data-loading-field]")){
      updateLoadingCapacityRow(
        Number(target.dataset.loadingIndex),
        target.dataset.loadingField,
        target.value
      );
    }
  });

  $("loadingCapacityTableBody").addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-loading-row]");
    if(removeButton){
      removeLoadingCapacityRow(
        Number(removeButton.dataset.removeLoadingRow)
      );
    }
  });

  $("saveLoadingCapacityModal").addEventListener("click", applyLoadingCapacityToSubmission);

  $("historyList").addEventListener("click", (event) => {
    const versionId = event.target.closest("[data-view-submission-versions]")?.dataset.viewSubmissionVersions;
    if(versionId){
      if(typeof showSubmissionVersionHistoryV31 === "function") showSubmissionVersionHistoryV31(versionId);
      return;
    }
    const openId = event.target.closest("[data-open-submission]")?.dataset.openSubmission;
    const deleteId = event.target.closest("[data-delete-submission]")?.dataset.deleteSubmission;

    if(openId){
      openSubmissionById(openId);
      return;
    }
    if(deleteId){
      deleteSubmissionById(deleteId);
    }
  });
}

function launchApp(){
  const auth =
    state.auth ||
    loadStorage(
      ECO_FRESH_STORAGE.auth,
      null
    );

  if(!auth) return;

  if(
    auth.role === "Consultant" &&
    typeof normaliseConsultantAuth === "function"
  ){
    state.auth = normaliseConsultantAuth(auth);
    if(JSON.stringify(state.auth) !== JSON.stringify(auth)){
      saveStorage(ECO_FRESH_STORAGE.auth, state.auth);
    }
  }else{
    state.auth = auth;
  }

  if(!state.auth){
    setAuth(null);
    $("appShell").classList.add("hidden");
    $("loginPage").classList.remove("hidden");
    $("loginError").textContent = "This consultant account is no longer available. Please contact Management.";
    return;
  }

  const activeAuth = state.auth;

  state.sidebarCollapsed =
    !!loadStorage(
      ECO_FRESH_STORAGE.sidebar,
      false
    );

  const visibleRole = activeAuth.role === "Management" ? "Internal" : "External";

  $("appShell").classList.toggle("management-mode-v126", activeAuth.role === "Management");
  if($("managementHeaderRole")) $("managementHeaderRole").textContent = visibleRole;
  if($("managementHeaderEmail")) $("managementHeaderEmail").textContent = activeAuth.email;

  if(activeAuth.role === "Consultant"){
    $("accountRole").textContent =
      typeof currentConsultantDisplayName === "function"
        ? currentConsultantDisplayName()
        : (activeAuth.name || "External");

    $("accountEmail").textContent =
      `External · ${activeAuth.email}`;

    $("accountAvatar").textContent =
      (typeof currentConsultantDisplayName === "function"
        ? currentConsultantDisplayName()
        : (activeAuth.name || "E"))
        .trim()
        .charAt(0)
        .toUpperCase() || "E";
  }else{
    $("accountRole").textContent = visibleRole;
    $("accountEmail").textContent = activeAuth.email;
    $("accountAvatar").textContent = "I";
  }

  populateRegionSelect();
  populateBusinessUnitSelect();
  populateProjectSelect();
  populateRevisionSelect();
  populateYearSelect();
  updateCurrentSelectionPill();
  applySidebarState();

  configureRoleNavigation(
    activeAuth.role
  );

  /*
    Set the correct role landing page BEFORE making
    the application visible. This prevents Management
    from opening or briefly showing the Consultant page.
  */
  if(activeAuth.role === "Management"){
    state.currentView =
      "managementOverview";

    ["overview","history"]
      .forEach(name => {
        const view =
          $(`${name}View`);

        if(view){
          view.classList.add("hidden");
        }
      });

    initManagementPortal();
    showManagementView(
      "managementOverview"
    );

    $("loginPage")
      .classList.add("hidden");

    $("appShell")
      .classList.remove("hidden");

    return;
  }

  state.currentView =
    "overview";

  document
    .querySelectorAll(".management-view")
    .forEach(view =>
      view.classList.add("hidden")
    );

  state.formData =
    defaultFormData();
  state.editingId = null;
  state.loadedSubmissionTokenV31 = null;

  renderOverviewTable();
  renderHistory();
  showView("overview");

  $("loginPage")
    .classList.add("hidden");

  $("appShell")
    .classList.remove("hidden");
}

bindEvents();
bindPoundageCalculatorEvents();
// Restore only a valid Supabase session. The old browser-only auth cache is never trusted.
document.addEventListener("DOMContentLoaded", async () => {
  if(window.EcoBackend){
    const restored = await window.EcoBackend.boot();
    if(restored) launchApp();
    return;
  }
  launchApp();
});
