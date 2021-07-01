import { loadTranslationFile } from './loader';

test('loads PO file messages', async () => {
  const messages = await loadTranslationFile(__dirname, 'messages.test.po', 'po');
  expect(messages.length).toBe(2);
  expect(messages[0]).toStrictEqual({
    keyId: 'GREETING',
    translation: 'Hola,',
    filename: 'messages.test.po',
  });
});

test('loads JSON file messages', async () => {
  const messages = await loadTranslationFile(__dirname, 'messages.test.json', 'json');
  expect(messages.length).toBe(3);
  expect(messages[0]).toStrictEqual({
    keyId: '+WqNDd',
    translation: 'Continuar',
    filename: 'messages.test.json',
  });
});
