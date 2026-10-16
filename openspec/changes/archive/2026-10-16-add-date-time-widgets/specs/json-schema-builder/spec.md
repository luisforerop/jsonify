## ADDED Requirements

### Requirement: Define date and time properties

El sistema SHALL permitir al usuario elegir `date` o `time` como tipo de una propiedad, en cualquier nivel editable y como tipo de elemento de un array. El esquema generado SHALL representar una propiedad `date` como `type: "string"` con `format: "date"`, y una propiedad `time` como `type: "string"` con `format: "time"`, sin emitir nunca `type: "date"` ni `type: "time"`.

#### Scenario: Añadir una propiedad de fecha

- **WHEN** el usuario añade una propiedad llamada `birthday` con tipo date
- **THEN** el esquema generado incluye `birthday` con `type` igual a `string` y `format` igual a `date`

#### Scenario: Añadir una propiedad de hora

- **WHEN** el usuario añade una propiedad llamada `opens_at` con tipo time
- **THEN** el esquema generado incluye `opens_at` con `type` igual a `string` y `format` igual a `time`

#### Scenario: Fecha como tipo de elemento de un array

- **WHEN** el usuario elige date como tipo de elemento de un array
- **THEN** el esquema generado representa `items` como `string` con `format` igual a `date`

#### Scenario: Cambiar una propiedad a otro tipo

- **WHEN** el usuario cambia una propiedad `date` o `time` a otro tipo
- **THEN** el esquema generado ya no contiene `format` para esa propiedad

#### Scenario: Recargar un esquema guardado

- **WHEN** un esquema guardado contiene una propiedad `string` con `format` `date` o `time` y el usuario lo carga en el constructor
- **THEN** el constructor muestra esa propiedad con tipo date o time respectivamente

#### Scenario: Strings con otro formato

- **WHEN** un esquema guardado contiene una propiedad `string` con un `format` distinto de `date` o `time`
- **THEN** el constructor la muestra como `string`

#### Scenario: La importación desde JSON de ejemplo no infiere fechas

- **WHEN** el usuario genera un esquema a partir de un JSON de ejemplo
- **THEN** los valores de texto se infieren como propiedades `string`, aunque parezcan fechas u horas
