# ElectroGreem GHG App · MVP 1.0

Aplicación web estática (vanilla JS/HTML/CSS) para inventario GEI Scope 1/2/3 con trazabilidad por evidencias, backup/restore en ZIP y reporte PDF de auditoría.

## Funciones principales

- **Inicio/Instructivo** con alcance, limitaciones y validez.
- **Scope 1** operativo (refrigerante + combustible propio) con CRUD y fórmulas:
  - Refrigerante: `tCO2e = (kg * GWP)/1000`.
  - Combustible: `tCO2e = (L * kgCO2e/L)/1000`.
- **Scope 2** operativo (electricidad) con CRUD.
- **Scope 3** operativo (transporte) con CRUD.
- **Evidencias reales** (PDF/JPG/PNG): metadatos + hash SHA-256 + almacenamiento en IndexedDB (fallback) o carpeta local (File System API).
- **Vinculación** de evidencias desde formularios Scope 1/2/3 (existentes + nuevas).
- **Reportes**: resumen mensual por scope, CSV por scope, PDF de auditoría y fallback de impresión.
- **Configuración**: backup ZIP, restore ZIP, selección de tema, modo evidencias y self-check.
- **Cobertura de trazabilidad**: indicador % de registros con al menos una evidencia.

## Ejecución local

```bash
cd ghg-app
python3 -m http.server 8000
```

Abrir: `http://localhost:8000`

## Checklist de verificación (manual)

1. Crear un registro en **Scope 1** (refrigerante) y verificar cálculo tCO2e.
2. Crear un registro en **Scope 1** (combustible) y verificar cálculo tCO2e.
3. En Scope 2/3, cargar registros nuevos y validar campos obligatorios.
4. Adjuntar evidencia (PDF/JPG/PNG) desde Scope y verificar hash en pestaña Evidencias.
5. Verificar que sube la **cobertura de trazabilidad**.
6. Exportar CSV por cada scope desde Reportes.
7. Generar **PDF de auditoría** y comprobar portada, supuestos y resultados.
8. Ejecutar **Backup (ZIP)**.
9. Limpiar/alterar datos, luego usar **Restore (ZIP)** y verificar recuperación.
10. Ejecutar **Self-check** desde Configuración y confirmar resultado OK.

## Estructura

- `index.html`: pestañas, layout y librerías JSZip/jsPDF.
- `styles.css`: estilo sobrio tierra/crema/verde + toasts.
- `app.js`: estado, cálculos, CRUD, evidencias, hash, backup/restore, reportes y self-check.
