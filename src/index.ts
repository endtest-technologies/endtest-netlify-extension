// Documentation: https://sdk.netlify.com/docs

import { NetlifyExtension } from "@netlify/sdk";
import type { TeamConfig } from "./schema/team-config.js";
import type { SiteConfig } from "./schema/site-config.js";

const extension = new NetlifyExtension<SiteConfig, TeamConfig>();
extension.addBuildEventHandler("onPreBuild", () => {
  // If the build event handler is not enabled, return early
  if (!process.env["ENDTEST_ENABLED"]) {
    return;
  }
  console.log("Hello there.");
});
export { extension };

