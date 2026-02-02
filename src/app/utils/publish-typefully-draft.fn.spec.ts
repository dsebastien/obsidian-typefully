import { describe, expect, test, mock, beforeEach } from 'bun:test'
import {
    MSG_API_KEY_CONFIGURATION_REQUIRED,
    MSG_TYPEFULLY_FAILED_TO_PUBLISH,
    MSG_TYPEFULLY_FAILED_TO_PUBLISH_POSSIBLE_API_KEY_ISSUE
} from '../constants'
import type { TypefullyDraftContents } from '../types/typefully-draft-contents.intf'

// Mock requestUrl from obsidian
const mockRequestUrl = mock(async () => ({ status: 200, json: {} }))

// Mock the obsidian module
void mock.module('obsidian', () => ({
    requestUrl: mockRequestUrl
}))

// Import after mocking
const { publishTypefullyDraft, fetchSocialSets } = await import('./publish-typefully-draft.fn')

describe('publishTypefullyDraft', () => {
    const validContent: TypefullyDraftContents = {
        platforms: {
            x: {
                enabled: true,
                posts: [{ text: 'Hello world!' }]
            }
        }
    }

    beforeEach(() => {
        mockRequestUrl.mockClear()
    })

    test('returns error when API key is empty', async () => {
        const result = await publishTypefullyDraft(validContent, '', 'social-set-id')

        expect(result.successful).toBe(false)
        expect(result.errorDetails?.detail).toBe(MSG_API_KEY_CONFIGURATION_REQUIRED)
        expect(result.errorDetails?.statusCode).toBe(400)
    })

    test('fetches social sets when socialSetId is not provided', async () => {
        mockRequestUrl
            .mockResolvedValueOnce({
                status: 200,
                json: {
                    results: [
                        { id: 123, username: 'testuser', name: 'Test', profile_image_url: '' }
                    ],
                    count: 1
                }
            })
            .mockResolvedValueOnce({
                status: 201,
                json: { id: 1, status: 'draft', platforms: { x: { posts: [{}] } } }
            })

        const result = await publishTypefullyDraft(validContent, 'valid-api-key', '')

        expect(result.successful).toBe(true)
        expect(mockRequestUrl).toHaveBeenCalledTimes(2)
    })

    test('returns error when no social sets found', async () => {
        mockRequestUrl.mockResolvedValueOnce({
            status: 200,
            json: { results: [], count: 0 }
        })

        const result = await publishTypefullyDraft(validContent, 'valid-api-key', '')

        expect(result.successful).toBe(false)
        expect(result.errorDetails?.detail).toBe(
            'No social sets found. Please check your Typefully account.'
        )
    })

    test('returns success on 200 response', async () => {
        mockRequestUrl.mockResolvedValueOnce({
            status: 200,
            json: {
                id: 123,
                status: 'draft',
                platforms: { x: { posts: [{}, {}] } },
                scheduled_date: null,
                private_url: 'https://typefully.com/draft/123'
            }
        })

        const result = await publishTypefullyDraft(validContent, 'valid-api-key', 'social-set-id')

        expect(result.successful).toBe(true)
        expect(result.details?.id).toBe(123)
        expect(result.details?.postStatus).toBe('draft')
        expect(result.details?.numberOfTweets).toBe(2)
        expect(result.details?.privateUrl).toBe('https://typefully.com/draft/123')
    })

    test('returns success on 201 response', async () => {
        mockRequestUrl.mockResolvedValueOnce({
            status: 201,
            json: {
                id: 456,
                status: 'scheduled',
                platforms: { x: { posts: [{}] } },
                scheduled_date: '2024-01-15T10:00:00Z'
            }
        })

        const result = await publishTypefullyDraft(validContent, 'valid-api-key', 'social-set-id')

        expect(result.successful).toBe(true)
        expect(result.details?.scheduledDate).toBe('2024-01-15T10:00:00Z')
    })

    test('returns error on 500 response', async () => {
        mockRequestUrl.mockResolvedValueOnce({
            status: 500,
            json: {}
        })

        const result = await publishTypefullyDraft(validContent, 'valid-api-key', 'social-set-id')

        expect(result.successful).toBe(false)
        expect(result.errorDetails?.statusCode).toBe(500)
        expect(result.errorDetails?.detail).toContain('unavailable')
    })

    test('returns error message from API response', async () => {
        mockRequestUrl.mockResolvedValueOnce({
            status: 400,
            json: { error: { message: 'Invalid request format' } }
        })

        const result = await publishTypefullyDraft(validContent, 'valid-api-key', 'social-set-id')

        expect(result.successful).toBe(false)
        expect(result.errorDetails?.detail).toBe('Invalid request format')
    })

    test('returns detail from API response when error.message not present', async () => {
        mockRequestUrl.mockResolvedValueOnce({
            status: 400,
            json: { detail: 'Request validation failed' }
        })

        const result = await publishTypefullyDraft(validContent, 'valid-api-key', 'social-set-id')

        expect(result.successful).toBe(false)
        expect(result.errorDetails?.detail).toBe('Request validation failed')
    })

    test('handles 403 error with API key issue message', async () => {
        mockRequestUrl.mockRejectedValueOnce({ status: 403, name: 'Error' })

        const result = await publishTypefullyDraft(validContent, 'valid-api-key', 'social-set-id')

        expect(result.successful).toBe(false)
        expect(result.errorDetails?.statusCode).toBe(403)
        expect(result.errorDetails?.detail).toBe(
            MSG_TYPEFULLY_FAILED_TO_PUBLISH_POSSIBLE_API_KEY_ISSUE
        )
    })

    test('handles generic error with name property', async () => {
        mockRequestUrl.mockRejectedValueOnce({ name: 'NetworkError' })

        const result = await publishTypefullyDraft(validContent, 'valid-api-key', 'social-set-id')

        expect(result.successful).toBe(false)
        expect(result.errorDetails?.detail).toBe(MSG_TYPEFULLY_FAILED_TO_PUBLISH)
    })

    test('handles unknown error', async () => {
        mockRequestUrl.mockRejectedValueOnce('unknown error')

        const result = await publishTypefullyDraft(validContent, 'valid-api-key', 'social-set-id')

        expect(result.successful).toBe(false)
        expect(result.errorDetails?.detail).toBe(MSG_TYPEFULLY_FAILED_TO_PUBLISH)
    })

    test('sends correct headers with Bearer token', async () => {
        mockRequestUrl.mockResolvedValueOnce({
            status: 200,
            json: { id: 1, status: 'draft', platforms: { x: { posts: [{}] } } }
        })

        await publishTypefullyDraft(validContent, 'my-api-key', 'social-set-id')

        expect(mockRequestUrl).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: { Authorization: 'Bearer my-api-key' }
            })
        )
    })
})

describe('fetchSocialSets', () => {
    beforeEach(() => {
        mockRequestUrl.mockClear()
    })

    test('returns social sets on success', async () => {
        mockRequestUrl.mockResolvedValueOnce({
            status: 200,
            json: {
                results: [
                    { id: 1, username: 'user1', name: 'User One', profile_image_url: 'url1' },
                    { id: 2, username: 'user2', name: 'User Two', profile_image_url: 'url2' }
                ],
                count: 2
            }
        })

        const result = await fetchSocialSets('api-key')

        expect(result).not.toBeNull()
        expect(result?.results).toHaveLength(2)
        expect(result?.results[0]?.username).toBe('user1')
    })

    test('returns null on non-200 response', async () => {
        mockRequestUrl.mockResolvedValueOnce({
            status: 401,
            json: { error: 'Unauthorized' }
        })

        const result = await fetchSocialSets('invalid-key')

        expect(result).toBeNull()
    })

    test('returns null on request error', async () => {
        mockRequestUrl.mockRejectedValueOnce(new Error('Network error'))

        const result = await fetchSocialSets('api-key')

        expect(result).toBeNull()
    })

    test('sends correct authorization header', async () => {
        mockRequestUrl.mockResolvedValueOnce({
            status: 200,
            json: { results: [], count: 0 }
        })

        await fetchSocialSets('test-api-key')

        expect(mockRequestUrl).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: { Authorization: 'Bearer test-api-key' }
            })
        )
    })
})
