import { describe, expect, test } from 'bun:test'
import { extractH1Title } from './extract-h1-title.fn'

describe('extractH1Title', () => {
    test('extracts a leading h1 and removes it from the markdown', () => {
        const input = `# My great title

Some content.`
        expect(extractH1Title(input)).toEqual({
            title: 'My great title',
            markdown: 'Some content.'
        })
    })

    test('removes only the heading line when no blank line follows', () => {
        const input = `# Title
Content right after.`
        expect(extractH1Title(input)).toEqual({
            title: 'Title',
            markdown: 'Content right after.'
        })
    })

    test('returns null when there is no h1', () => {
        const input = `## Only a subheading

Some content.`
        expect(extractH1Title(input)).toBeNull()
    })

    test('ignores headings of other levels', () => {
        const input = `## Two

### Three`
        expect(extractH1Title(input)).toBeNull()
    })

    test('ignores hashtags that are not headings', () => {
        const input = 'Some text with a #tag in it'
        expect(extractH1Title(input)).toBeNull()
    })

    test('strips closing hashes', () => {
        expect(extractH1Title('# Closed title #')).toEqual({
            title: 'Closed title',
            markdown: ''
        })
    })

    test('ignores h1 lines inside fenced code blocks', () => {
        const input = `Intro

\`\`\`md
# Not a real title
\`\`\`

# The real title

Body.`
        expect(extractH1Title(input)).toEqual({
            title: 'The real title',
            markdown: `Intro

\`\`\`md
# Not a real title
\`\`\`

Body.`
        })
    })

    test('ignores h1 lines inside tilde fenced code blocks', () => {
        const input = `~~~
# In a fence
~~~`
        expect(extractH1Title(input)).toBeNull()
    })

    test('extracts an h1 that is not the first line', () => {
        const input = `Some intro line.

# Later title

Body.`
        expect(extractH1Title(input)).toEqual({
            title: 'Later title',
            markdown: `Some intro line.

Body.`
        })
    })

    test('only extracts the first h1', () => {
        const input = `# First

# Second`
        expect(extractH1Title(input)).toEqual({
            title: 'First',
            markdown: '# Second'
        })
    })

    test('allows up to three leading spaces', () => {
        expect(extractH1Title('   # Indented title')).toEqual({
            title: 'Indented title',
            markdown: ''
        })
    })

    test('ignores headings indented by four spaces (code block)', () => {
        expect(extractH1Title('    # Indented code')).toBeNull()
    })

    test('ignores an empty heading', () => {
        const input = `#
# Real title
Body.`
        expect(extractH1Title(input)).toEqual({
            title: 'Real title',
            markdown: `#
Body.`
        })
    })

    test('handles an empty string', () => {
        expect(extractH1Title('')).toBeNull()
    })
})
