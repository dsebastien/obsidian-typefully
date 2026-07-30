import type { ScreenshotSettings } from '../types/plugin-settings.intf'
import { DEFAULT_SCREENSHOT_SETTINGS } from '../types/plugin-settings.intf'
import { SCREENSHOT_BACKGROUNDS, SCREENSHOT_CARD_BACKGROUNDS, SCREENSHOT_FONTS } from '../constants'
import { resolveLinkColor } from './resolve-link-color.fn'

export interface ScreenshotStyle {
    gradientStart: string
    gradientEnd: string
    fontFamily: string
    linkColor: string
}

/**
 * Resolve the screenshot settings to the concrete CSS values applied to the
 * note image card. Falls back to the defaults for unknown presets or empty
 * custom values.
 */
export const resolveScreenshotStyle = (settings: ScreenshotSettings): ScreenshotStyle => {
    const defaultBackground = SCREENSHOT_BACKGROUNDS[DEFAULT_SCREENSHOT_SETTINGS.background]!

    let gradientStart: string
    let gradientEnd: string
    if (settings.background === 'custom') {
        gradientStart = settings.customGradientStart || defaultBackground.start
        gradientEnd = settings.customGradientEnd || defaultBackground.end
    } else {
        const preset = SCREENSHOT_BACKGROUNDS[settings.background] ?? defaultBackground
        gradientStart = preset.start
        gradientEnd = preset.end
    }

    const defaultFont = SCREENSHOT_FONTS[DEFAULT_SCREENSHOT_SETTINGS.font]!
    let fontFamily: string
    if (settings.font === 'custom') {
        fontFamily = settings.customFont.trim() || defaultFont.family
    } else {
        fontFamily = (SCREENSHOT_FONTS[settings.font] ?? defaultFont).family
    }

    // Links are coloured against the card, not the gradient behind it
    const cardBackground =
        'custom' === settings.cardTheme
            ? settings.customCardBackground || DEFAULT_SCREENSHOT_SETTINGS.customCardBackground
            : (SCREENSHOT_CARD_BACKGROUNDS[settings.cardTheme] ??
              SCREENSHOT_CARD_BACKGROUNDS[DEFAULT_SCREENSHOT_SETTINGS.cardTheme]!)
    const linkColor = resolveLinkColor(cardBackground, settings.linkColor)

    return { gradientStart, gradientEnd, fontFamily, linkColor }
}
