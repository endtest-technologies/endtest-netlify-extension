# Endtest Netlify Extension

The official Netlify extension for running Endtest automated tests after successful Netlify deployments.

## Features

* Runs any dynamically supplied Endtest API request
* Uses each customer's own Endtest App ID and App Code
* Supports project-specific configuration
* Supports `{{NETLIFY_DEPLOY_URL}}` replacement
* Polls Endtest until the execution finishes
* Displays execution results in the Netlify deploy summary
* Reports failed assertions and execution errors

## Local development

Install dependencies:

```bash
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

## Local build handler testing

Create a separate linked Netlify test project and add the local extension to its `netlify.toml`:

```toml
[[integrations]]
name = "endtest"

[integrations.dev]
path = "../endtest-netlify-extension"
```

Then run:

```bash
netlify build --context=dev
```

## License

Copyright Endtest. All rights reserved.

