import { describe, expect, jest, test } from '@jest/globals';
import fs, { createReadStream } from 'fs';
import promises from 'fs/promises';
import got from 'got';

import { LokalisePullClient } from './client';

const BUNDLE_URL = 'https://foo.url';
const PO_READ_STREAM = createReadStream('./src/mock-messages/po.zip');
const STRUCTURED_JSON_READ_STREAM = createReadStream('./src/mock-messages/structured-json.zip');
const JSON_READ_STREAM = createReadStream('./src/mock-messages/json.zip');

const mockedDownload = jest.fn<() => Promise<Record<string, string>>>().mockResolvedValue({ bundle_url: BUNDLE_URL });
jest.mock('@lokalise/node-api', () => ({
  LokaliseApi: jest.fn().mockImplementation(() => ({
    files: () => ({
      download: mockedDownload,
    }),
  })),
}));

jest.mock('@actions/core');
jest.mock('stream/promises');

// arrange: selectively mock out to avoid mocking imports that are required by other dependencies
jest.spyOn(got, 'stream').mockImplementation(() => ({} as ReturnType<typeof got.stream>));
jest.spyOn(fs, 'createWriteStream');
jest.spyOn(promises, 'writeFile').mockImplementation(async () => Promise.resolve());

/**
 * Shallow tests that make sure the data plumbing is correct.
 * The internals are thoroughly tested in download-files.test.ts
 */
describe('Lokalise pull client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('pull po', async () => {
    jest.spyOn(fs, 'createReadStream').mockReturnValueOnce(PO_READ_STREAM);

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
  });
});
