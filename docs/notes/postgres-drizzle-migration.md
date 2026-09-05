# Migración a Postgres + Drizzle — notas de exploración

Fecha: 2026-09-04
Estado: exploración / pre-propuesta (aún no se ha creado un change de OpenSpec)

Este documento captura el análisis inicial de cómo fluyen los datos hoy en Jsonify
(storage en archivo JSON) y cómo se vería una migración a Postgres usando Drizzle
ORM. Es una nota de diseño, no una implementación ni una propuesta lista para
ejecutar: el orden real de trabajo (¿auth primero o DB primero?) todavía está
por decidir — ver "Secuenciación" más abajo.

## 1. Estado actual (`lib/server/json-store.ts`)

Un único archivo `data/jsonify.json` con seis colecciones planas:

```
{ users, workspaces, collections, schemas, records, apiKeys }
```

- Todas las escrituras pasan por una cola en memoria (`withLock`) que serializa
  operaciones de lectura-modificación-escritura, y luego se escriben a un
  archivo temporal + `rename` atómico.
- Los handlers (`lib/server/collection-handlers.ts`) son genéricos sobre
  `CollectionName`: `listResponse`, `createResponse`, `updateResponse`,
  `deleteResponse`, más `createSluggedResponse` para las entidades con slug.
- La API pública `/api/v1/collections/[slug]/*` no pasa por esos handlers:
  resuelve su propio contexto (`lib/server/public-api-context.ts`) a partir de
  headers (`x-workspace-id`, `x-schema`, `Authorization: Bearer`), valida el
  payload contra un JSON Schema guardado por el usuario (Ajv, en
  `lib/server/validate-payload.ts`) y crea el record directamente.
- No hay sesión de servidor: `app/session-context.tsx` guarda el usuario/
  workspace/collection activos solo en memoria de React (se pierde al
  refrescar). `users.password` se guarda en texto plano.

### Relación entre entidades

```
users ──1:N── workspaces ──1:N── collections ──1:N── schemas
                   │                   │                │
                   │                   │                └─┬─1:N─ records
                   │                   └───────────────────┘
                   └──1:N── apiKeys (scope por collection.slug dentro del workspace)
```

### Gaps encontrados en el modelo actual (independientes del motor de storage)

1. **Unicidad de `slug` resuelta en la app, no en el storage.**
   `createSluggedResponse` lista los "hermanos" (mismo `ownerId` o
   `workspaceId`), compara localmente y luego inserta. Esto solo es seguro hoy
   porque `withLock` serializa *todas* las escrituras del proceso — es una
   condición de carrera (TOCTOU) si alguna vez hay conexiones concurrentes
   reales, como pasaría con Postgres.
2. **No hay cascada de borrado.** Borrar un workspace no borra sus
   collections/schemas/records; quedan huérfanos. Postgres va a forzar una
   decisión explícita (`CASCADE` / `RESTRICT`) al definir las FKs.
3. **Passwords en texto plano.** No es responsabilidad de esta migración
   arreglarlo, pero es un vecino directo del futuro sistema de auth.
4. **Sin sesión de servidor / auth real.** El "usuario actual" es un adorno de
   UI en el cliente, no un principal de seguridad.

## 2. Decisiones tomadas para esta fase

- **Alcance: solo entorno local / desarrollo.** La elección de proveedor de
  Postgres para producción (Neon, Supabase, RDS, self-hosted, etc.) se pospone
  a cuando se defina el despliegue. Localmente: Postgres vía Docker Compose.
- **Sin script de migración de datos.** El contenido actual de
  `data/jsonify.json` es solo data de prueba; no hace falta preservarlo. El
  cutover puede ser directo (crear el schema vacío en Postgres y seguir).
- **Driver:** `drizzle-orm/node-postgres` sobre `pg`, el driver estándar para
  Postgres local/self-hosted. Como la capa de acceso a datos queda detrás de
  repositorios (ver más abajo), cambiar de driver más adelante para adaptarse
  a un proveedor serverless (p. ej. `@neondatabase/serverless` en Vercel) es un
  cambio aislado a la capa de infraestructura, no a la lógica de negocio.
- **Gestión de schema:** migraciones versionadas con `drizzle-kit` (SQL
  generado y commiteado), no DDL manual ni `push` directo a producción.

### Decisión de arquitectura: desacoplar detrás de repositorios

Para cumplir con "código lo más desacoplado posible": en vez de que las route
handlers importen `db` y las tablas de Drizzle directamente, se introduce una
capa de repositorios con una interfaz por entidad (`UserRepository`,
`WorkspaceRepository`, `CollectionRepository`, `SchemaRepository`,
`RecordRepository`, `ApiKeyRepository`), análoga en espíritu al actual
`CollectionName`-keyed store pero tipada por entidad en vez de genérica por
string.

```
route handlers / server actions
        │  (dependen de interfaces, no de Drizzle)
        ▼
  Repository interfaces  (lib/server/repositories/*.ts)
        │
        ▼
  Implementación Drizzle  (lib/server/db/*.ts)
        │
        ▼
     Postgres
```

Razones:
- Los route handlers y componentes de servidor dejan de saber que existe
  Drizzle o Postgres; solo conocen la forma de la entidad y las operaciones
  disponibles.
- Facilita tests (se puede mockear el repositorio) y un futuro cambio de
  proveedor/driver sin tocar lógica de negocio.
- Reemplaza naturalmente los "gaps" del punto 1: las comprobaciones de slug
  único y las reglas de cascada se expresan como constraints de Postgres
  (unique index compuesto, `onDelete`) en vez de chequeos manuales en la app.

## 3. Boceto de tablas (Drizzle) — a validar en el diseño real del change

| Tabla | Columnas clave | Constraints que hoy NO existen y se añaden |
|---|---|---|
| `users` | id uuid pk, name, email, password_hash | unique(email) |
| `workspaces` | id, name, slug, owner_id fk→users | unique(owner_id, slug) |
| `collections` | id, name, slug, workspace_id fk, description, is_public | unique(workspace_id, slug), fk on delete cascade |
| `schemas` | id, name, schema **jsonb**, workspace_id fk, collection_id fk | fk(collection_id) on delete cascade |
| `records` | id, name, collection_id fk, schema_id fk, schema_name, values **jsonb** | fk(collection_id) on delete cascade |
| `api_keys` | id, name, workspace_id fk, key_hash, key_prefix, scopes text[]/jsonb, last_used_at | unique(key_hash), fk on delete cascade |

`schema.schema` y `records.values` se mantienen como `jsonb`: son JSON Schema y
payloads definidos libremente por el usuario final (el corazón del producto),
no deben convertirse en columnas relacionales fijas. Ajv sigue validando en la
capa de aplicación exactamente como hoy.

## 4. Anotaciones para más adelante (no se resuelven en esta exploración)

### Nota — user story pendiente: migrar la suite de tests a Postgres

Hoy `lib/server/json-store.test.ts` logra aislamiento perfecto apuntando
`JSONIFY_DATA_DIR` a un `mkdtemp` por test. Con Postgres hace falta una
estrategia equivalente (Postgres real en Docker + rollback por test en una
transacción, o algo embebido tipo `pglite` para no depender de un servicio
externo en CI). **Crear una user story separada para esto** cuando se aborde
la migración; no se resuelve en este documento.

### Nota — reevaluar gaps cuando se implemente autenticación

El usuario indicó que es posible que el sistema de autenticación se implemente
**antes** que esta migración a Postgres. Cuando se aborde el auth, revisar y
decidir explícitamente qué pasa con los siguientes gaps (algunos listados en
la sección 1, otros que interactúan directamente con el diseño de auth):

- Hash de `password` (hoy texto plano) y qué mecanismo de auth se usa (sesión
  de servidor, JWT, cookies) — esto define si `users` necesita columnas
  adicionales (p. ej. tokens de sesión, proveedor de auth) antes de fijar el
  schema de Postgres.
- Si el auth introduce un concepto real de "usuario autenticado", revisar si
  las reglas de scope de `api_keys` (hoy por `workspaceId` + slug de
  collection) siguen siendo suficientes o necesitan ligarse a permisos de
  usuario.
- Confirmar en ese momento las reglas de cascada de borrado (sección 3) contra
  los requisitos reales de auth/autorización (p. ej. ¿borrar un usuario debe
  borrar sus workspaces, o transferirlos?).
- Revisar si conviene introducir el auth *antes* de fijar el schema de
  Postgres para no tener que migrar el schema dos veces.

## 5. No-goals de esta fase

- No se decide proveedor de Postgres para producción.
- No se escribe script de migración/importación de `data/jsonify.json`.
- No se implementa autenticación (es un change separado, potencialmente antes
  que este).
- No se escribe código todavía — este documento es insumo para un futuro
  change de OpenSpec (`proposal.md` / `design.md` / `specs/`) cuando se decida
  secuenciar este trabajo.
