/**
 * Lumio Ignore Parser
 * Simple parser for .lumioignore files (simplified format, one pattern per line)
 */

/**
 * Parse a .lumioignore file content into a list of patterns
 * Format:
 * - One pattern per line
 * - Lines starting with # are comments
 * - Empty lines are ignored
 * - Patterns ending with / match directories
 * - Patterns with * are wildcards
 */
export function parseLumioIgnore(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
}

/**
 * Check if a file path should be ignored based on patterns
 */
export function isIgnored(filePath: string, patterns: string[]): boolean {
  // Normalize path (remove leading ./ or /)
  const normalizedPath = filePath.replace(/^\.?\//, "")
  const pathParts = normalizedPath.split("/")

  for (const pattern of patterns) {
    if (matchPattern(normalizedPath, pathParts, pattern)) {
      return true
    }
  }

  return false
}

/**
 * Match a single pattern against a file path
 */
function matchPattern(
  filePath: string,
  pathParts: string[],
  pattern: string
): boolean {
  // Directory pattern (ends with /)
  if (pattern.endsWith("/")) {
    const dirName = pattern.slice(0, -1)
    // Check if any part of the path matches the directory
    return pathParts.some((part, index) => {
      if (index === pathParts.length - 1) return false // Don't match the filename
      return matchWildcard(part, dirName)
    })
  }

  // Exact filename match (pattern without path separator)
  if (!pattern.includes("/")) {
    const fileName = pathParts[pathParts.length - 1]
    return matchWildcard(fileName, pattern)
  }

  // Path pattern (contains /)
  return matchWildcard(filePath, pattern)
}

/**
 * Simple wildcard matching (* only)
 */
function matchWildcard(text: string, pattern: string): boolean {
  // No wildcards - exact match
  if (!pattern.includes("*")) {
    return text === pattern
  }

  // Convert wildcard pattern to regex
  // Escape regex special chars except *
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(text)
}

/**
 * Default patterns to always ignore
 */
export const DEFAULT_IGNORE_PATTERNS = [
  "README.md",
  "readme.md",
  "LICENSE",
  "LICENSE.md",
  ".git/",
  ".github/",
  "node_modules/",
]

/**
 * Filter markdown files from a list, applying ignore patterns
 */
export function filterMarkdownFiles(
  files: string[],
  ignorePatterns: string[] = []
): string[] {
  const allPatterns = [...DEFAULT_IGNORE_PATTERNS, ...ignorePatterns]

  return files.filter((file) => {
    // Must be a markdown file
    if (!file.endsWith(".md")) return false

    // Check if ignored
    return !isIgnored(file, allPatterns)
  })
}
