import { QueuedProcess, PaginatedResult, Language } from '@lokalise/node-api';
import { describe, expect, jest, test } from '@jest/globals';
import { readFile } from 'fs/promises';

import { FileFormat } from '../constants';
import { LokalisePushClient } from './client';

jest.mock('fs/promises', () => ({
  // readdir is an overloaded function and there isn't a way to inform jest which function signature to mock
  readdir: jest.fn<() => Promise<string[]>>().mockResolvedValue(['message.test.po', 'message.test.json']),
  readFile: jest.fn<typeof readFile>().mockResolvedValue('base64EncodedFile'),
}));

const mockProcessId = '831';
const mockedList = jest
  .fn<() => Promise<PaginatedResult<Language>>>()
  .mockResolvedValue({ items: [{ lang_iso: 'es' }] } as PaginatedResult<Language>);
const mockedUpload = jest
  .fn<() => Promise<QueuedProcess>>()
  .mockResolvedValue({ process_id: mockProcessId } as QueuedProcess);
const mockedGet = jest.fn<() => Promise<QueuedProcess>>().mockResolvedValue({ status: 'queued' } as QueuedProcess);

jest.mock('@lokalise/node-api', () => ({
  LokaliseApi: jest.fn().mockImplementation(() => ({
    languages: () => ({
      list: mockedList,
    }),
    files: () => ({
      upload: mockedUpload,
    }),
    queuedProcesses: () => ({
      get: mockedGet,
    }),
  })),
}));

jest.mock('@actions/core');

const mockAllLanguagesDirectory = './src/lokalise/push/%LANG_ISO%';
const mockEnglishLanguageDirectory = './src/lokalise/push';

function getMockCredentials(format: string, translationDirectory: string): Record<string, string | boolean> {
  return {
    apiKey: 'mock-api-key',
    projectId: 'mock-project-key',
    format,
    translationDirectory,
    replaceModified: false,
  };
}

describe('Lokalise push client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('pushes all languages', async () => {
    const credentials = getMockCredentials(FileFormat.PO, mockAllLanguagesDirectory);

    const client = new LokalisePushClient(credentials);
    await client.push();

    expect(mockedList).toHaveBeenCalledWith({
      project_id: credentials.projectId,
    });

    expect(mockedUpload).toHaveBeenCalledWith(credentials.projectId, {
      data: 'base64EncodedFile',
      filename: 'message.test.po',
      lang_iso: 'es',
      convert_placeholders: false,
      tags: ['Pushed'],
      replace_modified: false,
      skip_detect_lang_iso: true,
    });

    expect(mockedGet).toHaveBeenCalledWith(mockProcessId, {
      project_id: credentials.projectId,
    });
  });

  test('pushes only base language', async () => {
    const credentials = getMockCredentials(FileFormat.JSON, mockEnglishLanguageDirectory);

    const client = new LokalisePushClient(credentials);
    await client.push();

    expect(mockedList).not.toHaveBeenCalled();

    expect(mockedUpload).toHaveBeenCalledWith(credentials.projectId, {
      data: 'base64EncodedFile',
      filename: 'message.test.json',
      lang_iso: 'en',
      convert_placeholders: false,
      tags: ['Pushed'],
      replace_modified: false,
      skip_detect_lang_iso: true,
    });

    expect(mockedGet).toHaveBeenCalledWith(mockProcessId, {
      project_id: credentials.projectId,
    });
  });

  test('pushes structured json', async () => {
    const credentials = getMockCredentials(FileFormat.JSON_STRUCTURED, mockEnglishLanguageDirectory);

    const client = new LokalisePushClient(credentials);
    await client.push();

    expect(mockedUpload).toHaveBeenCalledWith(credentials.projectId, {
      data: 'base64EncodedFile',
      filename: 'message.test.json',
      lang_iso: 'en',
      convert_placeholders: false,
      tags: ['Pushed'],
      replace_modified: false,
      skip_detect_lang_iso: true,
    });
  });
});
