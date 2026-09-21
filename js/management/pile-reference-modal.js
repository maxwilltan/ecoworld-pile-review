/* ============================================================
   Pile Reference modal from Comparison > Pilling Info
   ============================================================ */
(function(){
  function openManagementPileReferenceModalV124(){
    const modal=document.getElementById("managementPileReferenceModalV124");
    if(!modal) return;

    if(typeof renderManagementPileReference === "function"){
      renderManagementPileReference();
    }

    modal.classList.remove("hidden");
    document.body.classList.add("management-pile-reference-modal-open-v124");

    window.setTimeout(()=>{
      document.getElementById("closeManagementPileReferenceModalV124")?.focus();
    },0);
  }

  function closeManagementPileReferenceModalV124(){
    const modal=document.getElementById("managementPileReferenceModalV124");
    if(!modal) return;
    modal.classList.add("hidden");
    document.body.classList.remove("management-pile-reference-modal-open-v124");
  }

  window.openManagementPileReferenceModalV124=openManagementPileReferenceModalV124;
  window.closeManagementPileReferenceModalV124=closeManagementPileReferenceModalV124;

  document.addEventListener("DOMContentLoaded",()=>{
    document.addEventListener("click",event=>{
      const trigger=event.target.closest("[data-open-management-pile-reference-v124]");
      if(!trigger) return;
      event.preventDefault();
      event.stopPropagation();
      openManagementPileReferenceModalV124();
    });

    document.getElementById("closeManagementPileReferenceModalV124")
      ?.addEventListener("click",closeManagementPileReferenceModalV124);

    document.getElementById("managementPileReferenceModalV124")
      ?.addEventListener("click",event=>{
        if(event.target===event.currentTarget){
          closeManagementPileReferenceModalV124();
        }
      });

    document.addEventListener("keydown",event=>{
      if(event.key!=="Escape") return;
      const modal=document.getElementById("managementPileReferenceModalV124");
      if(modal && !modal.classList.contains("hidden")){
        closeManagementPileReferenceModalV124();
      }
    });
  });
})();
