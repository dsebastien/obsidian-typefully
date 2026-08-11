import { describe, expect, test } from 'bun:test'
import { describeMediaSelectionWarning } from './describe-media-selection-warning.fn'

describe('describeMediaSelectionWarning', () => {
    test('returns null for an empty selection', () => {
        expect(describeMediaSelectionWarning([])).toBeNull()
    })

    test('returns null for images only', () => {
        expect(describeMediaSelectionWarning(['image', 'image', 'image'])).toBeNull()
    })

    test('returns null for a single video', () => {
        expect(describeMediaSelectionWarning(['video'])).toBeNull()
    })

    test('warns when several videos are selected', () => {
        const warning = describeMediaSelectionWarning(['video', 'video'])
        expect(warning).toContain('2 videos')
        expect(warning).toContain('single video per post')
    })

    test('warns when a video is mixed with images', () => {
        const warning = describeMediaSelectionWarning(['image', 'video'])
        expect(warning).toContain('1 image')
        expect(warning).toContain('mixing')
    })

    test('pluralizes the image count in the mixed warning', () => {
        expect(describeMediaSelectionWarning(['image', 'image', 'video'])).toContain('2 images')
    })

    test('prefers the multiple-videos warning when both apply', () => {
        expect(describeMediaSelectionWarning(['image', 'video', 'video'])).toContain('2 videos')
    })
})
