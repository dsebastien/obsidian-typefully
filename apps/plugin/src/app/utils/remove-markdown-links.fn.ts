import { MARKDOWN_LINK_REGEX } from '../constants';

export const removeMarkdownLinks = (text: string) => {
  return text.replace(MARKDOWN_LINK_REGEX, '$1');
};
