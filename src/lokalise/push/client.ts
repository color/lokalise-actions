import * as core from '@actions/core';
import {
  FILE_EXTENSION_BY_FILE_FORMAT,
  LOKALISE_ENGLISH_LANGUAGE_CODE,
  LOKALISE_LANG_ISO_PLACEHOLDER,
} from '@src/lokalise/constants';
import { LokaliseClient } from '@src/lokalise/base/client';
import { join } from 'path';
import { promises } from 'fs';

export class LokalisePushClient extends LokaliseClient {
  /**
   * Syncs all codebase messages and translations to Lokalise by simply uploading
   * all files in `translationDirectory` for each language. This will create new
   * keys. It will also update existing ones if `replaceModified` is true.
   *
   * Inspired by the CrowdIn GitHub action.
   */
  async push(): Promise<void> {
    try {
      if (this.translationDirectory.includes(LOKALISE_LANG_ISO_PLACEHOLDER)) {
        await this.pushAllLanguages();
      } else {
        await this.pushBaseLanguage();
      }
    } catch (error) {
      if (error instanceof Error) {
        core.setFailed(`Failed pushing messages: ${error.message}`);
      }
    }
  }

  async pushAllLanguages(): Promise<void> {
    const languageISOCodes = await this.getLanguageISOCodes();
    for (const code of languageISOCodes) {
      const fileDirectory = this.getLanguageFileDirectory(this.translationDirectory, code);
      const fileNames = await promises.readdir(fileDirectory);

      for (const fileName of fileNames) {
        await this.uploadFile(code, fileDirectory, fileName);
      }
    }
  }

  async pushBaseLanguage(): Promise<void> {
    const fileNames = await promises.readdir(this.translationDirectory);

    for (const fileName of fileNames) {
      await this.uploadFile(LOKALISE_ENGLISH_LANGUAGE_CODE, this.translationDirectory, fileName);
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
    if (!fileName.endsWith(FILE_EXTENSION_BY_FILE_FORMAT[this.format])) {
      return;
    }
    const filepath = join(fileDirectory, fileName);

    try {
      // In Node 12, there is no convention for checking if a file exists before reading it.
      // Instead, attempt to read the file and catch any errors
      // https://nodejs.org/docs/latest-v12.x/api/fs.html#fs_fspromises_access_path_mode
      const content = await promises.readFile(filepath, { encoding: 'base64' });

      // upload is async, returns a Lokalise QueuedProcess object
      const uploadProcess = await this.lokaliseApi.files.upload(this.projectId, {
        data: content,
        filename: fileName,
        lang_iso: languageISOCode,
        convert_placeholders: false,
        tags: ['Pushed'],
        replace_modified: this.replaceModified,
        apply_tm: this.applyTm,
        cleanup_mode: this.cleanupMode,
        skip_detect_lang_iso: true,
      });

      const queuedProcess = await this.lokaliseApi.queuedProcesses.get(uploadProcess.process_id, {
        project_id: this.projectId,
      });
      core.info(`Uploading ${filepath}, with status ${queuedProcess.status}`);
    } catch (error) {
      // error should be type guarded, but TS complained about the NodeJS.ErrnoException type
      if (error?.code === 'ENOENT') {
        core.info(`File ${filepath}, not found`);
      }
      return;
    }
  }
}
