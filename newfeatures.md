Plan to implement                                                                                                                                       │
│                                                                                                                                                         │
│ Plan: Decouple Frontend from Supabase — Auth via API                                                                                                    │
│                                                                                                                                                         │
│ Context                                                                                                                                                 │
│                                                                                                                                                         │
│ The frontend currently imports @supabase/supabase-js directly for auth (getting sessions, checking user state, signing out). This couples the frontend  │
│ to Supabase. The goal is to make the frontend call only the backend API for everything, including auth. This way, if Supabase is later replaced with    │
│ plain Postgres + custom auth, only the backend changes.                                                                                                 │
│                                                                                                                                                         │
│ Phase 1: Backend — Add auth endpoints                                                                                                                   │
│                                                                                                                                                         │
│ 1.1 New file: apps/api/src/api/auth.ts                                                                                                                  │
│                                                                                                                                                         │
│ Auth router with 3 endpoints (follows the clients.ts pattern):                                                                                          │
│                                                                                                                                                         │
│ - POST /api/auth/login — public (no authMiddleware). Validates { email, password } with Zod. Calls supabase.auth.signInWithPassword() internally.       │
│ Returns { access_token, user }.                                                                                                                         │
│ - GET /api/auth/me — protected. Extracts Bearer token, calls supabase.auth.getUser(). Returns { user }.                                                 │
│ - POST /api/auth/logout — protected. Calls supabase.auth.signOut(). Returns { message }.                                                                │
│                                                                                                                                                         │
│ Supabase interaction uses the anon key (not service role) since we're acting on behalf of the user.                                                     │
│                                                                                                                                                         │
│ 1.2 Edit: apps/api/src/app.ts                                                                                                                           │
│                                                                                                                                                         │
│ - Import authRouter                                                                                                                                     │
│ - Add app.use("/api", authRouter) alongside existing routers                                                                                            │
│                                                                                                                                                         │
│ Phase 2: Frontend — Rewrite auth to use API                                                                                                             │
│                                                                                                                                                         │
│ 2.1 New file: apps/web/src/lib/auth.ts                                                                                                                  │
│                                                                                                                                                         │
│ Token helpers — getToken(), setToken(token), clearToken() using localStorage.                                                                           │
│                                                                                                                                                         │
│ 2.2 Edit: apps/web/src/lib/api.ts                                                                                                                       │
│                                                                                                                                                         │
│ - Remove import { supabase } from "./supabase"                                                                                                          │
│ - Replace interceptor: read token from getToken() instead of supabase.auth.getSession()                                                                 │
│ - Add 401 response interceptor: clearToken() + redirect to /login                                                                                       │
│ - Add functions: login(email, password), fetchMe(), logout()                                                                                            │
│                                                                                                                                                         │
│ 2.3 Rewrite: apps/web/src/hooks/useAuth.ts                                                                                                              │
│                                                                                                                                                         │
│ - Remove all Supabase imports                                                                                                                           │
│ - Use Tanstack Query useQuery({ queryKey: ["auth","me"], queryFn: fetchMe, enabled: !!getToken() })                                                     │
│ - signIn via useMutation that calls login() then setToken()                                                                                             │
│ - signOut via useMutation that calls logout() then clearToken() + redirect                                                                              │
│ - Returns { user, loading, signIn, signOut, loginError, isLoggingIn }                                                                                   │
│                                                                                                                                                         │
│ 2.4 New file: apps/web/src/pages/LoginPage.tsx                                                                                                          │
│                                                                                                                                                         │
│ Simple form with email + password using existing shadcn/ui components (Card, Input, Label, Button). Calls signIn from useAuth. Redirects to / on        │
│ success. All text in Spanish.                                                                                                                           │
│                                                                                                                                                         │
│ 2.5 Edit: apps/web/src/components/layout/AuthGuard.tsx                                                                                                  │
│                                                                                                                                                         │
│ - Add import { Navigate } from "react-router-dom"                                                                                                       │
│ - When !user, render <Navigate to="/login" replace /> instead of static text                                                                           │
│                                                                                                                                                         │
│ 2.6 Edit: apps/web/src/App.tsx                                                                                                                          │
│                                                                                                                                                         │
│ - Add /login route outside the guard: <Route path="/login" element={<LoginPage />} />                                                                   │
│ - Wrap all other routes with <AuthGuard>:                                                                                                               │
│ <Route path="/*" element={<AuthGuard><div flex>...<Routes>...</Routes></div></AuthGuard>} />                                                            │
│                                                                                                                                                         │
│ 2.7 Edit: apps/web/src/components/layout/Sidebar.tsx                                                                                                    │
│                                                                                                                                                         │
│ - Import useAuth and LogOut icon                                                                                                                        │
│ - Add user email + logout button at the bottom of the sidebar                                                                                           │
│                                                                                                                                                         │
│ Phase 3: Cleanup                                                                                                                                        │
│                                                                                                                                                         │
│ - Delete apps/web/src/lib/supabase.ts                                                                                                                   │
│ - Remove @supabase/supabase-js from apps/web/package.json                                                                                               │
│ - Delete apps/web/.env (no longer needs VITE_SUPABASE_* vars)                                                                                           │
│ - Run pnpm install to update lockfile                                                                                                                   │
│                                                                                                                                                         │
│ Verification                                                                                                                                            │
│                                                                                                                                                         │
│ - cd apps/api && npm run typecheck && npm run lint                                                                                                      │
│ - cd apps/web && npm run typecheck && npm run lint                                                                                                      │
│ - Start both servers, navigate to /login, log in, verify redirect to /, verify API calls work, verify logout       