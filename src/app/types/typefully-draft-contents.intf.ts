/**
 * Reference: https://typefully.com/docs/api
 * Typefully API v2 Draft Contents
 */
export interface TypefullyDraftContents {
    platforms: TypefullyPlatforms
    draft_title?: string
    tags?: string[]
    share?: boolean
    publish_at?: 'now' | 'next-free-slot' | (string & {})
}

export interface TypefullyPlatforms {
    x?: TypefullyPlatformConfig
    linkedin?: TypefullyPlatformConfig
    threads?: TypefullyPlatformConfig
    bluesky?: TypefullyPlatformConfig
    mastodon?: TypefullyPlatformConfig
}

export interface TypefullyPlatformConfig {
    enabled: boolean
    posts: TypefullyPost[]
    settings?: TypefullyXSettings
}

export interface TypefullyPost {
    text: string
    media_ids?: string[]
}

export interface TypefullyXSettings {
    reply_to_url?: string
    community_id?: string
    share_with_followers?: boolean
}

/**
 * Social Set (account) response
 */
export interface TypefullySocialSet {
    id: number
    username: string
    name: string
    profile_image_url: string
}

export interface TypefullySocialSetsResponse {
    results: TypefullySocialSet[]
    count: number
}
