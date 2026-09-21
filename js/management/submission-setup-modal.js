/* ============================================================
   Submission Setup modal access from Internal Overview
   ============================================================ */
(function(){
  function openManagementSubmissionSetupModalV121(){
    if(state.auth?.role !== "Management") return;
    const modal = document.getElementById("managementSettingsModal");
    if(!modal) return;

    if(typeof window.beginManagementEditV31 === "function") window.beginManagementEditV31();

    if(typeof renderManagementSettings === "function"){
      renderManagementSettings();
    }

    modal.classList.remove("hidden");
    document.body.classList.add("management-settings-modal-open-v121");

    window.setTimeout(() => {
      document.getElementById("closeManagementSubmissionSetupBtn")?.focus();
    }, 0);
  }

  function closeManagementSubmissionSetupModalV121(){
    const modal = document.getElementById("managementSettingsModal");
    if(!modal) return;
    if(typeof window.managementEditMayCloseV31 === "function" && !window.managementEditMayCloseV31()) return;
    modal.classList.add("hidden");
    document.body.classList.remove("management-settings-modal-open-v121");
    document.getElementById("openManagementSubmissionSetupBtn")?.focus();
  }

  window.openManagementSubmissionSetupModalV121 = openManagementSubmissionSetupModalV121;
  window.closeManagementSubmissionSetupModalV121 = closeManagementSubmissionSetupModalV121;

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("openManagementSubmissionSetupBtn")
      ?.addEventListener("click", openManagementSubmissionSetupModalV121);

    document.getElementById("closeManagementSubmissionSetupBtn")
      ?.addEventListener("click", closeManagementSubmissionSetupModalV121);

    document.getElementById("managementSettingsModal")
      ?.addEventListener("click", event => {
        if(event.target === event.currentTarget){
          closeManagementSubmissionSetupModalV121();
        }
      });

    document.addEventListener("keydown", event => {
      if(event.key !== "Escape") return;
      if(document.querySelector("#submissionVersionHistoryV31:not(.hidden)")) return;
      const modal = document.getElementById("managementSettingsModal");
      if(modal && !modal.classList.contains("hidden")){
        closeManagementSubmissionSetupModalV121();
      }
    });
  });
})();
