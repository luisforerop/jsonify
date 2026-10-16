## Context

Los esquemas se modelan en dos formas paralelas: `BuilderNode` (estado del editor, `lib/schema-builder.ts`) y `JsonSchema` (lo que se guarda y emite). El formulario deriva `FormField` desde el `JsonSchema` guardado (`lib/schema-form.ts`). `enum` ya funciona como pseudo-tipo solo de UI: se emite como `type: "string"` + `enum` (ver cambio archivado `add-enum-field-type`). Hoy los controles de entrada viven dentro de `ScalarInput` en `app/components/form-filler/field-editor.tsx`, mezclados con el recorrido de objetos/arrays. La validación del servidor usa `Ajv2020` con `strict: false` y sin `ajv-formats`, por lo que `format` se ignora. Ver proposal.md para la motivación.

## Goals / Non-Goals

**Goals:**
- `date` y `time` seleccionables en el constructor y renderizados con su widget en el formulario.
- Capa de widgets en un módulo propio, con contrato único y registro por tipo, sustituible sin tocar la lógica de formularios.
- Esquemas siempre JSON Schema estándar; sin cambios de BD ni de forma de la API.

**Non-Goals:**
- `date-time` (fecha y hora combinadas), zonas horarias, rangos, `min`/`max`.
- Elegir distintos widgets para un mismo tipo (p. ej. radio vs. desplegable para enum) o una UI de configuración de widgets.
- Publicar la librería de widgets como paquete: solo se deja el módulo listo para extraerse.
- Migrar los widgets del constructor (el editor de opciones de enum) a la capa.

## Decisions

**1. `date` y `time` son pseudo-tipos de UI; se guardan como `string` + `format`.**
Se añaden a `BUILDER_TYPES` y a `FormField["type"]`, nunca se emite `type: "date"`. `toJsonSchema` escribe `{ type: "string", format: "date" | "time" }`; `builderNodeFromJsonSchema` y `formFieldFromJsonSchema` mapean de vuelta solo esos dos formatos (otro `format` se queda como `string`). Es el mismo patrón que `enum` y mantiene la dirección híbrida del proyecto (tipo nativo en UI, estándar en BD). `JsonSchema` gana el campo opcional `format?: string`.
*Alternativa:* guardar un `x-widget` o tipo propio — descartado, rompe portabilidad y Ajv.

**2. Un único módulo `app/components/widgets/` con contrato y registro.**
Archivos: `types.ts` (contrato `WidgetProps`), `registry.ts` (`WIDGETS: Record<WidgetType, ComponentType<WidgetProps>>` y `resolveWidget(type)` con fallback a texto) y un archivo por widget o uno por familia (`text`, `number`, `boolean`, `enum`, `date`, `time`). El contrato es mínimo y serializable:

```ts
type WidgetProps = {
  value: string | number | boolean | null | undefined;
  onChange: (value: string | number | boolean | null) => void;
  label?: string;          // para aria-label cuando no hay <label> envolvente
  options?: string[];      // enum
  required?: boolean;
  invalid?: boolean;
  disabled?: boolean;
};
```

El módulo solo importa React y sus propios tipos: no importa `lib/schema-form` ni `lib/schema-builder`. `WidgetType` se declara en el propio módulo (`"string" | "number" | ... | "date" | "time"`) y `FormField["type"]` se mantiene asignable a él. Así el módulo puede moverse a un paquete aparte; para sustituir una implementación basta con cambiar una entrada del registro (o envolverla en un adaptador que cumpla `WidgetProps`).
*Alternativa:* carpeta `lib/` o un solo archivo con `switch` — descartado: el registro permite reemplazo por tipo sin editar un condicional, y `components/` evita mezclar UI con lógica pura de `lib/`.

**3. `field-editor.tsx` solo resuelve y renderiza.**
`ScalarInput` se reemplaza por `const Widget = resolveWidget(field.type)`; el `<label>`, el asterisco de obligatorio y la clase `is-missing` siguen en `FieldEditor` (son del formulario, no del control). El caso de los items de array usa la misma resolución. El comportamiento de los widgets existentes se conserva byte a byte (mismo marcado), lo que se verifica con las pruebas existentes.

**4. Widgets nativos HTML para el primer corte.**
`date` → `<input type="date">` (valor `YYYY-MM-DD` de forma nativa) y `time` → `<input type="time">` (valor `HH:mm`). Sin dependencias nuevas de UI, accesibles y móviles. La capa de widgets permite cambiarlos después por una librería de calendario sin tocar nada más.
*Alternativa:* añadir ya una librería de date-picker — descartado: dependencia sin necesidad actual; justamente el desacoplamiento hace barato adoptarla después.

**5. Valores: cadena vacía sin selección, texto ISO con selección.**
`createInitialValue` devuelve `""` para `date`/`time` (el caso por defecto actual), por lo que `isEmptyValue` y la validación de obligatorios funcionan sin cambios. `conformValue` añade ramas `date`/`time` con helpers puros `isValidDate` (regex `^\d{4}-\d{2}-\d{2}$` + comprobar que `new Date` no cambia el día, para rechazar `2026-02-31`) e `isValidTime` (`^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$`); valores fuera de formato → `""`. `clearStaleEnumValues` (que ya limpia al cargar registros guardados) se generaliza a `clearInvalidValues`: además de enum, vacía fechas y horas fuera de formato, con el mismo recorrido recursivo; se actualizan sus llamadores.

**6. Validación en servidor con `ajv-formats`.**
Se registra `addFormats(ajv, ["date", "time"])` en `lib/server/validate-payload.ts`, de modo que solo esos formatos se validan y el resto de `format` sigue ignorándose como hoy (evita rechazar esquemas existentes que usen formatos no previstos). `ajv-formats` aporta solo `date`. Su formato `time` exige segundos (`14:30:00`), por lo que `14:30` se rechazaría; se registra un formato `time` propio con `ajv.addFormat` (`HH:mm`, `HH:mm:ss` y desfase opcional). Las pruebas cubren ambos.

## Risks / Trade-offs

- [`<input type="date|time">` se ve distinto por navegador] → Aceptable para el primer corte; es justo lo que la capa de widgets permite sustituir.
- [Esquemas ya guardados con `string` + `format: "date"` pasarán a mostrarse como `date`; registros viejos con otro formato de fecha dejarán de aceptarse en la API] → El formulario los muestra sin selección; en la API afecta solo a esquemas que ya declaraban el `format`, que antes se ignoraba. Se documenta en el resumen del cambio.
- [Ampliar la unión de tipos toca cada `switch`/guard] → La exhaustividad de TypeScript y pruebas actualizadas de `schema-builder` y `schema-form` lo cubren.
- [Mover los controles puede alterar el marcado y romper estilos] → Se conserva el marcado actual dentro de cada widget y se verifica en el navegador.
- [El contrato podría quedarse corto para una librería futura (p. ej. `min`/`max`, `placeholder`)] → Es aditivo: se añaden props opcionales sin romper widgets existentes.

## Migration Plan

Sin migración de datos. Despliegue normal; para revertir basta con revertir el cambio, ya que ningún dato guardado usa un formato nuevo.
