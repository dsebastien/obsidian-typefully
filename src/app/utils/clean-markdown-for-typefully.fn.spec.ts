import { describe, expect, test } from 'bun:test'
import { cleanMarkdownForTypeFully } from './clean-markdown-for-typefully.fn'

describe('cleanMarkdownForTypeFully', () => {
    test('removes YAML front matter', () => {
        const input = `---
title: Test Post
date: 2024-01-15
---
This is the content.`
        expect(cleanMarkdownForTypeFully(input)).toBe('This is the content.')
    })

    test('removes Obsidian wiki links', () => {
        const input = 'Check out [[My Note]] for more info'
        expect(cleanMarkdownForTypeFully(input)).toBe('Check out My Note for more info')
    })

    test('removes nested Obsidian links', () => {
        const input = 'See [[Folder/Subfolder/Note]]'
        expect(cleanMarkdownForTypeFully(input)).toBe('See Folder/Subfolder/Note')
    })

    test('removes Obsidian links with aliases', () => {
        const input = 'Check [[My Note|display text]]'
        expect(cleanMarkdownForTypeFully(input)).toBe('Check My Note|display text')
    })

    test('removes markdown links keeping text', () => {
        const input = 'Visit [Google](https://www.google.com) today'
        expect(cleanMarkdownForTypeFully(input)).toBe('Visit Google today')
    })

    test('removes markdown quotes', () => {
        const input = '> This is a quote'
        expect(cleanMarkdownForTypeFully(input)).toBe('This is a quote')
    })

    test('removes multiple quotes', () => {
        const input = `> First quote
> Second quote
> Third quote`
        expect(cleanMarkdownForTypeFully(input)).toBe(`First quote
Second quote
Third quote`)
    })

    test('trims whitespace', () => {
        const input = '   Content with spaces   '
        expect(cleanMarkdownForTypeFully(input)).toBe('Content with spaces')
    })

    test('handles empty string', () => {
        expect(cleanMarkdownForTypeFully('')).toBe('')
    })

    test('handles combined elements', () => {
        const input = `---
title: My Post
---
> This is a [[wiki link]] and [markdown link](https://example.com)

Regular text here.`
        expect(cleanMarkdownForTypeFully(input)).toBe(
            `This is a wiki link and markdown link

Regular text here.`
        )
    })

    test('preserves regular text', () => {
        const input = 'Just plain text without any special formatting'
        expect(cleanMarkdownForTypeFully(input)).toBe(
            'Just plain text without any special formatting'
        )
    })

    test('handles multiple Obsidian links', () => {
        const input = '[[Link1]] and [[Link2]] and [[Link3]]'
        expect(cleanMarkdownForTypeFully(input)).toBe('Link1 and Link2 and Link3')
    })

    test('preserves newlines in content', () => {
        const input = `First paragraph

Second paragraph

Third paragraph`
        expect(cleanMarkdownForTypeFully(input)).toBe(`First paragraph

Second paragraph

Third paragraph`)
    })

    test('handles content with thread separator (4 newlines)', () => {
        const input = `Tweet 1



Tweet 2



Tweet 3`
        expect(cleanMarkdownForTypeFully(input)).toBe(`Tweet 1



Tweet 2



Tweet 3`)
    })

    test('removes front matter and cleans rest', () => {
        const input = `---
tags: [twitter, thread]
---
> Quote from someone
Check [[this note]] and [that link](http://example.com)`
        expect(cleanMarkdownForTypeFully(input)).toBe(
            'Quote from someone\nCheck this note and that link'
        )
    })

    test('handles emoji content', () => {
        const input = '🎉 Celebrating with [[Party Note]] 🎊'
        expect(cleanMarkdownForTypeFully(input)).toBe('🎉 Celebrating with Party Note 🎊')
    })

    test('handles hashtags (preserves them)', () => {
        const input = 'Check out #typescript and #javascript'
        expect(cleanMarkdownForTypeFully(input)).toBe('Check out #typescript and #javascript')
    })
})
