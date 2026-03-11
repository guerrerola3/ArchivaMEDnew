# TraumaLog - TODO

## Configuración y Base
- [x] Configurar tema de colores médico (azul marino)
- [x] Actualizar nombre y logo de la app
- [x] Generar logo de la app
- [x] Configurar base de datos (schema de procedimientos)
- [x] Instalar dependencias necesarias (expo-camera, expo-image-picker, xlsx, etc.)

## Backend / Base de Datos
- [x] Crear schema de procedimientos en drizzle
- [x] Crear queries de base de datos (CRUD procedimientos)
- [x] Crear rutas tRPC para procedimientos
- [x] Integrar LLM para OCR y extracción de datos
- [x] Crear endpoint de subida de imágenes a S3

## Navegación y Estructura
- [x] Configurar tabs: Home, Procedimientos, Exportar
- [x] Configurar iconos en icon-symbol.tsx
- [x] Crear pantalla de detalle de procedimiento
- [x] Crear pantalla de formulario de edición
- [x] Crear pantalla de captura OCR/cámara

## Pantalla Home / Dashboard
- [x] Resumen estadístico del mes
- [x] Lista de últimos procedimientos
- [x] Botón flotante para nueva entrada
- [x] Acceso rápido a exportación

## Pantalla Listado de Procedimientos
- [x] Lista agrupada por mes
- [x] Selector de período
- [x] Tarjetas de procedimiento
- [x] Búsqueda y filtros
- [x] Eliminar por pulsación larga (long press)

## Captura OCR
- [x] Pantalla de cámara con expo-camera
- [x] Opción de seleccionar desde galería
- [x] Subida de imagen al servidor
- [x] Llamada al LLM para extracción de datos
- [x] Preview de datos extraídos
- [x] Formulario pre-llenado editable

## Formulario de Procedimiento
- [x] Todos los campos requeridos
- [x] Selector de fecha
- [x] Selector de tipo (Cirugía/Procedimiento/Interconsulta)
- [x] Selector de horario (Hábil/Inhábil)
- [x] Guardado en base de datos + local

## Exportación
- [x] Exportar a Excel (.xlsx)
- [x] Exportar a PDF
- [x] Selector de período para exportación
- [x] Compartir vía sistema (share sheet)
- [x] Imprimir directamente

## Sincronización
- [x] Almacenamiento local con AsyncStorage como fallback
- [x] Sincronización con base de datos en nube
- [x] Manejo de estado offline

## Bugs
- [x] OCR no funciona: el reconocimiento de texto desde fotos no extrae datos correctamente
- [x] Error "No se pudo leer la imagen" al intentar OCR - FileSystem.readAsStringAsync falla con URIs de cámara/galería
- [x] Botones de exportación PDF y Excel no hacen nada al presionarlos
- [x] OCR: reconocer "número de episodio" y "admisión" como equivalentes al campo de prestación
- [x] OCR: corregir inversión de nombres y apellidos en la detección automática

## Mejoras de UX
- [x] Redirigir a pantalla principal después de guardar procedimiento
- [x] Remover asteriscos rojos de campos obligatorios en formulario
- [x] Agregar buscador en pantalla de procedimientos
- [x] Agregar período personalizable en exportación con filtro de tipos

## Optimizaciones
- [x] Mejorar velocidad del OCR: comprimir imagen, indicador de progreso
- [x] OCR: detectar descripción del procedimiento quirúrgico en el campo de notas

## Branding
- [x] Actualizar logo a ArchivaMED (neon medical icon)
- [x] Cambiar nombre de app a "ArchivaMED"
