import { createClient } from "npm:@supabase/supabase-js@2.38.0";
import { google } from "npm:googleapis@128.0.0";
import { OAuth2Client } from "npm:google-auth-library@9.4.1";
// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
// Google OAuth config
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const REDIRECT_URL = Deno.env.get("GOOGLE_REDIRECT_URL") || "";
// Router for handling different paths
const router = {
  // Generate Google OAuth URL for user authorization
  "/google-calendar-sync/auth": async (req)=>{
    const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URL);
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/calendar"
      ],
      prompt: "consent"
    });
    return new Response(JSON.stringify({
      url: authUrl
    }), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  // Handle OAuth callback and save tokens
  "/google-calendar-sync/callback": async (req)=>{
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code) {
      return new Response(JSON.stringify({
        error: "No code provided"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Get user ID from state parameter (should be set during auth)
    const userId = state;
    if (!userId) {
      return new Response(JSON.stringify({
        error: "Invalid state parameter"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URL);
    try {
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      // Initialize Supabase admin client
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      // Store tokens in the database
      const { error } = await supabase.from("user_integrations").upsert({
        user_id: userId,
        provider: "google_calendar",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date
      });
      if (error) throw error;
      // Redirect to success page
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/calendar-connected-success"
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
  },
  // Sync events between app and Google Calendar
  "/google-calendar-sync/sync": async (req)=>{
    try {
      const { person_id } = await req.json();
      if (!person_id) {
        return new Response(JSON.stringify({
          error: "Person ID is required"
        }), {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      // Get user info and tokens
      const { data: person, error: personError } = await supabase.from("people").select("user_id, household_id").eq("id", person_id).single();
      if (personError || !person) {
        return new Response(JSON.stringify({
          error: "Person not found"
        }), {
          status: 404,
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
      // Get integration tokens
      const { data: integration, error: integrationError } = await supabase.from("user_integrations").select("*").eq("user_id", person.user_id).eq("provider", "google_calendar").single();
      if (integrationError || !integration) {
        return new Response(JSON.stringify({
          error: "Google Calendar not connected"
        }), {
          status: 404,
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
      // Set up Google Calendar client
      const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URL);
      // Check if token needs refresh
      if (integration.expires_at < Date.now()) {
        oauth2Client.setCredentials({
          refresh_token: integration.refresh_token
        });
        const { credentials } = await oauth2Client.refreshAccessToken();
        // Update tokens
        await supabase.from("user_integrations").update({
          access_token: credentials.access_token,
          expires_at: credentials.expiry_date
        }).eq("user_id", person.user_id).eq("provider", "google_calendar");
        integration.access_token = credentials.access_token;
      }
      oauth2Client.setCredentials({
        access_token: integration.access_token,
        refresh_token: integration.refresh_token
      });
      const calendar = google.calendar({
        version: "v3",
        auth: oauth2Client
      });
      // Get events from app database
      const { data: events, error: eventsError } = await supabase.from("events").select("*").eq("household_id", person.household_id).eq("person_id", person_id).gte("event_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 7 days
      .order("event_date", {
        ascending: true
      });
      if (eventsError) {
        return new Response(JSON.stringify({
          error: eventsError.message
        }), {
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
      // Push events to Google Calendar
      const syncResults = [];
      for (const event of events){
        try {
          // Skip events that are already synced
          if (event.google_calendar_id) continue;
          const startDateTime = event.start_time ? `${event.event_date}T${event.start_time}` : `${event.event_date}T00:00:00`;
          const endDateTime = event.end_time ? `${event.event_date}T${event.end_time}` : `${event.event_date}T23:59:59`;
          const googleEvent = {
            summary: event.title,
            location: event.location || "",
            description: event.notes || "",
            start: {
              dateTime: startDateTime,
              timeZone: "America/Los_Angeles"
            },
            end: {
              dateTime: endDateTime,
              timeZone: "America/Los_Angeles"
            },
            reminders: {
              useDefault: true
            }
          };
          const response = await calendar.events.insert({
            calendarId: "primary",
            resource: googleEvent
          });
          // Update the event with Google Calendar ID
          await supabase.from("events").update({
            google_calendar_id: response.data.id
          }).eq("id", event.id);
          syncResults.push({
            event_id: event.id,
            google_id: response.data.id,
            status: "synced"
          });
        } catch (error) {
          syncResults.push({
            event_id: event.id,
            error: error.message,
            status: "failed"
          });
        }
      }
      return new Response(JSON.stringify({
        synced: syncResults.filter((r)=>r.status === "synced").length,
        failed: syncResults.filter((r)=>r.status === "failed").length,
        results: syncResults
      }), {
        headers: {
          "Content-Type": "application/json"
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
  }
};
Deno.serve(async (req)=>{
  const url = new URL(req.url);
  const path = url.pathname;
  // Route the request to the appropriate handler
  const handler = router[path];
  if (handler) {
    return await handler(req);
  }
  // No matching route
  return new Response(JSON.stringify({
    error: "Not found"
  }), {
    status: 404,
    headers: {
      "Content-Type": "application/json"
    }
  });
});
