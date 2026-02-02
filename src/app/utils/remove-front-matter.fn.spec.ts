import { describe, expect, test } from 'bun:test'
import { removeFrontMatter } from './remove-front-matter.fn'

describe('removeFrontMatter', () => {
    test('removes simple YAML front matter', () => {
        const input = `---
title: Test
---
Content here`
        expect(removeFrontMatter(input)).toBe('Content here')
    })

    test('removes front matter with multiple properties', () => {
        const input = `---
title: My Post
date: 2024-01-15
tags: [one, two, three]
author: John Doe
---
The actual content starts here.`
        expect(removeFrontMatter(input)).toBe('The actual content starts here.')
    })

    test('preserves content without front matter', () => {
        const input = 'Just regular content without front matter'
        expect(removeFrontMatter(input)).toBe('Just regular content without front matter')
    })

    test('handles empty string', () => {
        expect(removeFrontMatter('')).toBe('')
    })

    test('handles front matter with empty content after', () => {
        const input = `---
title: Empty
---
`
        expect(removeFrontMatter(input)).toBe('')
    })

    test('preserves content when dashes appear in middle of text', () => {
        const input = 'Some text with --- dashes in the middle'
        expect(removeFrontMatter(input)).toBe('Some text with --- dashes in the middle')
    })

    test('removes front matter with nested content', () => {
        const input = `---
nested:
  key: value
  another: thing
---
Content`
        expect(removeFrontMatter(input)).toBe('Content')
    })

    test('handles front matter with special characters', () => {
        const input = `---
title: "Special: Characters & Symbols!"
emoji: 🎉
---
Body text`
        expect(removeFrontMatter(input)).toBe('Body text')
    })

    test('preserves multiple paragraphs after front matter', () => {
        const input = `---
title: Multi
---
First paragraph.

Second paragraph.

Third paragraph.`
        expect(removeFrontMatter(input)).toBe(`First paragraph.

Second paragraph.

Third paragraph.`)
    })

    test('handles front matter with code blocks inside', () => {
        const input = `---
code: |
  function test() {
    return true;
  }
---
After front matter`
        expect(removeFrontMatter(input)).toBe('After front matter')
    })
})
