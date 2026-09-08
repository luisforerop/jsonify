# TODO — Borrado de cuenta y transferencia de propiedad de workspace

Fecha: 2026-09-05
Estado: **diferido** — no entra en la migración a Postgres + Drizzle
(`postgres-drizzle-migration.md`).

## Por qué está diferido

- El schema de Postgres **ya cubre la integridad**: `workspaces.owner_id` es
  `text FK → users.id` con `ON DELETE RESTRICT`. Postgres impide dejar
  workspaces sin dueño.
- Lo único que falta es la **capa de servicio + contrato de API** para que un
  intento de borrar una cuenta con workspaces devuelva un error de dominio
  limpio en vez de una violación de FK genérica.
- A corto plazo el producto no se comercializa y no hay flujo de "eliminar mi
  cuenta", así que el peor caso real hoy es un `500` en un endpoint que aún no
  existe. No justifica ensanchar el change de migración.

## Qué hay que hacer cuando se retome (spec para el futuro change)

### 1. Error de dominio

```typescript
// lib/domain/errors/user-errors.ts
export class UserIsWorkspaceOwnerError extends Error {
  readonly code = "USER_IS_WORKSPACE_OWNER";
  constructor(public readonly workspaceIds: string[]) {
    super(
      `No se puede eliminar el usuario. Es propietario de los workspaces: ${workspaceIds.join(", ")}`,
    );
  }
}
```

### 2. Regla de servicio (`UserService.deleteAccount`)

```typescript
// lib/server/services/user-service.ts
async function deleteAccount(
  userId: string,
  options?: { forceCascadeWorkspaces?: boolean },
) {
  const ownedWorkspaces = await workspaceRepo.findByOwnerId(userId);

  if (ownedWorkspaces.length > 0) {
    if (!options?.forceCascadeWorkspaces) {
      // Pre-check: bloquea antes de tocar la DB para no depender de la
      // excepción de Postgres por RESTRICT.
      throw new UserIsWorkspaceOwnerError(ownedWorkspaces.map((w) => w.id));
    }
    for (const ws of ownedWorkspaces) {
      await workspaceRepo.delete(ws.id); // dispara CASCADE en la DB
    }
  }

  await userRepo.delete(userId);
}
```

Requiere en `WorkspaceRepository` un método `findByOwnerId(userId)` (hoy no
está en la lista de operaciones del repo — añadirlo entonces).

### 3. Endpoints

| Endpoint | Método | Propósito | Respuesta |
|---|---|---|---|
| `/api/v1/workspaces/:id/transfer` | `POST` | Transferir propiedad a otro miembro (`{ newOwnerId }`). El nuevo dueño debe existir en `workspace_members`. | `200 OK` |
| `/api/v1/users/me` | `DELETE` | Eliminar cuenta con pre-check. Acepta `{ forceCascadeWorkspaces?: boolean }`. | `204 No Content` / `409 Conflict` con `code: "USER_IS_WORKSPACE_OWNER"` y `workspaceIds` |

`transferOwnership` también debe actualizar/crear la fila de
`workspace_members` del nuevo dueño con `role = 'owner'` y degradar la del
anterior.

### 4. Nota sobre Clerk

Borrar la cuenta en Jsonify no borra el usuario en Clerk (y viceversa). Definir
en ese momento si:
- se dispara desde un webhook `user.deleted` de Clerk, o
- el endpoint `DELETE /api/v1/users/me` llama también a la Backend API de Clerk
  para borrar la identidad.

## Regla de servicio (resumen para copiar al futuro change)

> **`UserService` — borrado de cuenta:** la eliminación de un usuario hace un
> pre-check de propiedad de workspaces. Si posee workspaces, la API responde
> `409` con `code: "USER_IS_WORKSPACE_OWNER"` y la lista de `workspaceIds`. El
> cliente debe llamar `POST /workspaces/:id/transfer` para cada uno o reenviar
> el `DELETE` con `forceCascadeWorkspaces: true`.
