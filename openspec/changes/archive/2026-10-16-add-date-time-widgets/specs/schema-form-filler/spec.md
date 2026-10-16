## ADDED Requirements

### Requirement: Render date and time properties with dedicated widgets

El sistema SHALL renderizar una propiedad `string` con `format: "date"` mediante el widget de fecha y una con `format: "time"` mediante el widget de hora, usando como etiqueta el título de la propiedad (o su clave). Esto SHALL aplicarse también a propiedades dentro de objetos y a elementos de arrays. Los valores SHALL guardarse como texto (`YYYY-MM-DD` y `HH:mm`).

#### Scenario: Renderizar una propiedad de fecha

- **WHEN** un esquema cargado declara una propiedad `string` con `format` igual a `date`
- **THEN** el formulario muestra un selector de fecha para esa propiedad

#### Scenario: Renderizar una propiedad de hora

- **WHEN** un esquema cargado declara una propiedad `string` con `format` igual a `time`
- **THEN** el formulario muestra un selector de hora para esa propiedad

#### Scenario: Fecha y hora dentro de objetos y arrays

- **WHEN** un esquema declara una propiedad de fecha o de hora dentro de un objeto, o un array cuyos elementos son de fecha u hora
- **THEN** la propiedad anidada, o cada elemento del array, usa el widget correspondiente

#### Scenario: Guardar un valor de fecha

- **WHEN** el usuario elige el 5 de marzo de 2026 en un campo de fecha y envía el formulario
- **THEN** el registro guardado contiene el texto `2026-03-05` para esa propiedad

#### Scenario: Campo de fecha u hora obligatorio sin valor

- **WHEN** una propiedad de fecha u hora está marcada como obligatoria y el usuario envía sin elegir valor
- **THEN** la interfaz informa que el campo falta y no crea el registro

### Requirement: Constrain JSON-imported values to date and time formats

Al rellenar el formulario desde un objeto JSON pegado, el sistema SHALL conservar el valor de una propiedad de fecha solo si es un texto con formato `YYYY-MM-DD` que represente una fecha válida, y el de una propiedad de hora solo si es un texto con formato `HH:mm` (o `HH:mm:ss`) que represente una hora válida; en otro caso SHALL dejar el campo vacío. Al cargar un registro guardado, un valor que no cumpla el formato SHALL mostrarse sin selección.

#### Scenario: Valor de fecha válido

- **WHEN** el usuario pega un JSON con `"birthday": "2026-03-05"` y la propiedad es de fecha
- **THEN** el campo de fecha queda con `2026-03-05`

#### Scenario: Valor de fecha inválido

- **WHEN** el usuario pega un JSON con `"birthday": "05/03/2026"` o `"2026-02-31"` y la propiedad es de fecha
- **THEN** el campo de fecha queda vacío

#### Scenario: Valor de hora inválido

- **WHEN** el usuario pega un JSON con `"opens_at": "25:70"` y la propiedad es de hora
- **THEN** el campo de hora queda vacío

#### Scenario: Registro guardado con un valor fuera de formato

- **WHEN** el usuario carga un registro cuyo valor para un campo de fecha no cumple el formato
- **THEN** el widget muestra el campo sin selección y, si es obligatorio, el usuario debe elegir una fecha antes de enviar
