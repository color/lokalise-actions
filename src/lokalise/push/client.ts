import * as core from '@actions/core';
import { LokaliseApi, Language } from '@lokalise/node-api';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

import {
  FILE_EXTENSION_BY_FILE_FORMAT,
  FILE_FORMAT,
  LOKALISE_ENGLISH_LANGUAGE_CODE,
  LOKALISE_LANG_ISO_PLACEHOLDER,
} from '~src/lokalise/constants';
import { LokaliseClient } from '~src/lokalise/types';

export class LokalisePushClient implements LokaliseClient {
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
    this.lokaliseApi = new LokaliseApi({ apiKey: this.apiKey as string });
  }

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
      const fileNames = await readdir(fileDirectory);

      for (const fileName of fileNames) {
        await this.uploadFile(code, fileDirectory, fileName);
      }
    }
  }

  async pushBaseLanguage(): Promise<void> {
    const fileNames = await readdir(this.translationDirectory);

    for (const fileName of fileNames) {
      await this.uploadFile(LOKALISE_ENGLISH_LANGUAGE_CODE, this.translationDirectory, fileName);
    }
  }

  /**
   * Use languages defined in Lokalise as source of truth.
   */
  async getLanguageISOCodes(): Promise<string[]> {
    const { items } = await this.lokaliseApi.languages().list({
      project_id: this.projectId,
    });
    return items.map((language: Language) => language.lang_iso);
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
      const content = await readFile(filepath, { encoding: 'base64' });

      // upload is async, returns a Lokalise QueuedProcess object
      const uploadProcess = await this.lokaliseApi.files().upload(this.projectId, {
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

      const queuedProcess = await this.lokaliseApi.queuedProcesses().get(uploadProcess.process_id, {
        project_id: this.projectId,
      });
      core.info(`Uploading ${filepath}, with status ${queuedProcess.status}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        core.info(`File ${filepath}, not found`);
      }
      return;
    }
  }
}
