import { LokaliseClient } from './client';

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
    languageISOCodeMapping:
      '{"ar":"ar","es":"es","fil":"fil","ht":"ht_HT","km":"km_KH","ko":"ko","pt":"pt","ru":"ru","sm":"sm","vi":"vi","zh_Hans":"zh_CN","zh_Hant":"zh_TW"}',
    sourceLanguage: 'en',
    sourceLanguageDirectory: './src/loader',
    format: 'json',
    platform: 'web',
  };

  it('loads parses JSON string input for language ISO code mapping', async () => {
    const client = new LokaliseClient(credentials);
    expect(client.languageISOCodeMapping).toStrictEqual({
      ar: 'ar',
      es: 'es',
      fil: 'fil',
      ht: 'ht_HT',
      km: 'km_KH',
      ko: 'ko',
      pt: 'pt',
      ru: 'ru',
      sm: 'sm',
      vi: 'vi',
      zh_Hans: 'zh_CN',
      zh_Hant: 'zh_TW',
    });
  });

  it('loads local keys', async () => {
    const client = new LokaliseClient(credentials);
    const keys = await client.getLocalKeys();
    expect(keys.length).toBe(3);
    expect(keys[0]).toStrictEqual({
      keyId: '+WqNDd',
      translation: 'Continuar',
      filename: 'messages.test.json',
    });
  });

  it('mocks loading remote keys', async () => {
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
