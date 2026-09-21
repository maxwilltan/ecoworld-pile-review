/* ============================================================
   V22 MANAGEMENT SETTINGS
   - Mirrors Consultant Submission layout 1:1
   - Project hierarchy editing is integrated into the top selectors
   - Consultant dropdown options are edited inline beside each dropdown
   - Section/row title editing removed
   ============================================================ */

let managementSettingsPreviewDataV22 = {
  projectName:"",
  consultantName:"",
  buildingType:"High Rise",
  landedType:"",
  highRiseType:"Residential – Duduk",
  highRiseCategory:"Long Block",
  transferFloor:"Separate Carpark Block (No Transfer Floor)",
  storeyCount:"",
  unitCount:"",
  gridlineCarpark:"",
  gridlineCarparkVertical:"",
  gridlineCarparkHorizontal:"",
  resiTowerBuildingEfficiency:"",
  carparkFloorEfficiency:"",
  overallBuildingEfficiency:"",
  pileType:"Bored Piles",
  pileSize:"",
  numberOfPiles:"",
  pilingCost:"",
  totalArea:"",
  totalColumnLoading:"",
  totalPilesCapacity:"",
  overallEfficiency:"",
  poundageRcColumn:"",
  poundageRcBeamCarpark:"",
  poundageRcBeamTypical:"",
  poundageRcSlab:"",
  poundageShearWall:"",
  poundageOverall:"",
  poundageSteelContent:"",
  drawingArchitectural:[],
  drawingStructural:[]
};

let managementSettingsRevisionV22 = "Rev 0";
let managementSettingsYearV87 = "";
let managementSettingsOpenDropdownV22 = "";

/* Title editing is intentionally disabled in v22. */
function isConsultantSectionVisible(){
  return true;
}

function consultantSectionLabel(sectionTitle){
  return sectionTitle;
}

function isConsultantRowVisible(){
  return true;
}

function consultantRowLabel(sectionTitle,rowKey,fallback){
  return fallback;
}

function managementSettingsDropdownIsEditableV22(key){
  return [
    "buildingType",
    "landedType",
    "highRiseType",
    "highRiseCategory",
    "transferFloor",
    "revision"
  ].includes(key);
}

function managementSettingsDropdownFallbackV22(key,row=null){
  if(key === "landedType"){
    return [
      "Terrace 22x70",
      "Terrace 20x70",
      "Semi-D",
      "Bungalow",
      "Cluster / Link"
    ];
  }

  if(key === "revision"){
    return ["Rev 0","Rev 1","Rev 2","Rev 3"];
  }

  return row?.options || [];
}

function managementSettingsDropdownOptionsV22(key,row=null){
  if(key === "pileType"){
    return getConsultantDropdownOptions(
      "pileType",
      row?.options || ["Bored Piles","Spun Piles","RC Piles"]
    );
  }

  if(managementSettingsDropdownIsEditableV22(key)){
    return getConsultantDropdownOptions(
      key,
      managementSettingsDropdownFallbackV22(key,row)
    );
  }

  return row?.options || [];
}

function managementSettingsOptionEditorMarkupV22(key,row=null){
  if(
    managementSettingsOpenDropdownV22 !== key ||
    !managementSettingsDropdownIsEditableV22(key)
  ){
    return "";
  }

  const options = managementSettingsDropdownOptionsV22(key,row);

  return `
    <div class="management-inline-dropdown-editor" data-management-dropdown-editor="${escapeHtml(key)}">
      <div class="management-inline-dropdown-editor-head">
        <strong>Edit Dropdown</strong>
        <button
          type="button"
          class="management-inline-editor-close"
          data-close-management-dropdown="${escapeHtml(key)}"
          aria-label="Close dropdown editor"
          title="Close"
        >×</button>
      </div>

      <div class="management-inline-dropdown-option-list">
        ${options.map((option,index) => `
          <div class="management-inline-dropdown-option-row">
            <input
              type="text"
              value="${escapeHtml(option)}"
              data-management-dropdown-option-key="${escapeHtml(key)}"
              data-management-dropdown-option-index="${index}"
              aria-label="Dropdown option ${index + 1}"
            />
            <button
              type="button"
              class="management-inline-option-remove"
              data-remove-management-dropdown-option="${escapeHtml(key)}"
              data-remove-management-dropdown-index="${index}"
              title="Remove option"
              aria-label="Remove option"
            >×</button>
          </div>
        `).join("")}
      </div>

      <button
        type="button"
        class="management-inline-add-option-btn"
        data-add-management-dropdown-option="${escapeHtml(key)}"
      >
        <span>＋</span>
        Add Option
      </button>
    </div>
  `;
}

function managementSettingsPreviewShouldShowRowV22(row){
  if(row.key === "landedType"){
    return String(
      managementSettingsPreviewDataV22.buildingType || ""
    ).toLowerCase() === "landed";
  }

  if(typeof row.showWhen !== "function"){
    return true;
  }

  try{
    return !!row.showWhen(
      managementSettingsPreviewDataV22
    );
  }catch(error){
    return true;
  }
}

function managementSettingsPoundageLabelV22(rowKey,fallback){
  const isLanded =
    String(
      managementSettingsPreviewDataV22.buildingType || ""
    ).trim().toLowerCase() === "landed";

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

function managementSettingsInputMarkupV22(section,row){
  const key = row.key;
  const value =
    key === "projectName"
      ? (managementSettingsSelectedProject || "")
      : (managementSettingsPreviewDataV22[key] ?? "");

  if(row.type === "gridlinePair"){
    const verticalValue =
      managementSettingsPreviewDataV22.gridlineCarparkVertical !== "" &&
      managementSettingsPreviewDataV22.gridlineCarparkVertical !== null &&
      managementSettingsPreviewDataV22.gridlineCarparkVertical !== undefined
        ? managementSettingsPreviewDataV22.gridlineCarparkVertical
        : (managementSettingsPreviewDataV22.gridlineCarpark ?? "");
    const horizontalValue =
      managementSettingsPreviewDataV22.gridlineCarparkHorizontal ?? "";

    return `
      <div class="gridline-dimension-box management-gridline-preview">
        <label class="gridline-dimension-item">
          <span>Vertical</span>
          <div class="gridline-dimension-input-wrap">
            <input
              class="text-input"
              type="number"
              step="0.01"
              value="${escapeHtml(verticalValue)}"
              placeholder="Enter vertical"
              readonly
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
              value="${escapeHtml(horizontalValue)}"
              placeholder="Enter horizontal"
              readonly
            />
            <small>m</small>
          </div>
        </label>
      </div>
    `;
  }

  if(row.type === "select"){
    const options =
      managementSettingsDropdownOptionsV22(key,row);

    if(
      options.length &&
      !options.includes(value)
    ){
      managementSettingsPreviewDataV22[key] = options[0];
    }

    const current =
      managementSettingsPreviewDataV22[key] ?? options[0] ?? "";

    const editButton =
      managementSettingsDropdownIsEditableV22(key)
        ? `
          <button
            type="button"
            class="management-inline-icon-btn management-dropdown-edit-btn"
            data-edit-management-dropdown="${escapeHtml(key)}"
            title="Edit ${escapeHtml(row.label)} dropdown"
            aria-label="Edit ${escapeHtml(row.label)} dropdown"
          >✎</button>
        `
        : "";

    return `
      <div class="management-settings-table-control">
        <div class="management-settings-select-edit-row table-inline-select-row">
          <select
            data-management-preview-field="${escapeHtml(key)}"
          >
            ${options.map(option => `
              <option
                value="${escapeHtml(option)}"
                ${String(option) === String(current) ? "selected" : ""}
              >${escapeHtml(option)}</option>
            `).join("")}
          </select>
          ${editButton}
        </div>
        ${managementSettingsOptionEditorMarkupV22(key,row)}
      </div>
    `;
  }

  if(row.type === "loadingSummary"){
    return `
      <div class="loading-summary-trigger loading-summary-static management-settings-preview-disabled">
        <span class="loading-summary-main">
          <span class="loading-summary-value">—</span>
          <span class="loading-summary-caption">Calculated from detailed table</span>
        </span>
      </div>
    `;
  }

  if(row.type === "file"){
    return `
      <div class="drawing-folder-upload-row management-settings-preview-file">
        <input type="file" disabled />
      </div>
    `;
  }

  const step = row.step ? `step="${escapeHtml(row.step)}"` : "";
  const type = row.type || "text";

  return `
    <div class="management-settings-table-control">
      <input
        class="text-input"
        type="${escapeHtml(type)}"
        value="${escapeHtml(value)}"
        ${step}
        placeholder="${escapeHtml(row.placeholder || "")}"
        readonly
      />
      ${row.custom ? `
        <button
          type="button"
          class="management-inline-icon-btn danger management-custom-row-delete"
          data-remove-consultant-setting-row="${escapeHtml(row.key)}"
          data-remove-consultant-setting-section="${escapeHtml(section.title)}"
          title="Remove custom row"
          aria-label="Remove custom row"
        >×</button>
      ` : ""}
    </div>
  `;
}

function renderManagementConsultantTableSettingsV21(){
  const body =
    $("managementConsultantTableSettingsBody");

  if(!body) return;

  let html = "";

  OVERVIEW_SECTIONS.forEach(section => {
    html += `
      <tr class="section-row management-settings-section-row">
        <td colspan="2">
          <div class="section-row-content management-settings-section-content-v22">
            <span>${escapeHtml(section.title)}</span>
            <button
              type="button"
              class="management-section-add-row-icon"
              data-add-consultant-setting-row="${escapeHtml(section.title)}"
              title="Add row to ${escapeHtml(section.title)}"
              aria-label="Add row to ${escapeHtml(section.title)}"
            >＋</button>
          </div>
        </td>
      </tr>
    `;

    managementSettingsRowsForSection(section)
      .forEach(row => {
        if(!managementSettingsPreviewShouldShowRowV22(row)){
          return;
        }

        const rowLabel =
          section.title === "Poundage"
            ? managementSettingsPoundageLabelV22(
                row.key,
                row.label
              )
            : row.label;

        html += `
          <tr class="management-settings-preview-row ${row.custom ? "is-custom-row" : ""}">
            <td>
              <div class="field-label">${escapeHtml(rowLabel)}</div>
            </td>
            <td>
              ${managementSettingsInputMarkupV22(section,row)}
            </td>
          </tr>
        `;
      });
  });

  body.innerHTML = html;

  const heading =
    $("managementSettingsValueHeading");

  if(heading){
    heading.textContent =
      managementSettingsRevisionV22 ||
      "Current Revision";
  }
}

function renderManagementSettingsRevisionV22(){
  const select =
    $("managementSettingsRevisionSelect");

  if(!select) return;

  const options =
    managementSettingsDropdownOptionsV22(
      "revision"
    );

  if(
    !options.includes(
      managementSettingsRevisionV22
    )
  ){
    managementSettingsRevisionV22 =
      options[0] || "Rev 0";
  }

  select.innerHTML =
    options.map(option => `
      <option
        value="${escapeHtml(option)}"
        ${option === managementSettingsRevisionV22 ? "selected" : ""}
      >${escapeHtml(option)}</option>
    `).join("");

  select.value =
    managementSettingsRevisionV22;

  const editor =
    $("managementSettingsRevisionEditor");

  if(editor){
    if(managementSettingsOpenDropdownV22 === "revision"){
      editor.classList.remove("hidden");
      editor.innerHTML =
        managementSettingsOptionEditorMarkupV22(
          "revision"
        )
        .replace(
          'class="management-inline-dropdown-editor"',
          'class="management-inline-dropdown-editor revision-inline-editor"'
        );
    }else{
      editor.classList.add("hidden");
      editor.innerHTML = "";
    }
  }
}

function renderManagementSettingsYearV87(){
  const select = $("managementSettingsYearSelect");
  if(!select || typeof getMonthYearOptions !== "function") return;

  const options = getMonthYearOptions();
  const current = managementSettingsYearV87 || currentMonthYearLabel();
  const finalOptions = options.includes(current) ? options : [current, ...options];

  select.innerHTML = finalOptions
    .map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
    .join("");

  managementSettingsYearV87 = current;
  select.value = current;
}

function managementSettingsProjectItemsV22(){
  const items = [];
  const regions =
    getConfiguredRegionBusinessUnits();
  const projectsByBusinessUnit =
    getConfiguredBusinessUnitProjects();

  Object.entries(regions)
    .forEach(([region,businessUnits]) => {
      (businessUnits || [])
        .forEach(businessUnit => {
          (
            projectsByBusinessUnit[
              businessUnit
            ] || []
          ).forEach(project => {
            items.push({
              region,
              businessUnit,
              project
            });
          });
        });
    });

  return items;
}

function renderManagementSettingsHierarchy(){
  const regionSelect =
    $("managementSettingsRegionSelect");
  const businessUnitSelect =
    $("managementSettingsBusinessUnitSelect");
  const projectSelect =
    $("managementSettingsProjectSelect");

  if(
    !regionSelect ||
    !businessUnitSelect ||
    !projectSelect
  ){
    return;
  }

  const hierarchy =
    getPortalHierarchyConfig();

  const regions =
    Object.keys(
      hierarchy.regionBusinessUnits
    );

  if(
    managementSettingsSelectedRegion &&
    !regions.includes(
      managementSettingsSelectedRegion
    )
  ){
    managementSettingsSelectedRegion = "";
  }

  regionSelect.innerHTML =
    `<option value="">Select region</option>` +
    regions.map(region => `
      <option value="${escapeHtml(region)}">${escapeHtml(region)}</option>
    `).join("");

  regionSelect.value =
    managementSettingsSelectedRegion;

  const businessUnits =
    managementSettingsSelectedRegion
      ? (
          hierarchy.regionBusinessUnits[
            managementSettingsSelectedRegion
          ] || []
        )
      : [];

  if(
    managementSettingsSelectedBusinessUnit &&
    !businessUnits.includes(
      managementSettingsSelectedBusinessUnit
    )
  ){
    managementSettingsSelectedBusinessUnit = "";
  }

  businessUnitSelect.disabled =
    !managementSettingsSelectedRegion;

  businessUnitSelect.innerHTML =
    !managementSettingsSelectedRegion
      ? `<option value="">Select region first</option>`
      : `<option value="">Select business unit</option>` +
        businessUnits.map(unit => `
          <option value="${escapeHtml(unit)}">${escapeHtml(unit)}</option>
        `).join("");

  businessUnitSelect.value =
    managementSettingsSelectedBusinessUnit;

  const projects =
    managementSettingsSelectedBusinessUnit
      ? (
          hierarchy.businessUnitProjects[
            managementSettingsSelectedBusinessUnit
          ] || []
        )
      : [];

  if(
    managementSettingsSelectedProject &&
    !projects.includes(
      managementSettingsSelectedProject
    )
  ){
    managementSettingsSelectedProject = "";
  }

  projectSelect.disabled =
    !managementSettingsSelectedBusinessUnit;

  projectSelect.innerHTML =
    !managementSettingsSelectedBusinessUnit
      ? `<option value="">Select business unit first</option>`
      : `<option value="">Select project</option>` +
        projects.map(project => `
          <option value="${escapeHtml(project)}">${escapeHtml(project)}</option>
        `).join("");

  projectSelect.value =
    managementSettingsSelectedProject;

  managementSettingsPreviewDataV22.projectName =
    managementSettingsSelectedProject || "";

  const pill =
    $("managementSettingsSelectionPill");

  if(pill){
    const parts = [
      managementSettingsSelectedRegion,
      managementSettingsSelectedBusinessUnit,
      managementSettingsSelectedProject
    ].filter(Boolean);

    pill.textContent =
      parts.length
        ? parts.join(" / ")
        : "No project selected";
  }

  const status =
    $("managementSettingsStatus");

  if(status){
    // Keep the Management Edit workspace free of helper/description copy.
    status.textContent = "";
  }

  renderManagementConsultantTableSettingsV21();
  renderManagementSettingsRevisionV22();
  renderManagementSettingsYearV87();
}

function renderManagementSettingsSearchResultsV22(query){
  const results =
    $("managementSettingsProjectSearchResults");

  if(!results) return;

  const normalized =
    String(query || "")
      .trim()
      .toLowerCase();

  results.innerHTML = "";

  if(!normalized){
    results.classList.add("hidden");
    return;
  }

  const matches =
    managementSettingsProjectItemsV22()
      .filter(item =>
        item.project.toLowerCase().includes(normalized) ||
        item.businessUnit.toLowerCase().includes(normalized) ||
        item.region.toLowerCase().includes(normalized)
      )
      .slice(0,12);

  if(!matches.length){
    results.innerHTML =
      `<div class="project-search-empty">No project found</div>`;
    results.classList.remove("hidden");
    return;
  }

  results.innerHTML =
    matches.map(item => `
      <button
        type="button"
        class="project-search-result"
        data-management-settings-search-region="${escapeHtml(item.region)}"
        data-management-settings-search-business-unit="${escapeHtml(item.businessUnit)}"
        data-management-settings-search-project="${escapeHtml(item.project)}"
      >
        <span>
          <strong>${escapeHtml(item.project)}</strong>
          <small>${escapeHtml(item.region)} · ${escapeHtml(item.businessUnit)}</small>
        </span>
        <span>→</span>
      </button>
    `).join("");

  results.classList.remove("hidden");
}

function saveManagementSettingsDropdownOptionV22(key,index,value){
  const clean = String(value || "").trim();

  if(!clean){
    renderManagementConsultantTableSettingsV21();
    renderManagementSettingsRevisionV22();
    return;
  }

  const config =
    getConfiguredDropdownOptions();

  const current = [
    ...(config[key] ||
      managementSettingsDropdownFallbackV22(key))
  ];

  if(index < 0 || index >= current.length){
    return;
  }

  const previous = current[index];
  current[index] = clean;
  config[key] = [...new Set(current)];
  saveConfiguredDropdownOptions(config);

  if(
    managementSettingsPreviewDataV22[key] === previous
  ){
    managementSettingsPreviewDataV22[key] = clean;
  }

  if(
    key === "revision" &&
    managementSettingsRevisionV22 === previous
  ){
    managementSettingsRevisionV22 = clean;
  }

  renderManagementConsultantTableSettingsV21();
  renderManagementSettingsRevisionV22();
}

function addManagementSettingsDropdownOptionV22(key){
  const value =
    prompt(
      `Add option to ${managementSettingsDropdownLabel(key)}:`
    )?.trim();

  if(!value) return;

  const config =
    getConfiguredDropdownOptions();

  const current = [
    ...(config[key] ||
      managementSettingsDropdownFallbackV22(key))
  ];

  if(
    current.some(option =>
      option.toLowerCase() ===
      value.toLowerCase()
    )
  ){
    alert("This option already exists.");
    return;
  }

  config[key] = [...current,value];
  saveConfiguredDropdownOptions(config);

  renderManagementConsultantTableSettingsV21();
  renderManagementSettingsRevisionV22();
}

function removeManagementSettingsDropdownOptionV22(key,index){
  const config =
    getConfiguredDropdownOptions();

  const current = [
    ...(config[key] ||
      managementSettingsDropdownFallbackV22(key))
  ];

  if(current.length <= 1){
    alert("Keep at least one option in this dropdown.");
    return;
  }

  if(index < 0 || index >= current.length){
    return;
  }

  const removed = current[index];
  current.splice(index,1);
  config[key] = current;
  saveConfiguredDropdownOptions(config);

  if(
    managementSettingsPreviewDataV22[key] === removed
  ){
    managementSettingsPreviewDataV22[key] =
      current[0] || "";
  }

  if(
    key === "revision" &&
    managementSettingsRevisionV22 === removed
  ){
    managementSettingsRevisionV22 =
      current[0] || "Rev 0";
  }

  renderManagementConsultantTableSettingsV21();
  renderManagementSettingsRevisionV22();
}

function renderManagementSettings(){
  renderManagementSettingsHierarchy();
  renderManagementSettingsRevisionV22();
}
