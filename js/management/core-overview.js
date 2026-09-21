
let managementComparisonSelections = Array.from(
  {length:5},
  () => ({
    projectKey:"",
    revision:""
  })
);

let managementPileCheckSubmissionId = null;
let managementPileProposalRows = [];

function configureRoleNavigation(role){
  const management = role === "Management";

  document
    .querySelectorAll(".consultant-nav-item")
    .forEach(item =>
      item.classList.toggle("hidden", management)
    );

  document
    .querySelectorAll(".management-nav-item")
    .forEach(item =>
      item.classList.toggle("hidden", !management)
    );
}

function showManagementView(viewName){
  ["overview", "history"].forEach(name => {
    const view = $(`${name}View`);
    if(view) view.classList.add("hidden");
  });

  if(viewName === "managementSettings"){
    if(typeof openManagementSubmissionSetupModalV121 === "function"){
      openManagementSubmissionSetupModalV121();
    }
    return;
  }

  const views = {
    managementOverview: "managementOverviewView",
    managementComparison: "managementComparisonView",
    managementPileReference: "managementPileReferenceView"
  };

  document
    .querySelectorAll(".management-view")
    .forEach(view =>
      view.classList.add("hidden")
    );

  const target = $(views[viewName] || views.managementOverview);
  target?.classList.remove("hidden");

  document
    .querySelectorAll(".side-nav-btn")
    .forEach(btn =>
      btn.classList.toggle(
        "active",
        btn.dataset.view === viewName
      )
    );

  if(viewName === "managementOverview"){
    renderManagementOverview();
  }

  if(viewName === "managementComparison"){
    renderManagementComparisonFilters();
    renderManagementComparisonSlots();
    renderManagementComparison();
  }

  if(viewName === "managementPileReference"){
    renderManagementPileReference();
  }
}

/* ------------------------------------------------------------
   Consultant table settings
   ------------------------------------------------------------ */

function consultantSettingsKey(sectionTitle, rowKey){
  return `${sectionTitle}::${rowKey}`;
}

function defaultConsultantTableSettings(){
  const sections = {};
  const rows = {};

  OVERVIEW_SECTIONS.forEach(section => {
    sections[section.title] = {
      visible:true,
      label:section.title
    };

    section.rows.forEach(row => {
      rows[
        consultantSettingsKey(
          section.title,
          row.key
        )
      ] = {
        visible:true,
        label:row.label
      };
    });
  });

  rows[
    consultantSettingsKey(
      "Project Information",
      "landedType"
    )
  ] = {
    visible:true,
    label:"Landed Type"
  };

  return {sections, rows, customRows:[]};
}

function getConsultantTableSettings(){
  const defaults =
    defaultConsultantTableSettings();

  const stored = loadStorage(
    ECO_FRESH_STORAGE.tableSettings,
    null
  );

  if(!stored){
    return defaults;
  }

  const merged = {
    sections:{
      ...defaults.sections,
      ...(stored.sections || {})
    },
    rows:{
      ...defaults.rows,
      ...(stored.rows || {})
    },
    customRows:Array.isArray(stored.customRows)
      ? stored.customRows.filter(row =>
          row && row.section && row.key && row.label
        )
      : []
  };

  merged.customRows.forEach(row => {
    const key = consultantSettingsKey(
      row.section,
      row.key
    );

    if(!merged.rows[key]){
      merged.rows[key] = {
        visible:true,
        label:row.label
      };
    }
  });

  return merged;
}

function isConsultantSectionVisible(sectionTitle){
  const settings =
    getConsultantTableSettings();

  return settings.sections?.[sectionTitle]?.visible !== false;
}

function consultantSectionLabel(sectionTitle){
  const settings =
    getConsultantTableSettings();

  return (
    settings.sections?.[sectionTitle]?.label ||
    sectionTitle
  );
}

function isConsultantRowVisible(sectionTitle, rowKey){
  const settings =
    getConsultantTableSettings();

  return (
    settings.rows?.[
      consultantSettingsKey(
        sectionTitle,
        rowKey
      )
    ]?.visible !== false
  );
}

function consultantRowLabel(sectionTitle, rowKey, fallback){
  const settings =
    getConsultantTableSettings();

  return (
    settings.rows?.[
      consultantSettingsKey(
        sectionTitle,
        rowKey
      )
    ]?.label ||
    fallback
  );
}

function managementSettingsRowsForSection(section){
  const rows = [...section.rows];

  if(section.title === "Project Information"){
    const buildingIndex =
      rows.findIndex(row =>
        row.key === "buildingType"
      );

    rows.splice(
      buildingIndex + 1,
      0,
      {
        key:"landedType",
        label:"Landed Type",
        type:"select",
        custom:false
      }
    );
  }

  const settings =
    getConsultantTableSettings();

  const customRows =
    (settings.customRows || [])
      .filter(row =>
        row.section === section.title
      )
      .map(row => ({
        key:row.key,
        label:row.label,
        type:row.type || "text",
        placeholder:row.placeholder || "Enter value",
        custom:true
      }));

  return [...rows, ...customRows];
}

function renderManagementSettings(){
  const container =
    $("managementSettingsList");

  const settings =
    getConsultantTableSettings();

  container.innerHTML =
    OVERVIEW_SECTIONS.map(section => {
      const sectionConfig =
        settings.sections[section.title];

      const rows =
        managementSettingsRowsForSection(section);

      return `
        <section
          class="management-setting-section"
          data-settings-section="${escapeHtml(section.title)}"
        >
          <div class="management-setting-section-head">
            <label class="management-setting-toggle">
              <input
                type="checkbox"
                data-setting-section-visible="${escapeHtml(section.title)}"
                ${sectionConfig.visible !== false ? "checked" : ""}
              />
              <span>Show Section</span>
            </label>

            <input
              class="management-setting-section-title"
              type="text"
              value="${escapeHtml(sectionConfig.label || section.title)}"
              data-setting-section-label="${escapeHtml(section.title)}"
            />
          </div>

          <div class="management-setting-row-list">
            ${rows.map(row => {
              const key =
                consultantSettingsKey(
                  section.title,
                  row.key
                );

              const config =
                settings.rows[key] || {
                  visible:true,
                  label:row.label
                };

              return `
                <div class="management-setting-row">
                  <label class="management-setting-toggle">
                    <input
                      type="checkbox"
                      data-setting-row-visible="${escapeHtml(key)}"
                      ${config.visible !== false ? "checked" : ""}
                    />
                    <span>Show</span>
                  </label>

                  <div>
                    <small>${escapeHtml(row.key)}</small>
                    <input
                      type="text"
                      value="${escapeHtml(config.label || row.label)}"
                      data-setting-row-label="${escapeHtml(key)}"
                    />
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </section>
      `;
    }).join("");
}

function collectManagementSettings(){
  const settings =
    getConsultantTableSettings();

  document
    .querySelectorAll(
      "[data-setting-section-visible]"
    )
    .forEach(input => {
      const section =
        input.dataset.settingSectionVisible;

      settings.sections[section].visible =
        input.checked;
    });

  document
    .querySelectorAll(
      "[data-setting-section-label]"
    )
    .forEach(input => {
      const section =
        input.dataset.settingSectionLabel;

      settings.sections[section].label =
        input.value.trim() || section;
    });

  document
    .querySelectorAll(
      "[data-setting-row-visible]"
    )
    .forEach(input => {
      const key =
        input.dataset.settingRowVisible;

      settings.rows[key].visible =
        input.checked;
    });

  document
    .querySelectorAll(
      "[data-setting-row-label]"
    )
    .forEach(input => {
      const key =
        input.dataset.settingRowLabel;

      settings.rows[key].label =
        input.value.trim() ||
        settings.rows[key].label;
    });

  return settings;
}

/* ------------------------------------------------------------
   Management Overview
   ------------------------------------------------------------ */

function managementSubmissionUpdated(item){
  if(!item?.updatedAt) return "—";

  return new Date(item.updatedAt)
    .toLocaleString();
}

function managementSubmissionSearchItems(){
  const query =
    $("managementSubmissionSearch")
      ?.value
      .trim()
      .toLowerCase() || "";

  const region =
    $("managementRegionFilter")
      ?.value || "";

  const buildingType =
    $("managementBuildingFilter")
      ?.value || "";

  return getSubmissions()
    .filter(item => {
      const data = item.formData || {};

      if(
        region &&
        item.region !== region
      ){
        return false;
      }

      if(
        buildingType &&
        data.buildingType !== buildingType
      ){
        return false;
      }

      if(query){
        const haystack = [
          item.project,
          item.region,
          item.businessUnit,
          item.revision,
          data.consultantName,
          data.buildingType
        ]
          .join(" ")
          .toLowerCase();

        if(!haystack.includes(query)){
          return false;
        }
      }

      return true;
    })
    .sort(
      (a,b) =>
        new Date(b.updatedAt || 0) -
        new Date(a.updatedAt || 0)
    );
}

function renderManagementOverviewStats(){
  const submissions =
    getSubmissions();

  const projects =
    new Set(
      submissions.map(item =>
        managementProjectKey(item)
      )
    );

  const latest =
    submissions
      .slice()
      .sort(
        (a,b) =>
          new Date(b.updatedAt || 0) -
          new Date(a.updatedAt || 0)
      )[0];

  $("managementStatSubmissions").textContent =
    submissions.length;

  if($("managementStatProjects")){
    $("managementStatProjects").textContent = projects.size;
  }

  $("managementStatLatest").textContent =
    latest
      ? latest.project
      : "—";

  if($("managementOverviewCount")){
    $("managementOverviewCount").textContent =
      `${submissions.length} submission${
        submissions.length === 1 ? "" : "s"
      }`;
  }
}

function populateManagementRegionFilter(){
  const select =
    $("managementRegionFilter");

  if(!select) return;

  const current = select.value;

  select.innerHTML =
    `<option value="">All Regions</option>` +
    Object.keys(REGION_BUSINESS_UNITS)
      .map(region =>
        `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`
      )
      .join("");

  if(
    [...select.options]
      .some(option =>
        option.value === current
      )
  ){
    select.value = current;
  }
}

function renderManagementOverview(){
  populateManagementRegionFilter();
  renderManagementOverviewStats();

  const container =
    $("managementSubmissionList");

  const items =
    managementSubmissionSearchItems();

  if(!items.length){
    container.innerHTML = `
      <div class="empty-state compact-card">
        <div>
          <div class="empty-icon">▣</div>
          <strong>No matching submissions</strong>
          <span>Consultant submissions will appear here.</span>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML =
    items.map(item => {
      const data = item.formData || {};

      return `
        <article class="management-submission-card">
          <div class="management-submission-main">
            <div class="management-submission-title-row">
              <div>
                <h3>${escapeHtml(item.project || "Project")}</h3>
                <div class="history-meta">
                  <span class="meta-chip">${escapeHtml(item.region || "—")}</span>
                  <span class="meta-chip">${escapeHtml(item.businessUnit || "—")}</span>
                  <span class="meta-chip">${escapeHtml(item.revision || "—")}</span>
                </div>
              </div>

              <span class="management-submission-date">
                ${escapeHtml(managementSubmissionUpdated(item))}
              </span>
            </div>

            <div class="management-submission-info-grid">
              <div>
                <span>Consultant</span>
                <strong>${escapeHtml(data.consultantName || "—")}</strong>
              </div>
              <div>
                <span>Building Type</span>
                <strong>${escapeHtml(data.buildingType || "—")}</strong>
              </div>
              <div>
                <span>Overall Pile Efficiency</span>
                <strong>${
                  data.overallEfficiency
                    ? `${escapeHtml(data.overallEfficiency)}%`
                    : "—"
                }</strong>
              </div>
              <div>
                <span>Total Piles</span>
                <strong>${escapeHtml(managementSubmissionTotalPiles(data))}</strong>
              </div>
            </div>
          </div>

          <div class="management-submission-actions">
            <button
              class="ghost-btn compact-btn"
              type="button"
              data-management-view-submission="${escapeHtml(item.id)}"
            >View Submission</button>

            <button
              class="primary-btn compact-btn"
              type="button"
              data-management-pile-check="${escapeHtml(item.id)}"
            >Internal Pile Check</button>
          </div>
        </article>
      `;
    }).join("");
}

function managementSubmissionLoadingSummary(data){
  const rows = Array.isArray(data?.loadingCapacityRows)
    ? data.loadingCapacityRows
    : [];

  let totalPiles = 0;
  let totalCapacity = 0;
  let totalLoading = 0;
  let hasPiles = false;
  let hasCapacity = false;
  let hasLoading = false;

  rows.forEach(row => {
    const pileCount = Number(row?.numberOfPiles);
    const columnLoading = Number(row?.columnLoading);

    if(
      row?.numberOfPiles !== "" &&
      row?.numberOfPiles !== null &&
      row?.numberOfPiles !== undefined &&
      Number.isFinite(pileCount)
    ){
      totalPiles += pileCount;
      hasPiles = true;
    }

    const reference = MANAGEMENT_PILE_CAPACITY_REFERENCE.find(item =>
      item.pileType === row?.pileType &&
      String(item.pileSize) === String(row?.pileSize)
    );

    if(reference && Number.isFinite(pileCount)){
      const capacityPerPile = Number(reference.pileCapacity);
      if(Number.isFinite(capacityPerPile)){
        totalCapacity += pileCount * capacityPerPile;
        hasCapacity = true;
      }
    }

    if(
      row?.columnLoading !== "" &&
      row?.columnLoading !== null &&
      row?.columnLoading !== undefined &&
      Number.isFinite(columnLoading)
    ){
      totalLoading += columnLoading;
      hasLoading = true;
    }
  });

  const overallEfficiency =
    hasCapacity && hasLoading && totalCapacity > 0
      ? (totalLoading / totalCapacity) * 100
      : null;

  return {
    totalPiles: hasPiles ? totalPiles : null,
    totalCapacity: hasCapacity ? totalCapacity : null,
    totalLoading: hasLoading ? totalLoading : null,
    overallEfficiency
  };
}

function managementSubmissionTotalPiles(data){
  const derived = managementSubmissionLoadingSummary(data).totalPiles;

  if(derived !== null){
    return String(Number(derived.toFixed(0)));
  }

  return data?.numberOfPiles || "—";
}

function managementSubmissionValueDisplay(row, data){
  const value = data?.[row.key];

  if(row.type === "gridlinePair"){
    const vertical =
      data?.gridlineCarparkVertical !== "" &&
      data?.gridlineCarparkVertical !== null &&
      data?.gridlineCarparkVertical !== undefined
        ? data.gridlineCarparkVertical
        : (data?.gridlineCarpark ?? "");
    const horizontal =
      data?.gridlineCarparkHorizontal ?? "";

    const verticalDisplay =
      vertical === "" || vertical === null || vertical === undefined
        ? "—"
        : `${vertical} m`;
    const horizontalDisplay =
      horizontal === "" || horizontal === null || horizontal === undefined
        ? "—"
        : `${horizontal} m`;

    return `Vertical: ${verticalDisplay} · Horizontal: ${horizontalDisplay}`;
  }

  if(row.type === "file"){
    const files = normaliseDrawingFiles(value);

    return files.length
      ? `${files.length} file${files.length === 1 ? "" : "s"}`
      : "—";
  }

  if(row.type === "loadingSummary"){
    const derived = managementSubmissionLoadingSummary(data);

    if(row.key === "totalColumnLoading" && derived.totalLoading !== null){
      return String(Number(derived.totalLoading.toFixed(2)));
    }

    if(row.key === "totalPilesCapacity" && derived.totalCapacity !== null){
      return String(Number(derived.totalCapacity.toFixed(2)));
    }

    if(row.key === "overallEfficiency" && derived.overallEfficiency !== null){
      return `${Number(derived.overallEfficiency.toFixed(1))}%`;
    }
  }

  if(row.key === "overallEfficiency"){
    return value
      ? `${value}%`
      : "—";
  }

  if(
    value === undefined ||
    value === null ||
    value === ""
  ){
    return "—";
  }

  return String(value);
}

function managementFormatFileSize(bytes){
  const size = Number(bytes) || 0;
  if(size < 1024) return `${size} B`;
  if(size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function managementDrawingFieldLabel(fieldKey, fallback = "Drawing Files"){
  if(fieldKey === "drawingArchitectural") return "Architectural Drawings";
  if(fieldKey === "drawingStructural") return "Structural Drawings";
  return fallback || "Drawing Files";
}

function managementSubmissionFileMarkup(submissionId, row, data){
  const files = normaliseDrawingFiles(data?.[row.key]);

  if(!files.length){
    return `<div class="management-readonly-value">—</div>`;
  }

  return `
    <button
      type="button"
      class="drawing-folder-card management-drawing-folder-card"
      data-management-open-file-folder="${escapeHtml(submissionId)}"
      data-management-file-folder-field="${escapeHtml(row.key)}"
      data-management-file-folder-label="${escapeHtml(row.label || "Drawing Files")}" 
    >
      <span class="drawing-folder-icon">▰</span>

      <span class="drawing-folder-copy">
        <strong>${escapeHtml(managementDrawingFieldLabel(row.key, row.label))}</strong>
        <small>
          ${files.length} file${files.length === 1 ? "" : "s"} uploaded
        </small>
      </span>

      <span class="drawing-folder-open">
        Open
        <strong>→</strong>
      </span>
    </button>
  `;
}

function renderManagementDrawingFolderModal(submissionId, fieldKey, fallbackLabel){
  const submission = getSubmissions().find(item => item.id === submissionId);
  if(!submission) return false;

  const files = normaliseDrawingFiles(submission.formData?.[fieldKey]);
  const title = managementDrawingFieldLabel(fieldKey, fallbackLabel);
  const revision = submission.revision || "Revision";

  $("managementDrawingFolderModalTitle").textContent = title;
  $("managementDrawingFolderModalMeta").textContent = [
    submission.project,
    revision
  ].filter(Boolean).join(" · ") || "Uploaded files";

  const body = $("managementDrawingFolderModalBody");

  if(!files.length){
    body.innerHTML = `
      <div class="drawing-folder-empty">
        <div class="drawing-folder-empty-icon">▰</div>
        <strong>No files uploaded</strong>
        <span>No uploaded files are attached to this submission.</span>
      </div>
    `;
    return true;
  }

  body.innerHTML = `
    <section class="drawing-revision-group">
      <div class="drawing-revision-head">
        <strong>${escapeHtml(revision)}</strong>
        <span>${files.length} file${files.length === 1 ? "" : "s"}</span>
      </div>

      <div class="drawing-folder-file-list">
        ${files.map((file, index) => `
          <div class="drawing-folder-file-row">
            <div class="drawing-folder-file-info">
              <span class="drawing-file-type">
                ${escapeHtml(
                  String(file.name || "FILE")
                    .split(".")
                    .pop()
                    .toUpperCase()
                )}
              </span>

              <div>
                <strong>${escapeHtml(file.name || `File ${index + 1}`)}</strong>
                <small>${escapeHtml(managementFormatFileSize(file.size || 0))}</small>
              </div>
            </div>

            <div class="drawing-folder-file-actions">
              <button
                type="button"
                class="drawing-open-file-btn"
                data-management-open-submission-file="${escapeHtml(submissionId)}"
                data-management-open-file-field="${escapeHtml(fieldKey)}"
                data-management-open-file-index="${index}"
              >Open</button>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;

  return true;
}

function openManagementDrawingFolderModal(submissionId, fieldKey, fallbackLabel){
  if(!renderManagementDrawingFolderModal(submissionId, fieldKey, fallbackLabel)){
    return;
  }

  const modal = $("managementDrawingFolderModal");
  modal.dataset.submissionId = submissionId;
  modal.dataset.fieldKey = fieldKey;
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeManagementDrawingFolderModal(){
  $("managementDrawingFolderModal")?.classList.add("hidden");

  if($("managementSubmissionModal")?.classList.contains("hidden")){
    document.body.classList.remove("modal-open");
  }
}

async function openManagementSubmissionFile(submissionId, fieldKey, fileIndex){
  const submission = getSubmissions().find(item => item.id === submissionId);
  if(!submission) return;

  const files = normaliseDrawingFiles(submission.formData?.[fieldKey]);
  const file = files[Number(fileIndex)];

  if(!file){
    alert("This uploaded file could not be found in the submission.");
    return;
  }

  if(typeof openEcoStoredFile === "function"){
    await openEcoStoredFile(file);
    return;
  }

  if(file.dataUrl){
    window.open(file.dataUrl, "_blank", "noopener");
    return;
  }

  alert("File storage is not available on this page.");
}

function managementPoundageRowLabel(rowKey, fallback, buildingType){
  const isLanded =
    String(buildingType || "")
      .trim()
      .toLowerCase() === "landed";

  if(!isLanded){
    return fallback;
  }

  if(rowKey === "poundageRcColumn") return "RC Column (kg/m³)";
  if(rowKey === "poundageRcBeamCarpark") return "RC Beam (kg/m³)";
  if(rowKey === "poundageRcSlab") return "RC Slab (kg/m³)";
  if(rowKey === "poundageOverall") return "Overall Poundage (kg/m³)";
  if(rowKey === "poundageSteelContent") return "Total Steel Content per Unit (Landed), kg";

  return fallback;
}

function managementSubmissionProposedGuide(sectionTitle, rowKey, buildingType){
  if(sectionTitle !== "Poundage"){
    return "";
  }

  const type =
    String(buildingType || "")
      .trim()
      .toLowerCase();

  const highRiseGuides = {
    poundageRcColumn:"200 – 250",
    poundageRcBeamCarpark:"200 – 225",
    poundageRcBeamTypical:"25 – 140",
    poundageRcSlab:"50 – 60 (BRC)\n70 – 90 (rebar)",
    poundageShearWall:"100 – 105",
    poundageOverall:""
  };

  const landedGuides = {
    poundageRcColumn:"150 – 215",
    poundageRcBeamCarpark:"115 – 150",
    poundageRcBeamTypical:"",
    poundageRcSlab:"60 – 60 (BRC)\n70 – 90 (rebar)",
    poundageShearWall:"",
    poundageOverall:"90 – 100",
    poundageSteelContent:""
  };

  const guides =
    type === "landed"
      ? landedGuides
      : highRiseGuides;

  return guides[rowKey] || "";
}

function openManagementSubmissionModal(submissionId){
  const item =
    getSubmissions()
      .find(sub =>
        sub.id === submissionId
      );

  if(!item) return;

  const data =
    item.formData || {};

  $("managementSubmissionModalTitle").textContent =
    item.project || "Submission";

  $("managementSubmissionModalMeta").textContent =
    `${item.region || "—"} · ${item.businessUnit || "—"} · ${item.revision || "—"} · ${typeof submissionYearLabel === "function" ? submissionYearLabel(item) : (item.year || "—")}`;

  let bodyHtml = `
    <div class="management-readonly-submission-wrap">
      <table class="overview-table management-readonly-submission-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>${escapeHtml(item.revision || "Value")}</th>
          </tr>
        </thead>
        <tbody>
  `;

  OVERVIEW_SECTIONS.forEach(section => {
    bodyHtml += `
      <tr class="section-row">
        <td colspan="2">
          <div class="section-row-content">
            <span>${escapeHtml(section.title)}</span>
          </div>
        </td>
      </tr>
    `;

    const rows =
      managementSettingsRowsForSection(section);

    if(section.title === "Poundage"){
      bodyHtml += `
        <tr class="management-poundage-guide-header">
          <td>
            <span class="management-poundage-type-badge">
              ${escapeHtml(data.buildingType || "Building Type")}
            </span>
          </td>
          <td>
            <div class="management-poundage-value-guide-head">
              <span>Submitted Value</span>
              <span>Proposed Guide</span>
            </div>
          </td>
        </tr>
      `;
    }

    rows.forEach(row => {
      if(
        row.key === "landedType" &&
        data.buildingType !== "Landed"
      ){
        return;
      }

      if(
        row.showWhen &&
        !row.showWhen(data)
      ){
        return;
      }

      const valueDisplay =
        managementSubmissionValueDisplay(
          row,
          data
        );

      if(row.type === "file"){
        bodyHtml += `
          <tr>
            <td>
              <div class="field-label">
                ${escapeHtml(row.label)}
              </div>
            </td>
            <td>
              ${managementSubmissionFileMarkup(item.id, row, data)}
            </td>
          </tr>
        `;
        return;
      }

      if(section.title === "Poundage"){
        const proposedGuide =
          managementSubmissionProposedGuide(
            section.title,
            row.key,
            data.buildingType
          );

        const poundageDetail =
          data.poundageDetails &&
          typeof data.poundageDetails === "object"
            ? data.poundageDetails[row.key] || {}
            : {};

        const exceedReason = String(poundageDetail.exceedReason || "").trim();
        const isExceeded = !!(poundageDetail.exceeded && exceedReason);

        bodyHtml += `
          <tr>
            <td>
              <div class="field-label">
                ${escapeHtml(
                  managementPoundageRowLabel(
                    row.key,
                    row.label,
                    data.buildingType
                  )
                )}
              </div>
            </td>

            <td>
              <div class="management-poundage-value-guide">
                <div class="management-readonly-value ${isExceeded ? "management-poundage-exceeded" : ""}">
                  ${escapeHtml(valueDisplay)}
                </div>

                ${
                  proposedGuide
                    ? `
                      <div class="management-guide-pill">
                        ${escapeHtml(proposedGuide)}
                      </div>
                    `
                    : `
                      <div class="management-guide-empty">
                        —
                      </div>
                    `
                }
              </div>
              ${
                (poundageDetail.steelWeight !== undefined && poundageDetail.steelWeight !== "") ||
                (poundageDetail.concreteVolume !== undefined && poundageDetail.concreteVolume !== "")
                  ? `
                    <div class="management-poundage-source-details-v131">
                      <div><span>Steel Weight</span><strong>${escapeHtml(poundageDetail.steelWeight || "—")} kg</strong></div>
                      <div><span>Concrete Volume</span><strong>${escapeHtml(poundageDetail.concreteVolume || "—")} m³</strong></div>
                    </div>
                  `
                  : ""
              }
              ${
                exceedReason
                  ? `
                    <div class="management-poundage-exceed-reason">
                      <strong>Remark:</strong>
                      <span>${escapeHtml(exceedReason)}</span>
                    </div>
                  `
                  : ""
              }
            </td>
          </tr>
        `;
        return;
      }

      bodyHtml += `
        <tr>
          <td>
            <div class="field-label">
              ${escapeHtml(row.label)}
            </div>
          </td>

          <td>
            <div class="management-readonly-value">
              ${escapeHtml(valueDisplay)}
            </div>
          </td>
        </tr>
      `;
    });
  });

  bodyHtml += `
        </tbody>
      </table>
    </div>
  `;

  $("managementSubmissionModalBody").innerHTML =
    bodyHtml;

  $("managementSubmissionModal")
    .classList.remove("hidden");

  document.body
    .classList.add("modal-open");
}

function closeManagementSubmissionModal(){
  $("managementSubmissionModal")
    .classList.add("hidden");

  $("managementDrawingFolderModal")
    ?.classList.add("hidden");

  document.body
    .classList.remove("modal-open");
}
