export interface PlatformSettings {
    x: boolean
    linkedin: boolean
    threads: boolean
    bluesky: boolean
    mastodon: boolean
}

export interface PluginSettings {
    apiKey: string
    socialSetId: string
    autoRetweet: boolean
    autoPlug: boolean
    threadify: boolean
    autoSchedule: boolean
    appendTags: boolean
    /**
     * Tags that must never be appended to posts, without the leading '#'.
     * Matching is case-insensitive and covers nested tags (excluding 'dev'
     * also excludes 'dev/frontend').
     */
    excludedTags: string[]
    enableAllPlatforms: boolean
    platforms: PlatformSettings
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
    x: true,
    linkedin: false,
    threads: false,
    bluesky: false,
    mastodon: false
}

export const DEFAULT_SETTINGS: PluginSettings = {
    apiKey: '',
    socialSetId: '',
    autoRetweet: false,
    autoPlug: false,
    threadify: false,
    autoSchedule: false,
    appendTags: false,
    excludedTags: [],
    enableAllPlatforms: false,
    platforms: { ...DEFAULT_PLATFORM_SETTINGS }
}

export const PLATFORM_NAMES: Record<keyof PlatformSettings, string> = {
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    threads: 'Threads',
    bluesky: 'Bluesky',
    mastodon: 'Mastodon'
}
