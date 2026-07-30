export interface PlatformSettings {
    x: boolean
    linkedin: boolean
    threads: boolean
    bluesky: boolean
    mastodon: boolean
}

export type ScreenshotBackgroundId =
    | 'purple'
    | 'sunset'
    | 'ocean'
    | 'forest'
    | 'midnight'
    | 'custom'
export type ScreenshotCardTheme = 'light' | 'dark' | 'custom'
export type ScreenshotAspectRatio = 'portrait' | 'square' | 'landscape'
export type ScreenshotFontId = 'sans' | 'serif' | 'mono' | 'custom'
export type ScreenshotTextSize = 'small' | 'medium' | 'large'
export type ScreenshotWatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/**
 * Appearance of the note image card produced by the
 * "Publish a screenshot of the current note" command
 */
export interface ScreenshotSettings {
    background: ScreenshotBackgroundId
    /**
     * Gradient colors used when background is 'custom'
     */
    customGradientStart: string
    customGradientEnd: string
    cardTheme: ScreenshotCardTheme
    /**
     * Card colors used when cardTheme is 'custom'
     */
    customCardBackground: string
    customCardText: string
    font: ScreenshotFontId
    /**
     * CSS font family used when font is 'custom'
     */
    customFont: string
    textSize: ScreenshotTextSize
    aspectRatio: ScreenshotAspectRatio
    showTitle: boolean
    /**
     * Short text stamped on the image (e.g. an author handle).
     * Empty string disables the watermark.
     */
    watermarkText: string
    watermarkPosition: ScreenshotWatermarkPosition
    watermarkColor: string
    /**
     * Colour used for links on the note image.
     * Empty string derives a readable colour from the card background.
     */
    linkColor: string
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
    screenshot: ScreenshotSettings
}

export const SCREENSHOT_BACKGROUND_IDS: ScreenshotBackgroundId[] = [
    'purple',
    'sunset',
    'ocean',
    'forest',
    'midnight',
    'custom'
]
export const SCREENSHOT_CARD_THEMES: ScreenshotCardTheme[] = ['light', 'dark', 'custom']
export const SCREENSHOT_FONT_IDS: ScreenshotFontId[] = ['sans', 'serif', 'mono', 'custom']
export const SCREENSHOT_TEXT_SIZES: ScreenshotTextSize[] = ['small', 'medium', 'large']
export const SCREENSHOT_ASPECT_RATIOS: ScreenshotAspectRatio[] = ['portrait', 'square', 'landscape']
export const SCREENSHOT_WATERMARK_POSITIONS: ScreenshotWatermarkPosition[] = [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right'
]

export const DEFAULT_SCREENSHOT_SETTINGS: ScreenshotSettings = {
    background: 'purple',
    customGradientStart: '#667eea',
    customGradientEnd: '#764ba2',
    cardTheme: 'light',
    customCardBackground: '#ffffff',
    customCardText: '#333347',
    font: 'sans',
    customFont: '',
    textSize: 'medium',
    aspectRatio: 'portrait',
    showTitle: true,
    watermarkText: '',
    watermarkPosition: 'bottom-right',
    watermarkColor: '#ffffff',
    linkColor: ''
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
    platforms: { ...DEFAULT_PLATFORM_SETTINGS },
    screenshot: { ...DEFAULT_SCREENSHOT_SETTINGS }
}

export const PLATFORM_NAMES: Record<keyof PlatformSettings, string> = {
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    threads: 'Threads',
    bluesky: 'Bluesky',
    mastodon: 'Mastodon'
}
