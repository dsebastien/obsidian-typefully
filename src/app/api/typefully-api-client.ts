import { requestUrl } from 'obsidian'
import {
    TYPEFULLY_API_URL,
    TYPEFULLY_API_SOCIAL_SETS,
    TYPEFULLY_API_DRAFTS,
    TYPEFULLY_API_MEDIA_UPLOAD,
    TYPEFULLY_API_MEDIA,
    TYPEFULLY_API_TAGS,
    TYPEFULLY_API_QUEUE,
    TYPEFULLY_API_QUEUE_SCHEDULE,
    TYPEFULLY_API_ME,
    TYPEFULLY_API_ANALYTICS,
    MEDIA_POLL_INITIAL_DELAY_MS,
    MEDIA_POLL_MAX_TIMEOUT_MS
} from '../constants'
import type { TypefullySocialSetsResponse } from '../types/typefully-draft-contents.intf'
import type { TypefullyDraftContents } from '../types/typefully-draft-contents.intf'
import type {
    TypefullyUser,
    TypefullyPaginatedResponse,
    TypefullyDraft,
    TypefullyDraftListParams,
    TypefullyDraftUpdatePayload,
    TypefullyMediaUploadRequest,
    TypefullyMediaUploadResponse,
    TypefullyMediaStatus,
    TypefullyTag,
    TypefullyTagCreatePayload,
    TypefullyQueueSchedule,
    TypefullyQueueResponse,
    TypefullyQueueDay,
    TypefullyAnalyticsPost,
    TypefullyAnalyticsParams
} from '../types/typefully-api.intf'
import { log } from '../../utils/log'

export class TypefullyApiRequestError extends Error {
    statusCode: number
    detail: string
    rawError: unknown

    constructor(detail: string, statusCode: number, rawError: unknown) {
        super(detail)
        this.name = 'TypefullyApiRequestError'
        this.statusCode = statusCode
        this.detail = detail
        this.rawError = rawError
    }
}

export class TypefullyApiClient {
    private readonly apiKey: string
    private readonly baseUrl: string

    constructor(apiKey: string, baseUrl: string = TYPEFULLY_API_URL) {
        this.apiKey = apiKey
        this.baseUrl = baseUrl
    }

    // ─── User ────────────────────────────────────────────────────────────────

    async getMe(): Promise<TypefullyUser> {
        return this.request<TypefullyUser>('GET', TYPEFULLY_API_ME)
    }

    // ─── Social Sets ─────────────────────────────────────────────────────────

    async listSocialSets(): Promise<TypefullySocialSetsResponse> {
        return this.request<TypefullySocialSetsResponse>('GET', TYPEFULLY_API_SOCIAL_SETS)
    }

    // ─── Drafts ──────────────────────────────────────────────────────────────

    async listDrafts(
        socialSetId: string,
        params?: TypefullyDraftListParams
    ): Promise<TypefullyPaginatedResponse<TypefullyDraft>> {
        const queryParts: string[] = []
        if (params?.status) queryParts.push(`status=${encodeURIComponent(params.status)}`)
        if (params?.tag) {
            for (const t of params.tag) {
                queryParts.push(`tag=${encodeURIComponent(t)}`)
            }
        }
        if (params?.order_by) queryParts.push(`order_by=${encodeURIComponent(params.order_by)}`)
        if (params?.limit) queryParts.push(`limit=${params.limit}`)
        if (params?.offset) queryParts.push(`offset=${params.offset}`)

        const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : ''
        const path = `${TYPEFULLY_API_SOCIAL_SETS}/${socialSetId}${TYPEFULLY_API_DRAFTS}${query}`

        return this.request<TypefullyPaginatedResponse<TypefullyDraft>>('GET', path)
    }

    async createDraft(
        socialSetId: string,
        content: TypefullyDraftContents
    ): Promise<TypefullyDraft> {
        const path = `${TYPEFULLY_API_SOCIAL_SETS}/${socialSetId}${TYPEFULLY_API_DRAFTS}`
        return this.request<TypefullyDraft>('POST', path, content)
    }

    async getDraft(socialSetId: string, draftId: number): Promise<TypefullyDraft> {
        const path = `${TYPEFULLY_API_SOCIAL_SETS}/${socialSetId}${TYPEFULLY_API_DRAFTS}/${draftId}`
        return this.request<TypefullyDraft>('GET', path)
    }

    async updateDraft(
        socialSetId: string,
        draftId: number,
        payload: TypefullyDraftUpdatePayload
    ): Promise<TypefullyDraft> {
        const path = `${TYPEFULLY_API_SOCIAL_SETS}/${socialSetId}${TYPEFULLY_API_DRAFTS}/${draftId}`
        return this.request<TypefullyDraft>('PATCH', path, payload)
    }

    async deleteDraft(socialSetId: string, draftId: number): Promise<void> {
        const path = `${TYPEFULLY_API_SOCIAL_SETS}/${socialSetId}${TYPEFULLY_API_DRAFTS}/${draftId}`
        await this.request<void>('DELETE', path)
    }

    // ─── Media ───────────────────────────────────────────────────────────────

    async requestMediaUpload(
        socialSetId: string,
        payload: TypefullyMediaUploadRequest
    ): Promise<TypefullyMediaUploadResponse> {
        const path = `${TYPEFULLY_API_SOCIAL_SETS}/${socialSetId}${TYPEFULLY_API_MEDIA_UPLOAD}`
        return this.request<TypefullyMediaUploadResponse>('POST', path, payload)
    }

    async uploadMediaFile(
        uploadUrl: string,
        data: ArrayBuffer,
        contentType: string
    ): Promise<void> {
        // Presigned S3 URLs may reject extra headers added by Obsidian's requestUrl,
        // so we try requestUrl first and fall back to native fetch.
        // Presigned S3 URLs may reject extra headers added by Obsidian's requestUrl.
        // We use requestUrl which is the Obsidian-approved network API.
        await requestUrl({
            url: uploadUrl,
            method: 'PUT',
            headers: { 'Content-Type': contentType },
            body: data
        })
    }

    async getMediaStatus(socialSetId: string, mediaId: string): Promise<TypefullyMediaStatus> {
        const path = `${TYPEFULLY_API_SOCIAL_SETS}/${socialSetId}${TYPEFULLY_API_MEDIA}/${mediaId}`
        return this.request<TypefullyMediaStatus>('GET', path)
    }

    /**
     * Upload a file and poll until it's ready.
     * Returns the media_id on success, or throws on timeout/error.
     */
    async uploadAndWaitForMedia(
        socialSetId: string,
        filename: string,
        data: ArrayBuffer,
        contentType: string
    ): Promise<string> {
        const { media_id, upload_url } = await this.requestMediaUpload(socialSetId, { filename })
        await this.uploadMediaFile(upload_url, data, contentType)

        let delay = MEDIA_POLL_INITIAL_DELAY_MS
        const deadline = Date.now() + MEDIA_POLL_MAX_TIMEOUT_MS

        while (Date.now() < deadline) {
            await this.sleep(delay)
            const status = await this.getMediaStatus(socialSetId, media_id)
            if (status.status === 'ready') return media_id
            if (status.status === 'error') {
                throw new Error(`Media processing failed: ${status.error ?? 'unknown error'}`)
            }
            delay = Math.min(delay * 2, 5000)
        }

        throw new Error('Media upload timed out waiting for processing')
    }

    // ─── Tags ────────────────────────────────────────────────────────────────

    async listTags(socialSetId: string): Promise<TypefullyTag[]> {
        const path = `${TYPEFULLY_API_SOCIAL_SETS}/${socialSetId}${TYPEFULLY_API_TAGS}`
        return this.request<TypefullyTag[]>('GET', path)
    }

    async createTag(
        socialSetId: string,
        payload: TypefullyTagCreatePayload
    ): Promise<TypefullyTag> {
        const path = `${TYPEFULLY_API_SOCIAL_SETS}/${socialSetId}${TYPEFULLY_API_TAGS}`
        return this.request<TypefullyTag>('POST', path, payload)
    }

    // ─── Queue ───────────────────────────────────────────────────────────────

    async getQueue(
        socialSetId: string,
        startDate: string,
        endDate: string
    ): Promise<TypefullyQueueDay[]> {
        const query = `?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
        const path = `${TYPEFULLY_API_SOCIAL_SETS}/${socialSetId}${TYPEFULLY_API_QUEUE}${query}`
        const response = await this.request<TypefullyQueueResponse>('GET', path)
        return response.days
    }

    async getQueueSchedule(socialSetId: string): Promise<TypefullyQueueSchedule> {
        const path = `${TYPEFULLY_API_SOCIAL_SETS}/${socialSetId}${TYPEFULLY_API_QUEUE_SCHEDULE}`
        return this.request<TypefullyQueueSchedule>('GET', path)
    }

    async updateQueueSchedule(
        socialSetId: string,
        schedule: Pick<TypefullyQueueSchedule, 'rules'>
    ): Promise<TypefullyQueueSchedule> {
        const path = `${TYPEFULLY_API_SOCIAL_SETS}/${socialSetId}${TYPEFULLY_API_QUEUE_SCHEDULE}`
        return this.request<TypefullyQueueSchedule>('PUT', path, schedule)
    }

    // ─── Analytics ──────────────────────────────────────────────────────────

    async listAnalyticsPosts(
        socialSetId: string,
        platform: string,
        params: TypefullyAnalyticsParams
    ): Promise<TypefullyPaginatedResponse<TypefullyAnalyticsPost>> {
        const queryParts: string[] = [
            `start_date=${encodeURIComponent(params.start_date)}`,
            `end_date=${encodeURIComponent(params.end_date)}`
        ]
        if (params.include_replies) queryParts.push('include_replies=true')
        if (params.limit) queryParts.push(`limit=${params.limit}`)
        if (params.offset) queryParts.push(`offset=${params.offset}`)

        const query = `?${queryParts.join('&')}`
        const path = `${TYPEFULLY_API_SOCIAL_SETS}/${socialSetId}${TYPEFULLY_API_ANALYTICS}/${platform}/posts${query}`

        return this.request<TypefullyPaginatedResponse<TypefullyAnalyticsPost>>('GET', path)
    }

    // ─── Internal ────────────────────────────────────────────────────────────

    private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
        const url = `${this.baseUrl}${path}`
        log(`${method} ${url}`, 'debug')

        const options: {
            url: string
            method: string
            headers: Record<string, string>
            contentType?: string
            body?: string
            throw?: boolean
        } = {
            url,
            method,
            headers: {
                Authorization: `Bearer ${this.apiKey}`
            },
            throw: false
        }

        if (body !== undefined) {
            options.contentType = 'application/json; charset=UTF-8'
            options.body = JSON.stringify(body)
        }

        const response = await requestUrl(options)

        if (response.status >= 200 && response.status < 300) {
            // DELETE (204 No Content) has no body to parse
            if (response.status === 204) {
                return undefined as T
            }
            return response.json as T
        }

        let detail: string
        try {
            detail =
                response.json?.error?.message ??
                response.json?.detail ??
                `Request failed with status ${response.status}`
        } catch {
            detail = `Request failed with status ${response.status}`
        }
        throw new TypefullyApiRequestError(detail, response.status, response.json)
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }
}
