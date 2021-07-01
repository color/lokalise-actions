import { LokalisePushClient } from './client';

const mockCreate = jest.fn().mockResolvedValue({ items: [], errors: [] });
const mockUpdate = jest.fn().mockResolvedValue({ items: [], errors: [] });

const cannedListKeysResponse = {
  items: [
    { key_id: 1, key_name: { web: 'GREETING' } },
    { key_id: 2, key_name: { web: 'CLOSING' } },
    // one that does exists only on remote, should be archived
    { key_id: 3, key_name: { web: 'SIGNATURE' } },
  ],
};

jest.mock('@lokalise/node-api', () => ({
  LokaliseApi: jest.fn().mockImplementation(() => ({
    keys: {
      list: jest.fn().mockResolvedValue(cannedListKeysResponse),
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
    languageISOCodeMapping: '{"es":"es","zh_Hant":"zh_TW"}',
    sourceLanguage: 'en',
    sourceLanguageDirectory: './src/lokalise/push',
    format: 'po',
    platform: 'web',
  };

  it('creates new keys and archives old keys', async () => {
    const client = new LokalisePushClient(credentials);
    await client.pushKeys();

    expect(mockCreate).toHaveBeenCalledWith(
      [
        {
          key_name: 'POSTSCRIPT',
          platforms: ['web'],
          filenames: { web: 'messages.test.po' },
          translations: [{ language_iso: 'en', translation: 'P.S.' }],
        },
      ],
      { project_id: credentials.projectId }
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      [
        {
          key_id: 3,
          is_archived: true,
        },
      ],
      { project_id: credentials.projectId }
    );
  });
});
