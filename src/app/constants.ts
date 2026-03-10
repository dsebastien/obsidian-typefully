/**
 * How many milliseconds to wait before hiding notices
 */
export const NOTICE_TIMEOUT = 5000

/**
 * Typefully API URL (v2)
 * Reference: https://typefully.com/docs/api
 */
export const TYPEFULLY_API_URL = 'https://api.typefully.com/v2'

export const TYPEFULLY_API_SOCIAL_SETS = '/social-sets'
export const TYPEFULLY_API_DRAFTS = '/drafts'
export const TYPEFULLY_API_MEDIA_UPLOAD = '/media/upload'
export const TYPEFULLY_API_MEDIA = '/media'
export const TYPEFULLY_API_TAGS = '/tags'
export const TYPEFULLY_API_QUEUE = '/queue'
export const TYPEFULLY_API_QUEUE_SCHEDULE = '/queue/schedule'
export const TYPEFULLY_API_ME = '/me'

export const MSG_API_KEY_CONFIGURATION_REQUIRED =
    'Please configure the Typefully plugin to provide a valid API key'

export const MSG_TYPEFULLY_FAILED_TO_PUBLISH = 'Failed to publish to Typefully'
export const MSG_TYPEFULLY_FAILED_TO_PUBLISH_POSSIBLE_API_KEY_ISSUE =
    'Failed to publish to Typefully. Is your API key valid?'

export const MARKDOWN_FILE_EXTENSION = 'md'
export const DEFAULT_CANVAS_FILE_NAME = 'Canvas.md'

export const FRONT_MATTER_REGEX = /---[\S\s]*?---\n/
export const MARKDOWN_LINK_REGEX = /\[(.*?)\]\(.*?\)/g

/**
 * Delay before refreshing drafts after publish/schedule/delete.
 * Gives the Typefully API time to propagate the state change.
 */
export const DRAFT_ACTION_REFRESH_DELAY_MS = 1500

/**
 * Media upload polling configuration
 */
export const MEDIA_POLL_INITIAL_DELAY_MS = 200
export const MEDIA_POLL_MAX_TIMEOUT_MS = 60_000

/**
 * Supported media MIME types by file extension
 */
export const MEDIA_MIME_TYPES: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    pdf: 'application/pdf'
}
