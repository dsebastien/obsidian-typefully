/**
 * Parse the excluded tags entered in the settings.
 * Entries can be separated by commas, newlines or spaces, and may be written
 * with or without the leading '#'. Duplicates and empty entries are dropped.
 * @param value the raw text entered by the user
 */
export const parseExcludedTags = (value: string): string[] => {
    const retVal: string[] = []
    const seen: Set<string> = new Set<string>()

    for (const entry of value.split(/[\s,]+/)) {
        const tag = entry.trim().replace(/^#+/, '')
        if ('' === tag) {
            continue
        }

        const key = tag.toLowerCase()
        if (seen.has(key)) {
            continue
        }

        seen.add(key)
        retVal.push(tag)
    }

    return retVal
}

/**
 * Format excluded tags for display in the settings.
 * @param excludedTags the excluded tags
 */
export const formatExcludedTags = (excludedTags: string[]): string => excludedTags.join(', ')
