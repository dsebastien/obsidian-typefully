import type { MediaKind } from './classify-media-file.fn'

/**
 * Describe what is risky about a media selection, if anything.
 *
 * Every target platform enforces its own rules and they do not agree: most
 * accept a single video per post and refuse to mix a video with images, while
 * others allow richer carousels. Rather than guessing per platform, the
 * selection is only flagged and the user decides whether to go ahead.
 *
 * @param kinds the kind of each selected media file, in order
 * @returns a warning to confirm, or null when the selection is unambiguous
 */
export const describeMediaSelectionWarning = (kinds: MediaKind[]): string | null => {
    const videoCount = kinds.filter((kind) => 'video' === kind).length
    const imageCount = kinds.length - videoCount

    if (videoCount > 1) {
        return `You selected ${videoCount} videos. Most platforms only accept a single video per post, so the draft may be rejected. Publish anyway?`
    }

    if (1 === videoCount && imageCount > 0) {
        return `You selected a video and ${imageCount} image${1 === imageCount ? '' : 's'}. Most platforms do not allow mixing a video with images in the same post, so the draft may be rejected. Publish anyway?`
    }

    return null
}
