## ADDED Requirements

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
