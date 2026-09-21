/* ============================================================
   Internal Pile Check from Comparison > Pile Efficiency & Loading
   ============================================================ */

let managementPileCheckChooserV136 = null;

function managementComparisonSectionActionsV136(label, items = []){
  if(label === "Pilling Info"){
    return `
      <button
        type="button"
        class="management-pile-reference-comparison-btn-v124"
        data-open-management-pile-reference-v124="true"
      >Pile Reference</button>
    `;
  }

  if(label === "Pile Efficiency & Loading"){
    const disabled = !Array.isArray(items) || !items.length;
    return `
      <button
        type="button"
        class="management-pile-check-comparison-btn-v136"
        data-open-management-pile-check-v136="true"
        ${disabled ? "disabled" : ""}
        ${disabled ? 'title="Select a project first"' : 'title="Open Internal Pile Check"'}
      >Pile Check</button>
    `;
  }

  return "";
}

function ensureManagementPileCheckChooserV136(){
  if(managementPileCheckChooserV136) return managementPileCheckChooserV136;

  const chooser = document.createElement("div");
  chooser.id = "managementPileCheckChooserV136";
  chooser.className = "management-pile-check-chooser-v136 hidden";
  chooser.setAttribute("role", "dialog");
  chooser.setAttribute("aria-label", "Choose project revision for pile check");
  document.body.appendChild(chooser);
  managementPileCheckChooserV136 = chooser;
  return chooser;
}

function closeManagementPileCheckChooserV136(){
  const chooser = ensureManagementPileCheckChooserV136();
  chooser.classList.add("hidden");
  chooser.innerHTML = "";
}

function positionManagementPileCheckChooserV136(trigger, chooser){
  if(!trigger || !chooser) return;
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(320, Math.max(250, window.innerWidth - 24));
  let left = rect.right - width;
  left = Math.max(12, Math.min(left, window.innerWidth - width - 12));

  let top = rect.bottom + 7;
  const estimatedHeight = Math.min(300, 64 + chooser.querySelectorAll("[data-pile-check-submission-v136]").length * 48);
  if(top + estimatedHeight > window.innerHeight - 12){
    top = Math.max(12, rect.top - estimatedHeight - 7);
  }

  chooser.style.width = `${width}px`;
  chooser.style.left = `${Math.round(left)}px`;
  chooser.style.top = `${Math.round(top)}px`;
}

function managementPileCheckComparisonItemsV136(){
  if(typeof selectedManagementComparisonSubmissions !== "function") return [];
  const seen = new Set();
  return selectedManagementComparisonSubmissions().filter(item => {
    if(!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function openManagementPileCheckFromComparisonV136(trigger){
  const items = managementPileCheckComparisonItemsV136();
  if(!items.length) return;

  if(items.length === 1){
    closeManagementPileCheckChooserV136();
    openManagementPileCheck(items[0].id);
    return;
  }

  const chooser = ensureManagementPileCheckChooserV136();
  chooser.innerHTML = `
    <div class="management-pile-check-chooser-head-v136">
      <strong>Internal Pile Check</strong>
      <small>Choose a project revision</small>
    </div>
    <div class="management-pile-check-chooser-list-v136">
      ${items.map(item => {
        const year = typeof submissionYearLabel === "function"
          ? submissionYearLabel(item)
          : (item.year || "");
        return `
          <button
            type="button"
            class="management-pile-check-choice-v136"
            data-pile-check-submission-v136="${escapeHtml(item.id)}"
          >
            <strong>${escapeHtml(item.project || "Project")}</strong>
            <span>${escapeHtml(item.revision || "—")}${year ? ` · ${escapeHtml(year)}` : ""}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
  chooser.classList.remove("hidden");
  positionManagementPileCheckChooserV136(trigger, chooser);
}

function managementPileCheckModalIsOpenV136(){
  const modal = document.getElementById("managementPileCheckModal");
  return Boolean(modal && !modal.classList.contains("hidden"));
}

document.addEventListener("DOMContentLoaded", () => {
  ensureManagementPileCheckChooserV136();

  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-open-management-pile-check-v136]");
    if(trigger){
      event.preventDefault();
      event.stopPropagation();
      if(trigger.disabled) return;
      openManagementPileCheckFromComparisonV136(trigger);
      return;
    }

    const choice = event.target.closest("[data-pile-check-submission-v136]");
    if(choice){
      event.preventDefault();
      event.stopPropagation();
      const id = choice.dataset.pileCheckSubmissionV136;
      closeManagementPileCheckChooserV136();
      if(id) openManagementPileCheck(id);
      return;
    }

    const chooser = ensureManagementPileCheckChooserV136();
    if(!chooser.classList.contains("hidden") && !event.target.closest("#managementPileCheckChooserV136")){
      closeManagementPileCheckChooserV136();
    }
  });

  document.addEventListener("keydown", event => {
    if(event.key === "Escape" && !managementPileCheckModalIsOpenV136()){
      closeManagementPileCheckChooserV136();
    }
  });

  window.addEventListener("resize", closeManagementPileCheckChooserV136);
  window.addEventListener("scroll", closeManagementPileCheckChooserV136, true);
});
