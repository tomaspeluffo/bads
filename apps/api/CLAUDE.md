# Backend — Express + TypeScript

## Estructura de un endpoint

Cada endpoint sigue este patrón:

1. Router en `src/api/{dominio}.ts`
2. Schemas Zod para request/response en `src/models/`
3. Business logic en `src/services/`
4. (Opcional) Acceso a datos en `src/repositories/`
5. El router solo valida y delega al service
6. Manejo de errores centralizado vía middleware

⚠️ No colocar lógica de negocio en los routers.

---

## Database

- Usamos `pg` (node-postgres) con raw SQL para todas las queries
- El cliente está en `src/lib/db.ts` — exporta `query()` y `pool`
- El schema está en `/schema.sql` — es la source of truth
- SIEMPRE incluir `org_id` en `WHERE` clauses
- Nunca confiar en `org_id` enviado desde el frontend
- El `org_id` debe provenir del usuario autenticado

### Reglas importantes

- Toda tabla multi-tenant debe tener `org_id`
- Nunca hacer queries sin filtrar por organización
- Validar ownership antes de devolver recursos

---

## AI Pipeline

- Usamos Anthropic SDK para Node (`@anthropic-ai/sdk`)
- Las llamadas a Claude se hacen exclusivamente desde el backend
- Nunca exponer API keys en frontend
- Reducir payload antes de enviarlo al modelo
- Mantener prompts concisos y deterministas

Patrón recomendado:

- Service dedicado para AI (`src/services/ai/`)
- Funciones puras que:
  1. Construyen prompt
  2. Llaman al modelo
  3. Validan respuesta
  4. Transforman a tipo interno

---

## Dependencias principales

- express
- typescript
- zod
- pg (node-postgres)
- bcryptjs + jsonwebtoken (auth)
- @anthropic-ai/sdk
- dotenv
- pino o winston (logging)

Si hay background jobs:

- bullmq + redis (si aplica)

---

## Tipado

- `tsconfig` debe tener `"strict": true`
- No usar `any`
- Todos los services deben tener tipos explícitos de input y output
- Responses deben estar tipadas
- Validar input con Zod antes de entrar al service

---

## Error Handling

- Middleware centralizado de manejo de errores
- No exponer stack traces en producción
- Normalizar formato de errores (ej: `{ error: string }`)
- Mapear errores de DB a errores HTTP coherentes

---

## Seguridad

- Validar todo input
- No confiar en datos del cliente
- No retornar información sensible
- No loggear secretos ni tokens

---

## Tests

- Framework recomendado: Vitest o Jest
- Tests en `tests/` o junto al módulo
- Mockear:
  - Llamadas a Claude API
  - Postgress
  - Servicios externos

Tipos de tests:

- Unit tests para services
- Integration tests para endpoints críticos

---

## Convenciones

- Archivos en `snake_case` o `camelCase`
- Servicios nombrados `{dominio}.service.ts`
- Routers `{dominio}.router.ts`
- Schemas en `models/`
- No modificar `/schema.sql` sin migración explícita

---

## Verificación antes de commit

- `npm run typecheck`
- `npm run lint`
- `npm test`

No hacer commit si algo falla.
