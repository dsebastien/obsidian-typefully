import { PLATFORM_MEDIA_LIMITS } from '../constants'
import { PLATFORM_NAMES } from '../types/plugin-settings.intf'
import type { PlatformSettings } from '../types/plugin-settings.intf'

export interface MediaLimitViolation {
    /** Human readable platform name, e.g. 'X (Twitter)' */
    platform: string
    /** How many images a single post would carry */
    count: number
    /** How many that platform accepts */
    limit: number
}

/**
 * Find the first enabled platform that would reject the given image
 * distribution, if any.
 *
 * `imagesPerPost` holds the number of images destined for each post, in order.
 * LinkedIn is checked against the total instead of the per-post maximum,
 * because thread posts are merged into a single LinkedIn post (along with all
 * of their media) before publishing.
 *
 * @param imagesPerPost how many images each post would carry
 * @param platforms the platforms enabled in the settings
 * @returns the first violation found, or undefined when everything fits
 */
export const checkMediaLimits = (
    imagesPerPost: number[],
    platforms: PlatformSettings
): MediaLimitViolation | undefined => {
    if (0 === imagesPerPost.length) {
        return undefined
    }

    const maxPerPost = Math.max(...imagesPerPost)
    const total = imagesPerPost.reduce((sum, count) => sum + count, 0)

    for (const platform of Object.keys(PLATFORM_NAMES) as (keyof PlatformSettings)[]) {
        if (!platforms[platform]) {
            continue
        }

        const limit = PLATFORM_MEDIA_LIMITS[platform]
        if (undefined === limit) {
            continue
        }

        // LinkedIn merges every thread post into one, so its media adds up
        const count = 'linkedin' === platform ? total : maxPerPost
        if (count > limit) {
            return { platform: PLATFORM_NAMES[platform], count, limit }
        }
    }

    return undefined
}
