import { describe, expect, test } from 'bun:test'
import { hasName } from './has-name.fn'

describe('hasName', () => {
    test('returns true for object with string name property', () => {
        expect(hasName({ name: 'test' })).toBe(true)
    })

    test('returns true for object with empty string name', () => {
        expect(hasName({ name: '' })).toBe(true)
    })

    test('returns false for object with number name property', () => {
        expect(hasName({ name: 123 })).toBe(false)
    })

    test('returns false for object with null name property', () => {
        expect(hasName({ name: null })).toBe(false)
    })

    test('returns false for object with undefined name property', () => {
        expect(hasName({ name: undefined })).toBe(false)
    })

    test('returns false for object without name property', () => {
        expect(hasName({ other: 'value' })).toBe(false)
    })

    test('returns false for empty object', () => {
        expect(hasName({})).toBe(false)
    })

    test('returns false for null', () => {
        expect(hasName(null)).toBe(false)
    })

    test('returns false for undefined', () => {
        expect(hasName(undefined)).toBe(false)
    })

    test('returns false for string', () => {
        expect(hasName('test')).toBe(false)
    })

    test('returns false for number', () => {
        expect(hasName(42)).toBe(false)
    })

    test('returns false for array', () => {
        expect(hasName(['name'])).toBe(false)
    })

    test('returns true for object with additional properties', () => {
        expect(hasName({ name: 'test', other: 'value', count: 5 })).toBe(true)
    })
})
