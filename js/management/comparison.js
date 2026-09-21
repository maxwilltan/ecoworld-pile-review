/* ---------------- Comparison filters ---------------- */

let managementComparisonTypeFilter =
  "High Rise";

let managementComparisonFiltersOpen =
  false;

let managementComparisonFiltersPinned =
  false;

let managementComparisonFilterCloseTimer =
  null;

function openManagementComparisonFilterPopup(){
  if(managementComparisonFilterCloseTimer){
    clearTimeout(
      managementComparisonFilterCloseTimer
    );

    managementComparisonFilterCloseTimer =
      null;
  }

  if(!managementComparisonFiltersOpen){
    managementComparisonFiltersOpen = true;
    renderManagementComparisonFilters();
  }
}

function scheduleManagementComparisonFilterClose(){
  if(managementComparisonFiltersPinned){
    return;
  }

  if(managementComparisonFilterCloseTimer){
    clearTimeout(
      managementComparisonFilterCloseTimer
    );
  }

  managementComparisonFilterCloseTimer =
    setTimeout(() => {
      managementComparisonFiltersOpen = false;
      renderManagementComparisonFilters();
    }, 180);
}

let managementComparisonCategoryAddKey =
  "";

let managementComparisonActiveCategories =
  [
    "highRiseCategory",
    "transferFloor"
  ];

let managementComparisonCategorySelections = {
  highRiseType:new Set(),
  highRiseCategory:new Set(),
  transferFloor:new Set(),
  landedType:new Set()
};

function managementComparisonSectionDefinitions(){
  return [
    "Project Information",
    "Building Efficiency",
    "Pilling Info",
    "Pile Efficiency & Loading",
    "Poundage",
    "Drawings"
  ];
}

let managementComparisonSelectedSections =
  new Set(
    managementComparisonSectionDefinitions()
  );

function managementComparisonSectionSelected(
  sectionTitle
){
  return managementComparisonSelectedSections
    .has(sectionTitle);
}

function managementComparisonProjectType(item){
  return managementComparisonNormalizedBuildingType(item);
}

function managementComparisonCategoryDefinitions(){
  if(
    managementComparisonTypeFilter === "Landed"
  ){
    return [];
  }

  return [
    {
      key:"highRiseCategory",
      label:"Resi Block",
      options:getConsultantDropdownOptions(
        "highRiseCategory",
        [
          "Long Block",
          "1 or 2 Block",
          "L-Shape",
          "Split Block"
        ]
      )
    },
    {
      key:"transferFloor",
      label:"With / No Transfer Floor",
      options:getConsultantDropdownOptions(
        "transferFloor",
        [
          "Separate Carpark Block (No Transfer Floor)",
          "Resi Tower on Podium Carpark (With Transfer Floor)"
        ]
      )
    }
  ];
}

function managementComparisonResetCategoriesForType(){
  managementComparisonActiveCategories =
    managementComparisonTypeFilter === "High Rise"
      ? [
          "highRiseCategory",
          "transferFloor"
        ]
      : [];

  Object.keys(
    managementComparisonCategorySelections
  ).forEach(key => {
    managementComparisonCategorySelections[key] =
      new Set();
  });

  managementComparisonCategoryAddKey = "";
}

function managementComparisonProjectMatchesCategories(item){
  const data =
    item.formData || {};

  return managementComparisonActiveCategories
    .every(key => {
      const selected =
        managementComparisonCategorySelections[key] ||
        new Set();

      if(!selected.size){
        return true;
      }

      const value =
        String(data[key] || "")
          .trim();

      return selected.has(value);
    });
}

function managementComparisonFilteredProjectOptions(){
  return managementComparisonProjectOptions()
    .filter(([,item]) => {
      if(
        managementComparisonProjectType(item) !==
        managementComparisonTypeFilter
      ){
        return false;
      }

      return managementComparisonProjectMatchesCategories(
        item
      );
    });
}

function managementComparisonFilterProjects(){
  const allOptions =
    managementComparisonFilteredProjectOptions();

  const unique = new Map();

  allOptions.forEach(([key,item]) => {
    const displayKey =
      `${item.project || ""}||${item.businessUnit || ""}`;

    if(!unique.has(displayKey)){
      unique.set(
        displayKey,
        [key,item]
      );
    }
  });

  return Array.from(unique.values());
}

function managementComparisonFilterProjectKey(item){
  return `${item.project || ""}||${item.businessUnit || ""}`;
}

function managementComparisonSelectedProjectKeys(){
  return new Set(
    managementComparisonSelections
      .filter(selection =>
        selection.projectKey
      )
      .map(selection => {
        const match =
          managementComparisonProjectOptions()
            .find(([key]) =>
              key === selection.projectKey
            );

        if(!match) return "";

        return managementComparisonFilterProjectKey(
          match[1]
        );
      })
      .filter(Boolean)
  );
}

function setManagementComparisonProjectsFromFilter(
  selectedDisplayKeys
){
  const options =
    managementComparisonFilterProjects();

  const currentByProject =
    new Map(
      managementComparisonSelections
        .filter(selection =>
          selection.projectKey
        )
        .map(selection => [
          selection.projectKey,
          selection
        ])
    );

  const selected =
    options.filter(([,item]) =>
      selectedDisplayKeys.has(
        managementComparisonFilterProjectKey(item)
      )
    );

  managementComparisonSelections =
    selected.map(([key]) => {
      const revisions =
        managementComparisonRevisions(key);

      const current =
        currentByProject.get(key);

      const existingRevision =
        current &&
        revisions.includes(current.revision)
          ? current.revision
          : "";

      return {
        projectKey:key,
        revision:
          existingRevision ||
          revisions[revisions.length - 1] ||
          ""
      };
    });

  if(
    managementComparisonSelections.length < 2
  ){
    while(
      managementComparisonSelections.length < 2
    ){
      managementComparisonSelections.push({
        projectKey:"",
        revision:""
      });
    }
  }

  renderManagementComparisonSlots();
  renderManagementComparison();
  renderManagementComparisonFilters();
}

function managementComparisonSelectAllFilteredProjects(){
  const allFilteredProjects =
    new Set(
      managementComparisonFilterProjects()
        .map(([,item]) =>
          managementComparisonFilterProjectKey(item)
        )
    );

  setManagementComparisonProjectsFromFilter(
    allFilteredProjects
  );
}

function managementComparisonCategoryOptionCount(
  categoryKey,
  option
){
  return managementComparisonProjectOptions()
    .filter(([,item]) => {
      if(
        managementComparisonProjectType(item) !==
        managementComparisonTypeFilter
      ){
        return false;
      }

      return (
        String(
          item?.formData?.[categoryKey] || ""
        ).trim() === option
      );
    })
    .length;
}

function renderManagementComparisonFilters(){
  const container =
    $("managementComparisonFilters");

  if(!container) return;

  container.classList.toggle(
    "hidden",
    !managementComparisonFiltersOpen
  );

  const toggleButton =
    $("toggleComparisonFiltersBtn");

  if(toggleButton){
    toggleButton.classList.toggle(
      "active",
      managementComparisonFiltersOpen
    );

    toggleButton.classList.toggle(
      "pinned",
      managementComparisonFiltersPinned
    );

    toggleButton.innerHTML =
      managementComparisonFiltersOpen
        ? `Filters <span aria-hidden="true">▴</span>`
        : `Filters <span aria-hidden="true">▾</span>`;

    toggleButton.setAttribute(
      "aria-expanded",
      String(
        managementComparisonFiltersOpen
      )
    );
  }

  const projectOptions =
    managementComparisonFilterProjects();

  const selectedKeys =
    managementComparisonSelectedProjectKeys();

  const allSelected =
    projectOptions.length > 0 &&
    projectOptions.every(([,item]) =>
      selectedKeys.has(
        managementComparisonFilterProjectKey(item)
      )
    );

  const definitions =
    managementComparisonCategoryDefinitions();

  const sectionDefinitions =
    managementComparisonSectionDefinitions();

  const allSectionsSelected =
    sectionDefinitions.every(section =>
      managementComparisonSelectedSections
        .has(section)
    );

  container.innerHTML = `
    <div class="comparison-filter-selector-panel">
      <div class="comparison-filter-type-tabs">
        <button
          type="button"
          class="${
            managementComparisonTypeFilter === "Landed"
              ? "active"
              : ""
          }"
          data-comparison-type-filter="Landed"
        >
          LANDED
        </button>

        <button
          type="button"
          class="${
            managementComparisonTypeFilter === "High Rise"
              ? "active"
              : ""
          }"
          data-comparison-type-filter="High Rise"
        >
          HIGH RISE
        </button>
      </div>

      <div class="comparison-filter-columns">
        <div class="comparison-filter-project-panel">
          <div class="comparison-filter-panel-title">
            <div>
              <strong>
                ${escapeHtml(
                  managementComparisonTypeFilter
                )} Projects
              </strong>
              <small>Tick projects to compare</small>
            </div>

            <span class="comparison-filter-count">
              ${projectOptions.length}
            </span>
          </div>

          <div class="comparison-project-checklist">
            <label class="comparison-project-checkbox all-projects">
              <input
                type="checkbox"
                data-comparison-filter-all-projects
                ${allSelected ? "checked" : ""}
              />
              <span>All Projects</span>
            </label>

            ${
              projectOptions.length
                ? projectOptions.map(([,item]) => {
                    const displayKey =
                      managementComparisonFilterProjectKey(
                        item
                      );

                    return `
                      <label class="comparison-project-checkbox">
                        <input
                          type="checkbox"
                          data-comparison-filter-project="${escapeHtml(displayKey)}"
                          ${
                            selectedKeys.has(displayKey)
                              ? "checked"
                              : ""
                          }
                        />

                        <span>
                          <strong>
                            ${escapeHtml(
                              item.project || "Project"
                            )}
                          </strong>
                          <small>
                            ${escapeHtml(
                              item.businessUnit || "—"
                            )}
                          </small>
                        </span>
                      </label>
                    `;
                  }).join("")
                : `
                  <div class="comparison-filter-empty">
                    No matching ${escapeHtml(
                      managementComparisonTypeFilter
                    )} projects.
                  </div>
                `
            }
          </div>
        </div>

        <div class="comparison-filter-category-panel">
          <div class="comparison-filter-panel-title">
            <div>
              <strong>CATEGORY</strong>
              <small>
                ${
                  managementComparisonTypeFilter === "High Rise"
                    ? "Default category filters"
                    : "No category filter for Landed"
                }
              </small>
            </div>
          </div>

          <div class="comparison-active-categories">
            ${
              definitions.length
                ? definitions.map(definition => {
                    const selected =
                      managementComparisonCategorySelections[
                        definition.key
                      ] || new Set();

                    return `
                      <div class="comparison-category-card">
                        <div class="comparison-category-card-head">
                          <strong>
                            ${escapeHtml(
                              definition.label
                            )}
                          </strong>
                        </div>

                        <div class="comparison-category-options-checklist">
                          ${definition.options.map(option => `
                            <label>
                              <input
                                type="checkbox"
                                data-comparison-category-option="${escapeHtml(definition.key)}"
                                value="${escapeHtml(option)}"
                                ${
                                  selected.has(option)
                                    ? "checked"
                                    : ""
                                }
                              />

                              <span>
                                ${escapeHtml(option)}
                              </span>

                              <small>
                                ${managementComparisonCategoryOptionCount(
                                  definition.key,
                                  option
                                )}
                              </small>
                            </label>
                          `).join("")}
                        </div>
                      </div>
                    `;
                  }).join("")
                : `
                  <div class="comparison-category-empty">
                    Category filtering is not required for
                    <strong>Landed</strong>.
                  </div>
                `
            }
          </div>
        </div>

        <div class="comparison-filter-sections-panel comparison-filter-sections-panel-inline">
          <div class="comparison-filter-panel-title comparison-sections-title">
            <div>
              <strong>SECTIONS</strong>
              <small>
                Choose which parts of the comparison table to display
              </small>
            </div>
          </div>

          <div class="comparison-section-checklist">
            <label class="comparison-section-checkbox all-sections">
              <input
                type="checkbox"
                data-comparison-filter-all-sections
                ${allSectionsSelected ? "checked" : ""}
              />
              <span>All Sections</span>
            </label>

            ${sectionDefinitions.map(section => `
              <label class="comparison-section-checkbox">
                <input
                  type="checkbox"
                  data-comparison-section-option="${escapeHtml(section)}"
                  ${
                    managementComparisonSelectedSections.has(section)
                      ? "checked"
                      : ""
                  }
                />
                <span>${escapeHtml(section)}</span>
              </label>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ---------------- Dynamic Comparison columns ---------------- */

managementComparisonSelections =
  Array.from(
    {length:4},
    () => ({
      projectKey:"",
      revision:""
    })
  );

function updateComparisonColumnPillV20(){
  const pill =
    $("comparisonColumnCountPill");

  if(!pill) return;

  pill.textContent =
    `${managementComparisonSelections.length} column${
      managementComparisonSelections.length === 1
        ? ""
        : "s"
    }`;
}

function comparisonProjectSearchMatches(query){
  const normalized =
    String(query || "")
      .trim()
      .toLowerCase();

  if(!normalized){
    return [];
  }

  return managementComparisonProjectOptions()
    .filter(([,item]) => {
      const searchable = [
        item.project,
        item.region,
        item.businessUnit
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalized);
    })
    .slice(0,10);
}

function renderComparisonProjectSearchResults(index, query){
  const results =
    document.querySelector(
      `[data-comparison-project-results="${index}"]`
    );

  if(!results){
    return;
  }

  const matches =
    comparisonProjectSearchMatches(query);

  if(!String(query || "").trim()){
    results.innerHTML = "";
    results.classList.add("hidden");
    return;
  }

  if(!matches.length){
    results.innerHTML = `
      <div class="comparison-project-search-empty">
        No project found
      </div>
    `;
    results.classList.remove("hidden");
    return;
  }

  results.innerHTML =
    matches.map(([key,item]) => `
      <button
        type="button"
        class="comparison-project-search-result"
        data-confirm-comparison-project="${index}"
        data-comparison-project-key="${escapeHtml(key)}"
      >
        <span>
          <strong>${escapeHtml(item.project || "Project")}</strong>
          <small>
            ${escapeHtml(item.region || "—")}
            ·
            ${escapeHtml(item.businessUnit || "—")}
          </small>
        </span>

        <span class="comparison-project-confirm-action">
          Select →
        </span>
      </button>
    `).join("");

  results.classList.remove("hidden");
}

function closeComparisonProjectSearchResults(exceptIndex=null){
  document
    .querySelectorAll(
      "[data-comparison-project-results]"
    )
    .forEach(results => {
      if(
        exceptIndex !== null &&
        String(results.dataset.comparisonProjectResults) ===
          String(exceptIndex)
      ){
        return;
      }

      results.classList.add("hidden");
    });
}

function renderManagementComparisonSlots(){
  const container =
    $("managementComparisonSlots");

  const projectOptions =
    managementComparisonProjectOptions();

  updateComparisonColumnPillV20();

  container.innerHTML =
    managementComparisonSelections
      .map((selection,index) => {
        const revisions =
          selection.projectKey
            ? managementComparisonRevisions(
                selection.projectKey
              )
            : [];

        if(
          selection.revision &&
          !revisions.includes(
            selection.revision
          )
        ){
          selection.revision = "";
        }

        const selectedProject =
          selection.projectKey
            ? projectOptions.find(
                ([key]) =>
                  key === selection.projectKey
              )?.[1]
            : null;

        return `
          <div class="management-comparison-slot">
            <div class="management-comparison-slot-top">
              <span class="management-comparison-slot-number">${index + 1}</span>

              ${
                managementComparisonSelections.length > 2
                  ? `<button
                      type="button"
                      class="management-comparison-remove-column"
                      data-remove-comparison-column="${index}"
                      title="Remove comparison column"
                    >×</button>`
                  : ""
              }
            </div>

            <div class="field-group">
              <label>Project</label>

              ${
                selectedProject
                  ? `
                    <div class="comparison-project-confirmed">
                      <div class="comparison-project-confirmed-copy">
                        <span class="comparison-project-check">✓</span>
                        <span>
                          <strong>${escapeHtml(selectedProject.project || "Project")}</strong>
                          <small>
                            ${escapeHtml(selectedProject.region || "—")}
                            ·
                            ${escapeHtml(selectedProject.businessUnit || "—")}
                          </small>
                        </span>
                      </div>

                      <button
                        type="button"
                        class="comparison-project-change-btn"
                        data-change-comparison-project="${index}"
                      >Change</button>
                    </div>
                  `
                  : `
                    <div class="comparison-project-search">
                      <span class="comparison-project-search-icon">⌕</span>

                      <input
                        type="search"
                        class="comparison-project-search-input"
                        data-comparison-project-search="${index}"
                        placeholder="Search project"
                        autocomplete="off"
                      />

                      <div
                        class="comparison-project-search-results hidden"
                        data-comparison-project-results="${index}"
                      ></div>
                    </div>
                  `
              }
            </div>

            <div class="field-group">
              <label>Revision</label>

              <select
                data-comparison-revision="${index}"
                ${selection.projectKey ? "" : "disabled"}
              >
                <option value="">Select revision</option>

                ${revisions.map(revision => `
                  <option
                    value="${escapeHtml(revision)}"
                    ${selection.revision === revision ? "selected" : ""}
                  >${escapeHtml(revision)}</option>
                `).join("")}
              </select>
            </div>
          </div>
        `;
      })
      .join("");
}

function managementComparisonGuide(entry){
  if(
    !entry ||
    entry.type === "section" ||
    entry.sectionTitle !== "Poundage"
  ){
    return "";
  }

  return managementSubmissionProposedGuide(
    entry.sectionTitle,
    entry.row.key,
    entry.buildingTypeScope || ""
  );
}

function renderManagementComparison(){
  const items =
    selectedManagementComparisonSubmissions();

  const empty =
    $("managementComparisonEmpty");

  const table =
    $("managementComparisonTable");

  if(items.length < 2){
    empty.classList.remove("hidden");
    table.classList.add("hidden");
    table.style.minWidth = "";
    return;
  }

  empty.classList.add("hidden");
  table.classList.remove("hidden");

  table.style.minWidth =
    items.length > 5
      ? `${250 + items.length * 125}px`
      : "0px";

  $("managementComparisonHead").innerHTML = `
    <tr>
      <th>Item</th>

      ${items.map(item => `
        <th>
          <strong>${escapeHtml(item.project || "Project")}</strong>
          <small>${escapeHtml(item.revision || "")}</small>
        </th>
      `).join("")}
    </tr>
  `;

  const rows =
    managementComparisonRows(items);

  $("managementComparisonBody").innerHTML =
    rows.map(entry => {
      if(entry.type === "section"){
        return `
          <tr class="management-comparison-section-row">
            <td colspan="${items.length + 1}">
              ${escapeHtml(entry.label)}
            </td>
          </tr>
        `;
      }

      const values =
        items.map(item =>
          managementComparisonDisplay(
            item,
            entry
          )
        );

      const distinct =
        new Set(
          values.filter(value =>
            value !== "—"
          )
        );

      const label =
        entry.label ||
        entry.row.label;

      const guide =
        managementComparisonGuide(entry);

      return `
        <tr>
          <td>
            ${
              guide
                ? `
                  <div class="comparison-poundage-item">
                    <span class="comparison-poundage-label">${escapeHtml(label)}</span>
                    <span class="comparison-poundage-divider">|</span>
                    <small class="comparison-poundage-guide-text">${escapeHtml(guide)}</small>
                  </div>
                `
                : `
                  <span>${escapeHtml(label)}</span>
                `
            }
          </td>

          ${values.map(value => `
            <td class="${
              distinct.size > 1
                ? "comparison-different"
                : ""
            }">
              ${escapeHtml(value)}
            </td>
          `).join("")}
        </tr>
      `;
    }).join("");
}

/* keep references to the original Comparison filter functions before the
   combined Overview module replaces some legacy renderers. */
window.renderManagementComparisonFiltersLegacyV119 = renderManagementComparisonFilters;
window.setManagementComparisonProjectsFromFilterLegacyV119 = setManagementComparisonProjectsFromFilter;
