---
name: new-migration
description: Create a new SQL migration file for the bads database following the Supabase migration pattern
argument-hint: "<description> - e.g. 'add status column to features'"
---

Crea una nueva migración SQL en `apps/api/supabase/migrations/`.

## Qué hacer

La migración debe implementar: `$ARGUMENTS`

## Pasos

1. Determinar el número de la próxima migración revisando qué archivos existen en `apps/api/supabase/migrations/`
2. Crear el archivo `apps/api/supabase/migrations/<NNN>_<slug>.sql`
3. Escribir la migración siguiendo las reglas del proyecto

## Reglas del schema

- PKs siempre `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- Timestamps siempre `TIMESTAMPTZ NOT NULL DEFAULT now()`
- Toda tabla nueva debe tener `created_at` y `updated_at`
- Toda tabla nueva que tenga `updated_at` debe tener el trigger `update_updated_at()`:
  ```sql
  CREATE TRIGGER trg_<table>_updated_at
    BEFORE UPDATE ON <table> FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  ```
- Crear índices para todas las FKs y campos usados en WHERE frecuentes
- Formato de índice: `CREATE INDEX idx_<table>_<column> ON <table>(<column>);`
- Para enums: usar `ALTER TYPE <enum> ADD VALUE IF NOT EXISTS '...'` — nunca eliminar valores de enums
- Para columnas opcionales en tablas existentes: `ALTER TABLE <table> ADD COLUMN <col> <type>;`
- FKs con `ON DELETE CASCADE` si son hijos directos, `ON DELETE SET NULL` si la referencia es opcional

## Ejemplo: nueva tabla

```sql
-- Migration: Descripción breve de qué hace esta migración

CREATE TABLE foo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES parent_table(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_foo_parent_id ON foo(parent_id);

CREATE TRIGGER trg_foo_updated_at
  BEFORE UPDATE ON foo FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## Ejemplo: alterar tabla existente

```sql
-- Migration: Add new column to existing table

ALTER TABLE existing_table ADD COLUMN new_col TEXT;

CREATE INDEX idx_existing_table_new_col ON existing_table(new_col);
```

## Ejemplo: nuevo valor de enum

```sql
-- Migration: Add new status value

ALTER TYPE initiative_status ADD VALUE IF NOT EXISTS 'new_status';
```

## Importante

- El archivo `/apps/api/supabase/migrations/001_bads_schema.sql` es la fuente de verdad — leerlo antes si necesitás referencias de tipos o tablas existentes
- No modificar migraciones anteriores — siempre crear una nueva
- Comentar brevemente qué hace la migración al inicio del archivo
