const STORAGE_KEY = "electrogreem-ghg-v11";
const APP_VERSION = "1.0.0";
const BRAND = "ElectroGreem";

const tabs = [
  ["inicio", "Inicio / Guía"],
  ["scope1", "Emisiones directas (Scope 1)"],
  ["scope2", "Scope 2"],
  ["scope3", "Scope 3"],
  ["factores", "Factores"],
  ["evidencias", "Evidencias"],
  ["reportes", "Reportes"],
  ["config", "Configuración"]
];

let state = loadState();
const tabContainer = document.getElementById("tabs");
const panels = [...document.querySelectorAll(".tab-panel")];
init();

function initialState() {
  const now = new Date().toISOString();
  return {
    meta: { appVersion: APP_VERSION, createdAt: now, factorsVersion: "v1", factorsUpdatedAt: now },
    nextIds: { scope1: 1, scope2: 1, scope3: 1, evidencia: 1 },
    factores: [
      { id: "FE-S2-AR", alcance: "scope2", nombre: "Electricidad red AR", valor: 0.32, unidad: "tCO2e/MWh", editable: true },
      { id: "FE-S3-DIESEL", alcance: "scope3", nombre: "Transporte diésel", valor: 2.68, unidad: "kgCO2e/L", editable: true },
      { id: "GWP-R410A", alcance: "scope1", nombre: "Refrigerante R-410A", valor: 2088, unidad: "GWP", editable: true },
      { id: "GWP-R134a", alcance: "scope1", nombre: "Refrigerante R-134a", valor: 1430, unidad: "GWP", editable: true },
      { id: "GWP-R32", alcance: "scope1", nombre: "Refrigerante R-32", valor: 675, unidad: "GWP", editable: true },
      { id: "FE-S1-MEZCLA2T", alcance: "scope1", nombre: "Combustible nafta/mezcla 2T", valor: 2.31, unidad: "kgCO2e/L", editable: true }
    ],
    scope1: [],
    scope2: [],
    scope3: [],
    evidencias: [],
    changelog: [{ at: now, action: "Inicialización", author: "Sistema" }],
    reportFilter: { from: "", to: "", onlyWithEvidence: false, enabled: false }
  };
}

function init() {
  renderTabs();
  renderAll();
  activateTab("inicio");
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialState();
    return { ...initialState(), ...JSON.parse(saved) };
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
  state.changelog = state.changelog.slice(0, 40);
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.textContent = message;
  container.appendChild(node);
  setTimeout(() => node.remove(), 3500);
}

function panel(name) { return document.querySelector(`.tab-panel[data-tab="${name}"]`); }
function factorById(id) { return state.factores.find((f) => f.id === id); }
function evidenceById(id) { return state.evidencias.find((e) => e.id === id); }

function renderTabs() {
  tabContainer.innerHTML = "";
  tabs.forEach(([key, label]) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.dataset.tab = key;
    btn.onclick = () => activateTab(key);
    tabContainer.appendChild(btn);
  });
}

function activateTab(key) {
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === key));
  panels.forEach((p) => p.classList.toggle("active", p.dataset.tab === key));
}

function calcScope1Emission(record) {
  if (record.fuente === "refrigerante") return (Number(record.cantidad || 0) * Number(record.factor_emision || 0)) / 1000;
  const litros = Number(record.cantidad || 0);
  return (litros * Number(record.factor_emision || 0)) / 1000;
}

function calcScope2Emission(record) {
  const factor = factorById(record.factor_id);
  return (Number(record.kwh || 0) / 1000) * Number(factor?.valor || 0);
}

function calcScope3Emission(record) {
  const factor = factorById(record.factor_id);
  const litros = Number(record.litros || 0);
  return (litros * Number(factor?.valor || 0)) / 1000;
}

function coverage(records, idKey) {
  if (!records.length) return 0;
  const withEv = records.filter((r) => (r.evidenciaIds || []).length > 0).length;
  return (withEv / records.length) * 100;
}

function evidenceSelectorHtml(selected = []) {
  if (!state.evidencias.length) return "<small>Sin evidencias cargadas.</small>";
  return `<div class="evidence-links">${state.evidencias.map((ev) => `<label><input type="checkbox" name="evidenciaIds" value="${ev.id}" ${selected.includes(ev.id) ? "checked" : ""}/> ${ev.id} · ${ev.archivo_nombre}</label>`).join("")}</div>`;
}

function renderAll() {
  renderInicio();
  renderScope1();
  renderScope2();
  renderScope3();
  renderFactores();
  renderEvidencias();
  renderReportes();
  renderConfig();
  saveState();
}

function renderInicio() {
  const el = panel("inicio");
  const currentFilter = getActiveReportFilter();
  const data = reportRecords(currentFilter.from, currentFilter.to, currentFilter.onlyWithEvidence);
  const total1 = data.s1.reduce((a, r) => a + calcScope1Emission(r), 0);
  const total2 = data.s2.reduce((a, r) => a + calcScope2Emission(r), 0);
  const total3 = data.s3.reduce((a, r) => a + calcScope3Emission(r), 0);
  const total = total1 + total2 + total3;
  const globalCoverage = coverage([...data.s1, ...data.s2, ...data.s3]);
  const periodText = currentFilter.enabled ? `${currentFilter.from || "inicio"} a ${currentFilter.to || "actual"}` : "Todo el historial";
  const warnNoDate = data.excludedNoDate > 0 ? `<small class="report-warning">${data.excludedNoDate} registros sin fecha excluidos por filtro activo.</small>` : "";

  el.innerHTML = `
  <article class="card full">
    <h3>Guía rápida · ${BRAND} GHG App – Inventario de GEI (Scope 1/2/3)</h3>
    <p>Esta aplicación permite registrar emisiones operativas, gestionar trazabilidad documental y generar un informe profesional imprimible para auditoría.</p>
    <ul>
      <li><b>Pestañas:</b> Scope 1, Scope 2, Scope 3, Factores, Evidencias, Reportes y Configuración.</li>
      <li><b>Alcances incluidos:</b> Scope 1/2/3 operativos. <b>Límite organizacional:</b> instalaciones y operaciones propias declaradas por el usuario.</li>
      <li><b>Metodología:</b> electricidad (kWh→tCO2e), combustible (L→tCO2e), refrigerante (kg×GWP→tCO2e).</li>
      <li><b>Validez:</b> trazabilidad por evidencias vinculadas + registro de cambios + timestamp de factores.</li>
      <li><b>Aviso:</b> la calidad de resultados depende de la calidad del dato de entrada y de los factores configurados.</li>
    </ul>
    <p><b>Período activo:</b> ${periodText} · <b>Modo:</b> ${currentFilter.onlyWithEvidence ? "solo con evidencias" : "con y sin evidencias"}</p>
    ${warnNoDate}
  </article>
  <article class="card"><h3>Total general</h3><div class="metric">${total.toFixed(3)} tCO2e</div></article>
  <article class="card"><h3>Scope 1</h3><div class="metric">${total1.toFixed(3)} tCO2e</div><small>${data.s1.length} registros · cobertura ${coverage(data.s1).toFixed(1)}%</small></article>
  <article class="card"><h3>Scope 2</h3><div class="metric">${total2.toFixed(3)} tCO2e</div><small>${data.s2.length} registros · cobertura ${coverage(data.s2).toFixed(1)}%</small></article>
  <article class="card"><h3>Scope 3</h3><div class="metric">${total3.toFixed(3)} tCO2e</div><small>${data.s3.length} registros · cobertura ${coverage(data.s3).toFixed(1)}%</small></article>
  <article class="card full"><h3>Cobertura de evidencias global</h3><div class="metric">${globalCoverage.toFixed(1)}%</div></article>`;
}

function renderScope1(editId = "") {
  const el = panel("scope1");
  const editing = state.scope1.find((r) => r.id === editId);
  const gwpFactors = state.factores.filter((f) => f.unidad === "GWP");
  const fuelFactor = state.factores.find((f) => f.id === "FE-S1-MEZCLA2T") || { valor: 2.31 };
  const rows = state.scope1.map((r) => `<tr><td>${r.id}</td><td>${r.fecha}</td><td>${r.fuente}</td><td>${r.actividad}</td><td>${Number(r.cantidad).toFixed(2)} ${r.unidad}</td><td>${Number(r.factor_emision).toFixed(3)}</td><td>${(calcScope1Emission(r) * 1000).toFixed(2)}</td><td>${calcScope1Emission(r).toFixed(4)}</td><td>${(r.evidenciaIds || []).join(", ")}</td><td class="actions"><button data-edit-s1="${r.id}">Editar</button><button class="danger" data-del-s1="${r.id}">Eliminar</button></td></tr>`).join("");

  el.innerHTML = `<article class="card full"><h3>Emisiones directas (Scope 1)</h3><button id="new-s1" class="secondary">+ Nuevo registro</button>
  <form id="form-s1" class="grid-form">
  <input type="hidden" name="id" value="${editing?.id || ""}" />
  <label>Fecha <input type="date" name="fecha" value="${editing?.fecha || ""}" required /></label>
  <label>Fuente <select name="fuente" id="s1-source"><option value="Refrigerante (A/A)">Refrigerante (A/A)</option><option value="Combustible podadora 2T">Combustible podadora 2T</option></select></label>
  <label class="span-2">Descripción / actividad <input name="actividad" value="${editing?.actividad || ""}" required /></label>
  <label id="lbl-cantidad">Cantidad <input type="number" min="0" step="0.01" name="cantidad" value="${editing?.cantidad || ""}" required /></label>
  <label id="lbl-unidad">Unidad <input name="unidad" value="${editing?.unidad || "kg"}" required /></label>
  <label id="lbl-refri">Tipo refrigerante <select name="tipo_refrigerante" id="tipo-refri"><option value="">N/A</option>${gwpFactors.map((f) => `<option value="${f.id}">${f.nombre} (${f.valor})</option>`).join("")}<option value="custom">Otro (manual)</option></select></label>
  <label id="lbl-factor">Factor/GWP <input type="number" min="0" step="0.001" name="factor_emision" value="${editing?.factor_emision || ""}" required /></label>
  <label>Horas (opcional) <input type="number" min="0" step="0.01" name="horas" value="${editing?.horas || ""}" /></label>
  <label>Consumo L/h (opcional) <input type="number" min="0" step="0.01" name="consumo_lh" value="${editing?.consumo_lh || ""}" /></label>
  <label class="span-2">Evidencias vinculadas ${evidenceSelectorHtml(editing?.evidenciaIds || [])}</label>
  <button type="submit">Guardar Scope 1</button>
  </form></article>
  <article class="card full"><table><thead><tr><th>ID</th><th>Fecha</th><th>Fuente</th><th>Actividad</th><th>Cantidad</th><th>Factor</th><th>kgCO2e</th><th>tCO2e</th><th>Evidencias</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></article>`;

  const sourceSel = el.querySelector("#s1-source");
  const refriSel = el.querySelector("#tipo-refri");
  sourceSel.value = editing?.fuente || "Refrigerante (A/A)";
  refriSel.value = editing?.tipo_refrigerante || "";

  function syncScope1Fields() {
    const isRef = sourceSel.value === "Refrigerante (A/A)";
    el.querySelector("#lbl-refri").style.display = isRef ? "grid" : "none";
    el.querySelector("#lbl-cantidad input").placeholder = isRef ? "kg" : "litros";
    el.querySelector("#lbl-unidad input").value = isRef ? "kg" : "litros";
    if (isRef && refriSel.value && refriSel.value !== "custom") {
      el.querySelector('[name="factor_emision"]').value = factorById(refriSel.value)?.valor || "";
    }
    if (!isRef && !editing?.id) el.querySelector('[name="factor_emision"]').value = fuelFactor.valor;
  }
  sourceSel.onchange = syncScope1Fields;
  refriSel.onchange = syncScope1Fields;
  syncScope1Fields();

  document.getElementById("new-s1").onclick = () => renderScope1();
  el.querySelectorAll("[data-edit-s1]").forEach((b) => (b.onclick = () => renderScope1(b.dataset.editS1)));
  el.querySelectorAll("[data-del-s1]").forEach((b) => (b.onclick = () => { state.scope1 = state.scope1.filter((r) => r.id !== b.dataset.delS1); pushLog(`Eliminado ${b.dataset.delS1}`); renderAll(); }));

  document.getElementById("form-s1").onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const evidenceIds = [...e.target.querySelectorAll('input[name="evidenciaIds"]:checked')].map((x) => x.value);
    const payload = {
      id: data.id || `S1-${String(state.nextIds.scope1++).padStart(3, "0")}`,
      fecha: data.fecha,
      fuente: data.fuente,
      actividad: data.actividad,
      cantidad: Number(data.cantidad || (Number(data.horas || 0) * Number(data.consumo_lh || 0))),
      unidad: data.unidad,
      tipo_refrigerante: data.tipo_refrigerante,
      factor_emision: Number(data.factor_emision),
      horas: Number(data.horas || 0),
      consumo_lh: Number(data.consumo_lh || 0),
      evidenciaIds,
      updatedAt: new Date().toISOString()
    };
    const idx = state.scope1.findIndex((r) => r.id === payload.id);
    if (idx >= 0) state.scope1[idx] = payload; else state.scope1.push(payload);
    pushLog(`Guardado ${payload.id}`);
    renderAll();
    renderScope1();
  };
}

function renderScope2(editId = "") {
  const el = panel("scope2");
  const editing = state.scope2.find((r) => r.id === editId);
  const rows = state.scope2.map((r) => `<tr><td>${r.id}</td><td>${r.fecha}</td><td>${r.kwh}</td><td>${r.factor_id}</td><td>${calcScope2Emission(r).toFixed(4)}</td><td>${(r.evidenciaIds || []).join(",")}</td><td class="actions"><button data-edit-s2="${r.id}">Editar</button><button class="danger" data-del-s2="${r.id}">Eliminar</button></td></tr>`).join("");
  el.innerHTML = `<article class="card full"><h3>Scope 2 · Electricidad</h3><button id="new-s2" class="secondary">+ Nuevo</button>
  <form id="form-s2" class="grid-form"><input type="hidden" name="id" value="${editing?.id || ""}" />
  <label>Fecha (mes) <input type="month" name="fecha" value="${editing?.fecha || ""}" required /></label>
  <label>kWh <input type="number" min="0" step="0.01" name="kwh" value="${editing?.kwh || ""}" required /></label>
  <label>Factor <select name="factor_id">${state.factores.filter((f) => f.alcance === "scope2").map((f) => `<option value="${f.id}" ${editing?.factor_id === f.id ? "selected" : ""}>${f.nombre}</option>`).join("")}</select></label>
  <label class="span-2">Evidencias ${evidenceSelectorHtml(editing?.evidenciaIds || [])}</label>
  <button type="submit">Guardar</button></form></article>
  <article class="card full"><table><thead><tr><th>ID</th><th>Fecha</th><th>kWh</th><th>Factor</th><th>tCO2e</th><th>Evidencias</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></article>`;

  document.getElementById("new-s2").onclick = () => renderScope2();
  el.querySelectorAll("[data-edit-s2]").forEach((b) => (b.onclick = () => renderScope2(b.dataset.editS2)));
  el.querySelectorAll("[data-del-s2]").forEach((b) => (b.onclick = () => { state.scope2 = state.scope2.filter((r) => r.id !== b.dataset.delS2); renderAll(); }));
  document.getElementById("form-s2").onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const payload = { ...data, id: data.id || `S2-${String(state.nextIds.scope2++).padStart(3, "0")}`, kwh: Number(data.kwh), evidenciaIds: [...e.target.querySelectorAll('input[name="evidenciaIds"]:checked')].map((x) => x.value) };
    const idx = state.scope2.findIndex((r) => r.id === payload.id);
    if (idx >= 0) state.scope2[idx] = payload; else state.scope2.push(payload);
    pushLog(`Guardado ${payload.id}`);
    renderAll();
    renderScope2();
  };
}

function renderScope3(editId = "") {
  const el = panel("scope3");
  const editing = state.scope3.find((r) => r.id === editId);
  const rows = state.scope3.map((r) => `<tr><td>${r.id}</td><td>${r.fecha}</td><td>${r.actividad}</td><td>${r.litros}</td><td>${r.factor_id}</td><td>${calcScope3Emission(r).toFixed(4)}</td><td>${(r.evidenciaIds || []).join(",")}</td><td class="actions"><button data-edit-s3="${r.id}">Editar</button><button class="danger" data-del-s3="${r.id}">Eliminar</button></td></tr>`).join("");
  el.innerHTML = `<article class="card full"><h3>Scope 3 · Operaciones indirectas</h3><button id="new-s3" class="secondary">+ Nuevo</button>
  <form id="form-s3" class="grid-form"><input type="hidden" name="id" value="${editing?.id || ""}" />
  <label>Fecha <input type="date" name="fecha" value="${editing?.fecha || ""}" required /></label>
  <label>Actividad <input name="actividad" value="${editing?.actividad || ""}" required /></label>
  <label>Litros combustible <input type="number" min="0" step="0.01" name="litros" value="${editing?.litros || ""}" required /></label>
  <label>Factor <select name="factor_id">${state.factores.filter((f) => f.alcance === "scope3").map((f) => `<option value="${f.id}" ${editing?.factor_id === f.id ? "selected" : ""}>${f.nombre}</option>`).join("")}</select></label>
  <label class="span-2">Evidencias ${evidenceSelectorHtml(editing?.evidenciaIds || [])}</label>
  <button type="submit">Guardar</button></form></article>
  <article class="card full"><table><thead><tr><th>ID</th><th>Fecha</th><th>Actividad</th><th>Litros</th><th>Factor</th><th>tCO2e</th><th>Evidencias</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></article>`;
  document.getElementById("new-s3").onclick = () => renderScope3();
  el.querySelectorAll("[data-edit-s3]").forEach((b) => (b.onclick = () => renderScope3(b.dataset.editS3)));
  el.querySelectorAll("[data-del-s3]").forEach((b) => (b.onclick = () => { state.scope3 = state.scope3.filter((r) => r.id !== b.dataset.delS3); renderAll(); }));
  document.getElementById("form-s3").onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const payload = { ...data, id: data.id || `S3-${String(state.nextIds.scope3++).padStart(3, "0")}`, litros: Number(data.litros), evidenciaIds: [...e.target.querySelectorAll('input[name="evidenciaIds"]:checked')].map((x) => x.value) };
    const idx = state.scope3.findIndex((r) => r.id === payload.id);
    if (idx >= 0) state.scope3[idx] = payload; else state.scope3.push(payload);
    pushLog(`Guardado ${payload.id}`);
    renderAll();
    renderScope3();
  };
}

function renderFactores() {
  const el = panel("factores");
  const rows = state.factores.map((f) => `<tr><td>${f.id}</td><td>${f.alcance}</td><td>${f.nombre}</td><td><input data-factor="${f.id}" type="number" step="0.001" value="${f.valor}" /></td><td>${f.unidad}</td></tr>`).join("");
  el.innerHTML = `<article class="card full"><h3>Factores de emisión y GWP</h3>
  <p>Versión de factores: <b>${state.meta.factorsVersion}</b> · Última edición: <b>${new Date(state.meta.factorsUpdatedAt).toLocaleString()}</b></p>
  <table><thead><tr><th>ID</th><th>Scope</th><th>Nombre</th><th>Valor</th><th>Unidad</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="btn-row"><button id="save-factors">Guardar factores</button><input id="factor-version" value="${state.meta.factorsVersion}" placeholder="Versión"/></div></article>`;
  document.getElementById("save-factors").onclick = () => {
    document.querySelectorAll("[data-factor]").forEach((input) => {
      const factor = factorById(input.dataset.factor);
      factor.valor = Number(input.value);
    });
    state.meta.factorsVersion = document.getElementById("factor-version").value || state.meta.factorsVersion;
    state.meta.factorsUpdatedAt = new Date().toISOString();
    pushLog("Factores actualizados");
    renderAll();
    showToast("Factores guardados");
  };
}

async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function linkedRecordsByEvidenceId(id) {
  const uses = [];
  state.scope1.forEach((r) => (r.evidenciaIds || []).includes(id) && uses.push(`Scope 1 · ${r.id}`));
  state.scope2.forEach((r) => (r.evidenciaIds || []).includes(id) && uses.push(`Scope 2 · ${r.id}`));
  state.scope3.forEach((r) => (r.evidenciaIds || []).includes(id) && uses.push(`Scope 3 · ${r.id}`));
  return uses;
}

function renderEvidencias() {
  const el = panel("evidencias");
  const rows = state.evidencias.map((ev) => `<tr><td>${ev.id}</td><td>${ev.tipo}</td><td>${ev.archivo_nombre}</td><td>${ev.hash?.slice(0, 18)}...</td><td>${ev.fecha_documento || ""}</td><td>${linkedRecordsByEvidenceId(ev.id).join("; ") || "Sin uso"}</td><td class="actions"><button data-del-ev="${ev.id}" class="danger">Eliminar</button></td></tr>`).join("");
  el.innerHTML = `<article class="card full"><h3>Evidencias y trazabilidad</h3>
  <form id="form-ev" class="grid-form">
  <label>Tipo <input name="tipo" required /></label>
  <label>Fecha documento <input type="date" name="fecha_documento"/></label>
  <label class="span-2">Nota <input name="nota" /></label>
  <label class="span-2">Archivo <input type="file" id="ev-file" required /></label>
  <button type="submit">Guardar evidencia</button>
  </form></article>
  <article class="card full"><table><thead><tr><th>ID</th><th>Tipo</th><th>Archivo</th><th>Hash</th><th>Fecha doc.</th><th>Dónde se usa</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></article>`;
  document.getElementById("form-ev").onsubmit = async (e) => {
    e.preventDefault();
    const file = document.getElementById("ev-file").files[0];
    if (!file) return;
    const data = Object.fromEntries(new FormData(e.target).entries());
    const id = `EVD-${String(state.nextIds.evidencia++).padStart(3, "0")}`;
    state.evidencias.push({ id, tipo: data.tipo, archivo_nombre: file.name, hash: await hashFile(file), fecha_documento: data.fecha_documento, nota: data.nota });
    pushLog(`Evidencia ${id} creada`);
    renderAll();
    showToast("Evidencia guardada");
  };
  el.querySelectorAll("[data-del-ev]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.delEv;
      state.evidencias = state.evidencias.filter((ev) => ev.id !== id);
      [state.scope1, state.scope2, state.scope3].forEach((scope) => scope.forEach((r) => { r.evidenciaIds = (r.evidenciaIds || []).filter((evId) => evId !== id); }));
      pushLog(`Evidencia ${id} eliminada`);
      renderAll();
    };
  });
}

function normalizeRecordDate(dateVal) {
  if (!dateVal) return "";
  return /^\d{4}-\d{2}$/.test(dateVal) ? `${dateVal}-01` : dateVal;
}

function hasActivePeriod(fromDate, toDate) {
  return Boolean(fromDate || toDate);
}

function filterByPeriod(records, fromDate, toDate) {
  const filtered = [];
  let excludedNoDate = 0;
  const periodActive = hasActivePeriod(fromDate, toDate);

  records.forEach((record) => {
    const normalizedDate = normalizeRecordDate(record.fecha);
    if (!normalizedDate) {
      if (periodActive) excludedNoDate += 1;
      else filtered.push(record);
      return;
    }
    if (fromDate && normalizedDate < fromDate) return;
    if (toDate && normalizedDate > toDate) return;
    filtered.push(record);
  });

  return { records: filtered, excludedNoDate };
}

function getActiveReportFilter() {
  const configured = state.reportFilter || {};
  const enabled = Boolean(configured.enabled || configured.from || configured.to);
  return {
    from: configured.from || "",
    to: configured.to || "",
    onlyWithEvidence: Boolean(configured.onlyWithEvidence),
    includeTrace: configured.includeTrace !== false,
    enabled
  };
}

function reportRecords(fromDate = "", toDate = "", onlyWithEvidence = false) {
  const s1Period = filterByPeriod(state.scope1, fromDate, toDate);
  const s2Period = filterByPeriod(state.scope2, fromDate, toDate);
  const s3Period = filterByPeriod(state.scope3, fromDate, toDate);

  const byEvidence = (rows) => rows.filter((r) => !onlyWithEvidence || (r.evidenciaIds || []).length > 0);
  return {
    s1: byEvidence(s1Period.records),
    s2: byEvidence(s2Period.records),
    s3: byEvidence(s3Period.records),
    excludedNoDate: s1Period.excludedNoDate + s2Period.excludedNoDate + s3Period.excludedNoDate
  };
}

function scopeSectionHtml(title, records, columns, subtotal) {
  if (!records.length) {
    return `<section class="report-section report-scope-break"><h2>${title}</h2><p class="empty-note">Sin registros en el período.</p><p><b>Subtotal:</b> ${subtotal.toFixed(4)} tCO2e</p></section>`;
  }

  return `<section class="report-section report-scope-break"><h2>${title}</h2>
  <table class="report-table"><thead><tr>${columns.map((col) => `<th>${col}</th>`).join("")}</tr></thead>
  <tbody>${records.join("")}</tbody></table><p><b>Subtotal:</b> ${subtotal.toFixed(4)} tCO2e</p></section>`;
}

function buildReportHtml(fromDate, toDate, onlyWithEvidence, includeTrace) {
  const data = reportRecords(fromDate, toDate, onlyWithEvidence);
  const t1 = data.s1.reduce((a, r) => a + calcScope1Emission(r), 0);
  const t2 = data.s2.reduce((a, r) => a + calcScope2Emission(r), 0);
  const t3 = data.s3.reduce((a, r) => a + calcScope3Emission(r), 0);
  const total = t1 + t2 + t3;
  const now = new Date();
  const periodLabel = hasActivePeriod(fromDate, toDate) ? `${fromDate || "inicio"} a ${toDate || "actual"}` : "Todo";

  const factorRows = state.factores.map((f) => `<tr><td>${f.id}</td><td>${f.alcance}</td><td>${f.nombre}</td><td>${f.valor}</td><td>${f.unidad}</td></tr>`).join("");
  const traza = state.evidencias.map((ev) => `<tr><td>${ev.id}</td><td>${ev.tipo}</td><td>${ev.archivo_nombre}</td><td>${ev.hash || ""}</td><td>${ev.fecha_documento || ""}</td><td>${linkedRecordsByEvidenceId(ev.id).join("; ") || "Sin vínculo"}</td></tr>`).join("");

  const baseStyles = `
  :root { --bg:#f4efe4; --bg-alt:#eae1d1; --surface:#efe6d8; --surface-strong:#e2d6c3; --text:#1f1f1c; --text-muted:#5b564c; --accent:#557a5a; --accent-strong:#416146; --accent-soft:#dce7d8; --border:#cdbfa9; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:Inter, Segoe UI, Arial, sans-serif; background:var(--bg); color:var(--text); line-height:1.45; font-size:12px; }
  h1,h2,h3 { color:var(--accent-strong); margin:.2rem 0 .45rem; }
  .report-wrap { max-width:960px; margin:0 auto; padding:1.2rem; }
  .report-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:1rem; margin-bottom:.85rem; }
  .report-meta { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:.4rem 1rem; color:var(--text-muted); }
  .kpi-grid { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:.6rem; }
  .kpi { background:var(--bg-alt); border:1px solid var(--border); border-radius:10px; padding:.6rem; }
  .kpi strong { font-size:1.15rem; color:var(--accent-strong); }
  table { width:100%; border-collapse:collapse; background:var(--surface); }
  th,td { border:1px solid var(--border); padding:.35rem .45rem; text-align:left; vertical-align:top; }
  th { background:var(--surface-strong); }
  tbody tr:nth-child(even) td { background:color-mix(in srgb, var(--surface) 88%, var(--bg) 12%); }
  .report-table { margin-top:.45rem; }
  .report-warning { color:#7c5a1e; font-weight:600; }
  .empty-note { color:var(--text-muted); font-style:italic; }
  .print-controls { display:flex; gap:.55rem; margin-bottom:1rem; }
  .print-controls button { border:1px solid var(--border); border-radius:8px; padding:.45rem .75rem; background:var(--accent); color:#fff; cursor:pointer; }
  .report-header { position:sticky; top:0; background:var(--bg); padding:.35rem 0 .55rem; margin-bottom:.65rem; }
  @media print {
    @page { size:A4 portrait; margin:13mm; }
    body { font-size:11px; background:#fff; }
    .no-print { display:none !important; }
    .report-wrap { max-width:none; padding:0; }
    .report-header { position:fixed; top:0; left:0; right:0; background:#fff; border-bottom:1px solid var(--border); padding:3mm 0; }
    .report-page-content { margin-top:18mm; }
    .report-scope-break { page-break-before:always; }
    table { page-break-inside:auto; }
    tr { page-break-inside:avoid; page-break-after:auto; }
  }
  `;

  const scope1Rows = data.s1.map((r) => `<tr><td>${r.id}</td><td>${r.fecha || "-"}</td><td>${r.fuente}</td><td>${r.actividad}</td><td>${r.cantidad} ${r.unidad}</td><td>${Number(r.factor_emision).toFixed(3)}</td><td>${calcScope1Emission(r).toFixed(4)}</td><td>${(r.evidenciaIds || []).join(", ") || "-"}</td></tr>`);
  const scope2Rows = data.s2.map((r) => `<tr><td>${r.id}</td><td>${r.fecha || "-"}</td><td>${r.kwh}</td><td>${factorById(r.factor_id)?.nombre || r.factor_id}</td><td>${calcScope2Emission(r).toFixed(4)}</td><td>${(r.evidenciaIds || []).join(", ") || "-"}</td></tr>`);
  const scope3Rows = data.s3.map((r) => `<tr><td>${r.id}</td><td>${r.fecha || "-"}</td><td>${r.actividad}</td><td>${r.litros} L</td><td>${factorById(r.factor_id)?.nombre || r.factor_id}</td><td>${calcScope3Emission(r).toFixed(4)}</td><td>${(r.evidenciaIds || []).join(", ") || "-"}</td></tr>`);

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>Reporte GEI</title><style>${baseStyles}</style></head><body>
  <div class="report-wrap">
    <div class="print-controls no-print"><button onclick="window.print()">Descargar PDF</button><button onclick="window.close()">Cerrar</button></div>
    <header class="report-header"><strong>ElectroGreem GHG App</strong> · Inventario GEI Scope 1/2/3 · Período ${periodLabel}</header>
    <div class="report-page-content">
      <section class="report-card">
        <h1>ElectroGreem GHG App — Inventario de GEI (Scope 1/2/3)</h1>
        <p><b>Autor:</b> Héctor Miguel Fadel | PPS Ing. Electrónica (UTN-FRT) | <b>Tutor:</b> Prof. Ing. Ramón Oris</p>
        <div class="report-meta">
          <div><b>Versión:</b> ${APP_VERSION}</div><div><b>Fecha/hora:</b> ${now.toLocaleString()}</div>
          <div><b>Período:</b> ${periodLabel}</div><div><b>Modo:</b> ${onlyWithEvidence ? "con evidencias" : "sin filtro de evidencias"}</div>
        </div>
        ${data.excludedNoDate ? `<p class="report-warning">${data.excludedNoDate} registros sin fecha excluidos por período activo.</p>` : ""}
      </section>

      <section class="report-card report-section">
        <h2>Resumen ejecutivo</h2>
        <div class="kpi-grid">
          <div class="kpi"><div>Scope 1</div><strong>${t1.toFixed(4)}</strong><div>tCO2e</div></div>
          <div class="kpi"><div>Scope 2</div><strong>${t2.toFixed(4)}</strong><div>tCO2e</div></div>
          <div class="kpi"><div>Scope 3</div><strong>${t3.toFixed(4)}</strong><div>tCO2e</div></div>
          <div class="kpi"><div>Total</div><strong>${total.toFixed(4)}</strong><div>tCO2e</div></div>
        </div>
        <p>Cobertura de evidencias: ${coverage([...data.s1, ...data.s2, ...data.s3]).toFixed(1)}%</p>
      </section>

      ${scopeSectionHtml("Alcance 1 (Scope 1)", scope1Rows, ["ID", "Fecha", "Actividad", "Descripción", "Entrada", "Factor", "Resultado (tCO2e)", "Evidencias"], t1)}
      ${scopeSectionHtml("Alcance 2 (Scope 2)", scope2Rows, ["ID", "Fecha", "Entrada (kWh)", "Factor", "Resultado (tCO2e)", "Evidencias"], t2)}
      ${scopeSectionHtml("Alcance 3 (Scope 3)", scope3Rows, ["ID", "Fecha", "Actividad", "Entrada", "Factor", "Resultado (tCO2e)", "Evidencias"], t3)}

      <section class="report-card report-section report-scope-break">
        <h2>Total</h2>
        <table class="report-table"><thead><tr><th>Concepto</th><th>tCO2e</th></tr></thead><tbody>
          <tr><td>Scope 1</td><td>${t1.toFixed(4)}</td></tr>
          <tr><td>Scope 2</td><td>${t2.toFixed(4)}</td></tr>
          <tr><td>Scope 3</td><td>${t3.toFixed(4)}</td></tr>
          <tr><td><b>Total</b></td><td><b>${total.toFixed(4)}</b></td></tr>
        </tbody></table>
      </section>

      <section class="report-card report-section">
        <h2>Anexos</h2>
        <h3>Factores utilizados</h3>
        <table class="report-table"><thead><tr><th>ID</th><th>Scope</th><th>Nombre</th><th>Valor</th><th>Unidad</th></tr></thead><tbody>${factorRows}</tbody></table>
        ${includeTrace ? `<h3>Trazabilidad</h3><table class="report-table"><thead><tr><th>ID</th><th>Tipo</th><th>Nombre</th><th>Hash</th><th>Fecha</th><th>Vinculación</th></tr></thead><tbody>${traza || '<tr><td colspan="6">Sin evidencias cargadas.</td></tr>'}</tbody></table>` : ""}
        <h3>Registro de cambios</h3>
        <table class="report-table"><thead><tr><th>Fecha</th><th>Acción</th><th>Autor</th></tr></thead><tbody>${state.changelog.map((c) => `<tr><td>${new Date(c.at).toLocaleString()}</td><td>${c.action}</td><td>${c.author}</td></tr>`).join("")}</tbody></table>
      </section>

      <section class="report-card report-section">
        <h2>Supuestos y metodología</h2>
        <p>Se consideran únicamente registros operativos cargados en la aplicación y factores vigentes declarados por el usuario.</p>
        <ul>
          <li>Scope 1 refrigerante: tCO2e = (kg × GWP) / 1000.</li>
          <li>Scope 1 combustible: tCO2e = (L × EF kgCO2e/L) / 1000.</li>
          <li>Scope 2: tCO2e = (kWh / 1000) × FE (tCO2e/MWh).</li>
          <li>Scope 3: tCO2e = (L × EF kgCO2e/L) / 1000.</li>
        </ul>
        <p><b>Créditos:</b> Autor Héctor Miguel Fadel · Tutor Prof. Ing. Ramón Oris.</p>
      </section>
    </div>
  </div>
  </body></html>`;
}

function renderReportes() {
  const el = panel("reportes");
  const filter = getActiveReportFilter();
  const data = reportRecords(filter.from, filter.to, filter.onlyWithEvidence);
  const t1 = data.s1.reduce((acc, r) => acc + calcScope1Emission(r), 0);
  const t2 = data.s2.reduce((acc, r) => acc + calcScope2Emission(r), 0);
  const t3 = data.s3.reduce((acc, r) => acc + calcScope3Emission(r), 0);
  const periodLabel = filter.enabled ? `${filter.from || "inicio"} a ${filter.to || "actual"}` : "Todo";

  el.innerHTML = `<article class="card full"><h3>Informe profesional y PDF</h3>
  <div class="grid-form report-filter-grid">
    <label>Fecha desde <input type="date" id="rep-from" value="${filter.from}"/></label>
    <label>Fecha hasta <input type="date" id="rep-to" value="${filter.to}"/></label>
    <label><input type="checkbox" id="rep-only-ev" ${filter.onlyWithEvidence ? "checked" : ""}/> Solo registros con evidencias</label>
    <label><input type="checkbox" id="rep-trace" ${filter.includeTrace ? "checked" : ""}/> Incluir anexos de trazabilidad</label>
    <button type="button" id="apply-report-filter">Aplicar</button>
    <button type="button" id="clear-report-filter" class="secondary">Limpiar período</button>
    <button type="button" id="gen-report">Abrir reporte imprimible</button>
  </div>
  <div class="report-preview card-preview">
    <p><b>Período activo:</b> ${periodLabel}</p>
    <p><b>Resumen:</b> S1 ${t1.toFixed(4)} · S2 ${t2.toFixed(4)} · S3 ${t3.toFixed(4)} · Total ${(t1 + t2 + t3).toFixed(4)} tCO2e.</p>
    ${data.excludedNoDate ? `<p class="report-warning">${data.excludedNoDate} registros sin fecha excluidos por período activo.</p>` : ""}
  </div>
  </article>`;

  document.getElementById("apply-report-filter").onclick = () => {
    const from = document.getElementById("rep-from").value;
    const to = document.getElementById("rep-to").value;
    state.reportFilter = {
      ...state.reportFilter,
      from,
      to,
      onlyWithEvidence: document.getElementById("rep-only-ev").checked,
      includeTrace: document.getElementById("rep-trace").checked,
      enabled: hasActivePeriod(from, to)
    };
    pushLog(`Filtro de reportes aplicado (${from || "inicio"} - ${to || "actual"})`);
    renderAll();
    showToast("Filtro de período aplicado");
  };

  document.getElementById("clear-report-filter").onclick = () => {
    state.reportFilter = { from: "", to: "", onlyWithEvidence: false, includeTrace: true, enabled: false };
    renderAll();
    showToast("Filtro de período limpiado");
  };

  document.getElementById("gen-report").onclick = () => {
    const current = getActiveReportFilter();
    const html = buildReportHtml(current.from, current.to, current.onlyWithEvidence, current.includeTrace);
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  };
}

function renderConfig() {
  const el = panel("config");
  el.innerHTML = `<article class="card full"><h3>Pruebas y utilidades</h3>
  <ul>
    <li>☐ Crear/editar/borrar registro Scope 1 (refrigerante y combustible podadora 2T).</li>
    <li>☐ Vincular evidencias a Scope 1/2/3.</li>
    <li>☐ Verificar totales y cobertura en dashboard.</li>
    <li>☐ Generar informe con y sin anexos de trazabilidad.</li>
    <li>☐ Exportar e importar JSON correctamente.</li>
  </ul>
  <div class="btn-row"><button id="export-json">Exportar JSON</button><input id="import-json-file" type="file" accept="application/json"/><button id="import-json">Importar JSON</button></div>
  </article>`;

  document.getElementById("export-json").onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${BRAND.toLowerCase()}-backup.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  document.getElementById("import-json").onclick = async () => {
    const file = document.getElementById("import-json-file").files[0];
    if (!file) return showToast("Seleccioná un archivo JSON", "error");
    const text = await file.text();
    state = JSON.parse(text);
    pushLog("Importación JSON");
    renderAll();
  };
}
