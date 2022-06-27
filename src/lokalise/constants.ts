export const LOKALISE_LANG_ISO_PLACEHOLDER = '%LANG_ISO%';

export enum FILE_FORMAT {
  PO = 'po',
  JSON = 'json',
  JSON_STRUCTURED = 'json_structured',
}

export const PLACEHOLDER_FORMAT_BY_FILE_FORMAT: Record<string, string> = {
  [FILE_FORMAT.PO]: 'printf',
  [FILE_FORMAT.JSON]: 'icu',
};
