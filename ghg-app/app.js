const STORAGE_KEY = "electrogreem-ghg-v2";
const THEME_KEY = "electrogreem-theme";

const tabs = [
  ["dashboard", "Dashboard"],
  ["scope2", "Electricidad Scope 2"],
  ["scope3", "Transporte Scope 3"],
  ["factores", "Factores"],
  ["evidencias", "Evidencias"],
  ["reportes", "Reportes"],
  ["config", "Configuración"]
];

let state = loadState();

const tabContainer = document.getElementById("tabs");
const panels = [...document.querySelectorAll(".tab-panel")];

applyTheme(loadThemePreference());
renderTabs();
renderAll();
activateTab("dashboard");


function loadThemePreference() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  return savedTheme === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  const normalized = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = normalized;
  localStorage.setItem(THEME_KEY, normalized);
}

function initialState() {
  return {
    nextIds: { scope2: 4, scope3: 3, evidencia: 2 },
    factores: [
      { id: "FE-S2-AR", nombre: "Electricidad red AR", alcance: "scope2", metodo: "mwh", valor: 0.32, unidad: "tCO2e/MWh" },
      { id: "FE-DIESEL", nombre: "Diésel", alcance: "scope3", metodo: "combustible", valor: 2.68, unidad: "kgCO2e/L" },
      { id: "FE-TKM", nombre: "Transporte terrestre", alcance: "scope3", metodo: "tkm", valor: 0.12, unidad: "kgCO2e/tkm" }
    ],
    scope2: [
      {
        id_registro: "S2-001",
        mes: "2025-10",
        inicio_factura: "2025-10-01",
        fin_factura: "2025-10-31",
        kwh: 335,
        medidor: "MED-01",
        proveedor: "Edenor",
        observaciones: "Factura mensual",
        tipo_dato: "medido",
        supuestos: "",
        factor_id: "FE-S2-AR"
      },
      {
        id_registro: "S2-002",
        mes: "2025-11",
        inicio_factura: "2025-11-01",
        fin_factura: "2025-11-30",
        kwh: 355,
        medidor: "MED-01",
        proveedor: "Edenor",
        observaciones: "Factura mensual",
        tipo_dato: "medido",
        supuestos: "",
        factor_id: "FE-S2-AR"
      },
      {
        id_registro: "S2-003",
        mes: "2025-12",
        inicio_factura: "2025-12-01",
        fin_factura: "2025-12-31",
        kwh: 392,
        medidor: "MED-01",
        proveedor: "Edenor",
        observaciones: "Lectura final de año",
        tipo_dato: "estimado",
        supuestos: "Estimación por consumo histórico + temperatura.",
        factor_id: "FE-S2-AR"
      }
    ],
    scope3: [
      {
        id_servicio: "TR-001",
        fecha: "2025-10-14",
        mes: "2025-10",
        cliente: "Cliente Norte",
        tipo: "entrega",
        operador: "Operador Sur",
        km_ida_vacio: 45,
        km_vuelta_carga: 83,
        km_total: 128,
        carga_kg: 10000,
        metodo: "combustible",
        rendimiento_km_l: 2.8,
        litros: 45.71,
        factor_id: "FE-DIESEL",
        supuestos: "",
        observaciones: "Unidad semirremolque"
      },
      {
        id_servicio: "TR-002",
        fecha: "2025-11-05",
        mes: "2025-11",
        cliente: "Planta Oeste",
        tipo: "retiro",
        operador: "Operador Sur",
        km_ida_vacio: 30,
        km_vuelta_carga: 54,
        km_total: 84,
        carga_kg: 7000,
        metodo: "tkm",
        rendimiento_km_l: "",
        litros: "",
        factor_id: "FE-TKM",
        supuestos: "Factor promedio para camión pesado.",
        observaciones: "Remito incompleto"
      }
    ],
    evidencias: [
      {
        id_evidencia: "EVD-001",
        tipo: "factura",
        fecha: "2025-11-01",
        nombre_archivo: "factura_edenor_octubre.pdf",
        url: "",
        relacionado_a: "S2-001,S2-002",
        notas: "Factura consolidada"
      }
    ]
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialState();
    return JSON.parse(saved);
  } catch {
    return initialState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

function renderAll() {
  renderDashboard();
  renderScope2();
  renderScope3();
  renderFactores();
  renderEvidencias();
  renderReportes();
  renderConfig();
  saveState();
}

function factorById(id) {
  return state.factores.find((f) => f.id === id);
}

function parseIds(listado) {
  return (listado || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasEvidence(recordId) {
  return state.evidencias.some((ev) => parseIds(ev.relacionado_a).includes(recordId));
}

function calcScope2Emission(record) {
  const factor = factorById(record.factor_id);
  const valor = Number(factor?.valor || 0);
  return (Number(record.kwh || 0) / 1000) * valor;
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

  return { kmTotal, litros: litros ? litros.toFixed(2) : "", tkm: tkm ? tkm.toFixed(2) : "", emisiones };
}

function renderDashboard() {
  const el = panel("dashboard");
  const totalS2 = state.scope2.reduce((acc, r) => acc + calcScope2Emission(r), 0);
  const totalS3 = state.scope3.reduce((acc, r) => acc + calcScope3(r).emisiones, 0);
  const total = totalS2 + totalS3;
  const evidOK = [...state.scope2.map((r) => r.id_registro), ...state.scope3.map((r) => r.id_servicio)].filter(hasEvidence).length;
  const totalReg = state.scope2.length + state.scope3.length;

  el.innerHTML = `
    <article class="card"><h3>Emisiones totales</h3><div class="metric">${total.toFixed(3)} tCO2e</div><p>Scope 2 + Scope 3 (registros reales)</p></article>
    <article class="card"><h3>Electricidad</h3><div class="metric">${state.scope2.length}</div><p>Registros | ${totalS2.toFixed(3)} tCO2e</p></article>
    <article class="card"><h3>Transporte</h3><div class="metric">${state.scope3.length}</div><p>Servicios | ${totalS3.toFixed(3)} tCO2e</p></article>
    <article class="card"><h3>Evidencias vinculadas</h3><div class="metric">${evidOK}/${totalReg}</div><p>Cobertura de trazabilidad</p></article>
  `;
}

function factorOptions(filter, selected) {
  return state.factores
    .filter(filter)
    .map((f) => `<option value="${f.id}" ${f.id === selected ? "selected" : ""}>${f.nombre} (${f.unidad})</option>`)
    .join("");
}

function renderScope2(editId = "") {
  const el = panel("scope2");
  const editing = state.scope2.find((r) => r.id_registro === editId);

  const rows = state.scope2
    .map((r) => {
      const em = calcScope2Emission(r);
      return `<tr>
        <td>${r.id_registro}</td><td>${r.mes}</td><td>${r.kwh}</td><td>${em.toFixed(3)}</td>
        <td>${hasEvidence(r.id_registro) ? "OK" : "Falta"}</td>
        <td class="actions"><button data-edit-s2="${r.id_registro}">Editar</button><button data-del-s2="${r.id_registro}" class="danger">Eliminar</button></td>
      </tr>`;
    })
    .join("");

  el.innerHTML = `
    <article class="card full"><h3>Scope 2 · Electricidad</h3>
      <button id="new-s2" class="secondary">+ Nuevo registro de electricidad</button>
      <form id="form-s2" class="grid-form">
        <input type="hidden" name="id_registro" value="${editing?.id_registro || ""}" />
        <label>Mes <input type="month" name="mes" value="${editing?.mes || ""}" required /></label>
        <label>Inicio factura <input type="date" name="inicio_factura" value="${editing?.inicio_factura || ""}" required /></label>
        <label>Fin factura <input type="date" name="fin_factura" value="${editing?.fin_factura || ""}" required /></label>
        <label>kWh <input type="number" step="0.01" name="kwh" value="${editing?.kwh || ""}" required /></label>
        <label>Medidor <input name="medidor" value="${editing?.medidor || ""}" required /></label>
        <label>Proveedor <input name="proveedor" value="${editing?.proveedor || ""}" required /></label>
        <label>Tipo de dato
          <select name="tipo_dato" required>
            <option value="medido" ${editing?.tipo_dato === "medido" ? "selected" : ""}>Medido</option>
            <option value="estimado" ${editing?.tipo_dato === "estimado" ? "selected" : ""}>Estimado</option>
          </select>
        </label>
        <label>Factor de emisión <select name="factor_id" required>${factorOptions((f) => f.alcance === "scope2", editing?.factor_id)}</select></label>
        <label class="span-2">Supuestos (obligatorio si estimado) <textarea name="supuestos">${editing?.supuestos || ""}</textarea></label>
        <label class="span-2">Observaciones <textarea name="observaciones">${editing?.observaciones || ""}</textarea></label>
        <button type="submit">Guardar</button>
      </form>
    </article>
    <article class="card full"><h3>Registros guardados</h3>
      <table><thead><tr><th>ID</th><th>Mes</th><th>kWh</th><th>tCO2e</th><th>Evidencia</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table>
    </article>`;

  document.getElementById("new-s2").onclick = () => renderScope2();
  el.querySelectorAll("[data-edit-s2]").forEach((b) => (b.onclick = () => renderScope2(b.dataset.editS2)));
  el.querySelectorAll("[data-del-s2]").forEach((b) =>
    (b.onclick = () => {
      state.scope2 = state.scope2.filter((r) => r.id_registro !== b.dataset.delS2);
      renderAll();
    })
  );

  document.getElementById("form-s2").onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (data.tipo_dato === "estimado" && !data.supuestos.trim()) return alert("Debe informar supuestos para datos estimados.");

    const payload = {
      ...data,
      kwh: Number(data.kwh)
    };

    if (!payload.id_registro) payload.id_registro = `S2-${String(state.nextIds.scope2++).padStart(3, "0")}`;
    const index = state.scope2.findIndex((r) => r.id_registro === payload.id_registro);
    if (index >= 0) state.scope2[index] = payload;
    else state.scope2.push(payload);

    renderAll();
    renderScope2();
  };
}

function renderScope3(editId = "") {
  const el = panel("scope3");
  const editing = state.scope3.find((r) => r.id_servicio === editId);

  const rows = state.scope3
    .map((r) => {
      const c = calcScope3(r);
      return `<tr>
        <td>${r.id_servicio}</td><td>${r.fecha}</td><td>${r.cliente}</td><td>${c.kmTotal}</td><td>${c.emisiones.toFixed(3)}</td>
        <td>${hasEvidence(r.id_servicio) ? "OK" : "Falta"}</td>
        <td class="actions"><button data-edit-s3="${r.id_servicio}">Editar</button><button data-del-s3="${r.id_servicio}" class="danger">Eliminar</button></td>
      </tr>`;
    })
    .join("");

  el.innerHTML = `
    <article class="card full"><h3>Scope 3 · Transporte</h3>
      <button id="new-s3" class="secondary">+ Nuevo servicio de transporte</button>
      <form id="form-s3" class="grid-form">
        <input type="hidden" name="id_servicio" value="${editing?.id_servicio || ""}" />
        <label>Fecha <input type="date" name="fecha" value="${editing?.fecha || ""}" required /></label>
        <label>Mes <input type="month" name="mes" value="${editing?.mes || ""}" required /></label>
        <label>Cliente <input name="cliente" value="${editing?.cliente || ""}" required /></label>
        <label>Tipo <select name="tipo"><option value="retiro" ${editing?.tipo === "retiro" ? "selected" : ""}>Retiro</option><option value="entrega" ${editing?.tipo === "entrega" ? "selected" : ""}>Entrega</option></select></label>
        <label>Operador <input name="operador" value="${editing?.operador || ""}" required /></label>
        <label>Km ida vacío <input type="number" step="0.01" name="km_ida_vacio" value="${editing?.km_ida_vacio || ""}" required /></label>
        <label>Km vuelta carga <input type="number" step="0.01" name="km_vuelta_carga" value="${editing?.km_vuelta_carga || ""}" required /></label>
        <label>Carga (kg) <input type="number" step="0.01" name="carga_kg" value="${editing?.carga_kg || ""}" required /></label>
        <label>Método <select name="metodo"><option value="combustible" ${editing?.metodo === "combustible" ? "selected" : ""}>Combustible</option><option value="tkm" ${editing?.metodo === "tkm" ? "selected" : ""}>tkm</option></select></label>
        <label>Rendimiento (km/L) <input type="number" step="0.01" name="rendimiento_km_l" value="${editing?.rendimiento_km_l || ""}" /></label>
        <label>Litros <input type="number" step="0.01" name="litros" value="${editing?.litros || ""}" /></label>
        <label>Factor de emisión <select name="factor_id" required>${factorOptions((f) => f.alcance === "scope3", editing?.factor_id)}</select></label>
        <label class="span-2">Supuestos <textarea name="supuestos">${editing?.supuestos || ""}</textarea></label>
        <label class="span-2">Observaciones <textarea name="observaciones">${editing?.observaciones || ""}</textarea></label>
        <button type="submit">Guardar</button>
      </form>
    </article>
    <article class="card full"><h3>Servicios guardados</h3>
      <table><thead><tr><th>ID</th><th>Fecha</th><th>Cliente</th><th>Km total</th><th>tCO2e</th><th>Evidencia</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table>
    </article>`;

  document.getElementById("new-s3").onclick = () => renderScope3();
  el.querySelectorAll("[data-edit-s3]").forEach((b) => (b.onclick = () => renderScope3(b.dataset.editS3)));
  el.querySelectorAll("[data-del-s3]").forEach((b) =>
    (b.onclick = () => {
      state.scope3 = state.scope3.filter((r) => r.id_servicio !== b.dataset.delS3);
      renderAll();
    })
  );

  document.getElementById("form-s3").onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const kmTotal = Number(data.km_ida_vacio) + Number(data.km_vuelta_carga);

    if (data.metodo === "combustible" && !Number(data.litros || 0) && !Number(data.rendimiento_km_l || 0)) {
      return alert("Si el método es combustible debe informar litros o rendimiento km/L.");
    }

    const calc = calcScope3({ ...data, km_total: kmTotal });
    const payload = {
      ...data,
      km_ida_vacio: Number(data.km_ida_vacio),
      km_vuelta_carga: Number(data.km_vuelta_carga),
      carga_kg: Number(data.carga_kg),
      rendimiento_km_l: data.rendimiento_km_l ? Number(data.rendimiento_km_l) : "",
      litros: calc.litros || data.litros,
      km_total: kmTotal
    };

    if (!payload.id_servicio) payload.id_servicio = `TR-${String(state.nextIds.scope3++).padStart(3, "0")}`;
    const index = state.scope3.findIndex((r) => r.id_servicio === payload.id_servicio);
    if (index >= 0) state.scope3[index] = payload;
    else state.scope3.push(payload);

    renderAll();
    renderScope3();
  };
}

function renderFactores() {
  const el = panel("factores");
  const rows = state.factores
    .map((f) => `<tr><td>${f.id}</td><td>${f.nombre}</td><td>${f.valor}</td><td>${f.unidad}</td><td>${f.alcance}</td><td>${f.metodo}</td></tr>`)
    .join("");
  el.innerHTML = `<article class="card full"><h3>Factores de emisión activos</h3><table><thead><tr><th>ID</th><th>Nombre</th><th>Valor</th><th>Unidad</th><th>Alcance</th><th>Método</th></tr></thead><tbody>${rows}</tbody></table></article>`;
}

function renderEvidencias(editId = "") {
  const el = panel("evidencias");
  const editing = state.evidencias.find((e) => e.id_evidencia === editId);

  const rows = state.evidencias
    .map(
      (ev) => `<tr><td>${ev.id_evidencia}</td><td>${ev.tipo}</td><td>${ev.fecha}</td><td>${ev.nombre_archivo}</td><td>${ev.relacionado_a}</td>
      <td class="actions"><button data-edit-ev="${ev.id_evidencia}">Editar</button><button data-del-ev="${ev.id_evidencia}" class="danger">Eliminar</button></td></tr>`
    )
    .join("");

  el.innerHTML = `
    <article class="card full"><h3>Evidencias</h3>
      <button id="new-ev" class="secondary">+ Nueva evidencia</button>
      <form id="form-ev" class="grid-form">
        <input type="hidden" name="id_evidencia" value="${editing?.id_evidencia || ""}" />
        <label>Tipo <select name="tipo"><option value="factura">Factura</option><option value="remito">Remito</option><option value="orden">Orden</option><option value="foto">Foto</option><option value="otro">Otro</option></select></label>
        <label>Fecha <input type="date" name="fecha" value="${editing?.fecha || ""}" required /></label>
        <label>Nombre archivo <input name="nombre_archivo" value="${editing?.nombre_archivo || ""}" required /></label>
        <label>URL (opcional) <input name="url" value="${editing?.url || ""}" /></label>
        <label class="span-2">Relacionado a (IDs separados por coma) <input name="relacionado_a" value="${editing?.relacionado_a || ""}" required /></label>
        <label class="span-2">Notas <textarea name="notas">${editing?.notas || ""}</textarea></label>
        <button type="submit">Guardar</button>
      </form>
    </article>
    <article class="card full"><h3>Listado de evidencias</h3>
      <table><thead><tr><th>ID</th><th>Tipo</th><th>Fecha</th><th>Archivo</th><th>Relacionado a</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table>
    </article>`;

  document.getElementById("new-ev").onclick = () => renderEvidencias();
  el.querySelectorAll("[data-edit-ev]").forEach((b) => (b.onclick = () => renderEvidencias(b.dataset.editEv)));
  el.querySelectorAll("[data-del-ev]").forEach((b) =>
    (b.onclick = () => {
      state.evidencias = state.evidencias.filter((ev) => ev.id_evidencia !== b.dataset.delEv);
      renderAll();
      renderScope2();
      renderScope3();
    })
  );

  document.getElementById("form-ev").onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (!data.id_evidencia) data.id_evidencia = `EVD-${String(state.nextIds.evidencia++).padStart(3, "0")}`;

    const index = state.evidencias.findIndex((ev) => ev.id_evidencia === data.id_evidencia);
    if (index >= 0) state.evidencias[index] = data;
    else state.evidencias.push(data);

    renderAll();
    renderScope2();
    renderScope3();
    renderEvidencias();
  };
}

function downloadFile(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
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
  el.innerHTML = `
    <article class="card full">
      <h3>Exportación e importación</h3>
      <div class="btn-row">
        <button id="csv-actividad">Export CSV actividad</button>
        <button id="csv-evidencias">Export CSV evidencias</button>
        <button id="json-export">Export JSON (backup completo)</button>
      </div>
      <div class="btn-row">
        <input id="json-import-file" type="file" accept="application/json" />
        <button id="json-import">Import JSON (restaurar)</button>
      </div>
      <div class="btn-row">
        <button id="clear-all" class="danger">Borrar todo</button>
        <button id="reset-demo" class="secondary">Restablecer demo</button>
      </div>
    </article>`;

  document.getElementById("csv-actividad").onclick = () => {
    const rows = [["tipo", "id", "fecha/mes", "detalle", "tco2e"]];
    state.scope2.forEach((r) => rows.push(["scope2", r.id_registro, r.mes, `${r.kwh} kWh`, calcScope2Emission(r).toFixed(6)]));
    state.scope3.forEach((r) => rows.push(["scope3", r.id_servicio, r.fecha, `${r.km_total || 0} km`, calcScope3(r).emisiones.toFixed(6)]));
    downloadFile("actividad_ghg.csv", toCsv(rows), "text/csv;charset=utf-8");
  };

  document.getElementById("csv-evidencias").onclick = () => {
    const rows = [["id_evidencia", "tipo", "fecha", "nombre_archivo", "url", "relacionado_a", "notas"]];
    state.evidencias.forEach((e) => rows.push([e.id_evidencia, e.tipo, e.fecha, e.nombre_archivo, e.url, e.relacionado_a, e.notas]));
    downloadFile("evidencias_ghg.csv", toCsv(rows), "text/csv;charset=utf-8");
  };

  document.getElementById("json-export").onclick = () => {
    downloadFile("backup_ghg.json", JSON.stringify(state, null, 2), "application/json");
  };

  document.getElementById("json-import").onclick = async () => {
    const file = document.getElementById("json-import-file").files[0];
    if (!file) return alert("Seleccione un archivo JSON.");
    try {
      const content = await file.text();
      const imported = JSON.parse(content);
      state = imported;
      renderAll();
      alert("Backup restaurado correctamente.");
    } catch {
      alert("No se pudo importar el archivo.");
    }
  };

  document.getElementById("clear-all").onclick = () => {
    if (!confirm("¿Seguro que desea borrar todos los registros?")) return;
    state = { ...initialState(), scope2: [], scope3: [], evidencias: [] };
    renderAll();
  };

  document.getElementById("reset-demo").onclick = () => {
    state = initialState();
    renderAll();
  };
}


function renderConfig() {
  const el = panel("config");
  const selectedTheme = loadThemePreference();

  el.innerHTML = `
    <article class="card full">
      <h3>Configuración visual</h3>
      <p>Seleccione un tema de interfaz sobrio para trabajo operativo y auditoría.</p>
      <div class="theme-option">
        <label for="theme-select">Tema</label>
        <select id="theme-select" aria-label="Selector de tema">
          <option value="light" ${selectedTheme === "light" ? "selected" : ""}>Claro (tierra)</option>
          <option value="dark" ${selectedTheme === "dark" ? "selected" : ""}>Oscuro sobrio</option>
        </select>
      </div>
    </article>`;

  document.getElementById("theme-select").onchange = (e) => applyTheme(e.target.value);
}
