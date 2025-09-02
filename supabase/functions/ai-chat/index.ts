// ai-chat edge function
// Handles conversational interaction with an AI assistant that has memory capabilities
// through database integration, implementing the Natural DB pattern
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { OpenAI } from "npm:openai@4.20.1";
// Environment variables are automatically available
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const openaiKey = Deno.env.get("OPENAI_API_KEY");
// Initialize clients
const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({
  apiKey: openaiKey
});
// System prompt template
const SYSTEM_PROMPT = `You are a helpful family assistant that helps organize schedules and tasks.
You have access to the family's notes and memories stored in the database.
Use this information to provide personalized and contextually relevant responses.
If you don't have specific information about something, acknowledge that and avoid making assumptions.

Here are some recent notes from the family's database that may be relevant:

{{relevantNotes}}

Current date: {{currentDate}}`;
console.log("ai-chat function initialized");
Deno.serve(async (req)=>{
  try {
    // Parse request
    const { message, householdId, historyLimit = 5 } = await req.json();
    if (!message || !householdId) {
      return new Response(JSON.stringify({
        error: "Missing required parameters"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // 1. Fetch relevant notes using semantic search (if vector extension enabled)
    const relevantNotes = await fetchRelevantNotes(message, householdId);
    // 2. Get recent conversation history
    const chatHistory = await fetchChatHistory(householdId, historyLimit);
    // 3. Generate system prompt with memory context
    const formattedSystemPrompt = SYSTEM_PROMPT.replace("{{relevantNotes}}", formatNotes(relevantNotes)).replace("{{currentDate}}", new Date().toISOString().split('T')[0]);
    // 4. Generate AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: formattedSystemPrompt
        },
        ...chatHistory,
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    const aiResponse = completion.choices[0].message.content;
    // 5. Store the conversation in the database
    await storeConversation(householdId, message, aiResponse);
    // 6. Optional: Extract and store any new facts/memories
    EdgeRuntime.waitUntil(extractAndStoreMemories(message, aiResponse, householdId));
    return new Response(JSON.stringify({
      response: aiResponse
    }), {
      headers: {
        "Content-Type": "application/json",
        "Connection": "keep-alive"
      }
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
// Helper functions
async function fetchRelevantNotes(query, householdId) {
  try {
    // If using pgvector, perform semantic search
    const { data, error } = await supabase.rpc("search_notes", {
      query_text: query,
      household_filter: householdId,
      match_limit: 5
    });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("Error fetching relevant notes:", e);
    // Fallback to keyword search if vector search fails
    const { data } = await supabase.from("memories.notes").select("id, content, created_at").eq("household_id", householdId).textSearch("content", query.split(" ").join(" | ")).limit(5);
    return data || [];
  }
}
async function fetchChatHistory(householdId, limit) {
  const { data, error } = await supabase.from("app.messages_log").select("subject, body, created_at").eq("household_id", householdId).eq("channel", "chat").order("created_at", {
    ascending: false
  }).limit(limit * 2); // Get pairs of messages
  if (error) {
    console.error("Error fetching chat history:", error);
    return [];
  }
  // Format into OpenAI message format
  const messages = [];
  for(let i = data.length - 1; i >= 0; i--){
    const msg = data[i];
    if (msg.subject === "user") {
      messages.push({
        role: "user",
        content: msg.body
      });
    } else if (msg.subject === "assistant") {
      messages.push({
        role: "assistant",
        content: msg.body
      });
    }
  }
  return messages;
}
function formatNotes(notes) {
  if (!notes.length) return "No relevant notes found.";
  return notes.map((note)=>`- ${note.content} [Noted on: ${new Date(note.created_at).toLocaleDateString()}]`).join("\n");
}
async function storeConversation(householdId, userMessage, aiResponse) {
  // Store user message
  await supabase.from("app.messages_log").insert({
    household_id: householdId,
    to_person_ids: [],
    to_addresses: [],
    subject: "user",
    body: userMessage,
    channel: "chat",
    status: "sent"
  });
  // Store AI response
  await supabase.from("app.messages_log").insert({
    household_id: householdId,
    to_person_ids: [],
    to_addresses: [],
    subject: "assistant",
    body: aiResponse,
    channel: "chat",
    status: "sent"
  });
}
async function extractAndStoreMemories(userMessage, aiResponse, householdId) {
  try {
    // Ask the AI to extract factual information from the conversation
    const extraction = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Extract factual information from this conversation that would be useful to remember. Return as a JSON array of facts with 'content' and 'kind' properties. Kind should be one of: fact, preference, observation, rule. If there are no clear facts, return an empty array."
        },
        {
          role: "user",
          content: `User: ${userMessage}\n\nAssistant: ${aiResponse}`
        }
      ],
      response_format: {
        type: "json_object"
      }
    });
    const facts = JSON.parse(extraction.choices[0].message.content || "{}").facts || [];
    // Store each extracted fact in the notes table
    if (facts.length > 0) {
      for (const fact of facts){
        await supabase.from("memories.notes").insert({
          household_id: householdId,
          kind: fact.kind,
          content: fact.content,
          source: {
            derived_from: "conversation"
          }
        });
      }
      console.log(`Stored ${facts.length} new memories from conversation`);
    }
  } catch (error) {
    console.error("Error extracting memories:", error);
  }
}
