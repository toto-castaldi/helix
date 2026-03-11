import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { docoraApiCall } from "../_shared/docora.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface RequestBody {
  repositoryId: string
  newToken: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      console.error("Missing authorization header")
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate JWT and get user
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      console.error("JWT validation failed:", userError?.message || "no user")
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Parse request body
    const body: RequestBody = await req.json()
    const { repositoryId, newToken } = body

    if (!repositoryId || !newToken) {
      return new Response(
        JSON.stringify({ error: "repositoryId and newToken are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Verify user owns the repository
    const { data: repo, error: repoError } = await supabase
      .from("lumio_repositories")
      .select("*")
      .eq("id", repositoryId)
      .eq("user_id", user.id)
      .single()

    if (repoError || !repo) {
      return new Response(
        JSON.stringify({ error: "Repository not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Check repository has docora_repository_id
    if (!repo.docora_repository_id) {
      return new Response(
        JSON.stringify({ error: "Repository is not registered with Docora" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Call Docora PATCH API to update token (Docora-first, fail fast)
    const docoraResult = await docoraApiCall(
      `/api/repositories/${repo.docora_repository_id}/token`,
      "PATCH",
      { github_token: newToken }
    )

    if (docoraResult.error) {
      console.error("Docora token update failed:", docoraResult.error)
      return new Response(
        JSON.stringify({ error: `Failed to update token on Docora: ${docoraResult.error}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Docora succeeded -- now update database
    const { error: updateError } = await supabase
      .from("lumio_repositories")
      .update({
        access_token: newToken,
        sync_status: "pending",
        sync_error_message: null,
        sync_failed_at: null,
      })
      .eq("id", repositoryId)

    if (updateError) {
      console.error("Failed to update repository in database:", updateError)
      return new Response(
        JSON.stringify({ error: "Token updated on Docora but failed to save locally" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: "Token updated successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Docora Update Token Error:", error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
