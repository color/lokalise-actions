import { FILE_FORMAT } from '../constants';
import { LokalisePushClient } from './client';

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn().mockResolvedValue(['message.test.po', 'message.test.json']),
    readFile: jest.fn().mockResolvedValue('base64EncodedFile'),
  },
}));

const mockProcessId = 831;
const mockedList = jest.fn().mockResolvedValue({ items: [{ lang_iso: 'es' }] });
const mockedUpload = jest.fn().mockResolvedValue({ process_id: mockProcessId });
const mockedGet = jest.fn().mockResolvedValue({ status: 'queued' });

jest.mock('@lokalise/node-api', () => ({
  LokaliseApi: jest.fn().mockImplementation(() => ({
    languages: {
      list: mockedList,
    },
    files: {
      upload: mockedUpload,
    },
    queuedProcesses: {
      get: mockedGet,
    },
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

  it('pushes all languages', async () => {
    const credentials = getMockCredentials(FILE_FORMAT.PO, mockAllLanguagesDirectory);

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

  it('pushes only base language', async () => {
    const credentials = getMockCredentials(FILE_FORMAT.JSON, mockEnglishLanguageDirectory);

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

  it('pushes structured json', async () => {
    const credentials = getMockCredentials(FILE_FORMAT.JSON_STRUCTURED, mockEnglishLanguageDirectory);

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
