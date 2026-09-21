/* ---------------- Overview: Consultant-style selector bar ---------------- */

function managementOverviewAllProjectItemsV20(){
  const hierarchy =
    getPortalHierarchyConfig();

  const items = [];

  Object.entries(
    hierarchy.regionBusinessUnits
  ).forEach(([region,businessUnits]) => {
    businessUnits.forEach(businessUnit => {
      const projects =
        hierarchy.businessUnitProjects[
          businessUnit
        ] || [];

      projects.forEach(project => {
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

function populateManagementOverviewSelectorsV20(){
  const regionSelect =
    $("managementOverviewRegionSelect");

  const businessUnitSelect =
    $("managementOverviewBusinessUnitSelect");

  const projectSelect =
    $("managementOverviewProjectSelect");

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
    managementOverviewSelectionV20.region &&
    !regions.includes(
      managementOverviewSelectionV20.region
    )
  ){
    managementOverviewSelectionV20 = {
      region:"",
      businessUnit:"",
      project:""
    };
  }

  regionSelect.innerHTML =
    `<option value="">All Regions</option>` +
    regions.map(region =>
      `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`
    ).join("");

  regionSelect.value =
    managementOverviewSelectionV20.region;

  const businessUnits =
    managementOverviewSelectionV20.region
      ? (
          hierarchy.regionBusinessUnits[
            managementOverviewSelectionV20.region
          ] || []
        )
      : [];

  businessUnitSelect.disabled =
    !managementOverviewSelectionV20.region;

  businessUnitSelect.innerHTML =
    !managementOverviewSelectionV20.region
      ? `<option value="">Select region first</option>`
      : (
          `<option value="">All Business Units</option>` +
          businessUnits
            .map(unit =>
              `<option value="${escapeHtml(unit)}">${escapeHtml(unit)}</option>`
            )
            .join("")
        );

  if(
    businessUnits.includes(
      managementOverviewSelectionV20.businessUnit
    )
  ){
    businessUnitSelect.value =
      managementOverviewSelectionV20.businessUnit;
  }else{
    managementOverviewSelectionV20.businessUnit = "";
    managementOverviewSelectionV20.project = "";
  }

  const projects =
    managementOverviewSelectionV20.businessUnit
      ? (
          hierarchy.businessUnitProjects[
            managementOverviewSelectionV20.businessUnit
          ] || []
        )
      : [];

  projectSelect.disabled =
    !managementOverviewSelectionV20.businessUnit;

  projectSelect.innerHTML =
    !managementOverviewSelectionV20.businessUnit
      ? `<option value="">Select business unit first</option>`
      : (
          `<option value="">All Projects</option>` +
          projects
            .map(project =>
              `<option value="${escapeHtml(project)}">${escapeHtml(project)}</option>`
            )
            .join("")
        );

  if(
    projects.includes(
      managementOverviewSelectionV20.project
    )
  ){
    projectSelect.value =
      managementOverviewSelectionV20.project;
  }else{
    managementOverviewSelectionV20.project = "";
  }
}

function closeManagementOverviewProjectSearchV20(){
  $("managementOverviewProjectSearchResults")
    ?.classList.add("hidden");
}

function renderManagementOverviewProjectSearchV20(query){
  const results =
    $("managementOverviewProjectSearchResults");

  if(!results) return;

  const normalized =
    String(query || "")
      .trim()
      .toLowerCase();

  results.innerHTML = "";

  if(!normalized){
    closeManagementOverviewProjectSearchV20();
    return;
  }

  const matches =
    managementOverviewAllProjectItemsV20()
      .filter(item =>
        item.project
          .toLowerCase()
          .includes(normalized) ||
        item.businessUnit
          .toLowerCase()
          .includes(normalized) ||
        item.region
          .toLowerCase()
          .includes(normalized)
      )
      .slice(0,12);

  if(!matches.length){
    results.innerHTML =
      `<div class="project-search-empty">No project found</div>`;

    results.classList.remove("hidden");
    return;
  }

  matches.forEach(item => {
    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "project-search-result";

    button.dataset.managementSearchRegion =
      item.region;

    button.dataset.managementSearchBusinessUnit =
      item.businessUnit;

    button.dataset.managementSearchProject =
      item.project;

    button.innerHTML = `
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

function managementSubmissionSearchItems(){
  const search =
    $("managementOverviewProjectSearch")
      ?.value
      .trim()
      .toLowerCase() || "";

  return getSubmissions()
    .filter(item => {
      if(
        managementOverviewSelectionV20.region &&
        item.region !==
          managementOverviewSelectionV20.region
      ){
        return false;
      }

      if(
        managementOverviewSelectionV20.businessUnit &&
        item.businessUnit !==
          managementOverviewSelectionV20.businessUnit
      ){
        return false;
      }

      if(
        managementOverviewSelectionV20.project &&
        item.project !==
          managementOverviewSelectionV20.project
      ){
        return false;
      }

      if(
        search &&
        !managementOverviewSelectionV20.project
      ){
        const data = item.formData || {};

        const haystack = [
          item.project,
          item.region,
          item.businessUnit,
          item.revision,
          typeof submissionYearLabel === "function" ? submissionYearLabel(item) : (item.year || ""),
          data.consultantName
        ]
          .join(" ")
          .toLowerCase();

        if(!haystack.includes(search)){
          return false;
        }
      }

      return true;
    })
    .sort(
      (a,b) =>
        new Date(b.updatedAt || 0) -
        new Date(a.updatedAt || 0)
    );
}

function updateManagementOverviewStatusV20(count){
  const status =
    $("managementOverviewStatus");

  if(!status) return;

  const parts = [];

  if(managementOverviewSelectionV20.region){
    parts.push(
      managementOverviewSelectionV20.region
    );
  }

  if(managementOverviewSelectionV20.businessUnit){
    parts.push(
      managementOverviewSelectionV20.businessUnit
    );
  }

  if(managementOverviewSelectionV20.project){
    parts.push(
      managementOverviewSelectionV20.project
    );
  }

  status.textContent =
    `${count} submission${count === 1 ? "" : "s"} shown` +
    (
      parts.length
        ? ` · ${parts.join(" → ")}`
        : " · All projects"
    );
}

function renderManagementOverview(){
  populateManagementOverviewSelectorsV20();
  renderManagementOverviewStats();

  const container =
    $("managementSubmissionList");

  const items =
    managementSubmissionSearchItems();

  updateManagementOverviewStatusV20(
    items.length
  );

  if(!items.length){
    container.innerHTML = `
      <div class="empty-state compact-card">
        <div>
          <div class="empty-icon">▣</div>
          <strong>No matching submissions</strong>
          <span>Try another project selection or search.</span>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML =
    items.map(item => {
      const data = item.formData || {};

      return `
        <article class="management-submission-card">
          <div class="management-submission-main">
            <div class="management-submission-title-row">
              <div>
                <h3>${escapeHtml(item.project || "Project")}</h3>

                <div class="history-meta">
                  <span class="meta-chip">${escapeHtml(item.region || "—")}</span>
                  <span class="meta-chip">${escapeHtml(item.businessUnit || "—")}</span>
                  <span class="meta-chip">${escapeHtml(item.revision || "—")}</span>
                  <span class="meta-chip">${escapeHtml(typeof submissionYearLabel === "function" ? submissionYearLabel(item) : (item.year || "—"))}</span>
                </div>
              </div>

              <span class="management-submission-date">
                ${escapeHtml(managementSubmissionUpdated(item))}
              </span>
            </div>

            <div class="management-submission-info-grid">
              <div>
                <span>Consultant</span>
                <strong>${escapeHtml(data.consultantName || "—")}</strong>
              </div>

              <div>
                <span>Building Type</span>
                <strong>${escapeHtml(data.buildingType || "—")}</strong>
              </div>

              <div>
                <span>Overall Pile Efficiency</span>
                <strong>${
                  data.overallEfficiency
                    ? `${escapeHtml(data.overallEfficiency)}%`
                    : "—"
                }</strong>
              </div>

              <div>
                <span>Total Piles</span>
                <strong>${escapeHtml(managementSubmissionTotalPiles(data))}</strong>
              </div>
            </div>
          </div>

          <div class="management-submission-actions">
            <button
              class="ghost-btn compact-btn"
              type="button"
              data-management-view-submission="${escapeHtml(item.id)}"
            >View Submission</button>

            <button
              class="primary-btn compact-btn"
              type="button"
              data-management-pile-check="${escapeHtml(item.id)}"
            >Internal Pile Check</button>
          </div>
        </article>
      `;
    }).join("");
}
