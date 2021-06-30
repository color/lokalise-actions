import { LokaliseClient } from './baseClient';

const mockList = jest.fn();
jest.mock('@lokalise/node-api', () => ({
  LokaliseApi: jest.fn().mockImplementation(() => ({
    keys: {
      list: mockList,
    },
  })),
}));

describe('Base Lokalise client', () => {
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

  test('loads local keys', async () => {
    const client = new LokaliseClient(credentials);
    const keys = await client.getLocalKeys();
    expect(keys.length).toBe(3);
    expect(keys[0]).toStrictEqual({
      keyId: '+WqNDd',
      translation: 'Continuar',
      filename: 'messages.json',
    });
  });

  test('mocks loading remote keys', async () => {
    const client = new LokaliseClient(credentials);
    await client.getRemoteKeys();

    expect(mockList).toBeCalledWith({
      project_id: credentials.projectId,
      filter_platforms: credentials.platform,
      filter_archived: 'exclude',
      limit: 5000,
    });
  });
});
