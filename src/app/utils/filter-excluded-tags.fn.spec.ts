import { describe, expect, test } from 'bun:test'
import { filterExcludedTags } from './filter-excluded-tags.fn'

describe('filterExcludedTags', () => {
    test('returns the tags unchanged when there is nothing to exclude', () => {
        expect(filterExcludedTags(['#tag1', '#tag2'], [])).toEqual(['#tag1', '#tag2'])
    })

    test('returns the tags unchanged when the exclusions are all empty', () => {
        expect(filterExcludedTags(['#tag1'], ['', '  ', '#'])).toEqual(['#tag1'])
    })

    test('returns an empty array when there are no tags', () => {
        expect(filterExcludedTags([], ['permanent_notes'])).toEqual([])
    })

    test('removes an excluded tag', () => {
        expect(
            filterExcludedTags(['#tag1', '#permanent_notes', '#tag2'], ['permanent_notes'])
        ).toEqual(['#tag1', '#tag2'])
    })

    test('removes multiple excluded tags', () => {
        expect(
            filterExcludedTags(
                ['#permanent_notes', '#tag1', '#literature_notes'],
                ['permanent_notes', 'literature_notes']
            )
        ).toEqual(['#tag1'])
    })

    test('matches exclusions written with a leading hash', () => {
        expect(filterExcludedTags(['#tag1', '#tag2'], ['#tag2'])).toEqual(['#tag1'])
    })

    test('matches exclusions case-insensitively', () => {
        expect(filterExcludedTags(['#Permanent_Notes'], ['permanent_notes'])).toEqual([])
        expect(filterExcludedTags(['#permanent_notes'], ['Permanent_Notes'])).toEqual([])
    })

    test('ignores surrounding whitespace in exclusions', () => {
        expect(filterExcludedTags(['#tag1'], ['  tag1  '])).toEqual([])
    })

    test('excludes nested tags of an excluded parent', () => {
        expect(filterExcludedTags(['#dev/frontend', '#dev/backend', '#writing'], ['dev'])).toEqual([
            '#writing'
        ])
    })

    test('excludes a specific nested tag without excluding its siblings', () => {
        expect(filterExcludedTags(['#dev/frontend', '#dev/backend'], ['dev/frontend'])).toEqual([
            '#dev/backend'
        ])
    })

    test('does not exclude tags that merely start with an excluded tag', () => {
        expect(filterExcludedTags(['#development', '#dev'], ['dev'])).toEqual(['#development'])
    })

    test('returns an empty array when all tags are excluded', () => {
        expect(filterExcludedTags(['#tag1', '#tag2'], ['tag1', 'tag2'])).toEqual([])
    })
})
