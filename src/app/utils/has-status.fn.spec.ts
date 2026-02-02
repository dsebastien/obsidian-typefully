import { describe, expect, test } from 'bun:test'
import { hasStatus } from './has-status.fn'

describe('hasStatus', () => {
    test('returns true for object with number status property', () => {
        expect(hasStatus({ status: 200 })).toBe(true)
    })

    test('returns true for object with zero status', () => {
        expect(hasStatus({ status: 0 })).toBe(true)
    })

    test('returns true for object with negative status', () => {
        expect(hasStatus({ status: -1 })).toBe(true)
    })

    test('returns false for object with string status property', () => {
        expect(hasStatus({ status: '200' })).toBe(false)
    })

    test('returns false for object with null status property', () => {
        expect(hasStatus({ status: null })).toBe(false)
    })

    test('returns false for object with undefined status property', () => {
        expect(hasStatus({ status: undefined })).toBe(false)
    })

    test('returns false for object without status property', () => {
        expect(hasStatus({ other: 'value' })).toBe(false)
    })

    test('returns false for empty object', () => {
        expect(hasStatus({})).toBe(false)
    })

    test('returns false for null', () => {
        expect(hasStatus(null)).toBe(false)
    })

    test('returns false for undefined', () => {
        expect(hasStatus(undefined)).toBe(false)
    })

    test('returns false for string', () => {
        expect(hasStatus('test')).toBe(false)
    })

    test('returns false for number', () => {
        expect(hasStatus(42)).toBe(false)
    })

    test('returns false for array', () => {
        expect(hasStatus([200])).toBe(false)
    })

    test('returns true for object with additional properties', () => {
        expect(hasStatus({ status: 404, message: 'Not found' })).toBe(true)
    })

    test('returns true for common HTTP status codes', () => {
        expect(hasStatus({ status: 200 })).toBe(true)
        expect(hasStatus({ status: 201 })).toBe(true)
        expect(hasStatus({ status: 400 })).toBe(true)
        expect(hasStatus({ status: 403 })).toBe(true)
        expect(hasStatus({ status: 404 })).toBe(true)
        expect(hasStatus({ status: 500 })).toBe(true)
    })
})
