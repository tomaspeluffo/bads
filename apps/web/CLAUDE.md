# Frontend — React + Vite

## Stack de UI
- TailwindCSS para estilos
- shadcn/ui para componentes base
- Recharts para gráficos
- Tanstack Query para data fetching y cache

## Patrones
- Cada página en src/pages/
- Componentes reutilizables en src/components/
- Hooks de data fetching en src/hooks/ (wrappean Tanstack Query)
- Types compartidos en src/types/
- Auth helpers en src/lib/auth.ts (token management via localStorage)
- API client en src/lib/api.ts (todas las llamadas al backend)

## Estilo
- Mobile-first pero el MVP es desktop-focused
- Sidebar navigation
- Cards para métricas, tablas para datos detallados
- Colores: usar el theme de shadcn, no colores hardcodeados
- Idioma de la UI: español

## Auth
- Auth vía API backend (POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout)
- Token se guarda en localStorage y se envía como Bearer en cada request
- Protected routes wrappean con AuthGuard component
- Login page en /login