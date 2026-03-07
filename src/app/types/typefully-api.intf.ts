/**
 * Typefully API v2 - Complete type definitions
 * Reference: https://typefully.com/docs/api
 */

// ─── User ────────────────────────────────────────────────────────────────────

export interface TypefullyUser {
    id: number
    email: string
    name: string
    profile_image_url: string
}

// ─── Paginated Response ──────────────────────────────────────────────────────

export interface TypefullyPaginatedResponse<T> {
    results: T[]
    count: number
    limit: number
    offset: number
    next: string | null
    previous: string | null
}

// ─── Draft ───────────────────────────────────────────────────────────────────

export type TypefullyDraftStatus = 'draft' | 'scheduled' | 'published' | 'error'

export interface TypefullyDraft {
    id: number
    status: TypefullyDraftStatus
    draft_title: string | null
    preview: string | null
    notes: string | null
    tags: string[]
    platforms: TypefullyDraftPlatforms
    scheduled_date: string | null
    publish_at: string | null
    published_at: string | null
    created_at: string
    updated_at: string
    private_url: string
    share: boolean
}

export interface TypefullyDraftPlatforms {
    x?: TypefullyDraftPlatformDetail
    linkedin?: TypefullyDraftPlatformDetail
    threads?: TypefullyDraftPlatformDetail
    bluesky?: TypefullyDraftPlatformDetail
    mastodon?: TypefullyDraftPlatformDetail
}

export interface TypefullyDraftPlatformDetail {
    enabled: boolean
    posts: TypefullyDraftPost[]
    settings?: TypefullyDraftPlatformSettings
}

export interface TypefullyDraftPost {
    text: string
    media_ids?: string[]
    published_url?: string
}

export interface TypefullyDraftPlatformSettings {
    reply_to_url?: string
    community_id?: string
    share_with_followers?: boolean
}

// ─── Draft List Params ───────────────────────────────────────────────────────

export interface TypefullyDraftListParams {
    status?: TypefullyDraftStatus
    tag?: string[]
    order_by?:
        | 'created_at'
        | '-created_at'
        | 'updated_at'
        | '-updated_at'
        | 'scheduled_date'
        | '-scheduled_date'
        | 'published_at'
        | '-published_at'
    limit?: number
    offset?: number
}

// ─── Draft Update ────────────────────────────────────────────────────────────

export interface TypefullyDraftUpdatePayload {
    platforms?: TypefullyDraftPlatforms
    draft_title?: string
    notes?: string
    tags?: string[]
    share?: boolean
    publish_at?: 'now' | 'next-free-slot' | (string & {})
}

// ─── Media Upload ────────────────────────────────────────────────────────────

export interface TypefullyMediaUploadRequest {
    filename: string
}

export interface TypefullyMediaUploadResponse {
    media_id: string
    upload_url: string
}

export type TypefullyMediaProcessingStatus = 'processing' | 'ready' | 'error'

export interface TypefullyMediaStatus {
    media_id: string
    status: TypefullyMediaProcessingStatus
    url?: string
    error?: string
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export interface TypefullyTag {
    id: number
    name: string
    color: string
}

export interface TypefullyTagCreatePayload {
    name: string
    color?: string
}

// ─── Queue ───────────────────────────────────────────────────────────────────

export interface TypefullyQueueResponse {
    social_set_id: number
    start_date: string
    end_date: string
    days: TypefullyQueueDay[]
}

export interface TypefullyQueueDay {
    date: string
    items: TypefullyQueueItem[]
}

export interface TypefullyQueueItem {
    at: string
    kind: 'queue_slot' | 'custom_time'
    draft: TypefullyDraft | null
}

export interface TypefullyQueueSchedule {
    social_set_id: number
    timezone: string
    rules: TypefullyQueueScheduleRule[]
}

export interface TypefullyQueueScheduleRule {
    h: number
    m: number
    days: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[]
}

// ─── API Error ───────────────────────────────────────────────────────────────

export interface TypefullyApiError {
    statusCode: number
    detail: string
    rawError: unknown
}
