import * as core from '@actions/core';
import { readFile } from 'fs';
import { join } from 'path';
import PO from 'pofile';

enum FILE_FORMAT {
  PO_FORMAT = 'po',
  JSON_FORMAT = 'json',
}

/**
 * Load a file asynchronously. Node API async functions do not return promises.
 * This syntax makes the function await-able. This is default behavior in latest Node versions.
 */
async function loadFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}

/**
 * Parse a PO file as a key value store mapping translationId to translationString.
 */
function parsePOMessages(file: string, filename: string): Message[] {
  const translationMessages = PO.parse(file).items;

  return translationMessages.map(message => {
    const { msgid, msgstr } = message;
    return {
      keyId: msgid,
      translation: msgstr[0],
      filename,
    };
  });
}

// Lokalise JSON format
type LokaliseTranslationMessages = {
  [key: string]: {
    notes: string;
    translation: string;
  };
};

/**
 * Parse a JSON file as a key value store mapping translationId to translationString.
 */
function parseJsonMessages(file: string, filename: string): Message[] {
  const translatedMessages: LokaliseTranslationMessages = JSON.parse(file);

  return Object.keys(translatedMessages).map((key: string) => {
    return {
      keyId: key,
      translation: translatedMessages[key].translation,
      filename,
    };
  });
}

export type Message = {
  keyId: string;
  translation: string;
  filename: string;
};

export async function loadTranslationFile(filepath: string, filename: string, format: string): Promise<Message[]> {
  if (!filename.endsWith(format)) {
    return [];
  }

  let extractedMessages: Message[] = [];
  const fullPath = join(filepath, filename);
  try {
    const fileAsString = await loadFile(fullPath);

    if (format === FILE_FORMAT.PO_FORMAT) {
      extractedMessages = parsePOMessages(fileAsString, filename);
    } else if (format === FILE_FORMAT.JSON_FORMAT) {
      extractedMessages = parseJsonMessages(fileAsString, filename);
    } else {
      throw new Error('No parser found for format');
    }
  } catch (error) {
    core.setFailed(error.message);
  }

  return extractedMessages;
}
