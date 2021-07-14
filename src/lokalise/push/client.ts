import { promises } from 'fs';
import { join } from 'path';
import * as core from '@actions/core';
import { LokaliseClient } from '@src/lokalise/base/client';
import { LOKALISE_LANG_ISO_PLACEHOLDER } from '@src/lokalise/constants';

export class LokalisePushClient extends LokaliseClient {
  /**
   * Syncs all local messages and translations to Lokalise by simply uploading
   * all files in  translationDirectory. This will create new keys and update
   * existing ones (if replaceModified is true). Does NOT delete anything.
   *
   * Inspired by the CrowdIn GitHub action.
   */
  async push(): Promise<void> {
    const languageISOCodes = await this.getLanguageISOCodes();

    try {
      for (const code of languageISOCodes) {
        const fileDirectory = this.getLanguageFileDirectory(this.translationDirectory, code);
        const fileNames = await promises.readdir(fileDirectory);

        for (const fileName of fileNames) {
          await this.uploadFile(code, fileDirectory, fileName);
        }
      }
    } catch (error) {
      core.setFailed(error.message);
    }
  }

  /**
   * Use languages defined in Lokalise as source of truth.
   */
  async getLanguageISOCodes(): Promise<string[]> {
    const { items } = await this.lokaliseApi.languages.list({
      project_id: this.projectId,
    });
    return items.map(language => language.lang_iso);
  }

  getLanguageFileDirectory(baseDirectory: string, languageISOCode: string): string {
    return baseDirectory.replace(LOKALISE_LANG_ISO_PLACEHOLDER, languageISOCode);
  }

  async uploadFile(languageISOCode: string, fileDirectory: string, fileName: string): Promise<void> {
    if (!fileName.endsWith(this.format)) {
      return;
    }

    const filepath = join(fileDirectory, fileName);
    const content = await promises.readFile(filepath, { encoding: 'base64' });

    // upload is async, returns a Lokalise QueuedProcess object
    const uploadProcess = await this.lokaliseApi.files.upload(this.projectId, {
      data: content,
      filename: fileName,
      lang_iso: languageISOCode,
      convert_placeholders: false,
      tags: ['Pushed'],
      replace_modified: this.replaceModified,
      skip_detect_lang_iso: true,
    });

    const queuedProcess = await this.lokaliseApi.queuedProcesses.get(uploadProcess.process_id, {
      project_id: this.projectId,
    });
    core.info(`Uploading ${filepath}, with status ${queuedProcess.status}`);
  }
}
