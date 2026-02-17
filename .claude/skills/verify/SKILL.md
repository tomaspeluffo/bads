---
name: verify
description: Run typecheck, lint, and tests on both backend and frontend after code changes
disable-model-invocation: true
---

Ejecuta la secuencia de verificación completa del proyecto después de cambios en el código.

## Secuencia de verificación

Ejecuta en orden (detener si alguno falla):

### Backend (`apps/api`)

```bash
cd apps/api && npm run typecheck
cd apps/api && npm run lint
cd apps/api && npm test
```

### Frontend (`apps/web`)

```bash
cd apps/web && npm run typecheck
cd apps/web && npm run lint
cd apps/web && npm test
```

## Qué verificar manualmente

Además de los comandos anteriores, confirmá que:

- [ ] No hay `any` nuevo en el código TypeScript
- [ ] Todo endpoint nuevo tiene validación Zod
- [ ] Las queries SQL usan parámetros (`$1`, `$2`), nunca interpolación
- [ ] El `client_id` viene del contexto autenticado, no del request body
- [ ] No hay lógica de negocio dentro de routers (sólo en services)
- [ ] Las respuestas de error no exponen stack traces

## Si algo falla

1. Leer el error completo
2. Identificar el archivo y línea
3. Corregir el problema en el código fuente
4. Volver a correr la verificación completa
5. No usar flags `--no-verify` ni `--force`
