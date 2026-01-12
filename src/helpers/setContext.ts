import { baseApis } from "./baseApi";
import { Base } from "../connect";
import { GraphQLError } from "graphql";
import { google } from "googleapis";
export const setContext = async (req: any) => {
  const base = new Base();
  const requestedApi: string = getRequestedApi(req.body.query);
  const headerProfile = req.headers["profile"] || "SUPER_ADMIN";
  if (headerProfile !== "SUPER_ADMIN") {
    throw new GraphQLError("Access Denied", {
      extensions: { http: { status: 403 } }
    });
  }
  let gmailOAuthClient = null;
  if (req.session?.googleTokens){
     const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URI
    );
    oauth2Client.setCredentials(req.session.googleTokens);
    gmailOAuthClient = oauth2Client;
  }
  const context = {
    profile: headerProfile,
    user: { profile: headerProfile },
    base,
    gmailOAuthClient
  };
  return context;
};
const getRequestedApi = (query: string) => {
  return query?.split("(")[0]?.trim().split(" ")[1]?.toLowerCase();
};