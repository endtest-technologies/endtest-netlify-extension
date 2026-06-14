import { FormEvent, useEffect, useState } from "react";
import {
  Button,
  Card,
  CardLoader,
  CardTitle,
  SiteConfigurationSurface,
} from "@netlify/sdk/ui/react/components";
import { trpc } from "../trpc.js";

export const SiteConfiguration = () => {
  const trpcUtils = trpc.useUtils();

  const siteSettings = trpc.siteSettings.query.useQuery();

  const [appId, setAppId] = useState("");
  const [appCode, setAppCode] = useState("");
  const [apiRequest, setApiRequest] = useState("");
  const [numberOfLoops, setNumberOfLoops] = useState("10");

  useEffect(() => {
    if (!siteSettings.data) {
      return;
    }

    setAppId(siteSettings.data.appId);
    setApiRequest(siteSettings.data.apiRequest);
    setNumberOfLoops(String(siteSettings.data.numberOfLoops));
  }, [siteSettings.data]);

  const saveSettings = trpc.siteSettings.save.useMutation({
    onSuccess: async () => {
      setAppCode("");
      await trpcUtils.siteSettings.query.invalidate();
      await trpcUtils.buildEventHandler.status.invalidate();
    },
  });

  const enableBuildEventHandler =
    trpc.buildEventHandler.enable.useMutation({
      onSuccess: async () => {
        await trpcUtils.siteSettings.query.invalidate();
        await trpcUtils.buildEventHandler.status.invalidate();
      },
    });

  const disableBuildEventHandler =
    trpc.buildEventHandler.disable.useMutation({
      onSuccess: async () => {
        await trpcUtils.siteSettings.query.invalidate();
        await trpcUtils.buildEventHandler.status.invalidate();
      },
    });

  if (siteSettings.isLoading) {
    return <CardLoader />;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    saveSettings.mutate({
      appId,
      appCode: appCode || undefined,
      apiRequest,
      numberOfLoops: Number(numberOfLoops),
    });
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    marginTop: "6px",
    padding: "10px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
  };

  const fieldStyle = {
    display: "block",
    marginTop: "18px",
  };

  return (
    <SiteConfigurationSurface>
      <Card>
        <CardTitle>Configure Endtest</CardTitle>

        <p>
          Trigger an Endtest execution after a successful Netlify deployment.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={fieldStyle}>
            <strong>Endtest App ID</strong>

            <input
              style={inputStyle}
              type="text"
              value={appId}
              onChange={(event) => setAppId(event.target.value)}
              placeholder="Enter your Endtest App ID"
              required
            />
          </label>

          <label style={fieldStyle}>
            <strong>Endtest App Code</strong>

            <input
              style={inputStyle}
              type="password"
              value={appCode}
              onChange={(event) => setAppCode(event.target.value)}
              placeholder={
                siteSettings.data?.hasAppCode
                  ? "Leave blank to keep the saved App Code"
                  : "Enter your Endtest App Code"
              }
              required={!siteSettings.data?.hasAppCode}
              autoComplete="new-password"
            />
          </label>

          <label style={fieldStyle}>
            <strong>Endtest API request</strong>

            <textarea
              style={{
                ...inputStyle,
                minHeight: "150px",
                fontFamily: "monospace",
                resize: "vertical",
              }}
              value={apiRequest}
              onChange={(event) => setApiRequest(event.target.value)}
              placeholder="https://app.endtest.io/api.php?action=runWeb&..."
              required
            />
          </label>

          <p style={{ marginTop: "8px", fontSize: "13px" }}>
            You will be able to use {"{{NETLIFY_DEPLOY_URL}}"} inside the API
            request. The extension will replace it with the URL of the current
            Netlify deployment.
          </p>

          <label style={fieldStyle}>
            <strong>Maximum result checks</strong>

            <input
              style={inputStyle}
              type="number"
              min="1"
              max="120"
              value={numberOfLoops}
              onChange={(event) => setNumberOfLoops(event.target.value)}
              required
            />
          </label>

          <p style={{ marginTop: "8px", fontSize: "13px" }}>
            Endtest results will be checked every 30 seconds. The default value
            of 10 allows approximately five minutes for the execution.
          </p>

          <div style={{ marginTop: "22px" }}>
            <Button type="submit" loading={saveSettings.isPending}>
              Save and enable Endtest
            </Button>
          </div>
        </form>

        {saveSettings.isSuccess && (
          <p style={{ marginTop: "16px" }}>
            Endtest configuration was saved successfully.
          </p>
        )}

        {saveSettings.error && (
          <p style={{ marginTop: "16px" }}>
            Error: {saveSettings.error.message}
          </p>
        )}
      </Card>

      <Card>
        <CardTitle>Integration status</CardTitle>

        {siteSettings.data?.enabled ? (
          <>
            <p>Endtest is enabled for this Netlify project.</p>

            <Button
              className="tw-mt-4"
              loading={disableBuildEventHandler.isPending}
              onClick={() => disableBuildEventHandler.mutate()}
              variant="danger"
            >
              Disable Endtest
            </Button>
          </>
        ) : (
          <>
            <p>Endtest is currently disabled for this Netlify project.</p>

            {siteSettings.data?.appId &&
              siteSettings.data?.apiRequest &&
              siteSettings.data?.hasAppCode && (
                <Button
                  className="tw-mt-4"
                  loading={enableBuildEventHandler.isPending}
                  onClick={() => enableBuildEventHandler.mutate()}
                >
                  Enable Endtest
                </Button>
              )}
          </>
        )}
      </Card>
    </SiteConfigurationSurface>
  );
};
