import { LokalisePushClient } from './client';

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn().mockResolvedValue(['message.test.po']),
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

describe('Lokalise push client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // for jest purposes, base directory is root
  const credentials = {
    apiKey: 'mock-api-key',
    projectId: 'mock-project-key',
    format: 'po',
    translationDirectory: './src/lokalise/push',
    replaceModified: false,
  };

  it('uploads files', async () => {
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
});
