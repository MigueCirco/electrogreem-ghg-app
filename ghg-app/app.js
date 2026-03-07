const STORAGE_KEY = "electrogreem-ghg-v12";
const APP_VERSION = "1.1.0";
const BRAND = "ElectroGreem";
const HISTORIC_ELECTRICITY_ASSUMPTIONS = "Escala del gráfico asumida x10 (30=300 kWh). Meses asignados por orden izquierda→derecha; rótulos no legibles en la foto.";
const HISTORIC_ELECTRICITY_SOURCE = "Factura EDET (histórico gráfico)";
const FACTURA_EVIDENCE_ID = "EVD-FACTURA-EDET-001";

const tabs = [["inicio", "Inicio / Instructivo"], ["scope1", "Scope 1 · Emisiones directas"], ["scope2", "Scope 2"], ["scope3", "Scope 3"], ["factores", "Factores"], ["evidencias", "Evidencias"], ["reportes", "Reportes"], ["config", "Configuración"]];

let state = loadState();
const tabContainer = document.getElementById("tabs");
const panels = [...document.querySelectorAll(".tab-panel")];

init();

function initialState() {
  const now = new Date().toISOString();
  return {
    meta: { appVersion: APP_VERSION, createdAt: now, factorsVersion: "v1", factorsUpdatedAt: now },
    nextIds: { s1r: 1, s1f: 1, scope2: 1, scope3: 1, evidencia: 1 },
    factores: [
      { id: "FE-S2-AR", alcance: "scope2", nombre: "Electricidad red AR", valor: 0.32, unidad: "tCO2e/MWh" },
      { id: "FE-S3-DIESEL", alcance: "scope3", nombre: "Transporte diésel", valor: 2.68, unidad: "kgCO2e/L" },
      { id: "GWP-R410A", alcance: "scope1", nombre: "R-410A", valor: 2088, unidad: "GWP" },
      { id: "GWP-R134a", alcance: "scope1", nombre: "R-134a", valor: 1430, unidad: "GWP" },
      { id: "GWP-R32", alcance: "scope1", nombre: "R-32", valor: 675, unidad: "GWP" },
      { id: "FE-S1-MEZCLA2T", alcance: "scope1", nombre: "Mezcla 2T", valor: 2.31, unidad: "kgCO2e/L" }
    ],
    scope1: { refrigerants: [], fuels: [] },
    scope2: [],
    scope3: [],
    evidencias: [],
    changelog: [{ at: now, action: "Inicialización", author: "Sistema" }],
    globalPeriod: { from: "", to: "" },
    auditorMode: false
  };
}

function normalizeEvidence(ev = {}) {
  return {
    id: ev.id || `EVD-${String(Date.now()).slice(-6)}`,
    tipo: ev.tipo || "",
    archivo_nombre: ev.archivo_nombre || "",
    hash: ev.hash || "",
    fecha_documento: ev.fecha_documento || "",
    url: ev.url || "",
    url_view: ev.url_view || ev.url || "",
    url_download: ev.url_download || "",
    drive_file_id: ev.drive_file_id || "",
    alcance: ev.alcance || "",
    proveedor: ev.proveedor || "",
    periodo_desde: ev.periodo_desde || "",
    periodo_hasta: ev.periodo_hasta || "",
    nota_auditoria: ev.nota_auditoria || ""
  };
}

function normalizeLoadedState(rawState) {
  const base = initialState();
  const merged = { ...base, ...(rawState || {}) };
  merged.scope1 = merged.scope1 || { refrigerants: [], fuels: [] };
  merged.scope1.refrigerants = merged.scope1.refrigerants || [];
  merged.scope1.fuels = merged.scope1.fuels || [];
  merged.scope2 = (merged.scope2 || []).map((r) => ({ ...r, evidenciaIds: r.evidenciaIds || (r.evidenceId ? [r.evidenceId] : []) }));
  merged.scope3 = (merged.scope3 || []).map((r) => ({ ...r, evidenciaIds: r.evidenciaIds || [] }));
  merged.evidencias = (merged.evidencias || []).map((e) => normalizeEvidence(e));
  return merged;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    const merged = normalizeLoadedState(saved);
    merged.scope1 = merged.scope1 || { refrigerants: JSON.parse(localStorage.getItem("eg_s1_refrigerants") || "[]"), fuels: JSON.parse(localStorage.getItem("eg_s1_fuels") || "[]") };
    merged.globalPeriod = {
      from: merged.globalPeriod?.from || localStorage.getItem("eg_period_from") || "",
      to: merged.globalPeriod?.to || localStorage.getItem("eg_period_to") || ""
    };
    return merged;
  } catch { return initialState(); }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem("eg_s1_refrigerants", JSON.stringify(state.scope1.refrigerants));
  localStorage.setItem("eg_s1_fuels", JSON.stringify(state.scope1.fuels));
  localStorage.setItem("eg_period_from", state.globalPeriod.from || "");
  localStorage.setItem("eg_period_to", state.globalPeriod.to || "");
}

function ensureFacturaEvidence(url = "") {
  let evidence = state.evidencias.find((e) => e.id === FACTURA_EVIDENCE_ID);
  if (!evidence) {
    evidence = normalizeEvidence({ id: FACTURA_EVIDENCE_ID, tipo: "Factura electricidad", alcance: "S2", proveedor: "EDET", archivo_nombre: "Factura EDET histórico", hash: "manual-demo", fecha_documento: "", url_view: url, url });
    state.evidencias.push(evidence);
  }
  evidence.tipo = "Factura electricidad";
  evidence.alcance = "S2";
  evidence.proveedor = "EDET";
  evidence.url_view = url || evidence.url_view || "";
  evidence.url = evidence.url_view;
  return evidence;
}

const DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1LVuZj4sFhr69umi6PLr_DQynFUYqH8OL?usp=drive_link";
const DRIVE_WARNING = "Asegurarse que el archivo tenga permiso ‘Cualquiera con el enlace - Lector’";

function extractDriveFileId(link = "") {
  const value = link.trim();
  if (!value) return "";
  const match = value.match(/\/file\/d\/([^/]+)/i);
  if (match?.[1]) return match[1];
  const altMatch = value.match(/[?&]id=([^&]+)/i);
  return altMatch?.[1] || "";
}

function buildDriveLinks(fileId = "") {
  if (!fileId) return { view: "", download: "" };
  return {
    view: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
    download: `https://drive.google.com/uc?export=download&id=${fileId}`
  };
}

async function validateEvidenceUrl(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, { method: "HEAD", mode: "cors" });
    return response.ok;
  } catch {
    return null;
  }
}

function buildMonthlySequence(totalMonths) {
  const start = new Date();
  start.setDate(1);
  start.setMonth(start.getMonth() - (totalMonths - 1));
  return Array.from({ length: totalMonths }, (_, i) => {
    const d = new Date(start);
    d.setMonth(start.getMonth() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

function addHistoricElectricityDataset() {
  const values = [300, 300, 300, 260, 620, 700, 450, 260, 230, 190, 190, 300, 300];
  ensureFacturaEvidence();
  const months = buildMonthlySequence(values.length);
  values.forEach((kwh, idx) => {
    state.scope2.push({
      id: `S2-${String(state.nextIds.scope2++).padStart(3, "0")}`,
      fecha: months[idx],
      kwh,
      source: HISTORIC_ELECTRICITY_SOURCE,
      dataQuality: "Estimado",
      assumptions: HISTORIC_ELECTRICITY_ASSUMPTIONS,
      evidenceId: FACTURA_EVIDENCE_ID,
      factor_id: "FE-S2-AR",
      evidenciaIds: [FACTURA_EVIDENCE_ID],
      updatedAt: new Date().toISOString()
    });
  });
  pushLog("Carga histórico electricidad demo (13 meses)");
}

function pushLog(action) { state.changelog.unshift({ at: new Date().toISOString(), action, author: "Héctor Miguel Fadel" }); state.changelog = state.changelog.slice(0, 60); }
function panel(name) { return document.querySelector(`.tab-panel[data-tab="${name}"]`); }
function factorById(id) { return state.factores.find((f) => f.id === id); }
function showToast(message, type = "success") { const node = document.createElement("div"); node.className = `toast ${type}`; node.textContent = message; document.getElementById("toast-container").appendChild(node); setTimeout(() => node.remove(), 3000); }
function normalizeDate(v) { if (!v) return ""; return /^\d{4}-\d{2}$/.test(v) ? `${v}-01` : v; }
function fmtDate(v) { return normalizeDate(v) ? new Date(normalizeDate(v)).toLocaleDateString("es-AR") : "-"; }
function t4(n) { return Number(n || 0).toFixed(4); }
function hasEvidence(r) { return (r.evidenciaIds || []).length > 0; }
function allScope1Records() { return [...state.scope1.refrigerants.map((r) => ({ ...r, kind: "refrigerant" })), ...state.scope1.fuels.map((r) => ({ ...r, kind: "fuel" }))]; }
function allRecords() { return [...allScope1Records(), ...state.scope2.map((r) => ({ ...r, scope: "scope2" })), ...state.scope3.map((r) => ({ ...r, scope: "scope3" }))]; }

function emissionS1(r) { return (Number(r.input || 0) * Number(r.factor || 0)) / 1000; }
function emissionS2(r) { return (Number(r.kwh || 0) / 1000) * Number(factorById(r.factor_id)?.valor || 0); }
function emissionS3(r) { return (Number(r.litros || 0) * Number(factorById(r.factor_id)?.valor || 0)) / 1000; }

function filterByPeriod(records) {
  const { from, to } = state.globalPeriod;
  return records.filter((r) => { const d = normalizeDate(r.fecha); if (!d) return !(from || to); if (from && d < from) return false; if (to && d > to) return false; return true; });
}
function coverage(records) { if (!records.length) return 0; return (records.filter(hasEvidence).length / records.length) * 100; }
function dateRange(records) { const dates = records.map((r) => normalizeDate(r.fecha)).filter(Boolean).sort(); return dates.length ? `${fmtDate(dates[0])} - ${fmtDate(dates[dates.length - 1])}` : "Sin fechas"; }

function init() { renderTabs(); renderAll(); activateTab("inicio"); }
function renderTabs() { tabContainer.innerHTML = tabs.map(([key, label]) => `<button data-tab="${key}">${label}</button>`).join(""); tabContainer.querySelectorAll("button").forEach((b) => b.onclick = () => activateTab(b.dataset.tab)); }
function activateTab(key) { document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === key)); panels.forEach((p) => p.classList.toggle("active", p.dataset.tab === key)); }

function renderGlobalPeriod() {
  const el = document.getElementById("global-period");
  el.innerHTML = `<div class="period-grid"><label>Desde<input type="date" id="gp-from" value="${state.globalPeriod.from || ""}"></label><label>Hasta<input type="date" id="gp-to" value="${state.globalPeriod.to || ""}"></label><button id="gp-apply">Aplicar</button><button id="gp-clear" class="secondary">Limpiar</button><div class="quick-row"><button data-quick="30">Últimos 30 días</button><button data-quick="month">Mes actual</button><button data-quick="quarter">Trimestre actual</button><button data-quick="year">Año actual</button></div></div>`;
  document.getElementById("gp-apply").onclick = () => { state.globalPeriod.from = document.getElementById("gp-from").value; state.globalPeriod.to = document.getElementById("gp-to").value; pushLog("Filtro global aplicado"); renderAll(); };
  document.getElementById("gp-clear").onclick = () => { state.globalPeriod = { from: "", to: "" }; renderAll(); };
  el.querySelectorAll("[data-quick]").forEach((btn) => btn.onclick = () => {
    const now = new Date(); let from = "", to = now.toISOString().slice(0, 10);
    if (btn.dataset.quick === "30") from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    if (btn.dataset.quick === "month") from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    if (btn.dataset.quick === "quarter") { const qStart = Math.floor(now.getMonth() / 3) * 3; from = `${now.getFullYear()}-${String(qStart + 1).padStart(2, "0")}-01`; }
    if (btn.dataset.quick === "year") from = `${now.getFullYear()}-01-01`;
    state.globalPeriod = { from, to }; renderAll();
  });
}

function renderInicio() {
  const s1 = filterByPeriod(allScope1Records());
  const s2 = filterByPeriod(state.scope2);
  const s3 = filterByPeriod(state.scope3);
  const t1 = s1.reduce((a, r) => a + emissionS1(r), 0); const t2 = s2.reduce((a, r) => a + emissionS2(r), 0); const t3 = s3.reduce((a, r) => a + emissionS3(r), 0);
  const pending = [["Scope 1", s1], ["Scope 2", s2], ["Scope 3", s3]].map(([n, r]) => `<li>${n}: faltan evidencias en ${r.filter((x) => !hasEvidence(x)).length} registros.</li>`).join("");
  panel("inicio").innerHTML = `<article class="card full"><h3>ElectroGreem GHG App · Inicio / Instructivo</h3><p><b>Autor:</b> Héctor Miguel Fadel · <b>Contexto:</b> Práctica Profesional Supervisada (PPS) – Ingeniería Electrónica (UTN-FRT) · <b>Tutor/Supervisión:</b> Prof. Ing. Ramón Oris · <b>Agradecimientos:</b> Búho Producciones Artísticas.</p><p>Esta app estática permite inventario GEI operativo Scope 1/2/3 con trazabilidad por evidencias, registro de cambios y respaldo JSON/CSV.</p><h4>Supuestos y límites</h4><ul><li>Depende de datos de actividad y factores cargados por el usuario.</li><li>Límites organizacionales: operaciones y activos declarados.</li><li>La ausencia de datos no implica ausencia de emisiones.</li></ul><h4>Validez</h4><ul><li>Trazabilidad mediante evidencias con hash.</li><li>Registro de cambios y versión de factores.</li><li>Export/Import JSON y export CSV como respaldo auditable.</li></ul><h4>Mini guía</h4><ol><li>Cargar factores.</li><li>Cargar actividades Scope 1/2/3.</li><li>Adjuntar evidencias.</li><li>Elegir período global.</li><li>Generar informe PDF.</li></ol></article><article class="card"><h3>Total</h3><div class="metric">${t4(t1 + t2 + t3)} tCO2e</div></article><article class="card"><h3>Scope 1</h3><div class="metric">${t4(t1)}</div><p>${s1.length} registros · cobertura ${coverage(s1).toFixed(1)}%</p></article><article class="card"><h3>Scope 2</h3><div class="metric">${t4(t2)}</div><p>${s2.length} registros · cobertura ${coverage(s2).toFixed(1)}%</p></article><article class="card"><h3>Scope 3</h3><div class="metric">${t4(t3)}</div><p>${s3.length} registros · cobertura ${coverage(s3).toFixed(1)}%</p></article><article class="card full"><h3>Pendientes de datos</h3><ul>${pending}</ul></article>`;
}

function evidenceSelectorHtml(selected = []) { if (!state.evidencias.length) return "<small>Sin evidencias cargadas.</small>"; return `<div class="evidence-links">${state.evidencias.map((ev) => `<label><input type="checkbox" value="${ev.id}" name="evidenciaIds" ${selected.includes(ev.id) ? "checked" : ""}>${ev.id} · ${ev.archivo_nombre}</label>`).join("")}</div>`; }
function evidenceIndicator(record) { return hasEvidence(record) ? "✅" : "⚠️"; }

function renderScope1() {
  const el = panel("scope1"); const gwp = ["GWP-R410A", "GWP-R134a", "GWP-R32"]; const fuelEF = factorById("FE-S1-MEZCLA2T")?.valor || 2.31;
  const ref = filterByPeriod(state.scope1.refrigerants); const fuel = filterByPeriod(state.scope1.fuels);
  const auditorCols = state.auditorMode ? "<th>Factor ID</th><th>Timestamp</th>" : "";
  const refRows = ref.map((r) => `<tr><td>${evidenceIndicator(r)}</td><td>${r.id}</td><td>${fmtDate(r.fecha)}</td><td>${r.source}</td><td>${r.input}</td><td>${r.factor}</td><td>${t4(emissionS1(r))}</td><td>${(r.evidenciaIds || []).join(",") || "-"}</td>${state.auditorMode ? `<td>${r.factorId || "manual"}</td><td>${r.updatedAt || "-"}</td>` : ""}<td class="actions"><button data-del="${r.id}" data-kind="refrigerants" class="danger">Eliminar</button></td></tr>`).join("");
  const fuelRows = fuel.map((r) => `<tr><td>${evidenceIndicator(r)}</td><td>${r.id}</td><td>${fmtDate(r.fecha)}</td><td>${r.activity}</td><td>${r.input}</td><td>${r.factor}</td><td>${t4(emissionS1(r))}</td><td>${(r.evidenciaIds || []).join(",") || "-"}</td>${state.auditorMode ? `<td>${r.factorId || "FE-S1-MEZCLA2T"}</td><td>${r.updatedAt || "-"}</td>` : ""}<td class="actions"><button data-del="${r.id}" data-kind="fuels" class="danger">Eliminar</button></td></tr>`).join("");
  el.innerHTML = `<article class="card full"><h3>Scope 1 – Emisiones directas</h3><div class="grid-form"><label>Fecha<input type="date" id="s1r-fecha"></label><label>Equipo/Ubicación<input id="s1r-source"></label><label>Refrigerante<select id="s1r-type"><option value="GWP-R410A">R-410A</option><option value="GWP-R134a">R-134a</option><option value="GWP-R32">R-32</option><option value="OTRO">Otro</option></select></label><label>Kg recargados<input type="number" id="s1r-input" step="0.01"></label><label>GWP<input type="number" id="s1r-factor" step="0.01"></label><label class="span-2">Evidencias${evidenceSelectorHtml()}</label><label class="span-2">Notas<input id="s1r-notes"></label><button type="button" id="save-s1r">Guardar refrigerante</button></div><hr><div class="grid-form"><label>Fecha<input type="date" id="s1f-fecha"></label><label>Equipo/Actividad<input id="s1f-activity" value="Podadora"></label><label>Litros consumidos<input type="number" id="s1f-input" step="0.01"></label><label>EF kgCO2e/L<input type="number" id="s1f-factor" step="0.001" value="${fuelEF}"></label><label class="span-2">Evidencias${evidenceSelectorHtml()}</label><label class="span-2">Notas<input id="s1f-notes"></label><button type="button" id="save-s1f">Guardar combustible</button></div></article><article class="card full"><h3>Refrigerantes</h3><div class="table-wrap"><table><thead><tr><th>Ev</th><th>ID</th><th>Fecha</th><th>Fuente</th><th>Entrada kg</th><th>GWP</th><th>tCO2e</th><th>Evidencias</th>${auditorCols}<th>Acciones</th></tr></thead><tbody>${refRows || "<tr><td colspan='11'>Sin registros en período.</td></tr>"}</tbody></table></div></article><article class="card full"><h3>Combustible</h3><div class="table-wrap"><table><thead><tr><th>Ev</th><th>ID</th><th>Fecha</th><th>Actividad</th><th>Entrada L</th><th>EF</th><th>tCO2e</th><th>Evidencias</th>${auditorCols}<th>Acciones</th></tr></thead><tbody>${fuelRows || "<tr><td colspan='11'>Sin registros en período.</td></tr>"}</tbody></table></div></article>`;
  const typeSel = document.getElementById("s1r-type"); const factorInput = document.getElementById("s1r-factor"); const setGwp = () => { if (typeSel.value !== "OTRO") factorInput.value = factorById(typeSel.value)?.valor || ""; }; typeSel.onchange = setGwp; setGwp();
  document.getElementById("save-s1r").onclick = () => {
    const ev = [...el.querySelectorAll("#save-s1r").item(0).closest(".grid-form").querySelectorAll('input[name="evidenciaIds"]:checked')].map((x) => x.value);
    state.scope1.refrigerants.push({ id: `S1-R-${String(state.nextIds.s1r++).padStart(3, "0")}`, fecha: document.getElementById("s1r-fecha").value, source: document.getElementById("s1r-source").value, refType: typeSel.value, input: Number(document.getElementById("s1r-input").value), factor: Number(factorInput.value), factorId: typeSel.value, evidenciaIds: ev, notes: document.getElementById("s1r-notes").value, updatedAt: new Date().toISOString() });
    pushLog("Alta Scope 1 refrigerante"); renderAll();
  };
  document.getElementById("save-s1f").onclick = () => {
    const secondForm = el.querySelectorAll(".grid-form")[1]; const ev = [...secondForm.querySelectorAll('input[name="evidenciaIds"]:checked')].map((x) => x.value);
    state.scope1.fuels.push({ id: `S1-F-${String(state.nextIds.s1f++).padStart(3, "0")}`, fecha: document.getElementById("s1f-fecha").value, activity: document.getElementById("s1f-activity").value, input: Number(document.getElementById("s1f-input").value), factor: Number(document.getElementById("s1f-factor").value), factorId: "FE-S1-MEZCLA2T", evidenciaIds: ev, notes: document.getElementById("s1f-notes").value, updatedAt: new Date().toISOString() });
    pushLog("Alta Scope 1 combustible"); renderAll();
  };
  el.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => { state.scope1[b.dataset.kind] = state.scope1[b.dataset.kind].filter((r) => r.id !== b.dataset.del); pushLog(`Eliminado ${b.dataset.del}`); renderAll(); });
}

function renderSimpleScope(tab, label, idPrefix) {
  const scopeArr = tab === "scope2" ? state.scope2 : state.scope3; const filtered = filterByPeriod(scopeArr);
  const factorOpts = state.factores.filter((f) => f.alcance === tab).map((f) => `<option value="${f.id}">${f.nombre} (${f.valor})</option>`).join("");
  const rows = filtered.map((r) => {
    const quality = tab === "scope2" && r.dataQuality === "Estimado" ? '<span class="pill warning">Dato estimado / con supuestos</span>' : "-";
    return `<tr><td>${evidenceIndicator(r)}</td><td>${r.id}</td><td>${fmtDate(r.fecha)}</td><td>${r.activity || r.kwh || r.litros}</td><td>${tab === "scope2" ? t4(emissionS2(r)) : t4(emissionS3(r))}</td><td>${quality}</td><td>${tab === "scope2" ? (r.assumptions || "-") : "-"}</td><td>${(r.evidenciaIds || []).join(",") || "-"}</td>${state.auditorMode ? `<td>${r.updatedAt || "-"}</td>` : ""}<td><button class="danger" data-del="${r.id}">Eliminar</button></td></tr>`;
  }).join("");
  const dataQualityInput = tab === "scope2" ? `<label>Calidad de dato<select id="s2-quality"><option value="Medido">Medido</option><option value="Estimado">Estimado</option></select></label>` : "";
  const assumptionsInput = tab === "scope2" ? `<label class="span-2">Supuestos<input id="s2-assumptions" placeholder="Detalle de supuestos"></label>` : "";
  const sourceInput = tab === "scope2" ? `<label>Fuente<input id="s2-source" placeholder="Factura / Medidor"></label>` : "";
  const demoActions = tab === "scope2" ? `<div class="btn-row"><button id="load-s2-demo" type="button" class="secondary">Cargar histórico desde factura (demo)</button></div>` : "";
  panel(tab).innerHTML = `<article class="card full"><h3>${label}</h3><div class="grid-form"><label>Fecha<input type="${tab === "scope2" ? "month" : "date"}" id="${idPrefix}-fecha"></label><label>${tab === "scope2" ? "kWh" : "Actividad"}<input id="${idPrefix}-${tab === "scope2" ? "kwh" : "activity"}"></label>${tab === "scope3" ? "<label>Litros<input type='number' id='s3-litros'></label>" : ""}${sourceInput}${dataQualityInput}${assumptionsInput}<label>Factor<select id="${idPrefix}-factor">${factorOpts}</select></label><label class="span-2">Evidencias${evidenceSelectorHtml()}</label><button id="save-${idPrefix}" type="button">Guardar</button></div>${demoActions}</article><article class="card full"><div class="table-wrap"><table><thead><tr><th>Ev</th><th>ID</th><th>Fecha</th><th>Dato</th><th>tCO2e</th><th>Calidad</th><th>Supuestos</th><th>Evidencias</th>${state.auditorMode ? "<th>Timestamp</th>" : ""}<th>Acciones</th></tr></thead><tbody>${rows || "<tr><td colspan='10'>Sin registros en período.</td></tr>"}</tbody></table></div></article>`;
  document.getElementById(`save-${idPrefix}`).onclick = () => {
    const form = panel(tab).querySelector(".grid-form"); const ev = [...form.querySelectorAll('input[name="evidenciaIds"]:checked')].map((x) => x.value);
    if (tab === "scope2") scopeArr.push({ id: `S2-${String(state.nextIds.scope2++).padStart(3, "0")}`, fecha: document.getElementById("s2-fecha").value, kwh: Number(document.getElementById("s2-kwh").value), source: document.getElementById("s2-source")?.value || "", dataQuality: document.getElementById("s2-quality")?.value || "Medido", assumptions: document.getElementById("s2-assumptions")?.value || "", evidenceId: ev[0] || "", factor_id: document.getElementById("s2-factor").value, evidenciaIds: ev, updatedAt: new Date().toISOString() });
    if (tab === "scope3") scopeArr.push({ id: `S3-${String(state.nextIds.scope3++).padStart(3, "0")}`, fecha: document.getElementById("s3-fecha").value, activity: document.getElementById("s3-activity").value, litros: Number(document.getElementById("s3-litros").value), factor_id: document.getElementById("s3-factor").value, evidenciaIds: ev, updatedAt: new Date().toISOString() });
    pushLog(`Alta ${tab}`); renderAll();
  };
  if (tab === "scope2") {
    document.getElementById("load-s2-demo").onclick = () => { addHistoricElectricityDataset(); renderAll(); showToast("Histórico demo cargado en Scope 2"); };
  }
  panel(tab).querySelectorAll("[data-del]").forEach((b) => b.onclick = () => { const idx = scopeArr.findIndex((r) => r.id === b.dataset.del); if (idx >= 0) scopeArr.splice(idx, 1); renderAll(); });
}


async function hashFile(file) { const buffer = await file.arrayBuffer(); const hashBuffer = await crypto.subtle.digest("SHA-256", buffer); return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
function linkedRecordsByEvidenceId(id) { return allRecords().filter((r) => (r.evidenciaIds || []).includes(id)).map((r) => r.id); }


function parseSimpleCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i += 1; }
      else inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else current += char;
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

function importEvidenceCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return 0;
  const headers = parseSimpleCsvLine(lines[0]);
  const idx = {
    id: headers.indexOf("id"),
    tipo: headers.indexOf("tipo"),
    archivo_nombre: headers.indexOf("archivo"),
    hash: headers.indexOf("hash"),
    fecha_documento: headers.indexOf("fecha"),
    url: headers.indexOf("url"),
    drive_file_id: headers.indexOf("drive_file_id"),
    url_view: headers.indexOf("url_view"),
    url_download: headers.indexOf("url_download")
  };
  let imported = 0;
  lines.slice(1).forEach((line) => {
    const cells = parseSimpleCsvLine(line);
    const row = {
      id: idx.id >= 0 ? cells[idx.id] : "",
      tipo: idx.tipo >= 0 ? cells[idx.tipo] : "",
      archivo_nombre: idx.archivo_nombre >= 0 ? cells[idx.archivo_nombre] : "",
      hash: idx.hash >= 0 ? cells[idx.hash] : "",
      fecha_documento: idx.fecha_documento >= 0 ? cells[idx.fecha_documento] : "",
      url: idx.url >= 0 ? cells[idx.url] : "",
      drive_file_id: idx.drive_file_id >= 0 ? cells[idx.drive_file_id] : "",
      url_view: idx.url_view >= 0 ? cells[idx.url_view] : "",
      url_download: idx.url_download >= 0 ? cells[idx.url_download] : ""
    };
    if (!row.id) return;
    const existing = state.evidencias.find((e) => e.id === row.id);
    if (existing) Object.assign(existing, normalizeEvidence({ ...existing, ...row }));
    else state.evidencias.push(normalizeEvidence(row));
    imported += 1;
  });
  return imported;
}

function renderFactores() {
  panel("factores").innerHTML = `<article class="card full"><h3>Factores</h3><div class="table-wrap"><table><thead><tr><th>ID</th><th>Scope</th><th>Nombre</th><th>Valor</th><th>Unidad</th></tr></thead><tbody>${state.factores.map((f) => `<tr><td>${f.id}</td><td>${f.alcance}</td><td>${f.nombre}</td><td><input data-id="${f.id}" type="number" step="0.001" value="${f.valor}"></td><td>${f.unidad}</td></tr>`).join("")}</tbody></table></div><div class="btn-row"><input id="fver" value="${state.meta.factorsVersion}"><button id="save-factors">Guardar factores</button></div></article>`;
  document.getElementById("save-factors").onclick = () => { panel("factores").querySelectorAll("[data-id]").forEach((i) => { factorById(i.dataset.id).valor = Number(i.value); }); state.meta.factorsVersion = document.getElementById("fver").value; state.meta.factorsUpdatedAt = new Date().toISOString(); pushLog("Factores actualizados"); renderAll(); };
}

function renderEvidencias() {
  const facturaEvidence = ensureFacturaEvidence();
  panel("evidencias").innerHTML = `<article class="card full"><h3>Evidencias</h3><div class="grid-form"><label>Tipo<input id="ev-tipo"></label><label>Alcance<select id="ev-alcance"><option value="">(seleccionar)</option><option value="S1">S1</option><option value="S2">S2</option><option value="S3">S3</option></select></label><label>Período desde<input type="date" id="ev-periodo-desde"></label><label>Período hasta<input type="date" id="ev-periodo-hasta"></label><label>Proveedor / Origen<input id="ev-proveedor" placeholder="Proveedor, entidad o fuente"></label><label>Fecha documento<input type="date" id="ev-fecha"></label><label class="span-2">Nota de auditoría<input id="ev-nota-auditoria" placeholder="Observaciones de trazabilidad"></label><label class="span-2">Archivo<input type="file" id="ev-file"></label><label class="span-2">Pegar link de Drive<input id="ev-drive-link" placeholder="https://drive.google.com/file/d/<FILE_ID>/view?usp=sharing"></label><label class="span-2">URL vista<input id="ev-url-view" placeholder="https://..."></label><label class="span-2">URL descarga<input id="ev-url-download" placeholder="https://..."></label><label class="span-2">Vincular a registro<select id="ev-link"><option value="">(opcional)</option>${allRecords().map((r) => `<option value="${r.id}">${r.id}</option>`).join("")}</select></label><div class="btn-row span-2"><a class="button-like secondary" href="${DRIVE_FOLDER_URL}" target="_blank" rel="noopener">Subir evidencia a Drive</a><button type="button" id="save-ev">Guardar evidencia</button></div></div></article><article class="card full"><h4>Evidencia demo factura EDET</h4><div class="grid-form"><label class="span-2">URL editable<input id="factura-edet-url" value="${facturaEvidence.url_view || ""}" placeholder="https://..."></label><button type="button" id="save-factura-edet-url">Guardar URL factura EDET</button></div></article><article class="card full"><div class="table-wrap"><table><thead><tr><th>ID</th><th>Tipo</th><th>Alcance</th><th>Periodo</th><th>Proveedor/Origen</th><th>Nota auditoría</th><th>Archivo</th><th>Ver/Descargar</th><th>Vinculación</th><th>Acciones</th></tr></thead><tbody>${state.evidencias.map((e) => {
    const periodo = e.periodo_desde || e.periodo_hasta ? `${e.periodo_desde || "-"} / ${e.periodo_hasta || "-"}` : "-";
    const viewAction = e.url_view ? `<a href="${e.url_view}" target="_blank" rel="noopener">Ver</a>` : "Sin evidencia cargada";
    const downloadAction = e.url_download ? `<a href="${e.url_download}" target="_blank" rel="noopener">Descargar</a>` : "Sin evidencia cargada";
    return `<tr><td>${e.id}</td><td>${e.tipo || "-"}</td><td>${e.alcance || "-"}</td><td>${periodo}</td><td>${e.proveedor || "-"}</td><td>${e.nota_auditoria || "-"}</td><td>${e.archivo_nombre || "-"}</td><td class="evidence-actions">${viewAction}<span>·</span>${downloadAction}</td><td>${linkedRecordsByEvidenceId(e.id).join(",") || "Sin vínculo"}</td><td><button class="danger" data-del="${e.id}">Eliminar</button></td></tr>`;
  }).join("") || "<tr><td colspan='10'>Sin evidencias.</td></tr>"}</tbody></table></div></article>`;

  document.getElementById("ev-drive-link").oninput = (event) => {
    const fileId = extractDriveFileId(event.target.value);
    if (!fileId) return;
    const links = buildDriveLinks(fileId);
    document.getElementById("ev-url-view").value = links.view;
    document.getElementById("ev-url-download").value = links.download;
  };

  document.getElementById("save-ev").onclick = async () => {
    const file = document.getElementById("ev-file").files[0];
    const fileId = extractDriveFileId(document.getElementById("ev-drive-link").value);
    const existingView = document.getElementById("ev-url-view").value.trim();
    const existingDownload = document.getElementById("ev-url-download").value.trim();
    const links = fileId ? buildDriveLinks(fileId) : { view: existingView, download: existingDownload };
    if (!file && !links.view && !links.download) return showToast("Seleccioná archivo o cargá un link de Drive", "error");

    const validation = await validateEvidenceUrl(links.view || links.download);
    if (validation !== true) showToast(DRIVE_WARNING, "error");

    const ev = normalizeEvidence({
      id: `EVD-${String(state.nextIds.evidencia++).padStart(3, "0")}`,
      tipo: document.getElementById("ev-tipo").value,
      alcance: document.getElementById("ev-alcance").value,
      periodo_desde: document.getElementById("ev-periodo-desde").value,
      periodo_hasta: document.getElementById("ev-periodo-hasta").value,
      proveedor: document.getElementById("ev-proveedor").value.trim(),
      nota_auditoria: document.getElementById("ev-nota-auditoria").value.trim(),
      archivo_nombre: file ? file.name : "Archivo en Drive",
      hash: file ? await hashFile(file) : "drive-link",
      fecha_documento: document.getElementById("ev-fecha").value,
      drive_file_id: fileId,
      url_view: links.view,
      url_download: links.download,
      url: links.view
    });
    state.evidencias.push(ev);
    const link = document.getElementById("ev-link").value;
    if (link) {
      const rec = allRecords().find((r) => r.id === link);
      rec.evidenciaIds = [...new Set([...(rec.evidenciaIds || []), ev.id])];
      if (!rec.evidenceId) rec.evidenceId = ev.id;
    }
    pushLog(`Alta evidencia ${ev.id}`);
    renderAll();
  };

  document.getElementById("save-factura-edet-url").onclick = () => {
    ensureFacturaEvidence(document.getElementById("factura-edet-url").value.trim());
    pushLog("Actualización URL evidencia factura EDET");
    renderAll();
  };

  panel("evidencias").querySelectorAll("[data-del]").forEach((b) => b.onclick = () => {
    if (b.dataset.del === FACTURA_EVIDENCE_ID) return showToast("La evidencia demo EDET no se puede eliminar", "error");
    state.evidencias = state.evidencias.filter((x) => x.id !== b.dataset.del);
    allRecords().forEach((r) => r.evidenciaIds = (r.evidenciaIds || []).filter((id) => id !== b.dataset.del));
    renderAll();
  });
}


function scopeSummary(name, records, total) { return `<tr><td>${name}</td><td>${records.length}</td><td>${coverage(records).toFixed(1)}%</td><td>${dateRange(records)}</td><td>${t4(total)}</td></tr>`; }
function renderReportes() {
  const s1 = filterByPeriod(allScope1Records()); const s2 = filterByPeriod(state.scope2); const s3 = filterByPeriod(state.scope3);
  const t1 = s1.reduce((a, r) => a + emissionS1(r), 0), t2 = s2.reduce((a, r) => a + emissionS2(r), 0), t3 = s3.reduce((a, r) => a + emissionS3(r), 0);
  panel("reportes").innerHTML = `<article class="card full"><h3>Reportes</h3><p><b>Período:</b> ${state.globalPeriod.from || "todo"} → ${state.globalPeriod.to || "todo"}</p><div class="table-wrap"><table><thead><tr><th>Scope</th><th>Registros</th><th>Cobertura</th><th>Rango fechas</th><th>tCO2e</th></tr></thead><tbody>${scopeSummary("Scope 1", s1, t1)}${scopeSummary("Scope 2", s2, t2)}${scopeSummary("Scope 3", s3, t3)}<tr><td><b>Total</b></td><td>${s1.length + s2.length + s3.length}</td><td>${coverage([...s1, ...s2, ...s3]).toFixed(1)}%</td><td>-</td><td><b>${t4(t1 + t2 + t3)}</b></td></tr></tbody></table></div><div class="btn-row"><button id="exp-json">Exportar JSON</button><button id="imp-json">Importar JSON</button><input id="imp-file" type="file" accept="application/json"><button id="imp-ev-csv">Importar CSV evidencias</button><input id="imp-ev-file" type="file" accept=".csv,text/csv"><button id="exp-csv-period">Exportar CSV del período</button><button id="exp-csv-all">Exportar CSV completo</button><button id="gen-pdf">Generar informe PDF</button></div></article>`;
  document.getElementById("exp-json").onclick = () => downloadBlob(JSON.stringify(state, null, 2), "application/json", `${BRAND.toLowerCase()}-backup.json`);
  document.getElementById("imp-json").onclick = async () => { const f = document.getElementById("imp-file").files[0]; if (!f) return; state = normalizeLoadedState(JSON.parse(await f.text())); renderAll(); };
  document.getElementById("imp-ev-csv").onclick = async () => { const f = document.getElementById("imp-ev-file").files[0]; if (!f) return; const total = importEvidenceCsv(await f.text()); pushLog(`Import CSV evidencias (${total})`); renderAll(); showToast(`Evidencias importadas: ${total}`); };
  document.getElementById("exp-csv-period").onclick = () => exportCsv(true);
  document.getElementById("exp-csv-all").onclick = () => exportCsv(false);
  document.getElementById("gen-pdf").onclick = () => generatePdf();
}

function exportCsv(periodOnly) {
  const rows = (periodOnly ? [...filterByPeriod(allScope1Records()), ...filterByPeriod(state.scope2), ...filterByPeriod(state.scope3)] : [...allScope1Records(), ...state.scope2, ...state.scope3]).map((r) => [r.id, r.fecha, r.source || r.activity || "", r.input || r.kwh || r.litros || "", r.factor || r.factor_id || "", (r.id.startsWith("S1") ? emissionS1(r) : r.id.startsWith("S2") ? emissionS2(r) : emissionS3(r)).toFixed(4), (r.evidenciaIds || []).join("|")].join(","));
  downloadBlob(["id,fecha,fuente,entrada,factor,tco2e,evidencias", ...rows].join("\n"), "text/csv", `electrogreem-${periodOnly ? "periodo" : "completo"}.csv`);
  const evidenceRows = state.evidencias.map((e) => [e.id, e.tipo, e.archivo_nombre, e.hash, e.fecha_documento || "", e.url || "", e.drive_file_id || "", e.url_view || "", e.url_download || "", linkedRecordsByEvidenceId(e.id).join("|")].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","));
  downloadBlob(["id,tipo,archivo,hash,fecha,url,drive_file_id,url_view,url_download,vinculos", ...evidenceRows].join("\n"), "text/csv", `electrogreem-evidencias-${periodOnly ? "periodo" : "completo"}.csv`);
}
function downloadBlob(content, type, filename) { const blob = new Blob([content], { type }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href); }

function pdfScopeTable(doc, y, title, records, mapper) {
  doc.setFontSize(14); doc.text(title, 14, y); y += 6;
  if (!records.length) { doc.setFillColor(250, 237, 223); doc.rect(14, y, 182, 15, "F"); doc.setFontSize(10); doc.text("Sin registros para el período seleccionado. (Esto no implica cero emisiones; implica ausencia de datos cargados en la herramienta.)", 16, y + 8, { maxWidth: 178 }); return y + 20; }
  doc.autoTable({ startY: y, theme: "grid", styles: { font: "helvetica", fontSize: 9, lineColor: [216, 203, 184], lineWidth: 0.1 }, headStyles: { fillColor: [234, 220, 198], textColor: 30 }, head: [["Fecha", "Fuente/Actividad", "Entrada", "Factor", "tCO2e", "Evidencias"]], body: records.map(mapper) });
  return doc.lastAutoTable.finalY + 8;
}

function generatePdf() {
  const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: "mm", format: "a4" });
  const s1 = filterByPeriod(allScope1Records()), s2 = filterByPeriod(state.scope2), s3 = filterByPeriod(state.scope3);
  const t1 = s1.reduce((a, r) => a + emissionS1(r), 0), t2 = s2.reduce((a, r) => a + emissionS2(r), 0), t3 = s3.reduce((a, r) => a + emissionS3(r), 0);
  const period = state.globalPeriod.from || state.globalPeriod.to ? `${state.globalPeriod.from || "inicio"} a ${state.globalPeriod.to || "actual"}` : "todo";

  doc.setFillColor(244, 239, 230); doc.rect(0, 0, 210, 297, "F"); doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.text("ElectroGreem GHG App – Inventario de GEI (Scope 1/2/3)", 14, 22);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text([`Autor: Héctor Miguel Fadel`, "Práctica Profesional Supervisada (PPS) – Ingeniería Electrónica (UTN-FRT)", "Tutor/Supervisión: Prof. Ing. Ramón Oris", `Versión ${APP_VERSION} · Generado ${new Date().toLocaleString("es-AR")}`, `Período aplicado: ${period}`], 14, 34);
  doc.setFont("helvetica", "bold"); doc.text("Resumen ejecutivo", 14, 62); doc.setFont("helvetica", "normal");
  doc.autoTable({ startY: 66, theme: "grid", styles: { font: "helvetica", fontSize: 9 }, headStyles: { fillColor: [234, 220, 198], textColor: 30 }, head: [["Scope", "tCO2e", "Cobertura evidencias"]], body: [["Scope 1", t4(t1), `${coverage(s1).toFixed(1)}%`], ["Scope 2", t4(t2), `${coverage(s2).toFixed(1)}%`], ["Scope 3", t4(t3), `${coverage(s3).toFixed(1)}%`], ["Total", t4(t1 + t2 + t3), `${coverage([...s1, ...s2, ...s3]).toFixed(1)}%`]] });
  doc.text("Supuestos y límites", 14, doc.lastAutoTable.finalY + 8); doc.setFontSize(9); doc.text(["• Depende de datos de actividad y factores cargados.", "• Límites organizacionales declarados por el usuario.", "• No incluye emisiones no registradas en la herramienta."], 14, doc.lastAutoTable.finalY + 14);
  let y = doc.lastAutoTable.finalY + 30;

  y = pdfScopeTable(doc, y, "Scope 1 – Emisiones directas", s1, (r) => [fmtDate(r.fecha), r.source || r.activity || "-", `${r.input} ${r.kind === "refrigerant" ? "kg" : "L"}`, `${r.factor}`, t4(emissionS1(r)), (r.evidenciaIds || []).join("|") || "-"]);
  y = pdfScopeTable(doc, y, "Scope 2 – Electricidad", s2, (r) => [fmtDate(r.fecha), "Electricidad", `${r.kwh} kWh`, `${factorById(r.factor_id)?.valor || "-"}`, t4(emissionS2(r)), (r.evidenciaIds || []).join("|") || "-"]);
  if (y > 250) { doc.addPage(); y = 20; }
  y = pdfScopeTable(doc, y, "Scope 3 – Operaciones indirectas", s3, (r) => [fmtDate(r.fecha), r.activity || "-", `${r.litros} L`, `${factorById(r.factor_id)?.valor || "-"}`, t4(emissionS3(r)), (r.evidenciaIds || []).join("|") || "-"]);

  doc.autoTable({ startY: y + 3, headStyles: { fillColor: [234, 220, 198], textColor: 30 }, head: [["Factores utilizados", "Valor", "Unidad"]], body: state.factores.map((f) => [f.id, String(f.valor), f.unidad]) });
  const recordsInPeriod = [...s1, ...s2, ...s3];
  const evidenciasPeriodo = state.evidencias.filter((e) => linkedRecordsByEvidenceId(e.id).some((id) => recordsInPeriod.some((r) => r.id === id)));
  let sectionY = doc.lastAutoTable.finalY + 4;
  if (!evidenciasPeriodo.length) {
    doc.setFontSize(10);
    doc.text("Sin evidencias para el periodo seleccionado", 14, sectionY + 6);
    sectionY += 10;
  } else {
    doc.autoTable({ startY: sectionY, headStyles: { fillColor: [234, 220, 198], textColor: 30 }, head: [["Trazabilidad", "Tipo", "Archivo", "Hash", "Fecha", "Vínculo"]], body: evidenciasPeriodo.map((e) => [e.id, e.tipo, e.archivo_nombre, e.hash, e.fecha_documento || "-", linkedRecordsByEvidenceId(e.id).join("|") || "-"]) });
    sectionY = doc.lastAutoTable.finalY + 4;
  }
  doc.autoTable({ startY: sectionY, headStyles: { fillColor: [234, 220, 198], textColor: 30 }, head: [["Registro de cambios", "Acción", "Autor"]], body: state.changelog.slice(0, 20).map((c) => [new Date(c.at).toLocaleString("es-AR"), c.action, c.author]) });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) { doc.setPage(i); doc.setFontSize(8); doc.text(`ElectroGreem · Informe GEI · v${APP_VERSION}`, 14, 8); doc.text(`Generado ${new Date().toLocaleString("es-AR")}`, 14, 292); doc.text(`Página ${i} de ${pages}`, 175, 292); }
  doc.save(`ElectroGreem_Informe_GEI_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function renderConfig() {
  panel("config").innerHTML = `<article class="card full"><h3>Configuración</h3><label><input type="checkbox" id="auditor-mode" ${state.auditorMode ? "checked" : ""}> Modo auditor (columnas extra: ID interno, hash/timestamp/factor ID)</label><h3>Pruebas rápidas</h3><ul><li>Caso 1: Período sin datos ⇒ PDF muestra “Sin registros…”.</li><li>Caso 2: 1 refrigerante + evidencia ⇒ S1>0, cobertura S1=100%.</li><li>Caso 3: combustible sin evidencia ⇒ cobertura baja y warning.</li><li>Caso 4: Export JSON / Import JSON ⇒ mantiene período, datos, evidencias y changelog.</li></ul></article>`;
  document.getElementById("auditor-mode").onchange = (e) => { state.auditorMode = e.target.checked; renderAll(); };
}

function renderAll() {
  renderGlobalPeriod();
  renderInicio();
  renderScope1();
  renderSimpleScope("scope2", "Scope 2 · Electricidad", "s2");
  renderSimpleScope("scope3", "Scope 3 · Operaciones indirectas", "s3");
  renderFactores();
  renderEvidencias();
  renderReportes();
  renderConfig();
  saveState();
}
