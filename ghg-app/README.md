# GHG App (MVP estático)

Aplicación web estática (sin frameworks ni dependencias externas) para un MVP de inventario GHG de ElectroGreem.

## Qué incluye

- Interfaz en español con tema oscuro + verde ElectroGreem.
- Navegación por pestañas:
  - Dashboard
  - Electricidad Scope 2
  - Transporte Scope 3
  - Factores
  - Evidencias (metadatos)
  - Control de calidad
  - Reportes
  - Config
- Persistencia local con `localStorage`.
- Precarga de datos demo:
  - Scope 2 Oct–Dic 2025: `335`, `355`, `392` kWh.
  - Scope 3: registros `TR-001` y `TR-002`.
- Simulación de tiempo real para Scope 2 (potencia y energía estimada) y botón placeholder para sincronización ESP32.

## Ejecución

No requiere build.

1. Abre `index.html` directamente en el navegador, **o**
2. Levanta un servidor local:

```bash
cd ghg-app
python3 -m http.server 8000
```

Luego visita: `http://localhost:8000`

## Estructura

- `index.html`: layout principal + pestañas.
- `styles.css`: tema visual.
- `app.js`: estado, render, simulación, persistencia.

## Próximos pasos sugeridos

1. Conectar botón ESP32 a endpoint real (MQTT/HTTP) para telemetría de kWh.
2. Agregar carga/edición de registros Scope 3 y evidencias desde UI.
3. Implementar cálculo de emisiones (kgCO₂e) por factores versionados.
4. Añadir exportación real de reportes (CSV/PDF) y firma de QA.
5. Preparar backend/API para sincronización multiusuario y auditoría.
