import * as core from '@actions/core';

import { DownloadFileParams, LokaliseApi } from '@lokalise/node-api';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import got from 'got';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { Entry, Parse } from 'unzipper';

import {
  FILE_EXTENSION_BY_FILE_FORMAT,
  FileFormat,
  LOKALISE_LANG_ISO_PLACEHOLDER,
  PLACEHOLDER_FORMAT_BY_FILE_FORMAT,
} from '~src/lokalise/constants';
import { formatJson, formatPO, formatStructuredJson } from '~src/lokalise/format-utilities';

/**
 * Module for downloading translation files from Lokalise and extracting them.
 * These utilities are used as a part of a GitHub action, as indicated by it's use of @actions/core.
 */

type DownloadAndExtractParams = {
  bundleDestination: string;
  lokaliseApi: LokaliseApi;
  lokaliseFileFormat: FileFormat;
  projectId: string;
  downloadDirectory: string;
  downloadOptions: DownloadFileParams;
};

export async function downloadAndExtract(params: DownloadAndExtractParams): Promise<void> {
  const { bundleDestination, lokaliseApi, lokaliseFileFormat, projectId, downloadDirectory, downloadOptions } = params;
  const downloadResponse = await lokaliseApi.files().download(projectId, downloadOptions);
  const bundleUrl = downloadResponse.bundle_url as string;
  core.info(`Created download bundle, ${bundleUrl}`);

  await downloadBundle(bundleUrl, bundleDestination);
  core.info('Bundle downloaded');
  return extractBundleToDownloadDirectory(bundleDestination, downloadDirectory, lokaliseFileFormat);
}

type ExportParams = {
  downloadOptions: DownloadFileParams;
  downloadDirectory: string;
};

/**
 * A "flat" export from Lokalise has all translations files in the root of the export.
 * It will name each file based on the language code in the Lokalise project.
 *
 * For example:
 *  export.zip
 *  - en.json
 *  - es.json
 */
export function getFlatExportParams(translationDirectory: string, format: FileFormat): ExportParams {
  const flatExportDownloadOptions = {
    ...getBaseDownloadOptions(format),
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
export function getNestedExportParams(translationDirectory: string, format: FileFormat): ExportParams {
  const [downloadDirectory, ISOCodeSubPath] = translationDirectory.split(LOKALISE_LANG_ISO_PLACEHOLDER);
  const directoryPrefix = join(LOKALISE_LANG_ISO_PLACEHOLDER, ISOCodeSubPath);

  const nestedExportDownloadOptions = {
    ...getBaseDownloadOptions(format),
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

function getBaseDownloadOptions(format: FileFormat): DownloadFileParams {
  return {
    format,
    add_newline_eof: true,
    export_empty_as: 'empty',
    replace_breaks: format === FileFormat.PO ? true : false,
    placeholder_format: PLACEHOLDER_FORMAT_BY_FILE_FORMAT[format],
    json_unescaped_slashes: true,
  };
}

async function downloadBundle(bundleUrl: string, bundleDestination: string): Promise<void> {
  await pipeline(got.stream(bundleUrl), createWriteStream(bundleDestination));
}

async function extractBundleToDownloadDirectory(
  bundleDestination: string,
  baseDirectory: string,
  format: FileFormat,
): Promise<void> {
  const zip = createReadStream(bundleDestination).pipe(Parse({ forceStream: true }));
  const fileExtension = FILE_EXTENSION_BY_FILE_FORMAT[format];

  for await (const entry of zip) {
    // async iterators loses typing, so cast as expected type
    const zipEntry = entry as Entry;
    const zipEntryPath = zipEntry.path;
    if (zipEntry.type === 'File' && zipEntryPath.endsWith(fileExtension)) {
      const content = (await (entry as Entry).buffer()).toString('utf-8');
      const fullPath = join(baseDirectory, zipEntryPath);
      await writeFile(fullPath, postProcessContent(content, format));
      core.info(`Imported ${zipEntryPath}`);
    } else {
      core.info(`Entry did not match expected file extension, skipping ${zipEntryPath}`);
      zipEntry.autodrain();
    }
  }

  if (existsSync(bundleDestination)) {
    await unlink(bundleDestination);
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
    case FileFormat.PO:
      return formatPO(content);
    case FileFormat.JSON_STRUCTURED:
      return formatStructuredJson(content);
    case FileFormat.JSON:
      return formatJson(content);
    default:
      core.error(`Unsupported file format, ${format}`);
      return '';
  }
}
