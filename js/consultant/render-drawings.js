function updateSaveStatus(message){
  $("saveStatus").textContent = message;
}

function shouldShowRow(row){
  if(typeof row.showWhen !== "function") return true;
  try{
    return !!row.showWhen(state.formData);
  }catch(error){
    return true;
  }
}

function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function consultantPoundageRowLabel(rowKey, fallback){
  const isLanded =
    String(state.formData.buildingType || "")
      .trim()
      .toLowerCase() === "landed";

  if(!isLanded){
    return fallback;
  }

  if(rowKey === "poundageRcColumn") return "RC Column, kg/m³";
  if(rowKey === "poundageRcBeamCarpark") return "RC Beam, kg/m³";
  if(rowKey === "poundageRcSlab") return "RC Slab, kg/m³";
  if(rowKey === "poundageOverall") return "Overall Poundage, kg/m³";
  if(rowKey === "poundageSteelContent") return "Total Steel Content per Unit (Landed), kg";

  return fallback;
}

function landedTypeRowMarkup(){
  const isLanded =
    String(state.formData.buildingType || "")
      .trim()
      .toLowerCase() === "landed";

  if(!isLanded){
    return "";
  }

  const options =
    typeof getConsultantDropdownOptions === "function"
      ? getConsultantDropdownOptions(
          "landedType",
          [
            "Terrace 22x70",
            "Terrace 20x70",
            "Semi-D",
            "Bungalow",
            "Cluster / Link"
          ]
        )
      : [
          "Terrace 22x70",
          "Terrace 20x70",
          "Semi-D",
          "Bungalow",
          "Cluster / Link"
        ];

  if(!state.formData.landedType){
    state.formData.landedType = options[0];
  }

  if(
    typeof isConsultantRowVisible === "function" &&
    !isConsultantRowVisible(
      "Project Information",
      "landedType"
    )
  ){
    return "";
  }

  const landedLabel =
    typeof consultantRowLabel === "function"
      ? consultantRowLabel(
          "Project Information",
          "landedType",
          "Landed Type"
        )
      : "Landed Type";

  return `
    <tr class="landed-type-row">
      <td>
        <div class="field-label">${escapeHtml(landedLabel)}</div>
      </td>
      <td>
        <select data-field="landedType">
          ${options.map(option => `
            <option
              value="${escapeHtml(option)}"
              ${state.formData.landedType === option ? "selected" : ""}
            >
              ${escapeHtml(option)}
            </option>
          `).join("")}
        </select>
      </td>
    </tr>
  `;
}

function inputMarkup(row, value){
  const safeValue = value ?? "";

  if(row.type === "loadingSummary"){
    syncLoadingSummaryToForm();

    let displayValue = state.formData[row.key];

    if(displayValue === "" || displayValue === null || displayValue === undefined){
      displayValue = "—";
    }else if(row.key === "overallEfficiency"){
      displayValue = `${displayValue}%`;
    }else{
      displayValue = Number(displayValue).toLocaleString(undefined, {
        maximumFractionDigits: 2
      });
    }

    return `
      <div class="loading-summary-trigger loading-summary-static">
        <span class="loading-summary-main">
          <span class="loading-summary-value">${escapeHtml(displayValue)}</span>
          <span class="loading-summary-caption">Calculated from detailed table</span>
        </span>
      </div>
    `;
  }

  if(
    typeof isConsultantPoundageCalculatedField === "function" &&
    isConsultantPoundageCalculatedField(row.key)
  ){
    const displayValue =
      safeValue === "" || safeValue === null || safeValue === undefined
        ? "—"
        : `${Number(safeValue).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg/m³`;

    const isExceeding =
      safeValue !== "" &&
      typeof consultantPoundageExceedsGuide === "function" &&
      consultantPoundageExceedsGuide(row.key, safeValue);

    const exceedReason =
      typeof getPoundageDetail === "function"
        ? String(getPoundageDetail(row.key)?.exceedReason || "").trim()
        : "";

    return `
      <button
        type="button"
        class="poundage-calculator-trigger ${isExceeding ? "is-exceeding" : ""}"
        data-open-poundage-calculator="${escapeHtml(row.key)}"
        title="Enter steel weight and concrete volume"
      >
        <span class="poundage-trigger-main">
          <strong class="${isExceeding ? "poundage-value-exceeded" : ""}">${escapeHtml(displayValue)}</strong>
          ${
            safeValue === ""
              ? `<small>Click to calculate</small>`
              : isExceeding
                ? `<small class="poundage-caption-exceeded">Remark: ${escapeHtml(exceedReason || "—")}</small>`
                : ""
          }
        </span>
      </button>
    `;
  }

  if(row.type === "gridlinePair"){
    const verticalValue =
      state.formData.gridlineCarparkVertical !== "" &&
      state.formData.gridlineCarparkVertical !== null &&
      state.formData.gridlineCarparkVertical !== undefined
        ? state.formData.gridlineCarparkVertical
        : (state.formData.gridlineCarpark ?? "");
    const horizontalValue =
      state.formData.gridlineCarparkHorizontal ?? "";

    return `
      <div class="gridline-dimension-box">
        <label class="gridline-dimension-item">
          <span>Vertical</span>
          <div class="gridline-dimension-input-wrap">
            <input
              class="text-input"
              type="number"
              step="0.01"
              data-field="gridlineCarparkVertical"
              value="${escapeHtml(verticalValue)}"
              placeholder="Enter vertical"
            />
            <small>m</small>
          </div>
        </label>

        <label class="gridline-dimension-item">
          <span>Horizontal</span>
          <div class="gridline-dimension-input-wrap">
            <input
              class="text-input"
              type="number"
              step="0.01"
              data-field="gridlineCarparkHorizontal"
              value="${escapeHtml(horizontalValue)}"
              placeholder="Enter horizontal"
            />
            <small>m</small>
          </div>
        </label>
      </div>
    `;
  }

  if(row.type === "select"){
    const configuredOptions =
      typeof getConsultantDropdownOptions === "function"
        ? getConsultantDropdownOptions(
            row.key,
            row.options || []
          )
        : (row.options || []);

    const options = configuredOptions.map(option => {
      const selected = option === safeValue ? "selected" : "";
      return `<option value="${escapeHtml(option)}" ${selected}>${escapeHtml(option)}</option>`;
    }).join("");

    return `<select data-field="${row.key}">${options}</select>`;
  }

  if(row.type === "textarea"){
    return `<textarea data-field="${row.key}" placeholder="${escapeHtml(row.placeholder || "")}">${escapeHtml(safeValue)}</textarea>`;
  }

  if(row.type === "file"){
    const files = normaliseDrawingFiles(
      state.formData[row.key]
    );

    return `
      <div class="drawing-folder-upload-row">
        <input
          type="file"
          data-file-field="${row.key}"
          accept="${escapeHtml(row.accept || "")}"
          multiple
        />

        ${renderDrawingFolder(row.key, files)}
      </div>
    `;
  }

  const stepAttr = row.step ? `step="${row.step}"` : "";
  const placeholderAttr = `placeholder="${escapeHtml(row.placeholder || "")}"`;

  return `
    <input
      class="text-input"
      type="${row.type || "text"}"
      data-field="${row.key}"
      value="${escapeHtml(safeValue)}"
      ${stepAttr}
      ${placeholderAttr}
    />
  `;
}

function normaliseDrawingFiles(value){
  if(Array.isArray(value)){
    return value.filter(file => file && file.name);
  }

  if(value && value.name){
    return [value];
  }

  return [];
}

function drawingFieldLabel(fieldKey){
  if(fieldKey === "drawingArchitectural"){
    return "Architectural Drawings";
  }

  if(fieldKey === "drawingStructural"){
    return "Structural Drawings";
  }

  return "Drawing Files";
}

function getProjectDrawingRevisionGroups(fieldKey){
  if(!state.selectedProject){
    return [];
  }

  const submissions = getSubmissions()
    .filter(item =>
      item.project === state.selectedProject &&
      item.region === state.selectedRegion &&
      item.businessUnit === state.selectedBusinessUnit &&
      (
        state.auth?.role !== "Consultant" ||
        typeof submissionBelongsToCurrentConsultant !== "function" ||
        submissionBelongsToCurrentConsultant(item)
      )
    );

  const revisionMap = new Map();

  submissions.forEach(item => {
    const files = normaliseDrawingFiles(
      item.formData?.[fieldKey]
    );

    if(files.length){
      revisionMap.set(
        item.revision || "Revision",
        files
      );
    }
  });

  // Include unsaved/current revision files too.
  const currentFiles = normaliseDrawingFiles(
    state.formData[fieldKey]
  );

  if(currentFiles.length){
    revisionMap.set(
      state.selectedRevision || "Current Revision",
      currentFiles
    );
  }

  const revisionOrder = value => {
    const match = String(value).match(/(\d+)/);
    return match ? Number(match[1]) : 9999;
  };

  return [...revisionMap.entries()]
    .map(([revision, files]) => ({
      revision,
      files
    }))
    .sort((a, b) =>
      revisionOrder(a.revision) -
      revisionOrder(b.revision)
    );
}

function getDrawingFolderTotalFiles(fieldKey){
  return getProjectDrawingRevisionGroups(fieldKey)
    .reduce(
      (total, group) =>
        total + group.files.length,
      0
    );
}

function renderDrawingFolder(fieldKey, currentFiles){
  const totalFiles =
    getDrawingFolderTotalFiles(fieldKey);

  const currentCount =
    normaliseDrawingFiles(currentFiles).length;

  return `
    <button
      type="button"
      class="drawing-folder-card"
      data-open-drawing-folder="${fieldKey}"
    >
      <span class="drawing-folder-icon">▰</span>

      <span class="drawing-folder-copy">
        <strong>${escapeHtml(drawingFieldLabel(fieldKey))}</strong>
        <small>
          ${
            totalFiles
              ? `${totalFiles} file${totalFiles === 1 ? "" : "s"} across revisions`
              : "No files uploaded yet"
          }
          ${
            currentCount
              ? ` · ${currentCount} in ${escapeHtml(state.selectedRevision)}`
              : ""
          }
        </small>
      </span>

      <span class="drawing-folder-open">
        Open
        <strong>→</strong>
      </span>
    </button>
  `;
}

function renderDrawingFolderModal(fieldKey){
  const groups =
    getProjectDrawingRevisionGroups(fieldKey);

  $("drawingFolderModalTitle").textContent =
    drawingFieldLabel(fieldKey);

  $("drawingFolderModalMeta").textContent =
    state.selectedProject
      ? `${state.selectedProject} · All revisions`
      : "All uploaded revisions";

  const body = $("drawingFolderModalBody");

  if(!groups.length){
    body.innerHTML = `
      <div class="drawing-folder-empty">
        <div class="drawing-folder-empty-icon">▰</div>
        <strong>No files yet</strong>
        <span>Upload files from the Submission table and they will appear here.</span>
      </div>
    `;
    return;
  }

  body.innerHTML = groups.map(group => `
    <section class="drawing-revision-group">
      <div class="drawing-revision-head">
        <strong>${escapeHtml(group.revision)}</strong>
        <span>
          ${group.files.length}
          file${group.files.length === 1 ? "" : "s"}
        </span>
      </div>

      <div class="drawing-folder-file-list">
        ${group.files.map((file, index) => `
          <div class="drawing-folder-file-row">
            <div class="drawing-folder-file-info">
              <span class="drawing-file-type">
                ${escapeHtml(
                  String(file.name || "")
                    .split(".")
                    .pop()
                    .toUpperCase()
                )}
              </span>

              <div>
                <strong>${escapeHtml(file.name)}</strong>
                <small>
                  ${file.size
                    ? `${Math.max(1, Math.round(file.size / 1024))} KB`
                    : "Uploaded file"}
                </small>
              </div>
            </div>

            <div class="drawing-folder-file-actions">
              ${
                file.blobId
                  ? `<button
                      type="button"
                      class="drawing-open-file-btn"
                      data-open-stored-file="${escapeHtml(file.blobId)}"
                    >Open</button>`
                  : file.dataUrl
                    ? `<a
                        class="drawing-open-file-btn"
                        href="${file.dataUrl}"
                        target="_blank"
                        rel="noopener"
                      >Open</a>`
                    : ""
              }

              ${
                group.revision === state.selectedRevision && canEditCurrentSubmissionV31()
                  ? `<button
                      type="button"
                      class="drawing-folder-remove-btn"
                      data-folder-remove-field="${fieldKey}"
                      data-folder-remove-index="${index}"
                    >Remove</button>`
                  : ""
              }
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `).join("");
}

function openDrawingFolderModal(fieldKey){
  if(!hasSelectedProject()){
    alert("Select a project first.");
    return;
  }

  $("drawingFolderModal").dataset.fieldKey =
    fieldKey;

  renderDrawingFolderModal(fieldKey);

  $("drawingFolderModal")
    .classList.remove("hidden");

  document.body.classList.add("modal-open");
}

function closeDrawingFolderModal(){
  $("drawingFolderModal")
    .classList.add("hidden");

  document.body.classList.remove("modal-open");
}

function renderOverviewTable(){
  deriveEfficiency();

  const tbody = $("overviewTableBody");
  let html = "";

  OVERVIEW_SECTIONS.forEach(section => {
    if(
      typeof isConsultantSectionVisible === "function" &&
      !isConsultantSectionVisible(section.title)
    ){
      return;
    }

    const isLoadingSection =
      section.title === "Pile Efficiency & Loading";

    const sectionDisplayLabel =
      typeof consultantSectionLabel === "function"
        ? consultantSectionLabel(section.title)
        : section.title;

    html += `
      <tr class="section-row">
        <td colspan="2">
          <div class="section-row-content">
            <span>${escapeHtml(sectionDisplayLabel)}</span>
            ${isLoadingSection ? `
              <button
                type="button"
                class="section-open-table-btn"
                data-open-loading-table="section"
              >
                Detailed Loading Table →
              </button>
            ` : ""}
          </div>
        </td>
      </tr>
    `;

    const consultantSettings =
      typeof getConsultantTableSettings === "function"
        ? getConsultantTableSettings()
        : {customRows:[]};

    const customRows =
      (consultantSettings.customRows || [])
        .filter(item =>
          item.section === section.title
        )
        .map(item => ({
          key:item.key,
          label:item.label,
          type:item.type || "text",
          placeholder:item.placeholder || "Enter value",
          custom:true
        }));

    const sectionRows = [
      ...section.rows,
      ...customRows
    ];

    sectionRows.forEach(row => {
      if(!shouldShowRow(row)) return;

      if(
        typeof isConsultantRowVisible === "function" &&
        !isConsultantRowVisible(
          section.title,
          row.key
        )
      ){
        return;
      }

      const value = state.formData[row.key] ?? "";

      const baseRowDisplayLabel =
        typeof consultantRowLabel === "function"
          ? consultantRowLabel(
              section.title,
              row.key,
              row.label
            )
          : row.label;

      const rowDisplayLabel =
        section.title === "Poundage"
          ? consultantPoundageRowLabel(
              row.key,
              baseRowDisplayLabel
            )
          : baseRowDisplayLabel;

      html += `
        <tr>
          <td>
            <div class="field-label">${escapeHtml(rowDisplayLabel)}</div>
          </td>
          <td>${inputMarkup(row, value)}</td>
        </tr>
      `;

      if(row.key === "buildingType"){
        html += landedTypeRowMarkup();
      }
    });
  });

  tbody.innerHTML = html;
  updateCurrentSelectionPill();
  updateSubmissionLockState();
}
