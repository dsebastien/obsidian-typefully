/**
 * Link colours picked automatically when the user has not chosen one.
 * Both clear WCAG AA against the card backgrounds they are meant for.
 */
export const LINK_COLOR_ON_DARK = '#8ab4f8'
export const LINK_COLOR_ON_LIGHT = '#1a56db'

/**
 * Parse a CSS hex colour into its RGB components.
 * Supports the #rgb and #rrggbb forms.
 * @param color the colour to parse
 * @returns the RGB components in the 0-255 range, or undefined when the value
 * is not a hex colour
 */
const parseHexColor = (color: string): [number, number, number] | undefined => {
    const trimmed = color.trim()
    const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed)
    if (!match) {
        return undefined
    }

    const digits = match[1]!
    const expanded =
        3 === digits.length
            ? digits
                  .split('')
                  .map((digit) => `${digit}${digit}`)
                  .join('')
            : digits

    return [
        parseInt(expanded.slice(0, 2), 16),
        parseInt(expanded.slice(2, 4), 16),
        parseInt(expanded.slice(4, 6), 16)
    ]
}

/**
 * Relative luminance of a colour, per the WCAG 2.1 definition.
 * @param rgb the colour's RGB components, in the 0-255 range
 */
const relativeLuminance = ([r, g, b]: [number, number, number]): number => {
    const linearize = (value: number): number => {
        const channel = value / 255
        return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
    }

    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/**
 * Contrast ratio between two colours, per the WCAG 2.1 definition.
 * Ranges from 1 (identical) to 21 (black on white).
 * @param foreground the foreground colour
 * @param background the background colour
 * @returns the contrast ratio, or undefined when either colour is not hex
 */
export const contrastRatio = (foreground: string, background: string): number | undefined => {
    const foregroundRgb = parseHexColor(foreground)
    const backgroundRgb = parseHexColor(background)
    if (!foregroundRgb || !backgroundRgb) {
        return undefined
    }

    const foregroundLuminance = relativeLuminance(foregroundRgb)
    const backgroundLuminance = relativeLuminance(backgroundRgb)
    const lighter = Math.max(foregroundLuminance, backgroundLuminance)
    const darker = Math.min(foregroundLuminance, backgroundLuminance)

    return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Decide which colour links should use on the note image.
 *
 * An explicit choice always wins. Otherwise the colour is derived from the
 * card's background so that links stay readable on both light and dark cards,
 * and on whatever custom background the user configured.
 *
 * @param cardBackground the card's background colour, as a hex value
 * @param explicitColor the colour chosen in the settings, if any
 */
export const resolveLinkColor = (cardBackground: string, explicitColor = ''): string => {
    const chosen = explicitColor.trim()
    if ('' !== chosen) {
        return chosen
    }

    const onDark = contrastRatio(LINK_COLOR_ON_DARK, cardBackground)
    const onLight = contrastRatio(LINK_COLOR_ON_LIGHT, cardBackground)

    // An unparseable background is assumed light, matching the default card
    if (undefined === onDark || undefined === onLight) {
        return LINK_COLOR_ON_LIGHT
    }

    return onDark > onLight ? LINK_COLOR_ON_DARK : LINK_COLOR_ON_LIGHT
}
