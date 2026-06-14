// Documentation: https://sdk.netlify.com/docs

import { NetlifyExtension } from "@netlify/sdk";
import type { TeamConfig } from "./schema/team-config.js";
import type { SiteConfig } from "./schema/site-config.js";

type JsonRecord = Record<string, unknown>;

const DEFAULT_NUMBER_OF_LOOPS = 10;
const DEFAULT_POLL_INTERVAL_SECONDS = 30;
const REQUEST_TIMEOUT_MILLISECONDS = 60_000;

const extension = new NetlifyExtension<SiteConfig, TeamConfig>();

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function parseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getCandidateObjects(value: unknown): JsonRecord[] {
  const candidates: JsonRecord[] = [];

  const addCandidate = (candidate: unknown) => {
    if (
      isRecord(candidate) &&
      !candidates.includes(candidate)
    ) {
      candidates.push(candidate);
    }
  };

  if (Array.isArray(value)) {
    for (const item of value) {
      addCandidate(item);
    }
  } else {
    addCandidate(value);
  }

  for (const candidate of [...candidates]) {
    addCandidate(candidate.data);
    addCandidate(candidate.result);
    addCandidate(candidate.results);
    addCandidate(candidate.execution);
  }

  return candidates;
}

function readValue(
  value: unknown,
  keys: string[],
): unknown {
  for (const candidate of getCandidateObjects(value)) {
    for (const key of keys) {
      if (
        Object.prototype.hasOwnProperty.call(candidate, key)
      ) {
        return candidate[key];
      }
    }
  }

  return undefined;
}

function readText(
  value: unknown,
  keys: string[],
): string | null {
  const field = readValue(value, keys);

  if (typeof field === "string" && field.trim()) {
    return field.trim();
  }

  if (
    typeof field === "number" ||
    typeof field === "boolean"
  ) {
    return String(field);
  }

  return null;
}

function readCount(
  value: unknown,
  keys: string[],
): number | null {
  const field = readValue(value, keys);

  if (
    typeof field === "number" &&
    Number.isFinite(field)
  ) {
    return field;
  }

  if (
    typeof field === "string" &&
    field.trim() !== ""
  ) {
    const parsed = Number(field);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (Array.isArray(field)) {
    return field.length;
  }

  return null;
}

function extractHash(responseText: string): string | null {
  const parsed = parseJson(responseText);

  const hashFromJson = readText(parsed, [
    "hash",
    "execution_hash",
    "executionHash",
    "test_run_hash",
    "testRunHash",
  ]);

  if (hashFromJson) {
    return hashFromJson;
  }

  const trimmed = responseText
    .trim()
    .replace(/^["']|["']$/g, "");

  if (/^[A-Za-z0-9_-]{16,128}$/.test(trimmed)) {
    return trimmed;
  }

  const match = responseText.match(
    /\b[a-fA-F0-9]{32,128}\b/,
  );

  return match?.[0] || null;
}

function isStillRunningText(responseText: string): boolean {
  const normalized = responseText.toLowerCase();

  return (
    normalized.includes("test is still running") ||
    normalized.includes("processing video recording")
  );
}

function isStillRunningJson(value: unknown): boolean {
  const status = readText(value, [
    "status",
    "state",
    "execution_status",
    "executionStatus",
  ])?.toLowerCase();

  if (!status) {
    return false;
  }

  return [
    "running",
    "processing",
    "pending",
    "queued",
    "starting",
    "in progress",
    "in_progress",
  ].includes(status);
}

function sanitizeUrl(url: URL): string {
  const safeUrl = new URL(url.toString());

  if (safeUrl.searchParams.has("appCode")) {
    safeUrl.searchParams.set("appCode", "[hidden]");
  }

  return safeUrl.toString();
}

function buildStartUrl(
  apiRequest: string,
  appId: string,
  appCode: string,
  deployUrl: string,
): URL {
  if (
    apiRequest.includes("{{NETLIFY_DEPLOY_URL}}") &&
    !deployUrl
  ) {
    throw new Error(
      "The API request uses {{NETLIFY_DEPLOY_URL}}, but Netlify did not provide a deployment URL.",
    );
  }

  const expandedRequest = apiRequest
    .split("{{NETLIFY_DEPLOY_URL}}")
    .join(deployUrl);

  let url: URL;

  try {
    url = new URL(expandedRequest);
  } catch {
    throw new Error(
      "ENDTEST_API_REQUEST must be a complete valid URL.",
    );
  }

  if (url.protocol !== "https:") {
    throw new Error(
      "ENDTEST_API_REQUEST must use HTTPS.",
    );
  }

  url.searchParams.set("appId", appId);
  url.searchParams.set("appCode", appCode);

  return url;
}

function buildResultsUrl(
  startUrl: URL,
  appId: string,
  appCode: string,
  hash: string,
): URL {
  const url = new URL(
    `${startUrl.origin}${startUrl.pathname}`,
  );

  url.searchParams.set("action", "getResults");
  url.searchParams.set("appId", appId);
  url.searchParams.set("appCode", appCode);
  url.searchParams.set("hash", hash);
  url.searchParams.set("format", "json");

  const apiVersion =
    startUrl.searchParams.get("apiVersion");

  if (apiVersion) {
    url.searchParams.set("apiVersion", apiVersion);
  }

  return url;
}

async function requestText(url: URL): Promise<string> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json, text/plain;q=0.9",
      "user-agent": "Endtest-Netlify-Extension/0.0.1",
    },
    signal: AbortSignal.timeout(
      REQUEST_TIMEOUT_MILLISECONDS,
    ),
  });

  const text = (await response.text()).trim();

  if (!response.ok) {
    throw new Error(
      `Endtest returned HTTP ${response.status}: ${
        text.slice(0, 500) || response.statusText
      }`,
    );
  }

  return text;
}

function createResultDetails(
  result: unknown,
  hash: string,
  deployUrl: string,
): {
  failed: number | null;
  errors: number | null;
  status: string | null;
  text: string;
} {
  const suiteName = readText(result, [
    "test_suite_name",
    "testSuiteName",
    "name",
  ]);

  const configuration = readText(result, [
    "configuration",
  ]);

  const status = readText(result, [
    "status",
    "state",
    "execution_status",
    "executionStatus",
  ]);

  const total = readCount(result, [
    "test_cases",
    "total_test_cases",
    "totalTestCases",
    "total",
  ]);

  const passed = readCount(result, [
    "passed",
    "total_passed",
    "totalPassed",
  ]);

  const failed = readCount(result, [
    "failed",
    "total_failed",
    "totalFailed",
  ]);

  const errors = readCount(result, [
    "errors",
    "total_errors",
    "totalErrors",
    "error_count",
    "errorCount",
  ]);

  const resultUrl = readText(result, [
    "result_url",
    "results_url",
    "resultUrl",
    "resultsUrl",
    "url",
  ]);

  const lines = [
    `Execution hash: ${hash}`,
    deployUrl
      ? `Netlify deployment: ${deployUrl}`
      : null,
    suiteName
      ? `Test suite: ${suiteName}`
      : null,
    configuration
      ? `Configuration: ${configuration}`
      : null,
    status ? `Status: ${status}` : null,
    total !== null
      ? `Test cases: ${total}`
      : null,
    passed !== null
      ? `Passed: ${passed}`
      : null,
    failed !== null
      ? `Failed: ${failed}`
      : null,
    errors !== null
      ? `Errors: ${errors}`
      : null,
    resultUrl
      ? `Endtest results: ${resultUrl}`
      : null,
  ].filter(
    (line): line is string => Boolean(line),
  );

  return {
    failed,
    errors,
    status,
    text: lines.join("\n"),
  };
}

function statusIndicatesFailure(
  status: string | null,
): boolean {
  if (!status) {
    return false;
  }

  const normalized = status.toLowerCase();

  return (
    normalized.includes("error") ||
    normalized.includes("failed") ||
    normalized.includes("cancelled") ||
    normalized.includes("canceled") ||
    normalized.includes("stopped")
  );
}

extension.addBuildEventHandler(
  "onSuccess",
  async ({ utils }) => {
    if (process.env["ENDTEST_ENABLED"] !== "true") {
      return;
    }

    const appId =
      process.env["ENDTEST_APP_ID"]?.trim();
    const appCode =
      process.env["ENDTEST_APP_CODE"]?.trim();
    const apiRequest =
      process.env["ENDTEST_API_REQUEST"]?.trim();

    if (!appId || !appCode || !apiRequest) {
      utils.build.failBuild(
        "Endtest is enabled, but its App ID, App Code, or API request is missing.",
      );
      return;
    }

    const configuredLoops = Number(
      process.env["ENDTEST_NUMBER_OF_LOOPS"] ||
        DEFAULT_NUMBER_OF_LOOPS,
    );

    const numberOfLoops =
      Number.isInteger(configuredLoops) &&
      configuredLoops >= 1 &&
      configuredLoops <= 120
        ? configuredLoops
        : DEFAULT_NUMBER_OF_LOOPS;

    const configuredInterval = Number(
      process.env[
        "ENDTEST_POLL_INTERVAL_SECONDS"
      ] || DEFAULT_POLL_INTERVAL_SECONDS,
    );

    const pollIntervalSeconds =
      Number.isFinite(configuredInterval) &&
      configuredInterval >= 1
        ? configuredInterval
        : DEFAULT_POLL_INTERVAL_SECONDS;

    const deployUrl =
      process.env["DEPLOY_PRIME_URL"] ||
      process.env["URL"] ||
      "";

    try {
      const startUrl = buildStartUrl(
        apiRequest,
        appId,
        appCode,
        deployUrl,
      );

      console.log(
        "Starting Endtest execution after successful Netlify deployment.",
      );
      console.log(
        `Endtest API request: ${sanitizeUrl(startUrl)}`,
      );

      const startResponse =
        await requestText(startUrl);

      const hash = extractHash(startResponse);

      if (!hash) {
        throw new Error(
          `Endtest did not return an execution hash. Response: ${startResponse.slice(
            0,
            500,
          )}`,
        );
      }

      console.log(
        `Endtest execution started with hash ${hash}.`,
      );

      const resultsUrl = buildResultsUrl(
        startUrl,
        appId,
        appCode,
        hash,
      );

      let finalResult: unknown | null = null;

      for (
        let attempt = 1;
        attempt <= numberOfLoops;
        attempt += 1
      ) {
        console.log(
          `Waiting ${pollIntervalSeconds} seconds before Endtest result check ${attempt} of ${numberOfLoops}.`,
        );

        await sleep(pollIntervalSeconds * 1000);

        const responseText =
          await requestText(resultsUrl);

        if (isStillRunningText(responseText)) {
          console.log(
            "The Endtest execution is still running.",
          );
          continue;
        }

        const parsedResult = parseJson(responseText);

        if (parsedResult === null) {
          throw new Error(
            `Endtest returned an invalid results response: ${responseText.slice(
              0,
              500,
            )}`,
          );
        }

        if (isStillRunningJson(parsedResult)) {
          console.log(
            "The Endtest execution is still running.",
          );
          continue;
        }

        finalResult = parsedResult;
        break;
      }

      if (finalResult === null) {
        utils.status.show({
          title: "Endtest",
          summary:
            "The Endtest execution timed out",
          text: `Execution hash: ${hash}\nNo final result was returned after ${numberOfLoops} checks.`,
        });

        utils.build.failBuild(
          `Endtest execution ${hash} did not finish within the configured polling period.`,
        );

        return;
      }

      const details = createResultDetails(
        finalResult,
        hash,
        deployUrl,
      );

      const failed =
        details.failed !== null
          ? details.failed
          : 0;

      const errors =
        details.errors !== null
          ? details.errors
          : 0;

      const executionFailed =
        failed > 0 ||
        errors > 0 ||
        statusIndicatesFailure(details.status);

      if (executionFailed) {
        utils.status.show({
          title: "Endtest",
          summary:
            "The Endtest execution completed with failures",
          text: details.text,
        });

        utils.build.failBuild(
          `Endtest execution ${hash} reported ${failed} failed tests and ${errors} execution errors.`,
        );

        return;
      }

      utils.status.show({
        title: "Endtest",
        summary:
          "The Endtest execution completed successfully",
        text: details.text,
      });

      console.log(details.text);
    } catch (error) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error(String(error));

      console.error(
        `Endtest integration error: ${normalizedError.message}`,
      );

      utils.build.failBuild(
        "The Endtest execution could not be completed.",
        {
          error: normalizedError,
        },
      );
    }
  },
);

export { extension };
