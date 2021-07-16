import fs, { createReadStream, promises } from 'fs';
import got from 'got';
import stream from 'stream';
import { LokalisePullClient } from './client';

const bundleUrl = 'https://foo.url';
const mockedDownload = jest.fn().mockResolvedValue({ bundle_url: bundleUrl });

jest.mock('@actions/core');

jest.mock('@lokalise/node-api', () => ({
  LokaliseApi: jest.fn().mockImplementation(() => ({
    files: {
      download: mockedDownload,
    },
  })),
}));

describe('Lokalise pull client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const credentials = {
    apiKey: 'mock-api-key',
    projectId: 'mock-project-key',
    format: 'po',
    translationDirectory: './prefix/%LANG_ISO%/suffix',
    replaceModified: false,
  };

  test('pull', async () => {
    // arrange: selectively mock out to avoid mocking imports that are required by other dependencies
    const pipelineSpy = jest.spyOn(stream, 'pipeline');
    (pipelineSpy as jest.Mock).mockImplementation((a, b, callback) => callback(null, true));
    const gotStreamSpy = jest.spyOn(got, 'stream').mockImplementation();
    const writeStreamSpy = jest.spyOn(fs, 'createWriteStream').mockImplementation();
    const readStreamSpy = jest.spyOn(fs, 'createReadStream').mockReturnValue(createReadStream('./messages.zip'));
    const writeFileSpy = jest.spyOn(promises, 'writeFile').mockImplementation(async () => Promise.resolve());
    jest.spyOn(promises, 'unlink').mockImplementation(async () => Promise.resolve());

    // act
    const client = new LokalisePullClient(credentials);
    await client.pull();

    // assert

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
});
