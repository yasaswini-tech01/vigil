import { google } from "googleapis";
import mercury from "@mercury-js/core";
import { baseApis } from "./baseApi";
import { Base, Connect } from "../connect";
import { GraphQLError } from "graphql";
import { parse } from "graphql";

export const setContext = async (req: any) => {
  console.log(req.header,"req.header")
  console.log(req.headers.authorization,"eree")
  const base = new Base();
  const requestedApi: string = getRequestedApi(req.body.query);
  console.log(requestedApi,"requestedApi...");
  if (!requestedApi || requestedApi === "introspectionquery") {
    return { ...req, user: { profile: "Anonymous" } };
  }
  try {
    if (baseApis.includes(requestedApi)) {
      return { ...req, user: { profile: "Anonymous" }, base };
    } else {
      if (!req.headers.authorization) {
        throw new GraphQLError("Authorization is required");
      }
      const session: string = req.headers.authorization;
      console.log(session,"session...");
      const connect = new Connect(session);
      console.log(connect,"connect...");
      try {
        connect.validateSession(session);
        let gmailOAuthClient = null;
        let hasGmailAccess = false;
        const tokenRecord = await mercury.db.UserOAuthTokens.get(
            {
              ownerUserId: connect.user.id,
              provider: "google"
            },
            { id: "system", profile: "SUPER_ADMIN" }
            );
            if (tokenRecord?.refreshToken) {
              const oauth2Client = new google.auth.OAuth2(
                process.env.CLIENT_ID,
                process.env.CLIENT_SECRET,
                process.env.REDIRECT_URI
              );
              oauth2Client.setCredentials({
                refresh_token: tokenRecord.refreshToken
              });
              gmailOAuthClient = oauth2Client;
              hasGmailAccess = true;
            }
        return { ...req, user: { ...connect.user, profile: connect.user?.role }, connect, base, gmailOAuthClient, hasGmailAccess };
      } catch (error: any) {
        throw new GraphQLError("Invalid Session!!", {
          extensions: {
            i18Key: "InvalidSession",
            http: { status: 401 },
          },
        });
      }
    }
  } catch (error: any) {
    throw new GraphQLError(error);
  }
};
// const getRequestedApi = (query: string) => {
//   const req = query?.split("(")[0]?.trim().split(" ")[1].toLowerCase();
//   return req;
// };

const getRequestedApi = (query: string): string | null => {
  if (!query) return null;

  try {
    const ast = parse(query);

    const operation = ast.definitions.find(
      (def: any) => def.kind === "OperationDefinition"
    ) as any;

    if (!operation) return null;

    const selection = operation.selectionSet.selections[0];

    return selection?.name?.value?.toLowerCase() || null;
  } catch (e) {
    return null;
  }
};


