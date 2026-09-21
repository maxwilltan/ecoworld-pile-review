/* Search Project results use the same checkbox comparison selection as Select Project. */

function renderManagementOverviewProjectSearchV20(query){
  const results = $("managementOverviewProjectSearchResults");
  if(!results) return;

  const normalized = String(query || "").trim().toLowerCase();
  results.innerHTML = "";

  if(!normalized){
    closeManagementOverviewProjectSearchV20();
    return;
  }

  const latest = [...managementLatestSubmissionMapV103().entries()]
    .map(([key,item]) => ({ key, item }))
    .filter(({item}) => {
      return String(item.project || "").toLowerCase().includes(normalized) ||
        String(item.businessUnit || "").toLowerCase().includes(normalized) ||
        String(item.region || "").toLowerCase().includes(normalized);
    })
    .sort((a,b) => String(a.item.project || "").localeCompare(String(b.item.project || "")))
    .slice(0,20);

  if(!latest.length){
    results.innerHTML = `<div class="project-search-empty">No project found</div>`;
    results.classList.remove("hidden");
    return;
  }

  results.innerHTML = latest.map(({key,item}) => {
    const checked = managementOverviewSelectedProjectKeysV103.has(key);
    return `
      <label class="project-search-result management-search-checkbox-result ${checked ? "selected" : ""}">
        <input
          type="checkbox"
          data-management-search-checkbox-v116="${escapeHtml(key)}"
          ${checked ? "checked" : ""}
        />
        <span class="management-search-checkbox-copy">
          <strong>${escapeHtml(item.project || "Project")}</strong>
          <small>${escapeHtml(item.region || "—")} · ${escapeHtml(item.businessUnit || "—")}</small>
        </span>
      </label>
    `;
  }).join("");

  results.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  const results = $("managementOverviewProjectSearchResults");
  if(!results) return;

  results.addEventListener("change", event => {
    const checkbox = event.target.closest("[data-management-search-checkbox-v116]");
    if(!checkbox) return;
    event.stopPropagation();

    const key = checkbox.dataset.managementSearchCheckboxV116;
    if(!key) return;

    if(checkbox.checked) managementOverviewSelectedProjectKeysV103.add(key);
    else managementOverviewSelectedProjectKeysV103.delete(key);

    checkbox.closest(".management-search-checkbox-result")
      ?.classList.toggle("selected", checkbox.checked);

    const selectProjectCheckbox = document.querySelector(
      `[data-management-project-checkbox-v103="${CSS.escape(key)}"]`
    );
    if(selectProjectCheckbox){
      selectProjectCheckbox.checked = checkbox.checked;
      selectProjectCheckbox.closest(".internal-project-multiselect-option")
        ?.classList.toggle("selected", checkbox.checked);
    }

    const selectProjectLabel = $("managementOverviewProjectMultiSelectLabel");
    if(selectProjectLabel) selectProjectLabel.textContent = managementProjectDropdownLabelV103();

    managementSyncComparisonSelectionsV103();
  });

  results.addEventListener("click", event => {
    if(event.target.closest("[data-management-search-checkbox-v116]")){
      event.stopPropagation();
      return;
    }

    const row = event.target.closest(".management-search-checkbox-result");
    if(!row) return;
    event.preventDefault();
    event.stopPropagation();

    const checkbox = row.querySelector("[data-management-search-checkbox-v116]");
    if(!checkbox) return;
    checkbox.checked = !checkbox.checked;
    checkbox.dispatchEvent(new Event("change", { bubbles:true }));
  });
});
