# Form Widgets Specification

## Purpose

Definir una capa de widgets de entrada desacoplada de la lógica del formulario, de modo que los controles puedan sustituirse (por otra librería o por una librería propia) sin modificar cómo se derivan, validan y guardan los valores. Incluye los widgets de fecha y hora.

## Requirements


### Requirement: Widgets behind a common contract

El sistema SHALL renderizar cada campo escalar del formulario mediante un widget que cumpla un contrato único de entrada y salida: recibe el valor actual, las opciones propias del campo (si las tiene), su etiqueta, si está deshabilitado o marcado como faltante, y notifica cada cambio con un nuevo valor. Ningún widget SHALL leer ni escribir el estado del formulario por su cuenta.

#### Scenario: Un widget solo comunica valor y cambios

- **WHEN** el formulario renderiza un campo escalar
- **THEN** el widget recibe su valor actual por contrato y comunica cualquier edición únicamente mediante la notificación de cambio con el nuevo valor

#### Scenario: El valor guardado no depende del widget

- **WHEN** un mismo campo se captura con dos implementaciones distintas del widget que respetan el contrato
- **THEN** el valor almacenado en el registro es idéntico

### Requirement: Widget registry

El sistema SHALL resolver el widget de cada campo por su tipo mediante un único registro que asocia cada tipo de campo con un componente. Los tipos soportados SHALL incluir al menos `string`, `number`, `integer`, `boolean`, `null`, `enum`, `date` y `time`. El código que construye el formulario SHALL consultar el registro y no contener controles de entrada propios. Un tipo sin widget registrado SHALL caer en el widget de texto.

#### Scenario: Resolver el widget por tipo

- **WHEN** el formulario necesita renderizar un campo de tipo `date`
- **THEN** usa el widget que el registro tiene asociado a `date`

#### Scenario: Reemplazar un widget

- **WHEN** se cambia en el registro el componente asociado a un tipo por otro que cumple el contrato
- **THEN** todos los campos de ese tipo se renderizan con el nuevo componente sin cambios en la derivación del formulario, la validación ni el guardado

#### Scenario: Tipo sin widget registrado

- **WHEN** un campo tiene un tipo para el que el registro no define widget
- **THEN** el formulario lo renderiza con el widget de texto

### Requirement: Isolated widget module

El sistema SHALL mantener los widgets y su registro en un módulo propio, separado de los componentes del formulario y del constructor, que no importe lógica de esquemas, de persistencia ni de contexto de aplicación. Sus únicas dependencias SHALL ser React y los tipos del contrato, de forma que el módulo pueda extraerse a una librería independiente.

#### Scenario: El módulo no depende de la lógica de la aplicación

- **WHEN** se inspeccionan las dependencias del módulo de widgets
- **THEN** no importa código de derivación de formularios, del constructor de esquemas, de acceso a datos ni de sesión

#### Scenario: Los widgets existentes se conservan

- **WHEN** se renderiza un formulario con campos de texto, número, entero, booleano, null y enum
- **THEN** cada uno se comporta como antes de introducir el registro

### Requirement: Date widget

El sistema SHALL proveer un widget `date` que permita elegir una fecha del calendario y SHALL entregar el valor como texto ISO 8601 de fecha (`YYYY-MM-DD`). Un campo `date` sin selección SHALL tener como valor la cadena vacía.

#### Scenario: Elegir una fecha

- **WHEN** el usuario elige el 5 de marzo de 2026 en un campo `date`
- **THEN** el valor del campo es el texto `2026-03-05`

#### Scenario: Campo de fecha sin seleccionar

- **WHEN** el formulario se muestra por primera vez o se reinicia
- **THEN** el campo `date` aparece sin fecha seleccionada y su valor es la cadena vacía

#### Scenario: Mostrar una fecha existente

- **WHEN** se carga un registro cuyo valor para un campo `date` es `2026-03-05`
- **THEN** el widget muestra esa fecha como seleccionada

### Requirement: Time widget

El sistema SHALL proveer un widget `time` que permita elegir una hora del día y SHALL entregar el valor como texto de hora de 24 horas (`HH:mm`). Un campo `time` sin selección SHALL tener como valor la cadena vacía.

#### Scenario: Elegir una hora

- **WHEN** el usuario elige las 14:30 en un campo `time`
- **THEN** el valor del campo es el texto `14:30`

#### Scenario: Campo de hora sin seleccionar

- **WHEN** el formulario se muestra por primera vez o se reinicia
- **THEN** el campo `time` aparece sin hora seleccionada y su valor es la cadena vacía

#### Scenario: Mostrar una hora existente

- **WHEN** se carga un registro cuyo valor para un campo `time` es `14:30`
- **THEN** el widget muestra esa hora como seleccionada
