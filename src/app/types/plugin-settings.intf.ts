import { DEFAULT_API_KEY_SECRET_NAME } from '../utils/api-key-secret.fn'

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
    /**
     * Name of the Obsidian SecretStorage entry holding the Typefully API key.
     * Only the name is stored in data.json; the key itself never is. Read the
     * value at use time through the plugin's getApiKey().
     */
    apiKeySecretName: string
    /**
     * ISO date at which a device first moved the legacy plaintext API key
     * into SecretStorage; '' if that never happened. The plaintext copy is
     * removed from data.json 60 days later.
     */
    legacySecretMigratedAt: string
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

/**
 * A fresh default settings object, safe to hand to Immer.
 *
 * `produce` deep-freezes what it returns, including any subtree it shares
 * with its base. Producing from the shared DEFAULT_SETTINGS froze that
 * constant (nested values too) for the rest of the process, so any later code
 * or test touching it failed with "Attempted to assign to readonly
 * property". Produce from this instead, and keep it deep-fresh: build
 * nested arrays and objects as new values, never by spreading DEFAULT_SETTINGS.
 */
export function createDefaultSettings(): PluginSettings {
    return {
        apiKeySecretName: DEFAULT_API_KEY_SECRET_NAME,
        legacySecretMigratedAt: '',
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
}

/** The defaults, for reading and comparing. Never produce from it. */
export const DEFAULT_SETTINGS: PluginSettings = createDefaultSettings()

export const PLATFORM_NAMES: Record<keyof PlatformSettings, string> = {
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    threads: 'Threads',
    bluesky: 'Bluesky',
    mastodon: 'Mastodon'
}
