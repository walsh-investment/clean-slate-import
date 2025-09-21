-- Phase 1: Critical RLS Policy Implementation

-- First, let's secure the memories schema tables
ALTER TABLE memories.notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for memories.notes to restrict access to household members
CREATE POLICY "Users can view notes from their household" 
ON memories.notes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.id = memories.notes.household_id
  )
);

CREATE POLICY "Users can insert notes for their household" 
ON memories.notes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.id = household_id
  )
);

CREATE POLICY "Users can update notes from their household" 
ON memories.notes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.id = memories.notes.household_id
  )
);

CREATE POLICY "Users can delete notes from their household" 
ON memories.notes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.id = memories.notes.household_id
  )
);

-- Secure memories.events_semantic table
ALTER TABLE memories.events_semantic ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events from their household" 
ON memories.events_semantic 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.id = memories.events_semantic.household_id
  )
);

CREATE POLICY "Users can insert events for their household" 
ON memories.events_semantic 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.id = household_id
  )
);

-- Secure app schema tables
ALTER TABLE app.messages_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from their household" 
ON app.messages_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.id = app.messages_log.household_id
  )
);

CREATE POLICY "Users can insert messages for their household" 
ON app.messages_log 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.id = household_id
  )
);

-- Secure error aggregates table
ALTER TABLE app.error_aggregates ENABLE ROW LEVEL SECURITY;

-- Error aggregates should only be viewable by admins or system
CREATE POLICY "Only system can access error aggregates" 
ON app.error_aggregates 
FOR ALL 
USING (false)  -- This effectively blocks all access via RLS, only functions with SECURITY DEFINER can access
WITH CHECK (false);

-- Phase 2: Secure the dangerous exec_sql function
-- Remove the existing exec_sql function as it's too dangerous
DROP FUNCTION IF EXISTS public.exec_sql(text);

-- Phase 3: Fix function search paths for security
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Update the error aggregate function with secure search path
CREATE OR REPLACE FUNCTION public.upsert_error_aggregate(
  p_fingerprint text, 
  p_level app.error_level, 
  p_category text, 
  p_scope app.error_scope, 
  p_message text, 
  p_stack text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
BEGIN
  INSERT INTO app.error_aggregates AS a (
    fingerprint, first_seen_at, last_seen_at, level, category, scope, occurrences, last_message, last_stack
  ) VALUES (
    p_fingerprint, now(), now(), p_level, p_category, p_scope, 1, p_message, p_stack
  )
  ON CONFLICT (fingerprint) DO UPDATE
  SET last_seen_at = now(),
      level = excluded.level,
      category = excluded.category,
      scope = excluded.scope,
      occurrences = a.occurrences + 1,
      last_message = excluded.last_message,
      last_stack = excluded.last_stack;
END;
$$;