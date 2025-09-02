// telegram-send edge function
// This function sends messages to Telegram users from your application
import { createClient } from "npm:@supabase/supabase-js@2.38.4";
// Environment variables
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Secure API key to prevent unauthorized access
const API_KEY = Deno.env.get("TELEGRAM_API_KEY");
// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
/**
 * Sends a message to a Telegram chat
 * @param {string} chat_id - The chat ID to send the message to
 * @param {string} text - The message text to send
 * @param {string} parse_mode - The parsing mode (HTML, Markdown, etc)
 * @returns {Promise<object>} - The Telegram API response
 */ async function sendTelegramMessage(chat_id, text, parse_mode = "HTML") {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id,
      text,
      parse_mode
    })
  });
  const result = await response.json();
  if (!result.ok) {
    throw new Error(`Telegram API error: ${JSON.stringify(result)}`);
  }
  return result;
}
// Main handler function
Deno.serve(async (req)=>{
  // Verify HTTP method
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405
    });
  }
  // Verify required environment variables
  if (!TELEGRAM_BOT_TOKEN || !API_KEY) {
    console.error("Missing required environment variables");
    return new Response("Server configuration error", {
      status: 500
    });
  }
  try {
    // Check authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.replace("Bearer ", "") !== API_KEY) {
      return new Response("Unauthorized", {
        status: 401
      });
    }
    // Parse request body
    const { chat_id, text, parse_mode, household_id, subject// Optional: Subject for logging
     } = await req.json();
    // Validate required fields
    if (!chat_id || !text) {
      return new Response(JSON.stringify({
        error: "Missing required fields: chat_id and text"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Send message via Telegram API
    const result = await sendTelegramMessage(chat_id, text, parse_mode || "HTML");
    // Log the sent message if we have a household_id
    if (household_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      await supabase.from("messages_log").insert({
        household_id,
        channel: "telegram",
        to_addresses: [
          chat_id
        ],
        subject: subject || "Message from Natural DB",
        body: text,
        status: "sent"
      });
    }
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      result
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
