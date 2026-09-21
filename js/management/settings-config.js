/* ============================================================
   V20 MANAGEMENT OVERRIDES
   - Dynamic project hierarchy
   - Consultant dropdown settings
   - Consultant-style Overview project bar
   - Dynamic Comparison columns
   ============================================================ */

const MANAGEMENT_DROPDOWN_DEFINITIONS_V20 = [
  { key:"buildingType", label:"Type of Building" },
  { key:"landedType", label:"Landed Type / Terrace Type" },
  { key:"highRiseType", label:"High Rise Type" },
  { key:"highRiseCategory", label:"High Rise Category" },
  { key:"transferFloor", label:"Transfer Floor Type" },
  { key:"revision", label:"Revision" }
];

let managementSettingsSelectedRegion = "";
let managementSettingsSelectedBusinessUnit = "";
let managementSettingsSelectedProject = "";
let managementSettingsDropdownKey = "landedType";

let managementOverviewSelectionV20 = {
  region:"",
  businessUnit:"",
  project:""
};

/* ---------------- Project hierarchy ---------------- */

function clonePortalObject(value){
  return JSON.parse(JSON.stringify(value));
}

function defaultPortalHierarchyConfig(){
  return {
    regionBusinessUnits:
      clonePortalObject(REGION_BUSINESS_UNITS),
    businessUnitProjects:
      clonePortalObject(BUSINESS_UNIT_PROJECTS)
  };
}

function getPortalHierarchyConfig(){
  const stored =
    loadStorage(
      ECO_FRESH_STORAGE.portalHierarchy,
      null
    );

  const defaults =
    defaultPortalHierarchyConfig();

  if(
    !stored ||
    typeof stored !== "object"
  ){
    return defaults;
  }

  return {
    regionBusinessUnits:{
      ...defaults.regionBusinessUnits,
      ...(stored.regionBusinessUnits || {})
    },
    businessUnitProjects:{
      ...defaults.businessUnitProjects,
      ...(stored.businessUnitProjects || {})
    }
  };
}

function savePortalHierarchyConfig(config){
  saveStorage(
    ECO_FRESH_STORAGE.portalHierarchy,
    config
  );
}

function getConfiguredRegionBusinessUnits(){
  return getPortalHierarchyConfig()
    .regionBusinessUnits;
}

function getConfiguredBusinessUnitProjects(){
  return getPortalHierarchyConfig()
    .businessUnitProjects;
}

/* ---------------- Consultant dropdown options ---------------- */

function overviewRowByKey(key){
  for(const section of OVERVIEW_SECTIONS){
    const row =
      section.rows.find(item =>
        item.key === key
      );

    if(row){
      return row;
    }
  }

  return null;
}

function defaultConsultantDropdownOptions(){
  return {
    buildingType:[
      ...(overviewRowByKey("buildingType")?.options || [
        "High Rise",
        "Landed"
      ])
    ],

    landedType:[
      "Terrace 22x70",
      "Terrace 20x70",
      "Semi-D",
      "Bungalow",
      "Cluster / Link"
    ],

    highRiseType:[
      ...(overviewRowByKey("highRiseType")?.options || [])
    ],

    highRiseCategory:[
      ...(overviewRowByKey("highRiseCategory")?.options || [])
    ],

    transferFloor:[
      ...(overviewRowByKey("transferFloor")?.options || [])
    ],

    revision:[
      "Rev 0",
      "Rev 1",
      "Rev 2",
      "Rev 3"
    ]
  };
}

function getConfiguredDropdownOptions(){
  const defaults =
    defaultConsultantDropdownOptions();

  const stored =
    loadStorage(
      ECO_FRESH_STORAGE.dropdownOptions,
      null
    );

  if(!stored){
    return defaults;
  }

  const merged = {};

  Object.keys(defaults)
    .forEach(key => {
      merged[key] =
        Array.isArray(stored[key]) &&
        stored[key].length
          ? stored[key]
          : defaults[key];
    });

  return merged;
}

function saveConfiguredDropdownOptions(config){
  saveStorage(
    ECO_FRESH_STORAGE.dropdownOptions,
    config
  );
}

function getConsultantDropdownOptions(key, fallback=[]){
  if(key === "pileType"){
    const pileTypes =
      pileTypesFromManagementReference();

    return pileTypes.length
      ? pileTypes
      : fallback;
  }

  const config =
    getConfiguredDropdownOptions();

  return Array.isArray(config[key]) &&
    config[key].length
      ? config[key]
      : fallback;
}

function getConfiguredRevisionOptions(){
  return getConsultantDropdownOptions(
    "revision",
    ["Rev 0","Rev 1","Rev 2","Rev 3"]
  );
}

/* Consultant Submission table configuration */
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

function isConsultantRowVisible(sectionTitle,rowKey){
  const settings =
    getConsultantTableSettings();

  return (
    settings.rows?.[
      consultantSettingsKey(sectionTitle,rowKey)
    ]?.visible !== false
  );
}

function consultantRowLabel(sectionTitle,rowKey,fallback){
  const settings =
    getConsultantTableSettings();

  return (
    settings.rows?.[
      consultantSettingsKey(sectionTitle,rowKey)
    ]?.label || fallback
  );
}

/* ---------------- Settings UI ---------------- */

function managementSettingsDropdownLabel(key){
  return (
    MANAGEMENT_DROPDOWN_DEFINITIONS_V20
      .find(item =>
        item.key === key
      )?.label ||
    key
  );
}

function renderManagementSettingsHierarchy(){
  const regionSelect =
    $("settingsRegionSelect");

  const businessUnitSelect =
    $("settingsBusinessUnitSelect");

  const projectSelect =
    $("settingsProjectSelect");

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
    regions
      .map(region =>
        `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`
      )
      .join("");

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
      : (
          `<option value="">Select business unit</option>` +
          businessUnits
            .map(unit =>
              `<option value="${escapeHtml(unit)}">${escapeHtml(unit)}</option>`
            )
            .join("")
        );

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
      : (
          `<option value="">Select project</option>` +
          projects
            .map(project =>
              `<option value="${escapeHtml(project)}">${escapeHtml(project)}</option>`
            )
            .join("")
        );

  projectSelect.value =
    managementSettingsSelectedProject;

  const status =
    $("settingsHierarchyStatus");

  if(status){
    if(managementSettingsSelectedProject){
      status.textContent =
        `${managementSettingsSelectedRegion} → ${managementSettingsSelectedBusinessUnit} → ${managementSettingsSelectedProject}`;
    }else if(managementSettingsSelectedBusinessUnit){
      status.textContent =
        `${managementSettingsSelectedRegion} → ${managementSettingsSelectedBusinessUnit} · ${projects.length} project${projects.length === 1 ? "" : "s"}`;
    }else if(managementSettingsSelectedRegion){
      status.textContent =
        `${managementSettingsSelectedRegion} · ${businessUnits.length} business unit${businessUnits.length === 1 ? "" : "s"}`;
    }else{
      status.textContent =
        "Select a Region to manage its Business Units and Projects.";
    }
  }
}

function renderManagementDropdownSettings(){
  const typeSelect =
    $("settingsDropdownTypeSelect");

  const list =
    $("settingsDropdownOptionList");

  if(!typeSelect || !list){
    return;
  }

  typeSelect.innerHTML =
    MANAGEMENT_DROPDOWN_DEFINITIONS_V20
      .map(item => `
        <option
          value="${escapeHtml(item.key)}"
          ${managementSettingsDropdownKey === item.key ? "selected" : ""}
        >
          ${escapeHtml(item.label)}
        </option>
      `)
      .join("");

  const config =
    getConfiguredDropdownOptions();

  const options =
    config[managementSettingsDropdownKey] || [];

  list.innerHTML =
    options.length
      ? options
          .map((option,index) => `
            <div class="management-dropdown-option-row">
              <span>${index + 1}</span>

              <input
                type="text"
                value="${escapeHtml(option)}"
                data-settings-dropdown-option="${index}"
              />

              <button
                type="button"
                class="management-table-delete-btn"
                data-remove-settings-dropdown-option="${index}"
                title="Remove option"
              >×</button>
            </div>
          `)
          .join("")
      : `
          <div class="management-settings-empty">
            No options yet. Add one above.
          </div>
        `;
}

function renderManagementConsultantTableSettingsV21(){
  const body =
    $("managementConsultantTableSettingsBody");

  if(!body) return;

  const settings =
    getConsultantTableSettings();

  body.innerHTML =
    OVERVIEW_SECTIONS.map(section => {
      const sectionConfig =
        settings.sections?.[section.title] || {
          visible:true,
          label:section.title
        };

      const rows =
        managementSettingsRowsForSection(section);

      return `
        <tr class="section-row management-settings-section-row">
          <td colspan="2">
            <div class="section-row-content management-settings-section-content">
              <div class="management-settings-section-main">
                <label class="management-settings-visibility" title="Show or hide this section on Consultant Submission">
                  <input
                    type="checkbox"
                    data-setting-section-visible="${escapeHtml(section.title)}"
                    ${sectionConfig.visible !== false ? "checked" : ""}
                  />
                  <span>Show</span>
                </label>

                <input
                  class="management-settings-section-label-input"
                  type="text"
                  value="${escapeHtml(sectionConfig.label || section.title)}"
                  data-setting-section-label="${escapeHtml(section.title)}"
                  aria-label="Section name"
                />
              </div>

              <button
                type="button"
                class="management-add-setting-row-btn"
                data-add-consultant-setting-row="${escapeHtml(section.title)}"
                title="Add row to ${escapeHtml(section.title)}"
                aria-label="Add row to ${escapeHtml(section.title)}"
              >
                <span class="management-add-row-icon">＋</span>
                <span>Add Row</span>
              </button>
            </div>
          </td>
        </tr>

        ${rows.map(row => {
          const key =
            consultantSettingsKey(
              section.title,
              row.key
            );

          const config =
            settings.rows?.[key] || {
              visible:true,
              label:row.label
            };

          return `
            <tr class="management-settings-item-row ${row.custom ? "is-custom-row" : ""}">
              <td>
                <div class="field-label management-settings-item-name">
                  ${escapeHtml(config.label || row.label)}
                  ${row.custom ? '<span class="management-custom-row-badge">Custom</span>' : ''}
                </div>
                <small class="management-settings-field-key">${escapeHtml(row.key)}</small>
              </td>
              <td>
                <div class="management-settings-row-control">
                  <input
                    class="management-settings-row-label-input"
                    type="text"
                    value="${escapeHtml(config.label || row.label)}"
                    data-setting-row-label="${escapeHtml(key)}"
                    aria-label="Consultant row label"
                  />

                  <label class="management-settings-visibility management-settings-row-visibility" title="Show or hide this row on Consultant Submission">
                    <input
                      type="checkbox"
                      data-setting-row-visible="${escapeHtml(key)}"
                      ${config.visible !== false ? "checked" : ""}
                    />
                    <span>Show</span>
                  </label>

                  ${row.custom ? `
                    <button
                      type="button"
                      class="management-table-delete-btn management-settings-delete-row-btn"
                      data-remove-consultant-setting-row="${escapeHtml(row.key)}"
                      data-remove-consultant-setting-section="${escapeHtml(section.title)}"
                      title="Remove custom row"
                      aria-label="Remove custom row"
                    >×</button>
                  ` : '<span class="management-settings-fixed-row-space" aria-hidden="true"></span>'}
                </div>
              </td>
            </tr>
          `;
        }).join("")}
      `;
    }).join("");
}

function addManagementConsultantTableRowV21(sectionTitle){
  const label =
    prompt(`Enter the new row name for ${sectionTitle}:`)
      ?.trim();

  if(!label) return;

  const settings =
    typeof collectManagementSettings === "function"
      ? collectManagementSettings()
      : getConsultantTableSettings();

  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"") || "custom_row";

  const key =
    `custom_${base}_${Date.now().toString(36)}`;

  settings.customRows = [
    ...(settings.customRows || []),
    {
      section:sectionTitle,
      key,
      label,
      type:"text",
      placeholder:"Enter value"
    }
  ];

  settings.rows[
    consultantSettingsKey(sectionTitle,key)
  ] = {
    visible:true,
    label
  };

  saveStorage(
    ECO_FRESH_STORAGE.tableSettings,
    settings
  );

  renderManagementConsultantTableSettingsV21();
}

function removeManagementConsultantTableRowV21(sectionTitle,rowKey){
  const settings =
    typeof collectManagementSettings === "function"
      ? collectManagementSettings()
      : getConsultantTableSettings();

  const customRow =
    (settings.customRows || [])
      .find(row =>
        row.section === sectionTitle &&
        row.key === rowKey
      );

  if(!customRow) return;

  if(
    !confirm(
      `Remove “${customRow.label}” from the Consultant Submission table?`
    )
  ){
    return;
  }

  settings.customRows =
    settings.customRows.filter(row =>
      !(
        row.section === sectionTitle &&
        row.key === rowKey
      )
    );

  delete settings.rows[
    consultantSettingsKey(sectionTitle,rowKey)
  ];

  saveStorage(
    ECO_FRESH_STORAGE.tableSettings,
    settings
  );

  renderManagementConsultantTableSettingsV21();
}

function renderManagementSettings(){
  renderManagementConsultantTableSettingsV21();
  renderManagementSettingsHierarchy();
  renderManagementDropdownSettings();
}

function collectCurrentDropdownOptionsFromUI(){
  return [
    ...document.querySelectorAll(
      "[data-settings-dropdown-option]"
    )
  ]
    .map(input =>
      input.value.trim()
    )
    .filter(Boolean);
}

function saveCurrentManagementDropdownOptions(){
  const config =
    getConfiguredDropdownOptions();

  const values =
    collectCurrentDropdownOptionsFromUI();

  if(!values.length){
    alert(
      `${managementSettingsDropdownLabel(managementSettingsDropdownKey)} must contain at least one option.`
    );
    return false;
  }

  config[managementSettingsDropdownKey] =
    [...new Set(values)];

  saveConfiguredDropdownOptions(config);

  return true;
}

function addManagementHierarchyRegion(){
  const name =
    prompt("Enter new Region name:")
      ?.trim();

  if(!name) return;

  const config =
    getPortalHierarchyConfig();

  if(config.regionBusinessUnits[name]){
    alert("This Region already exists.");
    return;
  }

  config.regionBusinessUnits[name] = [];
  savePortalHierarchyConfig(config);

  managementSettingsSelectedRegion = name;
  managementSettingsSelectedBusinessUnit = "";
  managementSettingsSelectedProject = "";

  renderManagementSettingsHierarchy();
}

function addManagementHierarchyBusinessUnit(){
  if(!managementSettingsSelectedRegion){
    alert("Select a Region first.");
    return;
  }

  const name =
    prompt("Enter new Business Unit name:")
      ?.trim();

  if(!name) return;

  const config =
    getPortalHierarchyConfig();

  const list =
    config.regionBusinessUnits[
      managementSettingsSelectedRegion
    ] || [];

  if(list.includes(name)){
    alert("This Business Unit already exists in the selected Region.");
    return;
  }

  list.push(name);

  config.regionBusinessUnits[
    managementSettingsSelectedRegion
  ] = list;

  if(
    !config.businessUnitProjects[name]
  ){
    config.businessUnitProjects[name] = [];
  }

  savePortalHierarchyConfig(config);

  managementSettingsSelectedBusinessUnit =
    name;

  managementSettingsSelectedProject = "";

  renderManagementSettingsHierarchy();
}

function addManagementHierarchyProject(){
  if(!managementSettingsSelectedBusinessUnit){
    alert("Select a Business Unit first.");
    return;
  }

  const name =
    prompt("Enter new Project name:")
      ?.trim();

  if(!name) return;

  const config =
    getPortalHierarchyConfig();

  const list =
    config.businessUnitProjects[
      managementSettingsSelectedBusinessUnit
    ] || [];

  if(list.includes(name)){
    alert("This Project already exists.");
    return;
  }

  list.push(name);

  config.businessUnitProjects[
    managementSettingsSelectedBusinessUnit
  ] = list;

  savePortalHierarchyConfig(config);

  managementSettingsSelectedProject =
    name;

  renderManagementSettingsHierarchy();
}

function removeManagementHierarchyProject(){
  if(!managementSettingsSelectedProject){
    alert("Select a Project to remove.");
    return;
  }

  if(
    !confirm(
      `Remove project "${managementSettingsSelectedProject}" from the Consultant dropdown?`
    )
  ){
    return;
  }

  const config =
    getPortalHierarchyConfig();

  config.businessUnitProjects[
    managementSettingsSelectedBusinessUnit
  ] = (
    config.businessUnitProjects[
      managementSettingsSelectedBusinessUnit
    ] || []
  ).filter(project =>
    project !== managementSettingsSelectedProject
  );

  managementSettingsSelectedProject = "";

  savePortalHierarchyConfig(config);
  renderManagementSettingsHierarchy();
}

function removeManagementHierarchyBusinessUnit(){
  if(!managementSettingsSelectedBusinessUnit){
    alert("Select a Business Unit to remove.");
    return;
  }

  if(
    !confirm(
      `Remove Business Unit "${managementSettingsSelectedBusinessUnit}" and its project dropdown entries?`
    )
  ){
    return;
  }

  const config =
    getPortalHierarchyConfig();

  config.regionBusinessUnits[
    managementSettingsSelectedRegion
  ] = (
    config.regionBusinessUnits[
      managementSettingsSelectedRegion
    ] || []
  ).filter(unit =>
    unit !== managementSettingsSelectedBusinessUnit
  );

  delete config.businessUnitProjects[
    managementSettingsSelectedBusinessUnit
  ];

  managementSettingsSelectedBusinessUnit = "";
  managementSettingsSelectedProject = "";

  savePortalHierarchyConfig(config);
  renderManagementSettingsHierarchy();
}

function removeManagementHierarchyRegion(){
  if(!managementSettingsSelectedRegion){
    alert("Select a Region to remove.");
    return;
  }

  if(
    !confirm(
      `Remove Region "${managementSettingsSelectedRegion}" and its Business Unit dropdown entries?`
    )
  ){
    return;
  }

  const config =
    getPortalHierarchyConfig();

  const units =
    config.regionBusinessUnits[
      managementSettingsSelectedRegion
    ] || [];

  units.forEach(unit => {
    delete config.businessUnitProjects[unit];
  });

  delete config.regionBusinessUnits[
    managementSettingsSelectedRegion
  ];

  managementSettingsSelectedRegion = "";
  managementSettingsSelectedBusinessUnit = "";
  managementSettingsSelectedProject = "";

  savePortalHierarchyConfig(config);
  renderManagementSettingsHierarchy();
}
