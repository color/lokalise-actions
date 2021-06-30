import { LokalisePushClient } from './pushClient';

const mockCreate = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@lokalise/node-api', () => ({
  LokaliseApi: jest.fn().mockImplementation(() => ({
    keys: {
      create: mockCreate,
      bulk_update: mockUpdate,
    },
  })),
}));

describe('Lokalise push client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // for jest purposes, base directory is root
  const credentials = {
    apiKey: 'mock-api-key',
    projectId: 'mock-project-key',
    sourceLanguage: 'en',
    sourceLanguageDirectory: './src/loader',
    format: 'json',
    platform: 'web',
  };

  test('push', async () => {
    const client = new LokalisePushClient(credentials);
    client.pushKeys();
  });
});
