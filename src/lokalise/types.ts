import { LokaliseApi } from '@lokalise/node-api';
import { FILE_FORMAT } from './constants';

/**
 * Base wrapper around the Lokalise Node API.
 * https://lokalise.github.io/node-lokalise-api/
 */
export interface LokaliseClient {
  lokaliseApi: LokaliseApi;
  apiKey: string;
  projectId: string;
  format: FILE_FORMAT;
  translationDirectory: string;
  replaceModified: boolean;
  applyTm: boolean;
  cleanupMode: boolean;
}
