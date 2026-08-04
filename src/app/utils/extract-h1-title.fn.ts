/**
 * ATX level 1 heading: `# Title`, optionally with closing hashes (`# Title #`).
 * Up to three leading spaces are allowed, as in CommonMark.
 */
const H1_REGEX = /^ {0,3}# +(.*?)(?:\s+#+)?\s*$/

/**
 * Fenced code block delimiter: ``` or ~~~ (three or more characters).
 */
const CODE_FENCE_REGEX = /^ {0,3}(`{3,}|~{3,})/

export interface ExtractedH1Title {
    /**
     * The heading text, without the leading `#`.
     */
    title: string
    /**
     * The markdown with that heading line removed.
     */
    markdown: string
}

/**
 * Find the first level 1 heading in the given markdown and return it along
 * with the markdown it was removed from.
 *
 * Used to avoid rendering two titles in note screenshots: when a note carries
 * its own `# Heading`, that heading becomes the card title instead of the note
 * name, and it is dropped from the body.
 *
 * Headings inside fenced code blocks are ignored. Returns null when there is no
 * level 1 heading, or when its text is empty.
 */
export const extractH1Title = (markdown: string): ExtractedH1Title | null => {
    const lines = markdown.split('\n')
    let openFence: string | null = null

    for (const [i, line] of lines.entries()) {
        const fence = CODE_FENCE_REGEX.exec(line)

        if (fence) {
            const marker = (fence[1] ?? '').charAt(0)
            if (null === openFence) {
                openFence = marker
                continue
            }
            // A fence closes only when it uses the same character
            if (marker === openFence) {
                openFence = null
            }
            continue
        }

        if (null !== openFence) continue

        const heading = H1_REGEX.exec(line)
        if (!heading) continue

        const title = (heading[1] ?? '').trim()
        if ('' === title) continue

        // Drop the heading line, and the blank line that usually follows it, so
        // that the body does not start with unnecessary whitespace
        const removeCount = '' === (lines[i + 1] ?? '').trim() ? 2 : 1
        lines.splice(i, removeCount)

        return {
            title,
            markdown: lines.join('\n')
        }
    }

    return null
}
