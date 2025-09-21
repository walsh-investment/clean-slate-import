-- Recreate the exec_sql function that was removed during schema reorganization
CREATE OR REPLACE FUNCTION public.exec_sql(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, memories
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Execute the query and return results as JSONB
    EXECUTE 'SELECT to_jsonb(array_agg(row_to_json(t))) FROM (' || query_text || ') t' INTO result;
    
    -- If result is null, return empty array
    IF result IS NULL THEN
        result := '[]'::jsonb;
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;