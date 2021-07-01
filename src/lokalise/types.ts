import { PaginatedResult } from '@lokalise/node-api';

export enum LOKALISE_DEVICE_PLATFORM {
  WEB = 'web',
  IOS = 'ios',
  ANDRIOD = 'android',
  OTHER = 'other',
}

export type LokaliseTranslation = {
  translation_id: string;
  key_id: string;
  language_iso: string;
  translation: string;
  modified_by: number;
  modified_by_email: string;
  modified_at: string;
  modified_at_timestamp: number;
  is_reviewed: boolean;
  reviewed_by: number;
  words: number;
  custom_translation_statuses: string[];
  task_id: number;
};

export type LokaliseKey = {
  key_id: string;
  key_name: {
    [key in LOKALISE_DEVICE_PLATFORM]?: string;
  };
  filenames: {
    [key in LOKALISE_DEVICE_PLATFORM]?: string;
  };
  platforms: LOKALISE_DEVICE_PLATFORM[];
  tags: string[];
  // comments
  // screenshots
  translations: LokaliseTranslation[];
  is_archived: boolean;
};

// annoying that the Lokalise API doesn't use a parametrized type for PaginatedResult
export interface LokaliseListKeysPayload extends PaginatedResult {
  items: LokaliseKey[];
}

/**
 * Major difference from their GET payloads is that key_name is a string and not an object.
 * key_name corresponds to message ID / translation ID from local files.
 * While key_id is the Lokalise database record ID for that key.
 */
export type LokalisePostPayload = {
  key_id: string;
  key_name: string;
  description: string;
  translations: {
    language_iso: string;
    translation: string;
  }[];
  platforms: LOKALISE_DEVICE_PLATFORM[];
  filenames: {
    [key in LOKALISE_DEVICE_PLATFORM]: string;
  };
  is_archived: boolean;
};

/**
 * Given a type like LokaliseKey that has complex attribute types like LokaliseTranslation
 * allow defining LokaliseKey with all (nested) attributes as optional.
 */
export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};
