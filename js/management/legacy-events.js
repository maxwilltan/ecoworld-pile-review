/* ------------------------------------------------------------
   Initialisation + event binding
   ------------------------------------------------------------ */

function initManagementPortal(){
  populateManagementRegionFilter();
  renderManagementOverview();
  renderManagementComparisonSlots();
  renderManagementSettings();
  renderManagementPileReference();
}

document.addEventListener("DOMContentLoaded", () => {
  $("managementSubmissionSearch")
    ?.addEventListener(
      "input",
      renderManagementOverview
    );

  $("managementRegionFilter")
    ?.addEventListener(
      "change",
      renderManagementOverview
    );

  $("managementBuildingFilter")
    ?.addEventListener(
      "change",
      renderManagementOverview
    );

  $("managementSubmissionList")
    ?.addEventListener(
      "click",
      event => {
        const viewButton =
          event.target.closest(
            "[data-management-view-submission]"
          );

        if(viewButton){
          openManagementSubmissionModal(
            viewButton.dataset.managementViewSubmission
          );
          return;
        }

        const pileButton =
          event.target.closest(
            "[data-management-pile-check]"
          );

        if(pileButton){
          openManagementPileCheck(
            pileButton.dataset.managementPileCheck
          );
        }
      }
    );

  [
    "closeManagementSubmissionModal",
    "doneManagementSubmissionModal"
  ].forEach(id =>
    $(id)?.addEventListener(
      "click",
      closeManagementSubmissionModal
    )
  );

  $("managementSubmissionModal")
    ?.addEventListener(
      "click",
      event => {
        const openFolderButton = event.target.closest(
          "[data-management-open-file-folder]"
        );

        if(openFolderButton){
          openManagementDrawingFolderModal(
            openFolderButton.dataset.managementOpenFileFolder,
            openFolderButton.dataset.managementFileFolderField,
            openFolderButton.dataset.managementFileFolderLabel
          );
          return;
        }

        if(
          event.target ===
          $("managementSubmissionModal")
        ){
          closeManagementSubmissionModal();
        }
      }
    );

  [
    "closeManagementDrawingFolderModal",
    "doneManagementDrawingFolderModal"
  ].forEach(id =>
    $(id)?.addEventListener(
      "click",
      closeManagementDrawingFolderModal
    )
  );

  $("managementDrawingFolderModal")
    ?.addEventListener(
      "click",
      event => {
        const openFileButton = event.target.closest(
          "[data-management-open-submission-file]"
        );

        if(openFileButton){
          openManagementSubmissionFile(
            openFileButton.dataset.managementOpenSubmissionFile,
            openFileButton.dataset.managementOpenFileField,
            openFileButton.dataset.managementOpenFileIndex
          );
          return;
        }

        if(event.target === $("managementDrawingFolderModal")){
          closeManagementDrawingFolderModal();
        }
      }
    );

  $("managementComparisonSlots")
    ?.addEventListener(
      "change",
      event => {
        const projectSelect =
          event.target.closest(
            "[data-comparison-project]"
          );

        if(projectSelect){
          const index =
            Number(
              projectSelect.dataset.comparisonProject
            );

          managementComparisonSelections[index] = {
            projectKey:projectSelect.value,
            revision:""
          };

          renderManagementComparisonSlots();
          renderManagementComparison();
          return;
        }

        const revisionSelect =
          event.target.closest(
            "[data-comparison-revision]"
          );

        if(revisionSelect){
          const index =
            Number(
              revisionSelect.dataset.comparisonRevision
            );

          managementComparisonSelections[index].revision =
            revisionSelect.value;

          renderManagementComparison();
        }
      }
    );

  $("saveConsultantTableSettings")
    ?.addEventListener(
      "click",
      () => {
        saveStorage(
          ECO_FRESH_STORAGE.tableSettings,
          collectManagementSettings()
        );

        renderManagementSettings();

        alert(
          "Consultant Submission table settings saved."
        );
      }
    );

  $("resetConsultantTableSettings")
    ?.addEventListener(
      "click",
      () => {
        if(
          !confirm(
            "Reset Consultant table settings to default?"
          )
        ){
          return;
        }

        localStorage.removeItem(
          ECO_FRESH_STORAGE.tableSettings
        );

        renderManagementSettings();
      }
    );

  $("managementPileReferenceBody")
    ?.addEventListener(
      "click",
      event => {
        const remove =
          event.target.closest(
            "[data-remove-pile-ref]"
          );

        if(!remove) return;

        remove.closest("tr")?.remove();
      }
    );

  $("addPileReferenceRowBtn")
    ?.addEventListener(
      "click",
      () => {
        const body =
          $("managementPileReferenceBody");

        const index =
          body.querySelectorAll("tr").length;

        body.insertAdjacentHTML(
          "beforeend",
          `
            <tr>
              <td><input type="text" data-pile-ref-index="${index}" data-pile-ref-field="pileType" placeholder="Pile Type" /></td>
              <td><input type="number" data-pile-ref-index="${index}" data-pile-ref-field="pileSize" placeholder="Size" /></td>
              <td><input type="number" data-pile-ref-index="${index}" data-pile-ref-field="pileCapacity" placeholder="Capacity" /></td>
              <td><input type="number" step="0.01" data-pile-ref-index="${index}" data-pile-ref-field="averagePrice" placeholder="Optional" /></td>
              <td><button type="button" class="management-table-delete-btn" data-remove-pile-ref="${index}">×</button></td>
            </tr>
          `
        );
      }
    );

  $("savePileReferenceBtn")
    ?.addEventListener(
      "click",
      () => {
        const rows =
          collectManagementPileReference();

        if(!rows.length){
          alert(
            "Add at least one valid pile reference."
          );
          return;
        }

        saveManagementPileReference(rows);
        renderManagementPileReference();

        alert(
          "Pile Reference saved. Consultant calculations now use the updated values."
        );
      }
    );

  $("resetPileReferenceBtn")
    ?.addEventListener(
      "click",
      () => {
        if(
          !confirm(
            "Reset Pile Reference to default values?"
          )
        ){
          return;
        }

        localStorage.removeItem(
          ECO_FRESH_STORAGE.pileReference
        );

        renderManagementPileReference();
      }
    );

  [
    "closeManagementPileCheckModal",
    "closeManagementPileCheckBottom"
  ].forEach(id =>
    $(id)?.addEventListener(
      "click",
      closeManagementPileCheck
    )
  );

  $("managementPileCheckModal")
    ?.addEventListener(
      "click",
      event => {
        if(
          event.target ===
          $("managementPileCheckModal")
        ){
          closeManagementPileCheck();
        }
      }
    );

  $("managementPileCheckBody")
    ?.addEventListener(
      "change",
      event => {
        const input =
          event.target.closest(
            "[data-management-pile-index][data-management-pile-field]"
          );

        if(!input) return;

        const index =
          Number(
            input.dataset.managementPileIndex
          );

        const field =
          input.dataset.managementPileField;

        const row =
          managementPileProposalRows[index];

        if(!row) return;

        row[field] =
          input.value;

        if(field === "pileType"){
          const sizes =
            pileSizesFromManagementReference(
              row.pileType
            );

          row.pileSize =
            sizes.includes(
              String(row.pileSize)
            )
              ? String(row.pileSize)
              : (sizes[0] || "");
        }

        renderManagementPileCheck();
      }
    );

  $("managementPileCheckBody")
    ?.addEventListener(
      "click",
      event => {
        const auto =
          event.target.closest(
            "[data-management-auto-row]"
          );

        if(!auto) return;

        autoOptimiseManagementRow(
          Number(
            auto.dataset.managementAutoRow
          )
        );
      }
    );

  $("managementAutoOptimiseAll")
    ?.addEventListener(
      "click",
      () => {
        managementPileProposalRows
          .forEach((row,index) =>
            autoOptimiseManagementRow(index)
          );

        renderManagementPileCheck();
      }
    );

});
