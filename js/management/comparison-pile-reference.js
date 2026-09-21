/* ------------------------------------------------------------
   Comparison
   ------------------------------------------------------------ */

function managementProjectKey(item){
  return [
    item.region || "",
    item.businessUnit || "",
    item.project || ""
  ].join("|||");
}

function managementProjectLabel(item){
  return `${item.project || "Project"} · ${item.businessUnit || "—"}`;
}

function managementComparisonProjectOptions(){
  const map = new Map();

  getSubmissions().forEach(item => {
    const key =
      managementProjectKey(item);

    if(!map.has(key)){
      map.set(key, item);
    }
  });

  return [...map.entries()]
    .sort((a,b) =>
      managementProjectLabel(a[1])
        .localeCompare(
          managementProjectLabel(b[1])
        )
    );
}

function managementComparisonRevisions(projectKey){
  return getSubmissions()
    .filter(item =>
      managementProjectKey(item) === projectKey
    )
    .map(item =>
      item.revision
    )
    .filter((value,index,array) =>
      array.indexOf(value) === index
    )
    .sort((a,b) => {
      const an =
        Number(String(a).match(/\d+/)?.[0] || 0);

      const bn =
        Number(String(b).match(/\d+/)?.[0] || 0);

      return an - bn;
    });
}

function renderManagementComparisonSlots(){
  const container =
    $("managementComparisonSlots");

  const projectOptions =
    managementComparisonProjectOptions();

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

        return `
          <div class="management-comparison-slot">
            <span class="management-comparison-slot-number">${index + 1}</span>

            <div class="field-group">
              <label>Project</label>
              <select data-comparison-project="${index}">
                <option value="">Select project</option>
                ${projectOptions.map(([key,item]) => `
                  <option
                    value="${escapeHtml(key)}"
                    ${selection.projectKey === key ? "selected" : ""}
                  >
                    ${escapeHtml(managementProjectLabel(item))}
                  </option>
                `).join("")}
              </select>
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

function selectedManagementComparisonSubmissions(){
  return managementComparisonSelections
    .map(selection => {
      if(
        !selection.projectKey ||
        !selection.revision
      ){
        return null;
      }

      return getSubmissions()
        .find(item =>
          managementProjectKey(item) ===
            selection.projectKey &&
          item.revision ===
            selection.revision
        ) || null;
    })
    .filter(Boolean);
}

function managementComparisonNormalizedBuildingType(itemOrData){
  const data = itemOrData && itemOrData.formData
    ? itemOrData.formData
    : (itemOrData || {});

  const type = String(data.buildingType || "")
    .trim()
    .toLowerCase();

  if(type === "landed") return "Landed";
  if(type === "high rise" || type === "highrise") return "High Rise";

  return "";
}

function managementComparisonPoundageHighRiseKeys(){
  return [
    "poundageRcColumn",
    "poundageRcBeamCarpark",
    "poundageRcBeamTypical",
    "poundageRcSlab",
    "poundageShearWall",
    "poundageOverall"
  ];
}

function managementComparisonPoundageLandedKeys(){
  return [
    "poundageRcColumn",
    "poundageRcBeamCarpark",
    "poundageRcSlab",
    "poundageOverall",
    "poundageSteelContent"
  ];
}

function managementComparisonPoundageLabelWithoutUnit(label){
  return String(label || "")
    .replace(/\s*\(\s*kg\/m(?:³|3)\s*\)\s*$/i, "")
    .replace(/\s*,\s*kg\/m(?:³|3)\s*$/i, "")
    .trim();
}

function managementComparisonRows(items){
  const rows = [];

  OVERVIEW_SECTIONS.forEach(section => {
    if(!isConsultantSectionVisible(section.title)){
      return;
    }

    if(
      !managementComparisonSectionSelected(
        section.title
      )
    ){
      return;
    }

    if(section.title === "Poundage"){
      const sectionRows =
        managementSettingsRowsForSection(section);

      /*
        Poundage groups follow the building types currently being
        compared. If no project has been selected yet, keep both groups in the
        empty table structure.
      */
      const comparedBuildingTypes = new Set(
        (items || [])
          .map(item => managementComparisonNormalizedBuildingType(item))
          .filter(Boolean)
      );

      const showHighRisePoundage =
        !comparedBuildingTypes.size ||
        comparedBuildingTypes.has("High Rise");

      const showLandedPoundage =
        !comparedBuildingTypes.size ||
        comparedBuildingTypes.has("Landed");

      if(showHighRisePoundage){
        rows.push({
          type:"section",
          label:"Poundage (High Rise) (kg/m³)"
        });

        sectionRows.forEach(row => {
          if(
            !isConsultantRowVisible(
              section.title,
              row.key
            )
          ){
            return;
          }

          if(
            !managementComparisonPoundageHighRiseKeys()
              .includes(row.key)
          ){
            return;
          }

          rows.push({
            type:"field",
            sectionTitle:section.title,
            row,
            buildingTypeScope:"High Rise",
            label:managementComparisonPoundageLabelWithoutUnit(
              consultantRowLabel(
                section.title,
                row.key,
                row.label
              )
            )
          });
        });
      }

      if(showLandedPoundage){
        rows.push({
          type:"section",
          label:"Poundage (Landed) (kg/m³)"
        });

        sectionRows.forEach(row => {
          if(
            !isConsultantRowVisible(
              section.title,
              row.key
            )
          ){
            return;
          }

          if(
            !managementComparisonPoundageLandedKeys()
              .includes(row.key)
          ){
            return;
          }

          rows.push({
            type:"field",
            sectionTitle:section.title,
            row,
            buildingTypeScope:"Landed",
            label:managementComparisonPoundageLabelWithoutUnit(
              managementPoundageRowLabel(
                row.key,
                row.label,
                "Landed"
              )
            )
          });
        });
      }

      return;
    }

    rows.push({
      type:"section",
      label:consultantSectionLabel(section.title)
    });

    managementSettingsRowsForSection(section)
      .forEach(row => {
        if(
          !isConsultantRowVisible(
            section.title,
            row.key
          )
        ){
          return;
        }

        const visibleSomewhere =
          items.length === 0 ||
          items.some(item => {
            const data = item.formData || {};

            if(
              row.key === "landedType"
            ){
              return managementComparisonNormalizedBuildingType(data) === "Landed";
            }

            if(row.showWhen){
              return row.showWhen(data);
            }

            return true;
          });

        if(!visibleSomewhere){
          return;
        }

        rows.push({
          type:"field",
          sectionTitle:section.title,
          row
        });
      });
  });

  return rows;
}

function managementComparisonItemMarkup(entry){
  const label =
    entry.label ||
    consultantRowLabel(
      entry.sectionTitle,
      entry.row.key,
      entry.row.label
    );

  const guide =
    entry.sectionTitle === "Poundage"
      ? managementSubmissionProposedGuide(
          entry.sectionTitle,
          entry.row.key,
          entry.buildingTypeScope || ""
        )
      : "";

  if(guide){
    return `
      <div class="management-comparison-item">
        <span>${escapeHtml(label)}</span>
        <small>Guide: ${escapeHtml(guide)}</small>
      </div>
    `;
  }

  return `
    <div class="management-comparison-item">
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function managementComparisonDisplay(item,entry){
  const data = item.formData || {};

  const normalizedEntry =
    entry && entry.row
      ? entry
      : {
          row:entry,
          buildingTypeScope:null
        };

  if(
    normalizedEntry.buildingTypeScope &&
    managementComparisonNormalizedBuildingType(data) !== normalizedEntry.buildingTypeScope
  ){
    return "—";
  }

  if(!normalizedEntry.row){
    return "—";
  }

  return managementSubmissionValueDisplay(
    normalizedEntry.row,
    data
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
    return;
  }

  empty.classList.add("hidden");
  table.classList.remove("hidden");

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

      return `
        <tr>
          <td>
            ${managementComparisonItemMarkup(entry)}
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

/* ------------------------------------------------------------
   Pile Reference
   ------------------------------------------------------------ */

function saveManagementPileReference(rows){
  saveStorage(
    ECO_FRESH_STORAGE.pileReference,
    rows
  );
}

function renderManagementPileReference(){
  const body =
    $("managementPileReferenceBody");

  const rows =
    managementPileReference();

  body.innerHTML =
    rows.map((row,index) => `
      <tr>
        <td>
          <input
            type="text"
            value="${escapeHtml(row.pileType || "")}"
            data-pile-ref-index="${index}"
            data-pile-ref-field="pileType"
          />
        </td>
        <td>
          <input
            type="number"
            value="${escapeHtml(row.pileSize || "")}"
            data-pile-ref-index="${index}"
            data-pile-ref-field="pileSize"
          />
        </td>
        <td>
          <input
            type="number"
            value="${escapeHtml(row.pileCapacity ?? "")}"
            data-pile-ref-index="${index}"
            data-pile-ref-field="pileCapacity"
          />
        </td>
        <td>
          <input
            type="number"
            step="0.01"
            value="${escapeHtml(row.averagePrice ?? "")}"
            data-pile-ref-index="${index}"
            data-pile-ref-field="averagePrice"
            placeholder="Optional"
          />
        </td>
        <td>
          <button
            type="button"
            class="management-table-delete-btn"
            data-remove-pile-ref="${index}"
          >×</button>
        </td>
      </tr>
    `).join("");
}

function collectManagementPileReference(){
  const rows = [];

  const trList =
    $("managementPileReferenceBody")
      .querySelectorAll("tr");

  trList.forEach((tr,index) => {
    const get = field =>
      tr.querySelector(
        `[data-pile-ref-index="${index}"][data-pile-ref-field="${field}"]`
      )?.value
      .trim() || "";

    const pileType = get("pileType");
    const pileSize = get("pileSize");
    const pileCapacity = get("pileCapacity");
    const averagePrice = get("averagePrice");

    if(
      pileType &&
      pileSize &&
      pileCapacity
    ){
      rows.push({
        pileType,
        pileSize,
        pileCapacity:Number(pileCapacity),
        averagePrice:
          averagePrice === ""
            ? ""
            : Number(averagePrice)
      });
    }
  });

  return rows;
}
