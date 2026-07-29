import { describe, expect, test } from 'bun:test'
import { formatExcludedTags, parseExcludedTags } from './parse-excluded-tags.fn'

describe('parseExcludedTags', () => {
    test('returns an empty array for an empty string', () => {
        expect(parseExcludedTags('')).toEqual([])
    })

    test('returns an empty array for whitespace only', () => {
        expect(parseExcludedTags('   \n  ')).toEqual([])
    })

    test('parses a single tag', () => {
        expect(parseExcludedTags('permanent_notes')).toEqual(['permanent_notes'])
    })

    test('parses comma separated tags', () => {
        expect(parseExcludedTags('permanent_notes, literature_notes')).toEqual([
            'permanent_notes',
            'literature_notes'
        ])
    })

    test('parses newline separated tags', () => {
        expect(parseExcludedTags('permanent_notes\nliterature_notes')).toEqual([
            'permanent_notes',
            'literature_notes'
        ])
    })

    test('strips the leading hash', () => {
        expect(parseExcludedTags('#permanent_notes, ##literature_notes')).toEqual([
            'permanent_notes',
            'literature_notes'
        ])
    })

    test('ignores empty entries', () => {
        expect(parseExcludedTags('permanent_notes,,  , literature_notes,')).toEqual([
            'permanent_notes',
            'literature_notes'
        ])
    })

    test('removes duplicates, case-insensitively', () => {
        expect(parseExcludedTags('permanent_notes, #permanent_notes, Permanent_Notes')).toEqual([
            'permanent_notes'
        ])
    })

    test('preserves the casing entered by the user', () => {
        expect(parseExcludedTags('Permanent_Notes')).toEqual(['Permanent_Notes'])
    })

    test('keeps nested tags intact', () => {
        expect(parseExcludedTags('#dev/frontend')).toEqual(['dev/frontend'])
    })
})

describe('formatExcludedTags', () => {
    test('returns an empty string when there is nothing to exclude', () => {
        expect(formatExcludedTags([])).toBe('')
    })

    test('joins the tags with commas', () => {
        expect(formatExcludedTags(['permanent_notes', 'literature_notes'])).toBe(
            'permanent_notes, literature_notes'
        )
    })

    test('round-trips through parseExcludedTags', () => {
        const tags = ['permanent_notes', 'dev/frontend']
        expect(parseExcludedTags(formatExcludedTags(tags))).toEqual(tags)
    })
})
