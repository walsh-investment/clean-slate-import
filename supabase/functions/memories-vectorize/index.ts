// memories-vectorize edge function
// This function creates embeddings for text using OpenAI's embedding API
// and stores them in the database for semantic search capabilities
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { OpenAI } from "npm:openai@4.20.1";
// Environment variables are automatically available in both local and hosted environments
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const openaiKey = Deno.env.get("OPENAI_API_KEY");
// Initialize clients
const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({
  apiKey: openaiKey
});
console.log("memories-vectorize function initialized");
Deno.serve(async (req)=>{
  try {
    // Parse request
    const { text, tableName, recordId, columnName } = await req.json();
    if (!text || !tableName || !recordId || !columnName) {
      return new Response(JSON.stringify({
        error: "Missing required parameters"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Generate embedding using OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text
    });
    const embedding = embeddingResponse.data[0].embedding;
    // Store embedding in database
    const { data, error } = await supabase.from(tableName).update({
      [columnName]: embedding
    }).eq("id", recordId);
    if (error) {
      console.error("Error storing embedding:", error);
      return new Response(JSON.stringify({
        error: "Failed to store embedding",
        details: error
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Let EdgeRuntime handle any background tasks
    EdgeRuntime.waitUntil((async ()=>{
      console.log(`Successfully vectorized content for ${tableName}:${recordId}`);
    })());
    return new Response(JSON.stringify({
      success: true,
      message: "Embedding generated and stored successfully"
    }), {
      headers: {
        "Content-Type": "application/json",
        "Connection": "keep-alive"
      }
    });
  } catch (error) {
    console.error("Vectorize function error:", error);
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
