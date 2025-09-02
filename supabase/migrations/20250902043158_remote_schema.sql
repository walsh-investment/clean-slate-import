

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "api";


ALTER SCHEMA "api" OWNER TO "postgres";


COMMENT ON SCHEMA "api" IS 'Interface schema containing functions that expose safe operations for the AI assistant to use when interacting with the database. Provides a controlled boundary between AI capabilities and core data.';



CREATE SCHEMA IF NOT EXISTS "app";


ALTER SCHEMA "app" OWNER TO "postgres";


COMMENT ON SCHEMA "app" IS 'Operational data schema storing user-facing data like households, events, tasks, and people. This is the primary schema for transactional business data.';



CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE SCHEMA IF NOT EXISTS "memories";


ALTER SCHEMA "memories" OWNER TO "postgres";


COMMENT ON SCHEMA "memories" IS 'AI knowledge store schema for preserving agent observations, semantic data, and preferences that power the Natural DB pattern. Not directly accessed by users.';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "util";


ALTER SCHEMA "util" OWNER TO "postgres";


COMMENT ON SCHEMA "util" IS 'Low-level helper functions and triggers (e.g., updated_at). Business logic stays in app/api.';



CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";






CREATE TYPE "app"."message_status" AS ENUM (
    'pending',
    'sent',
    'error'
);


ALTER TYPE "app"."message_status" OWNER TO "postgres";


COMMENT ON TYPE "app"."message_status" IS 'Delivery state for notifications/messages emitted by the app stack.';



CREATE TYPE "app"."person_kind" AS ENUM (
    'parent',
    'grandparent',
    'child',
    'other'
);


ALTER TYPE "app"."person_kind" OWNER TO "postgres";


COMMENT ON TYPE "app"."person_kind" IS 'Typed role of a person in a household: parent, grandparent, child, or other. Controls UX accents, not DB permissions.';



CREATE TYPE "app"."ride_offer_status" AS ENUM (
    'proposed',
    'accepted',
    'declined'
);


ALTER TYPE "app"."ride_offer_status" OWNER TO "postgres";


COMMENT ON TYPE "app"."ride_offer_status" IS 'Lifecycle of a ride offer for an event: proposed by a person, accepted/declined by a parent.';



CREATE TYPE "app"."task_status" AS ENUM (
    'todo',
    'in_progress',
    'done'
);


ALTER TYPE "app"."task_status" OWNER TO "postgres";


COMMENT ON TYPE "app"."task_status" IS 'State machine for tasks: todo → in_progress → done. Used by Kanban board.';



CREATE OR REPLACE FUNCTION "api"."propose_action"("household_uuid" "uuid", "action_payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_action_id UUID;
BEGIN
  -- Validate action payload has required fields
  IF action_payload->>'type' IS NULL THEN
    RAISE EXCEPTION 'Action payload must include a type field';
  END IF;
  
  -- Insert the action
  INSERT INTO memories.actions_outbox(
    household_id,
    action
  )
  VALUES (
    household_uuid,
    action_payload
  )
  RETURNING id INTO new_action_id;
  
  RETURN new_action_id;
END;
$$;


ALTER FUNCTION "api"."propose_action"("household_uuid" "uuid", "action_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "api"."record_note"("household_uuid" "uuid", "note_kind" "text", "note_subject" "text", "note_content" "text", "note_source" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_note_id UUID;
BEGIN
  -- Validate kind
  IF note_kind NOT IN ('fact', 'summary', 'observation', 'rule') THEN
    RAISE EXCEPTION 'Invalid note kind: %', note_kind;
  END IF;
  
  -- Insert the note
  INSERT INTO memories.notes(
    household_id, 
    kind, 
    subject, 
    content, 
    source
  )
  VALUES (
    household_uuid,
    note_kind,
    note_subject,
    note_content,
    note_source
  )
  RETURNING id INTO new_note_id;
  
  RETURN new_note_id;
END;
$$;


ALTER FUNCTION "api"."record_note"("household_uuid" "uuid", "note_kind" "text", "note_subject" "text", "note_content" "text", "note_source" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "api"."record_preference"("household_uuid" "uuid", "pref_subject" "text", "pref_key" "text", "pref_value" "jsonb", "pref_confidence" real DEFAULT 0.8) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  existing_pref_id UUID;
  new_pref_id UUID;
BEGIN
  -- Check if preference exists
  SELECT id INTO existing_pref_id
  FROM memories.preferences
  WHERE household_id = household_uuid
  AND subject = pref_subject
  AND key = pref_key;
  
  IF existing_pref_id IS NOT NULL THEN
    -- Update existing
    UPDATE memories.preferences
    SET 
      value = pref_value,
      confidence = pref_confidence,
      updated_at = now()
    WHERE id = existing_pref_id;
    
    RETURN existing_pref_id;
  ELSE
    -- Insert new
    INSERT INTO memories.preferences(
      household_id,
      subject,
      key,
      value,
      confidence
    )
    VALUES (
      household_uuid,
      pref_subject,
      pref_key,
      pref_value,
      pref_confidence
    )
    RETURNING id INTO new_pref_id;
    
    RETURN new_pref_id;
  END IF;
END;
$$;


ALTER FUNCTION "api"."record_preference"("household_uuid" "uuid", "pref_subject" "text", "pref_key" "text", "pref_value" "jsonb", "pref_confidence" real) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."build_combined_prompt"("person_id" "uuid", "feature_name" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  household_id UUID;
  system_prompt TEXT;
  user_prompt TEXT;
  result JSONB;
BEGIN
  -- Get the person's household
  SELECT p.household_id INTO household_id
  FROM app.people p
  WHERE p.id = build_combined_prompt.person_id;
  
  -- Get the appropriate system prompt
  system_prompt := app.get_system_prompt(feature_name, household_id);
  
  -- Get the user's personalization prompt
  user_prompt := app.get_user_prompt(person_id);
  
  -- Build a structured JSONB result with both prompts
  result := jsonb_build_object(
    'messages', jsonb_build_array(
      jsonb_build_object(
        'role', 'system',
        'content', system_prompt
      ),
      jsonb_build_object(
        'role', 'system',
        'content', 'User personalization: ' || user_prompt
      )
    )
  );
  
  RETURN result;
END;
$$;


ALTER FUNCTION "app"."build_combined_prompt"("person_id" "uuid", "feature_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "app"."build_combined_prompt"("person_id" "uuid", "feature_name" "text") IS 'Builds a complete prompt structure for LLM requests by combining the appropriate system prompt for a feature with the user''s personalization preferences. Returns a JSONB structure ready for inclusion in LLM API calls.';



CREATE OR REPLACE FUNCTION "app"."create_event_reminders"("hours_before" integer DEFAULT 24) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  notification_count INTEGER := 0;
  event_record RECORD;
BEGIN
  -- Find events that need reminders
  FOR event_record IN 
    SELECT 
      e.id AS event_id,
      e.household_id,
      e.person_id,
      e.title,
      e.event_date,
      e.start_time,
      e.location,
      p.display_name AS person_name,
      dp.display_name AS driver_name,
      hm.user_id
    FROM app.events e
    JOIN app.people p ON p.id = e.person_id
    LEFT JOIN app.people dp ON dp.id = e.driver_person_id
    JOIN app.household_members hm ON hm.household_id = e.household_id
    LEFT JOIN app.notifications n ON 
      n.household_id = e.household_id AND
      n.user_id = hm.user_id AND
      n.type = 'event_reminder' AND
      (n.data->>'event_id')::UUID = e.id
    WHERE 
      e.event_date = CURRENT_DATE + 1 AND
      n.id IS NULL AND  -- No notification sent yet
      hm.role_label IN ('parent', 'admin')
  LOOP
    -- Create notification for household members
    INSERT INTO app.notifications (
      household_id,
      user_id,
      type,
      title,
      message,
      data
    )
    VALUES (
      event_record.household_id,
      event_record.user_id,
      'event_reminder',
      'Event Tomorrow: ' || event_record.title,
      'Reminder: ' || event_record.person_name || ' has ' || event_record.title || 
      ' tomorrow at ' || COALESCE(event_record.start_time::TEXT, 'all day') ||
      CASE WHEN event_record.location IS NOT NULL THEN ' at ' || event_record.location ELSE '' END ||
      CASE WHEN event_record.driver_name IS NOT NULL THEN '. Driver: ' || event_record.driver_name 
           WHEN event_record.ride_needed THEN '. Ride needed!'
           ELSE ''
      END,
      jsonb_build_object(
        'event_id', event_record.event_id,
        'person_id', event_record.person_id,
        'event_date', event_record.event_date,
        'start_time', event_record.start_time
      )
    );
    
    notification_count := notification_count + 1;
  END LOOP;
  
  RETURN notification_count;
END;
$$;


ALTER FUNCTION "app"."create_event_reminders"("hours_before" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."create_event_reminders"("target_date" "date" DEFAULT NULL::"date", "hours_before" integer DEFAULT 24) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  notification_count INTEGER := 0;
  event_record RECORD;
  reminder_date DATE;
BEGIN
  -- Set default target date to tomorrow if not provided
  IF target_date IS NULL THEN
    reminder_date := CURRENT_DATE + 1;
  ELSE
    reminder_date := target_date;
  END IF;
  
  -- Find events that need reminders
  FOR event_record IN 
    SELECT 
      e.id AS event_id,
      e.household_id,
      e.person_id,
      e.title,
      e.event_date,
      e.start_time,
      e.location,
      p.display_name AS person_name,
      dp.display_name AS driver_name,
      e.ride_needed,
      hm.user_id
    FROM app.events e
    JOIN app.people p ON p.id = e.person_id
    LEFT JOIN app.people dp ON dp.id = e.driver_person_id
    JOIN app.household_members hm ON hm.household_id = e.household_id
    LEFT JOIN app.notifications n ON 
      n.household_id = e.household_id AND
      n.user_id = hm.user_id AND
      n.type = 'event_reminder' AND
      (n.data->>'event_id')::UUID = e.id
    WHERE 
      e.event_date = reminder_date AND
      n.id IS NULL AND  -- No notification sent yet
      hm.role_label IN ('parent', 'admin')
  LOOP
    -- Create notification for household members
    INSERT INTO app.notifications (
      household_id,
      user_id,
      type,
      title,
      message,
      data
    )
    VALUES (
      event_record.household_id,
      event_record.user_id,
      'event_reminder',
      'Event on ' || to_char(event_record.event_date, 'YYYY-MM-DD') || ': ' || event_record.title,
      'Reminder: ' || event_record.person_name || ' has ' || event_record.title || 
      ' on ' || to_char(event_record.event_date, 'YYYY-MM-DD') || 
      ' at ' || COALESCE(event_record.start_time::TEXT, 'all day') ||
      CASE WHEN event_record.location IS NOT NULL THEN ' at ' || event_record.location ELSE '' END ||
      CASE WHEN event_record.driver_name IS NOT NULL THEN '. Driver: ' || event_record.driver_name 
           WHEN event_record.ride_needed THEN '. Ride needed!'
           ELSE ''
      END,
      jsonb_build_object(
        'event_id', event_record.event_id,
        'person_id', event_record.person_id,
        'event_date', event_record.event_date,
        'start_time', event_record.start_time
      )
    );
    
    notification_count := notification_count + 1;
  END LOOP;
  
  RETURN notification_count;
END;
$$;


ALTER FUNCTION "app"."create_event_reminders"("target_date" "date", "hours_before" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "app"."create_event_reminders"("target_date" "date", "hours_before" integer) IS 'Creates notification records for upcoming events, typically run by a scheduled job. The target_date parameter specifies which date''s events to generate reminders for (defaults to tomorrow), and hours_before controls reminder timing (defaults to 24 hours).';



CREATE OR REPLACE FUNCTION "app"."current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$ select auth.uid() $$;


ALTER FUNCTION "app"."current_user_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "app"."current_user_id"() IS 'Returns the current authenticated user id (wrapper around auth.uid()).';



CREATE OR REPLACE FUNCTION "app"."get_ical_feed"("share_token" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  cal_feed TEXT;
  share_record app.calendar_shares;
  event_record RECORD;
BEGIN
  -- Find the calendar share
  SELECT * INTO share_record
  FROM app.calendar_shares
  WHERE token = share_token;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Start iCalendar
  cal_feed := 'BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Supabase Family Organizer//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Family Calendar
';

  -- Add events
  FOR event_record IN 
    SELECT 
      e.id,
      e.title,
      e.event_date,
      e.start_time,
      e.end_time,
      e.location,
      p.display_name AS person_name,
      dp.display_name AS driver_name,
      e.notes
    FROM app.events e
    JOIN app.people p ON p.id = e.person_id
    LEFT JOIN app.people dp ON dp.id = e.driver_person_id
    WHERE 
      e.household_id = share_record.household_id AND
      e.person_id = ANY(share_record.person_ids) AND
      e.event_date >= CURRENT_DATE
    ORDER BY e.event_date, COALESCE(e.start_time, '00:00:00')
  LOOP
    -- Create event
    cal_feed := cal_feed || '
BEGIN:VEVENT
UID:' || event_record.id || '@familyorganizer
SUMMARY:' || event_record.person_name || ': ' || event_record.title || '
DTSTART;VALUE=DATE:' || to_char(event_record.event_date, 'YYYYMMDD');

    -- Add time if present
    IF event_record.start_time IS NOT NULL THEN
      cal_feed := cal_feed || 'T' || to_char(event_record.start_time, 'HHmm00');
    END IF;
    
    -- Add end date/time if present
    IF event_record.end_time IS NOT NULL AND event_record.start_time IS NOT NULL THEN
      cal_feed := cal_feed || '
DTEND;VALUE=DATE:' || to_char(event_record.event_date, 'YYYYMMDD') || 
        'T' || to_char(event_record.end_time, 'HHmm00');
    ELSE
      -- All day event
      cal_feed := cal_feed || '
DTEND;VALUE=DATE:' || to_char(event_record.event_date + 1, 'YYYYMMDD');
    END IF;
    
    -- Add location if present
    IF event_record.location IS NOT NULL THEN
      cal_feed := cal_feed || '
LOCATION:' || event_record.location;
    END IF;
    
    -- Add description with driver info
    cal_feed := cal_feed || '
DESCRIPTION:';
    
    IF event_record.driver_name IS NOT NULL THEN
      cal_feed := cal_feed || 'Driver: ' || event_record.driver_name;
    ELSIF event_record.ride_needed THEN
      cal_feed := cal_feed || 'Ride needed!';
    END IF;
    
    -- Add notes if present
    IF event_record.notes IS NOT NULL THEN
      IF event_record.driver_name IS NOT NULL OR event_record.ride_needed THEN
        cal_feed := cal_feed || '\\n\\n';
      END IF;
      cal_feed := cal_feed || event_record.notes;
    END IF;
    
    cal_feed := cal_feed || '
END:VEVENT';
  END LOOP;
  
  -- End calendar
  cal_feed := cal_feed || '
END:VCALENDAR';

  RETURN cal_feed;
END;
$$;


ALTER FUNCTION "app"."get_ical_feed"("share_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."get_ical_feed"("share_token" "text", "start_date" "date" DEFAULT NULL::"date") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  cal_feed TEXT;
  share_record app.calendar_shares;
  event_record RECORD;
  filter_date DATE;
BEGIN
  -- Find the calendar share
  SELECT * INTO share_record
  FROM app.calendar_shares
  WHERE token = share_token;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Set default start date to current date if not provided
  IF start_date IS NULL THEN
    filter_date := CURRENT_DATE;
  ELSE
    filter_date := start_date;
  END IF;
  
  -- Start iCalendar
  cal_feed := 'BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Supabase Family Organizer//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Family Calendar
';

  -- Add events
  FOR event_record IN 
    SELECT 
      e.id,
      e.title,
      e.event_date,
      e.start_time,
      e.end_time,
      e.location,
      p.display_name AS person_name,
      dp.display_name AS driver_name,
      e.notes,
      e.ride_needed
    FROM app.events e
    JOIN app.people p ON p.id = e.person_id
    LEFT JOIN app.people dp ON dp.id = e.driver_person_id
    WHERE 
      e.household_id = share_record.household_id AND
      e.person_id = ANY(share_record.person_ids) AND
      e.event_date >= filter_date
    ORDER BY e.event_date, COALESCE(e.start_time, '00:00:00')
  LOOP
    -- Create event
    cal_feed := cal_feed || '
BEGIN:VEVENT
UID:' || event_record.id || '@familyorganizer
SUMMARY:' || event_record.person_name || ': ' || event_record.title || '
DTSTART;VALUE=DATE:' || to_char(event_record.event_date, 'YYYYMMDD');

    -- Add time if present
    IF event_record.start_time IS NOT NULL THEN
      cal_feed := cal_feed || 'T' || to_char(event_record.start_time, 'HHmm00');
    END IF;
    
    -- Add end date/time if present
    IF event_record.end_time IS NOT NULL AND event_record.start_time IS NOT NULL THEN
      cal_feed := cal_feed || '
DTEND;VALUE=DATE:' || to_char(event_record.event_date, 'YYYYMMDD') || 
        'T' || to_char(event_record.end_time, 'HHmm00');
    ELSE
      -- All day event
      cal_feed := cal_feed || '
DTEND;VALUE=DATE:' || to_char(event_record.event_date + 1, 'YYYYMMDD');
    END IF;
    
    -- Add location if present
    IF event_record.location IS NOT NULL THEN
      cal_feed := cal_feed || '
LOCATION:' || event_record.location;
    END IF;
    
    -- Add description with driver info
    cal_feed := cal_feed || '
DESCRIPTION:';
    
    IF event_record.driver_name IS NOT NULL THEN
      cal_feed := cal_feed || 'Driver: ' || event_record.driver_name;
    ELSIF event_record.ride_needed IS TRUE THEN
      cal_feed := cal_feed || 'Ride needed!';
    END IF;
    
    -- Add notes if present
    IF event_record.notes IS NOT NULL THEN
      IF event_record.driver_name IS NOT NULL OR event_record.ride_needed IS TRUE THEN
        cal_feed := cal_feed || '\\n\\n';
      END IF;
      cal_feed := cal_feed || event_record.notes;
    END IF;
    
    cal_feed := cal_feed || '
END:VEVENT';
  END LOOP;
  
  -- End calendar
  cal_feed := cal_feed || '
END:VCALENDAR';

  RETURN cal_feed;
END;
$$;


ALTER FUNCTION "app"."get_ical_feed"("share_token" "text", "start_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "app"."get_ical_feed"("share_token" "text", "start_date" "date") IS 'Generates an iCalendar (.ics) format feed for external calendar applications based on a share token. Includes event details, drivers, and locations. The optional start_date parameter filters for events on or after that date, defaulting to current date when omitted.';



CREATE OR REPLACE FUNCTION "app"."get_system_prompt"("feature_name" "text", "household_id" "uuid" DEFAULT NULL::"uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  prompt_text TEXT;
BEGIN
  -- First try to get a household-specific prompt if household_id is provided
  IF household_id IS NOT NULL THEN
    SELECT sp.prompt_text INTO prompt_text
    FROM app.system_prompts sp
    WHERE sp.feature = feature_name
    AND sp.household_id = get_system_prompt.household_id
    AND sp.active = true
    ORDER BY sp.version DESC
    LIMIT 1;
  END IF;
  
  -- If no household-specific prompt or none provided, get global prompt
  IF prompt_text IS NULL THEN
    SELECT sp.prompt_text INTO prompt_text
    FROM app.system_prompts sp
    WHERE sp.feature = feature_name
    AND sp.scope = 'global'
    AND sp.active = true
    ORDER BY sp.version DESC
    LIMIT 1;
  END IF;
  
  -- Return the found prompt or a default if none exists
  RETURN COALESCE(prompt_text, 'You are a helpful assistant for the family organizer application.');
END;
$$;


ALTER FUNCTION "app"."get_system_prompt"("feature_name" "text", "household_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "app"."get_system_prompt"("feature_name" "text", "household_id" "uuid") IS 'Retrieves the appropriate system prompt for a specific feature, first checking for household-specific prompts and falling back to global prompts if none exist.';



CREATE OR REPLACE FUNCTION "app"."get_user_prompt"("person_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  prompt_text TEXT;
BEGIN
  SELECT up.prompt_text INTO prompt_text
  FROM app.user_prompts up
  WHERE up.person_id = get_user_prompt.person_id;
  
  -- Return the found prompt or a default if none exists
  RETURN COALESCE(prompt_text, 'Respond in a friendly, helpful manner.');
END;
$$;


ALTER FUNCTION "app"."get_user_prompt"("person_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "app"."get_user_prompt"("person_id" "uuid") IS 'Retrieves the personalization prompt for a specific user, returning a default if none exists.';



CREATE OR REPLACE FUNCTION "app"."is_member_of_household"("p_user" "uuid", "p_household" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from app.household_members hm
    where hm.user_id = p_user
      and hm.household_id = p_household
  )
$$;


ALTER FUNCTION "app"."is_member_of_household"("p_user" "uuid", "p_household" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "app"."is_member_of_household"("p_user" "uuid", "p_household" "uuid") IS 'True if the given user is a member of the given household; central to RLS and api views.';



CREATE OR REPLACE FUNCTION "app"."is_ride_offer_pending"("status" "app"."ride_offer_status") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
    -- Return true if ride offer is proposed
    SELECT status = 'proposed';
$$;


ALTER FUNCTION "app"."is_ride_offer_pending"("status" "app"."ride_offer_status") OWNER TO "postgres";


COMMENT ON FUNCTION "app"."is_ride_offer_pending"("status" "app"."ride_offer_status") IS 'Determines if a ride offer is in the "proposed" state awaiting response. This IMMUTABLE function is designed specifically for use in index predicates to enable efficient filtering of pending ride offers.';



CREATE OR REPLACE FUNCTION "app"."is_task_incomplete"("status" "app"."task_status") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
    -- Return true if task is not done
    SELECT status != 'done';
$$;


ALTER FUNCTION "app"."is_task_incomplete"("status" "app"."task_status") OWNER TO "postgres";


COMMENT ON FUNCTION "app"."is_task_incomplete"("status" "app"."task_status") IS 'Determines if a task is in an incomplete state (not "done"). This IMMUTABLE function is designed specifically for use in index predicates to support efficient filtering of incomplete tasks.';



CREATE OR REPLACE FUNCTION "app"."tg_events_household_check"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  p_house uuid;
  d_house uuid;
begin
  select household_id into p_house from app.people where id = NEW.person_id;
  perform util.assert_same_household(NEW.household_id, p_house, 'events.person_id');

  if NEW.driver_person_id is not null then
    select household_id into d_house from app.people where id = NEW.driver_person_id;
    perform util.assert_same_household(NEW.household_id, d_house, 'events.driver_person_id');
  end if;

  return NEW;
end;
$$;


ALTER FUNCTION "app"."tg_events_household_check"() OWNER TO "postgres";


COMMENT ON FUNCTION "app"."tg_events_household_check"() IS 'Prevents cross-tenant leakage: the event’s person and driver must belong to the same household as the event.';



CREATE OR REPLACE FUNCTION "app"."tg_tasks_household_check"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  p_house uuid;
begin
  select household_id into p_house from app.people where id = NEW.person_id;
  perform util.assert_same_household(NEW.household_id, p_house, 'tasks.person_id');
  return NEW;
end;
$$;


ALTER FUNCTION "app"."tg_tasks_household_check"() OWNER TO "postgres";


COMMENT ON FUNCTION "app"."tg_tasks_household_check"() IS 'Prevents cross-tenant leakage: task.person must belong to task.household.';



CREATE OR REPLACE FUNCTION "memories"."search_events_semantic"("query_text" "text", "household_uuid" "uuid", "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 10) RETURNS TABLE("event_id" "uuid", "similarity" double precision, "text_for_search" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  query_embedding extensions.vector(384);
BEGIN
  -- Get the embedding for the query text (using an external function or service)
  -- This is a placeholder - you'll need to implement actual embedding generation
  -- query_embedding := your_embedding_function(query_text);
  
  -- Return semantically similar events
  RETURN QUERY
  SELECT
    es.event_id,
    es.embedding <=> query_embedding AS similarity,
    es.text_for_search
  FROM
    memories.events_semantic es
  WHERE
    es.household_id = household_uuid
    AND (es.embedding <=> query_embedding) < (1 - match_threshold)
  ORDER BY
    similarity
  LIMIT
    match_count;
END;
$$;


ALTER FUNCTION "memories"."search_events_semantic"("query_text" "text", "household_uuid" "uuid", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "memories"."tg_refresh_events_semantic"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_text  text;
begin
  if (TG_OP = 'DELETE') then
    delete from memories.events_semantic where event_id = OLD.id;
    return OLD;
  end if;

  v_text := coalesce(to_char(NEW.event_date, 'Dy Mon DD'), '') || ' ' ||
            coalesce(NEW.start_time::text, '') || ' ' ||
            (select display_name from app.people where id = NEW.person_id) || ' — ' ||
            coalesce(NEW.title, '') ||
            case when NEW.location is not null then ' @ ' || NEW.location else '' end;

  insert into memories.events_semantic (event_id, household_id, text_for_search, updated_at)
  values (NEW.id, NEW.household_id, v_text, now())
  on conflict (event_id) do update
    set text_for_search = excluded.text_for_search,
        updated_at = now();

  return NEW;
end;
$$;


ALTER FUNCTION "memories"."tg_refresh_events_semantic"() OWNER TO "postgres";


COMMENT ON FUNCTION "memories"."tg_refresh_events_semantic"() IS 'Maintains the semantic text cache on INSERT/UPDATE/DELETE of app.events.';



CREATE OR REPLACE FUNCTION "public"."exec_sql"("query_text" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'app'
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


ALTER FUNCTION "public"."exec_sql"("query_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name');
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "util"."assert_same_household"("p_event_household" "uuid", "p_person_household" "uuid", "p_context" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  if p_event_household is distinct from p_person_household then
    raise exception 'Household mismatch in %: % <> %', p_context, p_event_household, p_person_household
      using errcode = '23514';
  end if;
end;
$$;


ALTER FUNCTION "util"."assert_same_household"("p_event_household" "uuid", "p_person_household" "uuid", "p_context" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "util"."assert_same_household"("p_event_household" "uuid", "p_person_household" "uuid", "p_context" "text") IS 'Guards cross-table inserts/updates (e.g., event.person_id) so referenced rows belong to the same household. Raises 23514 on mismatch.';



CREATE OR REPLACE FUNCTION "util"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if NEW is distinct from OLD then
    NEW.updated_at := now();
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION "util"."touch_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "util"."touch_updated_at"() IS 'Generic trigger to set updated_at on row changes, centralizing timestamp maintenance.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "app"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "person_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "event_date" "date" NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "location" "text",
    "driver_person_id" "uuid",
    "ride_needed" boolean GENERATED ALWAYS AS (("driver_person_id" IS NULL)) STORED,
    "source" "text" DEFAULT 'ui'::"text" NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "google_calendar_id" "text",
    CONSTRAINT "chk_time_order" CHECK ((("end_time" IS NULL) OR ("start_time" IS NULL) OR ("end_time" >= "start_time"))),
    CONSTRAINT "events_source_check" CHECK (("source" = ANY (ARRAY['ui'::"text", 'email'::"text", 'import'::"text"])))
);


ALTER TABLE "app"."events" OWNER TO "postgres";


COMMENT ON TABLE "app"."events" IS 'Schedule items (practices, pickups, appointments) for a person within a household. Driver assignment optional.';



COMMENT ON COLUMN "app"."events"."household_id" IS 'Tenant scoping for the event.';



COMMENT ON COLUMN "app"."events"."person_id" IS 'The person (often a child) whom this event is for.';



COMMENT ON COLUMN "app"."events"."title" IS 'Short label shown in feeds and calendars.';



COMMENT ON COLUMN "app"."events"."event_date" IS 'Calendar date of the event.';



COMMENT ON COLUMN "app"."events"."start_time" IS 'Start time (nullable for all-day/simple items).';



COMMENT ON COLUMN "app"."events"."end_time" IS 'End time (nullable). Must be >= start_time when both present.';



COMMENT ON COLUMN "app"."events"."location" IS 'Optional location text.';



COMMENT ON COLUMN "app"."events"."driver_person_id" IS 'Assigned driver; when null, ride_needed = true.';



COMMENT ON COLUMN "app"."events"."ride_needed" IS 'Generated flag: true when driver_person_id is null.';



COMMENT ON COLUMN "app"."events"."source" IS 'Provenance of the event: ui, email, or import.';



COMMENT ON COLUMN "app"."events"."notes" IS 'Optional free-form notes for the event.';



COMMENT ON COLUMN "app"."events"."created_by" IS 'User who created the event, when known.';



COMMENT ON COLUMN "app"."events"."created_at" IS 'Insert timestamp (audit).';



COMMENT ON COLUMN "app"."events"."updated_at" IS 'Update timestamp (audit).';



CREATE TABLE IF NOT EXISTS "app"."people" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "kind" "app"."person_kind" DEFAULT 'other'::"app"."person_kind" NOT NULL,
    "user_id" "uuid",
    "color_hex" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_color_hex_format" CHECK (("color_hex" ~ '^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$'::"text"))
);


ALTER TABLE "app"."people" OWNER TO "postgres";


COMMENT ON TABLE "app"."people" IS 'Directory of all members shown in the left nav. Adults may map to auth.users; kids typically will not.';



COMMENT ON COLUMN "app"."people"."household_id" IS 'The household this person belongs to.';



COMMENT ON COLUMN "app"."people"."display_name" IS 'Name shown in UI and messages.';



COMMENT ON COLUMN "app"."people"."kind" IS 'Parent, grandparent, child, or other.';



COMMENT ON COLUMN "app"."people"."user_id" IS 'Optional auth.users link for login-capable adults.';



COMMENT ON COLUMN "app"."people"."color_hex" IS 'UI color chip for this person (legend).';



COMMENT ON COLUMN "app"."people"."is_active" IS 'Soft-delete/control visibility without losing history.';



COMMENT ON COLUMN "app"."people"."created_at" IS 'Creation timestamp.';



COMMENT ON COLUMN "app"."people"."updated_at" IS 'Last modification timestamp.';



CREATE OR REPLACE VIEW "api"."v_family_feed_next_7d" AS
 SELECT "e"."id",
    "e"."household_id",
    "e"."event_date",
    "e"."start_time",
    "e"."end_time",
    "e"."title",
    "e"."location",
    "e"."ride_needed",
    "p"."display_name" AS "person_name",
    "dp"."display_name" AS "driver_name",
    "p"."id" AS "person_id",
    "dp"."id" AS "driver_person_id",
    "e"."source"
   FROM (("app"."events" "e"
     JOIN "app"."people" "p" ON (("p"."id" = "e"."person_id")))
     LEFT JOIN "app"."people" "dp" ON (("dp"."id" = "e"."driver_person_id")))
  WHERE (("e"."event_date" >= CURRENT_DATE) AND ("e"."event_date" <= (CURRENT_DATE + '7 days'::interval)))
  ORDER BY "e"."event_date", "e"."start_time";


ALTER VIEW "api"."v_family_feed_next_7d" OWNER TO "postgres";


COMMENT ON VIEW "api"."v_family_feed_next_7d" IS 'Household feed for the next 7 days; reduces app/agent need for ad hoc queries.';



CREATE OR REPLACE VIEW "api"."v_member_events_next_14d" AS
 SELECT "id",
    "household_id",
    "person_id",
    "event_date",
    "start_time",
    "end_time",
    "title",
    "location",
    "ride_needed",
    "driver_person_id",
    "source"
   FROM "app"."events" "e"
  WHERE (("event_date" >= CURRENT_DATE) AND ("event_date" <= (CURRENT_DATE + '14 days'::interval)))
  ORDER BY "event_date", "start_time";


ALTER VIEW "api"."v_member_events_next_14d" OWNER TO "postgres";


COMMENT ON VIEW "api"."v_member_events_next_14d" IS 'Member-scoped events for the next 14 days; app filters by person_id in the call.';



CREATE TABLE IF NOT EXISTS "app"."calendar_shares" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "person_ids" "uuid"[] NOT NULL,
    "shared_with" "text"[] NOT NULL,
    "token" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "app"."calendar_shares" OWNER TO "postgres";


COMMENT ON TABLE "app"."calendar_shares" IS 'Manages shared calendar links that can be accessed by external users. Stores configuration for which people/events are included in each share and tracks access tokens.';



CREATE TABLE IF NOT EXISTS "app"."household_members" (
    "household_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_label" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "household_members_role_label_check" CHECK (("role_label" = ANY (ARRAY['parent'::"text", 'grandparent'::"text", 'child'::"text", 'viewer'::"text", 'admin'::"text"])))
);


ALTER TABLE "app"."household_members" OWNER TO "postgres";


COMMENT ON TABLE "app"."household_members" IS 'Associates authenticated users with a household and a coarse role label (used by RLS and UI permissions).';



COMMENT ON COLUMN "app"."household_members"."household_id" IS 'Target household for the membership.';



COMMENT ON COLUMN "app"."household_members"."user_id" IS 'Authenticated user identifier (auth.users.id).';



COMMENT ON COLUMN "app"."household_members"."role_label" IS 'Role for app-level authorization (e.g., parents/admins can write).';



COMMENT ON COLUMN "app"."household_members"."created_at" IS 'Join timestamp.';



CREATE TABLE IF NOT EXISTS "app"."households" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "app"."households" OWNER TO "postgres";


COMMENT ON TABLE "app"."households" IS 'Tenancy anchor: a single family using Niles. All operational rows attach to a household.';



COMMENT ON COLUMN "app"."households"."id" IS 'Primary key for the household.';



COMMENT ON COLUMN "app"."households"."name" IS 'Display name (e.g., "Walsh Family").';



COMMENT ON COLUMN "app"."households"."created_at" IS 'Creation timestamp for auditing.';



CREATE TABLE IF NOT EXISTS "app"."messages_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "to_person_ids" "uuid"[] NOT NULL,
    "to_addresses" "text"[] NOT NULL,
    "subject" "text" NOT NULL,
    "body" "text" NOT NULL,
    "channel" "text" DEFAULT 'email'::"text" NOT NULL,
    "status" "app"."message_status" DEFAULT 'pending'::"app"."message_status" NOT NULL,
    "error_detail" "text",
    "related_event" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    CONSTRAINT "messages_log_channel_check" CHECK (("channel" = 'email'::"text"))
);


ALTER TABLE "app"."messages_log" OWNER TO "postgres";


COMMENT ON TABLE "app"."messages_log" IS 'Audit log of outbound notifications; helps debug delivery and power message history.';



COMMENT ON COLUMN "app"."messages_log"."to_person_ids" IS 'Person IDs (if known) for recipients.';



COMMENT ON COLUMN "app"."messages_log"."to_addresses" IS 'Actual recipient email addresses used.';



COMMENT ON COLUMN "app"."messages_log"."channel" IS 'Delivery channel (email for now).';



COMMENT ON COLUMN "app"."messages_log"."status" IS 'pending, sent, or error.';



COMMENT ON COLUMN "app"."messages_log"."related_event" IS 'Optional link to the event this message refers to.';



CREATE TABLE IF NOT EXISTS "app"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb",
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "app"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "app"."notifications" IS 'System-generated messages and alerts for users that appear in the notification center UI. Used for event reminders, task deadlines, ride request updates, and system announcements.';



COMMENT ON COLUMN "app"."notifications"."id" IS 'Primary key identifier for the notification record.';



COMMENT ON COLUMN "app"."notifications"."household_id" IS 'Foreign key to app.households, establishes tenant isolation and RLS boundaries.';



COMMENT ON COLUMN "app"."notifications"."user_id" IS 'Foreign key to auth.users, specifies which user should see this notification.';



COMMENT ON COLUMN "app"."notifications"."type" IS 'Classification of the notification (e.g., "event_reminder", "task_overdue", "ride_offer") used for UI treatment and filtering.';



COMMENT ON COLUMN "app"."notifications"."title" IS 'Short, descriptive heading shown in notification listings and push notifications.';



COMMENT ON COLUMN "app"."notifications"."message" IS 'Full notification text with details about the event, task, or action requiring attention.';



COMMENT ON COLUMN "app"."notifications"."data" IS 'Structured JSON payload containing IDs and metadata needed to link the notification to related records and power action buttons.';



COMMENT ON COLUMN "app"."notifications"."read" IS 'Boolean flag indicating whether the user has viewed this notification. Controls badge counters and highlighting.';



COMMENT ON COLUMN "app"."notifications"."created_at" IS 'Timestamp when the notification was generated, used for sorting and time-based filtering.';



CREATE TABLE IF NOT EXISTS "app"."ride_offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "offered_by_id" "uuid" NOT NULL,
    "status" "app"."ride_offer_status" DEFAULT 'proposed'::"app"."ride_offer_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "app"."ride_offers" OWNER TO "postgres";


COMMENT ON TABLE "app"."ride_offers" IS 'Volunteer offers to drive for an event; acceptance typically assigns the driver in app layer.';



COMMENT ON COLUMN "app"."ride_offers"."event_id" IS 'Event that needs a driver.';



COMMENT ON COLUMN "app"."ride_offers"."offered_by_id" IS 'Person offering to drive.';



COMMENT ON COLUMN "app"."ride_offers"."status" IS 'proposed, accepted, or declined.';



COMMENT ON COLUMN "app"."ride_offers"."created_at" IS 'Offer timestamp.';



CREATE TABLE IF NOT EXISTS "app"."system_prompts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "feature" "text" NOT NULL,
    "prompt_text" "text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "scope" "text" DEFAULT 'global'::"text" NOT NULL,
    "household_id" "uuid",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_scope_household" CHECK ((("scope" <> 'household'::"text") OR ("household_id" IS NOT NULL)))
);


ALTER TABLE "app"."system_prompts" OWNER TO "postgres";


COMMENT ON TABLE "app"."system_prompts" IS 'Stores system-level prompts that define application workflows, feature behaviors, and domain knowledge for the AI. These prompts establish how different features function and process information.';



COMMENT ON COLUMN "app"."system_prompts"."id" IS 'Unique identifier for each system prompt record';



COMMENT ON COLUMN "app"."system_prompts"."name" IS 'Human-readable name for the system prompt, used for administrative reference';



COMMENT ON COLUMN "app"."system_prompts"."feature" IS 'The specific app feature or workflow this prompt controls (e.g., calendar, tasks, messaging)';



COMMENT ON COLUMN "app"."system_prompts"."prompt_text" IS 'The detailed system instructions that guide the AI on how to handle requests for a specific feature, including constraints, domain knowledge, and procedural guidelines';



COMMENT ON COLUMN "app"."system_prompts"."version" IS 'Version number for tracking changes to system prompts; allows for prompt evolution while maintaining history';



COMMENT ON COLUMN "app"."system_prompts"."scope" IS 'Determines the applicability scope of the prompt: global (applies to all households) or household (customized for a specific household)';



COMMENT ON COLUMN "app"."system_prompts"."household_id" IS 'For household-scoped prompts, references the specific household this prompt applies to; null for global prompts';



COMMENT ON COLUMN "app"."system_prompts"."active" IS 'Boolean flag indicating whether this prompt is currently active; allows deactivating prompts without deletion';



COMMENT ON COLUMN "app"."system_prompts"."created_at" IS 'Timestamp when this system prompt was first created';



COMMENT ON COLUMN "app"."system_prompts"."updated_at" IS 'Timestamp when this system prompt was last modified';



CREATE TABLE IF NOT EXISTS "app"."task_checklist_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "is_done" boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "app"."task_checklist_items" OWNER TO "postgres";


COMMENT ON TABLE "app"."task_checklist_items" IS 'Optional fine-grained checklist entries under a task (e.g., gear, sub-steps).';



COMMENT ON COLUMN "app"."task_checklist_items"."task_id" IS 'Parent task for this checklist item.';



COMMENT ON COLUMN "app"."task_checklist_items"."label" IS 'Checklist item text.';



COMMENT ON COLUMN "app"."task_checklist_items"."is_done" IS 'Completion flag for the checklist item.';



COMMENT ON COLUMN "app"."task_checklist_items"."position" IS 'Sort order within a task.';



COMMENT ON COLUMN "app"."task_checklist_items"."created_at" IS 'Creation timestamp for audit.';



CREATE TABLE IF NOT EXISTS "app"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "person_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "status" "app"."task_status" DEFAULT 'todo'::"app"."task_status" NOT NULL,
    "due_date" "date",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "app"."tasks" OWNER TO "postgres";


COMMENT ON TABLE "app"."tasks" IS 'To-dos & chores for a person within a household; powers the board and reminders.';



COMMENT ON COLUMN "app"."tasks"."person_id" IS 'Person responsible for this task.';



COMMENT ON COLUMN "app"."tasks"."status" IS 'todo, in_progress, or done.';



COMMENT ON COLUMN "app"."tasks"."due_date" IS 'Optional due date used for overdue highlighting.';



CREATE TABLE IF NOT EXISTS "app"."telegram_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "person_id" "uuid" NOT NULL,
    "telegram_chat_id" "text" NOT NULL,
    "telegram_username" "text",
    "telegram_first_name" "text",
    "telegram_last_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "app"."telegram_users" OWNER TO "postgres";


COMMENT ON TABLE "app"."telegram_users" IS 'Links household members to their Telegram accounts. Enables messaging and notifications through the Telegram platform by storing chat IDs and user details.';



CREATE TABLE IF NOT EXISTS "app"."user_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text",
    "expires_at" bigint,
    "provider_user_id" "text",
    "additional_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "app"."user_integrations" OWNER TO "postgres";


COMMENT ON TABLE "app"."user_integrations" IS 'Stores authentication credentials and connection details for third-party integrations. Manages OAuth tokens and service-specific user information for calendar syncing, messaging platforms, and other external services.';



CREATE TABLE IF NOT EXISTS "app"."user_prompts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "person_id" "uuid" NOT NULL,
    "prompt_text" "text" NOT NULL,
    "tone" "text",
    "language_preference" "text" DEFAULT 'en'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "app"."user_prompts" OWNER TO "postgres";


COMMENT ON TABLE "app"."user_prompts" IS 'Stores personalization settings for individual users that control how the AI interacts with them. These prompts modify the tone, style, and personality of responses to match user preferences.';



COMMENT ON COLUMN "app"."user_prompts"."id" IS 'Unique identifier for each user prompt record';



COMMENT ON COLUMN "app"."user_prompts"."person_id" IS 'References the person this prompt applies to; links to app.people table';



COMMENT ON COLUMN "app"."user_prompts"."prompt_text" IS 'The actual prompt text that guides the AI on how to interact with this specific user, including personality traits, communication preferences, and other personalization aspects';



COMMENT ON COLUMN "app"."user_prompts"."tone" IS 'Preferred communication tone (e.g., friendly, professional, casual, formal) that influences AI responses to this user';



COMMENT ON COLUMN "app"."user_prompts"."language_preference" IS 'Preferred language code for communicating with the user; defaults to English (en)';



COMMENT ON COLUMN "app"."user_prompts"."created_at" IS 'Timestamp when this user prompt was first created';



COMMENT ON COLUMN "app"."user_prompts"."updated_at" IS 'Timestamp when this user prompt was last modified';



CREATE TABLE IF NOT EXISTS "memories"."actions_outbox" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "action" "jsonb" NOT NULL,
    CONSTRAINT "actions_outbox_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processed'::"text", 'error'::"text"])))
);


ALTER TABLE "memories"."actions_outbox" OWNER TO "postgres";


COMMENT ON TABLE "memories"."actions_outbox" IS 'Agent-initiated intents (assign driver, send email, etc.). Orchestrator validates and executes, then updates status.';



COMMENT ON COLUMN "memories"."actions_outbox"."status" IS 'Queue status; orchestrator flips to processed/error.';



COMMENT ON COLUMN "memories"."actions_outbox"."action" IS 'JSON payload describing the requested action.';



CREATE TABLE IF NOT EXISTS "memories"."decisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "topic" "text" NOT NULL,
    "decision" "text" NOT NULL,
    "decided_by" "text",
    "effective_from" "date",
    "expires_at" "date",
    "supersedes" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "memories"."decisions" OWNER TO "postgres";


COMMENT ON TABLE "memories"."decisions" IS 'Record of accepted rules/choices to justify future automations.';



COMMENT ON COLUMN "memories"."decisions"."topic" IS 'Topic or identifier for the decision (e.g., driver rotation August).';



COMMENT ON COLUMN "memories"."decisions"."decision" IS 'Human-readable statement of the decision.';



COMMENT ON COLUMN "memories"."decisions"."decided_by" IS 'Who made/approved the decision.';



COMMENT ON COLUMN "memories"."decisions"."effective_from" IS 'Date the decision takes effect.';



COMMENT ON COLUMN "memories"."decisions"."expires_at" IS 'Optional sunset date for the decision.';



COMMENT ON COLUMN "memories"."decisions"."supersedes" IS 'Links to a prior decision this one replaces.';



CREATE TABLE IF NOT EXISTS "memories"."events_semantic" (
    "event_id" "uuid" NOT NULL,
    "household_id" "uuid" NOT NULL,
    "text_for_search" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "embedding" "extensions"."vector"(384)
);


ALTER TABLE "memories"."events_semantic" OWNER TO "postgres";


COMMENT ON TABLE "memories"."events_semantic" IS 'Non-authoritative denormalized text (and optional embedding) for event retrieval. Safe to rebuild from app.events.';



CREATE TABLE IF NOT EXISTS "memories"."notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "subject" "text",
    "content" "text" NOT NULL,
    "source" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notes_kind_check" CHECK (("kind" = ANY (ARRAY['fact'::"text", 'summary'::"text", 'observation'::"text", 'rule'::"text"])))
);


ALTER TABLE "memories"."notes" OWNER TO "postgres";


COMMENT ON TABLE "memories"."notes" IS 'LLM durable notes (compact, human-readable).';



COMMENT ON COLUMN "memories"."notes"."household_id" IS 'Tenant scoping for the memory note.';



COMMENT ON COLUMN "memories"."notes"."kind" IS 'Classification of the note (fact/summary/observation/rule).';



COMMENT ON COLUMN "memories"."notes"."subject" IS 'Topic key (e.g., "Adelaide:dance", "driver_defaults").';



COMMENT ON COLUMN "memories"."notes"."content" IS 'Main content of the note.';



COMMENT ON COLUMN "memories"."notes"."source" IS 'Attribution payload (email id, event id, etc.).';



COMMENT ON COLUMN "memories"."notes"."updated_at" IS 'Update timestamp for synchronization.';



CREATE TABLE IF NOT EXISTS "memories"."preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "confidence" real DEFAULT 0.8 NOT NULL,
    "source" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "memories"."preferences" OWNER TO "postgres";


COMMENT ON TABLE "memories"."preferences" IS 'Structured defaults inferred by the agent (e.g., default drivers, gear).';



COMMENT ON COLUMN "memories"."preferences"."subject" IS 'Entity these preferences apply to (e.g., person, family).';



COMMENT ON COLUMN "memories"."preferences"."key" IS 'Preference key (namespaced as needed, e.g., "gear.shoes.size").';



COMMENT ON COLUMN "memories"."preferences"."value" IS 'JSON payload with the preference value.';



COMMENT ON COLUMN "memories"."preferences"."confidence" IS 'Agent confidence score (0–1).';



COMMENT ON COLUMN "memories"."preferences"."updated_at" IS 'Update timestamp; aids synchronization.';



CREATE TABLE IF NOT EXISTS "public"."kv_store_84035cd9" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL
);


ALTER TABLE "public"."kv_store_84035cd9" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "display_name" "text",
    "family_role" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


ALTER TABLE ONLY "app"."calendar_shares"
    ADD CONSTRAINT "calendar_shares_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "app"."calendar_shares"
    ADD CONSTRAINT "calendar_shares_token_key" UNIQUE ("token");



ALTER TABLE ONLY "app"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "app"."household_members"
    ADD CONSTRAINT "household_members_pkey" PRIMARY KEY ("household_id", "user_id");



ALTER TABLE ONLY "app"."households"
    ADD CONSTRAINT "households_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "app"."messages_log"
    ADD CONSTRAINT "messages_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "app"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "app"."people"
    ADD CONSTRAINT "people_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "app"."ride_offers"
    ADD CONSTRAINT "ride_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "app"."system_prompts"
    ADD CONSTRAINT "system_prompts_name_key" UNIQUE ("name");



ALTER TABLE ONLY "app"."system_prompts"
    ADD CONSTRAINT "system_prompts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "app"."task_checklist_items"
    ADD CONSTRAINT "task_checklist_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "app"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "app"."telegram_users"
    ADD CONSTRAINT "telegram_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "app"."telegram_users"
    ADD CONSTRAINT "telegram_users_telegram_chat_id_key" UNIQUE ("telegram_chat_id");



ALTER TABLE ONLY "app"."user_integrations"
    ADD CONSTRAINT "user_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "app"."user_integrations"
    ADD CONSTRAINT "user_integrations_user_id_provider_key" UNIQUE ("user_id", "provider");



ALTER TABLE ONLY "app"."user_prompts"
    ADD CONSTRAINT "user_prompts_person_id_key" UNIQUE ("person_id");



ALTER TABLE ONLY "app"."user_prompts"
    ADD CONSTRAINT "user_prompts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "memories"."actions_outbox"
    ADD CONSTRAINT "actions_outbox_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "memories"."decisions"
    ADD CONSTRAINT "decisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "memories"."events_semantic"
    ADD CONSTRAINT "events_semantic_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "memories"."notes"
    ADD CONSTRAINT "notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "memories"."preferences"
    ADD CONSTRAINT "preferences_household_id_subject_key_key" UNIQUE ("household_id", "subject", "key");



ALTER TABLE ONLY "memories"."preferences"
    ADD CONSTRAINT "preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kv_store_84035cd9"
    ADD CONSTRAINT "kv_store_84035cd9_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_events_date" ON "app"."events" USING "btree" ("event_date");



CREATE INDEX "idx_events_household_date" ON "app"."events" USING "btree" ("household_id", "event_date");



CREATE INDEX "idx_events_person_date" ON "app"."events" USING "btree" ("person_id", "event_date");



CREATE INDEX "idx_household_members_household_id_role" ON "app"."household_members" USING "btree" ("household_id", "role_label");



CREATE INDEX "idx_household_members_user_id" ON "app"."household_members" USING "btree" ("user_id");



CREATE INDEX "idx_incomplete_tasks" ON "app"."tasks" USING "btree" ("household_id", "person_id", "due_date") WHERE "app"."is_task_incomplete"("status");



CREATE INDEX "idx_pending_ride_offers" ON "app"."ride_offers" USING "btree" ("event_id") WHERE "app"."is_ride_offer_pending"("status");



CREATE INDEX "idx_ride_offers_event_status" ON "app"."ride_offers" USING "btree" ("event_id", "status");



CREATE INDEX "idx_ride_offers_status" ON "app"."ride_offers" USING "btree" ("status");



CREATE INDEX "idx_system_prompts_feature" ON "app"."system_prompts" USING "btree" ("feature");



CREATE INDEX "idx_system_prompts_household" ON "app"."system_prompts" USING "btree" ("household_id") WHERE ("household_id" IS NOT NULL);



CREATE INDEX "idx_tasks_household_status_due" ON "app"."tasks" USING "btree" ("household_id", "status", "due_date");



CREATE INDEX "idx_tasks_person_status" ON "app"."tasks" USING "btree" ("person_id", "status");



CREATE INDEX "idx_tasks_person_status_due" ON "app"."tasks" USING "btree" ("person_id", "status", "due_date");



CREATE INDEX "idx_tasks_status" ON "app"."tasks" USING "btree" ("household_id", "status");



CREATE INDEX "idx_user_prompts_person_id" ON "app"."user_prompts" USING "btree" ("person_id");



CREATE INDEX "ix_events_driver" ON "app"."events" USING "btree" ("driver_person_id");



CREATE INDEX "ix_events_household_date" ON "app"."events" USING "btree" ("household_id", "event_date");



CREATE INDEX "ix_events_person" ON "app"."events" USING "btree" ("person_id");



CREATE INDEX "ix_events_ride_needed" ON "app"."events" USING "btree" ("ride_needed") WHERE "ride_needed";



CREATE INDEX "ix_household_members_user" ON "app"."household_members" USING "btree" ("user_id");



CREATE INDEX "ix_messages_household_created" ON "app"."messages_log" USING "btree" ("household_id", "created_at" DESC);



CREATE INDEX "ix_people_household" ON "app"."people" USING "btree" ("household_id");



CREATE INDEX "ix_people_user" ON "app"."people" USING "btree" ("user_id");



CREATE INDEX "ix_ride_offers_event" ON "app"."ride_offers" USING "btree" ("event_id");



CREATE INDEX "ix_ride_offers_status" ON "app"."ride_offers" USING "btree" ("status");



CREATE INDEX "ix_task_items_task_pos" ON "app"."task_checklist_items" USING "btree" ("task_id", "position");



CREATE INDEX "ix_tasks_household_due" ON "app"."tasks" USING "btree" ("household_id", "due_date");



CREATE INDEX "ix_tasks_person" ON "app"."tasks" USING "btree" ("person_id");



CREATE INDEX "idx_events_semantic_text" ON "memories"."events_semantic" USING "gin" ("to_tsvector"('"english"'::"regconfig", "text_for_search"));



CREATE INDEX "idx_preferences_lookup" ON "memories"."preferences" USING "btree" ("household_id", "subject", "key");



CREATE INDEX "ix_mem_actions_status" ON "memories"."actions_outbox" USING "btree" ("status", "created_at");



CREATE INDEX "ix_mem_decisions_household" ON "memories"."decisions" USING "btree" ("household_id");



CREATE INDEX "ix_mem_notes_household" ON "memories"."notes" USING "btree" ("household_id");



CREATE INDEX "ix_mem_prefs_household" ON "memories"."preferences" USING "btree" ("household_id");



CREATE INDEX "kv_store_84035cd9_key_idx" ON "public"."kv_store_84035cd9" USING "btree" ("key" "text_pattern_ops");



CREATE OR REPLACE TRIGGER "t_events_household_check" BEFORE INSERT OR UPDATE ON "app"."events" FOR EACH ROW EXECUTE FUNCTION "app"."tg_events_household_check"();



COMMENT ON TRIGGER "t_events_household_check" ON "app"."events" IS 'Validates household consistency for person and driver references.';



CREATE OR REPLACE TRIGGER "t_events_semantic_delete" AFTER DELETE ON "app"."events" FOR EACH ROW EXECUTE FUNCTION "memories"."tg_refresh_events_semantic"();



COMMENT ON TRIGGER "t_events_semantic_delete" ON "app"."events" IS 'Deletes semantic cache rows when events are deleted.';



CREATE OR REPLACE TRIGGER "t_events_semantic_upsert" AFTER INSERT OR UPDATE ON "app"."events" FOR EACH ROW EXECUTE FUNCTION "memories"."tg_refresh_events_semantic"();



COMMENT ON TRIGGER "t_events_semantic_upsert" ON "app"."events" IS 'Refreshes/creates semantic cache rows whenever events change.';



CREATE OR REPLACE TRIGGER "t_events_updated_at" BEFORE UPDATE ON "app"."events" FOR EACH ROW EXECUTE FUNCTION "util"."touch_updated_at"();



COMMENT ON TRIGGER "t_events_updated_at" ON "app"."events" IS 'Maintains updated_at when an event row changes.';



CREATE OR REPLACE TRIGGER "t_people_updated_at" BEFORE UPDATE ON "app"."people" FOR EACH ROW EXECUTE FUNCTION "util"."touch_updated_at"();



COMMENT ON TRIGGER "t_people_updated_at" ON "app"."people" IS 'Maintains updated_at when a person row changes.';



CREATE OR REPLACE TRIGGER "t_tasks_household_check" BEFORE INSERT OR UPDATE ON "app"."tasks" FOR EACH ROW EXECUTE FUNCTION "app"."tg_tasks_household_check"();



COMMENT ON TRIGGER "t_tasks_household_check" ON "app"."tasks" IS 'Validates person/household alignment for tasks.';



CREATE OR REPLACE TRIGGER "t_tasks_updated_at" BEFORE UPDATE ON "app"."tasks" FOR EACH ROW EXECUTE FUNCTION "util"."touch_updated_at"();



COMMENT ON TRIGGER "t_tasks_updated_at" ON "app"."tasks" IS 'Maintains updated_at when a task changes.';



CREATE OR REPLACE TRIGGER "t_mem_notes_updated_at" BEFORE UPDATE ON "memories"."notes" FOR EACH ROW EXECUTE FUNCTION "util"."touch_updated_at"();



COMMENT ON TRIGGER "t_mem_notes_updated_at" ON "memories"."notes" IS 'Maintains updated_at when a memory note changes.';



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "app"."calendar_shares"
    ADD CONSTRAINT "calendar_shares_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "app"."calendar_shares"
    ADD CONSTRAINT "calendar_shares_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "app"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "app"."events"
    ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "app"."events"
    ADD CONSTRAINT "events_driver_person_id_fkey" FOREIGN KEY ("driver_person_id") REFERENCES "app"."people"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "app"."events"
    ADD CONSTRAINT "events_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "app"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "app"."events"
    ADD CONSTRAINT "events_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "app"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "app"."household_members"
    ADD CONSTRAINT "household_members_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "app"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "app"."household_members"
    ADD CONSTRAINT "household_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "app"."messages_log"
    ADD CONSTRAINT "messages_log_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "app"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "app"."messages_log"
    ADD CONSTRAINT "messages_log_related_event_fkey" FOREIGN KEY ("related_event") REFERENCES "app"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "app"."notifications"
    ADD CONSTRAINT "notifications_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "app"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "app"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "app"."people"
    ADD CONSTRAINT "people_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "app"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "app"."people"
    ADD CONSTRAINT "people_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "app"."ride_offers"
    ADD CONSTRAINT "ride_offers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "app"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "app"."ride_offers"
    ADD CONSTRAINT "ride_offers_offered_by_id_fkey" FOREIGN KEY ("offered_by_id") REFERENCES "app"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "app"."system_prompts"
    ADD CONSTRAINT "system_prompts_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "app"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "app"."task_checklist_items"
    ADD CONSTRAINT "task_checklist_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "app"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "app"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "app"."tasks"
    ADD CONSTRAINT "tasks_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "app"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "app"."tasks"
    ADD CONSTRAINT "tasks_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "app"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "app"."telegram_users"
    ADD CONSTRAINT "telegram_users_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "app"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "app"."user_integrations"
    ADD CONSTRAINT "user_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "app"."user_prompts"
    ADD CONSTRAINT "user_prompts_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "app"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "memories"."actions_outbox"
    ADD CONSTRAINT "actions_outbox_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "app"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "memories"."decisions"
    ADD CONSTRAINT "decisions_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "app"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "memories"."decisions"
    ADD CONSTRAINT "decisions_supersedes_fkey" FOREIGN KEY ("supersedes") REFERENCES "memories"."decisions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "memories"."events_semantic"
    ADD CONSTRAINT "events_semantic_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "app"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "memories"."events_semantic"
    ADD CONSTRAINT "events_semantic_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "app"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "memories"."notes"
    ADD CONSTRAINT "notes_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "app"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "memories"."preferences"
    ADD CONSTRAINT "preferences_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "app"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Parents can manage household member prompts" ON "app"."user_prompts" TO "authenticated" USING (("person_id" IN ( SELECT "p"."id"
   FROM (("app"."people" "p"
     JOIN "app"."people" "self" ON (("self"."household_id" = "p"."household_id")))
     JOIN "app"."household_members" "hm" ON ((("hm"."household_id" = "p"."household_id") AND ("hm"."user_id" = "auth"."uid"()))))
  WHERE (("hm"."role_label" = 'parent'::"text") OR ("hm"."role_label" = 'admin'::"text")))));



CREATE POLICY "Parents can manage household system prompts" ON "app"."system_prompts" TO "authenticated" USING (("household_id" IN ( SELECT "hm"."household_id"
   FROM "app"."household_members" "hm"
  WHERE (("hm"."user_id" = "auth"."uid"()) AND (("hm"."role_label" = 'parent'::"text") OR ("hm"."role_label" = 'admin'::"text"))))));



CREATE POLICY "Users can connect telegram for themselves" ON "app"."telegram_users" FOR INSERT TO "authenticated" WITH CHECK (("person_id" IN ( SELECT "p"."id"
   FROM "app"."people" "p"
  WHERE ("p"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their own integrations" ON "app"."user_integrations" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own telegram connections" ON "app"."telegram_users" FOR DELETE TO "authenticated" USING (("person_id" IN ( SELECT "p"."id"
   FROM "app"."people" "p"
  WHERE ("p"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert their own integrations" ON "app"."user_integrations" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own prompt" ON "app"."user_prompts" FOR INSERT TO "authenticated" WITH CHECK (("person_id" IN ( SELECT "p"."id"
   FROM "app"."people" "p"
  WHERE ("p"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own integrations" ON "app"."user_integrations" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own prompt" ON "app"."user_prompts" FOR UPDATE TO "authenticated" USING (("person_id" IN ( SELECT "p"."id"
   FROM "app"."people" "p"
  WHERE ("p"."user_id" = "auth"."uid"())))) WITH CHECK (("person_id" IN ( SELECT "p"."id"
   FROM "app"."people" "p"
  WHERE ("p"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own telegram connections" ON "app"."telegram_users" FOR UPDATE TO "authenticated" USING (("person_id" IN ( SELECT "p"."id"
   FROM "app"."people" "p"
  WHERE ("p"."user_id" = "auth"."uid"())))) WITH CHECK (("person_id" IN ( SELECT "p"."id"
   FROM "app"."people" "p"
  WHERE ("p"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view global system prompts" ON "app"."system_prompts" FOR SELECT TO "authenticated" USING (("scope" = 'global'::"text"));



CREATE POLICY "Users can view telegram connections for their household" ON "app"."telegram_users" FOR SELECT TO "authenticated" USING (("person_id" IN ( SELECT "p"."id"
   FROM ("app"."people" "p"
     JOIN "app"."household_members" "hm" ON (("hm"."household_id" = "p"."household_id")))
  WHERE ("hm"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their household system prompts" ON "app"."system_prompts" FOR SELECT TO "authenticated" USING (("household_id" IN ( SELECT "hm"."household_id"
   FROM "app"."household_members" "hm"
  WHERE ("hm"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own integrations" ON "app"."user_integrations" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own prompt" ON "app"."user_prompts" FOR SELECT TO "authenticated" USING (("person_id" IN ( SELECT "p"."id"
   FROM "app"."people" "p"
  WHERE ("p"."user_id" = "auth"."uid"()))));



ALTER TABLE "app"."calendar_shares" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "calendar_shares_manage_parents_admins" ON "app"."calendar_shares" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "app"."household_members" "hm"
  WHERE (("hm"."household_id" = "calendar_shares"."household_id") AND ("hm"."user_id" = "app"."current_user_id"()) AND ("hm"."role_label" = ANY (ARRAY['parent'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "app"."household_members" "hm"
  WHERE (("hm"."household_id" = "calendar_shares"."household_id") AND ("hm"."user_id" = "app"."current_user_id"()) AND ("hm"."role_label" = ANY (ARRAY['parent'::"text", 'admin'::"text"]))))));



CREATE POLICY "calendar_shares_select_members" ON "app"."calendar_shares" FOR SELECT TO "authenticated" USING ("app"."is_member_of_household"("app"."current_user_id"(), "household_id"));



ALTER TABLE "app"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_select_members_only" ON "app"."events" FOR SELECT USING ("app"."is_member_of_household"("app"."current_user_id"(), "household_id"));



CREATE POLICY "events_write_parents_admins" ON "app"."events" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "app"."household_members" "hm"
  WHERE (("hm"."household_id" = "events"."household_id") AND ("hm"."user_id" = "app"."current_user_id"()) AND ("hm"."role_label" = ANY (ARRAY['parent'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "app"."household_members" "hm"
  WHERE (("hm"."household_id" = "events"."household_id") AND ("hm"."user_id" = "app"."current_user_id"()) AND ("hm"."role_label" = ANY (ARRAY['parent'::"text", 'admin'::"text"]))))));



ALTER TABLE "app"."household_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "household_members_select_members_only" ON "app"."household_members" FOR SELECT USING ("app"."is_member_of_household"("app"."current_user_id"(), "household_id"));



ALTER TABLE "app"."households" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "households_select_members_only" ON "app"."households" FOR SELECT USING ("app"."is_member_of_household"("app"."current_user_id"(), "id"));



ALTER TABLE "app"."messages_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_select_members_only" ON "app"."messages_log" FOR SELECT USING ("app"."is_member_of_household"("app"."current_user_id"(), "household_id"));



CREATE POLICY "messages_write_parents_admins" ON "app"."messages_log" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "app"."household_members" "hm"
  WHERE (("hm"."household_id" = "messages_log"."household_id") AND ("hm"."user_id" = "app"."current_user_id"()) AND ("hm"."role_label" = ANY (ARRAY['parent'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "app"."household_members" "hm"
  WHERE (("hm"."household_id" = "messages_log"."household_id") AND ("hm"."user_id" = "app"."current_user_id"()) AND ("hm"."role_label" = ANY (ARRAY['parent'::"text", 'admin'::"text"]))))));



ALTER TABLE "app"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_select_own" ON "app"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "app"."current_user_id"()));



ALTER TABLE "app"."people" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "people_select_members_only" ON "app"."people" FOR SELECT USING ("app"."is_member_of_household"("app"."current_user_id"(), "household_id"));



ALTER TABLE "app"."ride_offers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ride_offers_select_members_only" ON "app"."ride_offers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "app"."events" "e"
  WHERE (("e"."id" = "ride_offers"."event_id") AND "app"."is_member_of_household"("app"."current_user_id"(), "e"."household_id")))));



CREATE POLICY "ride_offers_write_parents_admins" ON "app"."ride_offers" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("app"."events" "e"
     JOIN "app"."household_members" "hm" ON (("hm"."household_id" = "e"."household_id")))
  WHERE (("e"."id" = "ride_offers"."event_id") AND ("hm"."user_id" = "app"."current_user_id"()) AND ("hm"."role_label" = ANY (ARRAY['parent'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("app"."events" "e"
     JOIN "app"."household_members" "hm" ON (("hm"."household_id" = "e"."household_id")))
  WHERE (("e"."id" = "ride_offers"."event_id") AND ("hm"."user_id" = "app"."current_user_id"()) AND ("hm"."role_label" = ANY (ARRAY['parent'::"text", 'admin'::"text"]))))));



ALTER TABLE "app"."system_prompts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "app"."task_checklist_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_items_select_members_only" ON "app"."task_checklist_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "app"."tasks" "t"
  WHERE (("t"."id" = "task_checklist_items"."task_id") AND "app"."is_member_of_household"("app"."current_user_id"(), "t"."household_id")))));



CREATE POLICY "task_items_write_parents_admins" ON "app"."task_checklist_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("app"."tasks" "t"
     JOIN "app"."household_members" "hm" ON (("hm"."household_id" = "t"."household_id")))
  WHERE (("t"."id" = "task_checklist_items"."task_id") AND ("hm"."user_id" = "app"."current_user_id"()) AND ("hm"."role_label" = ANY (ARRAY['parent'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("app"."tasks" "t"
     JOIN "app"."household_members" "hm" ON (("hm"."household_id" = "t"."household_id")))
  WHERE (("t"."id" = "task_checklist_items"."task_id") AND ("hm"."user_id" = "app"."current_user_id"()) AND ("hm"."role_label" = ANY (ARRAY['parent'::"text", 'admin'::"text"]))))));



ALTER TABLE "app"."tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tasks_select_members_only" ON "app"."tasks" FOR SELECT USING ("app"."is_member_of_household"("app"."current_user_id"(), "household_id"));



ALTER TABLE "app"."telegram_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "app"."user_integrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "app"."user_prompts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."kv_store_84035cd9" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "api" TO PUBLIC;



GRANT USAGE ON SCHEMA "app" TO "memories_role";






GRANT USAGE ON SCHEMA "memories" TO "memories_role";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."exec_sql"("query_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."exec_sql"("query_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exec_sql"("query_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT SELECT ON TABLE "app"."events" TO "memories_role";



GRANT SELECT ON TABLE "app"."people" TO "memories_role";



GRANT SELECT ON TABLE "api"."v_family_feed_next_7d" TO PUBLIC;
GRANT SELECT ON TABLE "api"."v_family_feed_next_7d" TO "memories_role";



GRANT SELECT ON TABLE "api"."v_member_events_next_14d" TO PUBLIC;
GRANT SELECT ON TABLE "api"."v_member_events_next_14d" TO "memories_role";



GRANT SELECT ON TABLE "app"."calendar_shares" TO "memories_role";



GRANT SELECT ON TABLE "app"."household_members" TO "memories_role";



GRANT SELECT ON TABLE "app"."households" TO "memories_role";



GRANT SELECT ON TABLE "app"."messages_log" TO "memories_role";



GRANT SELECT ON TABLE "app"."notifications" TO "memories_role";



GRANT SELECT ON TABLE "app"."ride_offers" TO "memories_role";



GRANT SELECT ON TABLE "app"."system_prompts" TO "memories_role";



GRANT SELECT ON TABLE "app"."task_checklist_items" TO "memories_role";



GRANT SELECT ON TABLE "app"."tasks" TO "memories_role";



GRANT SELECT ON TABLE "app"."telegram_users" TO "memories_role";



GRANT SELECT ON TABLE "app"."user_integrations" TO "memories_role";



GRANT SELECT ON TABLE "app"."user_prompts" TO "memories_role";





















GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "memories"."actions_outbox" TO "memories_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "memories"."decisions" TO "memories_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "memories"."events_semantic" TO "memories_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "memories"."notes" TO "memories_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "memories"."preferences" TO "memories_role";



GRANT ALL ON TABLE "public"."kv_store_84035cd9" TO "anon";
GRANT ALL ON TABLE "public"."kv_store_84035cd9" TO "authenticated";
GRANT ALL ON TABLE "public"."kv_store_84035cd9" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "app" GRANT SELECT ON TABLES TO "memories_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "memories" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "memories_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
