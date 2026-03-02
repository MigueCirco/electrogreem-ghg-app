const STORAGE_KEY = "electrogreem-ghg-v1";

const state = loadState();
const tabs = [
  ["dashboard", "Dashboard"],
  ["scope2", "Electricidad Scope 2"],
  ["scope3", "Transporte Scope 3"],
  ["factores", "Factores"],
  ["evidencias", "Evidencias"],
  ["calidad", "Control de calidad"],
  ["reportes", "Reportes"],
  ["config", "Config"]
];

const tabContainer = document.getElementById("tabs");
const panels = [...document.querySelectorAll(".tab-panel")];

renderTabs();
renderAll();
activateTab("dashboard");
startRealtimeSimulation();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return {
    scope2: [
      { mes: "2025-10", kwh: 335 },
      { mes: "2025-11", kwh: 355 },
      { mes: "2025-12", kwh: 392 }
    ],
    scope3: [
      { id: "TR-001", ruta: "Planta A → Cliente Norte", km: 128, combustible: "Diésel" },
      { id: "TR-002", ruta: "Puerto → Planta A", km: 84, combustible: "Gasolina" }
    ],
    factores: [
      { nombre: "Red eléctrica MX", valor: 0.455, unidad: "kgCO₂e/kWh" },
      { nombre: "Diésel", valor: 2.68, unidad: "kgCO₂e/L" }
    ],
    evidencias: [
      { id: "EVD-100", tipo: "Factura CFE", ref: "Oct-Dic 2025", estado: "Cargada" }
    ],
    calidad: { cobertura: 92, trazabilidad: 88, alerta: "Completar evidencia de TR-002" },
    config: { empresa: "ElectroGreem", zona: "UTC-6", moneda: "MXN" }
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderTabs() {
  tabs.forEach(([key, label]) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.onclick = () => activateTab(key);
    btn.dataset.tab = key;
    tabContainer.appendChild(btn);
  });
}

function activateTab(key) {
  document.querySelectorAll(".tabs button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === key);
  });
  panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.tab === key));
}

function card(title, html) {
  const template = document.getElementById("card-template").content.cloneNode(true);
  template.querySelector("h3").textContent = title;
  template.querySelector(".content").innerHTML = html;
  return template;
}

function renderAll() {
  renderDashboard();
  renderScope2();
  renderScope3();
  renderFactores();
  renderEvidencias();
  renderCalidad();
  renderReportes();
  renderConfig();
  saveState();
}

function renderDashboard() {
  const el = panel("dashboard");
  const totalKwh = state.scope2.reduce((acc, r) => acc + r.kwh, 0);
  const viajes = state.scope3.length;
  const issues = state.calidad.alerta ? 1 : 0;

  el.innerHTML = "";
  el.append(
    card("KPIs del periodo", `<div class="metric">${totalKwh} kWh</div><p>Consumo eléctrico Oct–Dic 2025</p>`),
    card("Transporte registrado", `<div class="metric">${viajes} viajes</div><p>Registros Scope 3 en sistema</p>`),
    card("Estado de calidad", `<div class="metric ${issues ? "warn" : "ok"}">${issues ? "Con alertas" : "Óptimo"}</div><p>${state.calidad.alerta}</p>`)
  );
}

function renderScope2() {
  const el = panel("scope2");
  const rows = state.scope2.map((r) => `<tr><td>${r.mes}</td><td>${r.kwh}</td></tr>`).join("");
  el.innerHTML = "";
  el.append(
    card(
      "Consumo mensual (demo)",
      `<table><thead><tr><th>Mes</th><th>kWh</th></tr></thead><tbody>${rows}</tbody></table>`
    ),
    card(
      "Tiempo real simulado",
      `<p>Potencia actual: <span class="metric" id="rt-power">0.00</span> kW</p>
       <p>Energía estimada hoy: <span id="rt-energy">0.00</span> kWh</p>
       <button id="sync-esp32">Sincronizar con ESP32 (placeholder)</button>`
    )
  );
  document.getElementById("sync-esp32").onclick = () => {
    alert("Placeholder: aquí se integrará el endpoint ESP32/IoT.");
  };
}

function startRealtimeSimulation() {
  let energy = 0;
  setInterval(() => {
    const power = (Math.random() * 8 + 12).toFixed(2);
    energy += Number(power) / 60;
    const p = document.getElementById("rt-power");
    const e = document.getElementById("rt-energy");
    if (p) p.textContent = power;
    if (e) e.textContent = energy.toFixed(2);
  }, 1000);
}

function renderScope3() {
  const el = panel("scope3");
  const rows = state.scope3
    .map((r) => `<tr><td>${r.id}</td><td>${r.ruta}</td><td>${r.km} km</td><td>${r.combustible}</td></tr>`)
    .join("");
  el.innerHTML = "";
  el.append(card("Viajes de transporte", `<table><thead><tr><th>ID</th><th>Ruta</th><th>Distancia</th><th>Combustible</th></tr></thead><tbody>${rows}</tbody></table>`));
}

function renderFactores() {
  const el = panel("factores");
  const rows = state.factores
    .map((f) => `<tr><td>${f.nombre}</td><td>${f.valor}</td><td>${f.unidad}</td></tr>`)
    .join("");
  el.innerHTML = "";
  el.append(card("Factores de emisión", `<table><thead><tr><th>Factor</th><th>Valor</th><th>Unidad</th></tr></thead><tbody>${rows}</tbody></table>`));
}

function renderEvidencias() {
  const el = panel("evidencias");
  const rows = state.evidencias
    .map((ev) => `<tr><td>${ev.id}</td><td>${ev.tipo}</td><td>${ev.ref}</td><td>${ev.estado}</td></tr>`)
    .join("");
  el.innerHTML = "";
  el.append(card("Metadatos de evidencias", `<table><thead><tr><th>ID</th><th>Tipo</th><th>Referencia</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>`));
}

function renderCalidad() {
  const el = panel("calidad");
  el.innerHTML = "";
  el.append(
    card(
      "Checklist QA",
      `<ul>
        <li>Cobertura de datos: <strong>${state.calidad.cobertura}%</strong></li>
        <li>Trazabilidad: <strong>${state.calidad.trazabilidad}%</strong></li>
        <li>Alerta: <strong>${state.calidad.alerta}</strong></li>
      </ul>`
    )
  );
}

function renderReportes() {
  const el = panel("reportes");
  const totalKwh = state.scope2.reduce((acc, r) => acc + r.kwh, 0);
  el.innerHTML = "";
  el.append(
    card(
      "Resumen exportable",
      `<p>Periodo: Q4 2025</p>
       <p>Scope 2 electricidad: <strong>${totalKwh} kWh</strong></p>
       <p>Scope 3 transporte: <strong>${state.scope3.length} registros</strong></p>
       <button onclick="alert('Placeholder de exportación CSV/PDF')">Generar reporte (placeholder)</button>`
    )
  );
}

function renderConfig() {
  const el = panel("config");
  const c = state.config;
  el.innerHTML = "";
  el.append(
    card(
      "Configuración",
      `<p>Empresa: ${c.empresa}</p>
       <p>Zona horaria: ${c.zona}</p>
       <p>Moneda: ${c.moneda}</p>
       <button onclick="localStorage.removeItem('${STORAGE_KEY}'); location.reload();">Restablecer demo</button>`
    )
  );
}

function panel(name) {
  return document.querySelector(`.tab-panel[data-tab="${name}"]`);
}
