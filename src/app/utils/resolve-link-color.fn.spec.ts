import { describe, expect, test } from 'bun:test'
import {
    contrastRatio,
    LINK_COLOR_ON_DARK,
    LINK_COLOR_ON_LIGHT,
    resolveLinkColor
} from './resolve-link-color.fn'

describe('contrastRatio', () => {
    test('returns the maximum ratio for black on white', () => {
        expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    })

    test('returns 1 for identical colors', () => {
        expect(contrastRatio('#4a90d9', '#4a90d9')).toBeCloseTo(1, 5)
    })

    test('is symmetric', () => {
        expect(contrastRatio('#16161e', '#8ab4f8')).toBeCloseTo(
            contrastRatio('#8ab4f8', '#16161e')!,
            5
        )
    })

    test('expands the three digit form', () => {
        expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 5)
    })

    test('returns undefined for values that are not hex colors', () => {
        expect(contrastRatio('rebeccapurple', '#ffffff')).toBeUndefined()
        expect(contrastRatio('#ffffff', 'var(--foo)')).toBeUndefined()
        expect(contrastRatio('#gggggg', '#ffffff')).toBeUndefined()
    })
})

describe('resolveLinkColor', () => {
    test('honours an explicit color over the derived one', () => {
        expect(resolveLinkColor('#16161e', '#ff0000')).toBe('#ff0000')
    })

    test('ignores an explicit color that is only whitespace', () => {
        expect(resolveLinkColor('#ffffff', '   ')).toBe(LINK_COLOR_ON_LIGHT)
    })

    test('picks the light link color on the dark card', () => {
        expect(resolveLinkColor('#16161e')).toBe(LINK_COLOR_ON_DARK)
    })

    test('picks the dark link color on the light card', () => {
        expect(resolveLinkColor('#ffffff')).toBe(LINK_COLOR_ON_LIGHT)
    })

    test('adapts to custom card backgrounds', () => {
        expect(resolveLinkColor('#000000')).toBe(LINK_COLOR_ON_DARK)
        expect(resolveLinkColor('#fdf6e3')).toBe(LINK_COLOR_ON_LIGHT)
        expect(resolveLinkColor('#2d3142')).toBe(LINK_COLOR_ON_DARK)
    })

    test('falls back to the light card color when the background is unparseable', () => {
        expect(resolveLinkColor('not-a-color')).toBe(LINK_COLOR_ON_LIGHT)
    })

    test('the derived color clears WCAG AA against its card', () => {
        expect(contrastRatio(resolveLinkColor('#16161e'), '#16161e')!).toBeGreaterThan(4.5)
        expect(contrastRatio(resolveLinkColor('#ffffff'), '#ffffff')!).toBeGreaterThan(4.5)
    })
})
