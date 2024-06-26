export interface PluginSettings {
  apiKey: string;
  autoRetweet: boolean;
  autoPlug: boolean;
  threadify: boolean;
  autoSchedule: boolean;
  appendTags: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  apiKey: '',
  autoRetweet: false,
  autoPlug: false,
  threadify: false,
  autoSchedule: false,
  appendTags: false,
};
