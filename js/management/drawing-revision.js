/* drawing-only revision selector for Internal review. */

function managementDrawingRevisionCandidatesV147(anchorSubmission, fieldKey){
  if(!anchorSubmission) return [];
  const ownerId = anchorSubmission.consultantAccountId || "";

  return getSubmissions()
    .filter(item =>
      item.project === anchorSubmission.project &&
      item.region === anchorSubmission.region &&
      item.businessUnit === anchorSubmission.businessUnit &&
      (!ownerId || !item.consultantAccountId || item.consultantAccountId === ownerId) &&
      normaliseDrawingFiles(item.formData?.[fieldKey]).length
    )
    .sort((a,b) => {
      const aMatch=String(a.revision||"").match(/(\d+)/);
      const bMatch=String(b.revision||"").match(/(\d+)/);
      const aRev=aMatch?Number(aMatch[1]):-1;
      const bRev=bMatch?Number(bMatch[1]):-1;
      if(aRev!==bRev) return aRev-bRev;
      return String(a.year||a.submittedAt||"").localeCompare(String(b.year||b.submittedAt||""));
    });
}

function managementDrawingRevisionLabelV147(item){
  const revision=item?.revision || "Revision";
  const year=typeof submissionYearLabel === "function" ? submissionYearLabel(item) : (item?.year || "");
  return [revision,year].filter(Boolean).join(" · ");
}

function renderManagementDrawingFolderFilesV147(submission, fieldKey){
  const files=normaliseDrawingFiles(submission?.formData?.[fieldKey]);
  const body=$("managementDrawingFolderModalBody");
  if(!body) return;

  if(!files.length){
    body.innerHTML=`
      <div class="drawing-folder-empty">
        <div class="drawing-folder-empty-icon">▰</div>
        <strong>No files uploaded</strong>
      </div>`;
    return;
  }

  body.innerHTML=`
    <section class="drawing-revision-group">
      <div class="drawing-revision-head">
        <strong>${escapeHtml(managementDrawingRevisionLabelV147(submission))}</strong>
        <span>${files.length} file${files.length===1?"":"s"}</span>
      </div>
      <div class="drawing-folder-file-list">
        ${files.map((file,index)=>`
          <div class="drawing-folder-file-row">
            <div class="drawing-folder-file-info">
              <span class="drawing-file-type">${escapeHtml(String(file.name||"FILE").split(".").pop().toUpperCase())}</span>
              <div>
                <strong>${escapeHtml(file.name||`File ${index+1}`)}</strong>
                <small>${escapeHtml(managementFormatFileSize(file.size||0))}</small>
              </div>
            </div>
            <div class="drawing-folder-file-actions">
              <button
                type="button"
                class="drawing-open-file-btn"
                data-management-open-submission-file="${escapeHtml(submission.id||"")}"
                data-management-open-file-field="${escapeHtml(fieldKey)}"
                data-management-open-file-index="${index}"
              >Open</button>
            </div>
          </div>`).join("")}
      </div>
    </section>`;
}

function renderManagementDrawingFolderModal(submissionId, fieldKey, fallbackLabel){
  const anchorSubmission=getSubmissions().find(item=>item.id===submissionId);
  if(!anchorSubmission) return false;

  const candidates=managementDrawingRevisionCandidatesV147(anchorSubmission,fieldKey);
  const title=managementDrawingFieldLabel(fieldKey,fallbackLabel);
  const modal=$("managementDrawingFolderModal");
  const selector=$("managementDrawingRevisionSelectV147");
  if(!modal || !selector) return false;

  modal.dataset.anchorSubmissionId=submissionId;
  modal.dataset.fieldKey=fieldKey;
  modal.dataset.fallbackLabel=fallbackLabel||"";

  let selectedId=modal.dataset.drawingSubmissionId || submissionId;
  if(!candidates.some(item=>item.id===selectedId)){
    selectedId=candidates.some(item=>item.id===submissionId) ? submissionId : (candidates[0]?.id || submissionId);
  }
  modal.dataset.drawingSubmissionId=selectedId;

  $("managementDrawingFolderModalTitle").textContent=title;
  $("managementDrawingFolderModalMeta").textContent=anchorSubmission.project || "Drawing Files";

  selector.innerHTML=candidates.length
    ? candidates.map(item=>`<option value="${escapeHtml(item.id)}" ${item.id===selectedId?"selected":""}>${escapeHtml(managementDrawingRevisionLabelV147(item))}</option>`).join("")
    : `<option value="${escapeHtml(submissionId)}">${escapeHtml(managementDrawingRevisionLabelV147(anchorSubmission))}</option>`;
  selector.disabled=candidates.length<=1;

  const selectedSubmission=getSubmissions().find(item=>item.id===selectedId) || anchorSubmission;
  renderManagementDrawingFolderFilesV147(selectedSubmission,fieldKey);
  return true;
}

function openManagementDrawingFolderModal(submissionId, fieldKey, fallbackLabel){
  const modal=$("managementDrawingFolderModal");
  if(modal){
    modal.dataset.drawingSubmissionId=submissionId;
  }
  if(!renderManagementDrawingFolderModal(submissionId,fieldKey,fallbackLabel)) return;
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

document.addEventListener("DOMContentLoaded",()=>{
  $("managementDrawingRevisionSelectV147")?.addEventListener("change",event=>{
    const modal=$("managementDrawingFolderModal");
    if(!modal) return;
    modal.dataset.drawingSubmissionId=event.target.value;
    renderManagementDrawingFolderModal(
      modal.dataset.anchorSubmissionId || event.target.value,
      modal.dataset.fieldKey || "",
      modal.dataset.fallbackLabel || ""
    );
  });
});
