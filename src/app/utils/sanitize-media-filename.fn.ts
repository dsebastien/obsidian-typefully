/**
 * Fallback name used when sanitizing leaves nothing usable
 */
const FALLBACK_FILENAME = 'media'

/**
 * Sanitize a filename for the Typefully media upload API, which only accepts
 * letters, numbers, hyphens, underscores, periods, and parentheses.
 * Disallowed characters (spaces, accents, etc.) are replaced with hyphens.
 */
export const sanitizeMediaFilename = (filename: string): string => {
    const sanitized = filename
        .replace(/[^A-Za-z0-9._()-]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^[-.]+/, '')

    if ('' === sanitized) {
        return FALLBACK_FILENAME
    }

    return sanitized
}
