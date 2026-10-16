## ADDED Requirements

### Requirement: Validate date and time formats in write payloads

El sistema SHALL validar, al crear o reemplazar un registro, que toda propiedad cuyo esquema declare `format: "date"` contenga una fecha ISO 8601 válida (`YYYY-MM-DD`) y toda propiedad con `format: "time"` contenga una hora ISO 8601 válida con desfase horario opcional (`HH:mm`, `HH:mm:ss`). Un valor que no cumpla SHALL producir una respuesta 400 con el detalle de validación, y el registro no SHALL guardarse.

#### Scenario: Fecha válida

- **WHEN** un cliente envía un registro con `"birthday": "2026-03-05"` y el esquema declara `format` igual a `date`
- **THEN** el registro se guarda

#### Scenario: Fecha mal formada

- **WHEN** un cliente envía un registro con `"birthday": "2026-02-31"` o `"05/03/2026"`
- **THEN** la API responde 400 con el detalle de validación y no guarda el registro

#### Scenario: Hora válida

- **WHEN** un cliente envía un registro con `"opens_at": "14:30"` y el esquema declara `format` igual a `time`
- **THEN** el registro se guarda

#### Scenario: Hora mal formada

- **WHEN** un cliente envía un registro con `"opens_at": "25:70"`
- **THEN** la API responde 400 con el detalle de validación y no guarda el registro
