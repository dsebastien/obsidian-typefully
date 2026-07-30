import { describe, expect, test } from 'bun:test'
import { checkMediaLimits } from './check-media-limits.fn'
import type { PlatformSettings } from '../types/plugin-settings.intf'

const platforms = (overrides: Partial<PlatformSettings> = {}): PlatformSettings => ({
    x: false,
    linkedin: false,
    threads: false,
    bluesky: false,
    mastodon: false,
    ...overrides
})

describe('checkMediaLimits', () => {
    test('returns undefined when there are no images', () => {
        expect(checkMediaLimits([], platforms({ x: true }))).toBeUndefined()
    })

    test('returns undefined when every post is within the limit', () => {
        expect(checkMediaLimits([4, 4], platforms({ x: true }))).toBeUndefined()
    })

    test('reports a violation when a single post exceeds the X limit', () => {
        expect(checkMediaLimits([8], platforms({ x: true }))).toEqual({
            platform: 'X (Twitter)',
            count: 8,
            limit: 4
        })
    })

    test('uses the largest post rather than the total for X', () => {
        // 6 images total, but spread across a thread so no post is over 4
        expect(checkMediaLimits([3, 3], platforms({ x: true }))).toBeUndefined()
        expect(checkMediaLimits([5, 1], platforms({ x: true }))).toEqual({
            platform: 'X (Twitter)',
            count: 5,
            limit: 4
        })
    })

    test('sums every post for LinkedIn, because thread posts get merged', () => {
        expect(checkMediaLimits([4, 4, 4, 4, 4, 4], platforms({ linkedin: true }))).toEqual({
            platform: 'LinkedIn',
            count: 24,
            limit: 20
        })
    })

    test('ignores platforms that are disabled', () => {
        expect(checkMediaLimits([8], platforms({ threads: true }))).toBeUndefined()
    })

    test('reports the violated platform when several are enabled', () => {
        const result = checkMediaLimits([8], platforms({ threads: true, bluesky: true }))
        expect(result).toEqual({ platform: 'Bluesky', count: 8, limit: 4 })
    })

    test('returns undefined when no platform is enabled', () => {
        expect(checkMediaLimits([99], platforms())).toBeUndefined()
    })
})
