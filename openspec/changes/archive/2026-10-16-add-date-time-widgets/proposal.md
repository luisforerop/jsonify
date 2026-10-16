## Why

Hoy el constructor de esquemas solo ofrece un widget "especial" (`enum`, un desplegable); para capturar una fecha o una hora el usuario debe usar un `string` libre, sin ayuda de entrada ni validación. Además, la lógica que decide qué control renderiza cada tipo está incrustada en `ScalarInput` (`app/components/form-filler/field-editor.tsx`), lo que impide reemplazar los controles por una librería de terceros o por una librería de componentes propia sin tocar la lógica del formulario.

## What Changes

- Añadir dos nuevos tipos de widget seleccionables en el constructor: `date` (fecha) y `time` (hora).
- Persistir ambos como JSON Schema estándar (`type: "string"` + `format: "date"` / `format: "time"`), igual que `enum` se guarda como `string` + `enum`; el tipo `date`/`time` es un pseudo-tipo solo de UI.
- El formulario renderiza `date` con un selector de fecha y `time` con un selector de hora; los valores se guardan como texto ISO 8601 (`YYYY-MM-DD` y `HH:mm`).
- Introducir una **capa de widgets desacoplada**: un nuevo módulo (`app/components/widgets/`) con un contrato de props único (`WidgetProps`) y un registro `tipo → componente`. `field-editor.tsx` deja de contener los controles y solo resuelve el widget desde el registro. Los widgets existentes (texto, número, checkbox, enum, null) se mueven a ese módulo sin cambiar su comportamiento.
- Validar `format: "date"` y `format: "time"` en el servidor (añadir `ajv-formats`), para que la API rechace valores mal formados.
- Reconocer los nuevos tipos al importar un esquema guardado y al importar valores desde JSON (valores que no cumplan el formato se vacían).

## Capabilities

### New Capabilities

- `form-widgets`: contrato y registro de widgets de entrada desacoplados de la lógica del formulario (cómo se resuelve un widget por tipo, qué props recibe, cómo se sustituye uno) más los widgets `date` y `time`.

### Modified Capabilities

- `json-schema-builder`: los tipos de propiedad disponibles incluyen `date` y `time`, que se emiten como `string` con `format`, se restauran al recargar un esquema guardado y también se pueden usar como tipo de elemento de un array.
- `schema-form-filler`: una propiedad `string` con `format` `date` o `time` se renderiza con el widget correspondiente; sus valores se normalizan al importar JSON y se limpian si no cumplen el formato.
- `public-records-api`: la validación de registros rechaza valores que no cumplan `format: "date"` / `format: "time"`.

## Impact

- Código: `lib/schema-builder.ts`, `lib/schema-form.ts` (tipos `BuilderNodeType`/`FormField`, derivación y conformado de valores), `app/components/schema-builder/property-editor.tsx` (el selector de tipo incluye los nuevos), `app/components/form-filler/field-editor.tsx` (usa el registro), nuevo `app/components/widgets/*`, `lib/server/validate-payload.ts`.
- Dependencias: `ajv-formats`.
- Sin migraciones de base de datos ni cambios de API: los esquemas siguen siendo JSON Schema válido y los registros existentes no cambian.
- Vista de registros: las fechas/horas se muestran como texto, sin cambios.
