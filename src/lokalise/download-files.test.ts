import { describe, expect, jest, test } from '@jest/globals';
import { LokaliseApi } from '@lokalise/node-api';
import fs, { createReadStream } from 'fs';
import promises from 'fs/promises';
import got from 'got';

import { FileFormat } from './constants';
import { downloadAndExtract, getFlatExportParams, getNestedExportParams } from './download-files';

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

describe('Lokalise downloadAndExtract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // arrange: selectively mock out to avoid mocking imports that are required by other dependencies
  const gotStreamSpy = jest.spyOn(got, 'stream').mockImplementation(() => ({} as ReturnType<typeof got.stream>));
  const writeStreamSpy = jest.spyOn(fs, 'createWriteStream');
  const writeFileSpy = jest.spyOn(promises, 'writeFile').mockImplementation(async () => Promise.resolve());

  test('downloadAndExtract po using nestedExportParams', async () => {
    const readStreamSpy = jest.spyOn(fs, 'createReadStream').mockReturnValueOnce(PO_READ_STREAM);
    const fileFormat = FileFormat.PO;

    // act
    const { downloadDirectory, downloadOptions } = getNestedExportParams('./po-prefix/%LANG_ISO%/suffix', fileFormat);

    await downloadAndExtract({
      bundleDestination: './translations.zip',
      lokaliseApi: new LokaliseApi({ apiKey: 'mock-api-key' }),
      lokaliseFileFormat: fileFormat,
      projectId: 'mock-project-key',
      downloadDirectory,
      downloadOptions,
    });

    // download is called
    expect(mockedDownload).toHaveBeenCalledWith('mock-project-key', {
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

  test('downloadAndExtract structured json using nestedExportParams', async () => {
    jest.spyOn(fs, 'createReadStream').mockReturnValueOnce(STRUCTURED_JSON_READ_STREAM);
    const fileFormat = FileFormat.JSON_STRUCTURED;

    // act
    const { downloadDirectory, downloadOptions } = getNestedExportParams(
      './structured-json-prefix/%LANG_ISO%/suffix',
      fileFormat,
    );

    await downloadAndExtract({
      bundleDestination: './translations.zip',
      lokaliseApi: new LokaliseApi({ apiKey: 'mock-api-key' }),
      lokaliseFileFormat: fileFormat,
      projectId: 'mock-project-key',
      downloadDirectory,
      downloadOptions,
    });

    // there are three files in mock-messages/structured-json.zip
    expect(writeFileSpy).toHaveBeenCalledTimes(3);
    // INFO: suffix is absent from these because that set in the /mock-messages
    // what should be tested is that the suffix is provided in the Lokalise parameters (done above)
    expect(writeFileSpy).toHaveBeenNthCalledWith(1, 'structured-json-prefix/en.json', expect.anything());
    expect(writeFileSpy).toHaveBeenNthCalledWith(2, 'structured-json-prefix/es.json', expect.anything());
    expect(writeFileSpy).toHaveBeenNthCalledWith(3, 'structured-json-prefix/zh_Hans.json', expect.anything());
  });

  test('downloadAndExtract json using flatExportParams', async () => {
    jest.spyOn(fs, 'createReadStream').mockReturnValueOnce(JSON_READ_STREAM);
    const fileFormat = FileFormat.JSON;

    // act
    const { downloadDirectory, downloadOptions } = getFlatExportParams('./flat-json-directory', fileFormat);

    await downloadAndExtract({
      bundleDestination: './translations.zip',
      lokaliseApi: new LokaliseApi({ apiKey: 'mock-api-key' }),
      lokaliseFileFormat: fileFormat,
      projectId: 'mock-project-key',
      downloadDirectory,
      downloadOptions,
    });

    // there are two files in mock-messages/json.zip
    expect(writeFileSpy).toHaveBeenCalledTimes(2);
    expect(writeFileSpy).toHaveBeenNthCalledWith(1, 'flat-json-directory/es.json', expect.anything());
    expect(writeFileSpy).toHaveBeenNthCalledWith(2, 'flat-json-directory/zh_Hans.json', expect.anything());
  });
});
