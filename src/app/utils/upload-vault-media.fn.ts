import type { App, TFile } from 'obsidian'
import type { TypefullyApiClient } from '../api/typefully-api-client'
import { MEDIA_MIME_TYPES } from '../constants'
import { log } from '../../utils/log'

export interface UploadedMedia {
    mediaId: string
    originalPath: string
}

/**
 * Get the MIME type for a file based on its extension.
 * Returns null if the extension is not a supported media type.
 */
export const getMimeType = (filename: string): string | null => {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (!ext) return null
    return MEDIA_MIME_TYPES[ext] ?? null
}

/**
 * Resolve an image path to a TFile in the vault.
 * Handles both absolute vault paths and short filenames.
 */
export const resolveVaultImage = (app: App, imagePath: string): TFile | null => {
    // Try direct path first
    const file = app.vault.getFileByPath(imagePath)
    if (file) return file

    // Try as short filename lookup via getFirstLinkpathDest
    const resolved = app.metadataCache.getFirstLinkpathDest(imagePath, '')
    return resolved ?? null
}

/**
 * Upload a vault image file to Typefully via the presigned URL flow.
 * Returns the media_id on success, or null on failure (with a warning logged).
 */
export const uploadVaultMedia = async (
    app: App,
    client: TypefullyApiClient,
    socialSetId: string,
    imagePath: string
): Promise<UploadedMedia | null> => {
    try {
        const file = resolveVaultImage(app, imagePath)
        if (!file) {
            log(`Image not found in vault: ${imagePath}`, 'warn')
            return null
        }

        const mimeType = getMimeType(file.name)
        if (!mimeType) {
            log(`Unsupported media type: ${file.name}`, 'warn')
            return null
        }

        const data = await app.vault.readBinary(file)
        const mediaId = await client.uploadAndWaitForMedia(socialSetId, file.name, data, mimeType)

        return { mediaId, originalPath: imagePath }
    } catch (error) {
        log(`Failed to upload media: ${imagePath}`, 'warn', error)
        return null
    }
}
