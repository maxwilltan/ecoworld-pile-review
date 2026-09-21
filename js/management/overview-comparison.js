/* Internal Overview + Comparison with checkbox multi-select inside Select Project */

let managementOverviewSelectedProjectKeysV103 = new Set();

function managementLatestSubmissionMapV103(){
  const latest = new Map();
  getSubmissions().forEach(item => {
    const key = managementProjectKey(item);
    const current = latest.get(key);
    if(!current || new Date(item.updatedAt || 0).getTime() > new Date(current.updatedAt || 0).getTime()){
      latest.set(key,item);
    }
  });
  return latest;
}

function managementCleanSelectedProjectsV103(){
  const valid = new Set(managementLatestSubmissionMapV103().keys());
  managementOverviewSelectedProjectKeysV103 = new Set(
    [...managementOverviewSelectedProjectKeysV103].filter(key => valid.has(key))
  );
}

function managementSelectedSubmissionsV103(){
  const latest = managementLatestSubmissionMapV103();
  return [...managementOverviewSelectedProjectKeysV103]
    .map(key => latest.get(key))
    .filter(Boolean);
}

function managementThisWeekRangeV107(){
  const now=new Date();
  const start=new Date(now);
  const day=(start.getDay()+6)%7; // Monday = 0
  start.setHours(0,0,0,0);
  start.setDate(start.getDate()-day);

  const end=new Date(start);
  end.setDate(end.getDate()+7);
  return {start,end};
}

function managementThisWeekSubmissionsV107(submissions){
  const {start,end}=managementThisWeekRangeV107();
  return submissions.filter(item=>{
    const date=new Date(item.updatedAt||item.submittedAt||0);
    return !Number.isNaN(date.getTime()) && date>=start && date<end;
  });
}

function managementRenderThisWeekSubmissionsV107(items){
  const countEl=$("managementStatLatest");
  const listEl=$("managementWeeklySubmissionList");
  if(countEl) countEl.textContent=String(items.length);
  if(!listEl) return;

  if(!items.length){
    listEl.innerHTML=`<small class="management-weekly-empty">No submissions this week.</small>`;
    return;
  }

  listEl.innerHTML=items.map(item=>{
    const date=new Date(item.updatedAt||item.submittedAt||0);
    const dateText=Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString([], {weekday:"short",day:"2-digit",month:"short"});
    const revision=item.revision||"—";
    const year=item.year||"";
    return `
      <div class="management-weekly-submission-item">
        <div class="management-weekly-submission-copy">
          <b>${escapeHtml(item.project||"Unnamed project")}</b>
          <small>${escapeHtml([revision,year].filter(Boolean).join(" · "))}</small>
        </div>
        <time>${escapeHtml(dateText)}</time>
      </div>
    `;
  }).join("");
}

function managementUpdateOverviewStatsV103(){
  const submissions=getSubmissions().slice().sort(
    (a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0)
  );
  const selectedCount=managementOverviewSelectedProjectKeysV103.size;
  const thisWeek=managementThisWeekSubmissionsV107(submissions);

  if($("managementStatSubmissions")) $("managementStatSubmissions").textContent=String(submissions.length);
  if($("managementStatSelected")) $("managementStatSelected").textContent=String(selectedCount);
  managementRenderThisWeekSubmissionsV107(thisWeek);
  if($("managementOverviewCount")) $("managementOverviewCount").textContent=`${selectedCount} selected`;
}

function managementUpdateOverviewStatusV103(visibleCount){
  const status=$("managementOverviewStatus");
  if(!status) return;
  const parts=[];
  if(managementOverviewSelectionV20.region) parts.push(managementOverviewSelectionV20.region);
  if(managementOverviewSelectionV20.businessUnit) parts.push(managementOverviewSelectionV20.businessUnit);

  status.textContent=
    `${visibleCount} project${visibleCount===1?"":"s"} available`+
    (parts.length ? ` · ${parts.join(" → ")}` : " · All projects")+
    ` · ${managementOverviewSelectedProjectKeysV103.size} selected`;
}

function managementProjectDropdownLabelV103(){
  const selected=managementSelectedSubmissionsV103();
  if(!selected.length) return "Select Project";
  if(selected.length===1) return selected[0].project || "1 project selected";
  return `${selected.length} projects selected`;
}

function closeManagementProjectMultiSelectV103(){
  const panel=$("managementOverviewProjectMultiSelectPanel");
  const trigger=$("managementOverviewProjectMultiSelectTrigger");
  panel?.classList.add("hidden");
  trigger?.setAttribute("aria-expanded","false");
}

function renderManagementProjectMultiSelectV103(){
  const trigger=$("managementOverviewProjectMultiSelectTrigger");
  const label=$("managementOverviewProjectMultiSelectLabel");
  const panel=$("managementOverviewProjectMultiSelectPanel");
  const container=$("managementProjectCheckboxListV103");
  if(!trigger || !label || !panel || !container) return;

  managementCleanSelectedProjectsV103();

  const hasBusinessUnit=Boolean(managementOverviewSelectionV20.businessUnit);
  trigger.disabled=!hasBusinessUnit;

  if(!hasBusinessUnit){
    label.textContent="Select business unit first";
    container.innerHTML="";
    closeManagementProjectMultiSelectV103();
    managementUpdateOverviewStatusV103(0);
    return;
  }

  label.textContent=managementProjectDropdownLabelV103();

  /* show every configured project in the selected Business Unit.
     Projects without any submitted revision stay visible but cannot be ticked. */
  const hierarchy=getPortalHierarchyConfig();
  const region=managementOverviewSelectionV20.region || "";
  const businessUnit=managementOverviewSelectionV20.businessUnit || "";
  const projects=(hierarchy.businessUnitProjects[businessUnit] || []).slice();
  const latest=managementLatestSubmissionMapV103();

  const entries=projects.map(project=>{
    const key=managementProjectKey({region,businessUnit,project});
    return {key,project,submission:latest.get(key) || null};
  });

  managementUpdateOverviewStatusV103(entries.length);

  if(!entries.length){
    container.innerHTML=`<div class="internal-project-multiselect-empty">No projects configured for this Business Unit.</div>`;
    return;
  }

  container.innerHTML=entries.map(({key,project,submission})=>{
    const available=Boolean(submission);
    const selected=available && managementOverviewSelectedProjectKeysV103.has(key);
    return `
      <label class="internal-project-multiselect-option ${selected?"selected":""} ${available?"":"unavailable"}" ${available?"":'title="No submission available"'}>
        <input
          type="checkbox"
          data-management-project-checkbox-v103="${escapeHtml(key)}"
          ${selected?"checked":""}
          ${available?"":"disabled"}
        />
        <span>${escapeHtml(project || "Project")}</span>
      </label>
    `;
  }).join("");
}

function managementSyncComparisonSelectionsV103(){
  const items=managementSelectedSubmissionsV103();
  managementComparisonSelections=items.map(item=>({
    projectKey:managementProjectKey(item),
    revision:item.revision||"",
    submissionId:item.id
  }));
  managementUpdateOverviewStatsV103();
  renderManagementComparison();
}

/* Disable the old column/slot comparison UI. */
function renderManagementComparisonSlots(){ return; }
function renderManagementComparisonFilters(){ return; }

function selectedManagementComparisonSubmissions(){
  return managementComparisonSelections
    .map(selection=>{
      if(selection.submissionId){
        return getSubmissions().find(item=>item.id===selection.submissionId)||null;
      }
      if(!selection.projectKey) return null;
      return getSubmissions()
        .filter(item=>managementProjectKey(item)===selection.projectKey && (!selection.revision || item.revision===selection.revision))
        .sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0))[0]||null;
    })
    .filter(Boolean);
}

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

  if(pill) pill.textContent=`${items.length} project${items.length===1?"":"s"}`;
  if(summary){
    summary.textContent=items.length
      ? `${items.length} selected project${items.length===1?"":"s"}.`
      : "Tick projects from Select Project to start comparing.";
  }

  if(!items.length){
    card.classList.add("hidden");
    empty.classList.remove("hidden");
    table.classList.add("hidden");
    table.style.minWidth="";
    return;
  }

  card.classList.remove("hidden");
  empty.classList.add("hidden");
  table.classList.remove("hidden");
  table.style.minWidth=items.length>4 ? `${260+items.length*175}px` : "0px";

  head.innerHTML=`
    <tr>
      <th>Item</th>
      ${items.map(item=>{
        const year=typeof submissionYearLabel==="function" ? submissionYearLabel(item) : (item.year||"—");
        return `
          <th>
            <div class="management-comparison-project-head-v101">
              <strong>${escapeHtml(item.project||"Project")}</strong>
              <small>${escapeHtml(item.revision||"—")} · ${escapeHtml(year||"—")}</small>
            </div>
          </th>
        `;
      }).join("")}
    </tr>
  `;

  const rows=managementComparisonRows(items);
  body.innerHTML=rows.map(entry=>{
    if(entry.type==="section"){
      return `<tr class="management-comparison-section-row"><td colspan="${items.length+1}">${escapeHtml(entry.label)}</td></tr>`;
    }

    const values=items.map(item=>managementComparisonDisplay(item,entry));
    const distinct=new Set(values.filter(value=>value!=="—"));
    const labelText=entry.label||entry.row.label;
    const guide=managementComparisonGuide(entry);

    return `
      <tr>
        <td>
          ${guide
            ? `<div class="comparison-poundage-item"><span class="comparison-poundage-label">${escapeHtml(labelText)}</span><span class="comparison-poundage-divider">|</span><small class="comparison-poundage-guide-text">${escapeHtml(guide)}</small></div>`
            : `<span>${escapeHtml(labelText)}</span>`}
        </td>
        ${values.map(value=>`<td class="${distinct.size>1?"comparison-different":""}">${escapeHtml(value)}</td>`).join("")}
      </tr>
    `;
  }).join("");
}

function renderManagementOverview(){
  /* Project is now multi-selected through the custom dropdown, not a single filter. */
  managementOverviewSelectionV20.project="";
  populateManagementOverviewSelectorsV20();
  managementCleanSelectedProjectsV103();
  managementUpdateOverviewStatsV103();
  renderManagementProjectMultiSelectV103();
  managementSyncComparisonSelectionsV103();
}

/* Any stale comparison navigation goes back to the combined Overview. */
const showManagementViewBeforeV103=showManagementView;
showManagementView=function(viewName){
  return showManagementViewBeforeV103(viewName==="managementComparison" ? "managementOverview" : viewName);
};

document.addEventListener("DOMContentLoaded",()=>{
  const weeklyTrigger=$("managementWeeklySubmissionsTrigger");
  const weeklyPopover=$("managementWeeklySubmissionsPopover");
  const weeklyCard=$("managementWeeklySubmissionsCard");

  function closeWeeklySubmissionsDropdown(){
    if(!weeklyTrigger || !weeklyPopover) return;
    weeklyPopover.classList.add("hidden");
    weeklyTrigger.setAttribute("aria-expanded","false");
    weeklyCard?.classList.remove("weekly-open");
  }

  weeklyTrigger?.addEventListener("click",event=>{
    event.stopPropagation();
    if(!weeklyPopover) return;
    const opening=weeklyPopover.classList.contains("hidden");
    weeklyPopover.classList.toggle("hidden",!opening);
    weeklyTrigger.setAttribute("aria-expanded",opening?"true":"false");
    weeklyCard?.classList.toggle("weekly-open",opening);
  });

  weeklyPopover?.addEventListener("click",event=>event.stopPropagation());

  document.addEventListener("click",event=>{
    if(!event.target.closest("#managementWeeklySubmissionsCard")){
      closeWeeklySubmissionsDropdown();
    }
  });

  document.addEventListener("keydown",event=>{
    if(event.key==="Escape") closeWeeklySubmissionsDropdown();
  });
  $("managementOverviewProjectMultiSelectTrigger")?.addEventListener("click",()=>{
    const trigger=$("managementOverviewProjectMultiSelectTrigger");
    const panel=$("managementOverviewProjectMultiSelectPanel");
    if(!trigger || trigger.disabled || !panel) return;
    const opening=panel.classList.contains("hidden");
    panel.classList.toggle("hidden",!opening);
    trigger.setAttribute("aria-expanded",opening?"true":"false");
    if(opening) closeManagementOverviewProjectSearchV20?.();
  });

  const projectCheckboxListV103=$("managementProjectCheckboxListV103");

  function applyManagementProjectCheckboxV113(checkbox){
    if(!checkbox) return;
    const key=checkbox.dataset.managementProjectCheckboxV103;
    if(!key) return;

    if(checkbox.checked) managementOverviewSelectedProjectKeysV103.add(key);
    else managementOverviewSelectedProjectKeysV103.delete(key);

    checkbox.closest(".internal-project-multiselect-option")
      ?.classList.toggle("selected", checkbox.checked);

    const label=$("managementOverviewProjectMultiSelectLabel");
    if(label) label.textContent=managementProjectDropdownLabelV103();

    managementSyncComparisonSelectionsV103();
  }

  projectCheckboxListV103?.addEventListener("change",event=>{
    const checkbox=event.target.closest("[data-management-project-checkbox-v103]");
    if(!checkbox) return;
    event.stopPropagation();
    applyManagementProjectCheckboxV113(checkbox);
  });

  projectCheckboxListV103?.addEventListener("click",event=>{
    const option=event.target.closest(".internal-project-multiselect-option");
    if(!option) return;
    event.stopPropagation();

    /* Make the full project row clickable. Prevent the label's synthetic
       checkbox click when the user clicked the row/text, then toggle once. */
    const checkbox=option.querySelector("[data-management-project-checkbox-v103]");
    if(!checkbox || checkbox.disabled) return;

    if(event.target!==checkbox){
      event.preventDefault();
      checkbox.checked=!checkbox.checked;
      applyManagementProjectCheckboxV113(checkbox);
    }
  });

  $("clearManagementProjectSelectionV103")?.addEventListener("click",event=>{
    event.stopPropagation();
    managementOverviewSelectedProjectKeysV103.clear();
    renderManagementProjectMultiSelectV103();
    managementSyncComparisonSelectionsV103();
  });

  document.addEventListener("click",event=>{
    if(!event.target.closest("#managementOverviewProjectMultiSelectV103")){
      closeManagementProjectMultiSelectV103();
    }
  });

  $("managementOverviewRegionSelect")?.addEventListener("change",()=>closeManagementProjectMultiSelectV103());
  $("managementOverviewBusinessUnitSelect")?.addEventListener("change",()=>closeManagementProjectMultiSelectV103());

});
