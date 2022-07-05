import fs, { createReadStream, promises } from 'fs';
import { LokalisePullClient } from './client';
import got from 'got';
import stream from 'stream';

const bundleUrl = 'https://foo.url';

const mockedDownload = jest.fn().mockResolvedValue({ bundle_url: bundleUrl });
jest.mock('@lokalise/node-api', () => ({
  LokaliseApi: jest.fn().mockImplementation(() => ({
    files: {
      download: mockedDownload,
    },
  })),
}));
jest.mock('@actions/core');

describe('Lokalise pull client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // arrange: selectively mock out to avoid mocking imports that are required by other dependencies
  const pipelineSpy = jest.spyOn(stream, 'pipeline');
  (pipelineSpy as jest.Mock).mockImplementation((a, b, callback) => callback(null, true));
  const gotStreamSpy = jest.spyOn(got, 'stream').mockImplementation();
  const writeStreamSpy = jest.spyOn(fs, 'createWriteStream').mockImplementation();
  const writeFileSpy = jest.spyOn(promises, 'writeFile').mockImplementation(async () => Promise.resolve());
  jest.spyOn(promises, 'unlink').mockImplementation(async () => Promise.resolve());

  test('pull po', async () => {
    const readStreamSpy = jest
      .spyOn(fs, 'createReadStream')
      .mockReturnValueOnce(createReadStream('./src/mock-messages/po.zip'));

    const credentials = {
      apiKey: 'mock-api-key',
      projectId: 'mock-project-key',
      format: 'po',
      translationDirectory: './po-prefix/%LANG_ISO%/suffix',
      replaceModified: false,
    };

    // act
    const client = new LokalisePullClient(credentials);
    await client.pull();

    // download is called
    expect(mockedDownload).toHaveBeenCalledWith(credentials.projectId, {
      format: 'po',
      original_filenames: true,
      directory_prefix: '%LANG_ISO%/suffix',
      replace_breaks: true,
      include_comments: true,
      include_description: true,
      placeholder_format: 'printf',
      json_unescaped_slashes: true,
    });

    // bundle is downloaded
    expect(gotStreamSpy).toHaveBeenCalledWith(bundleUrl);
    // bundle is written
    expect(writeStreamSpy).toHaveBeenCalledWith('./translations.zip');
    // bundle is extracted
    expect(readStreamSpy).toHaveBeenCalledWith('./translations.zip');
    // extracted files are parsed and written
    expect(writeFileSpy).toHaveBeenCalledTimes(3);
  });

  test('pull structured json', async () => {
    jest.spyOn(fs, 'createReadStream').mockReturnValueOnce(createReadStream('./src/mock-messages/structured-json.zip'));

    const credentials = {
      apiKey: 'mock-api-key',
      projectId: 'mock-project-key',
      format: 'json_structured',
      translationDirectory: './structured-json-prefix/%LANG_ISO%/suffix',
      replaceModified: false,
    };

    // act
    const client = new LokalisePullClient(credentials);
    await client.pull();

    // download is called
    expect(mockedDownload).toHaveBeenCalledWith(credentials.projectId, {
      format: 'json_structured',
      original_filenames: true,
      directory_prefix: '%LANG_ISO%/suffix',
      replace_breaks: false,
      include_comments: true,
      include_description: true,
      placeholder_format: 'icu',
      json_unescaped_slashes: true,
    });

    // there are three files in mock-messages/structured-json.zip
    expect(writeFileSpy).toHaveBeenCalledTimes(3);
  });

  test('pull json', async () => {
    jest.spyOn(fs, 'createReadStream').mockReturnValueOnce(createReadStream('./src/mock-messages/json.zip'));

    const credentials = {
      apiKey: 'mock-api-key',
      projectId: 'mock-project-key',
      format: 'json',
      translationDirectory: './prefix/%LANG_ISO%/suffix',
      replaceModified: false,
    };

    const client = new LokalisePullClient(credentials);
    await client.pull();

    expect(mockedDownload).toHaveBeenCalledWith(credentials.projectId, {
      format: 'json',
      original_filenames: true,
      directory_prefix: '%LANG_ISO%/suffix',
      replace_breaks: false,
      include_comments: true,
      include_description: true,
      placeholder_format: 'icu',
      json_unescaped_slashes: true,
    });

    // there are two files in mock-messages/json.zip
    expect(writeFileSpy).toHaveBeenCalledTimes(2);
  });
});
