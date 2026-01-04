import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { parse as parseYaml } from "https://deno.land/std@0.208.0/yaml/mod.ts"
import {
  getLatestCommitHash,
  getRepositoryTree,
  getRawFileContent,
  getRawBinaryContent,
  type GitHubTreeItem,
} from "../_shared/github.ts"
import {
  parseLumioIgnore,
  filterMarkdownFiles,
} from "../_shared/lumioignore.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface LumioCardFrontmatter {
  title?: string
  tags?: string[]
  difficulty?: number
  language?: string
  [key: string]: unknown
}

interface RequestBody {
  repositoryId: string
  force?: boolean
}

interface LumioRepository {
  id: string
  user_id: string
  github_owner: string
  github_repo: string
  branch: string
  access_token: string | null
  last_commit_hash: string | null
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(markdown: string): {
  frontmatter: LumioCardFrontmatter
  content: string
  rawContent: string
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/
  const match = markdown.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: {}, content: markdown, rawContent: markdown }
  }

  try {
    const yamlContent = match[1]
    const frontmatter = parseYaml(yamlContent) as LumioCardFrontmatter
    const content = markdown.slice(match[0].length)
    return { frontmatter, content, rawContent: markdown }
  } catch {
    return { frontmatter: {}, content: markdown, rawContent: markdown }
  }
}

/**
 * Extract image paths from markdown content
 */
function extractImagePaths(content: string): string[] {
  const paths: string[] = []

  // Match ![alt](path) format
  const mdImageRegex = /!\[[^\]]*\]\(([^)]+)\)/g
  let match
  while ((match = mdImageRegex.exec(content)) !== null) {
    const path = match[1]
    // Skip external URLs
    if (!path.startsWith("http://") && !path.startsWith("https://")) {
      paths.push(path)
    }
  }

  return paths
}

/**
 * Resolve relative path from card file location
 */
function resolvePath(cardPath: string, imagePath: string): string {
  // Handle absolute paths from repo root
  if (imagePath.startsWith("/")) {
    return imagePath.slice(1)
  }

  // Handle relative paths
  const cardDir = cardPath.split("/").slice(0, -1).join("/")

  if (imagePath.startsWith("./")) {
    imagePath = imagePath.slice(2)
  }

  // Handle ../ paths
  const parts = [...cardDir.split("/"), ...imagePath.split("/")]
  const resolved: string[] = []

  for (const part of parts) {
    if (part === "..") {
      resolved.pop()
    } else if (part !== "." && part !== "") {
      resolved.push(part)
    }
  }

  return resolved.join("/")
}

/**
 * Generate a hash for file content
 */
async function hashContent(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16)
}

/**
 * Get file extension from path
 */
function getExtension(path: string): string {
  const parts = path.split(".")
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ""
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from JWT
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Parse request body
    const body: RequestBody = await req.json()
    const { repositoryId, force = false } = body

    if (!repositoryId) {
      return new Response(
        JSON.stringify({ error: "repositoryId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Get repository from database
    const { data: repo, error: repoError } = await supabase
      .from("lumio_repositories")
      .select("*")
      .eq("id", repositoryId)
      .eq("user_id", user.id)
      .single()

    if (repoError || !repo) {
      return new Response(
        JSON.stringify({ error: "Repository not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const repository = repo as LumioRepository

    // Update status to syncing
    await supabase
      .from("lumio_repositories")
      .update({ sync_status: "syncing", sync_error: null })
      .eq("id", repositoryId)

    try {
      // Get latest commit hash
      const latestHash = await getLatestCommitHash(
        repository.github_owner,
        repository.github_repo,
        repository.branch,
        repository.access_token
      )

      // Check if already synced
      if (!force && repository.last_commit_hash === latestHash) {
        await supabase
          .from("lumio_repositories")
          .update({
            sync_status: "synced",
            last_sync_at: new Date().toISOString(),
          })
          .eq("id", repositoryId)

        return new Response(
          JSON.stringify({
            success: true,
            message: "Already up to date",
            cardsCount: 0,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Get repository tree
      const tree = await getRepositoryTree(
        repository.github_owner,
        repository.github_repo,
        repository.branch,
        repository.access_token
      )

      // Get .lumioignore if exists
      let ignorePatterns: string[] = []
      const ignoreFile = tree.find((item: GitHubTreeItem) =>
        item.path === ".lumioignore" && item.type === "blob"
      )
      if (ignoreFile) {
        try {
          const ignoreContent = await getRawFileContent(
            repository.github_owner,
            repository.github_repo,
            ".lumioignore",
            repository.branch,
            repository.access_token
          )
          ignorePatterns = parseLumioIgnore(ignoreContent)
        } catch {
          console.warn("Failed to parse .lumioignore")
        }
      }

      // Filter markdown files
      const allFiles = tree
        .filter((item: GitHubTreeItem) => item.type === "blob")
        .map((item: GitHubTreeItem) => item.path)
      const mdFiles = filterMarkdownFiles(allFiles, ignorePatterns)

      // Track processed cards
      const processedCardPaths = new Set<string>()
      let cardsCount = 0

      // Process each markdown file
      for (const filePath of mdFiles) {
        try {
          // Fetch markdown content
          const rawContent = await getRawFileContent(
            repository.github_owner,
            repository.github_repo,
            filePath,
            repository.branch,
            repository.access_token
          )

          // Parse frontmatter
          const { frontmatter, content } = parseFrontmatter(rawContent)
          const title = frontmatter.title || filePath.split("/").pop()?.replace(".md", "") || null

          // Extract and process images
          const imagePaths = extractImagePaths(rawContent)
          const imageMapping: Record<string, string> = {}

          for (const imagePath of imagePaths) {
            try {
              const resolvedPath = resolvePath(filePath, imagePath)

              // Fetch image
              const { data: imageData, contentType } = await getRawBinaryContent(
                repository.github_owner,
                repository.github_repo,
                resolvedPath,
                repository.branch,
                repository.access_token
              )

              // Generate hash for filename
              const hash = await hashContent(imageData)
              const ext = getExtension(resolvedPath)
              const storagePath = `${user.id}/${repositoryId}/${hash}.${ext}`

              // Upload to storage
              const { error: uploadError } = await supabase.storage
                .from("lumio-images")
                .upload(storagePath, imageData, {
                  contentType,
                  upsert: true,
                })

              if (!uploadError) {
                // Get public URL
                const { data: publicUrl } = supabase.storage
                  .from("lumio-images")
                  .getPublicUrl(storagePath)

                // Fix URL for local development (replace internal Docker URL with external URL)
                let finalUrl = publicUrl.publicUrl
                const externalUrl = Deno.env.get("API_EXTERNAL_URL")
                if (externalUrl) {
                  // Replace internal kong URL with external URL
                  finalUrl = finalUrl.replace(/http:\/\/kong:\d+/, externalUrl)
                } else if (finalUrl.includes("kong:")) {
                  // Fallback for local development: replace kong URL with localhost
                  finalUrl = finalUrl.replace(/http:\/\/kong:\d+/, "http://127.0.0.1:54321")
                }

                imageMapping[imagePath] = finalUrl
              }
            } catch (imgError) {
              console.warn(`Failed to process image ${imagePath}:`, imgError)
            }
          }

          // Replace image paths in content
          let processedContent = content
          for (const [originalPath, newUrl] of Object.entries(imageMapping)) {
            // Escape special regex characters in path
            const escapedPath = originalPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            processedContent = processedContent.replace(
              new RegExp(`!\\[([^\\]]*)\\]\\(${escapedPath}\\)`, "g"),
              `![$1](${newUrl})`
            )
          }

          // Upsert card in database
          const { data: card, error: cardError } = await supabase
            .from("lumio_cards")
            .upsert(
              {
                repository_id: repositoryId,
                user_id: user.id,
                file_path: filePath,
                title,
                content: processedContent,
                raw_content: rawContent,
                frontmatter,
                source_available: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "repository_id,file_path" }
            )
            .select()
            .single()

          if (cardError) {
            console.error(`Failed to upsert card ${filePath}:`, cardError)
            continue
          }

          // Upsert image mappings
          for (const [originalPath, storagePath] of Object.entries(imageMapping)) {
            // Extract storage path from URL
            const pathMatch = storagePath.match(/lumio-images\/(.+)$/)
            if (pathMatch && card) {
              await supabase.from("lumio_card_images").upsert(
                {
                  card_id: card.id,
                  original_path: originalPath,
                  storage_path: pathMatch[1],
                },
                { onConflict: "card_id,original_path" }
              )
            }
          }

          processedCardPaths.add(filePath)
          cardsCount++
        } catch (fileError) {
          console.error(`Failed to process ${filePath}:`, fileError)
        }
      }

      // Mark cards not in current sync as source_available = false
      const { data: existingCards } = await supabase
        .from("lumio_cards")
        .select("id, file_path")
        .eq("repository_id", repositoryId)

      if (existingCards) {
        for (const card of existingCards) {
          if (!processedCardPaths.has(card.file_path)) {
            await supabase
              .from("lumio_cards")
              .update({ source_available: false })
              .eq("id", card.id)
          }
        }
      }

      // Update repository status
      await supabase
        .from("lumio_repositories")
        .update({
          last_commit_hash: latestHash,
          last_sync_at: new Date().toISOString(),
          sync_status: "synced",
          sync_error: null,
          cards_count: cardsCount,
        })
        .eq("id", repositoryId)

      return new Response(
        JSON.stringify({
          success: true,
          cardsCount,
          commitHash: latestHash,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    } catch (syncError) {
      // Update repository with error
      const errorMessage = syncError instanceof Error ? syncError.message : "Unknown error"

      await supabase
        .from("lumio_repositories")
        .update({
          sync_status: "error",
          sync_error: errorMessage,
        })
        .eq("id", repositoryId)

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
  } catch (error) {
    console.error("Lumio Sync Error:", error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
