# TraumaLog — Diseño de Interfaz Móvil

## Concepto y Marca

**Nombre:** TraumaLog  
**Propósito:** Gestión de cirugías, procedimientos e interconsultas para traumatólogos  
**Paleta de colores:**
- Primary: `#1A5276` (azul marino médico profundo)
- Accent: `#2E86C1` (azul cielo médico)
- Success: `#1E8449` (verde quirúrgico)
- Warning: `#D68910` (ámbar)
- Error: `#C0392B` (rojo)
- Background: `#F4F6F7` (gris muy claro)
- Surface: `#FFFFFF` (blanco)
- Foreground: `#1C2833` (negro suave)

---

## Lista de Pantallas

1. **Home / Dashboard** — Resumen mensual, estadísticas rápidas, acceso rápido a nueva entrada
2. **Listado de Procedimientos** — Lista agrupada por mes/período con filtros
3. **Detalle de Procedimiento** — Vista completa de un procedimiento con foto adjunta
4. **Nueva Entrada / Captura OCR** — Cámara + extracción automática de datos
5. **Formulario de Edición** — Edición manual de todos los campos del procedimiento
6. **Exportación** — Opciones de exportar a Excel, PDF, o imprimir
7. **Filtros y Búsqueda** — Filtros por período, clínica, tipo de procedimiento

---

## Contenido y Funcionalidad por Pantalla

### 1. Home / Dashboard
- Resumen del mes actual: total de cirugías, procedimientos, interconsultas
- Gráfico de barras por semana del mes actual
- Lista de los últimos 5 procedimientos
- Botón flotante (+) para nueva entrada
- Acceso rápido a exportación del mes

### 2. Listado de Procedimientos
- Selector de período (mes/año o rango personalizado)
- Agrupación por mes con encabezados colapsables
- Tarjetas de procedimiento con: fecha, nombre paciente, diagnóstico, clínica
- Indicador de tipo (Cirugía / Procedimiento / Interconsulta)
- Indicador de horario (Hábil / Inhábil)
- Búsqueda por nombre, RUT, código
- Swipe para eliminar

### 3. Detalle de Procedimiento
- Todos los campos del procedimiento
- Foto del protocolo operatorio (si existe)
- Botón de editar
- Botón de compartir/exportar individual

### 4. Nueva Entrada / Captura OCR
- Vista de cámara a pantalla completa
- Botón para tomar foto del protocolo
- Opción de seleccionar desde galería
- Indicador de procesamiento OCR
- Preview de los datos extraídos antes de confirmar
- Botón para editar manualmente si OCR no fue preciso

### 5. Formulario de Edición
- Campos: Fecha, Nombre Paciente, Número de Prestación, RUT, Diagnóstico, Procedimiento, Código, Horario, Clínica
- Selector de tipo: Cirugía / Procedimiento / Interconsulta
- Selector de horario: Hábil / Inhábil
- Validación en tiempo real
- Guardado con confirmación

### 6. Exportación
- Selector de período (mes, trimestre, año, rango personalizado)
- Filtros adicionales (clínica, tipo)
- Exportar a Excel (.xlsx)
- Exportar a PDF
- Compartir vía sistema (WhatsApp, Email, etc.)

---

## Flujos de Usuario Principales

### Flujo 1: Nueva entrada con OCR
1. Tap en botón (+) en Home
2. Pantalla de cámara se abre
3. Usuario fotografía el protocolo operatorio
4. Indicador de procesamiento OCR (2-4 segundos)
5. Formulario pre-llenado con datos extraídos
6. Usuario revisa y edita campos incorrectos
7. Tap "Guardar" → regresa al listado

### Flujo 2: Exportar mes a Excel
1. Desde Home o Listado, tap "Exportar"
2. Seleccionar período (mes actual por defecto)
3. Seleccionar formato: Excel
4. Tap "Generar" → archivo generado
5. Hoja de cálculo compartida vía sistema

### Flujo 3: Editar procedimiento existente
1. Tap en tarjeta de procedimiento en el listado
2. Pantalla de detalle
3. Tap "Editar"
4. Formulario editable con datos actuales
5. Modificar campos → Guardar

---

## Campos del Procedimiento

| Campo | Tipo | Requerido |
|-------|------|-----------|
| Fecha | Date picker | Sí |
| Nombre del Paciente | Text | Sí |
| RUT del Paciente | Text (formato XX.XXX.XXX-X) | Sí |
| Número de Prestación / ID | Text | No |
| Diagnóstico | Text (largo) | Sí |
| Procedimiento Realizado | Text (largo) | Sí |
| Código de Procedimiento | Text | No |
| Tipo | Enum: Cirugía / Procedimiento / Interconsulta | Sí |
| Horario | Enum: Hábil / Inhábil | Sí |
| Clínica | Text | Sí |
| Foto del Protocolo | Image URI | No |
| Notas adicionales | Text | No |
