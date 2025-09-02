-- Create exec_sql function to allow dynamic queries against app schema
CREATE OR REPLACE FUNCTION public.exec_sql(query text, params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
    result jsonb;
    param_values text[];
    i integer;
BEGIN
    -- Convert JSONB array to text array for parameters
    IF params IS NOT NULL AND jsonb_array_length(params) > 0 THEN
        param_values := ARRAY(SELECT jsonb_array_elements_text(params));
    END IF;
    
    -- Execute the query and return results as JSONB
    IF param_values IS NULL OR array_length(param_values, 1) IS NULL THEN
        EXECUTE query INTO result;
    ELSE
        EXECUTE query INTO result USING VARIADIC param_values;
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;