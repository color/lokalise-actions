import * as core from '@actions/core';
import { LokaliseApi } from '@lokalise/node-api';

import { FileFormat, LOKALISE_LANG_ISO_PLACEHOLDER } from '~src/lokalise/constants';
import { downloadAndExtract, getNestedExportParams, getFlatExportParams } from '~src/lokalise/download-files';
import { LokaliseClient } from '~src/lokalise/types';

export class LokalisePullClient implements LokaliseClient {
  lokaliseApi: LokaliseApi;
  apiKey: string;
  projectId: string;
  format: FileFormat;
  translationDirectory: string;
  replaceModified: boolean;
  applyTm: boolean;
  cleanupMode: boolean;

  constructor(args: Record<string, string | boolean>) {
    Object.assign(this, args);
    this.lokaliseApi = new LokaliseApi({ apiKey: args.apiKey as string });
  }

  /**
   * Downloads a zip file of all translations for all languages for the given project.
   * The bundle is extracted and its files are post processed based on the file format.
   */
  async pull(): Promise<void> {
    const fileFormat = this.format;
    // the presence of the placeholder indicates a nested export, otherwise flat export
    const { downloadDirectory, downloadOptions } = this.translationDirectory.includes(LOKALISE_LANG_ISO_PLACEHOLDER)
      ? getNestedExportParams(this.translationDirectory, fileFormat)
      : getFlatExportParams(this.translationDirectory, fileFormat);

    try {
      await downloadAndExtract({
        bundleDestination: './translations.zip',
        lokaliseApi: this.lokaliseApi,
        lokaliseFileFormat: fileFormat,
        projectId: this.projectId,
        downloadDirectory,
        downloadOptions,
      });
    } catch (error) {
      core.setFailed((error as Error).message);
    }
  }
}

