# Postgres + Drizzle — puntos de mejora tras la primera versión

Fecha: 2026-09-05
Contexto: seguimiento del change `migrate-persistence-to-postgres-drizzle` (ya
implementado). Nada de esto bloquea el corte; son mejoras para iteraciones
siguientes, priorizadas.

## P1 — hacer pronto

### 1. Índices en columnas FK que hoy no los tienen

Postgres **no** indexa automáticamente las columnas de foreign key. Faltan:

| Columna | Por qué importa |
|---|---|
| `api_keys.workspace_id` | `ApiKeyRepository.listByWorkspace` (panel de API keys) hace seq scan; y `resolvePublicContext` filtra por `workspace_id` en cada request `/api/v1`. |
| `records.workspace_id` | filtros por tenant; hoy solo hay índice en `collection_id` y el GIN. |
| `records.schema_id` | al borrar un schema, el `ON DELETE RESTRICT` escanea `records` entero buscando `schema_id`. |

Las demás FK ya quedan cubiertas por el primer campo de un unique index compuesto
(`collections (workspace_id, slug)`, `schemas (collection_id, name)`,
`workspace_members (workspace_id, user_id)`, `workspaces (owner_id, slug)`).

Acción: añadir `index(...)` sobre esas 3 columnas en `db/schema.ts` y generar la
migración.

### 2. `list()` sin scope de tenant en la API interna

`GET /api/collections`, `GET /api/schemas`, `GET /api/records` llaman a
`repositories.<x>.list()` y devuelven **todas** las filas de la tabla a cualquier
usuario autenticado; el filtrado por workspace/collection ocurre solo en el
cliente (los hooks). Es una fuga de datos entre tenants que ya existía con el
JSON store y se arrastró tal cual.

Acción: pasar el `workspaceId`/`collectionId` activo como query param y filtrar en
el servidor (`listByWorkspace` / `listByCollection`), o resolver el scope desde la
sesión + membresías. Necesita decidir cómo viaja el "workspace activo" al backend
(hoy solo vive en React).

### 3. `updated_at` se setea en código, no en la base

Cada `update` de repositorio hace `updatedAt: new Date()`. Un `UPDATE` hecho por
fuera de los repos (una migración de datos, un script, psql) no refresca la
columna.

Acción: `$onUpdate(() => new Date())` en la definición Drizzle, o un trigger
`moddatetime` en Postgres (más robusto, cubre cualquier origen de escritura).

## P2 — nice to have

### 4. Suite de tests contra Postgres real

Se canceló a propósito para esta fase. Los requisitos de `relational-store`
(unicidad atómica, cascada, restrict) hoy solo se verifican con los fakes
in-memory de `lib/server/repositories/testing.ts` y a mano. Una suite con
Testcontainers o `pglite` cubriría el gap sin depender de un servicio externo en
CI. Crear user story separada.

### 5. Mapeo de errores por nombre de constraint

`drizzle/shared.ts::translateWriteError` mira solo `error.code` (`23505`/`23503`),
no `error.constraint`. Hoy funciona porque cada ruta de escritura tiene una sola
unique constraint relevante, pero si un repo llega a tener dos (p. ej.
`users.email` + otra), lanzaría el `Duplicate*Error` equivocado.

Acción: mapear por `error.constraint` (nombre del índice) → error de dominio.

### 6. Validación de `DATABASE_URL` al arrancar

Hoy la ausencia de `DATABASE_URL` solo explota en la primera query. Un chequeo al
inicio (o un parseo con zod de las env vars del servidor) falla más rápido y con
mejor mensaje.

### 7. Chequeo en CI de que schema y migraciones están sincronizados

Añadir `drizzle-kit check` (o `generate --check`) al pipeline para que un cambio
en `db/schema.ts` sin su migración correspondiente falle el build.

### 8. Integridad de `records.workspace_id` denormalizado

`records` guarda `workspace_id` además de `collection_id`. Nada a nivel de base
garantiza que coincida con `collections.workspace_id` de esa fila. Hoy el único
escritor es `RecordRepository.create`, así que el invariante es local, pero:

Acción (si se quiere blindar): FK compuesta `records (collection_id, workspace_id)`
→ `collections (id, workspace_id)` con un unique index en `collections (id,
workspace_id)`, o un trigger. O bien eliminar la denormalización y llegar al
workspace por join (perdiendo el filtro directo por tenant).

## P3 — más adelante / observar

### 9. Re-introducir el guard `server-only`

`db/client.ts` tenía `import "server-only"` y se quitó porque rompe el entorno
jsdom de los tests (`registry.ts` importa la implementación Drizzle de forma
eager). El `db` es un Proxy perezoso, así que hoy no hay conexión en import, pero
tampoco hay barrera contra que un componente cliente importe los repos por error.

Acción: hacer `registry.ts` perezoso (cargar `./drizzle` solo cuando
`getRepositories()` se llama sin override) y devolver el `import "server-only"`.

### 10. `relations()` de Drizzle

No se definieron relaciones, así que no hay `db.query.workspaces.findMany({ with:
{ collections: true } })`. Los repos hacen filtros/joins manuales. Está bien para
el tamaño actual; si aparecen lecturas anidadas frecuentes, conviene añadirlas.

### 11. `schemas.is_active` sin uso

La columna existe pero nada la lee (era un open question del design). Decidir si
`resolvePublicContext` debe ignorar schemas con `is_active = false`, o quitar la
columna hasta que haya un caso de uso.

### 12. Ciclo de vida del pool

El `pg.Pool` nunca hace `.end()`. Para un servidor long-running en VPS está bien;
si en el futuro hay scripts one-shot o funciones serverless, hará falta cerrarlo.

### 13. Pin de imagen de Postgres

`docker-compose.yml` usa `postgres:17` (tag flotante). Pinnear a un patch
(`postgres:17.2`) para reproducibilidad entre máquinas.

### 14. Endpoint de borrado / transferencia de workspace

No hay UI ni forma cómoda de borrar un workspace (el endpoint existe pero exige
sesión Clerk). Relacionado con el TODO de
[`account-deletion-ownership-transfer.md`](./account-deletion-ownership-transfer.md).
