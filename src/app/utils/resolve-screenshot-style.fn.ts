import type { ScreenshotSettings } from '../types/plugin-settings.intf'
import { DEFAULT_SCREENSHOT_SETTINGS } from '../types/plugin-settings.intf'
import { SCREENSHOT_BACKGROUNDS, SCREENSHOT_FONTS } from '../constants'

export interface ScreenshotStyle {
    gradientStart: string
    gradientEnd: string
    fontFamily: string
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

    return { gradientStart, gradientEnd, fontFamily }
}
