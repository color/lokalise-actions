# DEPRECATED
This repository contains code for deprecated, unused GitHub actions that were originally written by Color to sync with Lokalise. We have since [switched](https://github.com/color/color/pull/86958) to [new actions provided by Lokalise](https://developers.lokalise.com/docs/github-actions). See the [wiki doc](https://getcolor.atlassian.net/wiki/spaces/SWEng/pages/1665990792/Lokalise+Translation+Management+System+TMS+Integration) for full details on Color's TMS. This repository is kept for historical reference only.

---

# lokalise-actions

## Contributing

Please consult the `.tool-verions` to make sure that you have the right
versions of nodejs installed in order to create a deterministic `ncc` artifact.

Our CI process will re-generate the `./dist` folder if necessary and will do so
with the version of nodejs defined in `.tool-versions`.

## Usages

```yaml
name: Lokalise message upload

on:
  push:
    # only run workflow for pushes to specific branches
    branches:
      - main
    # only run workflow when matching files are changed
    paths:
      - 'src/main/source/messages/*.json'

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: color/lokalise-action@v1
        with:
          # operation to perform (push, pull)
          action: push

          # token with read/write access to the project
          api-token: ${{ secrets.lokalise_token }}

          project-id: <lokalise-project-id>

          format: json

          platform: web

          # stringified JSON object of local language ISO codes to remote
          language-iso-code-mapping: { 'es': 'es', 'zh_Hant': 'zh_TW' }

          source-language: en

          source-language-directory: relative/directory/to/source/messages

          translation-directory: relative/directory/to/download/translations
```

---

Generated from the https://github.com/actions/typescript-action template.
