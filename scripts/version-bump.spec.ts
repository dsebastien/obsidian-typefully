import { describe, expect, test } from 'bun:test'
describe('latestMinAppVersion', () => {
    test('returns the floor of the highest release, not the last key', async () => {
        const { latestMinAppVersion } = await import('./version-bump')
        expect(latestMinAppVersion({ '1.6.0': '1.13.0', '0.1.0': '1.4.0', '1.8.0': '1.8.7' })).toBe(
            '1.8.7'
        )
    })

    test('compares versions numerically, not lexicographically', async () => {
        const { latestMinAppVersion } = await import('./version-bump')
        expect(latestMinAppVersion({ '9.0.0': '1.4.0', '10.0.0': '1.13.0' })).toBe('1.13.0')
    })

    test('returns null for an empty file', async () => {
        const { latestMinAppVersion } = await import('./version-bump')
        expect(latestMinAppVersion({})).toBe(null)
    })

    test('a floor that regressed and returns must still produce a new boundary', async () => {
        const { latestMinAppVersion } = await import('./version-bump')
        // Fleet history case: an old release already recorded the floor the
        // repo is returning to. A membership check would skip the new
        // boundary; the latest-floor comparison reports the regressed floor.
        const versions = { '0.1.0': '1.4.0', '1.3.6': '1.7.2', '1.6.0': '1.13.0', '1.8.0': '1.8.7' }
        expect(latestMinAppVersion(versions)).not.toBe('1.13.0')
    })
})
