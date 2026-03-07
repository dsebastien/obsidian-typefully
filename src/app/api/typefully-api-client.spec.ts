import { describe, expect, test, mock, beforeEach } from 'bun:test'

const mockRequestUrl = mock(async () => ({ status: 200, json: {} }))

void mock.module('obsidian', () => ({
    requestUrl: mockRequestUrl
}))

const { TypefullyApiClient } = await import('./typefully-api-client')

describe('TypefullyApiClient', () => {
    let client: InstanceType<typeof TypefullyApiClient>

    beforeEach(() => {
        mockRequestUrl.mockClear()
        client = new TypefullyApiClient('test-api-key')
    })

    describe('getMe', () => {
        test('calls GET /me with correct auth', async () => {
            mockRequestUrl.mockResolvedValueOnce({
                status: 200,
                json: { id: 1, email: 'test@test.com', name: 'Test', profile_image_url: '' }
            })

            const user = await client.getMe()

            expect(user.id).toBe(1)
            expect(user.email).toBe('test@test.com')
            expect(mockRequestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://api.typefully.com/v2/me',
                    method: 'GET',
                    headers: { Authorization: 'Bearer test-api-key' }
                })
            )
        })
    })

    describe('listSocialSets', () => {
        test('calls GET /social-sets', async () => {
            mockRequestUrl.mockResolvedValueOnce({
                status: 200,
                json: { results: [{ id: 1, username: 'user1' }], count: 1 }
            })

            const result = await client.listSocialSets()

            expect(result.count).toBe(1)
            expect(mockRequestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://api.typefully.com/v2/social-sets',
                    method: 'GET'
                })
            )
        })
    })

    describe('listDrafts', () => {
        test('calls GET /social-sets/{id}/drafts with query params', async () => {
            mockRequestUrl.mockResolvedValueOnce({
                status: 200,
                json: { results: [], count: 0, next: null, previous: null }
            })

            await client.listDrafts('123', {
                status: 'draft',
                order_by: '-created_at',
                limit: 20,
                offset: 20
            })

            expect(mockRequestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://api.typefully.com/v2/social-sets/123/drafts?status=draft&order_by=-created_at&limit=20&offset=20',
                    method: 'GET'
                })
            )
        })

        test('calls without query params when none provided', async () => {
            mockRequestUrl.mockResolvedValueOnce({
                status: 200,
                json: { results: [], count: 0, next: null, previous: null }
            })

            await client.listDrafts('123')

            expect(mockRequestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://api.typefully.com/v2/social-sets/123/drafts'
                })
            )
        })
    })

    describe('createDraft', () => {
        test('calls POST /social-sets/{id}/drafts with body', async () => {
            mockRequestUrl.mockResolvedValueOnce({
                status: 201,
                json: { id: 42, status: 'draft', platforms: {} }
            })

            const content = {
                platforms: { x: { enabled: true, posts: [{ text: 'Hello' }] } }
            }
            const result = await client.createDraft('123', content)

            expect(result.id).toBe(42)
            expect(mockRequestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://api.typefully.com/v2/social-sets/123/drafts',
                    method: 'POST',
                    body: JSON.stringify(content)
                })
            )
        })
    })

    describe('getDraft', () => {
        test('calls GET /social-sets/{id}/drafts/{draftId}', async () => {
            mockRequestUrl.mockResolvedValueOnce({
                status: 200,
                json: { id: 42, status: 'draft' }
            })

            const result = await client.getDraft('123', 42)

            expect(result.id).toBe(42)
            expect(mockRequestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://api.typefully.com/v2/social-sets/123/drafts/42',
                    method: 'GET'
                })
            )
        })
    })

    describe('updateDraft', () => {
        test('calls PATCH /social-sets/{id}/drafts/{draftId}', async () => {
            mockRequestUrl.mockResolvedValueOnce({
                status: 200,
                json: { id: 42, status: 'scheduled' }
            })

            const payload = { publish_at: 'next-free-slot' as const }
            await client.updateDraft('123', 42, payload)

            expect(mockRequestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://api.typefully.com/v2/social-sets/123/drafts/42',
                    method: 'PATCH',
                    body: JSON.stringify(payload)
                })
            )
        })
    })

    describe('deleteDraft', () => {
        test('calls DELETE /social-sets/{id}/drafts/{draftId}', async () => {
            mockRequestUrl.mockResolvedValueOnce({ status: 204, json: {} })

            await client.deleteDraft('123', 42)

            expect(mockRequestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://api.typefully.com/v2/social-sets/123/drafts/42',
                    method: 'DELETE'
                })
            )
        })
    })

    describe('requestMediaUpload', () => {
        test('calls POST /social-sets/{id}/media/upload', async () => {
            mockRequestUrl.mockResolvedValueOnce({
                status: 200,
                json: { media_id: 'media-1', upload_url: 'https://s3.example.com/upload' }
            })

            const result = await client.requestMediaUpload('123', { filename: 'image.png' })

            expect(result.media_id).toBe('media-1')
            expect(result.upload_url).toBe('https://s3.example.com/upload')
        })
    })

    describe('getMediaStatus', () => {
        test('calls GET /social-sets/{id}/media/{mediaId}', async () => {
            mockRequestUrl.mockResolvedValueOnce({
                status: 200,
                json: { media_id: 'media-1', status: 'ready', url: 'https://cdn.example.com/img' }
            })

            const result = await client.getMediaStatus('123', 'media-1')

            expect(result.status).toBe('ready')
        })
    })

    describe('listTags', () => {
        test('calls GET /social-sets/{id}/tags', async () => {
            mockRequestUrl.mockResolvedValueOnce({
                status: 200,
                json: [
                    { id: 1, name: 'marketing', color: '#ff0000' },
                    { id: 2, name: 'tech', color: '#00ff00' }
                ]
            })

            const tags = await client.listTags('123')

            expect(tags).toHaveLength(2)
            expect(tags[0]?.name).toBe('marketing')
        })
    })

    describe('createTag', () => {
        test('calls POST /social-sets/{id}/tags', async () => {
            mockRequestUrl.mockResolvedValueOnce({
                status: 201,
                json: { id: 3, name: 'new-tag', color: '#0000ff' }
            })

            const tag = await client.createTag('123', { name: 'new-tag', color: '#0000ff' })

            expect(tag.name).toBe('new-tag')
        })
    })

    describe('getQueue', () => {
        test('calls GET /social-sets/{id}/queue with date range', async () => {
            mockRequestUrl.mockResolvedValueOnce({
                status: 200,
                json: {
                    social_set_id: 123,
                    start_date: '2026-02-23',
                    end_date: '2026-03-09',
                    days: [{ date: '2026-02-23', items: [] }]
                }
            })

            const days = await client.getQueue('123', '2026-02-23', '2026-03-09')

            expect(days).toHaveLength(1)
            expect(days[0]?.date).toBe('2026-02-23')
            expect(mockRequestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://api.typefully.com/v2/social-sets/123/queue?start_date=2026-02-23&end_date=2026-03-09',
                    method: 'GET'
                })
            )
        })
    })

    describe('getQueueSchedule', () => {
        test('calls GET /social-sets/{id}/queue/schedule', async () => {
            mockRequestUrl.mockResolvedValueOnce({
                status: 200,
                json: { social_set_id: 123, timezone: 'UTC', rules: [] }
            })

            const schedule = await client.getQueueSchedule('123')

            expect(schedule.timezone).toBe('UTC')
        })
    })

    describe('error handling', () => {
        test('throws TypefullyApiError on non-2xx response', async () => {
            mockRequestUrl.mockResolvedValueOnce({
                status: 403,
                json: { detail: 'Forbidden' }
            })

            expect(client.getMe()).rejects.toEqual(
                expect.objectContaining({
                    statusCode: 403,
                    detail: 'Forbidden'
                })
            )
        })

        test('throws with error.message when available', async () => {
            mockRequestUrl.mockResolvedValueOnce({
                status: 400,
                json: { error: { message: 'Bad request body' } }
            })

            expect(client.getMe()).rejects.toEqual(
                expect.objectContaining({
                    statusCode: 400,
                    detail: 'Bad request body'
                })
            )
        })
    })
})
