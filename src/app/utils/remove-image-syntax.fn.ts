/**
 * Wiki-style image embeds: ![[image.png]] or ![[image.png|alt text]]
 */
const WIKI_IMAGE_REGEX = /!\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g

/**
 * Standard Markdown image syntax: ![alt](path)
 */
const MD_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g

/**
 * Remove all image syntax from Markdown text.
 * Strips both wiki-style (![[...]]) and standard (![alt](path)) image references.
 */
export const removeImageSyntax = (text: string): string => {
    let result = text
    result = result.replace(WIKI_IMAGE_REGEX, '')
    result = result.replace(MD_IMAGE_REGEX, '')
    return result
}
