export interface ExtractedImage {
    path: string
    altText: string
    isWikiLink: boolean
    originalSyntax: string
    /** Position in the original text */
    position: number
}

/**
 * Wiki-style image embeds: ![[image.png]] or ![[image.png|alt text]]
 */
const WIKI_IMAGE_REGEX = /!\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g

/**
 * Standard Markdown image syntax: ![alt](path)
 */
const MD_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g

/**
 * Extract all image references from Obsidian Markdown content.
 * Returns both wiki-style (![[...]]) and standard (![alt](path)) images
 * in document order.
 */
export const extractImagesFromMarkdown = (text: string): ExtractedImage[] => {
    const images: ExtractedImage[] = []

    // Extract wiki-style images: ![[path|alt]]
    for (const match of text.matchAll(WIKI_IMAGE_REGEX)) {
        const path = match[1]!.trim()
        const altText = match[2]?.trim() ?? ''
        images.push({
            path,
            altText,
            isWikiLink: true,
            originalSyntax: match[0],
            position: match.index
        })
    }

    // Extract standard Markdown images: ![alt](path)
    for (const match of text.matchAll(MD_IMAGE_REGEX)) {
        const altText = match[1]!.trim()
        const path = match[2]!.trim()
        images.push({
            path,
            altText,
            isWikiLink: false,
            originalSyntax: match[0],
            position: match.index
        })
    }

    // Sort by position in document for consistent ordering
    images.sort((a, b) => a.position - b.position)

    return images
}
