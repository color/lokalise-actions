import * as core from '@actions/core';
import { LokalisePushClient } from '@src/lokalise/push/client';

enum ACTION {
  PUSH = 'push',
  PULL = 'pull',
}

async function run(): Promise<void> {
  const args = {
    apiKey: core.getInput('api-token'),
    projectId: core.getInput('project-id'),
    format: core.getInput('format'),
    platform: core.getInput('platform'),
    languageISOCodeMapping: core.getInput('language-iso-code-mapping'),
    sourceLanguage: core.getInput('source-language'),
    sourceLanguageDirectory: core.getInput('source-language-directory'),
    translationDirectory: core.getInput('translation-directory'),
  };

  switch (core.getInput('action')) {
    case ACTION.PUSH: {
      const pushClient = new LokalisePushClient(args);
      await pushClient.pushKeys();
      break;
    }
    default: {
      core.error('Invalid action');
      break;
    }
  }
}

run();
