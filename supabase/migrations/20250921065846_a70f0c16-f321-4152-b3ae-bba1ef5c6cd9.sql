-- Fix remaining security issues

-- Fix all function search paths to be immutable
CREATE OR REPLACE FUNCTION public.information_columns()
RETURNS SETOF information_schema.columns
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'pg_catalog', 'information_schema', 'public'
AS $$ select * from information_schema.columns; $$;

CREATE OR REPLACE FUNCTION public.information_tables()
RETURNS SETOF information_schema.tables
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'pg_catalog', 'information_schema', 'public'
AS $$ select * from information_schema.tables; $$;

CREATE OR REPLACE FUNCTION public.information_views()
RETURNS SETOF information_schema.views
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'pg_catalog', 'information_schema', 'public'
AS $$ select * from information_schema.views; $$;

CREATE OR REPLACE FUNCTION public.information_table_constraints()
RETURNS SETOF information_schema.table_constraints
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'pg_catalog', 'information_schema', 'public'
AS $$ select * from information_schema.table_constraints; $$;

CREATE OR REPLACE FUNCTION public.pg_table_comments()
RETURNS TABLE(schema_name text, table_name text, comment text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
  select n.nspname, c.relname, obj_description(c.oid)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r';
$$;

CREATE OR REPLACE FUNCTION public.pg_column_comments()
RETURNS TABLE(schema_name text, table_name text, column_name text, comment text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
  select n.nspname, c.relname, a.attname, d.description
  from pg_class c
  join pg_attribute a on a.attrelid = c.oid
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_description d on d.objoid = a.attrelid and d.objsubid = a.attnum
  where c.relkind = 'r' and a.attnum > 0;
$$;

CREATE OR REPLACE FUNCTION public.pg_policies()
RETURNS SETOF pg_policies
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$ select * from pg_policies; $$;

CREATE OR REPLACE FUNCTION public.explain_query(query_text text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
declare plan text;
begin
  execute format('explain %s', query_text) into plan;
  return plan;
end;
$$;