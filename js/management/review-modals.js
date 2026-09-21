/* Consultant-style compact review for Internal Poundage + Drawings. */

function managementPoundageReviewDetailV132(item, fieldKey){
  const store=item?.formData?.poundageDetails;
  if(!store || typeof store!=="object" || Array.isArray(store)) return {};
  const detail=store[fieldKey];
  return detail && typeof detail==="object" ? detail : {};
}

function managementPoundageReviewTriggerV132(item, entry, valueDisplay){
  const data=item?.formData || {};
  if(entry?.buildingTypeScope && managementComparisonNormalizedBuildingType(data)!==entry.buildingTypeScope){
    return `<span class="management-comparison-empty-v131">—</span>`;
  }

  const fieldKey=entry?.row?.key || "";
  const detail=managementPoundageReviewDetailV132(item,fieldKey);
  const remark=String(detail.exceedReason || "").trim();
  const exceeded=!!detail.exceeded;
  const label=entry?.label || entry?.row?.label || "Poundage";

  return `
    <button
      type="button"
      class="management-poundage-review-trigger-v132 ${exceeded ? "is-exceeded" : ""}"
      data-management-poundage-review-v132="${escapeHtml(item.id || "")}"
      data-management-poundage-field-v132="${escapeHtml(fieldKey)}"
      data-management-poundage-label-v132="${escapeHtml(label)}"
      data-management-poundage-value-v132="${escapeHtml(valueDisplay || "—")}"
    >
      <span class="management-poundage-review-trigger-copy-v132">
        <strong>${escapeHtml(valueDisplay || "—")}</strong>
        ${remark ? `<small>Remark: ${escapeHtml(remark)}</small>` : ``}
      </span>
    </button>
  `;
}

function managementComparisonDrawingMarkupV132(item, entry){
  const fieldKey=entry?.row?.key || "";
  const files=normaliseDrawingFiles(item?.formData?.[fieldKey]);
  if(!files.length) return `<span class="management-comparison-empty-v131">—</span>`;

  const label=managementDrawingFieldLabel(fieldKey,entry?.row?.label || "Drawing Files");
  return `
    <button
      type="button"
      class="drawing-folder-card management-drawing-folder-card management-comparison-drawing-folder-v132"
      data-management-open-file-folder="${escapeHtml(item.id || "")}"
      data-management-file-folder-field="${escapeHtml(fieldKey)}"
      data-management-file-folder-label="${escapeHtml(label)}"
    >
      <span class="drawing-folder-icon">▰</span>
      <span class="drawing-folder-copy">
        <strong>${escapeHtml(label)}</strong>
        <small>${files.length} file${files.length===1?"":"s"} uploaded</small>
      </span>
      <span class="drawing-folder-open">Open <strong>→</strong></span>
    </button>
  `;
}

/* Override V131: compact Consultant-style cells. */
function managementComparisonCellMarkupV131(item, entry, valueDisplay){
  if(entry?.sectionTitle==="Poundage"){
    return managementPoundageReviewTriggerV132(item,entry,valueDisplay);
  }
  if(entry?.row?.type==="file"){
    return managementComparisonDrawingMarkupV132(item,entry);
  }
  return escapeHtml(valueDisplay || "—");
}

/* Override V131: one folder represents the complete drawing set for the selected revision. */
function managementSubmissionFileMarkup(submissionId,row,data){
  const files=normaliseDrawingFiles(data?.[row.key]);
  if(!files.length) return `<div class="management-readonly-value">—</div>`;

  const label=managementDrawingFieldLabel(row.key,row.label || "Drawing Files");
  return `
    <button
      type="button"
      class="drawing-folder-card management-drawing-folder-card"
      data-management-open-file-folder="${escapeHtml(submissionId)}"
      data-management-file-folder-field="${escapeHtml(row.key)}"
      data-management-file-folder-label="${escapeHtml(label)}"
    >
      <span class="drawing-folder-icon">▰</span>
      <span class="drawing-folder-copy">
        <strong>${escapeHtml(label)}</strong>
        <small>${files.length} file${files.length===1?"":"s"} uploaded</small>
      </span>
      <span class="drawing-folder-open">Open <strong>→</strong></span>
    </button>
  `;
}

function openManagementPoundageReviewV132(button){
  const submissionId=button?.dataset?.managementPoundageReviewV132 || "";
  const fieldKey=button?.dataset?.managementPoundageFieldV132 || "";
  const submission=getSubmissions().find(item=>item.id===submissionId);
  if(!submission) return;

  const detail=managementPoundageReviewDetailV132(submission,fieldKey);
  const remark=String(detail.exceedReason || "").trim();
  const label=button.dataset.managementPoundageLabelV132 || "Poundage";
  const value=button.dataset.managementPoundageValueV132 || "—";

  $("managementPoundageReviewTitleV132").textContent=label;
  $("managementPoundageReviewMetaV132").textContent=[
    submission.project,
    submission.revision,
    typeof submissionYearLabel==="function" ? submissionYearLabel(submission) : submission.year
  ].filter(Boolean).join(" · ");
  $("managementPoundageReviewValueV132").textContent=value;
  $("managementPoundageReviewValueV132").classList.toggle("is-exceeded",!!detail.exceeded);
  $("managementPoundageReviewSteelV133").textContent = detail.steelWeight !== undefined && String(detail.steelWeight).trim() !== "" ? String(detail.steelWeight) : "—";
  $("managementPoundageReviewConcreteV133").textContent = detail.concreteVolume !== undefined && String(detail.concreteVolume).trim() !== "" ? String(detail.concreteVolume) : "—";
  $("managementPoundageReviewRemarkV132").textContent=remark || "—";

  $("managementPoundageReviewModalV132").classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function managementHasVisibleModalV134(){
  const modalIds=[
    "managementSubmissionModal",
    "managementDrawingFolderModal",
    "managementSettingsModal",
    "managementPileReferenceModalV124",
    "loadingCapacityModal",
    "pileCheckModal"
  ];

  return modalIds.some(id=>{
    const el=$(id);
    return !!el && !el.classList.contains("hidden");
  });
}

function closeManagementPoundageReviewV132(){
  $("managementPoundageReviewModalV132")?.classList.add("hidden");

  /* release the global scroll lock whenever no other modal is still open.
     The previous check used an obsolete managementSettingsModalV121 id, so
     body.modal-open could remain stuck after closing Poundage review. */
  if(!managementHasVisibleModalV134()){
    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("overflow");
  }
}

/* Override the full Management submission modal too: Poundage is read-only via popup,
   and Drawings remain one folder card per drawing category. */
function openManagementSubmissionModal(submissionId){
  const item=getSubmissions().find(sub=>sub.id===submissionId);
  if(!item) return;
  const data=item.formData || {};

  $("managementSubmissionModalTitle").textContent=item.project || "Submission";
  $("managementSubmissionModalMeta").textContent=`${item.region || "—"} · ${item.businessUnit || "—"} · ${item.revision || "—"} · ${typeof submissionYearLabel === "function" ? submissionYearLabel(item) : (item.year || "—")}`;

  let bodyHtml=`
    <div class="management-readonly-submission-wrap">
      <table class="overview-table management-readonly-submission-table">
        <thead><tr><th>Item</th><th>${escapeHtml(item.revision || "Value")}</th></tr></thead>
        <tbody>
  `;

  OVERVIEW_SECTIONS.forEach(section=>{
    bodyHtml+=`<tr class="section-row"><td colspan="2"><div class="section-row-content"><span>${escapeHtml(section.title)}</span></div></td></tr>`;
    const rows=managementSettingsRowsForSection(section);

    rows.forEach(row=>{
      if(row.key==="landedType" && data.buildingType!=="Landed") return;
      if(row.showWhen && !row.showWhen(data)) return;
      const valueDisplay=managementSubmissionValueDisplay(row,data);

      if(row.type==="file"){
        bodyHtml+=`
          <tr>
            <td><div class="field-label">${escapeHtml(row.label)}</div></td>
            <td>${managementSubmissionFileMarkup(item.id,row,data)}</td>
          </tr>`;
        return;
      }

      if(section.title==="Poundage"){
        const detail=managementPoundageReviewDetailV132(item,row.key);
        const remark=String(detail.exceedReason || "").trim();
        const exceeded=!!detail.exceeded;
        const label=managementPoundageRowLabel(row.key,row.label,data.buildingType);
        bodyHtml+=`
          <tr>
            <td><div class="field-label">${escapeHtml(label)}</div></td>
            <td>
              <button
                type="button"
                class="management-poundage-review-trigger-v132 ${exceeded ? "is-exceeded" : ""}"
                data-management-poundage-review-v132="${escapeHtml(item.id)}"
                data-management-poundage-field-v132="${escapeHtml(row.key)}"
                data-management-poundage-label-v132="${escapeHtml(label)}"
                data-management-poundage-value-v132="${escapeHtml(valueDisplay || "—")}"
              >
                <span class="management-poundage-review-trigger-copy-v132">
                  <strong>${escapeHtml(valueDisplay || "—")}</strong>
                  ${remark ? `<small>Remark: ${escapeHtml(remark)}</small>` : ``}
                </span>
              </button>
            </td>
          </tr>`;
        return;
      }

      bodyHtml+=`
        <tr>
          <td><div class="field-label">${escapeHtml(row.label)}</div></td>
          <td><div class="management-readonly-value">${escapeHtml(valueDisplay)}</div></td>
        </tr>`;
    });
  });

  bodyHtml+=`</tbody></table></div>`;
  $("managementSubmissionModalBody").innerHTML=bodyHtml;
  $("managementSubmissionModal").classList.remove("hidden");
  document.body.classList.add("modal-open");
}

document.addEventListener("DOMContentLoaded",()=>{
  document.addEventListener("click",event=>{
    const poundage=event.target.closest("[data-management-poundage-review-v132]");
    if(poundage){
      event.preventDefault();
      event.stopPropagation();
      openManagementPoundageReviewV132(poundage);
      return;
    }

    /* Existing folder listener only covers the full submission modal. This covers
       folder cards rendered directly inside the Comparison table. */
    const folder=event.target.closest("[data-management-open-file-folder]");
    if(folder && !folder.closest("#managementSubmissionModal")){
      event.preventDefault();
      event.stopPropagation();
      openManagementDrawingFolderModal(
        folder.dataset.managementOpenFileFolder,
        folder.dataset.managementFileFolderField,
        folder.dataset.managementFileFolderLabel
      );
    }
  });

  $("closeManagementPoundageReviewV132")?.addEventListener("click",closeManagementPoundageReviewV132);
  $("managementPoundageReviewModalV132")?.addEventListener("click",event=>{
    if(event.target===$("managementPoundageReviewModalV132")) closeManagementPoundageReviewV132();
  });
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape" && !$("managementPoundageReviewModalV132")?.classList.contains("hidden")){
      closeManagementPoundageReviewV132();
    }
  });
});
