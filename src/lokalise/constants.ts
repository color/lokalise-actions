export const LOKALISE_ENGLISH_LANGUAGE_CODE = 'en';

export const LOKALISE_LANG_ISO_PLACEHOLDER = '%LANG_ISO%';

export enum FILE_FORMAT {
  PO = 'po',
  JSON = 'json',
  JSON_STRUCTURED = 'json_structured',
}

export const FILE_EXTENSION_BY_FILE_FORMAT: Record<string, string> = {
  [FILE_FORMAT.PO]: 'po',
  [FILE_FORMAT.JSON]: 'json',
  [FILE_FORMAT.JSON_STRUCTURED]: 'json',
};

export const PLACEHOLDER_FORMAT_BY_FILE_FORMAT: Record<string, string> = {
  [FILE_FORMAT.PO]: 'printf',
  [FILE_FORMAT.JSON]: 'icu',
  [FILE_FORMAT.JSON_STRUCTURED]: 'icu',
};
