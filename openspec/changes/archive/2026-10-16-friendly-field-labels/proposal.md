## Why

Hoy quien define un schema debe escribir nombres de propiedad que sirven a la vez como clave JSON almacenada y como etiqueta que ve quien llena el formulario. Cuando el autor construye un form para que otra persona lo diligencie, termina mostrando etiquetas como `fecha_ingreso` en lugar de "Fecha de ingreso", o escribe el texto amigable y obtiene claves con espacios y tildes que son incómodas en bases de datos, consultas y payloads de API.

## What Changes

- En el constructor de schemas, el autor escribe el nombre de cada propiedad como texto natural (p. ej. "Fecha de ingreso", "Teléfono móvil"). Ese texto se conserva como la etiqueta legible de la propiedad.
- El sistema deriva automáticamente la clave almacenada a partir de la etiqueta: sin tildes ni diacríticos, en minúsculas, con cada grupo de caracteres no alfanuméricos colapsado a un único guion bajo y sin guiones bajos en los extremos (snake_case, p. ej. `fecha_de_ingreso`), con prefijo para que nunca empiece por un dígito.
- El constructor muestra la clave derivada junto a cada propiedad para que el autor vea qué se va a guardar.
- El JSON Schema generado guarda la etiqueta con la palabra clave estándar `title` en la propiedad y usa la clave normalizada como llave en `properties` (y en `required`).
- El form filler (incluido el formulario público compartido) muestra cada campo con su `title` cuando existe y, si no, con la clave.
- La validación considera duplicadas dos propiedades del mismo nivel cuando sus claves derivadas colisionan (p. ej. "Año" y "Ano") y rechaza etiquetas cuya clave normalizada queda vacía.
- Las claves de propiedades que ya existen en un schema guardado permanecen estables cuando el autor edita la etiqueta después, para no dejar huérfanos los registros existentes. Las propiedades sin `title` (todos los schemas actuales y los importados desde JSON) conservan su clave sin cambios y la usan como etiqueta.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `json-schema-builder`: los nombres de propiedad pasan a ser etiquetas de visualización con una clave normalizada derivada automáticamente; el schema generado lleva la etiqueta como `title`; las validaciones de duplicados y vacíos operan sobre las claves derivadas; las claves guardadas son estables.
- `schema-form-filler`: los campos generados (y el formulario público que los reutiliza) muestran el `title` de la propiedad como etiqueta, con la clave como respaldo.

## Impact

- `lib/schema-builder.ts`: nueva función de normalización de claves, `BuilderNode` gana una clave persistida opcional, y se actualizan `toJsonSchema`/`createObjectSchema`/`builderNodeFromJsonSchema`/validación; el tipo `JsonSchema` usa `title` en propiedades (ya es opcional).
- `lib/schema-form.ts`: `FormField` gana un `label`; `deriveFormFields` lee `title`.
- `app/components/schema-builder/property-editor.tsx`: campo de etiqueta más pista con la clave derivada.
- `app/components/form-filler/field-editor.tsx` (y el formulario público, que lo comparte): renderizan `label`.
- Los schemas y registros existentes siguen funcionando sin cambios; no hace falta migración de base de datos porque la etiqueta vive dentro del documento JSON Schema almacenado.
- Sin cambios: encabezados de columnas de la tabla de registros, coincidencia de claves en la importación JSON (sigue por clave) y la forma del payload de `/api/v1` (las claves siguen siendo los nombres normalizados en snake_case).
