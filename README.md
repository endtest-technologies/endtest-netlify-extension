# Endtest Netlify Extension

The official Netlify extension for running automated tests with [Endtest](https://endtest.io/) after successful Netlify deployments.

The extension starts a configurable Endtest execution, waits for it to finish, and displays the result in the Netlify deploy summary.

For installation and configuration instructions, read the [Endtest Netlify integration guide](https://endtest.io/docs/integrations/netlify).

## Features

- Runs Endtest automatically after successful Netlify deployments
- Uses each customer's own Endtest App ID and App Code
- Supports project-specific configuration
- Accepts a dynamically supplied Endtest API request
- Supports `{{NETLIFY_DEPLOY_URL}}` replacement
- Polls Endtest until the execution finishes
- Displays execution details in the Netlify deploy summary
- Reports failed assertions, execution errors, invalid responses, and timeouts
- Stores the Endtest App Code as a secret Netlify environment variable

## Documentation

- [Endtest Netlify integration guide](https://endtest.io/docs/integrations/netlify)
- [Endtest API documentation](https://endtest.io/docs/advanced/how-to-use-the-endtest-api)
- [Endtest documentation](https://endtest.io/docs)
- [Endtest website](https://endtest.io/)

## How it works

After a successful Netlify deployment, the extension:

1. reads the Endtest configuration saved for the Netlify project
2. replaces `{{NETLIFY_DEPLOY_URL}}` with the current deployment URL
3. adds the customer's Endtest App ID and App Code to the API request
4. starts the Endtest execution
5. receives the execution hash
6. polls Endtest until the execution finishes
7. displays the result in the Netlify deploy summary

The execution fails when Endtest reports failed assertions, execution errors, an explicit failure status, an invalid response, or a timeout.

## Project configuration

The extension stores these project-level Netlify environment variables:

```text
ENDTEST_ENABLED
ENDTEST_APP_ID
ENDTEST_APP_CODE
ENDTEST_API_REQUEST
ENDTEST_NUMBER_OF_LOOPS
```

`ENDTEST_APP_CODE` is stored as a secret variable with build scope.

The optional local development variable below can be used to shorten the polling interval:

```text
ENDTEST_POLL_INTERVAL_SECONDS
```

Published installations use a default polling interval of 30 seconds.

## Deployment URL placeholder

The API request can contain:

```text
{{NETLIFY_DEPLOY_URL}}
```

The extension replaces it with Netlify's current deployment URL before sending the request to Endtest.

Example:

```text
https://app.endtest.io/api.php?action=runWeb&suite=123456&startUrl={{NETLIFY_DEPLOY_URL}}
```

The exact API parameters depend on the Endtest execution being configured.

## Requirements

Local extension development requires:

- Node.js 20.12.2 or newer
- npm
- Netlify CLI
- a Netlify account
- an Endtest account for execution testing

## Local development

Clone the repository and install the dependencies:

```bash
git clone git@github.com:endtest-technologies/endtest-netlify-extension.git
cd endtest-netlify-extension
npm install
```

Build the extension:

```bash
npm run build
```

Start the extension development server:

```bash
npm run dev
```

## Local build-handler testing

Create a separate Netlify test project beside the extension repository.

Example directory structure:

```text
~/endtest-netlify-extension
~/endtest-netlify-test-site
```

Add the local extension to the test project's `netlify.toml`:

```toml
[build]
publish = "."

[[integrations]]
name = "endtest"

[integrations.dev]
path = "../endtest-netlify-extension"
```

Run the test build:

```bash
netlify build --context=dev
```

For a one-time local test, the required values can be supplied directly to the command:

```bash
ENDTEST_ENABLED='true' \
ENDTEST_APP_ID='YOUR_APP_ID' \
ENDTEST_APP_CODE='YOUR_APP_CODE' \
ENDTEST_API_REQUEST='YOUR_ENDTEST_API_REQUEST' \
ENDTEST_NUMBER_OF_LOOPS='10' \
ENDTEST_POLL_INTERVAL_SECONDS='5' \
netlify build --context=dev
```

Do not commit real Endtest credentials to this repository.

## Build

The production extension build is generated with:

```bash
npm run build
```

The generated extension files are written to the `.ntli` directory.

## Important limitation

The extension uses Netlify's `onSuccess` build event.

Endtest therefore runs after the Netlify deployment has completed. A failed Endtest execution is reported in the deployment summary, but it cannot remove or roll back the completed deployment.

## Security

The extension requests only the Netlify permissions required to manage its project-level environment variables:

- Environment variables: Read
- Environment variables: Write
- Environment variables: Delete

Customer credentials are not stored in this repository.

## Support

For setup instructions and troubleshooting, read the [Endtest Netlify integration documentation](https://endtest.io/docs/integrations/netlify).

For general product information, visit [Endtest](https://endtest.io/).

## License

Copyright Endtest. All rights reserved.
