/**
 * URL Validation for Security
 *
 * Prevents open redirect vulnerabilities by validating URL protocols.
 * Used in email click tracking to ensure redirects only go to http/https URLs.
 */

/**
 * Validate that a URL is safe for redirect (prevents open redirect attacks)
 *
 * Only allows http: and https: protocols. Rejects:
 * - javascript: (XSS)
 * - data: (XSS)
 * - file: (local file access)
 * - vbscript: (legacy XSS)
 * - and any other non-http(s) schemes
 *
 * Note: This does NOT validate domains. For email click tracking, we need to
 * redirect to arbitrary external URLs (the tracked links in emails). Domain
 * allowlisting is not appropriate here.
 *
 * @param url - The URL to validate
 * @returns true if the URL has a safe protocol (http or https), false otherwise
 */
export function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url)

    // Only allow http and https protocols
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return true
    }

    return false
  } catch {
    // URL parsing failed - invalid URL format
    return false
  }
}

/**
 * Sanitize a URL for safe logging (removes potential sensitive query params)
 *
 * @param url - The URL to sanitize
 * @returns Sanitized URL string safe for logging
 */
export function sanitizeUrlForLogging(url: string): string {
  try {
    const parsed = new URL(url)

    // Remove sensitive query parameters
    const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth', 'apikey', 'api_key']
    sensitiveParams.forEach(param => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '[REDACTED]')
      }
    })

    return parsed.toString()
  } catch {
    // If URL parsing fails, return a safe placeholder
    return '[INVALID_URL]'
  }
}
