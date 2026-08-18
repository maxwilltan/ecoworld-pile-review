const gardens = {
  'eco-grandeur': [
    { value: 'avenham-garden', label: 'Avenham Garden' },
    { value: 'regent-garden', label: 'Regent Garden' }
  ],
  'eco-majestic': [
    { value: 'vila', label: 'Vila' },
    { value: 'vyla', label: 'Vyla' }
  ],
  'eco-botanic': [
    { value: 'nortern-garden', label: 'Nortern Garden' }
  ]
};

const developmentLabels = {
  'eco-grandeur': 'Eco Grandeur',
  'eco-majestic': 'Eco Majestic',
  'eco-botanic': 'Eco Botanic'
};

const fileConfig = {
  construction: { input: 'constructionFile', info: 'constructionInfo', label: 'Construction Drawing' },
  architecture: { input: 'architectureFile', info: 'architectureInfo', label: 'Architecture Drawing' },
  efficiency: { input: 'efficiencyFile', info: 'efficiencyInfo', label: 'Pile Efficiency Drawing' },
  load: { input: 'loadFile', info: 'loadInfo', label: 'Pile Load' }
};


let tesseractPromise = null;
function ensureTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tesseractPromise) return tesseractPromise;
  tesseractPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => reject(new Error('Unable to load OCR library'));
    document.head.appendChild(script);
  });
  return tesseractPromise;
}

const state = {
  development: localStorage.getItem('ecoworld-development') || '',
  garden: localStorage.getItem('ecoworld-garden') || '',
  files: {},
  extracted: {}
};

const $ = id => document.getElementById(id);
const developmentSelect = $('developmentSelect');
const gardenSelect = $('gardenSelect');

function projectKey() {
  return state.development && state.garden ? `${state.development}__${state.garden}` : null;
}

function prettyBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function toast(message, type = 'ok') {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'error' : ''}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('EcoWorldPileReviewDB', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('files')) {
        const store = db.createObjectStore('files', { keyPath: 'id' });
        store.createIndex('project', 'project', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPutFile(key, file) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put({
      id: `${projectKey()}__${key}`,
      project: projectKey(),
      key,
      name: file.name,
      type: file.type,
      size: file.size,
      updatedAt: new Date().toISOString(),
      blob: file
    });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetProjectFiles() {
  const key = projectKey();
  if (!key) return [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readonly');
    const req = tx.objectStore('files').index('project').getAll(key);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbClearProjectFiles() {
  const files = await dbGetProjectFiles();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    files.forEach(file => store.delete(file.id));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDeleteFile(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function openStoredFile(key) {
  const record = state.files[key];
  if (!record?.blob) {
    toast('Stored file could not be found.', 'error');
    return;
  }
  const url = URL.createObjectURL(record.blob);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    URL.revokeObjectURL(url);
    toast('Your browser blocked the preview. Allow pop-ups or use Download.', 'error');
    return;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function downloadStoredFile(key) {
  const record = state.files[key];
  if (!record?.blob) {
    toast('Stored file could not be found.', 'error');
    return;
  }
  const url = URL.createObjectURL(record.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = record.name || `${key}-drawing`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function deleteStoredFile(key) {
  const record = state.files[key];
  if (!record) return;
  if (!confirm(`Delete ${record.name} from this property's browser storage?`)) return;
  await dbDeleteFile(record.id);
  delete state.extracted[key];
  await refreshFiles();
  $('analysisResults').classList.add('hidden');
  $('emptyAnalysis').classList.remove('hidden');
  toast(`${fileConfig[key].label} deleted.`);
}

function populateGardens() {
  gardenSelect.innerHTML = '';
  if (!state.development) {
    gardenSelect.disabled = true;
    gardenSelect.innerHTML = '<option value="">Select a development first</option>';
    return;
  }
  gardenSelect.disabled = false;
  gardenSelect.innerHTML = '<option value="">Select garden</option>';
  gardens[state.development].forEach(g => {
    const option = document.createElement('option');
    option.value = g.value;
    option.textContent = g.label;
    gardenSelect.appendChild(option);
  });
  if (gardens[state.development].some(g => g.value === state.garden)) gardenSelect.value = state.garden;
}

function gardenLabel() {
  const found = gardens[state.development]?.find(g => g.value === state.garden);
  return found?.label || '';
}

function renderProperty() {
  const complete = !!(state.development && state.garden);
  $('continueToUploads').disabled = !complete;
  $('propertyStatus').textContent = complete ? 'Completed' : 'Not completed';
  $('propertyStatus').className = `status-badge ${complete ? 'success' : 'neutral'}`;
  if (complete) {
    const label = `${developmentLabels[state.development]} · ${gardenLabel()}`;
    $('selectionPreview').innerHTML = `<div class="preview-icon">✓</div><div><strong>${label}</strong><span>Selected property for this review session.</span></div>`;
    $('projectPill').textContent = label;
    $('analysisProject').textContent = label;
  } else {
    $('selectionPreview').innerHTML = '<div class="preview-icon">⌂</div><div><strong>Property not selected</strong><span>Your selected project will appear here.</span></div>';
    $('projectPill').textContent = 'No project selected';
    $('analysisProject').textContent = 'No project selected';
  }
}

function showPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active-panel', p.id === id));
  document.querySelectorAll('.step').forEach(s => s.classList.toggle('active', s.dataset.target === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function refreshFiles() {
  state.files = {};
  if (projectKey()) {
    const files = await dbGetProjectFiles();
    files.forEach(file => state.files[file.key] = file);
  }
  Object.entries(fileConfig).forEach(([key, cfg]) => {
    const info = $(cfg.info);
    const card = document.querySelector(`.upload-card[data-file-key="${key}"]`);
    const f = state.files[key];
    let actions = card.querySelector('.stored-file-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'stored-file-actions';
      info.insertAdjacentElement('afterend', actions);
    }
    if (f) {
      info.textContent = `✓ ${f.name} · ${prettyBytes(f.size)}`;
      card.classList.add('complete');
      actions.innerHTML = `
        <button type="button" class="file-action-btn" data-file-action="open" data-file-key="${key}">Open</button>
        <button type="button" class="file-action-btn" data-file-action="download" data-file-key="${key}">Download</button>
        <button type="button" class="file-action-btn danger" data-file-action="delete" data-file-key="${key}">Delete</button>`;
      actions.classList.remove('hidden');
    } else {
      info.textContent = 'No file uploaded';
      card.classList.remove('complete');
      actions.innerHTML = '';
      actions.classList.add('hidden');
    }
  });
  const count = Object.keys(state.files).length;
  $('uploadStatus').textContent = `${count} / 4 uploaded`;
  $('uploadStatus').className = `status-badge ${count === 4 ? 'success' : 'neutral'}`;
  $('continueToAnalysis').disabled = count !== 4;
  $('runAnalysis').disabled = count !== 4 || !projectKey();
}

function safeFilename(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

async function handleFileInput(key, file) {
  if (!projectKey()) {
    toast('Select a development and garden first.', 'error');
    return;
  }
  if (!file) return;
  const max = 25 * 1024 * 1024;
  if (file.size > max) {
    toast('File is larger than 25 MB.', 'error');
    return;
  }
  const copy = new File([file], safeFilename(file.name), { type: file.type || 'application/octet-stream' });
  await dbPutFile(key, copy);
  await refreshFiles();
  toast(`${fileConfig[key].label} stored successfully.`);
}

function normalizeText(text) {
  return (text || '').replace(/\r/g, '\n').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n');
}

async function extractPDFText(blob, progressCb) {
  try {
    const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
    const data = new Uint8Array(await blob.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    let text = '';
    const maxPages = Math.min(pdf.numPages, 12);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += `\n--- PAGE ${i} ---\n` + content.items.map(x => x.str).join(' ');
      progressCb?.(i / maxPages);
    }
    if (text.replace(/\W/g, '').length < 40 && pdf.numPages > 0) {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.7 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const Tesseract = await ensureTesseract();
      const result = await Tesseract.recognize(canvas, 'eng', {
        logger: m => { if (m.status === 'recognizing text') progressCb?.(m.progress); }
      });
      text += `\n--- OCR PAGE 1 ---\n${result.data.text}`;
    }
    return normalizeText(text);
  } catch (err) {
    console.error(err);
    return '[PDF text extraction failed. Check your internet connection for the PDF/OCR libraries.]';
  }
}

async function extractImageText(blob, progressCb) {
  try {
    const Tesseract = await ensureTesseract();
    const result = await Tesseract.recognize(blob, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') progressCb?.(m.progress);
      }
    });
    return normalizeText(result.data.text);
  } catch (err) {
    console.error(err);
    return '[Image OCR failed. Check your internet connection for the OCR library.]';
  }
}

async function extractFileText(fileRecord, progressCb) {
  const blob = fileRecord.blob;
  const name = fileRecord.name.toLowerCase();
  if (name.endsWith('.txt') || fileRecord.type.startsWith('text/')) return normalizeText(await blob.text());
  if (name.endsWith('.pdf') || fileRecord.type === 'application/pdf') return extractPDFText(blob, progressCb);
  if (/\.(png|jpg|jpeg|webp)$/i.test(name) || fileRecord.type.startsWith('image/')) return extractImageText(blob, progressCb);
  return '[Unsupported file type for automatic extraction]';
}

function unique(values) {
  return [...new Set(values.map(v => v.trim()).filter(Boolean))];
}

function findMatches(text, regexes, formatter = v => v) {
  const values = [];
  for (const re of regexes) {
    let m;
    const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    while ((m = global.exec(text)) !== null) {
      values.push(formatter(m[1] || m[0]));
      if (values.length >= 8) break;
    }
  }
  return unique(values);
}

function parsePileSpecs(text) {
  const compact = text.replace(/,/g, ' ');
  const specs = {};

  specs.pileType = findMatches(compact, [
    /\b(spun\s*pile)\b/gi, /\b(precast\s+(?:reinforced\s+)?concrete\s*pile)\b/gi,
    /\b(rc\s*pile)\b/gi, /\b(bored\s*pile)\b/gi, /\b(micropile)\b/gi,
    /\b(steel\s*h[- ]?pile)\b/gi, /\b(jacked\s*[- ]?in\s*pile)\b/gi
  ], v => v.replace(/\s+/g,' ').toUpperCase());

  specs.diameter = findMatches(compact, [
    /(?:pile\s*(?:dia(?:meter)?|size)|diameter|dia\.?)[^\d]{0,15}(\d{2,4})\s*mm\b/gi,
    /(?:Ø|⌀)\s*(\d{2,4})\s*mm\b/gi,
    /\b(\d{3,4})\s*mm\s*(?:dia|diameter|pile)\b/gi
  ], v => `${v} mm`);

  specs.length = findMatches(compact, [
    /(?:pile\s*(?:length|depth)|length)[^\d]{0,15}(\d+(?:\.\d+)?)\s*m\b/gi,
    /(?:penetration|founding\s*level)[^\d]{0,20}(\d+(?:\.\d+)?)\s*m\b/gi
  ], v => `${v} m`);

  specs.workingLoad = findMatches(compact, [
    /(?:safe\s*working\s*load|working\s*load|allowable\s*load|design\s*load|swl)[^\d]{0,20}(\d+(?:\.\d+)?)\s*k?n\b/gi,
    /\b(?:wl|s\.w\.l\.)[^\d]{0,10}(\d+(?:\.\d+)?)\s*k?n\b/gi
  ], v => `${v} kN`);

  specs.testLoad = findMatches(compact, [
    /(?:test\s*load|maintained\s*load|proof\s*load|ultimate\s*test\s*load)[^\d]{0,20}(\d+(?:\.\d+)?)\s*k?n\b/gi
  ], v => `${v} kN`);

  specs.efficiency = findMatches(compact, [
    /(?:pile\s*group\s*efficiency|group\s*efficiency|efficiency)[^\d]{0,18}(\d+(?:\.\d+)?)\s*%/gi
  ], v => `${v}%`);

  specs.spacing = findMatches(compact, [
    /(?:pile\s*spacing|c\/c\s*spacing|spacing)[^\d]{0,18}(\d+(?:\.\d+)?)\s*(mm|m)\b/gi
  ], v => `${v}`);

  specs.concreteGrade = findMatches(compact, [
    /(?:concrete\s*grade|grade|concrete)[^A-Z0-9]{0,10}(C\s*\d{2,3}|G\s*\d{2,3})\b/gi,
    /\b(C\s*\d{2}\/\d{2}|G\s*\d{2,3})\b/gi
  ], v => v.replace(/\s+/g,'').toUpperCase());

  return specs;
}

const specRows = [
  ['pileType', 'Pile type'],
  ['diameter', 'Pile diameter / size'],
  ['length', 'Pile length / depth'],
  ['workingLoad', 'Working / design load'],
  ['testLoad', 'Test load'],
  ['efficiency', 'Pile group efficiency'],
  ['spacing', 'Pile spacing'],
  ['concreteGrade', 'Concrete grade']
];

function canonical(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '').replace(/,/g, '');
}

function compareSpec(key) {
  const docs = ['construction','architecture','efficiency','load'];
  const entries = docs.map(d => state.extracted[d]?.specs?.[key] || []).filter(a => a.length);
  if (entries.length < 2) return { status: 'warn', message: 'Not enough repeated data to compare across documents.' };
  const normalized = entries.map(arr => new Set(arr.map(canonical)));
  const firstValues = [...normalized[0]];
  const common = firstValues.some(v => normalized.every(set => set.has(v)));
  if (common) return { status: 'ok', message: 'At least one consistent value appears across all documents where this specification was detected.' };
  const union = new Set(entries.flat().map(canonical));
  if (union.size > 1) return { status: 'issue', message: 'Different values were detected between documents. Verify the latest approved drawing and design basis.' };
  return { status: 'ok', message: 'Detected values are consistent.' };
}

function renderResults() {
  const tbody = $('specTableBody');
  tbody.innerHTML = '';
  let totalSpecs = 0;
  let issues = 0;
  const findings = [];

  specRows.forEach(([key, label]) => {
    const comparison = compareSpec(key);
    if (comparison.status === 'issue') issues++;
    findings.push({ key, label, ...comparison });
    const row = document.createElement('tr');
    const cells = [`<td><strong>${label}</strong></td>`];
    ['construction','architecture','efficiency','load'].forEach(doc => {
      const vals = state.extracted[doc]?.specs?.[key] || [];
      totalSpecs += vals.length;
      let cls = vals.length ? 'value-ok' : 'value-missing';
      if (comparison.status === 'issue' && vals.length) cls = 'value-mismatch';
      cells.push(`<td class="${cls}">${vals.length ? vals.join('<br>') : 'Not detected'}</td>`);
    });
    row.innerHTML = cells.join('');
    tbody.appendChild(row);
  });

  $('metricSpecs').textContent = totalSpecs;
  $('metricIssues').textContent = issues;
  $('metricStatus').textContent = issues ? 'Check required' : 'No mismatch found';

  const list = $('comparisonList');
  list.innerHTML = '';
  findings.forEach(f => {
    const el = document.createElement('div');
    el.className = `finding ${f.status}`;
    const icon = f.status === 'ok' ? '✓' : f.status === 'issue' ? '!' : '?';
    el.innerHTML = `<div class="finding-icon">${icon}</div><div><strong>${f.label}</strong><p>${f.message}</p></div>`;
    list.appendChild(el);
  });

  const previews = $('textPreviews');
  previews.innerHTML = '';
  Object.entries(fileConfig).forEach(([key, cfg]) => {
    const text = state.extracted[key]?.text || '';
    const box = document.createElement('div');
    box.className = 'text-preview';
    box.innerHTML = `<strong>${cfg.label} — ${state.files[key]?.name || ''}</strong><pre>${escapeHtml(text.slice(0, 5000) || '[No readable text detected]')}</pre>`;
    previews.appendChild(box);
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
}

function setProgress(percent, text) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  $('progressBar').style.width = `${p}%`;
  $('progressPercent').textContent = `${p}%`;
  $('progressText').textContent = text;
}

async function runAnalysis() {
  if (Object.keys(state.files).length !== 4) return;
  $('analysisResults').classList.add('hidden');
  $('emptyAnalysis').classList.add('hidden');
  $('progressWrap').classList.remove('hidden');
  $('analysisStatus').textContent = 'Analyzing';
  $('analysisStatus').className = 'status-badge running';
  $('runAnalysis').disabled = true;
  state.extracted = {};

  const keys = ['construction','architecture','efficiency','load'];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const cfg = fileConfig[key];
    setProgress(i * 25, `Reading ${cfg.label}...`);
    const text = await extractFileText(state.files[key], local => {
      setProgress(i * 25 + local * 20, `Reading ${cfg.label}...`);
    });
    setProgress(i * 25 + 21, `Extracting pile specifications from ${cfg.label}...`);
    const specs = parsePileSpecs(text);
    state.extracted[key] = { text, specs };
  }
  setProgress(98, 'Comparing values across drawings...');
  renderResults();
  setProgress(100, 'Review completed');
  await new Promise(r => setTimeout(r, 250));
  $('progressWrap').classList.add('hidden');
  $('analysisResults').classList.remove('hidden');
  $('analysisStatus').textContent = 'Completed';
  $('analysisStatus').className = 'status-badge success';
  $('runAnalysis').disabled = false;
  toast('AI/OCR review completed.');
}

// Events
developmentSelect.addEventListener('change', async e => {
  state.development = e.target.value;
  state.garden = '';
  localStorage.setItem('ecoworld-development', state.development);
  localStorage.removeItem('ecoworld-garden');
  populateGardens();
  renderProperty();
  await refreshFiles();
});

gardenSelect.addEventListener('change', async e => {
  state.garden = e.target.value;
  localStorage.setItem('ecoworld-garden', state.garden);
  renderProperty();
  await refreshFiles();
});

document.querySelectorAll('.step').forEach(step => step.addEventListener('click', () => showPanel(step.dataset.target)));
$('continueToUploads').addEventListener('click', () => showPanel('upload-section'));
$('continueToAnalysis').addEventListener('click', () => showPanel('analysis-section'));

document.querySelectorAll('.upload-btn').forEach(btn => btn.addEventListener('click', () => $(btn.dataset.input).click()));
Object.entries(fileConfig).forEach(([key, cfg]) => $(cfg.input).addEventListener('change', e => handleFileInput(key, e.target.files[0])));

$('uploadGrid').addEventListener('click', async e => {
  const btn = e.target.closest('[data-file-action]');
  if (!btn) return;
  const key = btn.dataset.fileKey;
  if (btn.dataset.fileAction === 'open') openStoredFile(key);
  if (btn.dataset.fileAction === 'download') downloadStoredFile(key);
  if (btn.dataset.fileAction === 'delete') await deleteStoredFile(key);
});

$('clearFiles').addEventListener('click', async () => {
  await dbClearProjectFiles();
  state.extracted = {};
  await refreshFiles();
  $('analysisResults').classList.add('hidden');
  $('emptyAnalysis').classList.remove('hidden');
  toast('Uploaded files cleared for this property.');
});
$('runAnalysis').addEventListener('click', runAnalysis);
$('toggleText').addEventListener('click', () => {
  const el = $('textPreviews');
  el.classList.toggle('hidden');
  $('toggleText').textContent = el.classList.contains('hidden') ? 'Show text' : 'Hide text';
});

// Initial state
if (state.development) developmentSelect.value = state.development;
populateGardens();
renderProperty();
refreshFiles();
