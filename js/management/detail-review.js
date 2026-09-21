/* detailed Management comparison review for Poundage and Drawings. */

function managementPoundageDetailV131(item, fieldKey){
  const store = item?.formData?.poundageDetails;
  if(!store || typeof store !== "object" || Array.isArray(store)) return {};
  const detail = store[fieldKey];
  return detail && typeof detail === "object" ? detail : {};
}

function managementHasValueV131(value){
  return value !== undefined && value !== null && value !== "";
}

function managementComparisonPoundageMarkupV131(item, entry, valueDisplay){
  const data = item?.formData || {};

  if(
    entry?.buildingTypeScope &&
    managementComparisonNormalizedBuildingType(data) !== entry.buildingTypeScope
  ){
    return `<span class="management-comparison-empty-v131">—</span>`;
  }

  const fieldKey = entry?.row?.key || "";
  const detail = managementPoundageDetailV131(item, fieldKey);
  const hasSteel = managementHasValueV131(detail.steelWeight);
  const hasConcrete = managementHasValueV131(detail.concreteVolume);
  const remark = String(detail.exceedReason || "").trim();
  const exceeded = !!detail.exceeded;

  // Direct-entry Poundage rows (e.g. Landed total steel content) do not have
  // Steel Weight / Concrete Volume source fields.
  if(!hasSteel && !hasConcrete && !remark){
    return `<div class="management-comparison-main-value-v131 ${exceeded ? "is-exceeded" : ""}">${escapeHtml(valueDisplay || "—")}</div>`;
  }

  return `
    <div class="management-comparison-poundage-detail-v131">
      <div class="management-comparison-main-value-v131 ${exceeded ? "is-exceeded" : ""}">
        ${escapeHtml(valueDisplay || "—")}
      </div>
      <div class="management-comparison-source-grid-v131">
        <div>
          <span>Steel Weight</span>
          <strong>${hasSteel ? `${escapeHtml(detail.steelWeight)} kg` : "—"}</strong>
        </div>
        <div>
          <span>Concrete Volume</span>
          <strong>${hasConcrete ? `${escapeHtml(detail.concreteVolume)} m³` : "—"}</strong>
        </div>
      </div>
      ${remark ? `<div class="management-comparison-remark-v131"><span>Remark</span><strong>${escapeHtml(remark)}</strong></div>` : ""}
    </div>
  `;
}

function managementComparisonDrawingMarkupV131(item, entry){
  const fieldKey = entry?.row?.key || "";
  const files = normaliseDrawingFiles(item?.formData?.[fieldKey]);

  if(!files.length){
    return `<span class="management-comparison-empty-v131">—</span>`;
  }

  return `
    <div class="management-comparison-files-v131">
      ${files.map((file,index)=>`
        <div class="management-comparison-file-v131">
          <div class="management-comparison-file-copy-v131">
            <strong title="${escapeHtml(file.name || `File ${index+1}`)}">${escapeHtml(file.name || `File ${index+1}`)}</strong>
            <small>${escapeHtml(typeof managementFormatFileSize === "function" ? managementFormatFileSize(file.size || 0) : "")}</small>
          </div>
          <button
            type="button"
            class="management-comparison-review-file-v131"
            data-management-direct-open-file-v131="${escapeHtml(item.id)}"
            data-management-direct-file-field-v131="${escapeHtml(fieldKey)}"
            data-management-direct-file-index-v131="${index}"
          >Review</button>
        </div>
      `).join("")}
    </div>
  `;
}

function managementComparisonCellMarkupV131(item, entry, valueDisplay){
  if(entry?.sectionTitle === "Poundage"){
    return managementComparisonPoundageMarkupV131(item, entry, valueDisplay);
  }

  if(entry?.row?.type === "file"){
    return managementComparisonDrawingMarkupV131(item, entry);
  }

  return escapeHtml(valueDisplay || "—");
}

/* The full Management submission review now lists each uploaded file directly,
   rather than requiring a second folder popup before the file can be reviewed. */
function managementSubmissionFileMarkup(submissionId, row, data){
  const files = normaliseDrawingFiles(data?.[row.key]);

  if(!files.length){
    return `<div class="management-readonly-value">—</div>`;
  }

  return `
    <div class="management-direct-file-list-v131">
      ${files.map((file,index)=>`
        <div class="management-direct-file-row-v131">
          <div>
            <strong>${escapeHtml(file.name || `File ${index+1}`)}</strong>
            <small>${escapeHtml(typeof managementFormatFileSize === "function" ? managementFormatFileSize(file.size || 0) : "")}</small>
          </div>
          <button
            type="button"
            class="management-comparison-review-file-v131"
            data-management-direct-open-file-v131="${escapeHtml(submissionId)}"
            data-management-direct-file-field-v131="${escapeHtml(row.key)}"
            data-management-direct-file-index-v131="${index}"
          >Review</button>
        </div>
      `).join("")}
    </div>
  `;
}

document.addEventListener("DOMContentLoaded",()=>{
  document.addEventListener("click",event=>{
    const button=event.target.closest("[data-management-direct-open-file-v131]");
    if(!button) return;
    event.preventDefault();
    event.stopPropagation();

    if(typeof openManagementSubmissionFile !== "function") return;
    openManagementSubmissionFile(
      button.dataset.managementDirectOpenFileV131,
      button.dataset.managementDirectFileFieldV131,
      button.dataset.managementDirectFileIndexV131
    );
  });
});
