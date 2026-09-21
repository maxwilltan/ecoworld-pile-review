
const $ = (id) => document.getElementById(id);

const state = {
  auth: null,
  selectedRegion: "",
  selectedBusinessUnit: "",
  selectedProject: "",
  selectedRevision: "Rev 0",
  selectedYear: "",
  currentView: "overview",
  sidebarCollapsed: false,
  formData: {},
  editingId: null
};

function monthYearLabel(date = new Date()){
  const value = date instanceof Date ? date : new Date(date);
  if(Number.isNaN(value.getTime())) return "";
  return value.toLocaleString("en-US", { month:"short", year:"numeric" }).replace(" ", "-");
}

function currentMonthYearLabel(){
  return monthYearLabel(new Date());
}

function submissionYearLabel(item){
  return item?.year || monthYearLabel(item?.updatedAt) || "—";
}

function getMonthYearOptions(){
  const now = new Date();
  const startYear = 2000;
  const endYear = now.getFullYear() + 8;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const options = [];

  for(let year = endYear; year >= startYear; year--){
    for(let month = 11; month >= 0; month--){
      options.push(`${months[month]}-${year}`);
    }
  }

  return options;
}

function populateYearSelect(){
  const select = $("yearSelect");
  if(!select) return;

  const options = getMonthYearOptions();
  const current = state.selectedYear || currentMonthYearLabel();
  const finalOptions = options.includes(current) ? options : [current, ...options];

  select.innerHTML = finalOptions
    .map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
    .join("");

  state.selectedYear = current;
  select.value = current;
}

function loadStorage(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(error){
    return fallback;
  }
}

function saveStorage(key, value){
  try{
    localStorage.setItem(key, JSON.stringify(value));
  }catch(error){
    console.error(`Unable to save browser storage key: ${key}`, error);
    throw error;
  }
}

function defaultFormData(){
  return {
    projectName: state.selectedProject || "",
    consultantName: typeof currentConsultantDisplayName === "function" ? currentConsultantDisplayName() : "",
    buildingType: "High Rise",
    landedType: "",
    highRiseType: "Residential – Duduk",
    highRiseCategory: "Long Block",
    transferFloor: "Separate Carpark Block (No Transfer Floor)",
    storeyCount: "",
    unitCount: "",
    gridlineCarpark: "",
    gridlineCarparkVertical: "",
    gridlineCarparkHorizontal: "",
    resiTowerBuildingEfficiency: "",
    carparkFloorEfficiency: "",
    overallBuildingEfficiency: "",
    pileType: "Bored Piles",
    pileSize: "",
    numberOfPiles: "",
    pilingCost: "",
    totalArea: "",
    totalColumnLoading: "",
    totalPilesCapacity: "",
    overallEfficiency: "",
    loadingCapacityRows: [],
    poundageRcColumn: "",
    poundageRcBeamCarpark: "",
    poundageRcBeamTypical: "",
    poundageRcSlab: "",
    poundageShearWall: "",
    poundageOverall: "",
    poundageSteelContent: "",
    poundageDetails: {},
    drawingArchitectural: [],
    drawingStructural: []
  };
}

function getSubmissions(){
  return loadStorage(ECO_FRESH_STORAGE.submissions, []);
}

function setSubmissions(items){
  // Supabase is the production source of truth. Browser storage is only a UI cache.
  try{
    saveStorage(ECO_FRESH_STORAGE.submissions, items);
  }catch(error){
    console.warn("Unable to update the local submission cache.", error);
  }
}

function setAuth(auth){
  state.auth = auth;
  if(auth){
    saveStorage(ECO_FRESH_STORAGE.auth, auth);
  }else{
    localStorage.removeItem(ECO_FRESH_STORAGE.auth);
  }
}

function applySidebarState(){
  const collapsed = state.sidebarCollapsed;
  $("sidebar").classList.toggle("collapsed", collapsed);
  $("appShell").classList.toggle("sidebar-collapsed", collapsed);
  saveStorage(ECO_FRESH_STORAGE.sidebar, collapsed);
}

function showView(viewName){
  state.currentView = viewName;

  if(state.auth?.role === "Management"){
    showManagementView(viewName);
    return;
  }

  ["overview", "history"].forEach(name => {
    const view = $(`${name}View`);
    if(view) view.classList.toggle("hidden", name !== viewName);
  });

  document.querySelectorAll(".management-view").forEach(view => {
    view.classList.add("hidden");
  });

  document.querySelectorAll(".side-nav-btn").forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.view === viewName
    );
  });

  if(viewName === "history") renderHistory();
}

function consultantRegionBusinessUnits(){
  if(
    state.auth?.role === "Consultant" &&
    typeof getConsultantAccessibleRegionBusinessUnits === "function"
  ){
    return getConsultantAccessibleRegionBusinessUnits();
  }

  if(
    typeof getConfiguredRegionBusinessUnits === "function"
  ){
    return getConfiguredRegionBusinessUnits();
  }

  return REGION_BUSINESS_UNITS;
}

function consultantBusinessUnitProjects(){
  if(
    state.auth?.role === "Consultant" &&
    typeof getConsultantAccessibleBusinessUnitProjects === "function"
  ){
    return getConsultantAccessibleBusinessUnitProjects();
  }

  if(
    typeof getConfiguredBusinessUnitProjects === "function"
  ){
    return getConfiguredBusinessUnitProjects();
  }

  return BUSINESS_UNIT_PROJECTS;
}

function populateRevisionSelect(){
  const select = $("revisionSelect");
  if(!select) return;

  const options =
    typeof getConfiguredRevisionOptions === "function"
      ? getConfiguredRevisionOptions()
      : ["Rev 0", "Rev 1", "Rev 2", "Rev 3"];

  const current =
    state.selectedRevision ||
    options[0] ||
    "Rev 0";

  const finalOptions =
    options.includes(current)
      ? options
      : [current, ...options];

  select.innerHTML =
    finalOptions
      .map(option =>
        `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`
      )
      .join("");

  state.selectedRevision =
    current;

  select.value =
    current;
}

function populateRegionSelect(){
  const select = $("regionSelect");
  if(!select) return;

  const regions = Object.keys(consultantRegionBusinessUnits());
  select.innerHTML = `<option value="">Select region</option>` +
    regions.map(region => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`).join("");

  if(state.selectedRegion && regions.includes(state.selectedRegion)){
    select.value = state.selectedRegion;
  }else{
    // A different consultant account may not have access to the Region that
    // was selected in the previous session. Reset the hierarchy so the
    // visible placeholder remains "Select region" instead of a blank select.
    state.selectedRegion = "";
    state.selectedBusinessUnit = "";
    state.selectedProject = "";
    select.value = "";
  }
}

function populateBusinessUnitSelect(){
  const select = $("businessUnitSelect");
  const options = consultantRegionBusinessUnits()[state.selectedRegion] || [];
  select.disabled = !state.selectedRegion;
  select.innerHTML = !state.selectedRegion
    ? `<option value="">Select region first</option>`
    : `<option value="">Select business unit</option>` + options.map(
        option => `<option value="${option}">${option}</option>`
      ).join("");
  if(state.selectedBusinessUnit && options.includes(state.selectedBusinessUnit)){
    select.value = state.selectedBusinessUnit;
  }else if(state.selectedBusinessUnit){
    state.selectedBusinessUnit = "";
    state.selectedProject = "";
    select.value = "";
  }
}

function populateProjectSelect(){
  const select = $("projectSelect");
  const options = consultantBusinessUnitProjects()[state.selectedBusinessUnit] || [];
  select.disabled = !state.selectedBusinessUnit;
  select.innerHTML = !state.selectedBusinessUnit
    ? `<option value="">Select business unit first</option>`
    : `<option value="">Select project</option>` + options.map(
        option => `<option value="${option}">${option}</option>`
      ).join("");
  if(state.selectedProject && options.includes(state.selectedProject)){
    select.value = state.selectedProject;
  }else if(state.selectedProject){
    state.selectedProject = "";
    select.value = "";
  }
}

function allProjectSearchItems(){
  const items=[];

  Object.entries(consultantRegionBusinessUnits()).forEach(([region,businessUnits])=>{
    businessUnits.forEach(businessUnit=>{
      const projects=consultantBusinessUnitProjects()[businessUnit] || [];

      projects.forEach(project=>{
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

function closeProjectSearchResults(){
  const results=$("projectSearchResults");
  if(results)results.classList.add("hidden");
}

function renderProjectSearchResults(query){
  const results=$("projectSearchResults");
  const normalized=String(query || "").trim().toLowerCase();

  results.innerHTML="";

  if(!normalized){
    closeProjectSearchResults();
    return;
  }

  const matches=allProjectSearchItems()
    .filter(item=>
      item.project.toLowerCase().includes(normalized) ||
      item.businessUnit.toLowerCase().includes(normalized) ||
      item.region.toLowerCase().includes(normalized)
    )
    .slice(0,12);

  if(!matches.length){
    results.innerHTML=`<div class="project-search-empty">No project found</div>`;
    results.classList.remove("hidden");
    return;
  }

  matches.forEach(item=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="project-search-result";
    button.dataset.searchRegion=item.region;
    button.dataset.searchBusinessUnit=item.businessUnit;
    button.dataset.searchProject=item.project;
    button.innerHTML=`
      <span>
        <strong>${escapeHtml(item.project)}</strong>
        <small>${escapeHtml(item.region)} · ${escapeHtml(item.businessUnit)}</small>
      </span>
      <span>→</span>
    `;
    results.appendChild(button);
  });

  results.classList.remove("hidden");
}

function setSelectedProject(project){
  const selected = String(project || "").trim();

  state.selectedProject = selected;
  state.formData.projectName = selected;

  if($("projectSearchInput")){
    $("projectSearchInput").value = selected;
  }

  closeProjectSearchResults();
  updateCurrentSelectionPill();
  loadFormForCurrentSelection();
}

function selectProjectFromSearch(item){
  state.selectedRegion=item.region;
  state.selectedBusinessUnit=item.businessUnit;
  state.selectedProject=item.project;

  $("regionSelect").value=state.selectedRegion;
  populateBusinessUnitSelect();
  $("businessUnitSelect").value=state.selectedBusinessUnit;
  populateProjectSelect();
  $("projectSelect").value=state.selectedProject;
  $("projectSearchInput").value=state.selectedProject;

  state.formData.projectName=state.selectedProject;
  closeProjectSearchResults();
  updateCurrentSelectionPill();
  loadFormForCurrentSelection();
}

function hasSelectedProject(){
  return Boolean(
    state.selectedRegion &&
    state.selectedBusinessUnit &&
    state.selectedProject
  );
}

function updateSubmissionLockState(){
  const selected = hasSelectedProject();
  const unlocked = typeof canEditCurrentSubmissionV31 === "function" && canEditCurrentSubmissionV31();
  const existing = typeof currentSelectedSubmissionV31 === "function" ? currentSelectedSubmissionV31() : null;

  const notice = $("submissionLockNotice");
  if(notice){
    notice.classList.toggle("hidden", unlocked);
    const title = notice.querySelector("strong");
    const detail = notice.querySelector("small");
    if(title) title.textContent = !selected ? "Select a project to begin" : existing ? "Submitted · Read only" : "Project access unavailable";
    if(detail) detail.textContent = !selected ? "Choose a region, business unit and project above." : existing ? "Management can allow editing for this individual submission. Drawings and calculation details remain available to view." : "Your consultant account must be active and assigned to this project.";
  }

  const tableCard =
    $("overviewTableBody")?.closest(".table-card");

  if(tableCard){
    tableCard.classList.toggle(
      "submission-locked",
      !selected
    );
  }

  $("overviewTableBody")
    ?.querySelectorAll(
      "input, select, textarea, button"
    )
    .forEach(control => {
      const viewAction = control.matches("[data-open-drawing-folder],[data-open-loading-table],[data-open-poundage-calculator]");
      control.disabled = viewAction ? !selected : !unlocked;
    });

  if($("revisionSelect")){
    $("revisionSelect").disabled = !selected;
  }

  if($("yearSelect")){
    $("yearSelect").disabled = !unlocked;
  }

  if($("clearFormBtn")){
    $("clearFormBtn").disabled = !unlocked;
  }

  if($("submitBtn")){
    $("submitBtn").disabled = !unlocked;
    $("submitBtn").textContent = existing && unlocked ? "Resubmit correction" : "Submit";
  }
  if(typeof refreshSubmissionModalPermissionsV31 === "function") refreshSubmissionModalPermissionsV31();
}

function updateCurrentSelectionPill(){
  const parts = [state.selectedRegion, state.selectedBusinessUnit, state.selectedProject].filter(Boolean);
  $("currentSelectionPill").textContent = parts.length ? parts.join(" / ") : "No project selected";
  $("valueColumnHeading").textContent = state.selectedRevision || "Current Revision";
  updateSubmissionLockState();
}

function findSubmission(project, revision){
  return getSubmissions().find(item =>
    item.region === state.selectedRegion &&
    item.businessUnit === state.selectedBusinessUnit &&
    item.project === project &&
    item.revision === revision &&
    (
      state.auth?.role !== "Consultant" ||
      typeof submissionBelongsToCurrentConsultant !== "function" ||
      submissionBelongsToCurrentConsultant(item)
    )
  ) || null;
}

function numberOrNull(value){
  const num = Number(value);
  return value !== "" && value !== null && value !== undefined && Number.isFinite(num)
    ? num
    : null;
}

function ensureLoadingCapacityRows(){
  if(!Array.isArray(state.formData.loadingCapacityRows)){
    state.formData.loadingCapacityRows = [];
  }
  return state.formData.loadingCapacityRows;
}

function loadingRowCalculation(row){
  const count = numberOrNull(row.numberOfPiles);

  const capacityPerPile =
    findManagementPileCapacity(
      row.pileType,
      row.pileSize
    );

  const columnLoading = numberOrNull(row.columnLoading);

  const totalCapacity =
    count !== null &&
    capacityPerPile !== null
      ? count * capacityPerPile
      : null;

  const efficiency =
    totalCapacity !== null &&
    totalCapacity > 0 &&
    columnLoading !== null
      ? columnLoading / totalCapacity
      : null;

  return {
    count,
    capacityPerPile,
    columnLoading,
    totalCapacity,
    efficiency
  };
}

function calculateLoadingCapacityTotals(){
  const rows = ensureLoadingCapacityRows();

  let totalPiles = 0;
  let totalCapacity = 0;
  let totalLoading = 0;
  let anyCapacity = false;
  let anyLoading = false;

  rows.forEach(row => {
    const calc = loadingRowCalculation(row);

    if(calc.count !== null){
      totalPiles += calc.count;
    }

    if(calc.totalCapacity !== null){
      totalCapacity += calc.totalCapacity;
      anyCapacity = true;
    }

    if(calc.columnLoading !== null){
      totalLoading += calc.columnLoading;
      anyLoading = true;
    }
  });

  const overallEfficiency =
    anyCapacity &&
    anyLoading &&
    totalCapacity > 0
      ? totalLoading / totalCapacity
      : null;

  return {
    totalPiles,
    totalCapacity: anyCapacity ? totalCapacity : null,
    totalLoading: anyLoading ? totalLoading : null,
    overallEfficiency
  };
}

function syncLoadingSummaryToForm(){
  const totals = calculateLoadingCapacityTotals();

  state.formData.totalColumnLoading =
    totals.totalLoading === null
      ? ""
      : String(Number(totals.totalLoading.toFixed(2)));

  state.formData.totalPilesCapacity =
    totals.totalCapacity === null
      ? ""
      : String(Number(totals.totalCapacity.toFixed(2)));

  state.formData.overallEfficiency =
    totals.overallEfficiency === null
      ? ""
      : String(Number((totals.overallEfficiency * 100).toFixed(1)));

  return totals;
}

function deriveEfficiency(){
  syncLoadingSummaryToForm();
}

function ensureSelectionLinkedFields(){
  state.formData.projectName = state.selectedProject || state.formData.projectName || "";
}

function loadFormForCurrentSelection(){
  ensureSelectionLinkedFields();

  if(!state.selectedProject){
    state.formData = { ...defaultFormData(), projectName: "" };
    state.editingId = null;
    state.loadedSubmissionTokenV31 = null;
    renderOverviewTable();
    updateSaveStatus("Choose a project to start.");
    return;
  }

  const existing = findSubmission(state.selectedProject, state.selectedRevision);

  if(existing){
    state.formData = {
      ...defaultFormData(),
      ...structuredClone(existing.formData || {})
    };
    state.editingId = existing.id;
    state.loadedSubmissionTokenV31 = submissionContentTokenV31(existing);
    state.formData.projectName = state.selectedProject;
    state.selectedYear = submissionYearLabel(existing) === "—" ? currentMonthYearLabel() : submissionYearLabel(existing);
    populateYearSelect();
    renderOverviewTable();
    updateSaveStatus(`Loaded ${state.selectedProject} · ${state.selectedRevision} · Version ${Number(existing.versionNumber) || 1}. ${canConsultantEditSubmissionV31(existing) ? "Editing allowed. Resubmitting will lock this submission again." : "Read only. Management must allow editing before corrections."}`);
    return;
  }

  state.formData = {
    ...defaultFormData(),
    projectName: state.selectedProject || ""
  };
  state.editingId = null;
  state.loadedSubmissionTokenV31 = null;
  renderOverviewTable();
  if(!state.selectedYear) state.selectedYear = currentMonthYearLabel();
  populateYearSelect();
  updateSaveStatus(`New ${state.selectedRevision} · ${state.selectedYear} record for ${state.selectedProject}. Ready to edit.`);
}
