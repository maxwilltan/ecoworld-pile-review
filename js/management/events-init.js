/* ---------------- V20 init ---------------- */

function initManagementPortal(){
  renderManagementOverview();
  renderManagementComparisonFilters();
  renderManagementComparisonSlots();
  renderManagementComparison();
  renderManagementSettings();
  renderManagementPileReference();
}

document.addEventListener("DOMContentLoaded", () => {
  /* Overview selectors */
  $("managementOverviewRegionSelect")
    ?.addEventListener("change", event => {
      managementOverviewSelectionV20.region =
        event.target.value;

      managementOverviewSelectionV20.businessUnit = "";
      managementOverviewSelectionV20.project = "";

      $("managementOverviewProjectSearch").value = "";

      renderManagementOverview();
    });

  $("managementOverviewBusinessUnitSelect")
    ?.addEventListener("change", event => {
      managementOverviewSelectionV20.businessUnit =
        event.target.value;

      managementOverviewSelectionV20.project = "";

      $("managementOverviewProjectSearch").value = "";

      renderManagementOverview();
    });

  $("managementOverviewProjectSelect")
    ?.addEventListener("change", event => {
      managementOverviewSelectionV20.project =
        event.target.value;

      $("managementOverviewProjectSearch").value =
        event.target.value;

      renderManagementOverview();
    });

  $("managementOverviewProjectSearch")
    ?.addEventListener("input", event => {
      if(
        managementOverviewSelectionV20.project &&
        event.target.value !==
          managementOverviewSelectionV20.project
      ){
        managementOverviewSelectionV20.project = "";
        $("managementOverviewProjectSelect").value = "";
      }

      renderManagementOverviewProjectSearchV20(
        event.target.value
      );

      renderManagementOverview();
    });

  $("managementOverviewProjectSearch")
    ?.addEventListener("focus", event => {
      if(event.target.value.trim()){
        renderManagementOverviewProjectSearchV20(
          event.target.value
        );
      }
    });

  $("managementOverviewProjectSearchResults")
    ?.addEventListener("click", event => {
      const button =
        event.target.closest(
          "[data-management-search-project]"
        );

      if(!button) return;

      managementOverviewSelectionV20 = {
        region:
          button.dataset.managementSearchRegion,
        businessUnit:
          button.dataset.managementSearchBusinessUnit,
        project:
          button.dataset.managementSearchProject
      };

      $("managementOverviewProjectSearch").value =
        managementOverviewSelectionV20.project;

      closeManagementOverviewProjectSearchV20();
      renderManagementOverview();
    });

  document.addEventListener("click", event => {
    if(
      !event.target.closest(
        "#managementOverviewProjectSearch"
      ) &&
      !event.target.closest(
        "#managementOverviewProjectSearchResults"
      )
    ){
      closeManagementOverviewProjectSearchV20();
    }
  });

  const comparisonFilterButton =
    $("toggleComparisonFiltersBtn");

  const comparisonFilterPanel =
    $("managementComparisonFilters");

  comparisonFilterButton
    ?.addEventListener("mouseenter", () => {
      openManagementComparisonFilterPopup();
    });

  comparisonFilterButton
    ?.addEventListener("mouseleave", () => {
      scheduleManagementComparisonFilterClose();
    });

  comparisonFilterButton
    ?.addEventListener("click", () => {
      managementComparisonFiltersPinned =
        !managementComparisonFiltersPinned;

      managementComparisonFiltersOpen =
        managementComparisonFiltersPinned;

      renderManagementComparisonFilters();
    });

  comparisonFilterPanel
    ?.addEventListener("mouseenter", () => {
      openManagementComparisonFilterPopup();
    });

  comparisonFilterPanel
    ?.addEventListener("mouseleave", () => {
      scheduleManagementComparisonFilterClose();
    });

  /* Comparison filter controls */
  document.addEventListener("click", event => {
    const typeButton =
      event.target.closest(
        "[data-comparison-type-filter]"
      );

    if(typeButton){
      managementComparisonTypeFilter =
        typeButton.dataset.comparisonTypeFilter;

      managementComparisonResetCategoriesForType();

      /*
        Selecting Landed / High Rise automatically
        fills every matching project, as requested.
      */
      managementComparisonSelectAllFilteredProjects();

      return;
    }

    const addCategoryButton =
      event.target.closest(
        "#addManagementComparisonCategoryBtn"
      );

    if(addCategoryButton){
      const select =
        $("managementComparisonCategorySelect");

      const key =
        select?.value || "";

      if(
        key &&
        !managementComparisonActiveCategories
          .includes(key)
      ){
        managementComparisonActiveCategories
          .push(key);

        managementComparisonCategorySelections[
          key
        ] = new Set();

        managementComparisonCategoryAddKey = "";

        renderManagementComparisonFilters();
      }

      return;
    }

    const removeCategory =
      event.target.closest(
        "[data-remove-comparison-category]"
      );

    if(removeCategory){
      const key =
        removeCategory.dataset
          .removeComparisonCategory;

      managementComparisonActiveCategories =
        managementComparisonActiveCategories
          .filter(item =>
            item !== key
          );

      managementComparisonCategorySelections[
        key
      ] = new Set();

      managementComparisonSelectAllFilteredProjects();

      return;
    }
  });

  document.addEventListener("change", event => {
    const categorySelect =
      event.target.closest(
        "#managementComparisonCategorySelect"
      );

    if(categorySelect){
      managementComparisonCategoryAddKey =
        categorySelect.value;

      return;
    }

    const allSections =
      event.target.closest(
        "[data-comparison-filter-all-sections]"
      );

    if(allSections){
      managementComparisonSelectedSections =
        allSections.checked
          ? new Set(
              managementComparisonSectionDefinitions()
            )
          : new Set();

      renderManagementComparisonFilters();
      renderManagementComparison();

      return;
    }

    const sectionOption =
      event.target.closest(
        "[data-comparison-section-option]"
      );

    if(sectionOption){
      const selected =
        new Set(
          Array.from(
            document.querySelectorAll(
              "[data-comparison-section-option]:checked"
            )
          ).map(input =>
            input.dataset.comparisonSectionOption
          )
        );

      managementComparisonSelectedSections =
        selected;

      renderManagementComparisonFilters();
      renderManagementComparison();

      return;
    }

    const allProjects =
      event.target.closest(
        "[data-comparison-filter-all-projects]"
      );

    if(allProjects){
      if(allProjects.checked){
        managementComparisonSelectAllFilteredProjects();
      }else{
        setManagementComparisonProjectsFromFilter(
          new Set()
        );
      }

      return;
    }

    const projectCheckbox =
      event.target.closest(
        "[data-comparison-filter-project]"
      );

    if(projectCheckbox){
      const selected =
        new Set(
          Array.from(
            document.querySelectorAll(
              "[data-comparison-filter-project]:checked"
            )
          ).map(input =>
            input.dataset.comparisonFilterProject
          )
        );

      setManagementComparisonProjectsFromFilter(
        selected
      );

      return;
    }

    const categoryOption =
      event.target.closest(
        "[data-comparison-category-option]"
      );

    if(categoryOption){
      const key =
        categoryOption.dataset
          .comparisonCategoryOption;

      const selected =
        new Set(
          Array.from(
            document.querySelectorAll(
              `[data-comparison-category-option="${key}"]:checked`
            )
          ).map(input =>
            input.value
          )
        );

      managementComparisonCategorySelections[
        key
      ] = selected;

      /*
        Category selections refine the matching project
        list and automatically fill those matching projects.
      */
      managementComparisonSelectAllFilteredProjects();

      return;
    }
  });

  $("managementComparisonSlots")
    ?.addEventListener("input", event => {
      const searchInput =
        event.target.closest(
          "[data-comparison-project-search]"
        );

      if(!searchInput){
        return;
      }

      const index =
        Number(
          searchInput.dataset.comparisonProjectSearch
        );

      closeComparisonProjectSearchResults(index);

      renderComparisonProjectSearchResults(
        index,
        searchInput.value
      );
    });

  $("managementComparisonSlots")
    ?.addEventListener("focusin", event => {
      const searchInput =
        event.target.closest(
          "[data-comparison-project-search]"
        );

      if(!searchInput){
        return;
      }

      const index =
        Number(
          searchInput.dataset.comparisonProjectSearch
        );

      closeComparisonProjectSearchResults(index);

      if(searchInput.value.trim()){
        renderComparisonProjectSearchResults(
          index,
          searchInput.value
        );
      }
    });

  document.addEventListener("click", event => {
    if(
      !event.target.closest(
        ".comparison-project-search"
      )
    ){
      closeComparisonProjectSearchResults();
    }
  });

  /* Comparison add/remove */
  $("addComparisonColumnBtn")
    ?.addEventListener("click", () => {
      if(
        managementComparisonSelections.length >= 8
      ){
        alert(
          "The prototype currently supports up to 8 comparison columns."
        );
        return;
      }

      managementComparisonSelections.push({
        projectKey:"",
        revision:""
      });

      renderManagementComparisonSlots();
      renderManagementComparison();
    });

  $("managementComparisonSlots")
    ?.addEventListener("click", event => {
      const confirmedResult =
        event.target.closest(
          "[data-confirm-comparison-project]"
        );

      if(confirmedResult){
        const index =
          Number(
            confirmedResult.dataset.confirmComparisonProject
          );

        managementComparisonSelections[index] = {
          projectKey:
            confirmedResult.dataset.comparisonProjectKey,
          revision:""
        };

        renderManagementComparisonSlots();
        renderManagementComparison();
        return;
      }

      const changeProject =
        event.target.closest(
          "[data-change-comparison-project]"
        );

      if(changeProject){
        const index =
          Number(
            changeProject.dataset.changeComparisonProject
          );

        managementComparisonSelections[index] = {
          projectKey:"",
          revision:""
        };

        renderManagementComparisonSlots();
        renderManagementComparison();

        requestAnimationFrame(() => {
          document
            .querySelector(
              `[data-comparison-project-search="${index}"]`
            )
            ?.focus();
        });

        return;
      }

      const remove =
        event.target.closest(
          "[data-remove-comparison-column]"
        );

      if(!remove) return;

      if(
        managementComparisonSelections.length <= 2
      ){
        return;
      }

      managementComparisonSelections.splice(
        Number(
          remove.dataset.removeComparisonColumn
        ),
        1
      );

      renderManagementComparisonSlots();
      renderManagementComparison();
    });

  /* Consultant Submission table settings */
  $("managementConsultantTableSettingsBody")
    ?.addEventListener("click", event => {
      const addButton =
        event.target.closest(
          "[data-add-consultant-setting-row]"
        );

      if(addButton){
        addManagementConsultantTableRowV21(
          addButton.dataset.addConsultantSettingRow
        );
        return;
      }

      const removeButton =
        event.target.closest(
          "[data-remove-consultant-setting-row]"
        );

      if(removeButton){
        removeManagementConsultantTableRowV21(
          removeButton.dataset.removeConsultantSettingSection,
          removeButton.dataset.removeConsultantSettingRow
        );
      }
    });

  /* Settings hierarchy */
  $("settingsRegionSelect")
    ?.addEventListener("change", event => {
      managementSettingsSelectedRegion =
        event.target.value;

      managementSettingsSelectedBusinessUnit = "";
      managementSettingsSelectedProject = "";

      renderManagementSettingsHierarchy();
    });

  $("settingsBusinessUnitSelect")
    ?.addEventListener("change", event => {
      managementSettingsSelectedBusinessUnit =
        event.target.value;

      managementSettingsSelectedProject = "";

      renderManagementSettingsHierarchy();
    });

  $("settingsProjectSelect")
    ?.addEventListener("change", event => {
      managementSettingsSelectedProject =
        event.target.value;

      renderManagementSettingsHierarchy();
    });

  $("addSettingsRegionBtn")
    ?.addEventListener(
      "click",
      addManagementHierarchyRegion
    );

  $("addSettingsBusinessUnitBtn")
    ?.addEventListener(
      "click",
      addManagementHierarchyBusinessUnit
    );

  $("addSettingsProjectBtn")
    ?.addEventListener(
      "click",
      addManagementHierarchyProject
    );

  $("removeSettingsRegionBtn")
    ?.addEventListener(
      "click",
      removeManagementHierarchyRegion
    );

  $("removeSettingsBusinessUnitBtn")
    ?.addEventListener(
      "click",
      removeManagementHierarchyBusinessUnit
    );

  $("removeSettingsProjectBtn")
    ?.addEventListener(
      "click",
      removeManagementHierarchyProject
    );

  /* Dropdown settings */
  $("settingsDropdownTypeSelect")
    ?.addEventListener("change", event => {
      saveCurrentManagementDropdownOptions();

      managementSettingsDropdownKey =
        event.target.value;

      $("settingsDropdownAddInput").value = "";

      renderManagementDropdownSettings();
    });

  $("addDropdownOptionBtn")
    ?.addEventListener("click", () => {
      const input =
        $("settingsDropdownAddInput");

      const value =
        input.value.trim();

      if(!value) return;

      const current =
        collectCurrentDropdownOptionsFromUI();

      if(
        current.some(option =>
          option.toLowerCase() ===
          value.toLowerCase()
        )
      ){
        alert("This option already exists.");
        return;
      }

      const config =
        getConfiguredDropdownOptions();

      config[managementSettingsDropdownKey] = [
        ...current,
        value
      ];

      saveConfiguredDropdownOptions(config);

      input.value = "";

      renderManagementDropdownSettings();
    });

  $("settingsDropdownOptionList")
    ?.addEventListener("click", event => {
      const remove =
        event.target.closest(
          "[data-remove-settings-dropdown-option]"
        );

      if(!remove) return;

      const index =
        Number(
          remove.dataset.removeSettingsDropdownOption
        );

      const current =
        collectCurrentDropdownOptionsFromUI();

      if(current.length <= 1){
        alert(
          "Keep at least one option in this dropdown."
        );
        return;
      }

      current.splice(index,1);

      const config =
        getConfiguredDropdownOptions();

      config[managementSettingsDropdownKey] =
        current;

      saveConfiguredDropdownOptions(config);

      renderManagementDropdownSettings();
    });

  $("saveDropdownSettingsBtn")
    ?.addEventListener("click", () => {
      if(
        saveCurrentManagementDropdownOptions()
      ){
        alert(
          "Consultant dropdown options saved."
        );

        renderManagementDropdownSettings();
      }
    });
});
