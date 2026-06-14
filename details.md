# Endtest

Run Endtest automated web tests after successful Netlify deployments.

The Endtest extension starts a configurable Endtest execution when a Netlify deployment completes successfully. It waits for the execution to finish and displays the results in the Netlify deploy summary.

## Requirements

Before configuring the extension, you need:

* an Endtest account
* your Endtest App ID
* your Endtest App Code
* a complete Endtest API request for the test execution you want to run

## Configuration

After installing the extension on your Netlify team:

1. Open the Netlify project where you want to run Endtest.
2. Open the Endtest configuration surface for that project.
3. Enter your Endtest App ID.
4. Enter your Endtest App Code.
5. Paste the Endtest API request that starts your execution.
6. Choose the maximum number of result checks.
7. Select **Save and enable Endtest**.

Configuration is stored separately for each Netlify project.

## Deployment URL placeholder

You can include the following placeholder anywhere inside the Endtest API request:

`{{NETLIFY_DEPLOY_URL}}`

The extension replaces it with the URL of the current Netlify deployment before starting the Endtest execution.

## Execution behavior

After a successful deployment, the extension:

1. sends the configured API request to Endtest
2. receives the execution hash
3. checks the execution status every 30 seconds
4. displays the test suite, environment, test counts, and result in the Netlify deployment summary

The execution is considered successful when Endtest reports zero failed assertions and zero execution errors.

## Important limitation

Endtest runs after the Netlify deployment has completed. A failed Endtest execution is displayed as an extension failure, but it does not remove or roll back the deployment.

## Security

The Endtest App Code is stored as a secret, build-scoped Netlify environment variable. Credentials are not committed to the website repository.

## Support

For product documentation and support, visit the Endtest website.

