## 1. Normalización de claves y modelo del constructor

- [x] 1.1 Agregar `normalizeKey(label)` a `lib/schema-builder.ts` (quitar diacríticos, minúsculas, guiones bajos, prefijo `field_` si empieza por dígito) con pruebas unitarias para tildes, puntuación, espacios, dígitos iniciales y resultados vacíos
- [x] 1.2 Agregar `key` opcional a `BuilderNode` y un helper `resolveKey(node)` (la clave explícita gana; si no, `normalizeKey(name)`)
- [x] 1.3 Agregar `title` a la salida de propiedades anidadas en `toJsonSchema`/`createObjectSchema`; usar claves resueltas en `properties` y `required`
- [x] 1.4 Actualizar `builderNodeFromJsonSchema`/`propertiesFromJsonSchema` para que `name = title ?? key` y `key` quede con la clave almacenada; hacer que la importación de JSON de muestra asigne `key` = clave del miembro
- [x] 1.5 Asegurar que los nodos nuevos y los creados por `changeNodeType` mantengan `key` sin definir salvo que provengan de una carga

## 2. Validación

- [x] 2.1 Actualizar `validatePropertyLevel` para detectar claves resueltas vacías y colisiones de claves resueltas por nivel de objeto (incluidos los ítems objeto de arreglos)
- [x] 2.2 Agregar pruebas: colisión `Año`/`Ano`, clave vacía con `???`, la misma etiqueta en objetos distintos es válida, clave legada preservada

## 3. Interfaz del constructor

- [x] 3.1 En `app/components/schema-builder/property-editor.tsx`, renombrar el campo de nombre como etiqueta de visualización y mostrar la clave derivada junto a él (ocultarla cuando es igual a la etiqueta)
- [x] 3.2 Mostrar los mensajes de validación para claves vacías o en colisión; confirmar que la vista previa del schema guardado muestra `title` y las claves normalizadas

## 4. Form filler

- [x] 4.1 Agregar `label` a `FormField` en `lib/schema-form.ts`; asignarlo desde `title` con respaldo en la clave, incluidos los campos anidados y de ítems de arreglo
- [x] 4.2 Renderizar `field.label` en `app/components/form-filler/field-editor.tsx` (campos, leyendas de objeto, encabezados de arreglo, marca de requerido) manteniendo `field.name` para rutas y valores
- [x] 4.3 Convertir las rutas de campos faltantes en rutas de etiquetas en los mensajes de validación
- [x] 4.4 Verificar que el formulario público (`app/components/form-filler/public-form.tsx`) muestre las etiquetas sin más cambios; agregar pruebas en `lib/schema-form.test.ts`

## 5. Verificación

- [x] 5.1 Probar el ciclo completo: crear un schema con etiquetas con tildes → guardar → recargar → renombrar etiqueta → guardar conserva las claves; un schema existente solo con claves se carga sin cambios
- [x] 5.2 Confirmar que al enviar un registro los valores se guardan bajo las claves normalizadas y que el endpoint de schema de `/api/v1` devuelve los `title`
