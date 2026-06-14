import { TRPCError } from "@trpc/server";
import { procedure, router } from "./trpc.js";
import { TeamConfigSchema } from "../schema/team-config.js";
import { SiteConfigSchema } from "../schema/site-config.js";

const ENDTEST_ENABLED = "ENDTEST_ENABLED";
const ENDTEST_APP_ID = "ENDTEST_APP_ID";
const ENDTEST_APP_CODE = "ENDTEST_APP_CODE";
const ENDTEST_API_REQUEST = "ENDTEST_API_REQUEST";
const ENDTEST_NUMBER_OF_LOOPS = "ENDTEST_NUMBER_OF_LOOPS";

export const appRouter = router({
  teamSettings: {
    query: procedure.query(async ({ ctx: { teamId, client } }) => {
      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "teamId is required",
        });
      }

      const teamConfig = await client.getTeamConfiguration(teamId);

      if (!teamConfig) {
        return;
      }

      const result = TeamConfigSchema.safeParse(teamConfig.config);

      if (!result.success) {
        console.warn(
          "Failed to parse team settings",
          JSON.stringify(result.error, null, 2),
        );
      }

      return result.data;
    }),

    mutate: procedure
      .input(TeamConfigSchema)
      .mutation(async ({ ctx: { teamId, client }, input }) => {
        if (!teamId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "teamId is required",
          });
        }

        try {
          const existingConfig = await client.getTeamConfiguration(teamId);

          if (!existingConfig) {
            await client.createTeamConfiguration(teamId, input);
          } else {
            await client.updateTeamConfiguration(teamId, {
              ...(existingConfig.config || {}),
              ...input,
            });
          }
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to save team configuration",
            cause: error,
          });
        }
      }),
  },

  siteSettings: {
    query: procedure.query(
      async ({ ctx: { teamId, siteId, client } }) => {
        if (!teamId || !siteId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Both teamId and siteId are required",
          });
        }

        const envVars = await client.getEnvironmentVariables({
          accountId: teamId,
          siteId,
        });

        const getValue = (key: string) =>
          envVars
            .find((variable) => variable.key === key)
            ?.values.find((value) => value.context === "all")
            ?.value || "";

        const numberOfLoops = Number(
          getValue(ENDTEST_NUMBER_OF_LOOPS) || "10",
        );

        return {
          enabled: getValue(ENDTEST_ENABLED) === "true",
          appId: getValue(ENDTEST_APP_ID),
          apiRequest: getValue(ENDTEST_API_REQUEST),
          numberOfLoops:
            Number.isInteger(numberOfLoops) && numberOfLoops > 0
              ? numberOfLoops
              : 10,
          hasAppCode: Boolean(
            envVars.find(
              (variable) => variable.key === ENDTEST_APP_CODE,
            ),
          ),
        };
      },
    ),

    save: procedure
      .input(SiteConfigSchema)
      .mutation(
        async ({ ctx: { teamId, siteId, client }, input }) => {
          if (!teamId || !siteId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Both teamId and siteId are required",
            });
          }

          const envVars = await client.getEnvironmentVariables({
            accountId: teamId,
            siteId,
          });

          const existingAppCodeVariable = envVars.find(
            (variable) => variable.key === ENDTEST_APP_CODE,
          );

          if (!input.appCode && !existingAppCodeVariable) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Endtest App Code is required",
            });
          }

          try {
            await client.createOrUpdateVariable({
              accountId: teamId,
              siteId,
              key: ENDTEST_APP_ID,
              value: input.appId,
            });

            if (input.appCode) {
		await client.createOrUpdateVariable({
 			accountId: teamId,
 			 siteId,
 			 key: ENDTEST_APP_CODE,
 			 value: input.appCode,
		});   
            }

            await client.createOrUpdateVariable({
              accountId: teamId,
              siteId,
              key: ENDTEST_API_REQUEST,
              value: input.apiRequest,
            });

            await client.createOrUpdateVariable({
              accountId: teamId,
              siteId,
              key: ENDTEST_NUMBER_OF_LOOPS,
              value: String(input.numberOfLoops),
            });

            await client.createOrUpdateVariable({
              accountId: teamId,
              siteId,
              key: ENDTEST_ENABLED,
              value: "true",
            });

            return {
              success: true,
              message: "Endtest configuration saved successfully",
            };
          } catch (error) {
            console.error(
              `Failed to save Endtest configuration: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            );

            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to save Endtest configuration",
              cause: error,
            });
          }
        },
      ),
  },

  buildEventHandler: {
    status: procedure.query(
      async ({ ctx: { teamId, siteId, client } }) => {
        if (!teamId || !siteId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Both teamId and siteId are required",
          });
        }

        const envVars = await client.getEnvironmentVariables({
          accountId: teamId,
          siteId,
        });

        const enabledVar = envVars
          .find((variable) => variable.key === ENDTEST_ENABLED)
          ?.values.find((value) => value.context === "all");

        return {
          enabled: enabledVar?.value === "true",
        };
      },
    ),

    enable: procedure.mutation(
      async ({ ctx: { teamId, siteId, client } }) => {
        if (!teamId || !siteId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Both teamId and siteId are required",
          });
        }

        try {
          await client.createOrUpdateVariable({
            accountId: teamId,
            siteId,
            key: ENDTEST_ENABLED,
            value: "true",
          });

          return {
            success: true,
            message: "Endtest enabled successfully",
          };
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to enable Endtest",
            cause: error,
          });
        }
      },
    ),

    disable: procedure.mutation(
      async ({ ctx: { teamId, siteId, client } }) => {
        if (!teamId || !siteId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Both teamId and siteId are required",
          });
        }

        try {
          await client.deleteEnvironmentVariable({
            accountId: teamId,
            siteId,
            key: ENDTEST_ENABLED,
          });

          return {
            success: true,
            message: "Endtest disabled successfully",
          };
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to disable Endtest",
            cause: error,
          });
        }
      },
    ),
  },
});

export type AppRouter = typeof appRouter;
