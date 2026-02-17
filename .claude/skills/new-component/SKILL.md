---
name: new-component
description: Create a new React component in the bads frontend with Tanstack Query, typed API calls, and Spanish UI text
argument-hint: "<ComponentName> - e.g. 'FeatureCard' or 'InitiativeList'"
---

Crea un nuevo componente React en `apps/web/src/` para: `$ARGUMENTS`

## Estructura a crear

### 1. Tipo de API en `apps/web/src/types/`

Si el componente consume datos nuevos, definir la interfaz:
```typescript
export interface Foo {
  id: string;
  name: string;
  createdAt: string;
  // otros campos
}
```

### 2. Función de API en `apps/web/src/lib/api.ts`

Agregar la función de fetch (nunca hacer fetch directo en componentes):
```typescript
export async function fetchFoos(): Promise<Foo[]> {
  const res = await apiClient.get<{ data: Foo[] }>("/foos");
  return res.data.data;
}

export async function createFoo(data: CreateFooInput): Promise<Foo> {
  const res = await apiClient.post<Foo>("/foos", data);
  return res.data;
}
```

### 3. Hook de Tanstack Query en `apps/web/src/hooks/use<Resource>.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFoos, createFoo } from "@/lib/api";

export function useFoos() {
  return useQuery({
    queryKey: ["foos"],
    queryFn: fetchFoos,
  });
}

export function useCreateFoo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFoo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foos"] });
    },
  });
}
```

### 4. Componente en `apps/web/src/components/<ComponentName>.tsx` o `apps/web/src/pages/<PageName>.tsx`

```typescript
import { use<Resource> } from "@/hooks/use<Resource>";

export function <ComponentName>() {
  const { data, isLoading, error } = use<Resource>();

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error al cargar los datos</div>;

  return (
    <div>
      {/* contenido */}
    </div>
  );
}
```

## Reglas del componente

- Componentes funcionales con hooks — no class components
- Todo data fetching mediante Tanstack Query — nunca `fetch` ni `axios` directo en el componente
- Todo texto visible al usuario en **español**
- Tipar todas las respuestas de API con interfaces explícitas — no `any`
- Mantener componentes pequeños: si supera ~150 líneas, considerar dividir
- Usar `shadcn/ui` + TailwindCSS para UI
- Nombrar archivo en `PascalCase.tsx`
- Nombrar hook en `camelCase.ts` con prefijo `use`
- Estados de loading y error siempre manejados

## Verificación

```bash
cd apps/web && npm run typecheck && npm run lint
```
