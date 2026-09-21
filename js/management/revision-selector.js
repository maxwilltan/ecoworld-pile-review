/* per-project revision multi-select for Internal comparison (maximum 2). */

let managementSelectedRevisionIdsV118 = new Map();
let managementRevisionPopoverProjectKeyV118 = "";

function managementProjectSubmissionsV118(projectKey){
  return getSubmissions()
    .filter(item => managementProjectKey(item) === projectKey)
    .sort((a,b) => {
      const revisionA = String(a.revision || "");
      const revisionB = String(b.revision || "");
      const numberA = Number((revisionA.match(/\d+/) || [9999])[0]);
      const numberB = Number((revisionB.match(/\d+/) || [9999])[0]);
      if(numberA !== numberB) return numberA - numberB;
      const revisionCompare = revisionA.localeCompare(revisionB, undefined, { numeric:true, sensitivity:"base" });
      if(revisionCompare) return revisionCompare;
      const yearA = typeof submissionYearLabel === "function" ? submissionYearLabel(a) : (a.year || "");
      const yearB = typeof submissionYearLabel === "function" ? submissionYearLabel(b) : (b.year || "");
      const yearCompare = String(yearA).localeCompare(String(yearB), undefined, { numeric:true, sensitivity:"base" });
      if(yearCompare) return yearCompare;
      return new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0);
    });
}

function managementEnsureRevisionSelectionsV118(){
  const selectedProjects = new Set(managementOverviewSelectedProjectKeysV103);

  [...managementSelectedRevisionIdsV118.keys()].forEach(projectKey => {
    if(!selectedProjects.has(projectKey)) managementSelectedRevisionIdsV118.delete(projectKey);
  });

  selectedProjects.forEach(projectKey => {
    const submissions = managementProjectSubmissionsV118(projectKey);
    const validIds = new Set(submissions.map(item => item.id));
    let selected = managementSelectedRevisionIdsV118.get(projectKey);

    if(selected){
      selected = new Set([...selected].filter(id => validIds.has(id)).slice(0,2));
    }

    if(!selected || !selected.size){
      const latest = submissions.slice().sort(
        (a,b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      )[0];
      selected = new Set(latest ? [latest.id] : []);
    }

    managementSelectedRevisionIdsV118.set(projectKey, selected);
  });
}

function managementSelectedSubmissionsByRevisionV118(){
  managementEnsureRevisionSelectionsV118();
  const items = [];

  [...managementOverviewSelectedProjectKeysV103].forEach(projectKey => {
    const submissions = managementProjectSubmissionsV118(projectKey);
    const selectedIds = managementSelectedRevisionIdsV118.get(projectKey) || new Set();
    submissions.forEach(item => {
      if(selectedIds.has(item.id)) items.push(item);
    });
  });

  return items;
}

/* Replace the V103 latest-only sync with revision-aware selections. */
function managementSyncComparisonSelectionsV103(){
  const items = managementSelectedSubmissionsByRevisionV118();
  managementComparisonSelections = items.map(item => ({
    projectKey: managementProjectKey(item),
    revision: item.revision || "",
    submissionId: item.id
  }));
  managementUpdateOverviewStatsV103();
  renderManagementComparison();
}

function managementRevisionLabelV118(item){
  const revision = item.revision || "—";
  const year = typeof submissionYearLabel === "function" ? submissionYearLabel(item) : (item.year || "—");
  return `${revision} · ${year || "—"}`;
}

function ensureManagementRevisionPopoverV118(){
  let popover = document.getElementById("managementRevisionPopoverV118");
  if(popover) return popover;

  popover = document.createElement("div");
  popover.id = "managementRevisionPopoverV118";
  popover.className = "management-revision-popover-v118 hidden";
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-label", "Select revisions to compare");
  document.body.appendChild(popover);
  return popover;
}

function closeManagementRevisionPopoverV118(){
  const popover = document.getElementById("managementRevisionPopoverV118");
  popover?.classList.add("hidden");
  managementRevisionPopoverProjectKeyV118 = "";
}

function positionManagementRevisionPopoverV118(trigger, popover){
  if(!trigger || !popover) return;
  const rect = trigger.getBoundingClientRect();
  const width = 250;
  const viewportPadding = 10;
  let left = rect.left;
  if(left + width > window.innerWidth - viewportPadding){
    left = window.innerWidth - width - viewportPadding;
  }
  left = Math.max(viewportPadding, left);

  popover.style.width = `${width}px`;
  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(rect.bottom + 6)}px`;
}

function renderManagementRevisionPopoverV118(projectKey, trigger){
  const popover = ensureManagementRevisionPopoverV118();
  const submissions = managementProjectSubmissionsV118(projectKey);
  const selected = managementSelectedRevisionIdsV118.get(projectKey) || new Set();
  const maxReached = selected.size >= 2;

  popover.innerHTML = `
    <div class="management-revision-popover-head-v118">
      <div>
        <strong>Revision</strong>
        <small>Select up to 2 revisions</small>
      </div>
      <span>${selected.size}/2</span>
    </div>
    <div class="management-revision-options-v118">
      ${submissions.map(item => {
        const checked = selected.has(item.id);
        const disableUnchecked = !checked && maxReached;
        /* Keep at least one revision selected while the project itself is selected. */
        const disableOnlyChecked = checked && selected.size === 1;
        const disabled = disableUnchecked || disableOnlyChecked;
        return `
          <label class="management-revision-option-v118 ${checked ? "selected" : ""} ${disabled && !checked ? "limit-disabled" : ""}">
            <input
              type="checkbox"
              data-management-revision-checkbox-v118="${escapeHtml(item.id)}"
              data-management-revision-project-v118="${escapeHtml(projectKey)}"
              ${checked ? "checked" : ""}
              ${disabled ? "disabled" : ""}
            />
            <span>${escapeHtml(managementRevisionLabelV118(item))}</span>
          </label>
        `;
      }).join("")}
    </div>
  `;

  popover.classList.remove("hidden");
  managementRevisionPopoverProjectKeyV118 = projectKey;
  positionManagementRevisionPopoverV118(trigger, popover);
}

function renderManagementProjectSeparators(){
  const wrap=document.querySelector("#managementOverviewView .management-comparison-table-wrap");
  const table=$("managementComparisonTable");
  if(!wrap || !table) return;

  wrap.querySelectorAll(".management-project-separator-line, .management-table-outline-frame").forEach(line=>line.remove());
  if(table.classList.contains("hidden")) return;

  const firstRevisionCell = table.querySelector(".management-comparison-revision-head");
  const groupStartCells = [...table.querySelectorAll(".management-comparison-revision-head.management-project-group-start")];
  const boundaryCells = [firstRevisionCell, ...groupStartCells].filter((cell, index, arr)=>cell && arr.indexOf(cell)===index);
  if(!boundaryCells.length) return;

  const wrapRect=wrap.getBoundingClientRect();
  const tableRect=table.getBoundingClientRect();
  const top=tableRect.top-wrapRect.top+wrap.scrollTop;
  const left=tableRect.left-wrapRect.left+wrap.scrollLeft;
  const height=table.offsetHeight;
  const width=table.offsetWidth;

  const outline=document.createElement("span");
  outline.className="management-table-outline-frame";
  outline.setAttribute("aria-hidden","true");
  outline.style.left=`${left}px`;
  outline.style.top=`${top}px`;
  outline.style.width=`${width}px`;
  outline.style.height=`${height}px`;
  wrap.appendChild(outline);

  boundaryCells.forEach(cell=>{
    const cellRect=cell.getBoundingClientRect();
    const line=document.createElement("span");
    line.className="management-project-separator-line";
    line.setAttribute("aria-hidden","true");
    line.style.left=`${cellRect.left-wrapRect.left+wrap.scrollLeft}px`;
    line.style.top=`${top}px`;
    line.style.height=`${height}px`;
    wrap.appendChild(line);
  });
}

function renderManagementPoundageGuideSeparators(){
  const wrap=document.querySelector("#managementOverviewView .management-comparison-table-wrap");
  const table=$("managementComparisonTable");
  if(!wrap || !table) return;

  wrap.querySelectorAll(".management-poundage-guide-separator-line").forEach(line=>line.remove());
  if(table.classList.contains("hidden")) return;

  const wrapRect=wrap.getBoundingClientRect();
  const sectionRows=[...table.querySelectorAll("tbody .management-comparison-section-row")];

  sectionRows.forEach(sectionRow=>{
    const label=String(sectionRow.dataset.managementSectionLabel||"");
    if(!/^Poundage/.test(label)) return;

    let row=sectionRow.nextElementSibling;
    let firstGuideCell=null;
    let lastPoundageRow=null;

    while(row && !row.classList.contains("management-comparison-section-row")){
      const guideCell=row.querySelector(".management-poundage-item-cell .comparison-poundage-inline-guide-col");
      if(guideCell && !firstGuideCell) firstGuideCell=guideCell;
      if(guideCell) lastPoundageRow=row;
      row=row.nextElementSibling;
    }

    if(!firstGuideCell || !lastPoundageRow) return;

    const guideRect=firstGuideCell.getBoundingClientRect();
    const sectionRect=sectionRow.getBoundingClientRect();
    const lastRect=lastPoundageRow.getBoundingClientRect();

    const line=document.createElement("span");
    line.className="management-poundage-guide-separator-line";
    line.setAttribute("aria-hidden","true");
    line.style.left=`${guideRect.left-wrapRect.left+wrap.scrollLeft}px`;
    line.style.top=`${sectionRect.top-wrapRect.top+wrap.scrollTop}px`;
    line.style.height=`${lastRect.bottom-sectionRect.top}px`;
    wrap.appendChild(line);
  });
}

/* Replace the comparison renderer so every selected revision is its own column. */
function renderManagementComparison(){
  const card=$("managementCombinedComparisonCardV101");
  const table=$("managementComparisonTable");
  const empty=$("managementComparisonEmpty");
  const head=$("managementComparisonHead");
  const body=$("managementComparisonBody");
  const pill=$("comparisonColumnCountPill");
  const summary=$("managementCombinedComparisonSummaryV101");
  if(!card || !table || !empty || !head || !body) return;

  const items=selectedManagementComparisonSubmissions();
  const projectCount=new Set(items.map(item=>managementProjectKey(item))).size;
  // Keep one blank project column when there are no selected submissions.
  const columnCount=Math.max(1, items.length);

  table.classList.toggle("management-single-column-view", columnCount === 1);
  card.classList.toggle("management-single-column-card", columnCount === 1);

  if(pill) pill.textContent=`${items.length} column${items.length===1?"":"s"}`;
  if(summary){
    summary.textContent=items.length
      ? `${projectCount} selected project${projectCount===1?"":"s"} · ${items.length} comparison column${items.length===1?"":"s"}.`
      : "Tick projects from Select Project to start comparing.";
  }

  if(!items.length){
    closeManagementRevisionPopoverV118();
  }

  card.classList.remove("hidden");
  empty.classList.add("hidden");
  table.classList.remove("hidden");
  table.style.minWidth=items.length>4 ? `${380+items.length*175}px` : "0px";

  const projectGroups=[];
  items.forEach((item,index)=>{
    const projectKey=managementProjectKey(item);
    const last=projectGroups[projectGroups.length-1];
    if(last && last.projectKey===projectKey){
      last.items.push({item,index});
    }else{
      projectGroups.push({
        projectKey,
        projectName:item.project||"Project",
        items:[{item,index}]
      });
    }
  });

  head.innerHTML=`
    <tr class="management-comparison-project-group-row">
      <th rowspan="2" class="management-comparison-item-head">Item</th>
      ${projectGroups.map((group,groupIndex)=>`
        <th
          colspan="${group.items.length}"
          class="management-comparison-project-group-head ${groupIndex>0?"management-project-group-start":""}"
        >
          <strong>${escapeHtml(group.projectName)}</strong>
        </th>
      `).join("") || `<th class="management-comparison-project-group-head"><strong>No project selected</strong></th>`}
    </tr>
    <tr class="management-comparison-revision-row">
      ${items.map((item,index)=>{
        const projectKey=managementProjectKey(item);
        const isGroupStart=index>0 && managementProjectKey(items[index-1])!==projectKey;
        return `
          <th class="management-comparison-revision-head ${isGroupStart?"management-project-group-start":""}">
            <button
              type="button"
              class="management-revision-trigger-v118"
              data-management-revision-trigger-v118="${escapeHtml(projectKey)}"
              aria-haspopup="dialog"
              title="Choose revisions to compare"
            >
              <span>${escapeHtml(managementRevisionLabelV118(item))}</span>
              <span class="management-revision-chevron-v118" aria-hidden="true">⌄</span>
            </button>
          </th>
        `;
      }).join("") || `<th class="management-comparison-revision-head"><span class="management-revision-trigger-v118">—</span></th>`}
    </tr>
  `;

  const rows=managementComparisonRows(items);
  const poundageGuideShown={};
  body.innerHTML=rows.map(entry=>{
    if(entry.type==="section"){
      return `<tr class="management-comparison-section-row" data-management-section-label="${escapeHtml(entry.label)}"><td colspan="${columnCount+1}"><div class="management-comparison-section-head-v124">${/^Poundage/.test(entry.label||"") ? `<span class="management-poundage-section-title-with-guide"><span class="management-poundage-section-title-main">${escapeHtml(entry.label)}</span><span class="management-poundage-section-title-guide">Guide (kg/m³)</span></span>` : `<span>${escapeHtml(entry.label)}</span>`}${typeof managementComparisonSectionActionsV136 === "function" ? managementComparisonSectionActionsV136(entry.label, items) : (entry.label === "Pilling Info" ? `<button type="button" class="management-pile-reference-comparison-btn-v124" data-open-management-pile-reference-v124="true">Pile Reference</button>` : "")}</div></td></tr>`;
    }

    const values=items.map(item=>managementComparisonDisplay(item,entry));
    const distinct=new Set(values.filter(value=>value!=="—"));
    const labelText=entry.label||entry.row.label;
    const guide=managementComparisonGuide(entry);
    const poundageGuideKey=(entry.buildingTypeScope||"default");
    const showGuideHead=!!guide && entry.sectionTitle==="Poundage" && !poundageGuideShown[poundageGuideKey];
    if(showGuideHead) poundageGuideShown[poundageGuideKey]=true;

    return `
      <tr>
        <td class="${guide ? `management-poundage-item-cell` : ``}">${guide ? `
          <div class="comparison-poundage-inline-guide${showGuideHead?` comparison-poundage-inline-guide-first`:``}">
            <span class="comparison-poundage-label">${escapeHtml(labelText)}</span>
            <span class="comparison-poundage-inline-divider" aria-hidden="true"></span>
            <span class="comparison-poundage-inline-guide-col"><small class="comparison-poundage-guide-text">${escapeHtml(guide)}</small></span>
          </div>
        ` : `<span>${escapeHtml(labelText)}</span>`}</td>
        ${items.map((item,index)=>{
          const isGroupStart=index>0 && managementProjectKey(items[index-1])!==managementProjectKey(item);
          const classes=[distinct.size>1?"comparison-different":"",isGroupStart?"management-project-group-start":""].filter(Boolean).join(" ");
          return `<td class="${classes}">${typeof managementComparisonCellMarkupV131 === "function" ? managementComparisonCellMarkupV131(item,entry,values[index]) : escapeHtml(values[index])}</td>`;
        }).join("") || `<td>—</td>`}
      </tr>
    `;
  }).join("");

  requestAnimationFrame(()=>{
    renderManagementProjectSeparators();
    renderManagementPoundageGuideSeparators();
  });

  /* If the popover was open before the table rerender, keep it open beside the
     first matching revision trigger so users can tick a second revision. */
  if(managementRevisionPopoverProjectKeyV118){
    requestAnimationFrame(()=>{
      const key=managementRevisionPopoverProjectKeyV118;
      const trigger=[...document.querySelectorAll("[data-management-revision-trigger-v118]")]
        .find(node=>node.dataset.managementRevisionTriggerV118===key);
      if(trigger) renderManagementRevisionPopoverV118(key,trigger);
      else closeManagementRevisionPopoverV118();
    });
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  ensureManagementRevisionPopoverV118();
  window.addEventListener("resize",()=>requestAnimationFrame(()=>{
    renderManagementProjectSeparators();
    renderManagementPoundageGuideSeparators();
  }));

  document.addEventListener("click",event=>{
    const trigger=event.target.closest("[data-management-revision-trigger-v118]");
    if(trigger){
      event.preventDefault();
      event.stopPropagation();
      const projectKey=trigger.dataset.managementRevisionTriggerV118;
      if(!projectKey) return;

      managementEnsureRevisionSelectionsV118();
      const popover=ensureManagementRevisionPopoverV118();
      const isSameOpen=managementRevisionPopoverProjectKeyV118===projectKey && !popover.classList.contains("hidden");
      if(isSameOpen){
        closeManagementRevisionPopoverV118();
      }else{
        renderManagementRevisionPopoverV118(projectKey,trigger);
      }
      return;
    }

    if(!event.target.closest("#managementRevisionPopoverV118")){
      closeManagementRevisionPopoverV118();
    }
  });

  document.addEventListener("change",event=>{
    const checkbox=event.target.closest("[data-management-revision-checkbox-v118]");
    if(!checkbox) return;
    event.stopPropagation();

    const projectKey=checkbox.dataset.managementRevisionProjectV118;
    const submissionId=checkbox.dataset.managementRevisionCheckboxV118;
    if(!projectKey || !submissionId) return;

    const selected=new Set(managementSelectedRevisionIdsV118.get(projectKey) || []);
    if(checkbox.checked){
      if(selected.size>=2){
        checkbox.checked=false;
        return;
      }
      selected.add(submissionId);
    }else{
      if(selected.size<=1){
        checkbox.checked=true;
        return;
      }
      selected.delete(submissionId);
    }

    managementSelectedRevisionIdsV118.set(projectKey,selected);
    managementRevisionPopoverProjectKeyV118=projectKey;
    managementSyncComparisonSelectionsV103();
  });

  window.addEventListener("resize",closeManagementRevisionPopoverV118);
  window.addEventListener("scroll",closeManagementRevisionPopoverV118,true);
});
