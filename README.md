## Usages

```
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
    - uses: actions/checkout@v2
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
        language-iso-code-mapping: {"es":"es","zh_Hant":"zh_TW"}

        source-language: en

        source-language-directory: relative/directory/to/source/messages

        translation-directory: relative/directory/to/download/translations
```

---

Generated from the https://github.com/actions/typescript-action template.
