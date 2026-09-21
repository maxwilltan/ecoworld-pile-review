/* Read-only saved versions; opening a version never changes the active form. */
(function(){
  let activeId = "";
  let returnFocus = null;

  function accessibleRecord(){
    const record = getSubmissions().find(item => String(item.id) === String(activeId));
    if(!record) return null;
    if(state.auth?.role === "Management") return record;
    if(state.auth?.role !== "Consultant") return null;
    const account = currentConsultantAccountConfig();
    return account?.active && submissionBelongsToCurrentConsultant(record) &&
      consultantCanAccessProjectV139(record.region, record.businessUnit, record.project) ? record : null;
  }

  function versions(record){
    return [record, ...(Array.isArray(record.previousVersions) ? record.previousVersions.slice().reverse() : [])];
  }

  function dateLabel(value){
    const date = new Date(value || "");
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
  }

  function valueMarkup(value){
    if(value === null || value === undefined || value === "") return "—";
    if(Array.isArray(value)){
      if(!value.length) return "—";
      return `<ol class="version-history-list">${value.map(item => `<li>${valueMarkup(item)}</li>`).join("")}</ol>`;
    }
    if(typeof value === "object"){
      return `<dl class="version-history-values">${Object.entries(value).map(([key,item]) => `<div><dt>${escapeHtml(fieldLabel(key))}</dt><dd>${valueMarkup(item)}</dd></div>`).join("")}</dl>`;
    }
    return escapeHtml(value);
  }

  function fieldLabel(key){
    const labels = { loadingCapacityRows:"Loading / capacity details", poundageDetails:"Poundage calculations", steelWeight:"Steel weight (kg)", concreteVolume:"Concrete volume (m³)", exceedReason:"Remark", exceeded:"Guide exceeded", columnLoading:"Column loading (kN)", totalCapacity:"Total capacity (kN)", gridlineCarparkVertical:"Gridline — vertical", gridlineCarparkHorizontal:"Gridline — horizontal" };
    if(labels[key]) return labels[key];
    for(const section of OVERVIEW_SECTIONS){
      const rows = typeof managementSettingsRowsForSection === "function" ? managementSettingsRowsForSection(section) : section.rows;
      const row = rows.find(item => item.key === key);
      if(row) return row.label;
    }
    return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, text => text.toUpperCase());
  }

  function close(){
    document.getElementById("submissionVersionHistoryV31")?.remove();
    activeId = "";
    returnFocus?.focus();
  }

  function renderVersion(versionNumber){
    const record = accessibleRecord();
    const body = document.getElementById("submissionVersionBodyV31");
    if(!record || !body){ close(); return; }
    const allVersions = versions(record);
    const index = allVersions.findIndex((item,position) =>
      Number(item.versionNumber || (allVersions.length-position)) === Number(versionNumber));
    const version = allVersions[index];
    if(!version){ close(); return; }
    const selectedVersionNumber = version.versionNumber || (allVersions.length-index);
    const data = version.formData || {};
    const fields = Object.entries(data);
    const rows = fields.map(([key,value]) => {
      if(key === "drawingArchitectural" || key === "drawingStructural"){
        const files = normaliseDrawingFiles(value);
        return `<tr><th scope="row">${escapeHtml(fieldLabel(key))}</th><td>${files.length ? files.map((file,fileIndex) => `<button type="button" class="small-btn soft" data-version-file-field="${escapeHtml(key)}" data-version-file-index="${fileIndex}">${escapeHtml(file.name || "Open drawing")}</button>`).join(" ") : "—"}</td></tr>`;
      }
      if(value && typeof value === "object"){
        return `<tr><th scope="row">${escapeHtml(fieldLabel(key))}</th><td><details><summary>View saved details</summary>${valueMarkup(value)}</details></td></tr>`;
      }
      return `<tr><th scope="row">${escapeHtml(fieldLabel(key))}</th><td>${valueMarkup(value)}</td></tr>`;
    }).join("");
    body.innerHTML = `<p class="version-history-meta">${escapeHtml(version.revision || "—")} · ${escapeHtml(submissionYearLabel(version))} · Saved ${escapeHtml(dateLabel(version.updatedAt))}</p><table class="version-history-table"><thead><tr><th>Item</th><th>Saved value</th></tr></thead><tbody>${rows}</tbody></table>`;
    body.querySelectorAll("[data-version-file-field]").forEach(button => button.addEventListener("click", () => {
      const fresh = accessibleRecord();
      const freshVersions = fresh ? versions(fresh) : [];
      const selected = freshVersions.find((item,position) =>
        (item.versionNumber || (freshVersions.length-position)) === selectedVersionNumber);
      if(!selected){ close(); return; }
      const file = normaliseDrawingFiles(selected.formData?.[button.dataset.versionFileField])[Number(button.dataset.versionFileIndex)];
      if(file) openEcoStoredFile(file);
    }));
  }

  window.showSubmissionVersionHistoryV31 = function(id){
    document.getElementById("submissionVersionHistoryV31")?.remove();
    activeId = id;
    const record = accessibleRecord();
    if(!record) return;
    returnFocus = document.activeElement;
    const allVersions = versions(record);
    const modal = document.createElement("div");
    modal.id = "submissionVersionHistoryV31";
    modal.className = "version-history-backdrop";
    modal.innerHTML = `<section class="version-history-dialog" role="dialog" aria-modal="true" aria-labelledby="submissionVersionTitleV31"><header><div><h2 id="submissionVersionTitleV31">Version history</h2><p>${escapeHtml(record.project || "Project")} · ${escapeHtml(record.consultantAccountName || record.formData?.consultantName || "Consultant")}</p></div><button type="button" class="small-btn soft" id="closeSubmissionVersionsV31" aria-label="Close version history">Close</button></header><div class="version-history-picker"><label for="submissionVersionSelectV31">Saved version</label><select id="submissionVersionSelectV31">${allVersions.map((item,index) => `<option value="${escapeHtml(item.versionNumber || (allVersions.length-index))}">Version ${escapeHtml(item.versionNumber || (allVersions.length-index))}${index === 0 ? " — current" : " — previous"} · ${escapeHtml(dateLabel(item.updatedAt))}</option>`).join("")}</select><span>Read only · original submissions and drawings retained</span></div><div id="submissionVersionBodyV31" class="version-history-body"></div></section>`;
    document.body.appendChild(modal);
    modal.querySelector("#closeSubmissionVersionsV31").addEventListener("click", close);
    modal.querySelector("#submissionVersionSelectV31").addEventListener("change", event => renderVersion(Number(event.target.value)));
    modal.addEventListener("click", event => { if(event.target === modal) close(); });
    modal.addEventListener("keydown", event => {
      if(event.key === "Escape"){ event.preventDefault(); event.stopPropagation(); close(); }
      if(event.key === "Tab"){
        const controls = [...modal.querySelectorAll("button,select,summary")].filter(node => !node.disabled && node.getClientRects().length);
        const first = controls[0], last = controls[controls.length-1];
        if(event.shiftKey && document.activeElement === first){ event.preventDefault(); last.focus(); }
        else if(!event.shiftKey && document.activeElement === last){ event.preventDefault(); first.focus(); }
      }
    });
    renderVersion(record.versionNumber || allVersions.length);
    modal.querySelector("#closeSubmissionVersionsV31").focus();
  };
})();
