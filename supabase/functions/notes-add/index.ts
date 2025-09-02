// notes-add edge function
// Creates and stores notes in the memories.notes table with automatic vectorization
// for semantic search capabilities
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
// Environment variables are automatically available
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Initialize client
const supabase = createClient(supabaseUrl, supabaseKey);
console.log("notes-add function initialized");
Deno.serve(async (req)=>{
  try {
    // Parse request
    const { content, householdId, kind = "fact", source = {}, tags = [] } = await req.json();
    if (!content || !householdId) {
      return new Response(JSON.stringify({
        error: "Missing required parameters"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // 1. Insert the note into the database
    const { data: note, error } = await supabase.from("memories.notes").insert({
      household_id: householdId,
      content,
      kind,
      source,
      tags
    }).select("id, content, created_at").single();
    if (error) {
      console.error("Error creating note:", error);
      return new Response(JSON.stringify({
        error: "Failed to create note",
        details: error
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // 2. Trigger vectorization in the background (don't await)
    EdgeRuntime.waitUntil((async ()=>{
      try {
        // Call the memories-vectorize function to create embeddings
        const vectorizeResponse = await fetch(`${supabaseUrl}/functions/v1/memories-vectorize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            text: content,
            tableName: "memories.notes",
            recordId: note.id,
            columnName: "embedding"
          })
        });
        if (!vectorizeResponse.ok) {
          const errorData = await vectorizeResponse.json();
          console.error("Vectorization failed:", errorData);
        } else {
          console.log(`Successfully vectorized note: ${note.id}`);
        }
      } catch (vectorizeError) {
        console.error("Error during vectorization:", vectorizeError);
      // Note is still created even if vectorization fails
      }
    })());
    return new Response(JSON.stringify({
      success: true,
      note: {
        id: note.id,
        content: note.content,
        created_at: note.created_at
      },
      message: "Note created successfully and vectorization initiated"
    }), {
      headers: {
        "Content-Type": "application/json",
        "Connection": "keep-alive"
      }
    });
  } catch (error) {
    console.error("Note creation error:", error);
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
