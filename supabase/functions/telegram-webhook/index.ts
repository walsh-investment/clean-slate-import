// telegram-webhook edge function
// This function receives and processes incoming messages from Telegram
import { createClient } from "npm:@supabase/supabase-js@2.38.4";
// Environment variables (set these with supabase secrets set)
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Initialize Supabase client with service role key for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// Helper function to send Telegram messages
async function sendTelegramMessage(chat_id, text, parse_mode = "HTML") {
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
  return await response.json();
}
// Helper to extract command from message
function extractCommand(text) {
  if (!text) return null;
  const match = text.match(/^\/([a-zA-Z0-9_]+)(@\w+)?(\s+(.*))?/);
  if (match) {
    return {
      command: match[1].toLowerCase(),
      args: match[4] ? match[4].trim() : ''
    };
  }
  return null;
}
// Process incoming messages
async function processMessage(message) {
  // Extract message details
  const chatId = message.chat.id;
  const userId = message.from.id;
  const userName = message.from.username || message.from.first_name;
  const text = message.text || '';
  console.log(`Received message from ${userName} (${userId}): ${text}`);
  // Store message in database
  const { error: dbError } = await supabase.from("messages_log").insert({
    channel: "telegram",
    household_id: userId.toString(),
    body: text,
    to_addresses: [
      `${chatId}`
    ],
    status: "received"
  });
  if (dbError) {
    console.error("Error storing message:", dbError);
  }
  // Check for commands
  const commandData = extractCommand(text);
  if (commandData) {
    // Handle different commands
    switch(commandData.command){
      case "start":
        await sendTelegramMessage(chatId, `Welcome to Natural DB, ${userName}! I'm your AI assistant. You can ask me questions or add notes by typing /note followed by your text.`);
        break;
      case "help":
        await sendTelegramMessage(chatId, `<b>Available commands:</b>\n\n` + `/start - Start the bot\n` + `/help - Show this help message\n` + `/note [text] - Save a note\n` + `/search [query] - Search your notes\n\n` + `You can also just chat with me directly!`);
        break;
      case "note":
        if (commandData.args) {
          // Store note in database
          const { error: noteError } = await supabase.from("memories.notes").insert({
            household_id: userId.toString(),
            content: commandData.args,
            kind: "note",
            source: {
              source_type: "telegram",
              user: userName
            },
            tags: [
              "telegram"
            ]
          });
          if (noteError) {
            console.error("Error storing note:", noteError);
            await sendTelegramMessage(chatId, "Sorry, I couldn't save your note. Please try again.");
          } else {
            await sendTelegramMessage(chatId, "✅ Note saved successfully!");
          }
        } else {
          await sendTelegramMessage(chatId, "Please include some text with your note. Example: /note Remember to buy milk");
        }
        break;
      case "search":
        if (commandData.args) {
          // Call search function (assumes you have a search_notes function)
          try {
            const { data: results, error: searchError } = await supabase.rpc('search_notes', {
              query_text: commandData.args,
              household_filter: userId.toString(),
              match_limit: 5
            });
            if (searchError) throw searchError;
            if (results && results.length > 0) {
              const resultText = results.map((note)=>`<b>Note:</b> ${note.content}\n<i>Created: ${new Date(note.created_at).toLocaleDateString()}</i>`).join('\n\n');
              await sendTelegramMessage(chatId, `<b>Search results:</b>\n\n${resultText}`);
            } else {
              await sendTelegramMessage(chatId, "No matching notes found.");
            }
          } catch (err) {
            console.error("Search error:", err);
            await sendTelegramMessage(chatId, "Sorry, I encountered an error while searching.");
          }
        } else {
          await sendTelegramMessage(chatId, "Please include a search term. Example: /search groceries");
        }
        break;
      default:
        // Unknown command
        await sendTelegramMessage(chatId, "I don't recognize that command. Type /help for a list of commands.");
    }
    return;
  }
  // If not a command, process as regular message
  // Store user message and generate a response (could call another edge function here)
  await sendTelegramMessage(chatId, `I received your message: "${text}"\n\nYou can use /note to save this as a note or ask me questions.`);
}
// Main handler function
Deno.serve(async (req)=>{
  // Verify this is a POST request
  if (req.method !== "POST") {
    return new Response("This endpoint requires a POST request", {
      status: 405
    });
  }
  // Verify required env vars
  if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing required environment variables");
    return new Response("Server configuration error", {
      status: 500
    });
  }
  try {
    // Parse incoming webhook data
    const data = await req.json();
    console.log("Received webhook:", JSON.stringify(data));
    // Process message if present
    if (data.message) {
      await processMessage(data.message);
    }
    // Always respond with 200 OK to Telegram
    return new Response(JSON.stringify({
      success: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
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
