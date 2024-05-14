import { App, getAllTags, TFile } from 'obsidian';

/**
 * Return all the tags of the given file, or an empty array if there's none
 * @param file
 */
export const getFileTags = (file: TFile | null, app: App): string[] => {
  const retVal: Set<string> = new Set<string>();

  if (!file) {
    return Array.from(retVal);
  }

  const fileCache = app.metadataCache.getFileCache(file);
  if (!fileCache) {
    return Array.from(retVal);
  }

  const tags = getAllTags(fileCache);

  if (!tags) {
    return Array.from(retVal);
  }

  for (const tag of tags) {
    retVal.add(tag);
  }

  return Array.from(retVal);
};
