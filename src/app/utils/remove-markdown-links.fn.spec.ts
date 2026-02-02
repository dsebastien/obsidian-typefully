import { describe, expect, test } from 'bun:test'
import { removeMarkdownLinks } from './remove-markdown-links.fn'

describe('removeMarkdownLinks', () => {
    test('removes simple markdown link keeping text', () => {
        const input = '[Google](https://www.google.com)'
        expect(removeMarkdownLinks(input)).toBe('Google')
    })

    test('removes multiple markdown links', () => {
        const input = 'Check out [Google](https://google.com) and [GitHub](https://github.com)'
        expect(removeMarkdownLinks(input)).toBe('Check out Google and GitHub')
    })

    test('preserves text without links', () => {
        const input = 'Just regular text without any links'
        expect(removeMarkdownLinks(input)).toBe('Just regular text without any links')
    })

    test('handles empty string', () => {
        expect(removeMarkdownLinks('')).toBe('')
    })

    test('handles link with empty text', () => {
        const input = '[](https://example.com)'
        expect(removeMarkdownLinks(input)).toBe('')
    })

    test('removes link with complex URL', () => {
        const input = '[Article](https://example.com/path/to/page?param=value&other=123#anchor)'
        expect(removeMarkdownLinks(input)).toBe('Article')
    })

    test('handles link text with spaces', () => {
        const input = '[Click here for more info](https://example.com)'
        expect(removeMarkdownLinks(input)).toBe('Click here for more info')
    })

    test('handles link in middle of sentence', () => {
        const input = 'Please visit [our website](https://example.com) for more information.'
        expect(removeMarkdownLinks(input)).toBe('Please visit our website for more information.')
    })

    test('handles multiple links on same line', () => {
        const input = '[One](http://1.com) [Two](http://2.com) [Three](http://3.com)'
        expect(removeMarkdownLinks(input)).toBe('One Two Three')
    })

    test('preserves square brackets that are not links', () => {
        const input = 'Array[0] = value'
        expect(removeMarkdownLinks(input)).toBe('Array[0] = value')
    })

    test('handles link with special characters in text', () => {
        const input = '[Hello & Goodbye!](https://example.com)'
        expect(removeMarkdownLinks(input)).toBe('Hello & Goodbye!')
    })

    test('handles nested brackets in URL (encoded)', () => {
        const input = '[Link](https://example.com/path%5B0%5D)'
        expect(removeMarkdownLinks(input)).toBe('Link')
    })

    test('removes links across multiple lines', () => {
        const input = `First line with [link1](http://1.com)
Second line with [link2](http://2.com)
Third line no link`
        expect(removeMarkdownLinks(input)).toBe(`First line with link1
Second line with link2
Third line no link`)
    })
})
