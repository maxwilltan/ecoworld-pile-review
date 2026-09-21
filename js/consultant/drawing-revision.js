/* drawing-only revision selector for Consultant drawing folder. */

function drawingRevisionSelectedV147(fieldKey, groups){
  const modal=$("drawingFolderModal");
  let selected=modal?.dataset?.drawingRevision || state.selectedRevision || "";
  if(!groups.some(group=>group.revision===selected)){
    selected=groups.some(group=>group.revision===state.selectedRevision)
      ? state.selectedRevision
      : (groups[0]?.revision || "");
  }
  if(modal) modal.dataset.drawingRevision=selected;
  return selected;
}

function renderDrawingFolderModal(fieldKey){
  const groups=getProjectDrawingRevisionGroups(fieldKey);
  const selector=$("drawingRevisionSelectV147");
  const modal=$("drawingFolderModal");

  $("drawingFolderModalTitle").textContent=drawingFieldLabel(fieldKey);
  $("drawingFolderModalMeta").textContent=state.selectedProject || "Drawing Files";

  const selectedRevision=drawingRevisionSelectedV147(fieldKey,groups);

  if(selector){
    selector.innerHTML=groups.length
      ? groups.map(group=>`<option value="${escapeHtml(group.revision)}" ${group.revision===selectedRevision?"selected":""}>${escapeHtml(group.revision)}</option>`).join("")
      : `<option value="${escapeHtml(state.selectedRevision||"Current Revision")}">${escapeHtml(state.selectedRevision||"Current Revision")}</option>`;
    selector.disabled=groups.length<=1;
  }

  const body=$("drawingFolderModalBody");
  const group=groups.find(item=>item.revision===selectedRevision);

  if(!group){
    body.innerHTML=`
      <div class="drawing-folder-empty">
        <div class="drawing-folder-empty-icon">▰</div>
        <strong>No files yet</strong>
      </div>`;
    return;
  }

  body.innerHTML=`
    <section class="drawing-revision-group">
      <div class="drawing-revision-head">
        <strong>${escapeHtml(group.revision)}</strong>
        <span>${group.files.length} file${group.files.length===1?"":"s"}</span>
      </div>
      <div class="drawing-folder-file-list">
        ${group.files.map((file,index)=>`
          <div class="drawing-folder-file-row">
            <div class="drawing-folder-file-info">
              <span class="drawing-file-type">${escapeHtml(String(file.name||"").split(".").pop().toUpperCase())}</span>
              <div>
                <strong>${escapeHtml(file.name)}</strong>
                <small>${file.size?`${Math.max(1,Math.round(file.size/1024))} KB`:"Uploaded file"}</small>
              </div>
            </div>
            <div class="drawing-folder-file-actions">
              ${file.blobId
                ? `<button type="button" class="drawing-open-file-btn" data-open-drawing-revision-file="${index}">Open</button>`
                : file.dataUrl
                  ? `<a class="drawing-open-file-btn" href="${file.dataUrl}" target="_blank" rel="noopener">Open</a>`
                  : ""}
              ${group.revision===state.selectedRevision && canEditCurrentSubmissionV31()
                ? `<button type="button" class="drawing-folder-remove-btn" data-folder-remove-field="${fieldKey}" data-folder-remove-index="${index}">Remove</button>`
                : ""}
            </div>
          </div>`).join("")}
      </div>
    </section>`;
}

function openDrawingFolderModal(fieldKey){
  if(!hasSelectedProject()){
    alert("Select a project first.");
    return;
  }
  const modal=$("drawingFolderModal");
  modal.dataset.fieldKey=fieldKey;
  modal.dataset.drawingRevision=state.selectedRevision || "";
  renderDrawingFolderModal(fieldKey);
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

document.addEventListener("DOMContentLoaded",()=>{
  $("drawingRevisionSelectV147")?.addEventListener("change",event=>{
    const modal=$("drawingFolderModal");
    modal.dataset.drawingRevision=event.target.value;
    renderDrawingFolderModal(modal.dataset.fieldKey || "");
  });

  $("drawingFolderModal")?.addEventListener("click", async event => {
    const button = event.target.closest("[data-open-drawing-revision-file]");
    if(!button) return;

    const modal = $("drawingFolderModal");
    const fieldKey = modal?.dataset?.fieldKey || "";
    const revision = modal?.dataset?.drawingRevision || "";
    const group = getProjectDrawingRevisionGroups(fieldKey).find(item => item.revision === revision);
    const file = group?.files?.[Number(button.dataset.openDrawingRevisionFile)];
    if(file) await openEcoStoredFile(file);
  });
});
