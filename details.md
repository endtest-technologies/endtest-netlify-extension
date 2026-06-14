![Endtest logo](/assets/endtest-logo.png)

# Endtest

[Endtest](https://endtest.io/) is a cloud platform for creating, running, and maintaining automated web and mobile tests.

The Endtest Netlify extension automatically starts a configured Endtest execution after a successful Netlify deployment, waits for the execution to finish, and displays the results in the Netlify deploy summary.

## Features

- Run Endtest tests automatically after successful deployments
- Use a different Endtest configuration for each Netlify project
- Supply any supported Endtest API request
- Test the current Netlify deployment using `{{NETLIFY_DEPLOY_URL}}`
- Wait for the Endtest execution to complete
- View test suite, environment, test counts, and execution results in Netlify
- Report failed assertions and execution errors
- Keep the Endtest App Code in a secret Netlify environment variable

## Requirements

Before configuring the extension, you need:

- an [Endtest account](https://endtest.io/)
- your Endtest App ID
- your Endtest App Code
- a complete Endtest API request for the test execution you want to run

Your App ID and App Code are available in your Endtest account settings.

## Configuration

After installing the extension on your Netlify team:

1. Open the Netlify project where you want to run Endtest.
2. Open the Endtest configuration page for that project.
3. Enter your Endtest App ID.
4. Enter your Endtest App Code.
5. Paste the Endtest API request that starts your execution.
6. Choose the maximum number of result checks.
7. Select **Save and enable Endtest**.

The configuration is stored separately for each Netlify project.

For complete setup instructions, read the [Endtest Netlify integration guide](https://endtest.io/docs/integrations/netlify).

## Endtest API request

The API request determines which Endtest test suite and configuration will run.

For example, it can define:

- the test suite
- the browser
- the operating system
- the screen resolution
- the geolocation
- the test cases to execute
- execution notes

The App ID and App Code do not need to be included in the saved API request. The extension adds them automatically using the values entered in the configuration screen.

Learn more in the [Endtest API documentation](https://endtest.io/docs/advanced/how-to-use-the-endtest-api).

## Deployment URL placeholder

You can include this placeholder anywhere inside the Endtest API request:

```text
{{NETLIFY_DEPLOY_URL}}
```

Before starting the Endtest execution, the extension replaces the placeholder with the URL of the current Netlify deployment.

This can be used to run tests against production deployments, branch deployments, and Deploy Previews.

## Execution behavior

After a successful Netlify deployment, the extension:

1. sends the configured API request to Endtest
2. receives the Endtest execution hash
3. checks the execution status every 30 seconds
4. waits until the execution finishes or reaches the configured limit
5. displays the execution details in the Netlify deploy summary

The execution is considered successful when Endtest reports:

- zero failed assertions
- zero execution errors
- no explicit failure or error status

A test can contain zero assertions. In that situation, a result with zero failed assertions and zero execution errors is still considered successful.

## Disabling the extension

You can disable Endtest for an individual Netlify project from its Endtest configuration page.

Disabling the extension stops new Endtest executions for that project without deleting the saved App ID, App Code, or API request.

## Important limitation

Endtest runs after the Netlify deployment has completed.

A failed Endtest execution is shown as an extension failure in the Netlify deploy summary, but it does not remove, cancel, or roll back the deployment that has already completed.

## Security

The Endtest App Code is stored as a secret, build-scoped Netlify environment variable.

The App Code is not included in the website repository and is hidden from the extension's deployment logs.

The extension only requests permission to read, write, and delete project environment variables.

## Documentation and support

- [Endtest Netlify integration guide](https://endtest.io/docs/integrations/netlify)
- [Endtest API documentation](https://endtest.io/docs/advanced/how-to-use-the-endtest-api)
- [Endtest documentation](https://endtest.io/docs)
- [Endtest website](https://endtest.io/)
