function resetForm(){
  if(!canEditCurrentSubmissionV31()) return;
  state.formData = {
    ...defaultFormData(),
    projectName: state.selectedProject || ""
  };
  renderOverviewTable();
  updateSaveStatus("Form cleared.");
}

async function handleFieldChange(target){
  if(!canEditCurrentSubmissionV31()) return;
  const key = target.dataset.field;
  if(!key) return;

  state.formData[key] = target.value;

  if(key === "buildingType"){
    const isLanded =
      String(target.value)
        .trim()
        .toLowerCase() === "landed";

    state.formData.buildingType = target.value;

    if(isLanded){
      if(!state.formData.landedType){
        state.formData.landedType =
        (
          typeof getConsultantDropdownOptions === "function"
            ? getConsultantDropdownOptions(
                "landedType",
                ["Terrace 22x70"]
              )
            : ["Terrace 22x70"]
        )[0] || "";
      }
    }else{
      state.formData.landedType = "";
    }

    renderOverviewTable();
    updateSaveStatus("Building type updated.");
    return;
  }

  updateSaveStatus("Unsaved changes.");
}

function ensureFileUploadIndicator(){
  let overlay = document.getElementById("fileUploadIndicatorV47");
  if(overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "fileUploadIndicatorV47";
  overlay.className = "file-upload-indicator hidden";
  overlay.setAttribute("aria-live", "polite");
  overlay.setAttribute("aria-busy", "true");
  overlay.innerHTML = `
    <div class="file-upload-indicator-card" role="status">
      <div class="file-upload-spinner" aria-hidden="true"></div>
      <div class="file-upload-indicator-copy">
        <strong id="fileUploadIndicatorTitleV47">Uploading file…</strong>
        <span id="fileUploadIndicatorNameV47">Please keep this page open.</span>
        <small id="fileUploadIndicatorProgressV47">Preparing upload…</small>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function showFileUploadIndicator(current,total,fileName){
  const overlay = ensureFileUploadIndicator();
  const title = document.getElementById("fileUploadIndicatorTitleV47");
  const name = document.getElementById("fileUploadIndicatorNameV47");
  const progress = document.getElementById("fileUploadIndicatorProgressV47");

  if(title){
    title.textContent = total > 1
      ? `Uploading file ${current} of ${total}…`
      : "Uploading file…";
  }
  if(name) name.textContent = fileName || "Please keep this page open.";
  if(progress){
    progress.textContent = total > 1
      ? `${current - 1} of ${total} completed · Please keep this page open.`
      : "Please keep this page open while the upload finishes.";
  }

  overlay.classList.remove("hidden");
  document.body.classList.add("file-upload-busy");
}

function hideFileUploadIndicator(){
  const overlay = document.getElementById("fileUploadIndicatorV47");
  if(overlay) overlay.classList.add("hidden");
  document.body.classList.remove("file-upload-busy");
}

async function handleFileChange(target){
  if(!canEditCurrentSubmissionV31()) return;
  const startingIdentity = selectedSubmissionIdentityV31();
  const key = target.dataset.fileField;
  const selectedFiles = Array.from(
    target.files || []
  );

  if(!key || !selectedFiles.length){
    return;
  }

  const existingFiles =
    normaliseDrawingFiles(
      state.formData[key]
    );

  const uploadedFiles = [];

  try{
    target.disabled = true;
    updateSaveStatus("Uploading file(s)…");

    for(let index = 0; index < selectedFiles.length; index += 1){
      const file = selectedFiles[index];
      showFileUploadIndicator(index + 1, selectedFiles.length, file.name);

      const stored = await saveEcoFileBlob(file, {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });

      uploadedFiles.push(stored);

      const progress = document.getElementById("fileUploadIndicatorProgressV47");
      if(progress){
        progress.textContent = `${uploadedFiles.length} of ${selectedFiles.length} completed.`;
      }
    }

    if(!canEditCurrentSubmissionV31() || startingIdentity !== selectedSubmissionIdentityV31()){
      updateSaveStatus("The submission access or selection changed. Uploaded files were not added.");
      return;
    }
    state.formData[key] = [
      ...existingFiles,
      ...uploadedFiles
    ];

    renderOverviewTable();

    updateSaveStatus(
      `${uploadedFiles.length} file${
        uploadedFiles.length === 1 ? "" : "s"
      } uploaded. Unsaved changes.`
    );
  }catch(error){
    console.error(error);
    alert("Unable to store the uploaded file. Please try again or use a smaller file.");
    updateSaveStatus("File upload could not be stored.");
  }finally{
    hideFileUploadIndicator();
    target.disabled = false;
    target.value = "";
  }
}

function buildSubmissionPayload(existingId = null){
  if(typeof syncLoadingSummaryToForm === "function"){
    syncLoadingSummaryToForm();
  }

  return {
    id: existingId || `sub_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    role: "Consultant",
    consultantAccountId: typeof currentConsultantAccountId === "function" ? currentConsultantAccountId() : "",
    consultantAccountName: typeof currentConsultantDisplayName === "function" ? currentConsultantDisplayName() : (state.formData.consultantName || ""),
    consultantAccountEmail: state.auth?.email || "",
    region: state.selectedRegion,
    businessUnit: state.selectedBusinessUnit,
    project: state.selectedProject,
    revision: state.selectedRevision,
    year: state.selectedYear || currentMonthYearLabel(),
    updatedAt: new Date().toISOString(),
    formData: structuredClone(state.formData)
  };
}

function showSubmissionSuccessNotice(payload){
  const existing = document.getElementById("submissionSuccessBackdrop");
  if(existing) existing.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "submissionSuccessBackdrop";
  backdrop.className = "modal-backdrop submission-success-backdrop";

  const submittedAt = new Date(payload?.updatedAt || Date.now());
  const timeText = submittedAt.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  backdrop.innerHTML = `
    <div class="submission-success-modal" role="dialog" aria-modal="true" aria-labelledby="submissionSuccessTitle">
      <div class="submission-success-icon" aria-hidden="true">✓</div>
      <p class="submission-success-eyebrow">SUBMISSION COMPLETE</p>
      <h2 id="submissionSuccessTitle">Submission Successful</h2>
      <p class="submission-success-copy">Your consultant submission has been saved successfully.</p>

      <div class="submission-success-details">
        <div>
          <span>Project</span>
          <strong>${escapeHtml(payload?.project || "—")}</strong>
        </div>
        <div>
          <span>Revision</span>
          <strong>${escapeHtml(payload?.revision || "—")}</strong>
        </div>
        <div>
          <span>Year</span>
          <strong>${escapeHtml(payload?.year || "—")}</strong>
        </div>
        <div class="submission-success-time">
          <span>Submitted</span>
          <strong>${escapeHtml(timeText)}</strong>
        </div>
      </div>

      <button type="button" class="primary-btn submission-success-done" id="submissionSuccessDone">Done</button>
    </div>`;

  document.body.appendChild(backdrop);
  document.body.classList.add("modal-open");

  const close = () => {
    backdrop.remove();
    document.body.classList.remove("modal-open");
    // The submission and both views are already refreshed after the save.
    // Keep the current Supabase session and portal state in place instead of
    // reloading through the login screen while the session is restored.
  };

  backdrop.addEventListener("click", event => {
    if(event.target === backdrop) close();
  });

  const doneButton = backdrop.querySelector("#submissionSuccessDone");
  doneButton?.addEventListener("click", close);
  doneButton?.focus();
}

function showSubmissionConfirmNotice(){
  const existing = document.getElementById("submissionConfirmBackdrop");
  if(existing) existing.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "submissionConfirmBackdrop";
  backdrop.className = "modal-backdrop submission-success-backdrop submission-confirm-backdrop";

  const alreadySubmitted = !!currentSelectedSubmissionV31();

  backdrop.innerHTML = `
    <div class="submission-success-modal submission-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="submissionConfirmTitle">
      <button type="button" class="submission-confirm-close" id="submissionConfirmClose" aria-label="Close confirmation">×</button>
      <div class="submission-success-icon submission-confirm-icon" aria-hidden="true">?</div>
      <p class="submission-success-eyebrow submission-confirm-eyebrow">PLEASE CONFIRM</p>
      <h2 id="submissionConfirmTitle">${alreadySubmitted ? "Update This Submission?" : "Submit This Revision?"}</h2>
      <p class="submission-success-copy submission-confirm-copy">
        ${alreadySubmitted
          ? "Your correction will be saved as a new version of this submission. The previous values and drawings will stay in version history, and editing will lock again."
          : "Please confirm the project, revision and year below before sending this submission to Management."}
      </p>

      <div class="submission-success-details submission-confirm-details">
        <div>
          <span>Project</span>
          <strong>${escapeHtml(state.selectedProject || "—")}</strong>
        </div>
        <div>
          <span>Revision</span>
          <strong>${escapeHtml(state.selectedRevision || "—")}</strong>
        </div>
        <div>
          <span>Year</span>
          <strong>${escapeHtml(state.selectedYear || currentMonthYearLabel())}</strong>
        </div>
      </div>

      <div class="submission-confirm-actions">
        <button type="button" class="primary-btn submission-confirm-submit" id="submissionConfirmSubmit">${alreadySubmitted ? "Confirm Update" : "Confirm Submission"}</button>
      </div>
    </div>`;

  document.body.appendChild(backdrop);
  document.body.classList.add("modal-open");

  const close = () => {
    backdrop.remove();
    document.body.classList.remove("modal-open");
  };

  backdrop.addEventListener("click", event => {
    if(event.target === backdrop) close();
  });

  backdrop.querySelector("#submissionConfirmClose")?.addEventListener("click", close);
  backdrop.querySelector("#submissionConfirmSubmit")?.addEventListener("click", () => {
    close();
    saveSubmission({ confirmed: true });
  });

  backdrop.querySelector("#submissionConfirmSubmit")?.focus();
}

function showSubmissionErrorNotice(message){
  const existing = document.getElementById("submissionErrorBackdrop");
  if(existing) existing.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "submissionErrorBackdrop";
  backdrop.className = "modal-backdrop submission-success-backdrop submission-error-backdrop";

  backdrop.innerHTML = `
    <div class="submission-success-modal submission-error-modal" role="alertdialog" aria-modal="true" aria-labelledby="submissionErrorTitle">
      <div class="submission-success-icon submission-error-icon" aria-hidden="true">!</div>
      <p class="submission-success-eyebrow submission-error-eyebrow">SUBMISSION NOT SAVED</p>
      <h2 id="submissionErrorTitle">Unable to Save Submission</h2>
      <p class="submission-success-copy submission-error-copy">${escapeHtml(message || "The submission could not be saved. Your current form values are still on screen.")}</p>
      <div class="submission-error-note">Your current entries have not been cleared, so you can try submitting again.</div>
      <button type="button" class="primary-btn submission-success-done submission-error-done" id="submissionErrorDone">Back to Submission</button>
    </div>`;

  document.body.appendChild(backdrop);
  document.body.classList.add("modal-open");

  const close = () => {
    backdrop.remove();
    document.body.classList.remove("modal-open");
  };

  backdrop.addEventListener("click", event => {
    if(event.target === backdrop) close();
  });

  const doneButton = backdrop.querySelector("#submissionErrorDone");
  doneButton?.addEventListener("click", close);
  doneButton?.focus();
}

function validateSubmission(){
  try{
    assertSubmissionSaveAllowedV31();
  }catch(error){
    showSubmissionErrorNotice(error.message);
    updateSubmissionLockState();
    return false;
  }
  if(!hasSelectedProject()){
    alert("Please select a project before filling or submitting.");
    return false;
  }

  if(!state.selectedRegion || !state.selectedBusinessUnit || !state.selectedProject){
    alert("Please choose Region, Business Unit, Select Project and Revision first.");
    return false;
  }
  if(!state.selectedRevision){
    alert("Please choose a revision.");
    return false;
  }
  if(!state.selectedYear){
    alert("Please choose a year.");
    return false;
  }
  if(!state.formData.consultantName?.trim()){
    alert("Please fill in Consultant.");
    return false;
  }

  if(typeof consultantPoundageMissingReasonField === "function"){
    const missingReasonField = consultantPoundageMissingReasonField();
    if(missingReasonField){
      alert(`${poundageFieldLabel(missingReasonField)} requires a remark before submitting.`);
      if(typeof openPoundageCalculator === "function"){
        openPoundageCalculator(missingReasonField);
      }
      return false;
    }
  }

  return true;
}

async function saveSubmission(options = {}){
  if(state.submissionSavingV31) return;
  if(!options?.confirmed){
    if(!validateSubmission()) return;
    showSubmissionConfirmNotice();
    return;
  }

  if(!validateSubmission()) return;
  state.submissionSavingV31 = true;

  const submitButton = $("submitBtn");
  const originalText = submitButton?.textContent || "Submit";

  if(submitButton){
    submitButton.disabled = true;
    submitButton.textContent = "Saving…";
  }

  let payload = null;

  try{
    const all = getSubmissions();
    const originalRecords = JSON.stringify(all);
    const existing = assertSubmissionSaveAllowedV31(null,all);
    const existingIndex = existing ? all.findIndex(item => item.id === existing.id) : -1;
    payload = finaliseSubmissionVersionV31(buildSubmissionPayload(existing?.id || null),existing);

    // Migrate any legacy base64 drawing data out of localStorage before saving.
    await migrateSubmissionDrawingFiles([payload]);
    assertSubmissionSaveAllowedV31(payload,getSubmissions());

    if(existingIndex >= 0){
      all[existingIndex] = payload;
    }else{
      all.unshift(payload);
    }

    // Include snapshots when migrating, preserving drawing references in every version.
    await migrateSubmissionDrawingFiles(all.flatMap(item => [item,...(item.previousVersions || [])]));

    // Re-read after every awaited storage operation: a different tab may have
    // revoked access or submitted a newer version while files were migrating.
    const latest = getSubmissions();
    assertSubmissionSaveAllowedV31(payload,latest);
    if(JSON.stringify(latest) !== originalRecords){
      throw new Error("The saved submissions changed while saving. Please reopen your submission and try again.");
    }

    // Save to Supabase first. Browser storage is only a cache in production.
    if(window.EcoBackend){
      await window.EcoBackend.persistSubmission(payload);
      await window.EcoBackend.audit(
        existing ? "submission_resubmitted" : "submission_created",
        "submission",
        payload.id,
        {project:payload.project,revision:payload.revision,versionNumber:payload.versionNumber}
      );
    }

    setSubmissions(all);
    state.formData = structuredClone(payload.formData);
    state.editingId = payload.id;
    state.loadedSubmissionTokenV31 = submissionContentTokenV31(payload);
  }catch(error){
    console.error("Submission storage failed:", error);

    const isQuotaError =
      error?.name === "QuotaExceededError" ||
      String(error?.message || "").toLowerCase().includes("quota");

    showSubmissionErrorNotice(
      isQuotaError
        ? "The browser storage limit was reached. Older portal data may still be using too much browser storage. Your current form values are still on screen, so please try submitting again."
        : (error?.message || "The submission could not be saved. Your current form values are still on screen. Please try again.")
    );
    updateSaveStatus("Submission was not saved.");
    return;
  }finally{
    state.submissionSavingV31 = false;
    if(submitButton){
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
    updateSubmissionLockState();
  }

  // The submission is already safely stored at this point. Any rendering issue
  // below is logged separately and must not trigger a false save-failure notice.
  try{
    updateSaveStatus(`Submitted successfully: ${payload.project} · ${payload.revision} · ${payload.year}.`);
    renderOverviewTable();
    renderHistory();
    showSubmissionSuccessNotice(payload);
  }catch(error){
    console.error("Submission saved, but the post-save UI refresh failed:", error);
    updateSaveStatus(`Submitted successfully: ${payload.project} · ${payload.revision} · ${payload.year}.`);
  }
}

function openSubmissionById(submissionId){
  const item = getSubmissions().find(submission =>
    String(submission?.id || "") === String(submissionId || "") &&
    canViewSubmissionV31(submission)
  );

  if(!item){
    console.warn("Submission not found:", submissionId);
    return;
  }

  state.selectedRegion = item.region || "";
  state.selectedBusinessUnit = item.businessUnit || "";
  state.selectedProject = item.project || "";
  state.selectedRevision = item.revision || "Rev 0";

  const savedYear = submissionYearLabel(item);
  state.selectedYear =
    savedYear && savedYear !== "—"
      ? savedYear
      : currentMonthYearLabel();

  state.formData = {
    ...defaultFormData(),
    ...(item.formData ? structuredClone(item.formData) : {})
  };
  state.formData.projectName = state.selectedProject;
  state.editingId = item.id;
  state.loadedSubmissionTokenV31 = submissionContentTokenV31(item);

  // Restore the complete selector chain before rendering the saved form.
  populateRegionSelect();
  if($("regionSelect")) $("regionSelect").value = state.selectedRegion;

  populateBusinessUnitSelect();
  if($("businessUnitSelect")) $("businessUnitSelect").value = state.selectedBusinessUnit;

  populateProjectSelect();
  if($("projectSelect")) $("projectSelect").value = state.selectedProject;

  if($("projectSearchInput")){
    $("projectSearchInput").value = state.selectedProject;
  }

  populateRevisionSelect();
  if($("revisionSelect")) $("revisionSelect").value = state.selectedRevision;

  populateYearSelect();
  if($("yearSelect")) $("yearSelect").value = state.selectedYear;

  updateCurrentSelectionPill();
  renderOverviewTable();
  updateSaveStatus(
    `Loaded ${state.selectedProject} · ${state.selectedRevision} · Version ${Number(item.versionNumber) || 1}. ${canConsultantEditSubmissionV31(item) ? "Editing allowed. Resubmitting will lock this submission again." : "Read only. Management must allow editing before corrections."}`
  );

  showView("overview");

  // Return the Consultant workspace to the top after opening from History.
  const mainShell = $("mainShell");
  if(mainShell && typeof mainShell.scrollTo === "function"){
    mainShell.scrollTo({ top:0, behavior:"smooth" });
  }else{
    window.scrollTo({ top:0, behavior:"smooth" });
  }
}

async function permanentlyDeleteSubmissionV141(item){
  if(!item) return false;
  // Removing and recreating a locked record would bypass correction approval.
  if(state.auth?.role !== "Management") return false;

  const submissions = getSubmissions();
  const next = submissions.filter(entry => entry.id !== item.id);

  if(window.EcoBackend){
    await window.EcoBackend.deleteSubmission(item.id);
    await window.EcoBackend.audit("submission_deleted","submission",item.id,{project:item.project,revision:item.revision});
  }
  setSubmissions(next);

  // Remove uploaded file blobs as a best-effort cleanup. A failed blob cleanup
  // must not bring the deleted submission back into History.
  const drawingKeys = ["drawingArchitectural", "drawingStructural"];
  const blobIds = [];

  [item,...(item.previousVersions || [])].forEach(version => {
    drawingKeys.forEach(key => {
      const files = Array.isArray(version.formData?.[key]) ? version.formData[key] : (version.formData?.[key] ? [version.formData[key]] : []);
      files.forEach(file => { if(file?.blobId) blobIds.push(file.blobId); });
    });
  });

  if(typeof deleteEcoFileBlob === "function" && blobIds.length){
    const remainingBlobIds = new Set();
    next.flatMap(submission => [submission,...(submission.previousVersions || [])]).forEach(submission => {
      drawingKeys.forEach(key => {
        const files = Array.isArray(submission.formData?.[key])
          ? submission.formData[key]
          : (submission.formData?.[key] ? [submission.formData[key]] : []);
        files.forEach(file => {
          if(file?.blobId) remainingBlobIds.add(file.blobId);
        });
      });
    });

    const orphanedBlobIds = [...new Set(blobIds)].filter(blobId => !remainingBlobIds.has(blobId));
    await Promise.allSettled(orphanedBlobIds.map(blobId => deleteEcoFileBlob(blobId)));
  }

  if(state.editingId === item.id){
    state.editingId = null;
  }

  renderHistory();
  return true;
}

function showDeleteSubmissionConfirmV141(item,onDeleted=null){
  if(state.auth?.role !== "Management") return;
  const old = document.getElementById("submissionDeleteBackdrop");
  if(old) old.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "submissionDeleteBackdrop";
  backdrop.className = "modal-backdrop submission-success-backdrop submission-delete-backdrop";

  backdrop.innerHTML = `
    <div class="submission-success-modal submission-confirm-modal submission-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="submissionDeleteTitle">
      <button type="button" class="submission-confirm-close submission-delete-close" id="submissionDeleteClose" aria-label="Close deletion confirmation">×</button>
      <div class="submission-success-icon submission-delete-icon" aria-hidden="true">!</div>
      <p class="submission-success-eyebrow submission-delete-eyebrow">PLEASE CONFIRM</p>
      <h2 id="submissionDeleteTitle">Delete Submission?</h2>
      <p class="submission-success-copy submission-delete-copy">This submission will be removed from History and Internal review.</p>

      <div class="submission-success-details submission-confirm-details">
        <div>
          <span>Project</span>
          <strong>${escapeHtml(item.project || "—")}</strong>
        </div>
        <div>
          <span>Revision</span>
          <strong>${escapeHtml(item.revision || "—")}</strong>
        </div>
        <div>
          <span>Year</span>
          <strong>${escapeHtml(submissionYearLabel(item))}</strong>
        </div>
      </div>

      <div class="submission-confirm-actions">
        <button type="button" class="primary-btn submission-delete-submit" id="submissionDeleteSubmit">Delete Submission</button>
      </div>
    </div>`;

  document.body.appendChild(backdrop);
  document.body.classList.add("modal-open");

  const close = () => {
    backdrop.remove();
    if(!document.querySelector(".modal-backdrop:not(.hidden)")){
      document.body.classList.remove("modal-open");
    }
  };

  backdrop.addEventListener("click", event => {
    if(event.target === backdrop) close();
  });

  backdrop.querySelector("#submissionDeleteClose")?.addEventListener("click", close);
  backdrop.querySelector("#submissionDeleteSubmit")?.addEventListener("click", async () => {
    const button = backdrop.querySelector("#submissionDeleteSubmit");
    if(button){
      button.disabled = true;
      button.textContent = "Deleting…";
    }

    try{
      await permanentlyDeleteSubmissionV141(item);
      if(typeof onDeleted === "function") onDeleted(item);
      close();
    }catch(error){
      console.error("Unable to delete submission", error);
      if(button){
        button.disabled = false;
        button.textContent = "Delete Submission";
      }
      if(typeof showSubmissionErrorNotice === "function"){
        close();
        showSubmissionErrorNotice("The submission could not be deleted. Please try again.");
      }
    }
  });

  backdrop.querySelector("#submissionDeleteSubmit")?.focus();
}

function deleteSubmissionById(id){
  if(state.auth?.role !== "Management") return;
  const item = getSubmissions().find(entry => entry.id === id);
  if(!item) return;

  showDeleteSubmissionConfirmV141(item);
}

function renderHistory(){
  const list = $("historyList");
  const items = getSubmissions()
    .filter(canViewSubmissionV31)
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  $("historyCountPill").textContent = `${items.length} submission${items.length === 1 ? "" : "s"}`;

  if(!items.length){
    list.innerHTML = `
      <div class="empty-state compact-card">
        <div>
          <div class="empty-icon">🕘</div>
          <strong>No submissions yet</strong>
          <span>Submit from Submission and the history will appear here.</span>
        </div>
      </div>
    `;
    return;
  }

  list.innerHTML = items.map(item => {
    const updated = new Date(item.updatedAt);
    const dateText = updated.toLocaleString();
    return `
      <div class="history-card">
        <div class="history-card-top">
          <div>
            <h3>${escapeHtml(item.project || "Untitled Project")}</h3>
            <div class="history-meta">
              <span class="meta-chip">${escapeHtml(item.region || "—")}</span>
              <span class="meta-chip">${escapeHtml(item.businessUnit || "—")}</span>
              <span class="meta-chip">${escapeHtml(item.revision || "—")}</span>
              <span class="meta-chip">${escapeHtml(submissionYearLabel(item))}</span>
              <span class="meta-chip">${item.editAccess?.allowed ? "Editing allowed" : "Locked"}</span>
            </div>
          </div>
          <span class="badge">${escapeHtml(dateText)}</span>
        </div>

        <div class="history-actions">
          <button class="small-btn soft" type="button" data-open-submission="${escapeHtml(item.id)}">${canConsultantEditSubmissionV31(item) ? "Edit & resubmit" : "View submission"}</button>
          ${state.auth?.role === "Management" ? `<button class="small-btn danger" type="button" data-delete-submission="${escapeHtml(item.id)}">Delete</button>` : ""}
        </div>
      </div>
    `;
  }).join("");
}
