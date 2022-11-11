import {LokalisePullClient} from '../pull/client';
import {LokalisePushClient} from '../push/client';

/**
 * Tests pulling translations from Lokalise.
 * Ensure you are in a clean branch in the color repo
 * so you can revert the test files.
 */
it.skip('pulls structured json', async () => {
    const credentials = {
        apiKey: 'YOUR_PERSONAL_API_KEY_HERE',
        projectId: '75452620606badc63a1997.78469049', // "Test: React" project in Lokalise. Ensure you have access.
        format: 'json_structured',
        translationDirectory: '$COLOR_ROOT/src/projects/home/frontend/src/ui/translations/languages/%LANG_ISO%',
        replaceModified: false,
      };

    const client = new LokalisePullClient(credentials);
    await client.pull();
  });

  it.skip('pushes structured json', async () => {
    const credentials = {
        apiKey: 'YOUR_PERSONAL_API_KEY_HERE',
        projectId: '75452620606badc63a1997.78469049', // "Test: React" project in Lokalise. Ensure you have access.
        format: 'json_structured',
        translationDirectory: '$COLOR_ROOT/src/projects/home/frontend/src/ui/translations/languages/%LANG_ISO%',
        replaceModified: false,
      };

    const client = new LokalisePushClient(credentials);
    await client.push();
  });
