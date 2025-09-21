-- Fix schema organization - move RPC functions to proper schemas

-- Drop the incorrectly placed functions from public schema
DROP FUNCTION IF EXISTS public.search_memories(text, uuid, integer);
DROP FUNCTION IF EXISTS public.get_chat_history(uuid, integer);

-- Create search_memories function in memories schema
CREATE OR REPLACE FUNCTION memories.search_memories(
  query_text text,
  household_id uuid,
  match_limit integer DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  content text,
  embedding vector,
  metadata jsonb,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = memories, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.content,
    n.embedding,
    n.metadata,
    n.created_at
  FROM memories.notes n
  WHERE n.household_id = search_memories.household_id
  ORDER BY n.embedding <-> ai.openai_embedding('text-embedding-3-small', query_text)
  LIMIT match_limit;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback to text search if vector search fails
    RETURN QUERY
    SELECT 
      n.id,
      n.content,
      n.embedding,
      n.metadata,
      n.created_at
    FROM memories.notes n
    WHERE n.household_id = search_memories.household_id
      AND n.content ILIKE '%' || query_text || '%'
    ORDER BY n.created_at DESC
    LIMIT match_limit;
END;
$$;

-- Create get_chat_history function in app schema  
CREATE OR REPLACE FUNCTION app.get_chat_history(
  household_id uuid,
  limit_count integer DEFAULT 10
)
RETURNS TABLE(
  role text,
  content text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ml.role,
    ml.content,
    ml.created_at
  FROM app.messages_log ml
  WHERE ml.household_id = get_chat_history.household_id
  ORDER BY ml.created_at DESC
  LIMIT limit_count;
END;
$$;