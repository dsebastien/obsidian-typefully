import { describe, expect, it } from 'bun:test'
import { resolveScreenshotStyle } from './resolve-screenshot-style.fn'
import { DEFAULT_SCREENSHOT_SETTINGS } from '../types/plugin-settings.intf'
import type { ScreenshotSettings } from '../types/plugin-settings.intf'
import { SCREENSHOT_BACKGROUNDS, SCREENSHOT_FONTS } from '../constants'

const makeSettings = (overrides: Partial<ScreenshotSettings>): ScreenshotSettings => ({
    ...DEFAULT_SCREENSHOT_SETTINGS,
    ...overrides
})

describe('resolveScreenshotStyle', () => {
    it('should resolve a background preset', () => {
        const style = resolveScreenshotStyle(makeSettings({ background: 'ocean' }))
        expect(style.gradientStart).toBe(SCREENSHOT_BACKGROUNDS['ocean']!.start)
        expect(style.gradientEnd).toBe(SCREENSHOT_BACKGROUNDS['ocean']!.end)
    })

    it('should use custom gradient colors when background is custom', () => {
        const style = resolveScreenshotStyle(
            makeSettings({
                background: 'custom',
                customGradientStart: '#111111',
                customGradientEnd: '#222222'
            })
        )
        expect(style.gradientStart).toBe('#111111')
        expect(style.gradientEnd).toBe('#222222')
    })

    it('should fall back to the default gradient when custom colors are empty', () => {
        const style = resolveScreenshotStyle(
            makeSettings({ background: 'custom', customGradientStart: '', customGradientEnd: '' })
        )
        expect(style.gradientStart).toBe(SCREENSHOT_BACKGROUNDS['purple']!.start)
        expect(style.gradientEnd).toBe(SCREENSHOT_BACKGROUNDS['purple']!.end)
    })

    it('should resolve a font preset', () => {
        const style = resolveScreenshotStyle(makeSettings({ font: 'serif' }))
        expect(style.fontFamily).toBe(SCREENSHOT_FONTS['serif']!.family)
    })

    it('should use the custom font family when font is custom', () => {
        const style = resolveScreenshotStyle(
            makeSettings({ font: 'custom', customFont: 'Comic Sans MS' })
        )
        expect(style.fontFamily).toBe('Comic Sans MS')
    })

    it('should fall back to the default font when the custom font is blank', () => {
        const style = resolveScreenshotStyle(makeSettings({ font: 'custom', customFont: '   ' }))
        expect(style.fontFamily).toBe(SCREENSHOT_FONTS['sans']!.family)
    })
})
