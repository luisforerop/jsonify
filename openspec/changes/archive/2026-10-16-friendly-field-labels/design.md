## Context

Hoy el nombre de una propiedad es una sola cadena que cumple tres roles: clave JSON, etiqueta en el constructor y etiqueta en el formulario (`BuilderNode.name`, llaves de `JsonSchema.properties`, `FormField.name`). El documento del schema se almacena como JSON en Postgres, así que agregar una palabra clave estándar no requiere migración. Ver proposal.md para la motivación.

Los registros, la API `/api/v1`, la tabla de registros y la importación JSON direccionan los datos por clave, por lo que las claves deben seguir siendo estables y aptas para máquinas mientras las etiquetas pasan a ser texto libre.

## Goals / Non-Goals

**Goals:**
- El autor escribe etiquetas naturales; las claves almacenadas son snake_case ASCII normalizado.
- Cero rupturas para schemas y registros existentes.
- Una única implementación de normalización compartida por el constructor y la validación.

**Non-Goals:**
- Encabezados de columnas de la tabla de registros y coincidencia por etiqueta en la importación JSON (siguen basados en clave; pueden venir después).
- Localización / múltiples etiquetas por propiedad.
- Un campo de clave editable por separado (la clave se deriva y se muestra, no se edita de forma independiente).
- Truncado por longitud máxima de las claves.

## Decisions

**La etiqueta se guarda como `title` en el schema de cada propiedad.** Es la anotación estándar de JSON Schema, los validadores la ignoran y no requiere almacenamiento nuevo. Alternativa: una palabra clave propia `x-label`; se descartó porque `title` ya tiene exactamente ese significado y el proyecto prefiere palabras clave estándar, usando `x-` solo para metadatos no estándar (ver la funcionalidad de relaciones).

**`BuilderNode.name` pasa a ser la etiqueta; se agrega `key` opcional.** `key` se establece cuando un nodo proviene de un schema guardado o de la importación de JSON de muestra y entonces se usa tal cual; en otro caso la clave es `normalizeKey(name)` al generar el schema. Esto da estabilidad de clave ante ediciones de etiqueta y conserva claves legadas como `fechaIngreso`. Alternativa: re-derivar siempre desde la etiqueta; se descartó porque renombrar una etiqueta cambiaría la clave en silencio y dejaría huérfanos los datos de los registros.

**`normalizeKey` en `lib/schema-builder.ts`:** normalizar a NFD y eliminar marcas combinantes (`\p{M}`), pasar a minúsculas, reemplazar `[^a-z0-9]+` por `_`, recortar guiones bajos y anteponer `field_` si el primer carácter es un dígito. Función pura con pruebas unitarias. Alternativa: conservar letras no ASCII (p. ej. `ñ`); se descartó, porque el objetivo son identificadores portables y NFD convierte `ñ` en `n`, lo que coincide con la petición de quitar tildes.

**La validación opera sobre las claves resueltas.** `validatePropertyLevel` compara claves resueltas (no etiquetas recortadas) y reporta errores de clave vacía y de colisión por nivel. Como `required` y `properties` usan la misma clave resuelta, no pueden desincronizarse.

**El form filler lee `title` hacia `FormField.label`.** `deriveFormFields` asigna `label = schema.title ?? name`; los componentes renderizan `label` mientras que las rutas y valores siguen usando `name`. Los mensajes de campos faltantes convierten rutas de claves en rutas de etiquetas. El formulario público reutiliza los mismos componentes, por lo que no necesita un cambio aparte.

**Los nodos de ítem de arreglo** mantienen el nombre/clave fijo `items` y no llevan etiqueta.

## Risks / Trade-offs

- [Etiquetas que colisionan tras la normalización sorprenden al autor] → mostrar la clave derivada junto a la etiqueta e informar un error claro de duplicado.
- [El autor espera que renombrar la etiqueta renombre la clave] → las claves son estables por diseño; mostrar la clave lo hace visible y queda documentado en la spec.
- [Etiquetas no latinas (p. ej. `日本語`) se normalizan a vacío] → la validación las rechaza con un mensaje claro; una transliteración o una clave manual puede ser un seguimiento.
- [Las claves de la importación JSON de muestra no se normalizan] → es intencional, para preservar la forma de los datos del autor; las etiquetas son iguales a las claves.
