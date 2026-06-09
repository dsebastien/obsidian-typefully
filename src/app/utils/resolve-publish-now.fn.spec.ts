import { describe, expect, test } from 'bun:test'
import { parseISO } from 'date-fns'
import { resolvePublishNow, PUBLISH_NOW_DEFER_MS } from './resolve-publish-now.fn'

describe('resolvePublishNow', () => {
    const now = new Date('2026-06-09T12:00:00Z')

    test('publishes immediately when there is no URL', () => {
        const result = resolvePublishNow(['Hello world', 'second post'], true, now)
        expect(result).toEqual({ publishAt: 'now', deferred: false })
    })

    test('publishes immediately when a URL is present but X is disabled', () => {
        const result = resolvePublishNow(['Check https://example.com'], false, now)
        expect(result).toEqual({ publishAt: 'now', deferred: false })
    })

    test('defers when X is enabled and content contains an http(s) URL', () => {
        const result = resolvePublishNow(['Read more: https://example.com'], true, now)
        expect(result.deferred).toBe(true)
        expect(parseISO(result.publishAt).getTime()).toBe(now.getTime() + PUBLISH_NOW_DEFER_MS)
    })

    test('detects a URL in any post of the thread', () => {
        const result = resolvePublishNow(['Intro', 'See www.example.com for details'], true, now)
        expect(result.deferred).toBe(true)
    })

    test('detects bare www. links', () => {
        const result = resolvePublishNow(['www.example.com'], true, now)
        expect(result.deferred).toBe(true)
    })

    test('does not flag ordinary prose with dots', () => {
        const result = resolvePublishNow(['I refactored app.module.ts today.'], true, now)
        expect(result).toEqual({ publishAt: 'now', deferred: false })
    })
})
