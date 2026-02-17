---
name: new-endpoint
description: Create a new API endpoint in the bads backend following the router → validate → asyncHandler → service pattern
argument-hint: "<resource> <method> <path> - e.g. 'initiatives GET /initiatives/:id'"
---

Crea un nuevo endpoint en el backend (`apps/api/src/`) siguiendo la arquitectura del proyecto.

## Qué crear

El argumento describe el endpoint: `$ARGUMENTS`

## Pasos

1. **Zod schema** en `apps/api/src/models/api-schemas.ts`
   - Si el endpoint tiene body: exportar schema `Create<Resource>Body = z.object({...})`
   - Si tiene params: exportar schema `<Resource>IdParams = z.object({ <resource>Id: z.string().uuid() })`
   - Si tiene query params: exportar schema `List<Resource>Query = z.object({...})`
   - Siempre exportar el tipo inferido: `export type Foo = z.infer<typeof Foo>`

2. **Service function** en `apps/api/src/services/<resource>.service.ts`
   - Usar `query<T>()` de `../lib/db.js` con SQL parametrizado
   - Tipar el retorno explícitamente
   - Filtrar siempre por `client_id` cuando el recurso pertenece a un cliente
   - Nunca confiar en datos del request body para ownership — usar contexto autenticado

3. **Router** en `apps/api/src/api/<resource>.ts`
   - Importar `Router` de `express`
   - Aplicar `authMiddleware` de `../middleware/auth.js`
   - Aplicar `validate({ body, params, query })` de `../middleware/validate.js`
   - Envolver handler en `asyncHandler` de `../middleware/error-handler.js`
   - Lanzar `AppError(404, "mensaje")` si el recurso no existe
   - Responder con `res.json({ data: ... })` para listas, `res.json(item)` para uno, `res.status(201).json(item)` para creación

4. **Registrar** el router en `apps/api/src/index.ts` si es un router nuevo

## Reglas críticas

- NO usar `any`
- `org_id` / `client_id` viene del contexto autenticado, nunca del body
- Toda query SQL debe usar parámetros (`$1`, `$2`, etc.) — nunca interpolación de strings
- Validar ownership antes de devolver el recurso

## Ejemplo de router

```typescript
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler, AppError } from "../middleware/error-handler.js";
import { CreateFooBody, FooIdParams } from "../models/api-schemas.js";
import * as fooService from "../services/foo.service.js";

export const fooRouter = Router();

fooRouter.get("/foos", authMiddleware, asyncHandler(async (_req, res) => {
  const foos = await fooService.listFoos();
  res.json({ data: foos });
}));

fooRouter.post("/foos", authMiddleware, validate({ body: CreateFooBody }), asyncHandler(async (req, res) => {
  const data = req.body as CreateFooBody;
  const foo = await fooService.createFoo(data);
  res.status(201).json(foo);
}));

fooRouter.get("/foos/:fooId", authMiddleware, validate({ params: FooIdParams }), asyncHandler(async (req, res) => {
  const { fooId } = req.params as unknown as { fooId: string };
  const foo = await fooService.getFooById(fooId);
  if (!foo) throw new AppError(404, "No encontrado");
  res.json(foo);
}));
```

## Verificación

Cuando termines, ejecuta:
```
cd apps/api && npm run typecheck && npm run lint
```
