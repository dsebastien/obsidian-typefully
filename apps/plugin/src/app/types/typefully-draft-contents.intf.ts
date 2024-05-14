/**
 * Reference: https://support.typefully.com/en/articles/8718287-typefully-api
 */
export interface TypefullyDraftContents {
  /**
   * You can split into multiple tweets by adding 4 consecutive newlines between tweets in the content.
   */
  content: string;
  /**
   * Content will be automatically split into multiple tweets
   */
  threadify: boolean;
  /**
   * Can either be an ISO formatted date (e.g.:2022-06-13T11:13:31.662Z) or next-free-slot
   */
  'schedule-date'?: string | 'next-free-slot';
  /**
   * If true, the post will have an AutoRT enabled, according to the one set on Typefully for the account.
   */
  auto_retweet_enabled: boolean;
  /**
   * If true, the post will have an AutoPlug enabled, according to the one set on Typefully for the account.
   */
  auto_plug_enabled: boolean;
}
