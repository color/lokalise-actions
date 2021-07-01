import * as core from '@actions/core';

import { Message } from '@src/loader/loader';
import { LokaliseClient } from '@src/lokalise/base/client';
import { LokaliseKey, RecursivePartial, LokalisePostPayload } from '@src/lokalise/types';

export class LokalisePushClient extends LokaliseClient {
  /**
   * Create new translation messages and archive old ones.
   */
  async pushKeys(): Promise<void> {
    try {
      const { items: remoteKeys } = await this.getRemoteKeys();
      const localKeys: Message[] = await this.getLocalKeys();

      const keysToCreate = this.getKeysToCreate(localKeys, remoteKeys);
      const keysToArchive = this.getKeysToArchive(localKeys, remoteKeys);

      if (keysToCreate.length > 0) {
        core.info(`Creating ${keysToCreate.length} new keys to Lokalise`);

        const { items, errors } = await this.lokaliseApi.keys.create(keysToCreate, {
          project_id: this.projectId,
        });
        core.info(`Created ${items.length}`);
        core.info(`Create errors: ${errors.length}: ${errors}`);
      }

      if (keysToArchive.length > 0) {
        core.info(`Archiving ${keysToArchive.length} keys in Lokalise`);
        const keyIds = keysToArchive.map(key => key.key_name);
        core.info(keyIds.toString());

        const { items, errors } = await this.lokaliseApi.keys.bulk_update(keysToArchive, {
          project_id: this.projectId,
        });
        core.info(`Archived ${items.length}`);
        core.info(`Archive errors: ${errors.length}: ${errors}`);
      }
    } catch (error) {
      core.error(error.message);
    }
  }

  /**
   * Create Keys that exist locally, but not remotely.
   */
  private getKeysToCreate(localKeys: Message[], remoteKeys: LokaliseKey[]): RecursivePartial<LokalisePostPayload>[] {
    const remoteKeyIds = new Set<string>(remoteKeys.map(key => key.key_name[this.platform] as string));
    const keysToCreate = localKeys
      .filter(x => !remoteKeyIds.has(x.keyId))
      .map(key => this.buildLokaliseCreateKeysRequest(key));
    return keysToCreate;
  }

  private buildLokaliseCreateKeysRequest(key: Message): RecursivePartial<LokalisePostPayload> {
    const { keyId, translation, filename } = key;
    return {
      key_name: keyId,
      translations: [
        {
          language_iso: this.sourceLanguage,
          translation,
        },
      ],
      platforms: [this.platform],
      filenames: {
        [this.platform]: filename,
      },
    };
  }

  /**
   * Archive Keys that exist remotely, but not locally.
   */
  private getKeysToArchive(localKeys: Message[], remoteKeys: LokaliseKey[]): Partial<LokalisePostPayload>[] {
    const localKeyIds = new Set(localKeys.map(key => key.keyId));
    const keysToArchive = remoteKeys
      .filter(key => !localKeyIds.has(key.key_name[this.platform] as string))
      .map(key => this.buildLokaliseArchiveKeysRequest(key));

    return keysToArchive;
  }

  private buildLokaliseArchiveKeysRequest(key: LokaliseKey): Partial<LokalisePostPayload> {
    return {
      key_id: key.key_id,
      is_archived: true,
    };
  }
}
