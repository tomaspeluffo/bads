# BADS - Blumb Automated Development System

SaaS para agencias de automatizaciones y desarrollo. Centraliza las iniciativas de los clientes, las analiza con IA, y genera planes de implementación descompuestos en features y tasks.

## Cómo funciona

```
Pitch (brief del cliente)
         │
         ▼
   Pitch Agent ──► genera propuesta estructurada
         │
         ▼
   to-initiative ──► crea iniciativa y arranca el pipeline
         │
         ▼
   Planner Agent ──► analiza el pitch
         │
    ┌────┴────┐
    │         │
 ready    needs_info
    │         │
    │    devuelve preguntas
    │    (solo lógica de negocio)
    │         │
    │    User responde via /replan
    │         │
    └────┬────┘
         │
         ▼
   Plan creado (features ordenadas por dependencia)
         │
         ▼
   Task Decomposer ──► feature → tasks atómicas con rutas de archivos
         │
         ▼
   Tasks listas para desarrollo
```

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js + TypeScript |
| API | Express |
| Base de datos | Supabase (PostgreSQL) |
| Job Queue | BullMQ + Redis |
| AI | Anthropic Claude (Haiku) |
| Docs | Notion API o upload directo |
| Frontend | React + Vite + Tailwind CSS + shadcn/ui |

## Estructura del monorepo

```
bads/
├── apps/
│   ├── api/                        # Backend (Express + BullMQ)
│   │   ├── src/
│   │   │   ├── agents/             # Agentes IA (planner, task-decomposer, pitch)
│   │   │   ├── api/                # Route handlers
│   │   │   ├── config/             # Constantes y configuración
│   │   │   ├── lib/                # Clientes (anthropic, supabase, redis, etc.)
│   │   │   ├── middleware/         # Auth, validación, error handling
│   │   │   ├── models/             # Zod schemas y tipos de entidades
│   │   │   ├── queues/             # BullMQ queue, worker, job handlers
│   │   │   ├── services/           # Business logic
│   │   │   └── types/              # TypeScript types
│   │   └── supabase/migrations/    # Migraciones SQL (001–011)
│   └── web/                        # Frontend (React + Vite)
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Requisitos previos

- Node.js >= 18
- pnpm
- Redis (local, Docker, o cloud)
- Proyecto en Supabase
- Anthropic API key

## Setup

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar variables de entorno

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Sí | Clave anon/public de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Clave service role de Supabase |
| `ANTHROPIC_API_KEY` | Sí | API key de Anthropic |
| `REDIS_URL` | Sí | URL de Redis (default: `redis://localhost:6379`) |
| `NOTION_API_KEY` | Opcional | Solo para el flujo con Notion |
| `GITHUB_TOKEN` | Opcional | Para leer el árbol de archivos del repo al descomponer |

### 3. Correr migraciones

Ejecutar los archivos en orden desde el SQL Editor de Supabase:

`apps/api/supabase/migrations/001_bads_schema.sql` → `011_nullable_initiative_in_executions.sql`

> La migración `002` requiere ejecutarse en dos pasos (ver comentarios en el archivo).

### 4. Iniciar Redis

```bash
# Docker
docker run -d -p 6379:6379 redis
```

### 5. Desarrollo

```bash
pnpm dev        # API + web
pnpm dev:api    # Solo API
pnpm dev:web    # Solo web
```

La API corre en `http://localhost:3001`.

---

## API Endpoints

### Pitches

| Método | Path | Descripción |
|--------|------|-------------|
| `POST` | `/api/pitches` | Crea un pitch y encola la generación con IA |
| `GET` | `/api/pitches` | Lista pitches (paginado, filtrable por `clientId`) |
| `GET` | `/api/pitches/:pitchId` | Detalle de un pitch |
| `DELETE` | `/api/pitches/:pitchId` | Elimina un pitch (no permitido si ya fue convertido) |
| `POST` | `/api/pitches/:pitchId/to-initiative` | Convierte el pitch en una iniciativa y arranca el pipeline |

#### Crear pitch

```bash
curl -X POST http://localhost:3001/api/pitches \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sistema de facturación automática",
    "brief": "El cliente necesita automatizar el envío de facturas mensuales a sus clientes...",
    "clientId": "uuid-opcional"
  }'
```

El pitch agent genera automáticamente: resumen ejecutivo, problema, solución, enfoque técnico, entregables, métricas de éxito, riesgos y próximos pasos.

#### Convertir a iniciativa

```bash
curl -X POST http://localhost:3001/api/pitches/<pitchId>/to-initiative \
  -H "Authorization: Bearer <token>"
```

Requiere que el pitch esté en estado `ready`. Crea la iniciativa y arranca el planner automáticamente.

---

### Iniciativas

| Método | Path | Descripción |
|--------|------|-------------|
| `POST` | `/api/initiatives` | Crea desde una página de Notion |
| `POST` | `/api/initiatives/upload` | Crea desde upload directo (soporta archivos adjuntos) |
| `GET` | `/api/initiatives` | Lista iniciativas (paginado, filtrable por `status`) |
| `GET` | `/api/initiatives/:id` | Detalle: plan, features con tasks, métricas de ejecución |
| `DELETE` | `/api/initiatives/:id` | Elimina una iniciativa |
| `GET` | `/api/initiatives/:id/questions` | Preguntas del planner (cuando status es `needs_info`) |
| `POST` | `/api/initiatives/:id/replan` | Responde preguntas y re-dispara el planner |
| `PUT` | `/api/initiatives/:id/reupload` | Reemplaza el contenido del pitch y re-planifica |
| `PATCH` | `/api/initiatives/:id/repo` | Configura o actualiza el repositorio target |

#### Upload directo

Acepta `multipart/form-data` con archivos adjuntos opcionales (hasta 5).

```bash
curl -X POST http://localhost:3001/api/initiatives/upload \
  -H "Authorization: Bearer <token>" \
  -F "title=Nombre del proyecto" \
  -F "problem=Qué problema resuelve" \
  -F "solutionSketch=Enfoque propuesto" \
  -F "targetRepo=owner/repo" \
  -F "files=@documento.pdf"
```

Campos requeridos: `title`, `problem`, `solutionSketch`
Campos opcionales: `noGos`, `risks`, `successCriteria`, `techStack`, `additionalNotes`, `targetRepo`, `baseBranch` (default: `main`), `clientId`

#### Replan (responder preguntas)

```bash
curl -X POST http://localhost:3001/api/initiatives/<id>/replan \
  -H "Authorization: Bearer <token>" \
  -F "additionalContext=El sistema debe integrarse con MercadoPago. Los usuarios pueden cancelar órdenes hasta 24hs después de creadas." \
  -F "files=@especificacion.pdf"
```

Acumula contexto — las respuestas se agregan, no reemplazan. Funciona desde `needs_info`, `failed`, `planning` o `planned`.

#### Configurar repositorio

```bash
curl -X PATCH http://localhost:3001/api/initiatives/<id>/repo \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "targetRepo": "owner/repo", "baseBranch": "main" }'
```

---

### Features y Tasks

| Método | Path | Descripción |
|--------|------|-------------|
| `POST` | `/api/initiatives/:id/features/:fid/decompose` | Descompone una feature en tasks atómicas |
| `PATCH` | `/api/initiatives/:id/features/:fid/tasks/:tid/status` | Actualiza el status de una task |

La descomposición requiere que la iniciativa tenga `targetRepo` configurado. Si hay un GitHub token, lee el árbol de archivos del repo para contexto.

---

### Otros

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/memory/patterns` | Sí | Busca patrones de iniciativas anteriores |
| `GET` | `/api/health` | No | Estado del sistema: Supabase, Redis, queue stats |

---

## Statuses

### Iniciativas

```
pending → planning → needs_info → (replan) → planning → planned
                 └──────────────────────────→ planned
planned → in_progress → completed
```

Desde cualquier estado puede ir a `failed` o `cancelled`.

| Status | Significado |
|--------|-------------|
| `pending` | Creada, esperando que el planner arranque |
| `planning` | El planner está analizando el pitch |
| `needs_info` | El planner necesita info de negocio — ver `/questions` |
| `planned` | Plan creado con features, listo para descomponer |
| `in_progress` | Al menos una feature está siendo descompuesta |
| `completed` | Todas las features completadas |
| `failed` | Error (se puede replanificar) |
| `cancelled` | Cancelada manualmente |

### Features

`pending` → `decomposing` → `decomposed` → `failed`

### Tasks

`to_do` → `doing` → `review` → `done` (o `failed`)

---

## Agentes

Todos los agentes usan Anthropic Claude y registran tokens y duración en `agent_executions`.

| Agente | Modelo | Propósito |
|--------|--------|-----------|
| **Pitch** | claude-haiku-4-5 | Genera propuesta comercial estructurada desde un brief |
| **Planner** | claude-haiku-4-5 | Analiza el pitch, toma decisiones técnicas, y crea el plan de features |
| **Task Decomposer** | claude-haiku-4-5 | Descompone cada feature en tasks atómicas con rutas de archivos |

### Comportamiento del Planner

El planner toma todas las decisiones técnicas de forma autónoma (stack, arquitectura, frameworks, base de datos, etc.) y las documenta en el `developerContext` de cada feature.

Solo hace preguntas cuando falta información de negocio que no puede inferir: flujos de usuario específicos, reglas de negocio ambiguas, integraciones con sistemas externos no documentados, o requisitos que afectan directamente qué se construye.

---

## Decisiones de arquitectura

- **Planner autónomo** — El planner decide el stack y la arquitectura solo. Solo pregunta al usuario por lógica de negocio que no puede inferir. Esto evita fricción innecesaria sin sacrificar calidad del plan.
- **Queue-based processing** — BullMQ + Redis para procesamiento asíncrono. Los jobs de planner y descomposición no bloquean la respuesta HTTP.
- **Job chaining explícito** — Más simple de debuggear que BullMQ Flows. Soporta naturalmente los pasos manuales del pipeline.
- **Adjuntos en texto plano** — Los archivos subidos (PDF, DOCX, etc.) se convierten a texto antes de enviarse al modelo. Nunca se mandan binarios a la API de Anthropic.
- **Upload directo como flujo principal** — Notion es opcional. El upload directo es la forma más rápida de crear una iniciativa.
- **Plan versionado** — Cada replanning crea un nuevo plan (versión incremental). El anterior queda en historial (`is_active = false`).

---

## License

Private
