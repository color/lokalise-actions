import * as core from '@actions/core';
import {
  FILE_EXTENSION_BY_FILE_FORMAT,
  FILE_FORMAT,
  LOKALISE_LANG_ISO_PLACEHOLDER,
  PLACEHOLDER_FORMAT_BY_FILE_FORMAT,
} from '@src/lokalise/constants';
import { createReadStream, createWriteStream, promises } from 'fs';
import { formatJson, formatPO, formatStructuredJson } from '@src/lokalise/format-utilities';
import got from 'got';
import { join } from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { LokaliseClient } from '@src/lokalise/base/client';
import { Parse } from 'unzipper';

const BUNDLE_DESTINATION = './translations.zip';

export class LokalisePullClient extends LokaliseClient {
  /**
   * Downloads a zip file of all translations for all languages for the given project.
   * The bundle is extracted and its files are post processed based on the file format.
   */
  async pull(): Promise<void> {
    const [baseDirectory, ISOCodeSubPath] = this.translationDirectory.split(LOKALISE_LANG_ISO_PLACEHOLDER);
    const directoryPrefix = join(LOKALISE_LANG_ISO_PLACEHOLDER, ISOCodeSubPath);

    const replaceBreaks = this.format === FILE_FORMAT.PO ? true : false;
    try {
      const { bundle_url } = await this.lokaliseApi.files.download(this.projectId, {
        format: this.format,
        original_filenames: true,
        directory_prefix: directoryPrefix,
        replace_breaks: replaceBreaks,
        include_comments: true,
        include_description: true,
        placeholder_format: PLACEHOLDER_FORMAT_BY_FILE_FORMAT[this.format],
        json_unescaped_slashes: true,
      });
      core.info('Created download bundle');

      await this.downloadBundle(bundle_url);
      await this.extractBundleToTranslationDirectory(baseDirectory);
    } catch (error) {
      core.setFailed(error.message);
    }
  }

  private async downloadBundle(bundleUrl: string): Promise<void> {
    const pipelinePromise = promisify(pipeline);
    await pipelinePromise(got.stream(bundleUrl), createWriteStream(BUNDLE_DESTINATION));
  }

  private async extractBundleToTranslationDirectory(baseDirectory: string): Promise<void> {
    // TODO: bug with using async iterators on node12, use old callback approach
    // https://github.com/ZJONSSON/node-unzipper/issues/234
    const zipStream = createReadStream(BUNDLE_DESTINATION).pipe(Parse());
    const fileExtension = FILE_EXTENSION_BY_FILE_FORMAT[this.format];

    await zipStream
      .on('entry', async entry => {
        const { path, type } = entry;
        if (type === 'File' && path.endsWith(fileExtension)) {
          const content = (await entry.buffer()).toString('utf-8');
          const fullPath = join(baseDirectory, path);
          await promises.writeFile(fullPath, postProcessContent(content, this.format));
          core.info(`Imported ${path}`);
        } else {
          await entry.autodrain();
        }
      })
      .promise();

    await promises.unlink(BUNDLE_DESTINATION);
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
      core.error('Unsupported file format');
      return '';
  }
}
