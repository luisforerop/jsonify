# Json Schema Builder Specification

## Purpose

Provide a form-based workspace for creating valid, nested JSON Schemas and retaining saved schemas in the server's relational store.

## Requirements

### Requirement: Start a named schema

The system SHALL allow a user to enter a name before defining the properties of a new JSON Schema. The generated schema SHALL use that name as its title.

#### Scenario: Start a schema with a name

- **WHEN** the user enters a schema name
- **THEN** the builder displays a root schema ready to receive properties using that name as its title

### Requirement: Define typed properties

The system SHALL allow a user to add, rename, change the type of, and remove properties at any editable object level. The available property types SHALL include string, number, integer, boolean, null, object, array, and enum.

#### Scenario: Add a scalar property

- **WHEN** the user adds a property named `age` with type number
- **THEN** the generated schema includes `age` under the current object's `properties` with `type` set to `number`

#### Scenario: Change a property type

- **WHEN** the user changes an existing property's type
- **THEN** the generated schema reflects the selected type and removes configuration that is incompatible with that type

#### Scenario: Remove a property

- **WHEN** the user removes a property
- **THEN** that property no longer appears in the builder or the generated schema

### Requirement: Define enum properties

The system SHALL allow a user to choose `enum` as a property type, at any editable object level and as an array's item type. An enum property SHALL carry an ordered list of allowed string options that the user can add, edit, remove, and view. The generated schema SHALL represent an enum property as a string constrained to its options, using the standard JSON Schema `enum` keyword alongside `type: "string"`.

#### Scenario: Add an enum property

- **WHEN** the user adds a property named `status` with type enum and options `draft` and `published`
- **THEN** the generated schema includes `status` with `type` set to `string` and `enum` set to `["draft", "published"]`

#### Scenario: Enum as an array item type

- **WHEN** the user selects enum as an array's item type with options `a` and `b`
- **THEN** the generated schema represents the array's `items` as a string constrained to `["a", "b"]`

#### Scenario: Change a property to enum

- **WHEN** the user changes an existing property's type to enum
- **THEN** the property starts with no options and the user can add options to it

#### Scenario: Change an enum property to another type

- **WHEN** the user changes an enum property to another type
- **THEN** its options are discarded and the generated schema no longer contains an `enum` for that property

#### Scenario: Reload a saved enum property

- **WHEN** a saved schema contains a `string` property that declares an `enum` array of strings and the user loads it into the builder
- **THEN** the builder shows that property with type enum and the same options in the same order

#### Scenario: Import from sample JSON does not infer enums

- **WHEN** the user generates a schema from a sample JSON document
- **THEN** string values are inferred as `string` properties, not enum properties

### Requirement: Validate enum options

The system SHALL treat a schema as invalid while any enum property has no options, has an option that is empty after trimming, or has duplicate options, and SHALL tell the user which property needs correcting. Saving such a schema SHALL be blocked.

#### Scenario: Enum with no options

- **WHEN** a schema contains an enum property with no options
- **THEN** the builder reports that the property needs at least one option and does not allow saving

#### Scenario: Blank option

- **WHEN** an enum property contains an option that is empty or only whitespace
- **THEN** the builder reports the property as invalid and does not allow saving

#### Scenario: Duplicate options

- **WHEN** an enum property contains the same option twice
- **THEN** the builder reports the property as invalid and does not allow saving

### Requirement: Model nested structures

The system SHALL allow object properties to contain their own typed properties at arbitrary nesting levels. The system SHALL allow an array property to define an item type and SHALL allow object array items to contain nested properties.

#### Scenario: Add nested object properties

- **WHEN** the user adds an object property and then adds a property inside it
- **THEN** the generated schema represents the outer property as an object with the inner property in its `properties`

#### Scenario: Configure object array items

- **WHEN** the user selects object as an array's item type and adds an item property
- **THEN** the generated schema represents the array item definition as an object containing that property

### Requirement: Generate a schema from a sample JSON document

The system SHALL provide a JSON-import mode in the schema builder, reachable as an
explicit choice from the builder interface, in which the user submits a single
JSON document as text and the system generates the root schema's properties by
inferring them from that document. The import mode SHALL be reversible: choosing
it SHALL NOT discard the ability to return to manual property editing.

Inference SHALL map JSON values to property types as follows: a string value maps
to `string`; a number with no fractional part maps to `integer`; a number with a
fractional part maps to `number`; a boolean maps to `boolean`; `null` maps to
`null`; an array maps to `array`; and an object maps to `object` whose properties
are inferred recursively from that object's members.

Generation SHALL NOT persist anything. The generated properties SHALL populate the
builder as an editable draft.

#### Scenario: Generate from a flat object

- **WHEN** the user submits `{ "test": "abc", "numeros": 123 }` in JSON-import mode
- **THEN** the builder is populated with a `test` property of type `string` and a
  `numeros` property of type `integer`, and the generated schema represents both
  under the root object's `properties`

#### Scenario: Infer number vs integer

- **WHEN** the user submits an object containing `{ "price": 9.99, "count": 4 }`
- **THEN** the `price` property has type `number` and the `count` property has
  type `integer`

#### Scenario: Infer nested object properties

- **WHEN** the user submits an object whose member `address` is itself an object
  with a `city` string
- **THEN** the `address` property has type `object` and contains a `city`
  property of type `string` in its own `properties`

#### Scenario: Infer an array of scalars

- **WHEN** the user submits an object whose member `tags` is `["a", "b"]`
- **THEN** the `tags` property has type `array` with an item type of `string`

#### Scenario: Infer an array of objects

- **WHEN** the user submits an object whose member `items` is an array whose first
  element is an object with a `sku` string
- **THEN** the `items` property has type `array` whose object item definition
  contains a `sku` property of type `string`

#### Scenario: Infer an empty or null-only value

- **WHEN** a member's value is an empty array or `null`
- **THEN** the corresponding property is still created — an empty array yields an
  `array` property with a `string` item type, and `null` yields a property of
  type `null`

#### Scenario: Edit the generated schema after import

- **WHEN** the user has generated a schema from JSON and the builder shows the
  editor with the inferred properties
- **THEN** the user can add, rename, retype, and remove properties and save the
  schema through the normal save flow, exactly as for a manually built schema

#### Scenario: Reject invalid JSON

- **WHEN** the user submits text that is not valid JSON
- **THEN** the system reports the input as invalid, generates no schema, and
  leaves any existing builder state unchanged

#### Scenario: Reject a non-object top-level value

- **WHEN** the user submits valid JSON whose top-level value is an array, string,
  number, boolean, or `null`
- **THEN** the system reports that a JSON object is required, generates no schema,
  and leaves any existing builder state unchanged

### Requirement: Manage schemas through a persistence boundary

The system SHALL expose create, read, update, and delete operations for saved
JSON Schemas, scoped to the active collection within the active workspace,
through external client-side hooks. The schema-builder interface SHALL use those
hooks rather than accessing browser localStorage directly. The hook
implementation SHALL persist schemas in the relational store through the server,
and its create, read, update, and delete operations SHALL be asynchronous. Each
saved schema SHALL carry a name that is unique within its collection, enforced
atomically by a database unique index. A saved schema SHALL remain available
after the browser page is reloaded, including from a different browser or machine
using the same server, still associated with its collection and workspace.

#### Scenario: Save a valid schema

- **WHEN** the user selects save for a named schema within an active collection
- **THEN** the interface creates the generated JSON Schema through the persistence hook, associated with that collection and its workspace, and the user receives confirmation that it was saved

#### Scenario: Update a saved schema

- **WHEN** the user saves changes to an existing schema
- **THEN** the interface updates that schema through the persistence hook without creating a duplicate saved entry

#### Scenario: Reject a duplicate schema name in a collection

- **WHEN** the user saves a new schema whose name matches another schema in the same collection
- **THEN** the database unique index rejects the insert and the system reports the conflict without creating a second schema with that name

#### Scenario: Load saved schemas

- **WHEN** the schema-builder view becomes available for an active collection
- **THEN** it obtains that collection's saved schemas through the persistence hook

#### Scenario: Delete a saved schema

- **WHEN** the user deletes a saved schema
- **THEN** the interface removes that schema through the persistence hook and it no longer appears in the saved collection

#### Scenario: Reload after saving

- **WHEN** the user reloads the application after saving a schema
- **THEN** the saved JSON Schema remains available through the persistence hook, still associated with its collection

#### Scenario: Schemas are isolated per collection

- **WHEN** two different collections each have saved schemas
- **THEN** the schema-builder opened for one collection does not display the other collection's schemas

### Requirement: Name properties with a display label

El sistema SHALL permitir al autor escribir el nombre de cada propiedad como texto libre de visualización, incluyendo espacios, mayúsculas, tildes y otros caracteres no ASCII. El schema generado SHALL registrar ese texto como `title` de la propiedad y SHALL usar una clave normalizada, derivada de la etiqueta, como llave de la propiedad bajo `properties` y en `required`. Una propiedad cuya etiqueta ya es igual a su clave normalizada SHALL guardarse igualmente con su `title`.

#### Scenario: Label with spaces and accents

- **WHEN** el usuario agrega una propiedad con la etiqueta `Fecha de ingreso`
- **THEN** el schema generado incluye la clave `fecha_de_ingreso` bajo `properties` con `title` igual a `Fecha de ingreso`

#### Scenario: Required property uses the normalized key

- **WHEN** el usuario marca como requerida la propiedad con la etiqueta `Teléfono móvil`
- **THEN** el arreglo `required` del schema generado contiene `telefono_movil`

#### Scenario: Nested properties are labelled too

- **WHEN** el usuario agrega la etiqueta `Dirección actual` dentro de una propiedad de tipo objeto
- **THEN** la propiedad anidada se guarda bajo `direccion_actual` con `title` `Dirección actual`

### Requirement: Normalize property keys

El sistema SHALL derivar la clave de una propiedad a partir de su etiqueta eliminando diacríticos, convirtiendo a minúsculas, reemplazando cada grupo de caracteres distintos de letras ASCII y dígitos por un único guion bajo, recortando los guiones bajos iniciales y finales, y anteponiendo `field_` cuando el resultado empiece por un dígito. El constructor SHALL mostrar la clave derivada junto a la etiqueta para que el autor vea qué se va a guardar.

#### Scenario: Strip accents and punctuation

- **WHEN** el usuario escribe la etiqueta `¿Año de nacimiento?`
- **THEN** la clave derivada es `ano_de_nacimiento`

#### Scenario: Collapse whitespace and symbols

- **WHEN** el usuario escribe la etiqueta `  Nombre   completo / apellido `
- **THEN** la clave derivada es `nombre_completo_apellido`

#### Scenario: Key would start with a digit

- **WHEN** el usuario escribe la etiqueta `2do apellido`
- **THEN** la clave derivada es `field_2do_apellido`

#### Scenario: Derived key is visible

- **WHEN** el usuario escribe una etiqueta en el constructor
- **THEN** la clave derivada se muestra junto a esa propiedad y se actualiza a medida que cambia la etiqueta

### Requirement: Validate derived keys

El sistema SHALL tratar un schema como inválido cuando la etiqueta de una propiedad produce una clave vacía, o cuando dos propiedades del mismo nivel de objeto producen la misma clave, e SHALL indicar al usuario qué propiedades debe corregir. Guardar un schema así SHALL quedar bloqueado.

#### Scenario: Label that normalizes to nothing

- **WHEN** el usuario escribe la etiqueta `???` para una propiedad
- **THEN** el constructor informa que la propiedad necesita un nombre con letras o dígitos y no permite guardar

#### Scenario: Labels that collide after normalization

- **WHEN** un mismo nivel de objeto tiene propiedades con las etiquetas `Año` y `Ano`
- **THEN** el constructor informa nombres de propiedad duplicados y no permite guardar

#### Scenario: Same label in different objects

- **WHEN** dos propiedades de tipo objeto distintas contienen cada una una propiedad con la etiqueta `Nombre`
- **THEN** el schema es válido

### Requirement: Keep saved property keys stable

El sistema SHALL mantener sin cambios la clave de una propiedad cuando el autor edita su etiqueta después de que el schema fue guardado o cargado, de modo que los registros existentes sigan siendo válidos. Solo el `title` SHALL cambiar. Una propiedad cargada desde un schema guardado que no tiene `title` SHALL usar su clave como etiqueta y SHALL conservar exactamente esa clave al guardar de nuevo el schema, aunque la clave no cumpla las reglas de normalización. Las propiedades creadas mediante la importación de JSON de muestra SHALL conservar las claves del documento de muestra.

#### Scenario: Rename the label of a saved property

- **WHEN** el usuario carga un schema guardado con la propiedad `fecha_de_ingreso` (title `Fecha de ingreso`), cambia su etiqueta a `Fecha de ingreso al cargo` y guarda
- **THEN** el schema conserva la clave `fecha_de_ingreso` y su `title` es `Fecha de ingreso al cargo`

#### Scenario: Reload a legacy property without a title

- **WHEN** el usuario carga un schema guardado con la propiedad `fechaIngreso` sin `title` y lo guarda sin editar esa propiedad
- **THEN** la clave sigue siendo `fechaIngreso` y el constructor muestra `fechaIngreso` como su etiqueta

#### Scenario: Import from sample JSON keeps keys

- **WHEN** el usuario genera un schema a partir de `{ "firstName": "Ada" }`
- **THEN** la clave de la propiedad es `firstName` y su etiqueta es `firstName`

#### Scenario: Newly added properties derive their key

- **WHEN** el usuario agrega una propiedad nueva a un schema cargado con la etiqueta `Número de hijos`
- **THEN** la propiedad nueva se guarda bajo `numero_de_hijos`
