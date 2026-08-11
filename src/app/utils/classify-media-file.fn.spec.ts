import { describe, expect, test } from 'bun:test'
import { getMediaKind, isPublishableMediaFile } from './classify-media-file.fn'

describe('getMediaKind', () => {
    test('classifies image extensions', () => {
        for (const extension of ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']) {
            expect(getMediaKind(extension)).toBe('image')
        }
    })

    test('classifies video extensions', () => {
        for (const extension of ['mp4', 'mov', 'webm']) {
            expect(getMediaKind(extension)).toBe('video')
        }
    })

    test('is case insensitive', () => {
        expect(getMediaKind('PNG')).toBe('image')
        expect(getMediaKind('MP4')).toBe('video')
    })

    test('accepts a leading period', () => {
        expect(getMediaKind('.png')).toBe('image')
    })

    test('ignores surrounding whitespace', () => {
        expect(getMediaKind('  png  ')).toBe('image')
    })

    test('returns null for notes', () => {
        expect(getMediaKind('md')).toBeNull()
    })

    test('returns null for PDFs, which are not a post on their own', () => {
        expect(getMediaKind('pdf')).toBeNull()
    })

    test('returns null for unknown or empty extensions', () => {
        expect(getMediaKind('exe')).toBeNull()
        expect(getMediaKind('')).toBeNull()
        expect(getMediaKind('   ')).toBeNull()
    })
})

describe('isPublishableMediaFile', () => {
    test('accepts images and videos', () => {
        expect(isPublishableMediaFile({ extension: 'png' })).toBe(true)
        expect(isPublishableMediaFile({ extension: 'mp4' })).toBe(true)
    })

    test('rejects anything else', () => {
        expect(isPublishableMediaFile({ extension: 'md' })).toBe(false)
        expect(isPublishableMediaFile({ extension: 'canvas' })).toBe(false)
    })
})
