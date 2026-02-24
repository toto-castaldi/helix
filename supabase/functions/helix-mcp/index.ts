import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2"
import {
  generateClientCard,
  formatDate,
  type Client,
  type GoalHistory,
  type Session,
  type Gym,
} from "../_shared/client-card.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-client-info, apikey, content-type, x-helix-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// ============================================
// Types
// ============================================

interface JsonRpcRequest {
  jsonrpc: "2.0"
  id: string | number
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcResponse {
  jsonrpc: "2.0"
  id: string | number | null
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

interface ResourceContent {
  uri: string
  mimeType: string
  text: string
}

interface PromptMessage {
  role: "user" | "assistant"
  content: {
    type: "text"
    text: string
  }
}

// ============================================
// Authentication
// ============================================

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

async function authenticateRequest(req: Request): Promise<{ userId: string; supabase: SupabaseClient } | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  console.log("[AUTH] Starting authentication...")

  // Try API key first (X-Helix-API-Key header)
  const apiKey = req.headers.get("X-Helix-API-Key")
  if (apiKey) {
    console.log("[AUTH] Found X-Helix-API-Key header")
    const hashedKey = await hashApiKey(apiKey)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await adminClient
      .from("coach_ai_settings")
      .select("user_id")
      .eq("helix_mcp_api_key_hash", hashedKey)
      .single()

    if (data && !error) {
      console.log("[AUTH] API key valid, user_id:", data.user_id)
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      return { userId: data.user_id, supabase }
    }
    console.log("[AUTH] API key invalid:", error?.message)
    return null
  }

  console.log("[AUTH] No API key provided")
  return null
}

// ============================================
// Helper Functions
// ============================================

async function fetchClientWithDetails(supabase: SupabaseClient, userId: string, clientId: string) {
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("user_id", userId)
    .single()

  if (error || !client) return null

  const { data: goals } = await supabase
    .from("goal_history")
    .select("*")
    .eq("client_id", clientId)
    .order("started_at", { ascending: false })

  const { data: sessions } = await supabase
    .from("sessions")
    .select(`
      *,
      gym:gyms(*),
      exercises:session_exercises(
        *,
        exercise:exercises(*)
      )
    `)
    .eq("client_id", clientId)
    .order("session_date", { ascending: false })

  return { client, goals: goals || [], sessions: sessions || [] }
}

// ============================================
// Ownership Verification Helpers
// ============================================

async function verifySessionOwnership(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<{ owned: boolean }> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, client:clients!inner(user_id)")
    .eq("id", sessionId)
    .single()

  if (error || !data) {
    return { owned: false }
  }

  const client = data.client as { user_id: string }
  if (client.user_id !== userId) {
    console.warn(`[SECURITY] Ownership violation: user=${userId} attempted to access session=${sessionId}`)
    return { owned: false }
  }

  return { owned: true }
}

async function verifySessionExerciseOwnership(
  supabase: SupabaseClient,
  userId: string,
  sessionExerciseId: string
): Promise<{ owned: boolean; sessionId?: string }> {
  const { data, error } = await supabase
    .from("session_exercises")
    .select("id, session_id, session:sessions!inner(client:clients!inner(user_id))")
    .eq("id", sessionExerciseId)
    .single()

  if (error || !data) {
    return { owned: false }
  }

  const session = data.session as { client: { user_id: string } }
  if (session.client.user_id !== userId) {
    console.warn(`[SECURITY] Ownership violation: user=${userId} attempted to access session_exercise=${sessionExerciseId}`)
    return { owned: false }
  }

  return { owned: true, sessionId: data.session_id }
}

async function verifyClientOwnership(
  supabase: SupabaseClient,
  userId: string,
  clientId: string
): Promise<{ owned: boolean }> {
  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("user_id", userId)
    .single()

  if (error || !data) {
    if (error && error.code !== "PGRST116") {
      // PGRST116 = "not found" - only log if the client exists but belongs to someone else
      // For simplicity, we log on any failure that isn't a missing record
    }
    // Check if client exists to determine if this is a violation or just not found
    const { data: exists } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .single()

    if (exists) {
      console.warn(`[SECURITY] Ownership violation: user=${userId} attempted to access client=${clientId}`)
    }
    return { owned: false }
  }

  return { owned: true }
}

// ============================================
// Error Helpers
// ============================================

type ErrorCategory = 'not_found' | 'access_denied' | 'validation_error' | 'database_error' | 'unknown_tool' | 'template_in_use'

function toolError(
  category: ErrorCategory,
  message: string
): { content: Array<{ type: string; text: string }>; isError: true } {
  return {
    content: [{ type: "text", text: `[${category}] ${message}` }],
    isError: true,
  }
}

// ============================================
// Validation Helpers
// ============================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidUuid(s: unknown): s is string {
  return typeof s === "string" && UUID_RE.test(s)
}

function isValidDate(s: unknown): s is string {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false
  return !isNaN(Date.parse(s))
}

function isPositiveNumber(n: unknown): n is number {
  return typeof n === "number" && n > 0 && isFinite(n)
}

function isNonNegativeNumber(n: unknown): n is number {
  return typeof n === "number" && n >= 0 && isFinite(n)
}

function isNonEmptyString(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0
}

function stripNulls(obj: unknown): unknown {
  if (obj === null || obj === undefined) return undefined
  if (Array.isArray(obj)) return obj.map(stripNulls)
  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const stripped = stripNulls(value)
      if (stripped !== undefined) result[key] = stripped
    }
    return result
  }
  return obj
}

function validateToolInput(name: string, args: Record<string, unknown>): string | null {
  switch (name) {
    case "create_session": {
      if (!isValidUuid(args.client_id)) return "client_id must be a valid UUID."
      if (!isValidDate(args.session_date)) return "session_date must be a valid date (YYYY-MM-DD)."
      if (args.gym_id !== undefined && !isValidUuid(args.gym_id)) return "gym_id must be a valid UUID."
      return null
    }
    case "update_session": {
      if (!isValidUuid(args.session_id)) return "session_id must be a valid UUID."
      if (args.session_date !== undefined && !isValidDate(args.session_date)) return "session_date must be a valid date (YYYY-MM-DD)."
      if (args.gym_id !== undefined && !isValidUuid(args.gym_id)) return "gym_id must be a valid UUID."
      if (args.status !== undefined && args.status !== "planned" && args.status !== "completed") return "status must be 'planned' or 'completed'."
      return null
    }
    case "delete_session":
    case "complete_session": {
      if (!isValidUuid(args.session_id)) return "session_id must be a valid UUID."
      return null
    }
    case "duplicate_session": {
      if (!isValidUuid(args.session_id)) return "session_id must be a valid UUID."
      if (!isValidDate(args.new_date)) return "new_date must be a valid date (YYYY-MM-DD)."
      if (args.new_client_id !== undefined && !isValidUuid(args.new_client_id)) return "new_client_id must be a valid UUID."
      return null
    }
    case "add_session_exercise": {
      if (!isValidUuid(args.session_id)) return "session_id must be a valid UUID."
      if (!isValidUuid(args.exercise_id)) return "exercise_id must be a valid UUID."
      if (args.sets !== undefined && !isPositiveNumber(args.sets)) return "sets must be a positive number."
      if (args.reps !== undefined && !isPositiveNumber(args.reps)) return "reps must be a positive number."
      if (args.weight_kg !== undefined && !isNonNegativeNumber(args.weight_kg)) return "weight_kg must be a non-negative number."
      if (args.duration_seconds !== undefined && !isPositiveNumber(args.duration_seconds)) return "duration_seconds must be a positive number."
      if (args.order_index !== undefined && !isNonNegativeNumber(args.order_index)) return "order_index must be a non-negative number."
      return null
    }
    case "update_session_exercise": {
      if (!isValidUuid(args.session_exercise_id)) return "session_exercise_id must be a valid UUID."
      if (args.sets !== undefined && !isPositiveNumber(args.sets)) return "sets must be a positive number."
      if (args.reps !== undefined && !isPositiveNumber(args.reps)) return "reps must be a positive number."
      if (args.weight_kg !== undefined && !isNonNegativeNumber(args.weight_kg)) return "weight_kg must be a non-negative number."
      if (args.duration_seconds !== undefined && !isPositiveNumber(args.duration_seconds)) return "duration_seconds must be a positive number."
      return null
    }
    case "remove_session_exercise": {
      if (!isValidUuid(args.session_exercise_id)) return "session_exercise_id must be a valid UUID."
      return null
    }
    case "reorder_session_exercises": {
      if (!isValidUuid(args.session_id)) return "session_id must be a valid UUID."
      if (!Array.isArray(args.exercise_ids)) return "exercise_ids must be an array."
      if (args.exercise_ids.length === 0) return "exercise_ids must not be empty."
      for (const id of args.exercise_ids) {
        if (!isValidUuid(id)) return `exercise_ids contains invalid UUID: ${id}`
      }
      return null
    }
    case "create_training_plan": {
      if (!isValidUuid(args.client_id)) return "client_id must be a valid UUID."
      if (!isValidDate(args.session_date)) return "session_date must be a valid date (YYYY-MM-DD)."
      if (args.gym_id !== undefined && !isValidUuid(args.gym_id)) return "gym_id must be a valid UUID."
      if (!Array.isArray(args.exercises)) return "exercises must be an array."
      if (args.exercises.length === 0) return "exercises must not be empty."
      for (let i = 0; i < args.exercises.length; i++) {
        const ex = args.exercises[i]
        if (!ex || typeof ex !== "object") return `exercises[${i}] must be an object.`
        if (!isNonEmptyString((ex as Record<string, unknown>).exercise_name)) return `exercises[${i}].exercise_name is required.`
      }
      return null
    }
    case "create_group_template": {
      if (!isNonEmptyString(args.name)) return "name is required and must not be empty."
      return null
    }
    case "update_group_template": {
      if (!isValidUuid(args.template_id)) return "template_id must be a valid UUID."
      if (!isNonEmptyString(args.name)) return "name is required and must not be empty."
      return null
    }
    case "delete_group_template": {
      if (!isValidUuid(args.template_id)) return "template_id must be a valid UUID."
      return null
    }
    case "add_template_exercise": {
      if (!isValidUuid(args.template_id)) return "template_id must be a valid UUID."
      if (!isValidUuid(args.exercise_id)) return "exercise_id must be a valid UUID."
      if (args.sets !== undefined && !isPositiveNumber(args.sets)) return "sets must be a positive number."
      if (args.reps !== undefined && !isPositiveNumber(args.reps)) return "reps must be a positive number."
      if (args.weight_kg !== undefined && !isNonNegativeNumber(args.weight_kg)) return "weight_kg must be a non-negative number."
      if (args.duration_seconds !== undefined && !isPositiveNumber(args.duration_seconds)) return "duration_seconds must be a positive number."
      return null
    }
    case "remove_template_exercise": {
      if (!isValidUuid(args.template_exercise_id)) return "template_exercise_id must be a valid UUID."
      return null
    }
    case "apply_template_to_session": {
      if (!isValidUuid(args.template_id)) return "template_id must be a valid UUID."
      if (!isValidUuid(args.session_id)) return "session_id must be a valid UUID."
      if (args.mode !== "append" && args.mode !== "replace") return "mode must be 'append' or 'replace'."
      return null
    }
    default:
      return null
  }
}

// ============================================
// MCP Protocol Implementation
// ============================================

const SERVER_INFO = {
  name: "helix-fitness-coach",
  version: "1.0.0",
}

const CAPABILITIES = {
  resources: { listChanged: false },
  tools: {},
  prompts: { listChanged: false },
}

// Resource definitions
function getResourceTemplates() {
  return [
    { uri: "helix://clients", name: "clients-list", description: "Lists all clients belonging to the authenticated coach. Returns client ID, name, age, birth date, gender, and current goal. Use this to discover client IDs needed by tools like create_session.", mimeType: "application/json" },
    { uriTemplate: "helix://clients/{clientId}", name: "client-detail", description: "Returns complete details for a specific client including personal data and physical notes.", mimeType: "application/json" },
    { uriTemplate: "helix://clients/{clientId}/card", name: "client-card", description: "Returns a comprehensive markdown card for a client including personal data, goal history, and all training sessions with exercises. Ideal for AI context when planning workouts.", mimeType: "text/markdown" },
    { uriTemplate: "helix://clients/{clientId}/goals", name: "client-goals", description: "Returns the goal history for a client, ordered by most recent first. Each goal has start date and optional end date.", mimeType: "application/json" },
    { uriTemplate: "helix://clients/{clientId}/sessions", name: "client-sessions", description: "Returns all training sessions for a client with exercises, ordered by most recent first.", mimeType: "application/json" },
    { uri: "helix://gyms", name: "gyms-list", description: "Lists all gyms belonging to the authenticated coach. Returns gym ID, name, address, and description.", mimeType: "application/json" },
    { uriTemplate: "helix://gyms/{gymId}", name: "gym-detail", description: "Returns complete details for a specific gym.", mimeType: "application/json" },
    { uri: "helix://exercises", name: "exercises-list", description: "Lists all available exercises (default catalog plus coach's custom exercises). Returns exercise ID, name, description, and tags.", mimeType: "application/json" },
    { uriTemplate: "helix://exercises/{exerciseId}", name: "exercise-detail", description: "Returns complete details for an exercise including tags and linked Lumio card content.", mimeType: "application/json" },
    { uriTemplate: "helix://exercises/{exerciseId}/lumio", name: "exercise-lumio", description: "Returns the Lumio card content (markdown) linked to an exercise, if any. Lumio cards contain detailed exercise instructions and images.", mimeType: "text/markdown" },
    { uri: "helix://exercises/tags", name: "exercise-tags", description: "Lists all unique exercise tags available for filtering.", mimeType: "application/json" },
    { uriTemplate: "helix://exercises/tags/{tag}", name: "exercises-by-tag", description: "Returns exercises filtered by a specific tag. Use helix://exercises/tags to discover available tags first.", mimeType: "application/json" },
    { uri: "helix://sessions", name: "sessions-list", description: "Lists the 50 most recent training sessions across all clients, ordered by date descending.", mimeType: "application/json" },
    { uri: "helix://sessions/planned", name: "sessions-planned", description: "Lists all planned (not yet completed) training sessions, ordered by date ascending. Use to see upcoming workouts.", mimeType: "application/json" },
    { uriTemplate: "helix://sessions/date/{date}", name: "sessions-by-date", description: "Returns all sessions scheduled for a specific date (YYYY-MM-DD format) with full exercise details.", mimeType: "application/json" },
    { uriTemplate: "helix://sessions/{sessionId}", name: "session-detail", description: "Returns complete details for a session including client info, gym, and all exercises with parameters.", mimeType: "application/json" },
    { uri: "helix://group-templates", name: "group-templates-list", description: "Lists all group exercise templates with exercise count and preview of first 3 exercise names.", mimeType: "application/json" },
    { uriTemplate: "helix://group-templates/{templateId}", name: "group-template-detail", description: "Returns complete details for a group template including all exercises with parameters, ordered by position.", mimeType: "application/json" },
    { uri: "helix://coach/summary", name: "coach-summary", description: "Returns a summary overview: total counts of clients, sessions, gyms, and exercises.", mimeType: "application/json" },
    { uri: "helix://today", name: "today-sessions", description: "Returns all sessions scheduled for today with exercise details. Use for daily briefing.", mimeType: "application/json" },
  ]
}

// Tool definitions
function getToolDefinitions() {
  return [
    {
      name: "create_session",
      description: "Creates a new training session for a client. Use when planning a new workout. Returns the created session ID. Requires a valid client_id (from helix://clients) and session_date.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "UUID of the client. Get valid IDs from helix://clients resource." },
          session_date: { type: "string", description: "Session date in YYYY-MM-DD format (e.g., '2026-03-15')." },
          gym_id: { type: "string", description: "UUID of the gym (optional). Get valid IDs from helix://gyms resource." },
          notes: { type: "string", description: "Free-text notes about the session (optional)." },
        },
        required: ["client_id", "session_date"],
      },
    },
    {
      name: "update_session",
      description: "Updates an existing training session. Use to change date, gym, notes, or status. Only provided fields are updated; others remain unchanged.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        type: "object",
        properties: {
          session_id: { type: "string", description: "UUID of the session to update. Get valid IDs from helix://sessions resource." },
          session_date: { type: "string", description: "New date in YYYY-MM-DD format (optional)." },
          gym_id: { type: "string", description: "New gym UUID (optional). Get valid IDs from helix://gyms resource." },
          notes: { type: "string", description: "New notes (optional)." },
          status: { type: "string", enum: ["planned", "completed"], description: "New status (optional). Use complete_session tool instead for completing." },
        },
        required: ["session_id"],
      },
    },
    {
      name: "delete_session",
      description: "Permanently deletes a training session and all its exercises. This action cannot be undone. Use when a session was created by mistake or is no longer needed.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        type: "object",
        properties: {
          session_id: { type: "string", description: "UUID of the session to delete. Get valid IDs from helix://sessions resource." },
        },
        required: ["session_id"],
      },
    },
    {
      name: "complete_session",
      description: "Marks a training session as completed. Use after a workout is finished. Sets session status to 'completed'.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        type: "object",
        properties: {
          session_id: { type: "string", description: "UUID of the session to complete. Get valid IDs from helix://sessions/planned resource." },
        },
        required: ["session_id"],
      },
    },
    {
      name: "duplicate_session",
      description: "Duplicates a session with a new date, copying all exercises. Use to repeat a workout on a different day. Optionally assign to a different client.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        type: "object",
        properties: {
          session_id: { type: "string", description: "UUID of the session to duplicate. Get valid IDs from helix://sessions resource." },
          new_date: { type: "string", description: "Date for the new session in YYYY-MM-DD format." },
          new_client_id: { type: "string", description: "UUID of a different client (optional). Defaults to the same client as the original session." },
        },
        required: ["session_id", "new_date"],
      },
    },
    {
      name: "add_session_exercise",
      description: "Adds an exercise to a training session. Use to build a workout program. Returns the created session exercise ID. Auto-assigns order if order_index is not provided.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        type: "object",
        properties: {
          session_id: { type: "string", description: "UUID of the session. Get valid IDs from helix://sessions resource." },
          exercise_id: { type: "string", description: "UUID of the exercise. Get valid IDs from helix://exercises resource." },
          order_index: { type: "number", description: "Position in the exercise list (0-based). Auto-assigned to end if omitted." },
          sets: { type: "number", description: "Number of sets (e.g., 3)." },
          reps: { type: "number", description: "Number of repetitions per set (e.g., 12)." },
          weight_kg: { type: "number", description: "Weight in kilograms (e.g., 20.5)." },
          duration_seconds: { type: "number", description: "Duration in seconds for timed exercises (e.g., 60)." },
          notes: { type: "string", description: "Free-text notes about this exercise (optional)." },
          is_group: { type: "boolean", description: "Whether this is a group exercise shared across multiple clients (default: false)." },
        },
        required: ["session_id", "exercise_id"],
      },
    },
    {
      name: "update_session_exercise",
      description: "Updates parameters of an exercise within a session. Use to adjust sets, reps, weight, or mark as completed/skipped. Only provided fields are updated.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        type: "object",
        properties: {
          session_exercise_id: { type: "string", description: "UUID of the session exercise entry. Get from helix://sessions/{id} resource (exercises[].id field)." },
          sets: { type: "number", description: "New number of sets." },
          reps: { type: "number", description: "New number of repetitions." },
          weight_kg: { type: "number", description: "New weight in kilograms." },
          duration_seconds: { type: "number", description: "New duration in seconds." },
          notes: { type: "string", description: "New notes." },
          completed: { type: "boolean", description: "Mark as completed (true) or not (false)." },
          skipped: { type: "boolean", description: "Mark as skipped (true) or not (false)." },
          is_group: { type: "boolean", description: "Whether this is a group exercise." },
        },
        required: ["session_exercise_id"],
      },
    },
    {
      name: "remove_session_exercise",
      description: "Permanently removes an exercise from a session. This action cannot be undone. Use when an exercise was added by mistake or is no longer part of the workout.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        type: "object",
        properties: {
          session_exercise_id: { type: "string", description: "UUID of the session exercise to remove. Get from helix://sessions/{id} resource (exercises[].id field)." },
        },
        required: ["session_exercise_id"],
      },
    },
    {
      name: "reorder_session_exercises",
      description: "Reorders exercises within a session by providing the exercise IDs in the desired order. Use to rearrange the workout sequence.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        type: "object",
        properties: {
          session_id: { type: "string", description: "UUID of the session. Get valid IDs from helix://sessions resource." },
          exercise_ids: { type: "array", items: { type: "string" }, description: "Array of session exercise UUIDs in the desired order. Get IDs from helix://sessions/{id} resource (exercises[].id field)." },
        },
        required: ["session_id", "exercise_ids"],
      },
    },
    {
      name: "create_training_plan",
      description: "Creates a complete training session from an AI-generated plan. Matches exercise names to the catalog and creates a session with all exercises. Returns the session ID and match results.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "UUID of the client. Get valid IDs from helix://clients resource." },
          session_date: { type: "string", description: "Session date in YYYY-MM-DD format." },
          gym_id: { type: "string", description: "UUID of the gym (optional). Get valid IDs from helix://gyms resource." },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                exercise_name: { type: "string", description: "Exercise name to match against the catalog (case-insensitive)." },
                sets: { type: "number", description: "Number of sets." },
                reps: { type: "number", description: "Number of repetitions." },
                weight_kg: { type: "number", description: "Weight in kilograms." },
                duration_seconds: { type: "number", description: "Duration in seconds." },
                notes: { type: "string", description: "Notes for this exercise." },
                is_group: { type: "boolean", description: "Group exercise flag." },
              },
              required: ["exercise_name"],
            },
            description: "List of exercises for the plan. Exercise names are matched case-insensitively against the catalog (helix://exercises).",
          },
          notes: { type: "string", description: "General notes about the session (optional)." },
        },
        required: ["client_id", "session_date", "exercises"],
      },
    },
    // ===== GROUP TEMPLATE TOOLS =====
    {
      name: "create_group_template",
      description: "Creates a new group exercise template. Use to define reusable sets of exercises for group lessons. Returns the template ID.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name for the template (e.g., 'Monday Pilates Group')." },
        },
        required: ["name"],
      },
    },
    {
      name: "update_group_template",
      description: "Renames an existing group exercise template. Use to correct or update the template name.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        type: "object",
        properties: {
          template_id: { type: "string", description: "UUID of the template. Get valid IDs from helix://group-templates resource." },
          name: { type: "string", description: "New name for the template." },
        },
        required: ["template_id", "name"],
      },
    },
    {
      name: "delete_group_template",
      description: "Permanently deletes a group exercise template. Fails if the template is still in use by any session. Remove template exercises from sessions first.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        type: "object",
        properties: {
          template_id: { type: "string", description: "UUID of the template to delete. Get valid IDs from helix://group-templates resource." },
        },
        required: ["template_id"],
      },
    },
    {
      name: "add_template_exercise",
      description: "Adds an exercise to a group template. Use to build up the exercise list for a group lesson. Auto-assigns order position.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        type: "object",
        properties: {
          template_id: { type: "string", description: "UUID of the template. Get valid IDs from helix://group-templates resource." },
          exercise_id: { type: "string", description: "UUID of the exercise. Get valid IDs from helix://exercises resource." },
          sets: { type: "number", description: "Number of sets (optional)." },
          reps: { type: "number", description: "Number of repetitions (optional)." },
          weight_kg: { type: "number", description: "Weight in kilograms (optional)." },
          duration_seconds: { type: "number", description: "Duration in seconds (optional)." },
          notes: { type: "string", description: "Notes about this exercise (optional)." },
        },
        required: ["template_id", "exercise_id"],
      },
    },
    {
      name: "remove_template_exercise",
      description: "Removes an exercise from a group template. Use to adjust the template's exercise list.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        type: "object",
        properties: {
          template_exercise_id: { type: "string", description: "UUID of the template exercise entry. Get from helix://group-templates/{id} resource (exercises[].id field)." },
        },
        required: ["template_exercise_id"],
      },
    },
    {
      name: "apply_template_to_session",
      description: "Applies a group template to a session, copying all template exercises as group exercises. Use 'append' to add alongside existing exercises or 'replace' to swap out existing group exercises.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        type: "object",
        properties: {
          template_id: { type: "string", description: "UUID of the template to apply. Get valid IDs from helix://group-templates resource." },
          session_id: { type: "string", description: "UUID of the target session. Get valid IDs from helix://sessions resource." },
          mode: {
            type: "string",
            enum: ["append", "replace"],
            description: "'append' adds template exercises after existing ones. 'replace' removes existing group exercises first, then adds template exercises.",
          },
        },
        required: ["template_id", "session_id", "mode"],
      },
    },
  ]
}

// Prompt definitions
function getPromptDefinitions() {
  return [
    {
      name: "plan-session",
      description: "Generates a training plan for a client session",
      arguments: [
        { name: "client_id", description: "Client UUID", required: true },
        { name: "focus_areas", description: "Focus areas (e.g., legs, core)", required: false },
        { name: "session_date", description: "Session date (default: today)", required: false },
      ],
    },
    {
      name: "weekly-plan",
      description: "Plans multiple training sessions for a week",
      arguments: [
        { name: "client_id", description: "Client UUID", required: true },
        { name: "start_date", description: "Week start date (YYYY-MM-DD)", required: true },
        { name: "sessions_count", description: "Number of sessions (1-7)", required: true },
      ],
    },
    {
      name: "session-review",
      description: "Analyzes a completed training session",
      arguments: [
        { name: "session_id", description: "Session UUID to analyze", required: true },
      ],
    },
    {
      name: "daily-briefing",
      description: "Summarizes the day's training sessions",
      arguments: [
        { name: "date", description: "Date (default: today)", required: false },
      ],
    },
    {
      name: "template-analysis",
      description: "Analyzes group template usage across sessions",
      arguments: [],
    },
  ]
}

// ============================================
// Resource Handlers
// ============================================

async function readResource(uri: string, supabase: SupabaseClient, userId: string): Promise<ResourceContent[]> {
  const url = new URL(uri)
  const path = url.pathname

  // helix://clients
  if (uri === "helix://clients") {
    const { data, error } = await supabase
      .from("clients")
      .select("id, first_name, last_name, age_years, birth_date, gender, current_goal")
      .eq("user_id", userId)
      .order("last_name")

    if (error) throw new Error(`[database_error] ${error.message}`)
    return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(data || [])) }]
  }

  // helix://clients/{id}
  const clientDetailMatch = uri.match(/^helix:\/\/clients\/([^\/]+)$/)
  if (clientDetailMatch) {
    const clientId = clientDetailMatch[1]
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .eq("user_id", userId)
      .single()

    if (error) throw new Error(`[not_found] Client ${clientId} not found.`)
    return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(data)) }]
  }

  // helix://clients/{id}/card
  const clientCardMatch = uri.match(/^helix:\/\/clients\/([^\/]+)\/card$/)
  if (clientCardMatch) {
    const clientId = clientCardMatch[1]
    const result = await fetchClientWithDetails(supabase, userId, clientId)
    if (!result) throw new Error(`[not_found] Client ${clientId} not found.`)

    const markdown = generateClientCard(
      result.client as Client,
      result.goals as GoalHistory[],
      result.sessions as Session[],
      { includeName: true, includeGymDescription: true }
    )
    return [{ uri, mimeType: "text/markdown", text: markdown }]
  }

  // helix://clients/{id}/goals
  const clientGoalsMatch = uri.match(/^helix:\/\/clients\/([^\/]+)\/goals$/)
  if (clientGoalsMatch) {
    const clientId = clientGoalsMatch[1]
    const ownership = await verifyClientOwnership(supabase, userId, clientId)
    if (!ownership.owned) {
      throw new Error("[access_denied] Client not found or you do not have access.")
    }
    const { data, error } = await supabase
      .from("goal_history")
      .select("*")
      .eq("client_id", clientId)
      .order("started_at", { ascending: false })

    if (error) throw new Error(`[database_error] ${error.message}`)
    return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(data || [])) }]
  }

  // helix://clients/{id}/sessions
  const clientSessionsMatch = uri.match(/^helix:\/\/clients\/([^\/]+)\/sessions$/)
  if (clientSessionsMatch) {
    const clientId = clientSessionsMatch[1]
    const ownership = await verifyClientOwnership(supabase, userId, clientId)
    if (!ownership.owned) {
      throw new Error("[access_denied] Client not found or you do not have access.")
    }
    const { data, error } = await supabase
      .from("sessions")
      .select(`
        id, session_date, status, notes,
        gym:gyms(id, name),
        exercises:session_exercises(
          id, order_index, sets, reps, weight_kg, duration_seconds, notes, completed, skipped, is_group,
          exercise:exercises(id, name)
        )
      `)
      .eq("client_id", clientId)
      .order("session_date", { ascending: false })

    if (error) throw new Error(`[database_error] ${error.message}`)
    return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(data || [])) }]
  }

  // helix://gyms
  if (uri === "helix://gyms") {
    const { data, error } = await supabase
      .from("gyms")
      .select("*")
      .eq("user_id", userId)
      .order("name")

    if (error) throw new Error(`[database_error] ${error.message}`)
    return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(data || [])) }]
  }

  // helix://gyms/{id}
  const gymDetailMatch = uri.match(/^helix:\/\/gyms\/([^\/]+)$/)
  if (gymDetailMatch) {
    const gymId = gymDetailMatch[1]
    const { data, error } = await supabase
      .from("gyms")
      .select("*")
      .eq("id", gymId)
      .eq("user_id", userId)
      .single()

    if (error) throw new Error(`[not_found] Gym ${gymId} not found.`)
    return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(data)) }]
  }

  // helix://exercises
  if (uri === "helix://exercises") {
    const { data, error } = await supabase
      .from("exercises")
      .select(`
        id, name, description, lumio_card_id,
        exercise_tags(tag)
      `)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order("name")

    if (error) throw new Error(`[database_error] ${error.message}`)
    return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(data || [])) }]
  }

  // helix://exercises/tags
  if (uri === "helix://exercises/tags") {
    const { data, error } = await supabase
      .from("exercise_tags")
      .select("tag")

    if (error) throw new Error(`[database_error] ${error.message}`)
    const uniqueTags = [...new Set((data || []).map(d => d.tag))].sort()
    return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(uniqueTags)) }]
  }

  // helix://exercises/tags/{tag}
  const exercisesByTagMatch = uri.match(/^helix:\/\/exercises\/tags\/([^\/]+)$/)
  if (exercisesByTagMatch) {
    const tag = decodeURIComponent(exercisesByTagMatch[1])
    const { data, error } = await supabase
      .from("exercises")
      .select(`
        id, name, description, lumio_card_id,
        exercise_tags!inner(tag)
      `)
      .eq("exercise_tags.tag", tag)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order("name")

    if (error) throw new Error(`[database_error] ${error.message}`)
    return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(data || [])) }]
  }

  // helix://exercises/{id}
  const exerciseDetailMatch = uri.match(/^helix:\/\/exercises\/([^\/]+)$/)
  if (exerciseDetailMatch && exerciseDetailMatch[1] !== "tags") {
    const exerciseId = exerciseDetailMatch[1]
    const { data, error } = await supabase
      .from("exercises")
      .select(`
        *,
        exercise_tags(tag),
        lumio_card:lumio_cards(id, title, content, frontmatter)
      `)
      .eq("id", exerciseId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .single()

    if (error) throw new Error(`[not_found] Exercise ${exerciseId} not found.`)
    return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(data)) }]
  }

  // helix://exercises/{id}/lumio
  const exerciseLumioMatch = uri.match(/^helix:\/\/exercises\/([^\/]+)\/lumio$/)
  if (exerciseLumioMatch) {
    const exerciseId = exerciseLumioMatch[1]
    const { data: exercise, error } = await supabase
      .from("exercises")
      .select("lumio_card_id, lumio_card:lumio_cards(content)")
      .eq("id", exerciseId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .single()

    if (error) throw new Error(`[not_found] Exercise ${exerciseId} not found.`)

    const lumioCard = exercise?.lumio_card as { content: string } | null
    if (!lumioCard) {
      return [{ uri, mimeType: "text/plain", text: "No Lumio card linked to this exercise." }]
    }
    return [{ uri, mimeType: "text/markdown", text: lumioCard.content }]
  }

  // helix://sessions
  if (uri === "helix://sessions") {
    const { data, error } = await supabase
      .from("sessions")
      .select(`
        id, session_date, status, notes,
        client:clients!inner(id, first_name, last_name, user_id),
        gym:gyms(id, name)
      `)
      .eq("client.user_id", userId)
      .order("session_date", { ascending: false })
      .limit(50)

    if (error) throw new Error(`[database_error] ${error.message}`)
    return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(data || [])) }]
  }

  // helix://sessions/planned
  if (uri === "helix://sessions/planned") {
    const { data, error } = await supabase
      .from("sessions")
      .select(`
        id, session_date, status, notes,
        client:clients!inner(id, first_name, last_name, user_id),
        gym:gyms(id, name)
      `)
      .eq("client.user_id", userId)
      .eq("status", "planned")
      .order("session_date", { ascending: true })

    if (error) throw new Error(`[database_error] ${error.message}`)
    return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(data || [])) }]
  }

  // helix://sessions/date/{date}
  const sessionsByDateMatch = uri.match(/^helix:\/\/sessions\/date\/([^\/]+)$/)
  if (sessionsByDateMatch) {
    const date = sessionsByDateMatch[1]
    const { data, error } = await supabase
      .from("sessions")
      .select(`
        id, session_date, status, notes,
        client:clients!inner(id, first_name, last_name, user_id),
        gym:gyms(id, name),
        exercises:session_exercises(
          id, order_index, sets, reps, weight_kg, duration_seconds, notes, completed, skipped, is_group,
          exercise:exercises(id, name)
        )
      `)
      .eq("client.user_id", userId)
      .eq("session_date", date)

    if (error) throw new Error(`[database_error] ${error.message}`)
    return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(data || [])) }]
  }

  // helix://sessions/{id}
  const sessionDetailMatch = uri.match(/^helix:\/\/sessions\/([^\/]+)$/)
  if (sessionDetailMatch && sessionDetailMatch[1] !== "planned" && sessionDetailMatch[1] !== "date") {
    const sessionId = sessionDetailMatch[1]
    const { data, error } = await supabase
      .from("sessions")
      .select(`
        *,
        client:clients!inner(id, first_name, last_name, user_id),
        gym:gyms(*),
        exercises:session_exercises(
          *,
          exercise:exercises(id, name, description)
        )
      `)
      .eq("id", sessionId)
      .eq("client.user_id", userId)
      .single()

    if (error) throw new Error(`[not_found] Session ${sessionId} not found.`)
    return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(data)) }]
  }

  // helix://group-templates
  if (uri === "helix://group-templates") {
    const { data, error } = await supabase
      .from("group_templates")
      .select(`
        id, name, created_at, updated_at,
        exercises:group_template_exercises(
          id,
          exercise:exercises(id, name)
        )
      `)
      .eq("user_id", userId)
      .order("name")

    if (error) throw new Error(`[database_error] ${error.message}`)

    // Transform for preview: count + first 3 exercise names
    const templatesWithPreview = (data || []).map(t => ({
      id: t.id,
      name: t.name,
      exercise_count: t.exercises?.length || 0,
      exercise_preview: t.exercises?.slice(0, 3).map(e => e.exercise?.name).filter(Boolean) || [],
      created_at: t.created_at,
      updated_at: t.updated_at,
    }))

    return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(templatesWithPreview)) }]
  }

  // helix://group-templates/{id}
  const templateDetailMatch = uri.match(/^helix:\/\/group-templates\/([^\/]+)$/)
  if (templateDetailMatch) {
    const templateId = templateDetailMatch[1]
    const { data, error } = await supabase
      .from("group_templates")
      .select(`
        *,
        exercises:group_template_exercises(
          *,
          exercise:exercises(
            id, name, description, lumio_card_id,
            exercise_tags(tag)
          )
        )
      `)
      .eq("id", templateId)
      .eq("user_id", userId)
      .single()

    if (error) throw new Error(`[not_found] Template ${templateId} not found.`)

    // Sort exercises by order_index
    if (data.exercises) {
      data.exercises.sort((a, b) => a.order_index - b.order_index)
    }

    return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(data)) }]
  }

  // helix://coach/summary
  if (uri === "helix://coach/summary") {
    const [clientsRes, sessionsRes, gymsRes, exercisesRes] = await Promise.all([
      supabase.from("clients").select("id", { count: "exact" }).eq("user_id", userId),
      supabase.from("sessions").select("id, client:clients!inner(user_id)", { count: "exact" }).eq("client.user_id", userId),
      supabase.from("gyms").select("id", { count: "exact" }).eq("user_id", userId),
      supabase.from("exercises").select("id", { count: "exact" }).or(`user_id.eq.${userId},user_id.is.null`),
    ])

    return [{
      uri,
      mimeType: "application/json",
      text: JSON.stringify({
        clients_count: clientsRes.count || 0,
        sessions_count: sessionsRes.count || 0,
        gyms_count: gymsRes.count || 0,
        exercises_count: exercisesRes.count || 0,
      }),
    }]
  }

  // helix://today
  if (uri === "helix://today") {
    const today = new Date().toISOString().split("T")[0]
    const { data, error } = await supabase
      .from("sessions")
      .select(`
        id, session_date, status, notes,
        client:clients!inner(id, first_name, last_name, user_id),
        gym:gyms(id, name),
        exercises:session_exercises(
          id, order_index, sets, reps, weight_kg, duration_seconds, completed, skipped, is_group,
          exercise:exercises(id, name)
        )
      `)
      .eq("client.user_id", userId)
      .eq("session_date", today)

    if (error) throw new Error(`[database_error] ${error.message}`)
    return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(data || [])) }]
  }

  throw new Error(`[not_found] Resource not found: ${uri}`)
}

// ============================================
// Tool Handlers
// ============================================

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string
): Promise<{ content: Array<{ type: string; text: string }>; isError?: true }> {
  const validationError = validateToolInput(name, args as Record<string, unknown>)
  if (validationError) {
    return toolError('validation_error', validationError)
  }

  switch (name) {
    case "create_session": {
      const { client_id, session_date, gym_id, notes } = args as {
        client_id: string
        session_date: string
        gym_id?: string
        notes?: string
      }

      // Verify client belongs to user
      const { data: client, error: clientErr } = await supabase
        .from("clients")
        .select("id")
        .eq("id", client_id)
        .eq("user_id", userId)
        .single()

      if (clientErr || !client) {
        return toolError('not_found', `Client ${client_id} not found. Use helix://clients resource to find valid client IDs.`)
      }

      const { data, error } = await supabase
        .from("sessions")
        .insert({
          client_id,
          session_date,
          gym_id: gym_id || null,
          notes: notes || null,
          status: "planned",
        })
        .select("id")
        .single()

      if (error) {
        return toolError('database_error', `Failed to create session: ${error.message}`)
      }

      return { content: [{ type: "text", text: `Session created successfully. ID: ${data.id}` }] }
    }

    case "update_session": {
      const { session_id, session_date, gym_id, notes, status } = args as {
        session_id: string
        session_date?: string
        gym_id?: string
        notes?: string
        status?: string
      }

      // Verify ownership before mutation
      const ownership = await verifySessionOwnership(supabase, userId, session_id)
      if (!ownership.owned) {
        return toolError('access_denied', `Access denied to session ${session_id}. You can only modify sessions belonging to your clients.`)
      }

      const updates: Record<string, unknown> = {}
      if (session_date !== undefined) updates.session_date = session_date
      if (gym_id !== undefined) updates.gym_id = gym_id
      if (notes !== undefined) updates.notes = notes
      if (status !== undefined) updates.status = status

      const { error } = await supabase
        .from("sessions")
        .update(updates)
        .eq("id", session_id)

      if (error) {
        return toolError('database_error', `Failed to update session: ${error.message}`)
      }

      return { content: [{ type: "text", text: `Session ${session_id} updated successfully.` }] }
    }

    case "delete_session": {
      const { session_id } = args as { session_id: string }

      // Verify ownership before mutation
      const ownership = await verifySessionOwnership(supabase, userId, session_id)
      if (!ownership.owned) {
        return toolError('access_denied', `Access denied to session ${session_id}. You can only modify sessions belonging to your clients.`)
      }

      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("id", session_id)

      if (error) {
        return toolError('database_error', `Failed to delete session: ${error.message}`)
      }

      return { content: [{ type: "text", text: `Session ${session_id} deleted successfully.` }] }
    }

    case "complete_session": {
      const { session_id } = args as { session_id: string }

      // Verify ownership before mutation
      const ownership = await verifySessionOwnership(supabase, userId, session_id)
      if (!ownership.owned) {
        return toolError('access_denied', `Access denied to session ${session_id}. You can only modify sessions belonging to your clients.`)
      }

      const { error } = await supabase
        .from("sessions")
        .update({ status: "completed" })
        .eq("id", session_id)

      if (error) {
        return toolError('database_error', `Failed to complete session: ${error.message}`)
      }

      return { content: [{ type: "text", text: `Session ${session_id} marked as completed.` }] }
    }

    case "duplicate_session": {
      const { session_id, new_date, new_client_id } = args as {
        session_id: string
        new_date: string
        new_client_id?: string
      }

      // Verify ownership of source session
      const sessionOwnership = await verifySessionOwnership(supabase, userId, session_id)
      if (!sessionOwnership.owned) {
        return toolError('access_denied', `Access denied to session ${session_id}. You can only modify sessions belonging to your clients.`)
      }

      // If new_client_id provided, verify ownership of target client
      if (new_client_id) {
        const clientOwnership = await verifyClientOwnership(supabase, userId, new_client_id)
        if (!clientOwnership.owned) {
          return toolError('access_denied', `Access denied to client ${new_client_id}. You can only create sessions for your own clients.`)
        }
      }

      // Fetch original session
      const { data: original, error: fetchErr } = await supabase
        .from("sessions")
        .select(`
          client_id, gym_id, notes,
          exercises:session_exercises(exercise_id, order_index, sets, reps, weight_kg, duration_seconds, notes, is_group)
        `)
        .eq("id", session_id)
        .single()

      if (fetchErr || !original) {
        return toolError('not_found', `Session ${session_id} not found.`)
      }

      // Create new session
      const { data: newSession, error: createErr } = await supabase
        .from("sessions")
        .insert({
          client_id: new_client_id || original.client_id,
          gym_id: original.gym_id,
          session_date: new_date,
          notes: original.notes,
          status: "planned",
        })
        .select("id")
        .single()

      if (createErr || !newSession) {
        return toolError('database_error', `Failed to duplicate session: ${createErr?.message}`)
      }

      // Copy exercises
      const exercises = original.exercises as Array<{
        exercise_id: string
        order_index: number
        sets: number | null
        reps: number | null
        weight_kg: number | null
        duration_seconds: number | null
        notes: string | null
        is_group: boolean
      }>

      if (exercises && exercises.length > 0) {
        const newExercises = exercises.map(ex => ({
          session_id: newSession.id,
          exercise_id: ex.exercise_id,
          order_index: ex.order_index,
          sets: ex.sets,
          reps: ex.reps,
          weight_kg: ex.weight_kg,
          duration_seconds: ex.duration_seconds,
          notes: ex.notes,
          completed: false,
          skipped: false,
          is_group: ex.is_group,
        }))

        await supabase.from("session_exercises").insert(newExercises)
      }

      return { content: [{ type: "text", text: `Session duplicated successfully. New session ID: ${newSession.id}` }] }
    }

    case "add_session_exercise": {
      const { session_id, exercise_id, order_index, sets, reps, weight_kg, duration_seconds, notes, is_group } = args as {
        session_id: string
        exercise_id: string
        order_index?: number
        sets?: number
        reps?: number
        weight_kg?: number
        duration_seconds?: number
        notes?: string
        is_group?: boolean
      }

      // Verify ownership before mutation
      const ownership = await verifySessionOwnership(supabase, userId, session_id)
      if (!ownership.owned) {
        return toolError('access_denied', `Access denied to session ${session_id}. You can only modify sessions belonging to your clients.`)
      }

      // Get max order_index if not provided
      let finalOrderIndex = order_index
      if (finalOrderIndex === undefined) {
        const { data: existing } = await supabase
          .from("session_exercises")
          .select("order_index")
          .eq("session_id", session_id)
          .order("order_index", { ascending: false })
          .limit(1)

        finalOrderIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0
      }

      const { data, error } = await supabase
        .from("session_exercises")
        .insert({
          session_id,
          exercise_id,
          order_index: finalOrderIndex,
          sets: sets || null,
          reps: reps || null,
          weight_kg: weight_kg || null,
          duration_seconds: duration_seconds || null,
          notes: notes || null,
          completed: false,
          skipped: false,
          is_group: is_group || false,
        })
        .select("id")
        .single()

      if (error) {
        return toolError('database_error', `Failed to add exercise: ${error.message}`)
      }

      return { content: [{ type: "text", text: `Exercise added to session. ID: ${data.id}` }] }
    }

    case "update_session_exercise": {
      const { session_exercise_id, sets, reps, weight_kg, duration_seconds, notes, completed, skipped, is_group } = args as {
        session_exercise_id: string
        sets?: number
        reps?: number
        weight_kg?: number
        duration_seconds?: number
        notes?: string
        completed?: boolean
        skipped?: boolean
        is_group?: boolean
      }

      // Verify ownership before mutation
      const ownership = await verifySessionExerciseOwnership(supabase, userId, session_exercise_id)
      if (!ownership.owned) {
        return toolError('access_denied', `Access denied to session exercise ${session_exercise_id}. You can only modify exercises in your clients' sessions.`)
      }

      const updates: Record<string, unknown> = {}
      if (sets !== undefined) updates.sets = sets
      if (reps !== undefined) updates.reps = reps
      if (weight_kg !== undefined) updates.weight_kg = weight_kg
      if (duration_seconds !== undefined) updates.duration_seconds = duration_seconds
      if (notes !== undefined) updates.notes = notes
      if (completed !== undefined) updates.completed = completed
      if (skipped !== undefined) updates.skipped = skipped
      if (is_group !== undefined) updates.is_group = is_group

      const { error } = await supabase
        .from("session_exercises")
        .update(updates)
        .eq("id", session_exercise_id)

      if (error) {
        return toolError('database_error', `Failed to update exercise: ${error.message}`)
      }

      return { content: [{ type: "text", text: `Session exercise ${session_exercise_id} updated.` }] }
    }

    case "remove_session_exercise": {
      const { session_exercise_id } = args as { session_exercise_id: string }

      // Verify ownership before mutation
      const ownership = await verifySessionExerciseOwnership(supabase, userId, session_exercise_id)
      if (!ownership.owned) {
        return toolError('access_denied', `Access denied to session exercise ${session_exercise_id}. You can only modify exercises in your clients' sessions.`)
      }

      const { error } = await supabase
        .from("session_exercises")
        .delete()
        .eq("id", session_exercise_id)

      if (error) {
        return toolError('database_error', `Failed to remove exercise: ${error.message}`)
      }

      return { content: [{ type: "text", text: "Exercise removed from session." }] }
    }

    case "reorder_session_exercises": {
      const { session_id, exercise_ids } = args as { session_id: string; exercise_ids: string[] }

      // Verify ownership before mutation
      const ownership = await verifySessionOwnership(supabase, userId, session_id)
      if (!ownership.owned) {
        return toolError('access_denied', `Access denied to session ${session_id}. You can only modify sessions belonging to your clients.`)
      }

      // Update each exercise with new order_index
      const updates = exercise_ids.map((id, index) =>
        supabase
          .from("session_exercises")
          .update({ order_index: index })
          .eq("id", id)
          .eq("session_id", session_id)
      )

      await Promise.all(updates)

      return { content: [{ type: "text", text: "Exercises reordered successfully." }] }
    }

    case "create_training_plan": {
      const { client_id, session_date, gym_id, exercises, notes } = args as {
        client_id: string
        session_date: string
        gym_id?: string
        exercises: Array<{
          exercise_name: string
          sets?: number
          reps?: number
          weight_kg?: number
          duration_seconds?: number
          notes?: string
          is_group?: boolean
        }>
        notes?: string
      }

      // Verify client belongs to user
      const { data: client, error: clientErr } = await supabase
        .from("clients")
        .select("id")
        .eq("id", client_id)
        .eq("user_id", userId)
        .single()

      if (clientErr || !client) {
        return toolError('not_found', `Client ${client_id} not found. Use helix://clients resource to find valid client IDs.`)
      }

      // Create session
      const { data: session, error: sessionErr } = await supabase
        .from("sessions")
        .insert({
          client_id,
          session_date,
          gym_id: gym_id || null,
          notes: notes || null,
          status: "planned",
        })
        .select("id")
        .single()

      if (sessionErr || !session) {
        return toolError('database_error', `Failed to create session: ${sessionErr?.message}`)
      }

      // Match exercises by name and create session_exercises
      const exerciseResults: string[] = []

      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i]

        // Find exercise by name (case-insensitive)
        const { data: foundExercise } = await supabase
          .from("exercises")
          .select("id, name")
          .or(`user_id.eq.${userId},user_id.is.null`)
          .ilike("name", ex.exercise_name)
          .limit(1)

        if (foundExercise && foundExercise.length > 0) {
          await supabase
            .from("session_exercises")
            .insert({
              session_id: session.id,
              exercise_id: foundExercise[0].id,
              order_index: i,
              sets: ex.sets || null,
              reps: ex.reps || null,
              weight_kg: ex.weight_kg || null,
              duration_seconds: ex.duration_seconds || null,
              notes: ex.notes || null,
              completed: false,
              skipped: false,
              is_group: ex.is_group || false,
            })
          exerciseResults.push(`✓ ${ex.exercise_name}`)
        } else {
          exerciseResults.push(`✗ ${ex.exercise_name} (not found in exercise catalog)`)
        }
      }

      return {
        content: [{
          type: "text",
          text: `Training plan created successfully!\n\nSession ID: ${session.id}\nDate: ${session_date}\n\nExercises:\n${exerciseResults.join("\n")}`,
        }],
      }
    }

    // ===== GROUP TEMPLATE TOOLS =====
    case "create_group_template": {
      const { name } = args as { name: string }

      const { data, error } = await supabase
        .from("group_templates")
        .insert({ name, user_id: userId })
        .select("id")
        .single()

      if (error) {
        return toolError('database_error', `Failed to create template: ${error.message}`)
      }

      return { content: [{ type: "text", text: `Template "${name}" created successfully. ID: ${data.id}` }] }
    }

    case "update_group_template": {
      const { template_id, name } = args as { template_id: string; name: string }

      // Verify ownership
      const { data: existing, error: checkErr } = await supabase
        .from("group_templates")
        .select("id")
        .eq("id", template_id)
        .eq("user_id", userId)
        .single()

      if (checkErr || !existing) {
        return toolError('not_found', `Template ${template_id} not found. Use helix://group-templates resource to find valid template IDs.`)
      }

      const { error } = await supabase
        .from("group_templates")
        .update({ name })
        .eq("id", template_id)

      if (error) {
        return toolError('database_error', `Failed to update template: ${error.message}`)
      }

      return { content: [{ type: "text", text: `Template "${name}" updated successfully.` }] }
    }

    case "delete_group_template": {
      const { template_id } = args as { template_id: string }

      // Verify ownership
      const { data: existing, error: checkErr } = await supabase
        .from("group_templates")
        .select("id")
        .eq("id", template_id)
        .eq("user_id", userId)
        .single()

      if (checkErr || !existing) {
        return toolError('not_found', `Template ${template_id} not found. Use helix://group-templates resource to find valid template IDs.`)
      }

      // Check if template is in use (canDeleteTemplate pattern)
      const { count, error: countErr } = await supabase
        .from("session_exercises")
        .select("id", { count: "exact", head: true })
        .eq("template_id", template_id)

      if (countErr) {
        return toolError('database_error', `Failed to check template usage: ${countErr.message}`)
      }

      if ((count ?? 0) > 0) {
        return toolError('template_in_use', 'Cannot delete template because it is used in one or more sessions. Remove template exercises from sessions first.')
      }

      const { error } = await supabase
        .from("group_templates")
        .delete()
        .eq("id", template_id)

      if (error) {
        return toolError('database_error', `Failed to delete template: ${error.message}`)
      }

      return { content: [{ type: "text", text: "Template deleted successfully." }] }
    }

    case "add_template_exercise": {
      const { template_id, exercise_id, sets, reps, weight_kg, duration_seconds, notes } = args as {
        template_id: string
        exercise_id: string
        sets?: number
        reps?: number
        weight_kg?: number
        duration_seconds?: number
        notes?: string
      }

      // Verify template ownership
      const { data: template, error: templateErr } = await supabase
        .from("group_templates")
        .select("id")
        .eq("id", template_id)
        .eq("user_id", userId)
        .single()

      if (templateErr || !template) {
        return toolError('not_found', `Template ${template_id} not found. Use helix://group-templates resource to find valid template IDs.`)
      }

      // Verify exercise exists and is accessible
      const { data: exercise, error: exerciseErr } = await supabase
        .from("exercises")
        .select("id, name")
        .eq("id", exercise_id)
        .or(`user_id.eq.${userId},user_id.is.null`)
        .single()

      if (exerciseErr || !exercise) {
        return toolError('not_found', `Exercise ${exercise_id} not found. Use helix://exercises resource to find valid exercise IDs.`)
      }

      // Get next order_index
      const { data: existing } = await supabase
        .from("group_template_exercises")
        .select("order_index")
        .eq("template_id", template_id)
        .order("order_index", { ascending: false })
        .limit(1)

      const nextOrder = existing && existing.length > 0 ? existing[0].order_index + 1 : 0

      // Insert exercise
      const { data, error } = await supabase
        .from("group_template_exercises")
        .insert({
          template_id,
          exercise_id,
          order_index: nextOrder,
          sets: sets || null,
          reps: reps || null,
          weight_kg: weight_kg || null,
          duration_seconds: duration_seconds || null,
          notes: notes || null,
        })
        .select("id")
        .single()

      if (error) {
        return toolError('database_error', `Failed to add exercise to template: ${error.message}`)
      }

      return { content: [{ type: "text", text: `Exercise "${exercise.name}" added to template. ID: ${data.id}` }] }
    }

    case "remove_template_exercise": {
      const { template_exercise_id } = args as { template_exercise_id: string }

      // Verify ownership through template join
      const { data: existing, error: checkErr } = await supabase
        .from("group_template_exercises")
        .select("id, template:group_templates!inner(user_id)")
        .eq("id", template_exercise_id)
        .single()

      if (checkErr || !existing) {
        return toolError('not_found', `Template exercise ${template_exercise_id} not found.`)
      }

      const templateData = existing.template as { user_id: string }
      if (templateData.user_id !== userId) {
        return toolError('access_denied', `Access denied to template exercise ${template_exercise_id}.`)
      }

      const { error } = await supabase
        .from("group_template_exercises")
        .delete()
        .eq("id", template_exercise_id)

      if (error) {
        return toolError('database_error', `Failed to remove exercise from template: ${error.message}`)
      }

      return { content: [{ type: "text", text: "Exercise removed from template." }] }
    }

    case "apply_template_to_session": {
      const { template_id, session_id, mode } = args as {
        template_id: string
        session_id: string
        mode: "append" | "replace"
      }

      // 1. Fetch template with exercises
      const { data: template, error: templateErr } = await supabase
        .from("group_templates")
        .select(`
          id, name,
          exercises:group_template_exercises(
            *, exercise:exercises(id, name)
          )
        `)
        .eq("id", template_id)
        .eq("user_id", userId)
        .single()

      if (templateErr || !template) {
        return toolError('not_found', `Template ${template_id} not found. Use helix://group-templates resource to find valid template IDs.`)
      }

      const templateExercises = template.exercises as Array<{
        exercise_id: string
        order_index: number
        sets: number | null
        reps: number | null
        weight_kg: number | null
        duration_seconds: number | null
        notes: string | null
        exercise: { id: string; name: string } | null
      }>

      if (!templateExercises?.length) {
        return toolError('validation_error', 'Template has no exercises. Add exercises to the template first.')
      }

      // 2. Verify session exists and belongs to user
      const { data: session, error: sessionErr } = await supabase
        .from("sessions")
        .select("id, client:clients!inner(user_id)")
        .eq("id", session_id)
        .single()

      if (sessionErr || !session) {
        return toolError('not_found', `Session ${session_id} not found. Use helix://sessions resource to find valid session IDs.`)
      }

      const clientData = session.client as { user_id: string }
      if (clientData.user_id !== userId) {
        return toolError('access_denied', `Access denied to session ${session_id}.`)
      }

      // 3. If replace mode, delete existing group exercises ONLY
      if (mode === "replace") {
        const { error: deleteErr } = await supabase
          .from("session_exercises")
          .delete()
          .eq("session_id", session_id)
          .eq("is_group", true) // CRITICAL: Only group exercises!

        if (deleteErr) {
          return toolError('database_error', `Failed to remove existing group exercises: ${deleteErr.message}`)
        }
      }

      // 4. Get starting order_index
      const { data: existing } = await supabase
        .from("session_exercises")
        .select("order_index")
        .eq("session_id", session_id)
        .order("order_index", { ascending: false })
        .limit(1)

      const startIndex = mode === "append" ? ((existing?.[0]?.order_index ?? -1) + 1) : 0

      // 5. Insert exercises with template_id link
      const exercisesToInsert = templateExercises
        .sort((a, b) => a.order_index - b.order_index)
        .map((ex, idx) => ({
          session_id: session_id,
          exercise_id: ex.exercise_id,
          template_id: template_id, // CRITICAL: Link to template!
          order_index: startIndex + idx,
          sets: ex.sets,
          reps: ex.reps,
          weight_kg: ex.weight_kg,
          duration_seconds: ex.duration_seconds,
          notes: ex.notes,
          is_group: true,
          completed: false,
          skipped: false,
        }))

      const { error: insertErr } = await supabase
        .from("session_exercises")
        .insert(exercisesToInsert)

      if (insertErr) {
        return toolError('database_error', `Failed to apply template exercises: ${insertErr.message}`)
      }

      return {
        content: [{
          type: "text",
          text: `Template "${template.name}" applied to session (${mode} mode) with ${exercisesToInsert.length} group exercises.`,
        }],
      }
    }

    default:
      return toolError('unknown_tool', `Unknown tool: ${name}. Use tools/list to see available tools.`)
  }
}

// ============================================
// Prompt Handlers
// ============================================

async function getPrompt(
  name: string,
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string
): Promise<{ messages: PromptMessage[] }> {
  switch (name) {
    case "plan-session": {
      const { client_id, focus_areas, session_date } = args as {
        client_id: string
        focus_areas?: string
        session_date?: string
      }

      const result = await fetchClientWithDetails(supabase, userId, client_id)
      if (!result) throw new Error(`[not_found] Client ${client_id} not found.`)

      const clientCard = generateClientCard(
        result.client as Client,
        result.goals as GoalHistory[],
        result.sessions as Session[],
        { includeName: false, includeGymDescription: true }
      )

      // Fetch exercises
      const { data: exercises } = await supabase
        .from("exercises")
        .select("name, exercise_tags(tag)")
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order("name")

      // Fetch gyms
      const { data: gyms } = await supabase
        .from("gyms")
        .select("name, address")
        .eq("user_id", userId)

      // Fetch available group templates
      const { data: templates } = await supabase
        .from("group_templates")
        .select(`
          id, name,
          exercises:group_template_exercises(
            exercise:exercises(name)
          )
        `)
        .eq("user_id", userId)
        .order("name")

      const date = session_date || new Date().toISOString().split("T")[0]
      const focusText = focus_areas ? `\n\nFOCUS RICHIESTO: ${focus_areas}` : ""

      const exerciseList = (exercises || [])
        .slice(0, 50)
        .map(e => {
          const tags = (e.exercise_tags as Array<{ tag: string }>)?.map(t => t.tag).join(", ")
          return `- ${e.name}${tags ? ` [${tags}]` : ""}`
        })
        .join("\n")

      const gymList = (gyms || [])
        .map(g => `- ${g.name}${g.address ? ` (${g.address})` : ""}`)
        .join("\n") || "Nessuna palestra registrata"

      const templatesList = (templates || [])
        .map(t => {
          const exerciseNames = (t.exercises as Array<{ exercise: { name: string } | null }>)
            ?.slice(0, 3)
            .map(e => e.exercise?.name)
            .filter(Boolean)
            .join(", ")
          return `- ${t.name} (ID: ${t.id}): ${exerciseNames}${(t.exercises?.length || 0) > 3 ? "..." : ""}`
        })
        .join("\n") || "Nessun template disponibile"

      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Sei un personal trainer esperto. Pianifica una sessione di allenamento.

SCHEDA CLIENTE:
${clientCard}

DATA SESSIONE: ${date}${focusText}

ESERCIZI DISPONIBILI:
${exerciseList}

PALESTRE DISPONIBILI:
${gymList}

TEMPLATE GRUPPI DISPONIBILI:
${templatesList}

Crea un piano di allenamento dettagliato considerando:
1. Obiettivo attuale del cliente
2. Storico sessioni precedenti
3. Condizioni fisiche (anamnesi)
4. Progressione rispetto alle sessioni passate

Proponi la lista degli esercizi con serie, ripetizioni, pesi e note.
Quando il piano e' confermato, usa il tool "create_training_plan" per crearlo in Helix.
Se il cliente partecipa a sessioni di gruppo, considera di usare un template esistente con il tool "apply_template_to_session".`,
          },
        }],
      }
    }

    case "weekly-plan": {
      const { client_id, start_date, sessions_count } = args as {
        client_id: string
        start_date: string
        sessions_count: string | number
      }

      const result = await fetchClientWithDetails(supabase, userId, client_id)
      if (!result) throw new Error(`[not_found] Client ${client_id} not found.`)

      const clientCard = generateClientCard(
        result.client as Client,
        result.goals as GoalHistory[],
        result.sessions as Session[],
        { includeName: false }
      )

      const { data: exercises } = await supabase
        .from("exercises")
        .select("name")
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order("name")
        .limit(50)

      const exerciseNames = (exercises || []).map(e => e.name).join(", ")

      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Sei un personal trainer esperto. Pianifica ${sessions_count} sessioni di allenamento per la settimana che inizia il ${start_date}.

SCHEDA CLIENTE:
${clientCard}

ESERCIZI DISPONIBILI: ${exerciseNames}

Crea un piano settimanale bilanciato che:
1. Alterna gruppi muscolari
2. Include recupero adeguato
3. Progredisce rispetto alle sessioni precedenti
4. Considera l'obiettivo del cliente

Per ogni sessione specifica: data, esercizi, serie, ripetizioni, pesi e note.`,
          },
        }],
      }
    }

    case "session-review": {
      const { session_id } = args as { session_id: string }

      const { data: session, error } = await supabase
        .from("sessions")
        .select(`
          *,
          client:clients!inner(id, first_name, last_name, current_goal, user_id),
          gym:gyms(name),
          exercises:session_exercises(
            sets, reps, weight_kg, duration_seconds, notes, completed, skipped,
            exercise:exercises(name)
          )
        `)
        .eq("id", session_id)
        .eq("client.user_id", userId)
        .single()

      if (error || !session) throw new Error(`[not_found] Session ${session_id} not found.`)

      const exerciseDetails = (session.exercises as Array<{
        sets: number | null
        reps: number | null
        weight_kg: number | null
        duration_seconds: number | null
        notes: string | null
        completed: boolean
        skipped: boolean
        exercise: { name: string } | null
      }>).map(ex => {
        const status = ex.skipped ? "[SALTATO]" : ex.completed ? "[COMPLETATO]" : "[NON COMPLETATO]"
        const details = [
          ex.sets && `${ex.sets} serie`,
          ex.reps && `${ex.reps} reps`,
          ex.weight_kg && `${ex.weight_kg}kg`,
          ex.duration_seconds && `${ex.duration_seconds}s`,
        ].filter(Boolean).join(", ")
        return `- ${ex.exercise?.name || "Sconosciuto"} ${status}: ${details}${ex.notes ? ` (${ex.notes})` : ""}`
      }).join("\n")

      const clientInfo = session.client as { first_name: string; last_name: string; current_goal: string | null }

      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Analizza questa sessione di allenamento completata e fornisci feedback.

CLIENTE: ${clientInfo.first_name} ${clientInfo.last_name}
OBIETTIVO: ${clientInfo.current_goal || "Non specificato"}
DATA: ${session.session_date}
PALESTRA: ${(session.gym as { name: string } | null)?.name || "Non specificata"}

ESERCIZI:
${exerciseDetails}

NOTE SESSIONE: ${session.notes || "Nessuna"}

Fornisci:
1. Valutazione generale della sessione
2. Analisi degli esercizi completati vs saltati
3. Suggerimenti per la prossima sessione
4. Eventuali progressioni consigliate`,
          },
        }],
      }
    }

    case "daily-briefing": {
      const { date } = args as { date?: string }
      const targetDate = date || new Date().toISOString().split("T")[0]

      const { data: sessions } = await supabase
        .from("sessions")
        .select(`
          id, session_date, status, notes,
          client:clients!inner(first_name, last_name, current_goal, user_id),
          gym:gyms(name, address),
          exercises:session_exercises(
            exercise:exercises(name)
          )
        `)
        .eq("client.user_id", userId)
        .eq("session_date", targetDate)

      if (!sessions || sessions.length === 0) {
        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: `Nessuna sessione pianificata per ${targetDate}.

Vuoi che ti aiuti a pianificare qualche sessione?`,
            },
          }],
        }
      }

      const sessionsList = sessions.map(s => {
        const client = s.client as { first_name: string; last_name: string; current_goal: string | null }
        const gym = s.gym as { name: string; address: string | null } | null
        const exercises = (s.exercises as Array<{ exercise: { name: string } | null }>)
          .map(e => e.exercise?.name)
          .filter(Boolean)
          .join(", ")

        return `- **${client.first_name} ${client.last_name}** (${s.status})
  Obiettivo: ${client.current_goal || "Non specificato"}
  Palestra: ${gym?.name || "Non specificata"}
  Esercizi: ${exercises || "Nessuno"}`
      }).join("\n\n")

      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Ecco il briefing per ${targetDate}:

${sessions.length} sessioni pianificate:

${sessionsList}

Fornisci:
1. Priorita del giorno
2. Suggerimenti per ottimizzare il tempo
3. Eventuali note preparatorie per ogni cliente`,
          },
        }],
      }
    }

    case "template-analysis": {
      // Fetch templates with usage stats
      const { data: templates } = await supabase
        .from("group_templates")
        .select(`
          id, name, created_at,
          exercises:group_template_exercises(id)
        `)
        .eq("user_id", userId)
        .order("name")

      // For each template, count how many sessions use it
      const templateStats = await Promise.all(
        (templates || []).map(async (t) => {
          const { count } = await supabase
            .from("session_exercises")
            .select("session_id", { count: "exact", head: true })
            .eq("template_id", t.id)

          return {
            id: t.id,
            name: t.name,
            exercise_count: (t.exercises as Array<{ id: string }>)?.length || 0,
            times_applied: count || 0,
            created_at: t.created_at,
          }
        })
      )

      const statsText = templateStats.length > 0
        ? templateStats
            .map(t => `- ${t.name}: ${t.exercise_count} esercizi, usato ${t.times_applied} volte`)
            .join("\n")
        : "Nessun template creato."

      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Analizza l'utilizzo dei template di gruppo per questo coach.

TEMPLATE DISPONIBILI:
${statsText}

Fornisci:
1. Quali template sono piu' utilizzati e perche'
2. Template poco usati che potrebbero essere eliminati
3. Suggerimenti per nuovi template basati sui pattern di utilizzo
4. Raccomandazioni per ottimizzare la gestione delle sessioni di gruppo`,
          },
        }],
      }
    }

    default:
      throw new Error(`[not_found] Prompt not found: ${name}`)
  }
}

// ============================================
// JSON-RPC Handler
// ============================================

async function handleJsonRpc(
  request: JsonRpcRequest,
  supabase: SupabaseClient,
  userId: string
): Promise<JsonRpcResponse> {
  const { id, method, params } = request

  try {
    switch (method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2025-03-26",
            serverInfo: SERVER_INFO,
            capabilities: CAPABILITIES,
          },
        }

      case "notifications/initialized":
        return { jsonrpc: "2.0", id, result: {} }

      case "resources/list":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            resources: getResourceTemplates().map(r => ({
              uri: r.uri || r.uriTemplate,
              name: r.name,
              description: r.description,
              mimeType: r.mimeType,
            })),
          },
        }

      case "resources/read": {
        const uri = (params as { uri: string })?.uri
        if (!uri) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Missing uri parameter" },
          }
        }
        const contents = await readResource(uri, supabase, userId)
        return { jsonrpc: "2.0", id, result: { contents } }
      }

      case "tools/list":
        return {
          jsonrpc: "2.0",
          id,
          result: { tools: getToolDefinitions() },
        }

      case "tools/call": {
        const toolName = (params as { name: string })?.name
        const toolArgs = (params as { arguments?: Record<string, unknown> })?.arguments || {}
        if (!toolName) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Missing tool name" },
          }
        }
        const result = await executeTool(toolName, toolArgs, supabase, userId)
        return { jsonrpc: "2.0", id, result }
      }

      case "prompts/list":
        return {
          jsonrpc: "2.0",
          id,
          result: { prompts: getPromptDefinitions() },
        }

      case "prompts/get": {
        const promptName = (params as { name: string })?.name
        const promptArgs = (params as { arguments?: Record<string, unknown> })?.arguments || {}
        if (!promptName) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Missing prompt name" },
          }
        }
        const result = await getPrompt(promptName, promptArgs, supabase, userId)
        return { jsonrpc: "2.0", id, result }
      }

      case "ping":
        return { jsonrpc: "2.0", id, result: {} }

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        }
    }
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : "Unknown error",
      },
    }
  }
}

// ============================================
// Main Handler
// ============================================

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)

  // ===== DEBUG: Log every request =====
  console.log("========== INCOMING REQUEST ==========")
  console.log("[REQ] Method:", req.method)
  console.log("[REQ] URL:", req.url)
  console.log("[REQ] Pathname:", url.pathname)
  console.log("[REQ] Search:", url.search)

  // Log all headers
  console.log("[REQ] Headers:")
  req.headers.forEach((value, key) => {
    // Mask sensitive values
    if (key.toLowerCase() === "x-helix-api-key") {
      console.log(`  ${key}: ***masked*** (${value.length} chars)`)
    } else {
      console.log(`  ${key}: ${value}`)
    }
  })
  console.log("======================================")

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("[CORS] Preflight request - returning 200")
    return new Response(null, { headers: corsHeaders })
  }

  // All GET requests return 405 - only POST is supported for JSON-RPC
  if (req.method === "GET") {
    console.log("[GET] Returning 405 - only POST supported")
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32000,
        message: "Method not allowed. Use POST for JSON-RPC requests."
      }
    }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" }
    })
  }

  try {
    // Read and parse request body
    let bodyText = ""
    try {
      bodyText = await req.text()
      console.log("[REQ] Body:", bodyText.substring(0, 500) + (bodyText.length > 500 ? "..." : ""))
    } catch {
      console.log("[REQ] Body: (could not read)")
    }

    // Parse JSON-RPC request
    const body = JSON.parse(bodyText) as JsonRpcRequest
    console.log("[RPC] Method:", body.method)
    console.log("[RPC] ID:", body.id)

    // Detect JSON-RPC notification (no "id" field) — MCP 2025-03-26 Streamable HTTP
    // Spec: "If the input consists solely of JSON-RPC notifications,
    // the server MUST return HTTP status code 202 Accepted with no body."
    const isNotification = !Array.isArray(body) && typeof body === "object" && body !== null && !("id" in body)
    const isBatchNotification = Array.isArray(body) && body.length > 0 && body.every((msg: unknown) =>
      typeof msg === "object" && msg !== null && !("id" in (msg as Record<string, unknown>))
    )

    if (isNotification || isBatchNotification) {
      console.log("[RPC] Notification received:", isNotification ? (body as Record<string, unknown>).method : "batch")
      return new Response(null, {
        status: 202,
        headers: corsHeaders,
      })
    }

    // Allow initialize without authentication (clients can discover server info)
    if (body.method === "initialize") {
      console.log("[RPC] Initialize request - no auth required")
      const response: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: body.id,
        result: {
          protocolVersion: "2025-03-26",
          serverInfo: SERVER_INFO,
          capabilities: CAPABILITIES,
        },
      }
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Authenticate request (API key only)
    const apiKey = req.headers.get("X-Helix-API-Key")
    const auth = await authenticateRequest(req)
    if (!auth) {
      const errorMessage = apiKey
        ? "Invalid API key. Generate a new key in Helix Settings."
        : "Missing X-Helix-API-Key header. Set X-Helix-API-Key header. Generate key in Helix Settings."
      console.log("[AUTH] Authentication failed -", errorMessage)
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: body?.id ?? null,
        error: {
          code: -32000,
          message: errorMessage,
        }
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { userId, supabase } = auth
    console.log("[AUTH] Authenticated as user:", userId)

    // Handle request
    const response = await handleJsonRpc(body, supabase, userId)
    console.log("[RPC] Response sent for method:", body.method)

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (error) {
    console.error("[ERROR] MCP Server Error:", error)
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: error instanceof Error ? error.message : "Parse error",
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
