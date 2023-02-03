import { LokaliseApi } from '@lokalise/node-api';
import { FileFormat } from './constants';

/**
 * Base wrapper around the Lokalise Node API.
 * https://lokalise.github.io/node-lokalise-api/
 */
export interface LokaliseClient {
  lokaliseApi: LokaliseApi;
  apiKey: string;
  projectId: string;
  format: FileFormat;
  translationDirectory: string;
  replaceModified: boolean;
  applyTm: boolean;
  cleanupMode: boolean;
}
