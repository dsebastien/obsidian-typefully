import { MEDIA_IMAGE_EXTENSIONS, MEDIA_VIDEO_EXTENSIONS } from '../constants'

export type MediaKind = 'image' | 'video'

/**
 * Anything carrying a file extension. Kept structural so the helpers can be
 * tested without building a full `TFile`.
 */
export interface HasExtension {
    extension: string
}

/**
 * Classify a file extension as a directly publishable image or video.
 * Returns null for everything else (notes, PDFs, unknown extensions).
 */
export const getMediaKind = (extension: string): MediaKind | null => {
    const normalized = extension.trim().toLowerCase().replace(/^\./, '')

    if ('' === normalized) {
        return null
    }

    if (MEDIA_IMAGE_EXTENSIONS.includes(normalized)) {
        return 'image'
    }

    if (MEDIA_VIDEO_EXTENSIONS.includes(normalized)) {
        return 'video'
    }

    return null
}

/**
 * Whether a vault file can be published to Typefully as media on its own.
 */
export const isPublishableMediaFile = (file: HasExtension): boolean =>
    null !== getMediaKind(file.extension)
