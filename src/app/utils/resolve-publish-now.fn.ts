import { formatISO } from 'date-fns'

/**
 * Matches http(s) links as well as bare `www.` links, which X also treats as
 * URLs. Intentionally conservative so that ordinary prose is not flagged.
 */
const URL_REGEX = /(https?:\/\/|www\.)\S+/i

/**
 * Delay applied when deferring a blocked "Publish now" action.
 *
 * X policy forbids directly publishing drafts that contain URLs, so we schedule
 * them a short moment ahead (an allowed path) instead of letting the API reject
 * the request.
 */
export const PUBLISH_NOW_DEFER_MS = 2 * 60 * 1000

export interface PublishNowResolution {
    /** Value to send as `publish_at`: either `'now'` or an ISO timestamp. */
    publishAt: string
    /** True when the action was deferred because of the X URL policy. */
    deferred: boolean
}

/**
 * Resolve the `publish_at` value for a "Publish now" action.
 *
 * X (Twitter) blocks direct publishing of drafts containing URLs. When X is
 * enabled and the content includes a URL, schedule the draft a couple of
 * minutes ahead (an allowed path) instead of letting the API reject it.
 * Otherwise publish immediately with `'now'`.
 */
export const resolvePublishNow = (
    posts: string[],
    xEnabled: boolean,
    now: Date = new Date()
): PublishNowResolution => {
    const hasUrl = posts.some((post) => URL_REGEX.test(post))
    if (xEnabled && hasUrl) {
        return {
            publishAt: formatISO(new Date(now.getTime() + PUBLISH_NOW_DEFER_MS)),
            deferred: true
        }
    }
    return { publishAt: 'now', deferred: false }
}
