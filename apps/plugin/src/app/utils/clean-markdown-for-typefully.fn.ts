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
  retVal = retVal.replaceAll('[[', ''); // Link open
  retVal = retVal.replaceAll(']]', ''); // Link close
  // Remove Markdown quotes
  retVal = retVal.replaceAll('> ', ''); // Quotes
  retVal = removeMarkdownLinks(retVal);

  return retVal;
};
