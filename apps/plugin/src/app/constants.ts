/**
 * How many milliseconds to wait before hiding notices
 */
export const NOTICE_TIMEOUT = 5000;

/**
 * Typefully API URL (v2)
 * Reference: https://typefully.com/docs/api
 */
export const TYPEFULLY_API_URL = 'https://api.typefully.com/v2';

export const TYPEFULLY_API_SOCIAL_SETS = '/social-sets';
export const TYPEFULLY_API_DRAFTS = '/drafts';

export const MSG_API_KEY_CONFIGURATION_REQUIRED =
  'Please configure the Typefully plugin to provide a valid API key';

export const MSG_TYPEFULLY_FAILED_TO_PUBLISH = 'Failed to publish to Typefully';
export const MSG_TYPEFULLY_FAILED_TO_PUBLISH_POSSIBLE_API_KEY_ISSUE =
  'Failed to publish to Typefully. Is your API key valid?';

export const MARKDOWN_FILE_EXTENSION = 'md';
export const DEFAULT_CANVAS_FILE_NAME = 'Canvas.md';

export const FRONT_MATTER_REGEX = /---[\S\s]*?---\n/;

export const MARKDOWN_LINK_REGEX = /\[(.*?)\]\(.*?\)/g;
