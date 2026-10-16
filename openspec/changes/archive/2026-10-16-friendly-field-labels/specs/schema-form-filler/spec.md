## ADDED Requirements

### Requirement: Display property labels

El sistema SHALL etiquetar cada campo del formulario generado, cada grupo de objeto anidado y cada campo de arreglo con el `title` de la propiedad cuando el schema lo declara, y con la clave de la propiedad en caso contrario. Los valores enviados y almacenados SHALL seguir indexados por la clave de la propiedad, nunca por la etiqueta. Los mensajes que identifican campos requeridos faltantes SHALL usar las etiquetas mostradas en el formulario.

#### Scenario: Field uses the title as label

- **WHEN** un schema cargado declara la propiedad `fecha_de_ingreso` con `title` `Fecha de ingreso`
- **THEN** el formulario muestra la etiqueta `Fecha de ingreso` para ese campo

#### Scenario: Field without a title falls back to the key

- **WHEN** un schema cargado declara la propiedad `age` sin `title`
- **THEN** el formulario muestra la etiqueta `age` para ese campo

#### Scenario: Values are stored under the key

- **WHEN** el usuario llena el campo con la etiqueta `Fecha de ingreso` y envía
- **THEN** el registro guardado contiene el valor bajo la clave `fecha_de_ingreso`

#### Scenario: Nested group uses the title

- **WHEN** un schema cargado declara una propiedad de tipo objeto `direccion_actual` con `title` `Dirección actual`
- **THEN** el formulario agrupa sus campos anidados bajo la etiqueta `Dirección actual`

#### Scenario: Missing-field message uses labels

- **WHEN** la propiedad `fecha_de_ingreso` con `title` `Fecha de ingreso` es requerida y el usuario envía sin llenarla
- **THEN** la interfaz informa `Fecha de ingreso` como faltante

#### Scenario: Public form shows labels

- **WHEN** un visitante abre el formulario compartido de un schema cuyas propiedades declaran títulos
- **THEN** el formulario muestra esos títulos como etiquetas de campo y el registro enviado queda indexado por las claves de las propiedades
