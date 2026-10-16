## 1. Capa de widgets desacoplada

- [x] 1.1 Crear `app/components/widgets/types.ts` con `WidgetType` y el contrato `WidgetProps` (`value`, `onChange`, `label`, `options`, `required`, `invalid`, `disabled`), sin importar nada de `lib/`
- [x] 1.2 Mover los controles actuales de `ScalarInput` a widgets independientes en `app/components/widgets/` (texto, número/entero, booleano, null, enum) conservando el marcado existente
- [x] 1.3 Crear `app/components/widgets/registry.ts` con el registro `tipo → componente` y `resolveWidget(type)` con respaldo al widget de texto
- [x] 1.4 Reemplazar `ScalarInput` en `app/components/form-filler/field-editor.tsx` por `resolveWidget(field.type)`, tanto para campos como para elementos de array; dejar etiqueta, marca de requerido y clase `is-missing` en `FieldEditor`
- [x] 1.5 Agregar pruebas del registro: resolución por tipo, respaldo para tipo desconocido y sustitución de un widget por otro que cumple el contrato

## 2. Widgets de fecha y hora

- [x] 2.1 Crear el widget `date` (`<input type="date">`, valor `YYYY-MM-DD`, cadena vacía sin selección) y registrarlo
- [x] 2.2 Crear el widget `time` (`<input type="time">`, valor `HH:mm`, cadena vacía sin selección) y registrarlo
- [x] 2.3 Agregar pruebas de los widgets: mostrar valor existente, emitir `onChange` con el texto esperado y limpiar a cadena vacía

## 3. Constructor de esquemas

- [x] 3.1 En `lib/schema-builder.ts`, agregar `date` y `time` a `BUILDER_TYPES`/`BuilderNodeType` y `format?: string` a `JsonSchema`
- [x] 3.2 Hacer que `toJsonSchema` emita `{ type: "string", format: "date" | "time" }` y que `changeNodeType` limpie los datos incompatibles al cambiar desde/hacia estos tipos
- [x] 3.3 Hacer que `builderNodeFromJsonSchema` reconozca `string` con `format` `date`/`time` (otros formatos quedan como `string`) y confirmar que la importación desde JSON de ejemplo no infiere fechas
- [x] 3.4 Confirmar que `app/components/schema-builder/property-editor.tsx` muestra los nuevos tipos en ambos selectores (propiedad y elementos de array) y que `schema-preview` los refleja
- [x] 3.5 Agregar pruebas en `lib/schema-builder.test.ts`: emisión, recarga, elemento de array, cambio de tipo y formato desconocido

## 4. Formulario

- [x] 4.1 En `lib/schema-form.ts`, agregar `date`/`time` a `FormField["type"]` y derivarlos en `formFieldFromJsonSchema` desde `string` + `format`, también en objetos y elementos de array
- [x] 4.2 Agregar `isValidDate`/`isValidTime` y las ramas `date`/`time` en `conformValue` (valor inválido → cadena vacía)
- [x] 4.3 Generalizar `clearStaleEnumValues` a `clearInvalidValues` (enum, fecha y hora) y actualizar sus llamadores
- [x] 4.4 Agregar pruebas en `lib/schema-form.test.ts`: derivación, valor inicial, obligatorio vacío, importación JSON válida/inválida (`2026-02-31`, `05/03/2026`, `25:70`) y registro guardado fuera de formato

## 5. Validación en servidor

- [x] 5.1 Agregar la dependencia `ajv-formats` y registrar solo los formatos `date` y `time` en `lib/server/validate-payload.ts` (si `14:30` no pasa con el formato estándar, definir un formato `time` propio con desfase opcional)
- [x] 5.2 Agregar pruebas de validación: fecha/hora válidas se aceptan; `2026-02-31`, `05/03/2026` y `25:70` responden 400; otros `format` siguen ignorándose

## 6. Verificación

- [x] 6.1 Probar a mano el ciclo completo: crear un esquema con propiedades date y time (suelta, anidada y en array) → guardar → recargar → llenar el formulario → guardar el registro y verlo en la tabla de registros
- [x] 6.2 Confirmar que los widgets existentes (texto, número, booleano, enum) se ven y se comportan igual tras la migración al registro
- [x] 6.3 Ejecutar `openspec validate add-date-time-widgets` y corregir lo que reporte
