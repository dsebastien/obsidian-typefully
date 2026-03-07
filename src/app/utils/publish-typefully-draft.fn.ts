import {
    MSG_API_KEY_CONFIGURATION_REQUIRED,
    MSG_TYPEFULLY_FAILED_TO_PUBLISH,
    MSG_TYPEFULLY_FAILED_TO_PUBLISH_POSSIBLE_API_KEY_ISSUE
} from '../constants'
import type { TypefullyDraftContents } from '../types/typefully-draft-contents.intf'
import type { TypefullySocialSetsResponse } from '../types/typefully-draft-contents.intf'
import { TypefullyApiClient, TypefullyApiRequestError } from '../api/typefully-api-client'
import { log } from '../../utils/log'
import { hasStatus } from './has-status.fn'

/**
 * Fetch social sets (accounts) from Typefully API v2
 * @param apiKey
 */
export const fetchSocialSets = async (
    apiKey: string
): Promise<TypefullySocialSetsResponse | null> => {
    try {
        const client = new TypefullyApiClient(apiKey)
        return await client.listSocialSets()
    } catch (error) {
        log('Failed to fetch social sets', 'error', error)
    }
    return null
}

/**
 * Publish the given content using Typefully API v2
 * @param content
 * @param apiKey
 * @param socialSetId
 */
export const publishTypefullyDraft = async (
    content: TypefullyDraftContents,
    apiKey: string,
    socialSetId: string
): Promise<TypeFullyPublishDraftResult> => {
    if ('' === apiKey) {
        return {
            successful: false,
            details: null,
            errorDetails: {
                statusCode: 400,
                detail: MSG_API_KEY_CONFIGURATION_REQUIRED,
                rawError: null
            }
        }
    }

    const client = new TypefullyApiClient(apiKey)

    // If no socialSetId provided, fetch and use first available
    let effectiveSocialSetId = socialSetId
    if (!effectiveSocialSetId) {
        log('No social set ID configured, fetching available social sets', 'debug')
        try {
            const socialSets = await client.listSocialSets()
            if (socialSets && socialSets.results.length > 0) {
                effectiveSocialSetId = socialSets.results[0]!.id.toString()
                log(
                    `Using social set: ${socialSets.results[0]!.username} (${effectiveSocialSetId})`,
                    'debug'
                )
            } else {
                return {
                    successful: false,
                    details: null,
                    errorDetails: {
                        statusCode: 400,
                        detail: 'No social sets found. Please check your Typefully account.',
                        rawError: null
                    }
                }
            }
        } catch {
            return {
                successful: false,
                details: null,
                errorDetails: {
                    statusCode: 400,
                    detail: 'No social sets found. Please check your Typefully account.',
                    rawError: null
                }
            }
        }
    }

    log('Publishing a Typefully draft (API v2)', 'debug')
    try {
        const draft = await client.createDraft(effectiveSocialSetId, content)
        return {
            successful: true,
            details: {
                id: draft.id,
                postStatus: draft.status as 'draft' | 'scheduled' | 'published',
                numberOfTweets: draft.platforms?.x?.posts?.length || 1,
                scheduledDate: draft.publish_at,
                privateUrl: draft.private_url
            },
            errorDetails: null
        }
    } catch (error: unknown) {
        if (hasStatus(error) && error.status === 403) {
            return {
                successful: false,
                details: null,
                errorDetails: {
                    statusCode: 403,
                    detail: MSG_TYPEFULLY_FAILED_TO_PUBLISH_POSSIBLE_API_KEY_ISSUE,
                    rawError: error
                }
            }
        }

        if (error instanceof TypefullyApiRequestError && error.statusCode === 500) {
            return {
                successful: false,
                details: null,
                errorDetails: {
                    statusCode: 500,
                    detail: "Typefully's API seems unavailable. Please try again later",
                    rawError: null
                }
            }
        }

        if (error instanceof TypefullyApiRequestError) {
            return {
                successful: false,
                details: null,
                errorDetails: {
                    statusCode: error.statusCode,
                    detail: error.detail,
                    rawError: error.rawError
                }
            }
        }

        return {
            successful: false,
            details: null,
            errorDetails: {
                statusCode: 0,
                detail: MSG_TYPEFULLY_FAILED_TO_PUBLISH,
                rawError: error
            }
        }
    }
}

/**
 * Response of publishing a Typefully draft
 */
export interface TypeFullyPublishDraftResult {
    successful: boolean
    details: TypeFullyPublishDraftResultDetails | null
    errorDetails: TypefullyPublishDraftErrorDetails | null
}

export interface TypeFullyPublishDraftResultDetails {
    postStatus: 'draft' | 'scheduled' | 'published'
    id: number
    numberOfTweets: number
    scheduledDate: string | null
    privateUrl?: string
}

export interface TypefullyPublishDraftErrorDetails {
    statusCode: number
    detail: string
    rawError: unknown
}
