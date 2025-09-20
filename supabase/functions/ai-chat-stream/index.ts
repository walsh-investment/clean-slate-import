// ai-chat-stream edge function
// Provides streaming SSE responses for AI chat with comprehensive error logging
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { OpenAI } from "npm:openai@4.20.1";

// Environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const openaiKey = Deno.env.get("OPENAI_API_KEY");

console.log("Environment check:", {
  supabaseUrl: !!supabaseUrl,
  supabaseKey: !!supabaseKey,
  openaiKey: !!openaiKey
});

if (!openaiKey) {
  console.error("OPENAI_API_KEY missing at runtime");
  await logError(
    'openai_key_missing',
    'critical',
    'ai_chat_stream',
    'edge_function',
    'OPENAI_API_KEY not visible to runtime',
    '',
    {}
  );
}

// Initialize clients
const supabase = createClient(supabaseUrl!, supabaseKey!);
const openai = openaiKey ? new OpenAI({
  apiKey: openaiKey
}) : null;

// CORS headers for SSE
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

// System prompt template
const SYSTEM_PROMPT = `You are a helpful family assistant that helps organize schedules and tasks.
You have access to the family's notes and memories stored in the database.
Use this information to provide personalized and contextually relevant responses.
If you don't have specific information about something, acknowledge that and avoid making assumptions.

Here are some recent notes from the family's database that may be relevant:

{{relevantNotes}}

Current date: {{currentDate}}`;

// Error logging helper
async function logError(
  fingerprint: string, 
  level: 'info' | 'warning' | 'error' | 'critical',
  category: string,
  scope: 'edge_function' | 'integration' | 'client' | 'database',
  message: string,
  stack: string,
  context?: any
) {
  try {
    await supabase.rpc('upsert_error_aggregate', {
      p_fingerprint: fingerprint,
      p_level: level,
      p_category: category,
      p_scope: scope,
      p_message: message,
      p_stack: stack || ''
    });
    
    console.log(`Error logged: ${fingerprint} - ${message}`, context);
  } catch (error) {
    console.error('Failed to log error:', error);
  }
}

console.log("ai-chat-stream function initialized");

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let householdId: string | undefined;
  let userId: string | undefined;
  
  try {
    // Parse request
    const { message, household_id, user_id, history_limit = 5 } = await req.json();
    householdId = household_id;
    userId = user_id;
    
    if (!message || !householdId) {
      await logError(
        'missing_parameters',
        'warning',
        'ai_chat_stream',
        'edge_function',
        'Missing required parameters: message or household_id',
        '',
        { message: !!message, household_id: !!householdId }
      );
      
      return new Response(JSON.stringify({
        error: "Missing required parameters"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Check if OpenAI client is available
    if (!openai) {
      await logError(
        'openai_unavailable',
        'critical',
        'ai_chat_stream',
        'edge_function',
        'OpenAI client not initialized - API key missing',
        '',
        { household_id: householdId, user_id: userId }
      );
      
      return new Response(JSON.stringify({
        error: "AI service temporarily unavailable"
      }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Set up SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection event
          controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

          // 1. Fetch relevant notes using semantic search
          const relevantNotes = await fetchRelevantNotes(message, householdId);
          
          // 2. Get recent conversation history
          const chatHistory = await fetchChatHistory(householdId, history_limit);
          
          // 3. Generate system prompt with memory context
          const formattedSystemPrompt = SYSTEM_PROMPT
            .replace("{{relevantNotes}}", formatNotes(relevantNotes))
            .replace("{{currentDate}}", new Date().toISOString().split('T')[0]);

          // 4. Generate streaming AI response
          const stream = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              { role: "system", content: formattedSystemPrompt },
              ...chatHistory,
              { role: "user", content: message }
            ],
            temperature: 0.7,
            max_tokens: 1000,
            stream: true
          });

          let fullResponse = '';
          
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              controller.enqueue(`data: ${JSON.stringify({ 
                type: 'content', 
                content: content 
              })}\n\n`);
            }
          }

          // 5. Store the conversation in the database
          await storeConversation(householdId, message, fullResponse);
          
          // 6. Extract and store memories (async)
          extractAndStoreMemories(message, fullResponse, householdId);
          
          // Send completion event
          console.log('Sending completion event');
          controller.enqueue(`data: ${JSON.stringify({ 
            type: 'done',
            full_response: fullResponse 
          })}\n\n`);
          
          console.log('Closing SSE stream');
          controller.close();
          
        } catch (error) {
          console.error("Streaming error:", error);
          
          await logError(
            'streaming_error',
            'error',
            'ai_chat_stream',
            'edge_function',
            `Streaming failed: ${error.message}`,
            error.stack || '',
            { household_id: householdId, user_id: userId, message_length: message?.length }
          );
          
          controller.enqueue(`data: ${JSON.stringify({ 
            type: 'error', 
            error: 'Internal server error' 
          })}\n\n`);
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: corsHeaders });
    
  } catch (error) {
    console.error("Chat stream function error:", error);
    
    await logError(
      'function_initialization_error',
      'critical',
      'ai_chat_stream',
      'edge_function',
      `Function failed to initialize: ${error.message}`,
      error.stack || '',
      { household_id: householdId, user_id: userId }
    );
    
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

// Helper functions
async function fetchRelevantNotes(query: string, householdId: string) {
  try {
    // Try semantic search first
    const { data, error } = await supabase.rpc("search_notes", {
      query_text: query,
      household_filter: householdId,
      match_limit: 5
    });
    
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("Error fetching relevant notes:", e);
    
    await logError(
      'notes_fetch_error',
      'warning',
      'memory_system',
      'database',
      `Failed to fetch relevant notes: ${e.message}`,
      e.stack || '',
      { household_id: householdId, query_length: query.length }
    );
    
    // Fallback to keyword search
    try {
      const { data } = await supabase
        .from("memories.notes")
        .select("id, content, created_at")
        .eq("household_id", householdId)
        .textSearch("content", query.split(" ").join(" | "))
        .limit(5);
      return data || [];
    } catch (fallbackError) {
      await logError(
        'notes_fallback_error',
        'error',
        'memory_system',
        'database',
        `Fallback notes search failed: ${fallbackError.message}`,
        fallbackError.stack || '',
        { household_id: householdId }
      );
      return [];
    }
  }
}

async function fetchChatHistory(householdId: string, limit: number) {
  try {
    const { data, error } = await supabase
      .from("app.messages_log")
      .select("subject, body, created_at")
      .eq("household_id", householdId)
      .eq("channel", "chat")
      .order("created_at", { ascending: false })
      .limit(limit * 2);
    
    if (error) throw error;
    
    // Format into OpenAI message format
    const messages = [];
    for (let i = data.length - 1; i >= 0; i--) {
      const msg = data[i];
      if (msg.subject === "user") {
        messages.push({ role: "user", content: msg.body });
      } else if (msg.subject === "assistant") {
        messages.push({ role: "assistant", content: msg.body });
      }
    }
    
    return messages;
  } catch (error) {
    console.error("Error fetching chat history:", error);
    
    await logError(
      'chat_history_error',
      'warning',
      'ai_chat_stream',
      'database',
      `Failed to fetch chat history: ${error.message}`,
      error.stack || '',
      { household_id: householdId, limit }
    );
    
    return [];
  }
}

function formatNotes(notes: any[]) {
  if (!notes.length) return "No relevant notes found.";
  return notes.map((note) =>
    `- ${note.content} [Noted on: ${new Date(note.created_at).toLocaleDateString()}]`
  ).join("\n");
}

async function storeConversation(householdId: string, userMessage: string, aiResponse: string) {
  try {
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
  } catch (error) {
    console.error("Error storing conversation:", error);
    
    await logError(
      'conversation_storage_error',
      'error',
      'ai_chat_stream',
      'database',
      `Failed to store conversation: ${error.message}`,
      error.stack || '',
      { household_id: householdId, user_message_length: userMessage.length, ai_response_length: aiResponse.length }
    );
  }
}

async function extractAndStoreMemories(userMessage: string, aiResponse: string, householdId: string) {
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
      response_format: { type: "json_object" }
    });

    const facts = JSON.parse(extraction.choices[0].message.content || "{}").facts || [];

    // Store each extracted fact in the notes table
    if (facts.length > 0) {
      for (const fact of facts) {
        await supabase.from("memories.notes").insert({
          household_id: householdId,
          kind: fact.kind,
          content: fact.content,
          source: { derived_from: "conversation" }
        });
      }
      console.log(`Stored ${facts.length} new memories from conversation`);
    }
  } catch (error) {
    console.error("Error extracting memories:", error);
    
    await logError(
      'memory_extraction_error',
      'warning',
      'memory_system',
      'integration',
      `Failed to extract memories: ${error.message}`,
      error.stack || '',
      { household_id: householdId }
    );
  }
}