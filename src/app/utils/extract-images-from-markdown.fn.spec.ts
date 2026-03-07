import { describe, expect, test } from 'bun:test'
import { extractImagesFromMarkdown } from './extract-images-from-markdown.fn'

describe('extractImagesFromMarkdown', () => {
    test('extracts wiki-style image embed', () => {
        const result = extractImagesFromMarkdown('Hello ![[photo.png]] world')

        expect(result).toHaveLength(1)
        expect(result[0]?.path).toBe('photo.png')
        expect(result[0]?.altText).toBe('')
        expect(result[0]?.isWikiLink).toBe(true)
        expect(result[0]?.originalSyntax).toBe('![[photo.png]]')
    })

    test('extracts wiki-style image with alt text', () => {
        const result = extractImagesFromMarkdown('![[photo.png|My photo]]')

        expect(result).toHaveLength(1)
        expect(result[0]?.path).toBe('photo.png')
        expect(result[0]?.altText).toBe('My photo')
        expect(result[0]?.isWikiLink).toBe(true)
    })

    test('extracts wiki-style image with path containing folders', () => {
        const result = extractImagesFromMarkdown('![[attachments/images/photo.png]]')

        expect(result).toHaveLength(1)
        expect(result[0]?.path).toBe('attachments/images/photo.png')
    })

    test('extracts standard markdown image', () => {
        const result = extractImagesFromMarkdown('![Alt text](path/to/image.jpg)')

        expect(result).toHaveLength(1)
        expect(result[0]?.path).toBe('path/to/image.jpg')
        expect(result[0]?.altText).toBe('Alt text')
        expect(result[0]?.isWikiLink).toBe(false)
    })

    test('extracts standard markdown image with empty alt', () => {
        const result = extractImagesFromMarkdown('![](image.png)')

        expect(result).toHaveLength(1)
        expect(result[0]?.altText).toBe('')
        expect(result[0]?.path).toBe('image.png')
    })

    test('extracts multiple images of both types in document order', () => {
        const text = `
Some text
![[first.png]]
More text
![second alt](second.jpg)
![[third.gif|animated]]
`
        const result = extractImagesFromMarkdown(text)

        expect(result).toHaveLength(3)
        expect(result[0]?.path).toBe('first.png')
        expect(result[0]?.isWikiLink).toBe(true)
        expect(result[1]?.path).toBe('second.jpg')
        expect(result[1]?.isWikiLink).toBe(false)
        expect(result[2]?.path).toBe('third.gif')
        expect(result[2]?.altText).toBe('animated')
    })

    test('returns empty array when no images found', () => {
        const result = extractImagesFromMarkdown('Just plain text with no images')
        expect(result).toHaveLength(0)
    })

    test('does not match non-image wiki links', () => {
        const result = extractImagesFromMarkdown('[[Some Note]] and [[Another Note|alias]]')
        expect(result).toHaveLength(0)
    })

    test('does not match non-image markdown links', () => {
        const result = extractImagesFromMarkdown('[link text](https://example.com)')
        expect(result).toHaveLength(0)
    })

    test('trims whitespace from paths and alt text', () => {
        const result = extractImagesFromMarkdown('![[  photo.png  |  My photo  ]]')

        expect(result).toHaveLength(1)
        expect(result[0]?.path).toBe('photo.png')
        expect(result[0]?.altText).toBe('My photo')
    })

    test('includes position for each image', () => {
        const text = 'AAA![[a.png]]BBB![b](b.jpg)'
        const result = extractImagesFromMarkdown(text)

        expect(result).toHaveLength(2)
        expect(result[0]?.position).toBe(3) // after 'AAA'
        expect(result[1]?.position).toBe(16) // after 'BBB'
    })
})
