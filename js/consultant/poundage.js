const CONSULTANT_POUNDAGE_CALCULATED_FIELDS = new Set([
  "poundageRcColumn",
  "poundageRcBeamCarpark",
  "poundageRcBeamTypical",
  "poundageRcSlab",
  "poundageShearWall",
  "poundageOverall"
]);

const CONSULTANT_POUNDAGE_GUIDES = {
  highRise: {
    poundageRcColumn: { text: "200 – 250 kg/m³", max: 250 },
    poundageRcBeamCarpark: { text: "200 – 225 kg/m³", max: 225 },
    poundageRcBeamTypical: { text: "25 – 140 kg/m³", max: 140 },
    // The row allows BRC or rebar. Use the highest permitted guide ceiling.
    poundageRcSlab: { text: "50 – 60 (BRC) / 70 – 90 (rebar) kg/m³", max: 90 },
    poundageShearWall: { text: "100 – 105 kg/m³", max: 105 },
    poundageOverall: null
  },
  landed: {
    poundageRcColumn: { text: "150 – 215 kg/m³", max: 215 },
    poundageRcBeamCarpark: { text: "115 – 150 kg/m³", max: 150 },
    poundageRcBeamTypical: null,
    // The row allows BRC or rebar. Use the highest permitted guide ceiling.
    poundageRcSlab: { text: "60 – 60 (BRC) / 70 – 90 (rebar) kg/m³", max: 90 },
    poundageShearWall: null,
    poundageOverall: { text: "90 – 100 kg/m³", max: 100 }
  }
};

let activePoundageCalculatorField = "";

function isConsultantPoundageCalculatedField(fieldKey){
  return CONSULTANT_POUNDAGE_CALCULATED_FIELDS.has(fieldKey);
}

function consultantPoundageBuildingTypeKey(){
  return String(state.formData.buildingType || "")
    .trim()
    .toLowerCase() === "landed"
      ? "landed"
      : "highRise";
}

function consultantPoundageGuide(fieldKey){
  const typeKey = consultantPoundageBuildingTypeKey();
  return CONSULTANT_POUNDAGE_GUIDES[typeKey]?.[fieldKey] || null;
}

function consultantPoundageExceedsGuide(fieldKey, value){
  const guide = consultantPoundageGuide(fieldKey);
  const numericValue = Number(value);

  return !!(
    guide &&
    Number.isFinite(guide.max) &&
    Number.isFinite(numericValue) &&
    numericValue > guide.max
  );
}

function ensurePoundageDetailsStore(){
  if(
    !state.formData.poundageDetails ||
    typeof state.formData.poundageDetails !== "object" ||
    Array.isArray(state.formData.poundageDetails)
  ){
    state.formData.poundageDetails = {};
  }

  return state.formData.poundageDetails;
}

function getPoundageDetail(fieldKey){
  const store = ensurePoundageDetailsStore();
  const existing = store[fieldKey];

  if(!existing || typeof existing !== "object"){
    store[fieldKey] = {
      steelWeight: "",
      concreteVolume: "",
      exceedReason: ""
    };
  }else if(typeof existing.exceedReason !== "string"){
    existing.exceedReason = "";
  }

  return store[fieldKey];
}

function poundageFieldLabel(fieldKey){
  for(const section of OVERVIEW_SECTIONS){
    if(section.title !== "Poundage") continue;
    const row = section.rows.find(item => item.key === fieldKey);
    if(row){
      return consultantPoundageRowLabel(fieldKey, row.label);
    }
  }

  return "Poundage";
}

function calculatePoundageValue(steelWeight, concreteVolume){
  const steel = Number(steelWeight);
  const concrete = Number(concreteVolume);

  if(
    !Number.isFinite(steel) ||
    !Number.isFinite(concrete) ||
    steel < 0 ||
    concrete <= 0
  ){
    return null;
  }

  return steel / concrete;
}

function setPoundageExceedanceUI(fieldKey, value){
  const warning = $("poundageExceedWarning");
  const reasonInput = $("poundageExceedReasonInput");
  const resultEl = $("poundageCalculatedResult");
  const resultPanel = resultEl?.closest(".poundage-result-panel");

  const isExceeding = consultantPoundageExceedsGuide(fieldKey, value);

  if(resultEl){
    resultEl.classList.toggle("poundage-result-exceeded", isExceeding);
  }
  if(resultPanel){
    resultPanel.classList.toggle("is-exceeding", isExceeding);
  }
  if(warning){
    warning.classList.toggle("hidden", !isExceeding);
  }

  if(!isExceeding && reasonInput){
    reasonInput.setAttribute("aria-required", "false");
  }else if(reasonInput){
    reasonInput.setAttribute("aria-required", "true");
  }

  return isExceeding;
}

function updatePoundageCalculatorPreview(){
  const steelInput = $("poundageSteelWeightInput");
  const concreteInput = $("poundageConcreteVolumeInput");
  const resultEl = $("poundageCalculatedResult");
  const errorEl = $("poundageCalculatorError");

  if(!steelInput || !concreteInput || !resultEl || !errorEl) return;

  errorEl.textContent = "";

  const steelRaw = steelInput.value;
  const concreteRaw = concreteInput.value;

  if(steelRaw === "" || concreteRaw === ""){
    resultEl.textContent = "—";
    setPoundageExceedanceUI(activePoundageCalculatorField, null);
    return;
  }

  const concrete = Number(concreteRaw);
  if(!Number.isFinite(concrete) || concrete <= 0){
    resultEl.textContent = "—";
    setPoundageExceedanceUI(activePoundageCalculatorField, null);
    errorEl.textContent = "Concrete Volume must be greater than 0 m³.";
    return;
  }

  const value = calculatePoundageValue(steelRaw, concreteRaw);
  if(value === null){
    resultEl.textContent = "—";
    setPoundageExceedanceUI(activePoundageCalculatorField, null);
    errorEl.textContent = "Enter valid non-negative values.";
    return;
  }

  resultEl.textContent = `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} kg/m³`;

  setPoundageExceedanceUI(activePoundageCalculatorField, value);
}

function openPoundageCalculator(fieldKey){
  if(!isConsultantPoundageCalculatedField(fieldKey)) return;

  if(!hasSelectedProject()){
    alert("Select a project first.");
    return;
  }

  activePoundageCalculatorField = fieldKey;
  const detail = getPoundageDetail(fieldKey);

  const modalTitle = poundageFieldLabel(fieldKey)
    .replace(/\s*,\s*kg\/m³\s*$/i, "")
    .replace(/\s*\(kg\/m³\)\s*$/i, "");
  $("poundageCalculatorTitle").textContent = modalTitle;
  $("poundageCalculatorSubtitle").textContent = canEditCurrentSubmissionV31() ? "" : "Read only · submitted calculation";
  $("poundageSteelWeightInput").value = detail.steelWeight ?? "";
  $("poundageConcreteVolumeInput").value = detail.concreteVolume ?? "";
  $("poundageExceedReasonInput").value = detail.exceedReason ?? "";
  $("poundageCalculatorError").textContent = "";

  updatePoundageCalculatorPreview();
  $("poundageCalculatorModal").classList.remove("hidden");
  refreshSubmissionModalPermissionsV31();

  requestAnimationFrame(() => {
    $("poundageSteelWeightInput").focus();
  });
}

function closePoundageCalculator(){
  $("poundageCalculatorModal").classList.add("hidden");
  activePoundageCalculatorField = "";
  $("poundageCalculatorError").textContent = "";
}

function consultantPoundageMissingReasonField(){
  for(const fieldKey of CONSULTANT_POUNDAGE_CALCULATED_FIELDS){
    const value = state.formData[fieldKey];
    if(!consultantPoundageExceedsGuide(fieldKey, value)) continue;

    const reason = getPoundageDetail(fieldKey).exceedReason;
    if(!String(reason || "").trim()){
      return fieldKey;
    }
  }

  return "";
}

function applyPoundageCalculation(){
  if(!canEditCurrentSubmissionV31()) return;
  const fieldKey = activePoundageCalculatorField;
  if(!isConsultantPoundageCalculatedField(fieldKey)) return;

  const steelRaw = $("poundageSteelWeightInput").value;
  const concreteRaw = $("poundageConcreteVolumeInput").value;
  const reasonRaw = $("poundageExceedReasonInput").value.trim();
  const errorEl = $("poundageCalculatorError");

  if(steelRaw === "" || concreteRaw === ""){
    errorEl.textContent = "Please fill in both Steel Weight and Concrete Volume.";
    return;
  }

  const value = calculatePoundageValue(steelRaw, concreteRaw);
  if(value === null){
    errorEl.textContent = "Concrete Volume must be greater than 0 m³ and both values must be valid.";
    return;
  }

  const isExceeding = consultantPoundageExceedsGuide(fieldKey, value);
  if(isExceeding && !reasonRaw){
    errorEl.textContent = "Remark is required.";
    $("poundageExceedReasonInput").focus();
    return;
  }

  const store = ensurePoundageDetailsStore();
  store[fieldKey] = {
    steelWeight: steelRaw,
    concreteVolume: concreteRaw,
    exceedReason: isExceeding ? reasonRaw : "",
    exceeded: isExceeding
  };

  state.formData[fieldKey] = Number(value.toFixed(2));

  closePoundageCalculator();
  renderOverviewTable();
  updateSaveStatus(
    isExceeding
      ? `${poundageFieldLabel(fieldKey)} exceeds the internal reference. Remark recorded.`
      : `${poundageFieldLabel(fieldKey)} calculated automatically.`
  );
}

function bindPoundageCalculatorEvents(){
  $("overviewTableBody").addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-poundage-calculator]");
    if(!trigger) return;

    openPoundageCalculator(trigger.dataset.openPoundageCalculator);
  });

  ["poundageSteelWeightInput", "poundageConcreteVolumeInput"].forEach(id => {
    $(id).addEventListener("input", updatePoundageCalculatorPreview);
  });

  $("applyPoundageCalculation").addEventListener("click", applyPoundageCalculation);
  $("closePoundageCalculatorModal").addEventListener("click", closePoundageCalculator);
  $("cancelPoundageCalculatorModal").addEventListener("click", closePoundageCalculator);

  $("poundageCalculatorModal").addEventListener("click", (event) => {
    if(event.target === $("poundageCalculatorModal")){
      closePoundageCalculator();
    }
  });
}
