import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-secret",
}

interface LumioRepository {
  id: string
  user_id: string
  name: string
  github_owner: string
  github_repo: string
  last_sync_at: string | null
}

/**
 * Edge Function to check for pending repository syncs
 * Called by external job/cron service to trigger periodic sync
 *
 * Auth: Requires X-Sync-Secret header matching LUMIO_SYNC_SECRET env var
 *
 * Query params:
 * - minutes: number of minutes since last sync to consider stale (default: 40)
 * - limit: max number of repos to sync per call (default: 10)
 */
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify authorization via custom secret header
    const syncSecret = req.headers.get("X-Sync-Secret")
    const expectedSecret = Deno.env.get("LUMIO_SYNC_SECRET")

    if (!expectedSecret) {
      console.error("LUMIO_SYNC_SECRET not configured")
      return new Response(
        JSON.stringify({ error: "Server misconfigured - LUMIO_SYNC_SECRET not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!syncSecret) {
      return new Response(
        JSON.stringify({ error: "Missing X-Sync-Secret header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (syncSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: "Invalid X-Sync-Secret" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse query parameters
    const url = new URL(req.url)
    const minutesThreshold = parseInt(url.searchParams.get("minutes") || "40", 10)
    const limit = parseInt(url.searchParams.get("limit") || "10", 10)

    // Calculate threshold timestamp
    const thresholdDate = new Date()
    thresholdDate.setMinutes(thresholdDate.getMinutes() - minutesThreshold)
    const thresholdISO = thresholdDate.toISOString()

    // Find repositories that need syncing:
    // - sync_status is 'pending' OR
    // - last_sync_at is null OR
    // - last_sync_at is older than threshold
    const { data: repos, error: repoError } = await supabase
      .from("lumio_repositories")
      .select("id, user_id, name, github_owner, github_repo, last_sync_at")
      .or(`sync_status.eq.pending,last_sync_at.is.null,last_sync_at.lt.${thresholdISO}`)
      .neq("sync_status", "syncing") // Don't pick up repos currently syncing
      .limit(limit)

    if (repoError) {
      console.error("Error fetching repositories:", repoError)
      return new Response(
        JSON.stringify({ error: "Failed to fetch repositories", details: repoError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!repos || repos.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No repositories need syncing",
          syncedCount: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Sync each repository
    const results: Array<{
      repositoryId: string
      name: string
      success: boolean
      cardsCount?: number
      error?: string
    }> = []

    for (const repo of repos as LumioRepository[]) {
      try {
        // Call lumio-sync-repo function with service_role key and userId
        const syncUrl = `${supabaseUrl}/functions/v1/lumio-sync-repo`
        const syncResponse = await fetch(syncUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "apikey": supabaseServiceKey,  // Required for Supabase Gateway auth
          },
          body: JSON.stringify({
            repositoryId: repo.id,
            userId: repo.user_id  // Pass userId for service_role auth
          }),
        })

        // Check HTTP status first
        if (!syncResponse.ok) {
          const errorText = await syncResponse.text()
          console.error(`Sync failed for ${repo.name}: HTTP ${syncResponse.status} - ${errorText}`)
          results.push({
            repositoryId: repo.id,
            name: repo.name,
            success: false,
            error: `HTTP ${syncResponse.status}: ${errorText.slice(0, 200)}`,
          })
          continue
        }

        const syncResult = await syncResponse.json()

        if (syncResult.success) {
          results.push({
            repositoryId: repo.id,
            name: repo.name,
            success: true,
            cardsCount: syncResult.cardsCount,
          })
        } else {
          console.error(`Sync returned failure for ${repo.name}:`, syncResult)
          results.push({
            repositoryId: repo.id,
            name: repo.name,
            success: false,
            error: syncResult.error || "Unknown sync error",
          })
        }
      } catch (syncError) {
        console.error(`Failed to sync repo ${repo.id}:`, syncError)
        results.push({
          repositoryId: repo.id,
          name: repo.name,
          success: false,
          error: syncError instanceof Error ? syncError.message : "Unknown error",
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const totalCards = results.reduce((sum, r) => sum + (r.cardsCount || 0), 0)

    return new Response(
      JSON.stringify({
        success: true,
        syncedCount: successCount,
        totalCards,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Check Pending Error:", error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
