/* restore Comparison filters on the combined Internal Overview.
   Conflict rule: whichever selector was used most recently wins.
   - Filter action last => filtered projects populate the comparison table.
   - Project tick/search tick last => ticked projects populate the comparison table.
   Revision selection remains attached to the currently active project set. */

let managementComparisonSourceV119 = "project";

function managementSetComparisonSourceV119(source){
  managementComparisonSourceV119 = source === "filter" ? "filter" : "project";
}

/* Re-enable the original filter renderer that V103 intentionally disabled. */
if(typeof window.renderManagementComparisonFiltersLegacyV119 === "function"){
  renderManagementComparisonFilters = function(){
    return window.renderManagementComparisonFiltersLegacyV119();
  };
}

function managementFilterActiveProjectKeysV119(){
  return [...new Set(
    (managementComparisonSelections || [])
      .map(selection => selection && selection.projectKey)
      .filter(Boolean)
  )];
}

function managementSyncProjectTicksFromFilterV120(){
  const projectKeys = managementFilterActiveProjectKeysV119();

  /* Filter-selected projects become the same checked project set used by the
     Select Project and Search Project controls. */
  managementOverviewSelectedProjectKeysV103 = new Set(projectKeys);

  if(typeof renderManagementProjectMultiSelectV103 === "function"){
    renderManagementProjectMultiSelectV103();
  }

  const searchInput = $("managementOverviewProjectSearch");
  const searchQuery = String(searchInput?.value || "").trim();
  if(searchQuery && typeof renderManagementOverviewProjectSearchV20 === "function"){
    renderManagementOverviewProjectSearchV20(searchQuery);
  }

  if(typeof managementUpdateOverviewStatsV103 === "function"){
    managementUpdateOverviewStatsV103();
  }
}

function managementEnsureFilterRevisionSelectionsV119(projectKeys){
  const active = new Set(projectKeys);

  /* Do not erase revision choices belonging to manually ticked projects; just
     validate/initialise the projects currently coming from the filter. */
  projectKeys.forEach(projectKey => {
    const submissions = managementProjectSubmissionsV118(projectKey);
    const validIds = new Set(submissions.map(item => item.id));
    let selected = new Set(
      [...(managementSelectedRevisionIdsV118.get(projectKey) || [])]
        .filter(id => validIds.has(id))
        .slice(0,2)
    );

    if(!selected.size){
      const currentSelections = (managementComparisonSelections || [])
        .filter(selection => selection && selection.projectKey === projectKey);

      currentSelections.forEach(selection => {
        if(selected.size >= 2) return;
        let match = null;
        if(selection.submissionId){
          match = submissions.find(item => item.id === selection.submissionId) || null;
        }
        if(!match && selection.revision){
          match = submissions
            .filter(item => String(item.revision || "") === String(selection.revision || ""))
            .sort((a,b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0] || null;
        }
        if(match) selected.add(match.id);
      });
    }

    if(!selected.size){
      const latest = submissions.slice().sort(
        (a,b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      )[0];
      if(latest) selected.add(latest.id);
    }

    managementSelectedRevisionIdsV118.set(projectKey, selected);
  });
}

function managementFilteredSubmissionsByRevisionV119(){
  const projectKeys = managementFilterActiveProjectKeysV119();
  managementEnsureFilterRevisionSelectionsV119(projectKeys);
  const items = [];

  projectKeys.forEach(projectKey => {
    const selectedIds = managementSelectedRevisionIdsV118.get(projectKey) || new Set();
    managementProjectSubmissionsV118(projectKey).forEach(item => {
      if(selectedIds.has(item.id)) items.push(item);
    });
  });

  return items;
}

/* V118 made this function revision-aware for project ticks. Extend it so the
   active filter set can also retain revision choices without falling back to
   stale project ticks. */
const managementSyncComparisonSelectionsProjectV119 = managementSyncComparisonSelectionsV103;
managementSyncComparisonSelectionsV103 = function(){
  if(managementComparisonSourceV119 !== "filter"){
    return managementSyncComparisonSelectionsProjectV119();
  }

  const items = managementFilteredSubmissionsByRevisionV119();
  managementComparisonSelections = items.map(item => ({
    projectKey: managementProjectKey(item),
    revision: item.revision || "",
    submissionId: item.id
  }));
  managementUpdateOverviewStatsV103();
  renderManagementComparison();
  renderManagementComparisonFilters();
};

/* The legacy filter setter remains the source of the old filter semantics.
   Wrap it only to mark Filter as the latest source and then convert its latest
   revision choices to the new V118 revision-aware columns. */
if(typeof window.setManagementComparisonProjectsFromFilterLegacyV119 === "function"){
  setManagementComparisonProjectsFromFilter = function(selectedDisplayKeys){
    managementSetComparisonSourceV119("filter");
    window.setManagementComparisonProjectsFromFilterLegacyV119(selectedDisplayKeys);
    managementSyncProjectTicksFromFilterV120();
    managementSyncComparisonSelectionsV103();
  };
}

/* Project tickboxes (Select Project and Search Project) get priority as soon as
   the user interacts with them. Capture phase runs before the existing V103 / V116 handlers. */
document.addEventListener("change", event => {
  if(event.target.closest(
    "[data-management-project-checkbox-v103], [data-management-search-checkbox-v116]"
  )){
    managementSetComparisonSourceV119("project");
  }
}, true);

document.addEventListener("click", event => {
  if(event.target.closest(
    ".internal-project-multiselect-option, [data-management-search-checkbox-v116], #clearManagementProjectSelectionV103"
  )){
    managementSetComparisonSourceV119("project");
  }
}, true);

/* Filter interactions mark Filter as the latest source before the older event
   handlers rebuild the comparison selection. Section-only filters don't alter
   project selection, but they still remain part of the filter workflow. */
document.addEventListener("click", event => {
  if(event.target.closest(
    "[data-comparison-type-filter], #addManagementComparisonCategoryBtn, [data-remove-comparison-category]"
  )){
    managementSetComparisonSourceV119("filter");
  }
}, true);

document.addEventListener("change", event => {
  if(event.target.closest(
    "[data-comparison-filter-all-projects], [data-comparison-filter-project], [data-comparison-category-option]"
  )){
    managementSetComparisonSourceV119("filter");
  }
}, true);

/* Keep the filter popup above the merged comparison table and other selectors. */
document.addEventListener("DOMContentLoaded", () => {
  /* Filters are visible from the start instead of behaving like a hidden popup. */
  managementComparisonFiltersOpen = true;
  managementComparisonFiltersPinned = true;
  renderManagementComparisonFilters();
  renderManagementComparison();
});
