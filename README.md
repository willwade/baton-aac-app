# @baton/app

[![codecov](https://codecov.io/gh/Baton-donation/app/branch/master/graph/badge.svg?token=8JP12JYBTX)](https://codecov.io/gh/Baton-donation/app)

Baton is a simple app that allows AAC software users to upload data for research purposes.

**NOTE: This is a fork of the original project NOT uploading to a backend server but keeping it local"

Currently, Baton supports extracting data from:

- Dasher
- Grid 3
- Plain text files
- Tobii Communicator
- Predictable

We plan to add additional supported apps in the future.

## Usage

Download and install [a recent release](https://github.com/kdv123/AACDonation/releases). There's a short setup wizard upon the first open.

## Development

First, copy `.env.example` to `.env` and modify as necessary. Then:

```bash
# install dependencies
yarn install

# start in development mode
yarn dev
```

To build new releases:

1. Increment the version: `npm --no-git-tag-version version [major|minor|patch]`
2. Commit and push: `git commit -am "Bump version to X.X.X" && git push`
3. Create a **draft** release on GitHub with tag `vX.X.X` (matching package.json version)
4. The GitHub Actions workflow will automatically build and upload the installers to the draft release
5. Once ready, publish the draft release

### Developer Option: Plain Text Exports

Exports are encrypted by default. Developers can opt-in to plain text exports by setting the `BATON_DISABLE_EXPORT_ENCRYPTION=true` environment variable (for example in your `.env`). Only use this flag locally—regular builds should keep encryption enabled.

