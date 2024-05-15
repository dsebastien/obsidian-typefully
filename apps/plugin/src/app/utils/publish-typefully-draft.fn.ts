import { requestUrl } from 'obsidian';
import {
  MSG_API_KEY_CONFIGURATION_REQUIRED,
  MSG_TYPEFULLY_FAILED_TO_PUBLISH,
  MSG_TYPEFULLY_FAILED_TO_PUBLISH_POSSIBLE_API_KEY_ISSUE,
  TYPEFULLY_API_DRAFTS,
  TYPEFULLY_API_URL,
} from '../constants';
import { TypefullyDraftContents } from '../types/typefully-draft-contents.intf';
import { log } from './log';
import { hasName } from './has-name.fn';
import { hasStatus } from './has-status.fn';

/**
 * Publish the given content
 * @param content
 * @param apiKey
 */
export const publishTypefullyDraft = async (
  content: TypefullyDraftContents,
  apiKey: string
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

  log('Publishing a Typefully draft', 'debug');
  try {
    const response = await requestUrl({
      url: `${TYPEFULLY_API_URL}${TYPEFULLY_API_DRAFTS}`,
      method: 'POST',
      headers: {
        'X-API-KEY': `Bearer ${apiKey}`,
      },
      contentType: 'application/json; charset=UTF-8',
      body: JSON.stringify(content),
    });

    log('Typefully response', 'debug', response);

    if (200 === response.status) {
      return {
        successful: true,
        details: {
          id: response.json.id,
          postStatus: response.json.status,
          numberOfTweets: response.json.num_tweets,
          scheduledDate: response.json.scheduled_date,
        },
        errorDetails: null,
      };
    } else if (500 === response.status) {
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
          detail: response.json.detail
            ? response.json.detail
            : MSG_TYPEFULLY_FAILED_TO_PUBLISH,
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
          statusCode: 0,
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
  postStatus: 'draft' | 'scheduled';
  id: number;
  numberOfTweets: number;
  scheduledDate: Date | null;
}

interface TypefullyPublishDraftErrorDetails {
  statusCode: number;
  detail: string;
  rawError: unknown | null;
}
