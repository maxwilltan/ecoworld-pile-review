/* Browser file storage for consultant drawing uploads.
   Keeps large PDF/image bytes out of localStorage so submissions remain saveable. */
const ECO_FILE_DB_NAME = "ecoworld_portal_files_v1";
const ECO_FILE_DB_STORE = "files";

function openEcoFileDb(){
  return new Promise((resolve, reject) => {
    if(!window.indexedDB){
      reject(new Error("This browser does not support IndexedDB file storage."));
      return;
    }

    const request = indexedDB.open(ECO_FILE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if(!db.objectStoreNames.contains(ECO_FILE_DB_STORE)){
        db.createObjectStore(ECO_FILE_DB_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open file storage."));
  });
}

async function saveEcoFileBlob(blob, metadata = {}){
  const db = await openEcoFileDb();
  const id = metadata.blobId || `file_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(ECO_FILE_DB_STORE, "readwrite");
    tx.objectStore(ECO_FILE_DB_STORE).put({
      id,
      blob,
      name: metadata.name || "Uploaded file",
      type: metadata.type || blob.type || "application/octet-stream",
      size: metadata.size ?? blob.size ?? 0,
      lastModified: metadata.lastModified || Date.now(),
      savedAt: new Date().toISOString()
    });

    tx.oncomplete = () => {
      db.close();
      resolve({
        blobId: id,
        name: metadata.name || "Uploaded file",
        type: metadata.type || blob.type || "application/octet-stream",
        size: metadata.size ?? blob.size ?? 0,
        lastModified: metadata.lastModified || Date.now()
      });
    };

    tx.onerror = () => {
      const error = tx.error || new Error("Unable to store uploaded file.");
      db.close();
      reject(error);
    };

    tx.onabort = tx.onerror;
  });
}

async function getEcoFileBlob(blobId){
  if(!blobId) return null;
  const db = await openEcoFileDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(ECO_FILE_DB_STORE, "readonly");
    const request = tx.objectStore(ECO_FILE_DB_STORE).get(blobId);

    request.onsuccess = () => {
      const record = request.result || null;
      db.close();
      resolve(record);
    };

    request.onerror = () => {
      const error = request.error || new Error("Unable to read uploaded file.");
      db.close();
      reject(error);
    };
  });
}

async function getAllEcoFileRecords(){
  const db = await openEcoFileDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(ECO_FILE_DB_STORE, "readonly");
    const request = tx.objectStore(ECO_FILE_DB_STORE).getAll();

    request.onsuccess = () => {
      const records = Array.isArray(request.result) ? request.result : [];
      db.close();
      resolve(records);
    };

    request.onerror = () => {
      const error = request.error || new Error("Unable to inspect uploaded file storage.");
      db.close();
      reject(error);
    };
  });
}

function ecoFileMetadataMatches(record, fileMeta){
  if(!record || !fileMeta) return false;

  const sameName = String(record.name || "") === String(fileMeta.name || "");
  const sameSize = Number(record.size || 0) === Number(fileMeta.size || 0);
  const metaType = String(fileMeta.type || "");
  const sameType = !metaType || String(record.type || "") === metaType;
  const metaModified = Number(fileMeta.lastModified || 0);
  const sameModified = !metaModified || Number(record.lastModified || 0) === metaModified;

  return sameName && sameSize && sameType && sameModified;
}

async function recoverEcoFileRecord(fileMeta){
  if(!fileMeta) return null;

  if(fileMeta.blobId){
    const direct = await getEcoFileBlob(fileMeta.blobId);
    if(direct?.blob) return direct;
  }

  const records = await getAllEcoFileRecords();
  let matches = records.filter(record => ecoFileMetadataMatches(record, fileMeta));

  // Older metadata may not include lastModified/type. Fall back to name + size
  // only when that still identifies exactly one browser-stored file.
  if(matches.length !== 1){
    matches = records.filter(record =>
      String(record.name || "") === String(fileMeta.name || "") &&
      Number(record.size || 0) === Number(fileMeta.size || 0)
    );
  }

  return matches.length === 1 ? matches[0] : null;
}

function repairEcoFileReferences(fileMeta, recoveredRecord){
  if(!fileMeta || !recoveredRecord?.id || typeof getSubmissions !== "function" || typeof setSubmissions !== "function") return;

  const submissions = getSubmissions();
  let changed = false;
  const drawingKeys = ["drawingArchitectural", "drawingStructural"];

  submissions.flatMap(submission => [submission,...(submission.previousVersions || [])]).forEach(submission => {
    if(!submission?.formData) return;
    drawingKeys.forEach(key => {
      const files = Array.isArray(submission.formData[key])
        ? submission.formData[key]
        : (submission.formData[key] ? [submission.formData[key]] : []);

      files.forEach(file => {
        const sameOldId = fileMeta.blobId && file?.blobId === fileMeta.blobId;
        const sameMeta = ecoFileMetadataMatches(recoveredRecord, file);
        if((sameOldId || sameMeta) && file?.blobId !== recoveredRecord.id){
          file.blobId = recoveredRecord.id;
          changed = true;
        }
      });
    });
  });

  if(changed){
    setSubmissions(submissions);
  }

  if(typeof state !== "undefined" && state?.formData){
    drawingKeys.forEach(key => {
      const files = Array.isArray(state.formData[key])
        ? state.formData[key]
        : (state.formData[key] ? [state.formData[key]] : []);
      files.forEach(file => {
        const sameOldId = fileMeta.blobId && file?.blobId === fileMeta.blobId;
        const sameMeta = ecoFileMetadataMatches(recoveredRecord, file);
        if((sameOldId || sameMeta) && file?.blobId !== recoveredRecord.id){
          file.blobId = recoveredRecord.id;
        }
      });
    });
  }
}

async function deleteEcoFileBlob(blobId){
  if(!blobId) return;
  const db = await openEcoFileDb();

  // Check after opening the database so saved/current and archived drawings
  // cannot be removed by stale form controls or another record's cleanup.
  const referenced = typeof getSubmissions === "function" && getSubmissions().some(item =>
    [item,...(item.previousVersions || [])].some(version =>
      ["drawingArchitectural","drawingStructural"].some(key => {
        const value = version.formData?.[key];
        return (Array.isArray(value) ? value : (value ? [value] : []))
          .some(file => file?.blobId === blobId);
      })
    )
  );
  if(referenced){ db.close(); return; }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(ECO_FILE_DB_STORE, "readwrite");
    tx.objectStore(ECO_FILE_DB_STORE).delete(blobId);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };

    tx.onerror = () => {
      const error = tx.error || new Error("Unable to remove uploaded file.");
      db.close();
      reject(error);
    };

    tx.onabort = tx.onerror;
  });
}

async function migrateLegacyDrawingFile(file){
  if(!file || !file.name) return file;
  if(file.blobId || !file.dataUrl) return file;

  const response = await fetch(file.dataUrl);
  const blob = await response.blob();

  return saveEcoFileBlob(blob, {
    name: file.name,
    type: file.type || blob.type,
    size: file.size || blob.size,
    lastModified: file.lastModified
  });
}

async function migrateSubmissionDrawingFiles(submissions){
  const drawingKeys = ["drawingArchitectural", "drawingStructural"];

  for(const submission of submissions){
    if(!submission?.formData) continue;

    for(const key of drawingKeys){
      const files = Array.isArray(submission.formData[key])
        ? submission.formData[key]
        : (submission.formData[key] ? [submission.formData[key]] : []);

      if(!files.length) continue;

      const migrated = [];
      for(const file of files){
        migrated.push(await migrateLegacyDrawingFile(file));
      }
      submission.formData[key] = migrated;
    }
  }

  return submissions;
}

async function openEcoStoredFile(fileMeta){
  if(!fileMeta) return;

  if(fileMeta.dataUrl){
    window.open(fileMeta.dataUrl, "_blank", "noopener");
    return;
  }

  if(!fileMeta.blobId){
    alert("This file is no longer available in browser storage.");
    return;
  }

  // Open a blank tab synchronously so browsers do not block the later async navigation.
  const previewWindow = window.open("", "_blank");

  try{
    const record = await recoverEcoFileRecord(fileMeta);
    if(!record?.blob){
      if(previewWindow) previewWindow.close();
      alert("This drawing file is no longer available in this browser. Please re-upload it from the Consultant submission if needed.");
      return;
    }

    if(record.id && record.id !== fileMeta.blobId){
      repairEcoFileReferences(fileMeta, record);
      fileMeta.blobId = record.id;
    }

    const url = URL.createObjectURL(record.blob);
    if(previewWindow){
      previewWindow.location.href = url;
    }else{
      window.open(url, "_blank", "noopener");
    }

    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }catch(error){
    if(previewWindow) previewWindow.close();
    console.error(error);
    alert("Unable to open this uploaded file.");
  }
}
