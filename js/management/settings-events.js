/* ============================================================
   V22 Settings events: integrated Consultant Submission editor
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  $("managementSettingsRegionSelect")
    ?.addEventListener("change", event => {
      managementSettingsSelectedRegion =
        event.target.value;
      managementSettingsSelectedBusinessUnit = "";
      managementSettingsSelectedProject = "";
      renderManagementSettingsHierarchy();
    });

  $("managementSettingsBusinessUnitSelect")
    ?.addEventListener("change", event => {
      managementSettingsSelectedBusinessUnit =
        event.target.value;
      managementSettingsSelectedProject = "";
      renderManagementSettingsHierarchy();
    });

  $("managementSettingsProjectSelect")
    ?.addEventListener("change", event => {
      managementSettingsSelectedProject =
        event.target.value;

      const search =
        $("managementSettingsProjectSearch");

      if(search){
        search.value =
          managementSettingsSelectedProject;
      }

      renderManagementSettingsHierarchy();
    });

  $("managementSettingsRevisionSelect")
    ?.addEventListener("change", event => {
      managementSettingsRevisionV22 =
        event.target.value;
      renderManagementConsultantTableSettingsV21();
    });

  $("managementSettingsYearSelect")
    ?.addEventListener("change", event => {
      managementSettingsYearV87 = event.target.value;
    });

  $("managementSettingsProjectSearch")
    ?.addEventListener("input", event => {
      renderManagementSettingsSearchResultsV22(
        event.target.value
      );
    });

  $("managementSettingsProjectSearchResults")
    ?.addEventListener("click", event => {
      const result =
        event.target.closest(
          "[data-management-settings-search-project]"
        );

      if(!result) return;

      managementSettingsSelectedRegion =
        result.dataset.managementSettingsSearchRegion;
      managementSettingsSelectedBusinessUnit =
        result.dataset.managementSettingsSearchBusinessUnit;
      managementSettingsSelectedProject =
        result.dataset.managementSettingsSearchProject;

      const search =
        $("managementSettingsProjectSearch");

      if(search){
        search.value =
          managementSettingsSelectedProject;
      }

      $("managementSettingsProjectSearchResults")
        ?.classList.add("hidden");

      renderManagementSettingsHierarchy();
    });

  $("addManagementSettingsRegionBtn")
    ?.addEventListener(
      "click",
      addManagementHierarchyRegion
    );

  $("addManagementSettingsBusinessUnitBtn")
    ?.addEventListener(
      "click",
      addManagementHierarchyBusinessUnit
    );

  $("addManagementSettingsProjectBtn")
    ?.addEventListener(
      "click",
      addManagementHierarchyProject
    );

  $("removeManagementSettingsRegionBtn")
    ?.addEventListener(
      "click",
      removeManagementHierarchyRegion
    );

  $("removeManagementSettingsBusinessUnitBtn")
    ?.addEventListener(
      "click",
      removeManagementHierarchyBusinessUnit
    );

  $("removeManagementSettingsProjectBtn")
    ?.addEventListener(
      "click",
      removeManagementHierarchyProject
    );

  $("managementSettingsView")
    ?.addEventListener("click", event => {
      const edit =
        event.target.closest(
          "[data-edit-management-dropdown]"
        );

      if(edit){
        const key =
          edit.dataset.editManagementDropdown;

        managementSettingsOpenDropdownV22 =
          managementSettingsOpenDropdownV22 === key
            ? ""
            : key;

        renderManagementConsultantTableSettingsV21();
        renderManagementSettingsRevisionV22();
        return;
      }

      const close =
        event.target.closest(
          "[data-close-management-dropdown]"
        );

      if(close){
        managementSettingsOpenDropdownV22 = "";
        renderManagementConsultantTableSettingsV21();
        renderManagementSettingsRevisionV22();
        return;
      }

      const addOption =
        event.target.closest(
          "[data-add-management-dropdown-option]"
        );

      if(addOption){
        addManagementSettingsDropdownOptionV22(
          addOption.dataset.addManagementDropdownOption
        );
        return;
      }

      const removeOption =
        event.target.closest(
          "[data-remove-management-dropdown-option]"
        );

      if(removeOption){
        removeManagementSettingsDropdownOptionV22(
          removeOption.dataset.removeManagementDropdownOption,
          Number(
            removeOption.dataset.removeManagementDropdownIndex
          )
        );
        return;
      }
    });

  $("managementSettingsView")
    ?.addEventListener("change", event => {
      const preview =
        event.target.closest(
          "[data-management-preview-field]"
        );

      if(preview){
        managementSettingsPreviewDataV22[
          preview.dataset.managementPreviewField
        ] = preview.value;

        renderManagementConsultantTableSettingsV21();
        return;
      }

      const option =
        event.target.closest(
          "[data-management-dropdown-option-key]"
        );

      if(option){
        saveManagementSettingsDropdownOptionV22(
          option.dataset.managementDropdownOptionKey,
          Number(
            option.dataset.managementDropdownOptionIndex
          ),
          option.value
        );
      }
    });

  document.addEventListener("click", event => {
    if(
      !event.target.closest(
        "#managementSettingsProjectSearch"
      ) &&
      !event.target.closest(
        "#managementSettingsProjectSearchResults"
      )
    ){
      $("managementSettingsProjectSearchResults")
        ?.classList.add("hidden");
    }
  });
});
