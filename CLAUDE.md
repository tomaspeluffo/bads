# Bads

## Qué es este proyecto
SaaS para agencias de automatizaciones y desarrollo. Centraliza las iniciativas de los clientes, 
tareas y desarrolla dichas tareas. 

---

## Stack

- Backend: Node.js + Express + TypeScript
- Frontend: React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui
- Database: PostgreSQL local (pg + raw SQL)
- Auth: Custom JWT (bcryptjs + jsonwebtoken)
- AI: Claude API (Anthropic) para entity extraction
- State: Tanstack Query para data fetching

---

## Estructura

- `/backend` — API en Express + TypeScript
- `/frontend` — SPA en React
- `/schema.sql` — Schema de la base de datos (source of truth)
- `/SPEC.md` — Especificación funcional del producto
- `/ARCHITECTURE.md` — Arquitectura técnica y flujos de datos

---

## Comandos clave

- Backend dev: `cd backend && npm run dev`
- Backend build: `cd backend && npm run build`
- Frontend: `cd frontend && npm run dev`
- Tests backend: `cd backend && npm test`
- Tests frontend: `cd frontend && npm test`
- Lint backend: `cd backend && npm run lint`
- Lint frontend: `cd frontend && npm run lint`
- Types frontend: `cd frontend && npm run typecheck`
- Types backend: `cd backend && npm run typecheck`

---

## Reglas de código

### Backend

- Usar TypeScript estricto (`strict: true`)
- No usar `any`
- Separar en capas: router → controller → service → repository (si aplica)
- Validar input con Zod
- Todo endpoint debe retornar tipos explícitos
- Manejo centralizado de errores (middleware)
- No lógica de negocio dentro de routers

### Frontend

- Componentes funcionales con hooks
- No class components
- Data fetching solo con Tanstack Query
- No fetch directo dentro de componentes
- Tipar todas las respuestas de API
- Mantener componentes pequeños y reutilizables

### General

- Nombrar archivos en:
  - `kebab-case` o `camelCase` para backend
  - `PascalCase` para React components
- Todo texto visible al usuario debe estar en español
- No instalar dependencias sin preguntar primero
- No modificar schema sin migración explícita

---

## Multi-tenancy

Todas las queries DEBEN filtrar por `org_id`.

- Nunca hacer queries sin considerar la organización del usuario.
- El `org_id` debe venir del contexto autenticado (no del request body).
- Validar ownership antes de devolver recursos.

---

## Base de datos

- `/schema.sql` es la fuente de verdad.
- Toda modificación debe hacerse vía migración.
- No hardcodear queries sin índices adecuados.
- Usar `UUID` como PK.
- Timestamps siempre con `created_at` y `updated_at`.

---

## Verificación

Después de cambios en backend:
- `npm run typecheck`
- `npm run lint`
- `npm test`

Después de cambios en frontend:
- `npm run typecheck`
- `npm run lint`
- `npm test`

---

## AI Usage

- Claude se usa para entity extraction e insights.
- Nunca enviar datos innecesarios al modelo.
- Reducir payloads antes de llamar a la API.
- No exponer claves de API en frontend.
- Toda llamada a AI debe pasar por backend.

---

## Seguridad

- Nunca confiar en datos del cliente.
- Validar todo input.
- No exponer stack traces en producción.
- No retornar información sensible en errores.

---

## MVP Constraints

- No WebSockets (usar polling si es necesario).
- Mantener arquitectura simple.
- Priorizar claridad sobre abstracción excesiva.
