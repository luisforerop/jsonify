# TODO — Invitaciones de workspace (multi-tenancy custom)

Fecha: 2026-09-05
Estado: **diferido** — no entra en la migración a Postgres + Drizzle
(`postgres-drizzle-migration.md`).

## Por qué está diferido

- El multi-tenancy custom se apoya en `workspaces` + `workspace_members`; ese
  par sí entra en la migración. Las membresías se pueden crear directamente
  (añadir al owner al crear el workspace, o añadir miembros a mano), así que
  **no hay un bloqueo funcional** por no tener invitaciones todavía.
- El flujo de invitación es un mini-feature con su propia superficie: tabla,
  generación/validación de token, endpoints de crear/listar/revocar/aceptar,
  expiración y (probablemente) envío de email. Meterlo en el change de
  persistencia lo ensancha sin necesidad.

## Spec preliminar para el futuro change

### Tabla `invitations`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` **PK** | `default gen_random_uuid()` |
| `workspaceId` / `workspace_id` | `uuid` | **FK → `workspaces.id`**, `onDelete: 'cascade'` |
| `email` | `text` | destinatario (puede aún no tener cuenta en Jsonify) |
| `role` | `text` | `default 'member'` — el rol con el que entrará a `workspace_members` |
| `token` | `text` | `unique` — para el link de aceptación |
| `invitedBy` / `invited_by` | `text` | **FK → `users.id`** |
| `status` | `text` | `pending` / `accepted` / `revoked` / `expired` |
| `expiresAt` / `expires_at` | `timestamptz` | |
| `createdAt` / `updatedAt` | `timestamptz` | convención común |

Constraint sugerido: índice único parcial `(workspace_id, lower(email))` para
`status = 'pending'` (evita dos invitaciones vivas al mismo email en el mismo
workspace).

### `InvitationRepository`

Interfaz en `lib/server/repositories/invitation.ts`:
`create`, `findByToken`, `listByWorkspace`, `revoke`, `markAccepted`.

### Endpoints

| Endpoint | Método | Propósito | Respuesta |
|---|---|---|---|
| `/api/v1/workspaces/:id/invitations` | `POST` | Crear invitación (`{ email, role? }`). Requiere rol owner/admin en el workspace. | `201 Created` |
| `/api/v1/workspaces/:id/invitations` | `GET` | Listar invitaciones pendientes del workspace. | `200 OK` |
| `/api/v1/workspaces/:id/invitations/:invId` | `DELETE` | Revocar. | `204 No Content` |
| `/api/v1/invitations/:token/accept` | `POST` | El invitado autenticado (Clerk) acepta: valida token + expiración, crea la fila en `workspace_members`, marca `accepted`. | `200 OK` |

### Reglas de servicio

- Aceptar exige que el `email` de la invitación coincida con el email del
  usuario autenticado en Clerk (o decidir explícitamente permitir aceptar con
  cualquier cuenta que tenga el link).
- Al aceptar: transacción que inserta en `workspace_members` (respetando
  `uniqueIndex(workspace_id, user_id)` — si ya es miembro, marcar la
  invitación `accepted` sin duplicar) y actualiza `status`.
- Expiración: al leer una invitación `pending` con `expires_at` pasado,
  tratarla como `expired`.

### Fuera de alcance también de ese futuro change (a decidir entonces)

- Envío real de emails (se puede empezar devolviendo el link en la respuesta).
- Reenviar / extender expiración de una invitación existente.
