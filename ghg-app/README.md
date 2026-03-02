# GHG App operativa (ElectroGreem)

Aplicación web estática (sin frameworks ni dependencias externas) para gestionar inventario GHG con **CRUD completo**, cálculo de emisiones y trazabilidad por evidencias.

## Funcionalidades implementadas

- Interfaz en español (Argentina), tema oscuro ElectroGreem.
- Pestañas operativas:
  - Dashboard
  - Electricidad Scope 2
  - Transporte Scope 3
  - Factores
  - Evidencias
  - Reportes
- **Scope 2 (Electricidad):** alta, edición y eliminación de registros; cálculo de emisiones en tCO2e usando factor en tCO2e/MWh (kWh → MWh).
- **Scope 3 (Transporte):** alta, edición y eliminación de servicios/remitos; cálculo automático de `km_total`; cálculo por método `combustible` o `tkm`.
- **Evidencias:** alta, edición y eliminación de metadatos; vinculación por IDs separados por coma; estado de evidencia `OK/Falta` reflejado en Scope 2/3 en tiempo real.
- **Dashboard:** contadores y totales construidos desde los registros reales.
- **Persistencia total en `localStorage`.**
- **Reportes / respaldo:**
  - Export CSV actividad
  - Export CSV evidencias
  - Export JSON (backup completo)
  - Import JSON (restaurar)
  - Borrar todo
  - Restablecer demo
- Datos demo precargados y completamente editables/eliminables.

## Reglas de cálculo

### Scope 2

- Emisiones: `tCO2e = (kWh / 1000) * factor_tCO2e_MWh`

### Scope 3

- `km_total = km_ida_vacio + km_vuelta_carga`
- Si método `combustible` y litros vacío: `litros = km_total / rendimiento_km_l`
- Si método `tkm`: `tkm = (carga_kg / 1000) * km_vuelta_carga`
- Emisiones:
  - Combustible: `tCO2e = (litros * factor_kgCO2e_L) / 1000`
  - tkm: `tCO2e = (tkm * factor_kgCO2e_tkm) / 1000`

## Ejecución

No requiere build.

1. Abrir `index.html` directamente, **o**
2. Levantar servidor local:

```bash
cd ghg-app
python3 -m http.server 8000
```

Luego visitar: `http://localhost:8000`

## Estructura

- `index.html`: layout y pestañas.
- `styles.css`: estilos de UI.
- `app.js`: estado, CRUD, cálculos, evidencias, export/import y persistencia.
