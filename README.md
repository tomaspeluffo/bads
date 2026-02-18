# Bads

SaaS para agencias de automatizaciones y desarrollo. Centraliza las iniciativas de los clientes, gestiona el plan de implementación y coordina el desarrollo con agentes de IA.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express + TypeScript |
| Frontend | React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui |
| Base de datos | PostgreSQL (Supabase) — pg + raw SQL |
| Auth | JWT custom (bcryptjs + jsonwebtoken) |
| IA | Claude API (Anthropic) |
| State | Tanstack Query |
| Jobs | BullMQ + Redis |

---

## Estructura

```
apps/
  api/          — Backend Express + TypeScript
    src/
      agents/   — Agentes de IA (planner, decomposer, chat)
      api/      — Routers Express
      models/   — Schemas Zod + tipos
      queues/   — BullMQ handlers
      services/ — Lógica de negocio
    supabase/
      migrations/ — Migraciones SQL
  web/          — Frontend React
    src/
      components/ — Componentes reutilizables
      hooks/      — Tanstack Query hooks
      lib/        — API client, auth helpers
      pages/      — Páginas de la app
      types/      — Tipos compartidos
```

---

## Comandos

```bash
# Desarrollo
pnpm dev          # Levanta api + web en paralelo
pnpm dev:api      # Solo backend
pnpm dev:web      # Solo frontend

# Build
pnpm build        # Build completo

# Verificación (correr antes de commitear)
cd apps/api && npm run lint      # tsc --noEmit
cd apps/web && npm run lint      # tsc --noEmit
```

---

## Flujo de una iniciativa

```
pitch subido
    │
    ▼
[planning] — agente planner corre
    │
    ├─ needs_info → usuario responde preguntas → [planning] (loop)
    │
    └─ plan_review → usuario lee y aprueba el plan
                         │
                         ▼
                     [planned] — features creadas en DB
                         │
                         ▼
                   usuario descompone features en tareas
                         │
                         ▼
                     [in_progress] → [completed]
```

### Statuses de iniciativa

| Status | Descripción |
|--------|-------------|
| `pending` | Recién creada, en cola |
| `planning` | Agente planner corriendo |
| `needs_info` | Planner necesita más info del cliente |
| `plan_review` | Plan generado, esperando aprobación del usuario |
| `planned` | Plan aprobado, features en DB |
| `in_progress` | Desarrollo en curso |
| `completed` | Todos los PRs mergeados |
| `failed` | Error en el pipeline |
| `cancelled` | Cancelada manualmente |

---

## Features de la UI — Detalle de Iniciativa

### Tab Plan
- Resumen del plan generado por el agente
- Lista expandible de features con descripción, user story, criterios de aceptación y contexto técnico
- Badges de complejidad: **baja** (verde), **media** (naranja), **alta** (rojo)
- Botón **Aprobar plan** (visible cuando status es `plan_review`) → crea las features en DB
- Botón **Consultar al planificador** → chat para discutir/cuestionar decisiones técnicas
  - El último mensaje del agente puede usarse como contexto para replanificar

### Tab Features
- Kanban con las features de la iniciativa
- Botón para descomponer cada feature en tareas (requiere repo configurado)

### Tab Tareas
- Kanban con todas las tareas de la iniciativa

---

## Multi-tenancy

Todas las queries filtran por `org_id`. El `org_id` viene siempre del contexto autenticado, nunca del request body.

---

## Reglas de desarrollo

- No modificar el schema sin migración explícita
- No instalar dependencias sin consenso
- No exponer API keys en frontend
- Todo texto visible en español
- Separar en capas: router → controller → service → repository
