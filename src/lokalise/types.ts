import { PaginatedResult } from '@lokalise/node-api';

/**
 * Based on the locale codes used in the file paths.
 */
export enum COLOR_LANGUAGE_ISO_CODE {
  ARABIC = 'ar',
  ENGLISH = 'en',
  SPANISH = 'es',
  FILIPINO = 'fil',
  HAITIAN_CREOLE = 'ht',
  KHMER = 'km',
  KOREAN = 'ko',
  PORTUGUESE = 'pt',
  RUSSIAN = 'ru',
  SAMOAN = 'sm',
  VIETNAMESE = 'vi',
  CHINESE_SIMPLIFIED = 'zh-Hans',
  CHINESE_TRADITIONAL = 'zh-Hant',
}

/**
 * Language ISO codes will vary across TMS.
 * ISO codes used in the Color codebase do not include country code,
 * while some of Lokalise's do include country code.
 *
 * Assumes that the languages have been configured in the Lokalise project.
 */
export const COLOR_LANGUAGE_ISO_CODE_MAPPER = {
  [COLOR_LANGUAGE_ISO_CODE.ARABIC]: 'ar',
  [COLOR_LANGUAGE_ISO_CODE.ENGLISH]: 'en',
  [COLOR_LANGUAGE_ISO_CODE.SPANISH]: 'es',
  [COLOR_LANGUAGE_ISO_CODE.FILIPINO]: 'fil',
  [COLOR_LANGUAGE_ISO_CODE.HAITIAN_CREOLE]: 'ht_HT',
  [COLOR_LANGUAGE_ISO_CODE.KHMER]: 'km_KH',
  [COLOR_LANGUAGE_ISO_CODE.KOREAN]: 'ko',
  [COLOR_LANGUAGE_ISO_CODE.PORTUGUESE]: 'pt',
  [COLOR_LANGUAGE_ISO_CODE.RUSSIAN]: 'ru',
  [COLOR_LANGUAGE_ISO_CODE.SAMOAN]: 'sm',
  [COLOR_LANGUAGE_ISO_CODE.VIETNAMESE]: 'vi',
  [COLOR_LANGUAGE_ISO_CODE.CHINESE_SIMPLIFIED]: 'zh_CN',
  [COLOR_LANGUAGE_ISO_CODE.CHINESE_TRADITIONAL]: 'zh_TW',
};

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
