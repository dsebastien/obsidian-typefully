import { describe, expect, test } from 'bun:test'
import { removeImageSyntax } from './remove-image-syntax.fn'

describe('removeImageSyntax', () => {
    test('removes wiki-style image embed', () => {
        expect(removeImageSyntax('Hello ![[photo.png]] world')).toBe('Hello  world')
    })

    test('removes wiki-style image with alt text', () => {
        expect(removeImageSyntax('![[photo.png|My photo]]')).toBe('')
    })

    test('removes standard markdown image', () => {
        expect(removeImageSyntax('![Alt text](path/to/image.jpg)')).toBe('')
    })

    test('removes standard markdown image with empty alt', () => {
        expect(removeImageSyntax('Before ![](image.png) After')).toBe('Before  After')
    })

    test('removes multiple images of both types', () => {
        const text = 'Start ![[first.png]] middle ![alt](second.jpg) end'
        expect(removeImageSyntax(text)).toBe('Start  middle  end')
    })

    test('preserves non-image wiki links', () => {
        expect(removeImageSyntax('[[Some Note]]')).toBe('[[Some Note]]')
    })

    test('preserves non-image markdown links', () => {
        expect(removeImageSyntax('[link](https://example.com)')).toBe('[link](https://example.com)')
    })

    test('returns text unchanged when no images', () => {
        const text = 'Just plain text'
        expect(removeImageSyntax(text)).toBe(text)
    })

    test('handles image on its own line', () => {
        const text = 'Line 1\n![[photo.png]]\nLine 3'
        expect(removeImageSyntax(text)).toBe('Line 1\n\nLine 3')
    })
})
