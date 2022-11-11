import fs, { createReadStream } from 'fs';
import promises from 'fs/promises';
import { LokalisePullClient } from './client';
import got from 'got';

const BUNDLE_URL = 'https://foo.url';
const PO_READ_STREAM = createReadStream('./src/mock-messages/po.zip');
const STRUCTURED_JSON_READ_STREAM = createReadStream('./src/mock-messages/structured-json.zip');
const JSON_READ_STREAM = createReadStream('./src/mock-messages/json.zip');

const mockedDownload = jest.fn().mockResolvedValue({ bundle_url: BUNDLE_URL });
jest.mock('@lokalise/node-api', () => ({
  LokaliseApi: jest.fn().mockImplementation(() => ({
    files: {
      download: mockedDownload,
    },
  })),
}));

jest.mock('@actions/core');
jest.mock('stream/promises');

describe('Lokalise pull client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // arrange: selectively mock out to avoid mocking imports that are required by other dependencies
  const gotStreamSpy = jest.spyOn(got, 'stream').mockImplementation();
  const writeStreamSpy = jest.spyOn(fs, 'createWriteStream')
  const writeFileSpy = jest.spyOn(promises, 'writeFile').mockImplementation(async () => Promise.resolve());

  test('pull po', async () => {
    const readStreamSpy = jest
      .spyOn(fs, 'createReadStream')
      .mockReturnValueOnce(PO_READ_STREAM);

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
      export_empty_as: 'empty',
      directory_prefix: '%LANG_ISO%/suffix',
      add_newline_eof: true,
      replace_breaks: true,
      include_comments: true,
      include_description: true,
      placeholder_format: 'printf',
      json_unescaped_slashes: true,
    });

    // bundle is downloaded
    expect(gotStreamSpy).toHaveBeenCalledWith(BUNDLE_URL);
    // bundle is written
    expect(writeStreamSpy).toHaveBeenCalledWith('./translations.zip');
    // bundle is extracted
    expect(readStreamSpy).toHaveBeenCalledWith('./translations.zip');
    // extracted files are parsed and written
    expect(writeFileSpy).toHaveBeenCalledTimes(3);
    expect(writeFileSpy).toHaveBeenNthCalledWith(1, 'po-prefix/en/django.po', expect.anything());
    expect(writeFileSpy).toHaveBeenNthCalledWith(2, 'po-prefix/es/django.po', expect.anything());
    expect(writeFileSpy).toHaveBeenNthCalledWith(3, 'po-prefix/zh_Hans/django.po', expect.anything());
  });

  test('pull structured json', async () => {
    jest.spyOn(fs, 'createReadStream').mockReturnValueOnce(STRUCTURED_JSON_READ_STREAM);

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
      export_empty_as: 'empty',
      directory_prefix: '%LANG_ISO%/suffix',
      add_newline_eof: true,
      replace_breaks: false,
      include_comments: true,
      include_description: true,
      placeholder_format: 'icu',
      json_unescaped_slashes: true,
    });

    // there are three files in mock-messages/structured-json.zip
    expect(writeFileSpy).toHaveBeenCalledTimes(3);
    // INFO: suffix is absent from these because that set in the /mock-messages
    // what should be tested is that the suffix is provided in the Lokalise parameters (done above)
    expect(writeFileSpy).toHaveBeenNthCalledWith(1, 'structured-json-prefix/en.json', expect.anything());
    expect(writeFileSpy).toHaveBeenNthCalledWith(2, 'structured-json-prefix/es.json', expect.anything());
    expect(writeFileSpy).toHaveBeenNthCalledWith(3, 'structured-json-prefix/zh_Hans.json', expect.anything());
  });

  test('pull json', async () => {
    jest.spyOn(fs, 'createReadStream').mockReturnValueOnce(JSON_READ_STREAM);

    const credentials = {
      apiKey: 'mock-api-key',
      projectId: 'mock-project-key',
      format: 'json',
      translationDirectory: './flat-json-directory',
    };

    const client = new LokalisePullClient(credentials);
    await client.pull();

    expect(mockedDownload).toHaveBeenCalledWith(credentials.projectId, {
      format: 'json',
      original_filenames: false,
      export_empty_as: 'empty',
      bundle_structure: '%LANG_ISO%.json',
      add_newline_eof: true,
      placeholder_format: 'icu',
      json_unescaped_slashes: true,
      replace_breaks: false,
    });

    // there are two files in mock-messages/json.zip
    expect(writeFileSpy).toHaveBeenCalledTimes(2);
    expect(writeFileSpy).toHaveBeenNthCalledWith(1, 'flat-json-directory/es.json', expect.anything());
    expect(writeFileSpy).toHaveBeenNthCalledWith(2, 'flat-json-directory/zh_Hans.json', expect.anything());
  });
});
