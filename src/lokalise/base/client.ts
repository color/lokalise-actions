import { FILE_FORMAT } from '@src/lokalise/constants';
import { LokaliseApi } from '@lokalise/node-api';

/**
 * Base wrapper around the Lokalise Node API.
 * https://lokalise.github.io/node-lokalise-api/
 */
export class LokaliseClient {
  lokaliseApi: LokaliseApi;
  apiKey: string;
  projectId: string;
  format: FILE_FORMAT;
  translationDirectory: string;
  replaceModified: boolean;
  applyTm: boolean;
  cleanupMode: boolean;

  constructor(args: Record<string, string | boolean>) {
    Object.assign(this, args);
    this.lokaliseApi = new LokaliseApi({ apiKey: args.apiKey });
  }
}
