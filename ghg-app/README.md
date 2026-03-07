# ElectroGreem GHG App · Inventario GEI (Scope 1/2/3)

Aplicación web **estática** (HTML/CSS/JS, sin backend) para inventario operativo GEI, con datos persistidos en `localStorage`, evidencias auditables y reporte PDF profesional.

## Marca y créditos

- Marca: **ElectroGreem**.
- Autor: **Héctor Miguel Fadel**.
- Contexto: **Práctica Profesional Supervisada (PPS) – Ingeniería Electrónica (UTN-FRT)**.
- Tutor/Supervisión: **Prof. Ing. Ramón Oris**.
- Agradecimientos: **Búho Producciones Artísticas**.

## Funcionalidades principales

- Pestaña **Inicio / Instructivo** con supuestos, límites, validez y guía paso a paso.
- **Filtro global por período** (desde/hasta + atajos 30 días, mes, trimestre, año).
- Scope 1 con submódulos:
  - **Refrigerantes**: `tCO2e = (kg × GWP) / 1000`.
  - **Combustible 2T / nafta**: `tCO2e = (L × EF) / 1000`.
- Scope 2 y Scope 3 con tablas operativas.
- Evidencias con hash SHA-256, vinculación a registros e indicadores `✅ / ⚠️`.
- Cobertura de evidencias por scope y global.
- Reportes:
  - Export JSON / Import JSON.
  - Export CSV completo o filtrado por período.
  - PDF profesional con secciones por scope, factores, trazabilidad y changelog.
- Modo auditor (columnas extra: ID/factor/timestamp).
- Dashboard con bloque de pendientes de datos.

## Almacenamiento

- Estado principal: `electrogreem-ghg-v12`.
- Scope 1 refrigerantes: `eg_s1_refrigerants`.
- Scope 1 combustible: `eg_s1_fuels`.
- Filtro global: `eg_period_from` y `eg_period_to`.

## Ejecución local

```bash
cd ghg-app
python3 -m http.server 8000
```

Abrir: `http://localhost:8000`

## Pruebas

1. **Caso 1**: Período sin datos ⇒ PDF debe mostrar “Sin registros para el período seleccionado…”.
2. **Caso 2**: Cargar 1 refrigerante + evidencia ⇒ Scope 1 > 0 y cobertura Scope 1 = 100%.
3. **Caso 3**: Cargar combustible sin evidencia ⇒ cobertura baja y warning.
4. **Caso 4**: Export JSON / Import JSON ⇒ mantiene período, datos, evidencias, changelog.
