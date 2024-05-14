import { Notice, requestUrl } from 'obsidian';
import {
  MSG_API_KEY_CONFIGURATION_REQUIRED,
  NOTICE_TIMEOUT,
  TYPEFULLY_API_DRAFTS,
  TYPEFULLY_API_URL,
} from '../constants';
import { TypefullyDraftContents } from '../types/typefully-draft-contents.intf';
import { log } from './log';

/**
 * Publish the given content
 * @param content
 * @param apiKey
 */
export const publishTypefullyDraft = async (
  content: TypefullyDraftContents,
  apiKey: string
) => {
  if ('' === apiKey) {
    new Notice(MSG_API_KEY_CONFIGURATION_REQUIRED, NOTICE_TIMEOUT);
    return;
  }

  log('Publishing a Typefully draft', 'debug');
  return requestUrl({
    url: `${TYPEFULLY_API_URL}${TYPEFULLY_API_DRAFTS}`,
    method: 'POST',
    headers: {
      'X-API-KEY': `Bearer ${apiKey}`,
    },
    contentType: 'application/json; charset=UTF-8',
    body: JSON.stringify(content),
  });
};
