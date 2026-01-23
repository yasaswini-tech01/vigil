import { google } from "googleapis";
import mercury from "@mercury-js/core";
export const buildGmailOAuthClient = async (userId: string) => {
  const tokenRecord = await mercury.db.UserOAuthTokens.get(
    { ownerUserId: userId, provider: "google" },
    { id: "system", profile: "SUPER_ADMIN" }
  );

  if (!tokenRecord?.refreshToken) {
    return null;
  }
  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: tokenRecord.refreshToken
  });
  return oauth2Client;
};
