import { requestUrl } from 'obsidian';
import {
  MSG_API_KEY_CONFIGURATION_REQUIRED,
  MSG_TYPEFULLY_FAILED_TO_PUBLISH,
  MSG_TYPEFULLY_FAILED_TO_PUBLISH_POSSIBLE_API_KEY_ISSUE,
  TYPEFULLY_API_DRAFTS,
  TYPEFULLY_API_SOCIAL_SETS,
  TYPEFULLY_API_URL,
} from '../constants';
import { TypefullyDraftContents, TypefullySocialSetsResponse } from '../types/typefully-draft-contents.intf';
import { log } from './log';
import { hasName } from './has-name.fn';
import { hasStatus } from './has-status.fn';

/**
 * Fetch social sets (accounts) from Typefully API v2
 * @param apiKey
 */
export const fetchSocialSets = async (
  apiKey: string
): Promise<TypefullySocialSetsResponse | null> => {
  try {
    const response = await requestUrl({
      url: `${TYPEFULLY_API_URL}${TYPEFULLY_API_SOCIAL_SETS}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.status === 200) {
      return response.json as TypefullySocialSetsResponse;
    }
  } catch (error) {
    log('Failed to fetch social sets', 'error', error);
  }
  return null;
};

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
        rawError: null,
      },
    };
  }

  // If no socialSetId provided, fetch and use first available
  let effectiveSocialSetId = socialSetId;
  if (!effectiveSocialSetId) {
    log('No social set ID configured, fetching available social sets', 'debug');
    const socialSets = await fetchSocialSets(apiKey);
    if (socialSets && socialSets.results.length > 0) {
      effectiveSocialSetId = socialSets.results[0].id.toString();
      log(`Using social set: ${socialSets.results[0].username} (${effectiveSocialSetId})`, 'debug');
    } else {
      return {
        successful: false,
        details: null,
        errorDetails: {
          statusCode: 400,
          detail: 'No social sets found. Please check your Typefully account.',
          rawError: null,
        },
      };
    }
  }

  log('Publishing a Typefully draft (API v2)', 'debug');
  try {
    const url = `${TYPEFULLY_API_URL}${TYPEFULLY_API_SOCIAL_SETS}/${effectiveSocialSetId}${TYPEFULLY_API_DRAFTS}`;
    log(`POST ${url}`, 'debug');
    
    const response = await requestUrl({
      url,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      contentType: 'application/json; charset=UTF-8',
      body: JSON.stringify(content),
    });

    log('Typefully response', 'debug', response);

    if (response.status === 200 || response.status === 201) {
      return {
        successful: true,
        details: {
          id: response.json.id,
          postStatus: response.json.status,
          numberOfTweets: response.json.platforms?.x?.posts?.length || 1,
          scheduledDate: response.json.scheduled_date,
          privateUrl: response.json.private_url,
        },
        errorDetails: null,
      };
    } else if (response.status === 500) {
      return {
        successful: false,
        details: null,
        errorDetails: {
          statusCode: 500,
          detail: "Typefully's API seems unavailable. Please try again later",
          rawError: null,
        },
      };
    } else {
      return {
        successful: false,
        details: null,
        errorDetails: {
          statusCode: response.status,
          detail: response.json?.error?.message || response.json?.detail || MSG_TYPEFULLY_FAILED_TO_PUBLISH,
          rawError: null,
        },
      };
    }
  } catch (error: unknown) {
    if (hasStatus(error) && error.status === 403) {
      return {
        successful: false,
        details: null,
        errorDetails: {
          statusCode: 403,
          detail: MSG_TYPEFULLY_FAILED_TO_PUBLISH_POSSIBLE_API_KEY_ISSUE,
          rawError: error,
        },
      };
    }

    if (hasName(error)) {
      return {
        successful: false,
        details: null,
        errorDetails: {
          statusCode: 0,
          detail: MSG_TYPEFULLY_FAILED_TO_PUBLISH,
          rawError: error,
        },
      };
    }
  }

  return {
    successful: false,
    details: null,
    errorDetails: {
      statusCode: 0,
      detail: MSG_TYPEFULLY_FAILED_TO_PUBLISH,
      rawError: null,
    },
  };
};

/**
 * Response of publishing a Typefully draft
 */
interface TypeFullyPublishDraftResult {
  successful: boolean;
  details: TypeFullyPublishDraftResultDetails | null;
  errorDetails: TypefullyPublishDraftErrorDetails | null;
}

interface TypeFullyPublishDraftResultDetails {
  postStatus: 'draft' | 'scheduled' | 'published';
  id: number;
  numberOfTweets: number;
  scheduledDate: string | null;
  privateUrl?: string;
}

interface TypefullyPublishDraftErrorDetails {
  statusCode: number;
  detail: string;
  rawError: unknown | null;
}
