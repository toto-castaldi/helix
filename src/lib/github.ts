/**
 * GitHub URL parsing utilities
 */

export interface ParsedGitHubUrl {
  owner: string
  repo: string
  branch?: string
}

/**
 * Parse a GitHub URL to extract owner, repo, and optional branch
 * Supports formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo/tree/branch
 * - github.com/owner/repo
 * - owner/repo
 */
export function parseGitHubUrl(url: string): ParsedGitHubUrl | null {
  if (!url || typeof url !== 'string') {
    return null
  }

  const trimmed = url.trim()

  // Pattern for full GitHub URLs
  const urlPattern = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/i
  const urlMatch = trimmed.match(urlPattern)

  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2].replace(/\.git$/, ''),
      branch: urlMatch[3],
    }
  }

  // Pattern for shorthand owner/repo
  const shortPattern = /^([^/]+)\/([^/]+)$/
  const shortMatch = trimmed.match(shortPattern)

  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2].replace(/\.git$/, ''),
    }
  }

  return null
}

/**
 * Build a GitHub URL from owner and repo
 */
export function buildGitHubUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}`
}

/**
 * Check if a string is a valid GitHub URL or shorthand
 */
export function isValidGitHubUrl(url: string): boolean {
  return parseGitHubUrl(url) !== null
}
