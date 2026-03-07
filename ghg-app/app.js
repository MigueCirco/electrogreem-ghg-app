const STORAGE_KEY = "electrogreem-ghg-v10";
const THEME_KEY = "electrogreem-theme";
const DB_NAME = "electrogreem-evidencias-db";
const DB_VERSION = 1;
const APP_VERSION = "1.0.0";

const tabs = [
  ["inicio", "Inicio"],
  ["scope1", "Scope 1"],
  ["scope2", "Scope 2"],
  ["scope3", "Scope 3"],
  ["evidencias", "Evidencias"],
  ["reportes", "Reportes"],
  ["config", "Configuración"]
];

const refrigerantGwp = { R410A: 2088, R32: 675, R134a: 1430, R22: 1810 };
let state = loadState();
let dbPromise;

const tabContainer = document.getElementById("tabs");
const panels = [...document.querySelectorAll(".tab-panel")];

init();

async function init() {
  dbPromise = openEvidenceDB();
  applyTheme(loadThemePreference());
  renderTabs();
  renderAll();
  activateTab("inicio");
}

function initialState() {
  return {
    meta: { appVersion: APP_VERSION, createdAt: new Date().toISOString() },
    nextIds: { scope1: 3, scope2: 4, scope3: 3, evidencia: 2 },
    config: {
      dataQuality: "mixta",
      factorSource: "Factores de referencia operativa (editable)",
      localEvidenceMode: "indexeddb",
      fsFolderName: ""
    },
    changelog: [
      { at: new Date().toISOString(), action: "Inicialización demo", author: "Sistema" }
    ],
    factores: [
      { id: "FE-S2-AR", nombre: "Electricidad red AR", alcance: "scope2", valor: 0.32, unidad: "tCO2e/MWh" },
      { id: "FE-DIESEL", nombre: "Diésel", alcance: "scope3", valor: 2.68, unidad: "kgCO2e/L" },
      { id: "FE-TKM", nombre: "Transporte terrestre", alcance: "scope3", valor: 0.12, unidad: "kgCO2e/tkm" },
      { id: "FE-NAFTA", nombre: "Nafta", alcance: "scope1", valor: 2.31, unidad: "kgCO2e/L" }
    ],
    scope1: [
      {
        id: "S1-001", fecha: "2025-11-15", fuente: "refrigerante", detalle: "Recarga AC oficina principal",
        unidadActividad: "kg refrigerante", actividad: 1.4, factorEmision: 2088, unidadFactor: "GWP",
        refrigeranteTipo: "R410A", tCO2e: 2.923, evidenciaIds: [], notas: "Fuga detectada en mantenimiento", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      },
      {
        id: "S1-002", fecha: "2025-11-22", fuente: "combustible", detalle: "Podadora 2T - jornada semanal",
        unidadActividad: "litros combustible", actividad: 8.5, factorEmision: 2.31, unidadFactor: "kgCO2e/L",
        combustibleTipo: "mezcla_2t", tCO2e: 0.02, evidenciaIds: [], notas: "Mezcla 2T tratada como nafta", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      }
    ],
    scope2: [],
    scope3: [],
    evidencias: []
  };
}

function demoScope2() {
  return [
    { id_registro: "S2-001", mes: "2025-10", inicio_factura: "2025-10-01", fin_factura: "2025-10-31", kwh: 335, medidor: "MED-01", proveedor: "Edenor", observaciones: "Factura mensual", tipo_dato: "medido", supuestos: "", factor_id: "FE-S2-AR", evidenciaIds: [] },
    { id_registro: "S2-002", mes: "2025-11", inicio_factura: "2025-11-01", fin_factura: "2025-11-30", kwh: 355, medidor: "MED-01", proveedor: "Edenor", observaciones: "Factura mensual", tipo_dato: "medido", supuestos: "", factor_id: "FE-S2-AR", evidenciaIds: [] }
  ];
}

function demoScope3() {
  return [
    { id_servicio: "TR-001", fecha: "2025-10-14", mes: "2025-10", cliente: "Cliente Norte", tipo: "entrega", operador: "Operador Sur", km_ida_vacio: 45, km_vuelta_carga: 83, km_total: 128, carga_kg: 10000, metodo: "combustible", rendimiento_km_l: 2.8, litros: 45.71, factor_id: "FE-DIESEL", supuestos: "", observaciones: "Unidad semirremolque", evidenciaIds: [] }
  ];
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      const base = initialState();
      base.scope2 = demoScope2();
      base.scope3 = demoScope3();
      return base;
    }
    return JSON.parse(saved);
  } catch {
    return initialState();
  }
}

function saveState() {
  state.meta.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function pushLog(action) {
  state.changelog.unshift({ at: new Date().toISOString(), action, author: "Héctor Miguel Fadel" });
  state.changelog = state.changelog.slice(0, 30);
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function loadThemePreference() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  return savedTheme === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  const normalized = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = normalized;
  localStorage.setItem(THEME_KEY, normalized);
}

function renderTabs() {
  tabContainer.innerHTML = "";
  tabs.forEach(([key, label]) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.onclick = () => activateTab(key);
    btn.dataset.tab = key;
    tabContainer.appendChild(btn);
  });
}

function activateTab(key) {
  document.querySelectorAll(".tabs button").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === key));
  panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.tab === key));
}

function panel(name) {
  return document.querySelector(`.tab-panel[data-tab="${name}"]`);
}

function factorById(id) { return state.factores.find((f) => f.id === id); }
function evidenceById(id) { return state.evidencias.find((ev) => ev.id_evidencia === id); }

function calcScope1Emission(record) {
  if (record.fuente === "refrigerante") return (Number(record.actividad || 0) * Number(record.factorEmision || 0)) / 1000;
  return (Number(record.actividad || 0) * Number(record.factorEmision || 0)) / 1000;
}
function calcScope2Emission(record) {
  const factor = factorById(record.factor_id);
  return (Number(record.kwh || 0) / 1000) * Number(factor?.valor || 0);
}
function calcScope3(record) {
  const kmTotal = Number(record.km_ida_vacio || 0) + Number(record.km_vuelta_carga || 0);
  const factor = factorById(record.factor_id);
  let litros = Number(record.litros || 0);
  let tkm = 0;
  let emisiones = 0;
  if (record.metodo === "combustible") {
    if (!litros && Number(record.rendimiento_km_l || 0) > 0) litros = kmTotal / Number(record.rendimiento_km_l);
    emisiones = (litros * Number(factor?.valor || 0)) / 1000;
  }
  if (record.metodo === "tkm") {
    tkm = (Number(record.carga_kg || 0) / 1000) * Number(record.km_vuelta_carga || 0);
    emisiones = (tkm * Number(factor?.valor || 0)) / 1000;
  }
  return { kmTotal, litros: litros ? litros.toFixed(2) : "", emisiones, tkm };
}

function allActivityRecords() {
  return [
    ...state.scope1.map((r) => ({ id: r.id, evidenceIds: r.evidenciaIds || [] })),
    ...state.scope2.map((r) => ({ id: r.id_registro, evidenceIds: r.evidenciaIds || [] })),
    ...state.scope3.map((r) => ({ id: r.id_servicio, evidenceIds: r.evidenciaIds || [] }))
  ];
}

function trazabilidadCoverage() {
  const records = allActivityRecords();
  if (!records.length) return 0;
  const ok = records.filter((r) => r.evidenceIds.length > 0).length;
  return (ok * 100) / records.length;
}

function renderAll() {
  renderInicio();
  renderScope1();
  renderScope2();
  renderScope3();
  renderEvidencias();
  renderReportes();
  renderConfig();
  saveState();
}

function evidenceSelectorHtml(selected = []) {
  return `<div class="evidence-links">${state.evidencias.map((ev) => `<label><input type="checkbox" name="evidenciaIds" value="${ev.id_evidencia}" ${selected.includes(ev.id_evidencia) ? "checked" : ""}/> ${ev.id_evidencia} · ${ev.nombre_archivo}</label>`).join("") || "<small>Sin evidencias cargadas.</small>"}</div>`;
}

function renderInicio() {
  const el = panel("inicio");
  const s1 = state.scope1.reduce((a, r) => a + calcScope1Emission(r), 0);
  const s2 = state.scope2.reduce((a, r) => a + calcScope2Emission(r), 0);
  const s3 = state.scope3.reduce((a, r) => a + calcScope3(r).emisiones, 0);
  el.innerHTML = `
    <article class="card full">
      <h3>ElectroGreem GHG App · Instructivo rápido</h3>
      <p>Esta app permite gestionar el inventario GEI Scope 1/2/3, asociar evidencias auditables con hash SHA-256 y exportar un pack de auditoría local sin backend.</p>
      <ul>
        <li><b>Scope 1:</b> emisiones directas por refrigerante y combustible propio.</li>
        <li><b>Scope 2:</b> emisiones por consumo eléctrico (kWh).</li>
        <li><b>Scope 3:</b> emisiones logísticas por combustible o tkm.</li>
      </ul>
      <p><b>Validez:</b> trazabilidad por registro, hashes, export/restore local, factores editables y reporte PDF con supuestos.</p>
    </article>
    <article class="card"><h3>Total general</h3><div class="metric">${(s1 + s2 + s3).toFixed(3)} tCO2e</div></article>
    <article class="card"><h3>Scope 1</h3><div class="metric">${s1.toFixed(3)} tCO2e</div></article>
    <article class="card"><h3>Scope 2</h3><div class="metric">${s2.toFixed(3)} tCO2e</div></article>
    <article class="card"><h3>Scope 3</h3><div class="metric">${s3.toFixed(3)} tCO2e</div></article>
    <article class="card full"><h3>Cobertura de trazabilidad</h3><div class="metric">${trazabilidadCoverage().toFixed(1)}%</div></article>
  `;
}

function renderScope1(editId = "") {
  const el = panel("scope1");
  const editing = state.scope1.find((r) => r.id === editId);
  const rows = state.scope1.map((r) => `<tr><td>${r.id}</td><td>${r.fecha}</td><td>${r.fuente}</td><td>${r.actividad}</td><td>${r.factorEmision}</td><td>${calcScope1Emission(r).toFixed(3)}</td><td>${(r.evidenciaIds || []).length}</td><td class="actions"><button data-edit-s1="${r.id}">Editar</button><button class="danger" data-del-s1="${r.id}">Eliminar</button></td></tr>`).join("");

  el.innerHTML = `
  <article class="card full"><h3>Scope 1 · Emisiones directas</h3>
    <button id="new-s1" class="secondary">+ Nuevo registro Scope 1</button>
    <form id="form-s1" class="grid-form">
      <input type="hidden" name="id" value="${editing?.id || ""}"/>
      <label>Fecha <input type="date" name="fecha" required value="${editing?.fecha || ""}"/></label>
      <label>Fuente <select name="fuente" id="s1-fuente"><option value="refrigerante" ${editing?.fuente === "refrigerante" ? "selected" : ""}>Refrigerante</option><option value="combustible" ${editing?.fuente === "combustible" ? "selected" : ""}>Combustible</option></select></label>
      <label>Detalle <input name="detalle" required value="${editing?.detalle || ""}"/></label>
      <label>Actividad <input type="number" min="0" step="0.01" name="actividad" required value="${editing?.actividad || ""}"/></label>
      <label id="lbl-refri">Tipo refrigerante <select name="refrigeranteTipo" id="s1-refrigerante"><option>R410A</option><option>R32</option><option>R134a</option><option>R22</option><option value="Otro">Otro</option></select></label>
      <label id="lbl-comb">Tipo combustible <select name="combustibleTipo"><option value="nafta">Nafta</option><option value="diesel">Diésel</option><option value="mezcla_2t">Mezcla 2T</option></select></label>
      <label>Factor emisión <input type="number" min="0" step="0.001" name="factorEmision" required value="${editing?.factorEmision || ""}"/></label>
      <label class="span-2">Vincular evidencias existentes ${evidenceSelectorHtml(editing?.evidenciaIds || [])}</label>
      <label class="span-2">Subir evidencia nueva (PDF/JPG/PNG) <input type="file" id="s1-new-evidence" accept="application/pdf,image/png,image/jpeg" multiple/></label>
      <label class="span-2">Notas <textarea name="notas">${editing?.notas || ""}</textarea></label>
      <button type="submit">Guardar Scope 1</button>
    </form>
  </article>
  <article class="card full"><table><thead><tr><th>ID</th><th>Fecha</th><th>Fuente</th><th>Actividad</th><th>Factor</th><th>tCO2e</th><th>Evid.</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></article>`;

  const fuenteSel = el.querySelector("#s1-fuente");
  const refrSel = el.querySelector("#s1-refrigerante");
  function adjustSourceFields() {
    const isRef = fuenteSel.value === "refrigerante";
    el.querySelector("#lbl-refri").style.display = isRef ? "grid" : "none";
    el.querySelector("#lbl-comb").style.display = isRef ? "none" : "grid";
    if (isRef && refrSel.value !== "Otro") el.querySelector('[name="factorEmision"]').value = refrigerantGwp[refrSel.value] || "";
    if (!isRef && !el.querySelector('[name="factorEmision"]').value) el.querySelector('[name="factorEmision"]').value = 2.31;
  }
  refrSel.value = editing?.refrigeranteTipo || "R410A";
  adjustSourceFields();
  fuenteSel.onchange = adjustSourceFields;
  refrSel.onchange = adjustSourceFields;

  document.getElementById("new-s1").onclick = () => renderScope1();
  el.querySelectorAll("[data-edit-s1]").forEach((b) => (b.onclick = () => renderScope1(b.dataset.editS1)));
  el.querySelectorAll("[data-del-s1]").forEach((b) => (b.onclick = () => {
    state.scope1 = state.scope1.filter((r) => r.id !== b.dataset.delS1);
    pushLog(`Eliminado ${b.dataset.delS1}`); renderAll();
  }));

  document.getElementById("form-s1").onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.fecha || Number(data.actividad) <= 0 || Number(data.factorEmision) <= 0) return showToast("Validar fecha y números positivos", "error");
    const checked = [...form.querySelectorAll('input[name="evidenciaIds"]:checked')].map((x) => x.value);
    const uploaded = await uploadEvidenceFiles(document.getElementById("s1-new-evidence").files, data.id || `S1-${String(state.nextIds.scope1).padStart(3, "0")}`);
    const payload = {
      id: data.id || `S1-${String(state.nextIds.scope1++).padStart(3, "0")}`,
      fecha: data.fecha,
      fuente: data.fuente,
      detalle: data.detalle,
      unidadActividad: data.fuente === "refrigerante" ? "kg refrigerante" : "litros combustible",
      actividad: Number(data.actividad),
      factorEmision: Number(data.factorEmision),
      unidadFactor: data.fuente === "refrigerante" ? "GWP" : "kgCO2e/L",
      refrigeranteTipo: data.refrigeranteTipo,
      combustibleTipo: data.combustibleTipo,
      tCO2e: calcScope1Emission(data),
      evidenciaIds: [...new Set([...checked, ...uploaded])],
      notas: data.notas,
      createdAt: editing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    payload.tCO2e = calcScope1Emission(payload);
    const idx = state.scope1.findIndex((r) => r.id === payload.id);
    if (idx >= 0) state.scope1[idx] = payload; else state.scope1.push(payload);
    pushLog(`Guardado ${payload.id}`);
    showToast("Scope 1 guardado");
    renderAll();
    renderScope1();
  };
}

function renderScope2(editId = "") {
  const el = panel("scope2");
  const editing = state.scope2.find((r) => r.id_registro === editId);
  const rows = state.scope2.map((r) => `<tr><td>${r.id_registro}</td><td>${r.mes}</td><td>${r.kwh}</td><td>${calcScope2Emission(r).toFixed(3)}</td><td>${(r.evidenciaIds || []).length}</td><td class="actions"><button data-edit-s2="${r.id_registro}">Editar</button><button data-del-s2="${r.id_registro}" class="danger">Eliminar</button></td></tr>`).join("");
  el.innerHTML = `<article class="card full"><h3>Scope 2 · Electricidad</h3><button id="new-s2" class="secondary">+ Nuevo</button>
  <form id="form-s2" class="grid-form"><input type="hidden" name="id_registro" value="${editing?.id_registro || ""}"/>
  <label>Mes <input type="month" name="mes" required value="${editing?.mes || ""}"/></label>
  <label>Inicio <input type="date" name="inicio_factura" required value="${editing?.inicio_factura || ""}"/></label>
  <label>Fin <input type="date" name="fin_factura" required value="${editing?.fin_factura || ""}"/></label>
  <label>kWh <input type="number" min="0" step="0.01" name="kwh" required value="${editing?.kwh || ""}"/></label>
  <label>Proveedor <input name="proveedor" required value="${editing?.proveedor || ""}"/></label>
  <label>Medidor <input name="medidor" required value="${editing?.medidor || ""}"/></label>
  <label>Factor <select name="factor_id">${state.factores.filter((f) => f.alcance === "scope2").map((f) => `<option value="${f.id}" ${editing?.factor_id === f.id ? "selected" : ""}>${f.nombre}</option>`).join("")}</select></label>
  <label class="span-2">Evidencias ${evidenceSelectorHtml(editing?.evidenciaIds || [])}</label>
  <label class="span-2">Subir evidencia nueva <input id="s2-new-evidence" type="file" accept="application/pdf,image/png,image/jpeg" multiple/></label>
  <button type="submit">Guardar</button></form></article>
  <article class="card full"><table><thead><tr><th>ID</th><th>Mes</th><th>kWh</th><th>tCO2e</th><th>Evid.</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></article>`;

  document.getElementById("new-s2").onclick = () => renderScope2();
  el.querySelectorAll("[data-edit-s2]").forEach((b) => (b.onclick = () => renderScope2(b.dataset.editS2)));
  el.querySelectorAll("[data-del-s2]").forEach((b) => (b.onclick = () => { state.scope2 = state.scope2.filter((r) => r.id_registro !== b.dataset.delS2); renderAll(); }));

  document.getElementById("form-s2").onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.mes || Number(data.kwh) <= 0) return showToast("Validar datos Scope 2", "error");
    const checked = [...form.querySelectorAll('input[name="evidenciaIds"]:checked')].map((x) => x.value);
    const id = data.id_registro || `S2-${String(state.nextIds.scope2++).padStart(3, "0")}`;
    const uploaded = await uploadEvidenceFiles(document.getElementById("s2-new-evidence").files, id);
    const payload = { ...data, id_registro: id, kwh: Number(data.kwh), evidenciaIds: [...new Set([...checked, ...uploaded])] };
    const idx = state.scope2.findIndex((r) => r.id_registro === id);
    if (idx >= 0) state.scope2[idx] = payload; else state.scope2.push(payload);
    pushLog(`Guardado ${id}`);
    renderAll();
    renderScope2();
  };
}

function renderScope3(editId = "") {
  const el = panel("scope3");
  const editing = state.scope3.find((r) => r.id_servicio === editId);
  const rows = state.scope3.map((r) => `<tr><td>${r.id_servicio}</td><td>${r.fecha}</td><td>${r.cliente}</td><td>${calcScope3(r).kmTotal}</td><td>${calcScope3(r).emisiones.toFixed(3)}</td><td>${(r.evidenciaIds || []).length}</td><td class="actions"><button data-edit-s3="${r.id_servicio}">Editar</button><button data-del-s3="${r.id_servicio}" class="danger">Eliminar</button></td></tr>`).join("");
  el.innerHTML = `<article class="card full"><h3>Scope 3 · Transporte</h3><button id="new-s3" class="secondary">+ Nuevo</button>
  <form id="form-s3" class="grid-form"><input type="hidden" name="id_servicio" value="${editing?.id_servicio || ""}"/>
  <label>Fecha <input type="date" name="fecha" required value="${editing?.fecha || ""}"/></label><label>Mes <input type="month" name="mes" required value="${editing?.mes || ""}"/></label>
  <label>Cliente <input name="cliente" required value="${editing?.cliente || ""}"/></label><label>Tipo <select name="tipo"><option value="retiro">Retiro</option><option value="entrega">Entrega</option></select></label>
  <label>Operador <input name="operador" required value="${editing?.operador || ""}"/></label><label>Km ida vacío <input type="number" min="0" step="0.01" name="km_ida_vacio" required value="${editing?.km_ida_vacio || ""}"/></label>
  <label>Km vuelta carga <input type="number" min="0" step="0.01" name="km_vuelta_carga" required value="${editing?.km_vuelta_carga || ""}"/></label><label>Carga kg <input type="number" min="0" step="0.01" name="carga_kg" required value="${editing?.carga_kg || ""}"/></label>
  <label>Método <select name="metodo"><option value="combustible">Combustible</option><option value="tkm">tkm</option></select></label><label>Rendimiento km/L <input type="number" min="0" step="0.01" name="rendimiento_km_l" value="${editing?.rendimiento_km_l || ""}"/></label>
  <label>Litros <input type="number" min="0" step="0.01" name="litros" value="${editing?.litros || ""}"/></label><label>Factor <select name="factor_id">${state.factores.filter((f) => f.alcance === "scope3").map((f) => `<option value="${f.id}" ${editing?.factor_id === f.id ? "selected" : ""}>${f.nombre}</option>`).join("")}</select></label>
  <label class="span-2">Evidencias ${evidenceSelectorHtml(editing?.evidenciaIds || [])}</label>
  <label class="span-2">Subir evidencia nueva <input id="s3-new-evidence" type="file" accept="application/pdf,image/png,image/jpeg" multiple/></label>
  <button type="submit">Guardar</button></form></article>
  <article class="card full"><table><thead><tr><th>ID</th><th>Fecha</th><th>Cliente</th><th>Km</th><th>tCO2e</th><th>Evid.</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></article>`;
  document.getElementById("new-s3").onclick = () => renderScope3();
  el.querySelectorAll("[data-edit-s3]").forEach((b) => (b.onclick = () => renderScope3(b.dataset.editS3)));
  el.querySelectorAll("[data-del-s3]").forEach((b) => (b.onclick = () => { state.scope3 = state.scope3.filter((r) => r.id_servicio !== b.dataset.delS3); renderAll(); }));

  document.getElementById("form-s3").onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.fecha || Number(data.km_ida_vacio) < 0 || Number(data.km_vuelta_carga) < 0) return showToast("Validar datos Scope 3", "error");
    const checked = [...form.querySelectorAll('input[name="evidenciaIds"]:checked')].map((x) => x.value);
    const id = data.id_servicio || `TR-${String(state.nextIds.scope3++).padStart(3, "0")}`;
    const uploaded = await uploadEvidenceFiles(document.getElementById("s3-new-evidence").files, id);
    const calc = calcScope3(data);
    const payload = { ...data, id_servicio: id, km_ida_vacio: Number(data.km_ida_vacio), km_vuelta_carga: Number(data.km_vuelta_carga), carga_kg: Number(data.carga_kg), km_total: calc.kmTotal, litros: calc.litros || data.litros, evidenciaIds: [...new Set([...checked, ...uploaded])] };
    const idx = state.scope3.findIndex((r) => r.id_servicio === id);
    if (idx >= 0) state.scope3[idx] = payload; else state.scope3.push(payload);
    pushLog(`Guardado ${id}`);
    renderAll();
    renderScope3();
  };
}

function renderEvidencias() {
  const el = panel("evidencias");
  const rows = state.evidencias.map((ev) => `<tr><td>${ev.id_evidencia}</td><td>${ev.tipo}</td><td>${ev.fecha}</td><td>${ev.nombre_archivo}</td><td>${ev.hashSha256?.slice(0, 16)}...</td><td>${ev.relacionado_a || ""}</td><td class="actions"><button data-download-ev="${ev.id_evidencia}">Descargar</button><button data-del-ev="${ev.id_evidencia}" class="danger">Eliminar</button></td></tr>`).join("");
  el.innerHTML = `<article class="card full"><h3>Evidencias y adjuntos reales</h3>
  <p>Modo: <b>${state.config.localEvidenceMode}</b> ${state.config.localEvidenceMode === "indexeddb" ? "(Blob local)" : `(carpeta: ${state.config.fsFolderName || "sin seleccionar"})`}</p>
  <form id="form-ev" class="grid-form">
    <label>Tipo <select name="tipo"><option value="factura">Factura</option><option value="remito">Remito</option><option value="foto">Foto</option><option value="otro">Otro</option></select></label>
    <label>N° comprobante <input name="numeroComprobante"/></label>
    <label>Proveedor <input name="proveedor"/></label>
    <label>Fecha <input type="date" name="fecha" required/></label>
    <label>Monto (opcional) <input type="number" min="0" step="0.01" name="monto"/></label>
    <label class="span-2">Tags <input name="tags" placeholder="mantenimiento,energia"/></label>
    <label class="span-2">Archivo <input id="ev-file" type="file" accept="application/pdf,image/png,image/jpeg" required/></label>
    <button type="submit">Guardar evidencia</button>
  </form></article>
  <article class="card full"><table><thead><tr><th>ID</th><th>Tipo</th><th>Fecha</th><th>Archivo</th><th>SHA-256</th><th>Relacionado</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></article>`;

  document.getElementById("form-ev").onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const file = document.getElementById("ev-file").files[0];
    if (!file) return;
    const id = `EVD-${String(state.nextIds.evidencia++).padStart(3, "0")}`;
    await createEvidenceFromFile(file, id, data, []);
    renderAll();
  };
  el.querySelectorAll("[data-del-ev]").forEach((b) => b.onclick = async () => {
    state.evidencias = state.evidencias.filter((ev) => ev.id_evidencia !== b.dataset.delEv);
    await deleteEvidenceBlob(b.dataset.delEv);
    [state.scope1, state.scope2, state.scope3].forEach((list) => list.forEach((r) => r.evidenciaIds = (r.evidenciaIds || []).filter((id) => id !== b.dataset.delEv)));
    renderAll();
  });
  el.querySelectorAll("[data-download-ev]").forEach((b) => b.onclick = () => downloadEvidence(b.dataset.downloadEv));
}

function downloadFile(filename, content, type = "text/plain") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function toCsv(rows) {
  return rows.map((r) => r.map((c) => `"${String(c ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
}

function renderReportes() {
  const el = panel("reportes");
  const monthly = {};
  state.scope1.forEach((r) => { const m = r.fecha.slice(0, 7); monthly[m] ||= { s1: 0, s2: 0, s3: 0 }; monthly[m].s1 += calcScope1Emission(r); });
  state.scope2.forEach((r) => { monthly[r.mes] ||= { s1: 0, s2: 0, s3: 0 }; monthly[r.mes].s2 += calcScope2Emission(r); });
  state.scope3.forEach((r) => { monthly[r.mes] ||= { s1: 0, s2: 0, s3: 0 }; monthly[r.mes].s3 += calcScope3(r).emisiones; });
  const rows = Object.entries(monthly).sort((a, b) => a[0].localeCompare(b[0])).map(([mes, v]) => `<tr><td>${mes}</td><td>${v.s1.toFixed(3)}</td><td>${v.s2.toFixed(3)}</td><td>${v.s3.toFixed(3)}</td><td>${(v.s1 + v.s2 + v.s3).toFixed(3)}</td></tr>`).join("");
  el.innerHTML = `<article class="card full"><h3>Resumen mensual por scope</h3><table><thead><tr><th>Mes</th><th>Scope1</th><th>Scope2</th><th>Scope3</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table></article>
  <article class="card full"><div class="btn-row"><button id="csv-s1">CSV Scope 1</button><button id="csv-s2">CSV Scope 2</button><button id="csv-s3">CSV Scope 3</button><button id="pdf-auditoria">Informe PDF auditoría</button><button id="print-auditoria" class="secondary">Fallback imprimir</button></div></article>`;
  document.getElementById("csv-s1").onclick = () => downloadFile("scope1.csv", toCsv([["id", "fecha", "fuente", "actividad", "factor", "tco2e"], ...state.scope1.map((r) => [r.id, r.fecha, r.fuente, r.actividad, r.factorEmision, calcScope1Emission(r).toFixed(6)])]), "text/csv;charset=utf-8");
  document.getElementById("csv-s2").onclick = () => downloadFile("scope2.csv", toCsv([["id", "mes", "kwh", "tco2e"], ...state.scope2.map((r) => [r.id_registro, r.mes, r.kwh, calcScope2Emission(r).toFixed(6)])]), "text/csv;charset=utf-8");
  document.getElementById("csv-s3").onclick = () => downloadFile("scope3.csv", toCsv([["id", "fecha", "km_total", "tco2e"], ...state.scope3.map((r) => [r.id_servicio, r.fecha, calcScope3(r).kmTotal, calcScope3(r).emisiones.toFixed(6)])]), "text/csv;charset=utf-8");
  document.getElementById("pdf-auditoria").onclick = generateAuditPdf;
  document.getElementById("print-auditoria").onclick = () => window.print();
}

async function generateAuditPdf() {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) return showToast("jsPDF no disponible, use imprimir", "error");
  const doc = new jsPDF();
  const total1 = state.scope1.reduce((a, r) => a + calcScope1Emission(r), 0);
  const total2 = state.scope2.reduce((a, r) => a + calcScope2Emission(r), 0);
  const total3 = state.scope3.reduce((a, r) => a + calcScope3(r).emisiones, 0);
  let y = 15;
  const add = (txt) => { doc.text(txt, 10, y); y += 7; if (y > 280) { doc.addPage(); y = 15; } };
  add("ElectroGreem GHG App – Inventario de GEI (Scope 1/2/3)");
  add("Autor: Héctor Miguel Fadel");
  add("PPS Ingeniería Electrónica (UTN-FRT)");
  add("Tutor: Prof. Ing. Ramón Oris");
  add(`Generado: ${new Date().toLocaleString()} | Version: ${state.meta.appVersion}`);
  add("Alcance: incluye Scope 1/2/3 operativos; excluye emisiones fuera del límite organizacional definido.");
  add("Metodología: kWh->tCO2e; combustible/tkm->tCO2e; refrigerante*GWP/1000.");
  add(`Supuestos: calidad datos ${state.config.dataQuality}, origen factores ${state.config.factorSource}.`);
  add(`Resultados: S1 ${total1.toFixed(3)} | S2 ${total2.toFixed(3)} | S3 ${total3.toFixed(3)} | Total ${(total1 + total2 + total3).toFixed(3)} tCO2e`);
  add("Trazabilidad (evidencias):");
  state.evidencias.slice(0, 20).forEach((ev) => add(`${ev.id_evidencia} | ${ev.tipo} | ${ev.nombre_archivo} | ${ev.hashSha256}`));
  add("Registro de cambios:");
  state.changelog.slice(0, 15).forEach((c) => add(`${c.at} - ${c.action}`));
  doc.save("informe_auditoria_electrogreem.pdf");
  showToast("PDF generado");
}

function renderConfig() {
  const el = panel("config");
  const fsSupported = "showDirectoryPicker" in window;
  el.innerHTML = `<article class="card full"><h3>Configuración y respaldo</h3>
  <div class="theme-option"><label>Tema</label><select id="theme-select"><option value="light" ${loadThemePreference() === "light" ? "selected" : ""}>Claro</option><option value="dark" ${loadThemePreference() === "dark" ? "selected" : ""}>Oscuro</option></select></div>
  <div class="theme-option"><label>Modo evidencias</label><select id="ev-mode"><option value="indexeddb" ${state.config.localEvidenceMode === "indexeddb" ? "selected" : ""}>IndexedDB (recomendado fallback)</option><option value="fs" ${state.config.localEvidenceMode === "fs" ? "selected" : ""} ${!fsSupported ? "disabled" : ""}>Carpeta local (File System API)</option></select></div>
  <div class="btn-row"><button id="choose-folder" ${!fsSupported ? "disabled" : ""}>Seleccionar carpeta local</button><button id="backup-zip">Backup (ZIP)</button><input id="restore-file" type="file" accept=".zip"/><button id="restore-zip">Restore (ZIP)</button><button id="self-check" class="secondary">Ejecutar self-check</button></div>
  <p>${!fsSupported ? "El navegador no soporta File System Access API; se usará IndexedDB." : `Carpeta seleccionada: ${state.config.fsFolderName || "ninguna"}`}</p>
  </article>`;

  document.getElementById("theme-select").onchange = (e) => applyTheme(e.target.value);
  document.getElementById("ev-mode").onchange = (e) => { state.config.localEvidenceMode = e.target.value; saveState(); showToast("Modo actualizado", "success"); renderAll(); };
  document.getElementById("choose-folder").onclick = chooseLocalFolder;
  document.getElementById("backup-zip").onclick = exportZipBackup;
  document.getElementById("restore-zip").onclick = importZipBackup;
  document.getElementById("self-check").onclick = runSelfCheck;
}

async function openEvidenceDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore("files", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function evidenceTx(mode) {
  const db = await dbPromise;
  return db.transaction("files", mode).objectStore("files");
}

async function sha256(file) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function createEvidenceFromFile(file, id, meta = {}, related = []) {
  const hash = await sha256(file);
  if (state.config.localEvidenceMode === "indexeddb") {
    const store = await evidenceTx("readwrite");
    store.put({ id, blob: file, name: file.name, type: file.type, size: file.size });
  }
  if (state.config.localEvidenceMode === "fs" && window.evidenceFolderHandle) {
    try {
      const handle = await window.evidenceFolderHandle.getFileHandle(file.name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(file);
      await writable.close();
    } catch {
      showToast("No se pudo escribir en carpeta local", "error");
    }
  }
  state.evidencias.push({
    id_evidencia: id,
    tipo: meta.tipo || "otro",
    numeroComprobante: meta.numeroComprobante || "",
    proveedor: meta.proveedor || "",
    fecha: meta.fecha || new Date().toISOString().slice(0, 10),
    monto: meta.monto || "",
    tags: meta.tags || "",
    nombre_archivo: file.name,
    mimeType: file.type,
    size: file.size,
    hashSha256: hash,
    storageMode: state.config.localEvidenceMode,
    relacionado_a: related.join(",")
  });
  pushLog(`Evidencia ${id} cargada`);
  showToast(`Evidencia ${id} guardada`);
}

async function uploadEvidenceFiles(fileList, relatedId) {
  if (!fileList?.length) return [];
  const ids = [];
  for (const file of [...fileList]) {
    const id = `EVD-${String(state.nextIds.evidencia++).padStart(3, "0")}`;
    await createEvidenceFromFile(file, id, { tipo: "otro" }, [relatedId]);
    ids.push(id);
  }
  return ids;
}

async function getEvidenceBlob(id) {
  const store = await evidenceTx("readonly");
  return new Promise((resolve) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result?.blob || null);
    req.onerror = () => resolve(null);
  });
}
async function deleteEvidenceBlob(id) {
  const store = await evidenceTx("readwrite");
  return new Promise((resolve) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
  });
}

async function downloadEvidence(id) {
  const meta = evidenceById(id);
  if (!meta) return;
  const blob = await getEvidenceBlob(id);
  if (blob) return downloadFile(meta.nombre_archivo, blob, meta.mimeType);
  showToast("Archivo no disponible en IndexedDB (verifique carpeta local)", "error");
}

async function chooseLocalFolder() {
  if (!("showDirectoryPicker" in window)) return showToast("No soportado", "error");
  try {
    window.evidenceFolderHandle = await window.showDirectoryPicker();
    state.config.fsFolderName = window.evidenceFolderHandle.name;
    state.config.localEvidenceMode = "fs";
    pushLog("Carpeta local de evidencias seleccionada");
    renderAll();
  } catch {
    showToast("Selección de carpeta cancelada", "error");
  }
}

async function exportZipBackup() {
  if (!window.JSZip) return showToast("JSZip no disponible", "error");
  const zip = new JSZip();
  zip.file("data.json", JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2));
  const folder = zip.folder("evidencias");
  for (const ev of state.evidencias) {
    const blob = await getEvidenceBlob(ev.id_evidencia);
    if (blob) folder.file(ev.nombre_archivo, blob);
  }
  zip.file("manifest.json", JSON.stringify(state.evidencias.map((ev) => ({ id: ev.id_evidencia, hash: ev.hashSha256, nombre: ev.nombre_archivo, mode: ev.storageMode })), null, 2));
  const content = await zip.generateAsync({ type: "blob" });
  downloadFile(`electrogreem-backup-${new Date().toISOString().slice(0, 10)}.zip`, content, "application/zip");
  showToast("Backup ZIP generado");
}

async function importZipBackup() {
  const file = document.getElementById("restore-file").files[0];
  if (!file) return showToast("Seleccione ZIP", "error");
  const zip = await JSZip.loadAsync(file);
  const dataText = await zip.file("data.json")?.async("text");
  if (!dataText) return showToast("ZIP inválido", "error");
  state = JSON.parse(dataText);
  for (const ev of state.evidencias) {
    const entry = zip.file(`evidencias/${ev.nombre_archivo}`);
    if (entry) {
      const blob = await entry.async("blob");
      const store = await evidenceTx("readwrite");
      store.put({ id: ev.id_evidencia, blob, name: ev.nombre_archivo, type: ev.mimeType || blob.type, size: blob.size });
    }
  }
  pushLog("Restore desde ZIP ejecutado");
  renderAll();
  showToast("Restore completado");
}

async function runSelfCheck() {
  const sample = new File(["dummy evidence content"], "self-check.txt", { type: "text/plain" });
  const baseState = JSON.stringify(state);
  const hash = await sha256(sample);
  const rid = `S1-${String(state.nextIds.scope1++).padStart(3, "0")}`;
  state.scope1.push({ id: rid, fecha: "2026-01-01", fuente: "combustible", detalle: "Self-check", unidadActividad: "litros combustible", actividad: 1, factorEmision: 2.31, unidadFactor: "kgCO2e/L", tCO2e: 0.00231, evidenciaIds: [], notas: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const eid = `EVD-${String(state.nextIds.evidencia++).padStart(3, "0")}`;
  await createEvidenceFromFile(sample, eid, { tipo: "otro", fecha: "2026-01-01" }, [rid]);
  state.scope1[state.scope1.length - 1].evidenciaIds.push(eid);
  await exportZipBackup();
  const ev = evidenceById(eid);
  const ok = ev && ev.hashSha256 === hash;
  state = JSON.parse(baseState);
  renderAll();
  showToast(ok ? "Self-check OK (hash/valores coherentes)" : "Self-check FAIL", ok ? "success" : "error");
}
