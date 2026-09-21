function managementPileReference(){
  const stored = loadStorage(
    ECO_FRESH_STORAGE.pileReference ||
      "eco_fresh_management_pile_reference_v1",
    null
  );

  if(Array.isArray(stored) && stored.length){
    return stored;
  }

  return MANAGEMENT_PILE_CAPACITY_REFERENCE.map(item => ({...item}));
}

function pileTypesFromManagementReference(){
  return [
    ...new Set(
      managementPileReference()
        .map(item => item.pileType)
        .filter(Boolean)
    )
  ];
}

function pileSizesFromManagementReference(pileType){
  return managementPileReference()
    .filter(item => item.pileType === pileType)
    .map(item => String(item.pileSize))
    .filter(Boolean);
}

function findManagementPileCapacity(pileType, pileSize){
  const match = managementPileReference().find(item =>
    item.pileType === pileType &&
    String(item.pileSize) === String(pileSize)
  );

  return match
    ? Number(match.pileCapacity)
    : null;
}

function createBlankLoadingRow(){
  const pileType =
    pileTypesFromManagementReference()[0] ||
    "Spun Piles";

  const pileSize =
    pileSizesFromManagementReference(pileType)[0] ||
    "";

  return {
    columnNumber: "",
    pileType,
    pileSize,
    numberOfPiles: "",
    columnLoading: ""
  };
}

function formatLoadingNumber(value, digits = 2){
  if(value === null || value === undefined || !Number.isFinite(Number(value))){
    return "—";
  }

  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits
  });
}

function formatLoadingEfficiency(value){
  if(value === null || value === undefined || !Number.isFinite(Number(value))){
    return "—";
  }
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function loadingEfficiencyClass(value){
  if(value === null || value === undefined || !Number.isFinite(Number(value))){
    return "";
  }

  const pct = Number(value) * 100;

  // Below 80% = over-designed / optimisation required.
  if(pct < 80) return "efficiency-low";

  // 80% to 100% = acceptable; no optimisation required.
  if(pct <= 100) return "efficiency-good";

  // Above 100% = loading exceeds the available pile capacity.
  return "efficiency-high";
}

function renderLoadingCapacityModal(){
  const rows = ensureLoadingCapacityRows();
  const body = $("loadingCapacityTableBody");

  if(!rows.length){
    body.innerHTML = `
      <tr>
        <td colspan="9" class="loading-empty-row">
          No rows yet. Add a row or paste data from Excel.
        </td>
      </tr>
    `;
  }else{
    body.innerHTML = rows.map((row, index) => {
      const calc = loadingRowCalculation(row);

      return `
        <tr>
          <td>
            <input
              type="text"
              value="${escapeHtml(row.columnNumber || "")}"
              data-loading-index="${index}"
              data-loading-field="columnNumber"
              placeholder="C1"
            />
          </td>

          <td>
            <select
              data-loading-index="${index}"
              data-loading-field="pileType"
            >
              ${pileTypesFromManagementReference().map(type => `
                <option value="${type}" ${row.pileType === type ? "selected" : ""}>${type}</option>
              `).join("")}
            </select>
          </td>

          <td>
            <select
              data-loading-index="${index}"
              data-loading-field="pileSize"
            >
              ${pileSizesFromManagementReference(row.pileType).map(size => `
                <option value="${size}" ${String(row.pileSize) === String(size) ? "selected" : ""}>${size}</option>
              `).join("")}
            </select>
          </td>

          <td>
            <input
              type="number"
              min="0"
              value="${escapeHtml(row.numberOfPiles || "")}"
              data-loading-index="${index}"
              data-loading-field="numberOfPiles"
              placeholder="4"
            />
          </td>

          <td class="calculated-cell management-reference-cell">
            <strong>${formatLoadingNumber(calc.capacityPerPile)}</strong>
          </td>

          <td class="calculated-cell">
            ${formatLoadingNumber(calc.totalCapacity)}
          </td>

          <td>
            <input
              type="number"
              min="0"
              step="0.01"
              value="${escapeHtml(row.columnLoading || "")}"
              data-loading-index="${index}"
              data-loading-field="columnLoading"
              placeholder="6500"
            />
          </td>

          <td class="calculated-cell ${loadingEfficiencyClass(calc.efficiency)}">
            ${formatLoadingEfficiency(calc.efficiency)}
          </td>

          <td class="loading-remove-cell">
            <button
              type="button"
              class="loading-remove-btn"
              data-remove-loading-row="${index}"
              aria-label="Remove row"
            >×</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  const totals = syncLoadingSummaryToForm();

  $("modalTotalColumnLoading").textContent =
    `${formatLoadingNumber(totals.totalLoading)} kN`;

  $("modalTotalPilesCapacity").textContent =
    `${formatLoadingNumber(totals.totalCapacity)} kN`;

  $("modalOverallPileEfficiency").textContent =
    totals.overallEfficiency === null
      ? "—"
      : formatLoadingEfficiency(totals.overallEfficiency);

  $("loadingFooterTotalPiles").textContent =
    formatLoadingNumber(totals.totalPiles, 0);

  $("loadingFooterCapacity").textContent =
    formatLoadingNumber(totals.totalCapacity);

  $("loadingFooterLoading").textContent =
    formatLoadingNumber(totals.totalLoading);

  $("loadingFooterEfficiency").textContent =
    totals.overallEfficiency === null
      ? "—"
      : formatLoadingEfficiency(totals.overallEfficiency);
  refreshSubmissionModalPermissionsV31();
}

function openLoadingCapacityModal(){
  if(!hasSelectedProject()){
    alert("Select a project first.");
    return;
  }

  ensureLoadingCapacityRows();
  renderLoadingCapacityModal();
  $("loadingCapacityModal").classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeLoadingCapacityModal(){
  $("loadingCapacityModal").classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function addLoadingCapacityRow(){
  if(!canEditCurrentSubmissionV31()) return;
  ensureLoadingCapacityRows().push(createBlankLoadingRow());
  renderLoadingCapacityModal();
}

function removeLoadingCapacityRow(index){
  if(!canEditCurrentSubmissionV31()) return;
  const rows = ensureLoadingCapacityRows();
  rows.splice(index, 1);
  renderLoadingCapacityModal();
}

function updateLoadingCapacityRow(index, field, value){
  if(!canEditCurrentSubmissionV31()) return;
  const rows = ensureLoadingCapacityRows();
  const row = rows[index];
  if(!row) return;

  row[field] = value;

  if(field === "pileType"){
    const availableSizes =
      pileSizesFromManagementReference(value);

    row.pileSize =
      availableSizes.includes(String(row.pileSize))
        ? String(row.pileSize)
        : (availableSizes[0] || "");
  }

  renderLoadingCapacityModal();
}

function normalisePastedPileType(value){
  const text = String(value || "").trim().toLowerCase();

  if(text.includes("bored")) return "Bored Piles";
  if(text.includes("spun")) return "Spun Piles";
  if(text.includes("rc")) return "RC Piles";

  return value || "Spun Piles";
}

function isExcelLoadingHeaderRow(cells){
  const joined = cells
    .map(cell => String(cell || "").trim().toLowerCase())
    .join(" ");

  return (
    joined.includes("column numbering") ||
    joined.includes("column no") ||
    (
      joined.includes("pile size") &&
      joined.includes("column loading")
    )
  );
}

function normalisePastedPileSize(pileType, value){
  const requested = String(value || "").trim();
  const sizes = pileSizesFromManagementReference(pileType);

  if(sizes.includes(requested)){
    return requested;
  }

  return requested || sizes[0] || "";
}

function parseExcelLoadingRows(rawText){
  const text = String(rawText || "").trim();
  if(!text) return [];

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const parsedRows = [];

  lines.forEach(line => {
    const cells = line.includes("\t")
      ? line.split("\t").map(cell => cell.trim())
      : line.split(",").map(cell => cell.trim());

    if(!cells.length || isExcelLoadingHeaderRow(cells)){
      return;
    }

    const pileType =
      normalisePastedPileType(cells[1]);

    let columnLoading = "";

    // New recommended format:
    // Column | Type | Size | No Piles | Column Loading
    if(cells.length === 5){
      columnLoading = cells[4] || "";
    }
    // Old compact V9/V10 format:
    // Column | Type | Size | No Piles | Capacity/Pile | Column Loading
    else if(cells.length === 6){
      columnLoading = cells[5] || "";
    }
    // Full copied table:
    // Column | Type | Size | No Piles | Capacity/Pile |
    // Total Capacity | Column Loading | Efficiency
    else if(cells.length >= 7){
      columnLoading = cells[6] || "";
    }

    const row = {
      columnNumber: cells[0] || "",
      pileType,
      pileSize:
        normalisePastedPileSize(
          pileType,
          cells[2]
        ),
      numberOfPiles: cells[3] || "",
      columnLoading
    };

    const hasUsefulValue = Object.values(row).some(
      value => String(value || "").trim() !== ""
    );

    if(hasUsefulValue){
      parsedRows.push(row);
    }
  });

  return parsedRows;
}

function importExcelLoadingRows(){
  if(!canEditCurrentSubmissionV31()) return;
  const rows = parseExcelLoadingRows(
    $("excelPasteInput").value
  );

  if(!rows.length){
    alert("Paste at least one Excel row first.");
    return;
  }

  state.formData.loadingCapacityRows = rows;
  renderLoadingCapacityModal();
  $("excelPastePanel").classList.add("hidden");
  $("excelPasteInput").value = "";
}

function applyLoadingCapacityToSubmission(){
  if(!canEditCurrentSubmissionV31()) return;
  syncLoadingSummaryToForm();
  renderOverviewTable();
  updateSaveStatus("Loading & capacity table updated.");
  closeLoadingCapacityModal();
}
