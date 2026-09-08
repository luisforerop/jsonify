# Migración a Postgres + Drizzle — notas de exploración

Fecha: 2026-09-05
Estado: exploración con requerimientos técnicos definitivos (aún no se ha creado
un change de OpenSpec)

Este documento captura el análisis de cómo fluyen los datos hoy en Jsonify
(storage en archivo JSON) y cómo se ve la migración a Postgres usando Drizzle
ORM. La secuenciación ya está resuelta: **la autenticación (Clerk) y el manejo
de API Keys ya están implementados en `main`** (commits `5d122b2` y `a4ca0e9`),
así que esta migración se diseña sobre ese estado, no antes de él.

## 0. Contexto y premisas de dominio (definitivas)

- **Autenticación de usuarios: YA implementada vía Clerk.** Clerk se usa
  *exclusivamente* para identidad. El identificador es el `clerk_user_id`
  (formato `user_2x…`), que se modela como **`text`** y es la PK de `users`.
  No hay contraseñas, tokens de sesión ni columnas de proveedor de auth en la
  base de datos: eso vive en Clerk. Hoy `lib/server/require-auth.ts` resuelve
  `auth()` → `userId` y `lib/server/user-profile.ts` mantiene una fila-caché
  local de perfil (`ensureUserProfile`) en la primera request autenticada.
  Esa fila-caché se convierte en la tabla `users` real de Postgres.
- **Multi-tenancy: CUSTOM.** Se descarta Clerk Organizations / `org_id`. El
  tenant se gestiona internamente:
  - `workspaces` es la unidad de tenant.
  - la membresía y los roles se modelan con `workspace_members` (relacional).
  - las invitaciones también serán relacionales (no un flujo de Clerk), pero
    **no entran en este change** — ver
    `docs/notes/workspace-invitations.md`.
- **Autenticación Machine-to-Machine (M2M): YA implementada vía API Keys a
  nivel de Workspace.** `lib/server/api-keys.ts` genera la clave (`jfy_…`),
  guarda `keyHash` (sha256) + `keyPrefix` y valida scopes con el patrón
  `(*|(read|write|delete):(*|<slug>))`. `lib/server/public-api-context.ts`
  resuelve el contexto público (`x-workspace-id`, `x-schema`,
  `Authorization: Bearer`) leyendo el store directamente. Esa resolución debe
  pasar a apoyarse en los repositorios (§3).
- **Testing: CANCELADO para esta fase.** No se crean suites de tests
  unitarios ni de integración de base de datos como parte de esta migración.
  La nota previa sobre "migrar la suite de tests a Postgres" queda **anulada**
  (ver §5). Los tests actuales que dependen de `JSONIFY_DATA_DIR` +
  `mkdtemp` seguirán existiendo hasta que se retire `json-store`, pero
  adaptarlos no es un entregable de esta fase.

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
- La identidad ya es real (Clerk); lo que sigue siendo frágil es la
  **persistencia**: sin sesión de servidor persistente para el estado de UI
  (`app/session-context.tsx` guarda workspace/collection activos solo en
  memoria de React) y sin constraints en el storage.

### Relación entre entidades (destino)

```
users ──1:N── workspaces ──1:N── collections ──1:N── schemas
  │              │  │  │              │                │
  │              │  │  │              │                └─1:N─ records
  │              │  │  │              └──────────────────────┘ (records.collection_id)
  │              │  └──1:N── api_keys
  │              └──1:N── workspace_members ──N:1── users
  └──(owner_id) workspaces.owner_id
```

`records` referencia además `workspace_id` directamente (además de
`collection_id` y `schema_id`) para poder filtrar por tenant sin joins.

### Gaps del modelo actual y su resolución en esta fase

1. **Unicidad de `slug` resuelta en la app, no en el storage.**
   `createSluggedResponse` lista los "hermanos" y compara localmente; hoy solo
   es seguro porque `withLock` serializa *todo* el proceso — TOCTOU en cuanto
   haya concurrencia real.
   → **Resuelto:** `unique index` compuesto en Postgres
   (`workspaces (owner_id, slug)`; `collections (workspace_id, slug)`;
   `workspace_members (workspace_id, user_id)`; `schemas (collection_id, name)`;
   `api_keys.key_hash`). El repositorio traduce la violación de unique a un
   error de dominio ("nombre ya usado aquí").
2. **No hay cascada de borrado.** Borrar un workspace deja
   collections/schemas/records huérfanos.
   → **Resuelto:** FKs con `onDelete` explícito (ver §2). Decisión base:
   `workspaces → collections → schemas → records` en cascada; `users` con
   `restrict` sobre `workspaces.owner_id`. El flujo de aplicación para borrar
   un usuario dueño (pre-check, transferencia de propiedad, flag de cascada
   explícita) queda **diferido** — ver
   `docs/notes/account-deletion-ownership-transfer.md`. La DB ya garantiza la
   integridad con el `RESTRICT`.
3. **Passwords en texto plano.** → **Ya no aplica.** Clerk es el sistema de
   auth; `users` no tiene contraseña.
4. **Sin sesión de servidor / auth real.** → **Ya no aplica** para identidad
   (Clerk). Persistir el estado de UI activo (workspace/collection) es un
   nice-to-have separado, fuera de alcance.

## 2. Especificación estricta de tablas en Drizzle (`db/schema.ts`)

Driver: `drizzle-orm/node-postgres` con cliente `pg`, preparado para
ejecución en Docker/VPS. El wiring vive en `db/` (`db/schema.ts`,
`db/client.ts`); las migraciones se generan y commitean con `drizzle-kit`
(SQL versionado, sin `push` directo a producción).

Convención de columnas comunes: `created_at timestamptz not null default now()`,
`updated_at timestamptz not null default now()` (el repositorio actualiza
`updated_at` en cada write). Los nombres de columna en Postgres van en
`snake_case`; los de la propiedad Drizzle en `camelCase`.

### 2.1 `users`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `text` **PK** | proveniente de Clerk (`user_2x…`); **no** autogenerada |
| `name` | `text` | |
| `email` | `text` | `unique` |

Sin contraseñas ni columnas de auth. Se puebla desde `ensureUserProfile`.

### 2.2 `workspaces`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` **PK** | `default gen_random_uuid()` |
| `name` | `text` | |
| `slug` | `text` | ver constraint |
| `ownerId` / `owner_id` | `text` | **FK → `users.id`**, `onDelete: 'restrict'` |

Constraint: `uniqueIndex(owner_id, slug)` — el slug es único **dentro de los
workspaces del mismo owner** (igual que hoy), no globalmente.

`onDelete: 'restrict'` sobre `owner_id` deja la puerta abierta a un servicio
de transferencia de propiedad / borrado de cuenta que **no** se especifica en
este change (ver `docs/notes/account-deletion-ownership-transfer.md`).

### 2.3 `workspace_members`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` **PK** | `default gen_random_uuid()` |
| `workspaceId` / `workspace_id` | `uuid` | **FK → `workspaces.id`**, `onDelete: 'cascade'` |
| `userId` / `user_id` | `text` | **FK → `users.id`**, `onDelete: 'cascade'` |
| `role` | `text` | `default 'member'` |

Constraint: `uniqueIndex(workspace_id, user_id)`.

Nota: el `owner` de un workspace debería tener también una fila aquí con
`role = 'owner'` (lo garantiza la capa de servicio al crear el workspace).

### 2.4 `collections`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` **PK** | `default gen_random_uuid()` |
| `workspaceId` / `workspace_id` | `uuid` | **FK → `workspaces.id`**, `onDelete: 'cascade'` |
| `name` | `text` | |
| `slug` | `text` | ver constraint |
| `description` | `text` | **nullable / opcional** — ayuda al usuario a documentar la collection |
| `isPublic` / `is_public` | `boolean` | `default false` |

Constraint: `uniqueIndex(workspace_id, slug)`.

`description` se conserva (ya existe hoy en el store) como columna opcional:
aporta contexto útil al usuario y no añade complejidad.

### 2.5 `api_keys`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` **PK** | `default gen_random_uuid()` |
| `workspaceId` / `workspace_id` | `uuid` | **FK → `workspaces.id`**, `onDelete: 'cascade'` |
| `keyHash` / `key_hash` | `text` | `unique` |
| `keyPrefix` / `key_prefix` | `text` | para mostrar en UI |
| `scopes` | `jsonb` | array de strings (p. ej. `["read:*", "write:posts"]`) |

Campos operativos que ya se usan hoy y conviene conservar: `name text`,
`lastUsedAt / last_used_at timestamptz` nullable (lo escribe
`resolvePublicContext` de forma best-effort).

### 2.6 `schemas`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` **PK** | `default gen_random_uuid()` |
| `collectionId` / `collection_id` | `uuid` | **FK → `collections.id`**, `onDelete: 'cascade'` |
| `name` | `text` | asignado por el usuario (p. ej. `"v1"`, `"v2"`) |
| `schemaDefinition` / `schema_definition` | `jsonb` | el JSON Schema |
| `isActive` / `is_active` | `boolean` | `default true` |

Constraint: `uniqueIndex(collection_id, name)`.

Cambios vs. hoy: la columna `schema` pasa a llamarse `schema_definition`;
se añade `is_active`; se elimina cualquier `workspace_id` en esta tabla
(se llega al workspace vía `collection`). `validate-payload.ts` debe leer
`schemaDefinition` en vez de `schema`.

### 2.7 `records`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` **PK** | `default gen_random_uuid()` |
| `workspaceId` / `workspace_id` | `uuid` | **FK → `workspaces.id`**, `onDelete: 'cascade'` |
| `collectionId` / `collection_id` | `uuid` | **FK → `collections.id`**, `onDelete: 'cascade'` |
| `schemaId` / `schema_id` | `uuid` | **FK → `schemas.id`**, `onDelete: 'restrict'` (no borrar un schema con records; decisión de servicio) |
| `payload` | `jsonb` | **índice GIN** (`create index … using gin (payload)`) |

Cambios vs. hoy: `values` → `payload`; se añade `workspace_id` denormalizado
para filtrar por tenant sin join; desaparecen `name` y `schema_name`
(el nombre del schema se resuelve vía `schema_id`).

Consecuencia en specs: el requisito "Identify saved records by name" de
`schema-form-filler` se elimina — los records guardados ya no llevan un nombre
dado por el usuario; se identifican por su schema y su fecha.

### 2.8 `payload` y `schema_definition` siguen siendo `jsonb`

Son JSON Schema y payloads definidos libremente por el usuario final (el
corazón del producto); no se relacionalizan. Ajv sigue validando en la capa de
aplicación exactamente como hoy. El índice GIN sobre `records.payload` habilita
filtros/consultas por contenido más adelante sin cambio de schema.

### 2.9 `invitations` — fuera de alcance

Las invitaciones de workspace **no entran en este change**. La tabla, sus
constraints y el flujo de aceptación se especifican en
`docs/notes/workspace-invitations.md`. `workspace_members` (§2.3) sí entra:
las membresías se pueden crear directamente (p. ej. añadiendo al owner al
crear el workspace) sin necesidad del flujo de invitación.

## 3. Arquitectura y entregables

### 3.1 Capa de repositorios (interfaces primero)

Entregable #1: **interfaces TypeScript desacopladas en
`lib/server/repositories/`**, definidas *antes* de escribir persistencia con
Drizzle. Las route handlers y server actions dependen de estas interfaces, no
de `db` ni de las tablas de Drizzle.

```
route handlers / server actions / public-api-context
        │  (dependen de interfaces, no de Drizzle)
        ▼
  Repository interfaces        lib/server/repositories/<entity>.ts
        │
        ▼
  Implementación Drizzle       lib/server/repositories/drizzle/<entity>.ts
        │
        ▼
  db (schema + cliente pg)     db/schema.ts, db/client.ts
        │
        ▼
     Postgres (Docker / VPS)
```

Interfaces por entidad:

- `UserRepository`
- `WorkspaceRepository`
- `WorkspaceMemberRepository`
- `CollectionRepository`
- `SchemaRepository`
- `RecordRepository`
- `ApiKeyRepository`

(`InvitationRepository` queda fuera — ver `docs/notes/workspace-invitations.md`.)

Cada interfaz expone operaciones tipadas por entidad (`findById`, `list`,
`create`, `update`, `delete`, más las específicas: `WorkspaceRepository
.findBySlug`, `ApiKeyRepository.findByHash`, `SchemaRepository
.listByCollection`, etc.). Reemplaza al store genérico `CollectionName`-keyed.

Reglas de dominio que dejan de vivir en la app y pasan a constraints:
unicidad de slug (unique index compuesto) y cascada de borrado (`onDelete`).
El repositorio Drizzle traduce violaciones de constraint a errores de dominio.

### 3.2 Driver y despliegue

- **Driver:** `drizzle-orm/node-postgres` con cliente `pg`. Un único `Pool`
  de `pg` en `db/client.ts`, configurado desde `DATABASE_URL`.
- **Destino:** ejecución en **Docker / VPS** (no serverless). Localmente,
  Postgres vía Docker Compose. La elección de proveedor gestionado para
  producción queda abierta, pero el driver `node-postgres` + `pg` es
  compatible con cualquier Postgres self-hosted o gestionado con conexión
  TCP estándar.
- **Migraciones:** `drizzle-kit generate` → SQL versionado y commiteado;
  `drizzle-kit migrate` en el arranque/deploy. Sin `push` directo.
- Cambiar a un driver serverless en el futuro (p. ej.
  `@neondatabase/serverless`) sería un cambio aislado a `db/client.ts` +
  la implementación Drizzle de los repos, sin tocar interfaces ni lógica de
  negocio.

### 3.3 Sin script de migración de datos

El contenido de `data/jsonify.json` es data de prueba; no se preserva. El
cutover es directo: crear el schema vacío en Postgres, apuntar los repos a
Drizzle y retirar `json-store`.

## 4. Orden de trabajo sugerido para el change

1. Docker Compose con Postgres + `DATABASE_URL` en `.env`.
2. `db/schema.ts` con las 7 tablas de §2 (`users`, `workspaces`,
   `workspace_members`, `collections`, `api_keys`, `schemas`, `records`) y
   `db/client.ts` con el `Pool` de `pg`.
3. `drizzle.config.ts` + primera migración generada y commiteada.
4. Interfaces de repositorio en `lib/server/repositories/` (entregable #1,
   sin implementación).
5. Implementación Drizzle en `lib/server/repositories/drizzle/`.
6. Reconectar consumidores:
   - `collection-handlers.ts` → repos por entidad.
   - `public-api-context.ts` → `WorkspaceRepository`, `CollectionRepository`,
     `SchemaRepository`, `ApiKeyRepository`.
   - `user-profile.ts` / `require-auth.ts` → `UserRepository`.
   - `api-keys/route.ts` → `ApiKeyRepository` + `WorkspaceRepository`.
   - `validate-payload.ts` → leer `schemaDefinition`.
7. Retirar `lib/server/json-store.ts` y `data/jsonify.json`.

## 5. No-goals de esta fase

- **No** se crean suites de tests unitarios ni de integración de base de datos
  (cancelado explícitamente). La antigua "user story para migrar la suite de
  tests a Postgres" queda anulada.
- **No** se decide proveedor de Postgres gestionado para producción (sí se
  fija el objetivo Docker/VPS con `node-postgres` + `pg`).
- **No** se escribe script de migración/importación de `data/jsonify.json`.
- **No** se toca la autenticación (Clerk) ni el mecanismo de API Keys: ambos
  ya están implementados y esta migración solo cambia dónde se persisten sus
  datos.
- **No** se implementan las invitaciones de workspace (tabla `invitations` ni
  su flujo de aceptación). Documentado como pendiente en
  `docs/notes/workspace-invitations.md`.
- **No** se implementa la capa de servicio de borrado de cuenta ni la
  transferencia de propiedad de workspace. El `ON DELETE RESTRICT` entra en el
  schema; el flujo de aplicación queda documentado como TODO en
  `docs/notes/account-deletion-ownership-transfer.md`.
