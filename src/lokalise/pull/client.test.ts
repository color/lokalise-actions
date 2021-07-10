import fs from 'fs';
import promises from 'fs/promises';
import got from 'got';
import unzipper from 'unzipper';
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

jest.mock('stream/promises');

const entryJson = { fooId1: { translation: 'myFoo' }, fooId2: { translation: 'yourFoo' } };
const zipFileEntries = [
  {
    path: 'messages.json',
    type: 'File',
    buffer: async () => {
      return JSON.stringify(entryJson);
    },
  },
];
const mockZipFileStream = {
  [Symbol.asyncIterator]() {
    return {
      i: 0,
      async next() {
        if (this.i < 1) {
          return Promise.resolve({ value: zipFileEntries[this.i], done: false });
        }

        return Promise.resolve({ done: true });
      },
    };
  },
};

describe('Lokalise pull client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const credentials = {
    apiKey: 'mock-api-key',
    projectId: 'mock-project-key',
    format: 'json',
    translationDirectory: './prefix/%LANG_ISO%/suffix',
    replaceModified: false,
  };

  test('pull', async () => {
    // arrange: selectively mock out to avoid mocking imports that are required by other dependencies
    const gotStreamSpy = jest.spyOn(got, 'stream').mockImplementation();
    const writeStreamSpy = jest.spyOn(fs, 'createWriteStream');
    const readStreamSpy = jest.spyOn(fs, 'createReadStream');
    (readStreamSpy as jest.Mock).mockImplementation(() => ({
      pipe: jest.fn().mockReturnValue(mockZipFileStream),
    }));
    const parseStreamSpy = jest.spyOn(unzipper, 'Parse');
    const writeFileSpy = jest.spyOn(promises, 'writeFile');

    // act
    const client = new LokalisePullClient(credentials);
    await client.pull();

    // assert

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

    // bundle is downloaded
    expect(gotStreamSpy).toHaveBeenCalledWith(bundleUrl);
    // bundle is written
    expect(writeStreamSpy).toHaveBeenCalledWith('./translations.zip');
    // bundle is extracted
    expect(readStreamSpy).toHaveBeenCalledWith('./translations.zip');
    expect(parseStreamSpy).toHaveBeenCalled();
    // extracted files are parsed and written
    expect(writeFileSpy).toHaveBeenCalledWith('prefix/messages.json', JSON.stringify(entryJson, null, 2));
  });
});
