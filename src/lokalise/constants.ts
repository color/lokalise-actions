export const LOKALISE_ENGLISH_LANGUAGE_CODE = 'en';

export const LOKALISE_LANG_ISO_PLACEHOLDER = '%LANG_ISO%';

/** File formats are different from file extension, e.g. two different json files can have different formats. */
export enum FileFormat {
  PO = 'po',
  JSON = 'json',
  JSON_STRUCTURED = 'json_structured',
}

export const FILE_EXTENSION_BY_FILE_FORMAT: Record<string, string> = {
  [FileFormat.PO]: 'po',
  [FileFormat.JSON]: 'json',
  [FileFormat.JSON_STRUCTURED]: 'json',
};

export const PLACEHOLDER_FORMAT_BY_FILE_FORMAT: Record<string, string> = {
  [FileFormat.PO]: 'printf',
  [FileFormat.JSON]: 'icu',
  [FileFormat.JSON_STRUCTURED]: 'icu',
};
