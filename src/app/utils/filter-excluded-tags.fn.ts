/**
 * Normalize a tag for comparison: drop the leading '#' and lowercase it.
 * @param tag the tag to normalize
 */
const normalizeTag = (tag: string): string => tag.trim().replace(/^#+/, '').toLowerCase()

/**
 * Remove the excluded tags from the given tags.
 * Matching is case-insensitive, ignores the leading '#', and covers nested
 * tags: excluding 'dev' also excludes 'dev/frontend'.
 * @param tags the tags of the source note
 * @param excludedTags the tags to exclude
 */
export const filterExcludedTags = (tags: string[], excludedTags: string[]): string[] => {
    const normalizedExclusions = excludedTags
        .map((excludedTag) => normalizeTag(excludedTag))
        .filter((excludedTag) => '' !== excludedTag)

    if (0 === normalizedExclusions.length) {
        return tags
    }

    return tags.filter((tag) => {
        const normalizedTag = normalizeTag(tag)

        return !normalizedExclusions.some(
            (excludedTag) =>
                normalizedTag === excludedTag || normalizedTag.startsWith(`${excludedTag}/`)
        )
    })
}
