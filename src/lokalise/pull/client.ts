import * as core from '@actions/core';
import { DownloadFileParams, LokaliseApi } from '@lokalise/node-api';
import { createReadStream, createWriteStream } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import got from 'got';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { Parse } from 'unzipper';

import {
  FILE_EXTENSION_BY_FILE_FORMAT,
  FILE_FORMAT,
  LOKALISE_LANG_ISO_PLACEHOLDER,
  PLACEHOLDER_FORMAT_BY_FILE_FORMAT,
} from '~src/lokalise/constants';
import { formatJson, formatPO, formatStructuredJson } from '~src/lokalise/format-utilities';
import { LokaliseClient } from '~src/lokalise/types';

const BUNDLE_DESTINATION = './translations.zip';

type ExportParams = {
  downloadOptions: DownloadFileParams;
  downloadDirectory: string;
};

export class LokalisePullClient implements LokaliseClient {
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
    this.lokaliseApi = new LokaliseApi({ apiKey: args.apiKey as string });
  }

  /**
   * Downloads a zip file of all translations for all languages for the given project.
   * The bundle is extracted and its files are post processed based on the file format.
   */
  async pull(): Promise<void> {
    const fileFormat = this.format;
    // the presence of the placeholder indicates a nested export, otherwise flat export
    const { downloadOptions, downloadDirectory } = this.translationDirectory.includes(LOKALISE_LANG_ISO_PLACEHOLDER)
      ? this.getNestedExportParams(this.translationDirectory, fileFormat)
      : this.getFlatExportParams(this.translationDirectory, fileFormat);

    try {
      const { bundle_url } = await this.lokaliseApi.files().download(this.projectId, downloadOptions);
      core.info(`Created download bundle, ${bundle_url}`);

      await this.downloadBundle(bundle_url);
      core.info('Bundle downloaded');
      await this.extractBundleToDownloadDirectory(downloadDirectory, fileFormat);
    } catch (error) {
      core.setFailed((error as Error).message);
    }
  }

  /**
   * A "flat" export from Lokalise has all translations files in the root of the export.
   * It will name each file based on the language code in the Lokalise project.
   *
   * For example:
   *  export.zip
   *  - en.json
   *  - es.json
   */
  private getFlatExportParams(translationDirectory: string, format: FILE_FORMAT): ExportParams {
    const flatExportDownloadOptions = {
      ...this.getBaseDownloadOptions(format),
      original_filenames: false,
      bundle_structure: '%LANG_ISO%.json',
    };

    return {
      downloadOptions: flatExportDownloadOptions,
      downloadDirectory: translationDirectory,
    };
  }

  /**
   * A "nested" export from Lokalise has all translations nested in folders named by language code.
   * The nested structure is used when the translations are further organized by different filenames.
   *
   * For example:
   *  export.zip
   *    en/
   *      common.json
   *      lib.json
   *    es/
   *      common.json
   *      lib.json
   */
  private getNestedExportParams(translationDirectory: string, format: FILE_FORMAT): ExportParams {
    const [downloadDirectory, ISOCodeSubPath] = translationDirectory.split(LOKALISE_LANG_ISO_PLACEHOLDER);
    const directoryPrefix = join(LOKALISE_LANG_ISO_PLACEHOLDER, ISOCodeSubPath);

    const nestedExportDownloadOptions = {
      ...this.getBaseDownloadOptions(format),
      original_filenames: true,
      directory_prefix: directoryPrefix,
      include_comments: true,
      include_description: true,
    };

    return {
      downloadOptions: nestedExportDownloadOptions,
      downloadDirectory,
    };
  }

  private getBaseDownloadOptions(format: FILE_FORMAT): DownloadFileParams {
    return {
      format,
      add_newline_eof: true,
      export_empty_as: 'empty',
      replace_breaks: format === FILE_FORMAT.PO ? true : false,
      placeholder_format: PLACEHOLDER_FORMAT_BY_FILE_FORMAT[format],
      json_unescaped_slashes: true,
    };
  }

  private async downloadBundle(bundleUrl: string): Promise<void> {
    await pipeline(got.stream(bundleUrl), createWriteStream(BUNDLE_DESTINATION));
  }

  private async extractBundleToDownloadDirectory(baseDirectory: string, format: FILE_FORMAT): Promise<void> {
    const zip = createReadStream(BUNDLE_DESTINATION).pipe(Parse({ forceStream: true }));
    const fileExtension = FILE_EXTENSION_BY_FILE_FORMAT[format];

    for await (const entry of zip) {
      const { path, type } = entry;
      if (type === 'File' && path.endsWith(fileExtension)) {
        const content = (await entry.buffer()).toString('utf-8');
        const fullPath = join(baseDirectory, path);
        await writeFile(fullPath, postProcessContent(content, this.format));
        core.info(`Imported ${path}`);
      } else {
        core.info(`Entry did not match expected file extension, skipping ${path}`);
        entry.autodrain();
      }
    }

    await unlink(BUNDLE_DESTINATION);
  }
}

/**
 * Lokalise's exported files are not 1:1 with the imports will cause lots of noise in git diffs.
 * - PO file export is limited by what they parse: https://docs.lokalise.com/en/articles/1400767-gettext-po-pot
 * - Structured JSON has spacing and sorting issues.
 *
 * To minimize the resulting diff, post process the downloaded translations files.
 */
function postProcessContent(content: string, format: string): string {
  switch (format) {
    case FILE_FORMAT.PO:
      return formatPO(content);
    case FILE_FORMAT.JSON_STRUCTURED:
      return formatStructuredJson(content);
    case FILE_FORMAT.JSON:
      return formatJson(content);
    default:
      core.error(`Unsupported file format, ${format}`);
      return '';
  }
}
