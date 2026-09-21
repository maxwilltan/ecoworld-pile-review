/* ------------------------------------------------------------
   Internal Pile Check
   ------------------------------------------------------------ */

function pileReferenceRate(pileType,pileSize){
  const row =
    managementPileReference()
      .find(item =>
        item.pileType === pileType &&
        String(item.pileSize) === String(pileSize)
      );

  if(!row) return null;

  const value =
    Number(row.averagePrice);

  return row.averagePrice !== "" &&
    Number.isFinite(value)
      ? value
      : null;
}

function managementSubmissionById(id){
  return getSubmissions()
    .find(item =>
      item.id === id
    ) || null;
}

function consultantPileRowCalculation(row){
  const count =
    numberOrNull(row.numberOfPiles);

  const capacity =
    findManagementPileCapacity(
      row.pileType,
      row.pileSize
    );

  const load =
    numberOrNull(row.columnLoading);

  const totalCapacity =
    count !== null &&
    capacity !== null
      ? count * capacity
      : null;

  const efficiency =
    totalCapacity &&
    load !== null
      ? load / totalCapacity
      : null;

  const rate =
    pileReferenceRate(
      row.pileType,
      row.pileSize
    );

  const cost =
    rate !== null &&
    count !== null
      ? rate * count
      : null;

  return {
    count,
    capacity,
    load,
    totalCapacity,
    efficiency,
    rate,
    cost
  };
}

function managementProposalRowCalculation(row){
  const count =
    numberOrNull(row.numberOfPiles);

  const capacity =
    findManagementPileCapacity(
      row.pileType,
      row.pileSize
    );

  const load =
    numberOrNull(row.columnLoading);

  const totalCapacity =
    count !== null &&
    capacity !== null
      ? count * capacity
      : null;

  const efficiency =
    totalCapacity &&
    load !== null
      ? load / totalCapacity
      : null;

  const rate =
    pileReferenceRate(
      row.pileType,
      row.pileSize
    );

  const cost =
    rate !== null &&
    count !== null
      ? rate * count
      : null;

  return {
    count,
    capacity,
    load,
    totalCapacity,
    efficiency,
    rate,
    cost
  };
}

function consultantRowAsManagementProposal(row){
  return {
    columnNumber:row.columnNumber || "",
    columnLoading:row.columnLoading || "",
    pileType:row.pileType || "",
    pileSize:String(row.pileSize || ""),
    numberOfPiles:String(row.numberOfPiles || "")
  };
}

function findBestManagementPileProposal(consultantRow){
  const consultant = consultantPileRowCalculation(consultantRow);

  // Every row can be auto-optimised. Search all configured pile references
  // and practical pile quantities, then choose the most suitable valid design.
  // Suitability priority: lowest total cost, then fewer piles, then an
  // efficiency closest to 90% within the accepted 80%-100% range.
  if(
    consultant.load === null ||
    consultant.load <= 0
  ){
    return null;
  }

  const loading = consultant.load;
  const refs = managementPileReference()
    .filter(row => Number(row.pileCapacity) > 0);

  const candidates = [];

  refs.forEach(ref => {
    const capacity = Number(ref.pileCapacity);
    const rate = pileReferenceRate(ref.pileType, ref.pileSize);

    // A known rate is required so Auto can genuinely select the cheapest
    // suitable option instead of guessing about cost.
    if(rate === null) return;

    for(let count = 1; count <= 20; count += 1){
      const totalCapacity = capacity * count;
      const efficiency = loading / totalCapacity;
      const cost = rate * count;

      if(efficiency < .80 || efficiency > 1.00){
        continue;
      }

      candidates.push({
        pileType:ref.pileType,
        pileSize:String(ref.pileSize),
        numberOfPiles:String(count),
        columnLoading:String(consultantRow.columnLoading || ""),
        efficiency,
        cost,
        capacity
      });
    }
  });

  if(!candidates.length){
    return null;
  }

  candidates.sort((a,b) => {
    if(a.cost !== b.cost){
      return a.cost - b.cost;
    }

    const pileDifference =
      Number(a.numberOfPiles) - Number(b.numberOfPiles);

    if(pileDifference !== 0){
      return pileDifference;
    }

    const efficiencyDifference =
      Math.abs(a.efficiency - .90) -
      Math.abs(b.efficiency - .90);

    if(efficiencyDifference !== 0){
      return efficiencyDifference;
    }

    return a.capacity - b.capacity;
  });

  return candidates[0];
}

function loadStoredManagementPileProposal(submissionId){
  const store =
    loadStorage(
      ECO_FRESH_STORAGE.pileOptimisation,
      {}
    );

  return Array.isArray(store[submissionId])
    ? store[submissionId]
    : null;
}

function saveStoredManagementPileProposal(){
  if(!managementPileCheckSubmissionId){
    return;
  }

  const store =
    loadStorage(
      ECO_FRESH_STORAGE.pileOptimisation,
      {}
    );

  store[managementPileCheckSubmissionId] =
    managementPileProposalRows;

  saveStorage(
    ECO_FRESH_STORAGE.pileOptimisation,
    store
  );
}

function initialiseManagementPileProposal(submission){
  const consultantRows =
    Array.isArray(submission.formData?.loadingCapacityRows)
      ? submission.formData.loadingCapacityRows
      : [];

  const stored =
    loadStoredManagementPileProposal(submission.id);

  managementPileProposalRows =
    consultantRows.map((row,index) => {
      const base = consultantRowAsManagementProposal(row);

      const storedRow =
        stored && stored.length === consultantRows.length
          ? stored[index]
          : null;

      // Opening Pile Check does not auto-change a row. Keep the last internal
      // selection when available; otherwise begin from the Consultant design.
      // Auto is applied only when the user clicks the Auto button.
      if(storedRow){
        return {
          ...base,
          ...storedRow,
          columnNumber:base.columnNumber,
          columnLoading:base.columnLoading
        };
      }

      return base;
    });
}

function managementPileTotals(){
  const submission =
    managementSubmissionById(
      managementPileCheckSubmissionId
    );

  const consultantRows =
    submission?.formData?.loadingCapacityRows || [];

  let consultantPiles = 0;
  let consultantCapacity = 0;
  let consultantLoading = 0;
  let consultantCost = 0;
  let consultantCostComplete = true;

  let proposalPiles = 0;
  let proposalCapacity = 0;
  let proposalLoading = 0;
  let proposalCost = 0;
  let proposalCostComplete = true;

  consultantRows.forEach(row => {
    const calc =
      consultantPileRowCalculation(row);

    if(calc.count !== null){
      consultantPiles += calc.count;
    }

    if(calc.totalCapacity !== null){
      consultantCapacity += calc.totalCapacity;
    }

    if(calc.load !== null){
      consultantLoading += calc.load;
    }

    if(calc.cost === null){
      consultantCostComplete = false;
    }else{
      consultantCost += calc.cost;
    }
  });

  managementPileProposalRows.forEach(row => {
    const calc =
      managementProposalRowCalculation(row);

    if(calc.count !== null){
      proposalPiles += calc.count;
    }

    if(calc.totalCapacity !== null){
      proposalCapacity += calc.totalCapacity;
    }

    if(calc.load !== null){
      proposalLoading += calc.load;
    }

    if(calc.cost === null){
      proposalCostComplete = false;
    }else{
      proposalCost += calc.cost;
    }
  });

  return {
    consultantPiles,
    consultantCapacity,
    consultantLoading,
    consultantEfficiency:
      consultantCapacity > 0
        ? consultantLoading /
          consultantCapacity
        : null,
    consultantCost,
    consultantCostComplete,

    proposalPiles,
    proposalCapacity,
    proposalLoading,
    proposalEfficiency:
      proposalCapacity > 0
        ? proposalLoading /
          proposalCapacity
        : null,
    proposalCost,
    proposalCostComplete
  };
}

function moneyDisplay(value){
  return Number(value)
    .toLocaleString(
      undefined,
      {
        style:"currency",
        currency:"MYR",
        maximumFractionDigits:0
      }
    );
}

function pileCapacityDisplay(value){
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString(undefined,{ maximumFractionDigits:0 })
    : "—";
}

function renderManagementPileSummary(){
  const totals =
    managementPileTotals();

  if(
    totals.consultantCostComplete &&
    totals.proposalCostComplete
  ){
    const saving =
      totals.consultantCost -
      totals.proposalCost;

    $("managementPileSaving").textContent =
      moneyDisplay(saving);

    $("managementPileSavingHint").textContent =
      saving >= 0
        ? "Potential saving against Consultant submission"
        : "Internal reference is currently more expensive";
  }else{
    $("managementPileSaving").textContent =
      "TBC";

    $("managementPileSavingHint").textContent =
      "Complete missing prices in Pile Reference";
  }

  const quantityDiff =
    totals.proposalPiles -
    totals.consultantPiles;

  $("managementPileQuantityDifference").textContent =
    `${quantityDiff > 0 ? "+" : ""}${quantityDiff}`;

  $("managementPileQuantityHint").textContent =
    quantityDiff > 0
      ? `Internal reference uses ${quantityDiff} more pile${quantityDiff === 1 ? "" : "s"}`
      : quantityDiff < 0
        ? `Internal reference uses ${Math.abs(quantityDiff)} fewer pile${Math.abs(quantityDiff) === 1 ? "" : "s"}`
        : "Same total pile quantity";

  if(
    totals.consultantEfficiency !== null &&
    totals.proposalEfficiency !== null
  ){
    const diff =
      (
        totals.proposalEfficiency -
        totals.consultantEfficiency
      ) * 100;

    const rounded =
      Number(diff.toFixed(1));

    $("managementPileEfficiencyDifference").textContent =
      `${rounded > 0 ? "+" : ""}${rounded}%`;

    $("managementPileEfficiencyHint").textContent =
      rounded > 0
        ? "Internal reference has higher overall efficiency"
        : rounded < 0
          ? "Internal reference has lower overall efficiency"
          : "Same overall pile efficiency";
  }else{
    $("managementPileEfficiencyDifference").textContent =
      "—";

    $("managementPileEfficiencyHint").textContent =
      "Complete loading and capacity data";
  }
}

function renderManagementPileOverallRow(){
  const totals = managementPileTotals();

  const consultantCost =
    totals.consultantCostComplete
      ? moneyDisplay(totals.consultantCost)
      : "TBC";

  const proposalCost =
    totals.proposalCostComplete
      ? moneyDisplay(totals.proposalCost)
      : "TBC";

  return `
    <tr class="management-pile-total-row">
      <td class="management-pile-total-label">Total / Overall</td>
      <td class="management-pile-total-value">${escapeHtml(pileCapacityDisplay(totals.consultantLoading))}</td>

      <td class="management-pile-total-muted">—</td>
      <td class="management-pile-total-muted">—</td>
      <td class="management-pile-total-value">${escapeHtml(String(totals.consultantPiles))}</td>
      <td class="management-pile-total-value">${escapeHtml(pileCapacityDisplay(totals.consultantCapacity))}</td>
      <td class="management-pile-total-value ${escapeHtml(loadingEfficiencyClass(totals.consultantEfficiency))}">${escapeHtml(formatLoadingEfficiency(totals.consultantEfficiency))}</td>
      <td class="management-pile-total-value">${escapeHtml(consultantCost)}</td>

      <td class="management-pile-total-muted">—</td>
      <td class="management-pile-total-muted">—</td>
      <td class="management-pile-total-value">${escapeHtml(String(totals.proposalPiles))}</td>
      <td class="management-pile-total-value">${escapeHtml(pileCapacityDisplay(totals.proposalCapacity))}</td>
      <td class="management-pile-total-value ${escapeHtml(loadingEfficiencyClass(totals.proposalEfficiency))}">${escapeHtml(formatLoadingEfficiency(totals.proposalEfficiency))}</td>
      <td class="management-pile-total-value">${escapeHtml(proposalCost)}</td>
      <td class="management-pile-total-muted">—</td>
    </tr>
  `;
}

function renderManagementPileCheck(){
  const submission =
    managementSubmissionById(
      managementPileCheckSubmissionId
    );

  if(!submission) return;

  const consultantRows =
    submission.formData?.loadingCapacityRows || [];

  $("managementPileCheckMeta").textContent =
    `${submission.project || "Project"} · ${submission.revision || ""}`;

  const body =
    $("managementPileCheckBody");

  if(!consultantRows.length){
    body.innerHTML = `
      <tr>
        <td colspan="15" class="management-pile-empty">
          Consultant did not submit Loading &amp; Capacity rows.
        </td>
      </tr>
    `;

    renderManagementPileSummary();
    return;
  }

  body.innerHTML =
    consultantRows.map((row,index) => {
      const consultant =
        consultantPileRowCalculation(row);

      const proposal =
        managementPileProposalRows[index] || {};

      // Always use the current Consultant loading for the internal calculation.
      // This prevents an older saved proposal from showing a stale efficiency.
      proposal.columnNumber = row.columnNumber || "";
      proposal.columnLoading = row.columnLoading || "";

      const proposalCalc =
        managementProposalRowCalculation(proposal);

      const proposalTypes =
        pileTypesFromManagementReference();

      const proposalSizes =
        pileSizesFromManagementReference(
          proposal.pileType
        );

      return `
        <tr>
          <td>${escapeHtml(row.columnNumber || `C${index + 1}`)}</td>
          <td>${escapeHtml(row.columnLoading || "—")}</td>

          <td>${escapeHtml(row.pileType || "—")}</td>
          <td>${escapeHtml(row.pileSize || "—")}</td>
          <td>${escapeHtml(row.numberOfPiles || "—")}</td>
          <td>${escapeHtml(pileCapacityDisplay(consultant.totalCapacity))}</td>
          <td class="${escapeHtml(loadingEfficiencyClass(consultant.efficiency))}">${escapeHtml(formatLoadingEfficiency(consultant.efficiency))}</td>
          <td>${
            consultant.cost !== null
              ? escapeHtml(moneyDisplay(consultant.cost))
              : "TBC"
          }</td>

          <td>
            <select
              data-management-pile-index="${index}"
              data-management-pile-field="pileType"
            >
              ${proposalTypes.map(type => `
                <option
                  value="${escapeHtml(type)}"
                  ${proposal.pileType === type ? "selected" : ""}
                >${escapeHtml(type)}</option>
              `).join("")}
            </select>
          </td>

          <td>
            <select
              data-management-pile-index="${index}"
              data-management-pile-field="pileSize"
            >
              ${proposalSizes.map(size => `
                <option
                  value="${escapeHtml(size)}"
                  ${String(proposal.pileSize) === String(size) ? "selected" : ""}
                >${escapeHtml(size)}</option>
              `).join("")}
            </select>
          </td>

          <td>
            <input
              type="number"
              min="1"
              max="20"
              value="${escapeHtml(proposal.numberOfPiles || "")}"
              data-management-pile-index="${index}"
              data-management-pile-field="numberOfPiles"
            />
          </td>

          <td>${escapeHtml(pileCapacityDisplay(proposalCalc.totalCapacity))}</td>
          <td class="${escapeHtml(loadingEfficiencyClass(proposalCalc.efficiency))}">${escapeHtml(formatLoadingEfficiency(proposalCalc.efficiency))}</td>
          <td>${
            proposalCalc.cost !== null
              ? escapeHtml(moneyDisplay(proposalCalc.cost))
              : "TBC"
          }</td>

          <td>
            <button
              type="button"
              class="management-row-auto-btn"
              data-management-auto-row="${index}"
            >Auto</button>
          </td>
        </tr>
      `;
    }).join("") + renderManagementPileOverallRow();

  renderManagementPileSummary();
}

function openManagementPileCheck(submissionId){
  const submission =
    managementSubmissionById(submissionId);

  if(!submission) return;

  managementPileCheckSubmissionId =
    submissionId;

  initialiseManagementPileProposal(submission);

  renderManagementPileCheck();

  $("managementPileCheckModal")
    .classList.remove("hidden");

  document.body
    .classList.add("modal-open");
}

function closeManagementPileCheck(){
  saveStoredManagementPileProposal();

  $("managementPileCheckModal")
    .classList.add("hidden");

  document.body
    .classList.remove("modal-open");
}

function autoOptimiseManagementRow(index){
  const submission =
    managementSubmissionById(managementPileCheckSubmissionId);

  const consultantRow =
    submission?.formData?.loadingCapacityRows?.[index];

  const row = managementPileProposalRows[index];

  if(!row || !consultantRow) return;

  const best = findBestManagementPileProposal(consultantRow);

  if(!best) return;

  managementPileProposalRows[index] = {
    ...row,
    columnNumber:consultantRow.columnNumber || "",
    columnLoading:consultantRow.columnLoading || "",
    pileType:best.pileType,
    pileSize:best.pileSize,
    numberOfPiles:best.numberOfPiles
  };

  renderManagementPileCheck();
}
