import { removeFrontMatter } from './remove-front-matter.fn';
import { removeMarkdownLinks } from './remove-markdown-links.fn';

/**
 * Cleanup the given Markdown for Typefully
 * @param text
 */
export const cleanMarkdownForTypeFully = (text: string): string => {
  let retVal = text;

  retVal = removeFrontMatter(retVal);
  retVal = retVal.trim();
  // Remove obsidian links
  retVal = retVal.replace('[[', ''); // Link open
  retVal = retVal.replace(']]', ''); // Link close
  retVal = retVal.replace('> ', ''); // Quotes
  retVal = removeMarkdownLinks(retVal);

  return retVal;
};
