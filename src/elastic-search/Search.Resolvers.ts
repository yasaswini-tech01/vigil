import mercury from "@mercury-js/core";
import mongoose from "mongoose";
import { ApolloCtx, ctxUser } from "../connect";
import { getemailsandcount, getcontactsinfo } from "../elastic-search/functions.ts"
import { UserOAuthTokens } from "../models/UserOAuthTokens.ts";
import { decrypt } from "dotenv";
export const resolvers = {
  Query: {
    hello: (_: any, { name }: { name: string }) =>
      `Hello ${name || "World"}`,
    emailsAndContactsDisplay: async (
    _: any,
    { input }: { input: any },
    ctx: ApolloCtx
    ) => {
    const { ownerUserId, isMsg, isEmail } = input;
    const UserSchema = mercury.db.User;
    const ownerId = new mongoose.Types.ObjectId(ownerUserId);
    const ownerUser = await UserSchema.get(
      { _id: ownerId },
      { id: "1", profile: "SUPERADMIN" }
    );
    if (!ownerUser) {
      throw new Error("User not registered. Please signup to continue");
    }
    const response: any[] = [];
    if (isEmail === true) {
      if (!ctx.gmailOAuthClient) {
        throw new Error("Email consent not granted");
      }
      const emails = await getemailsandcount(ctx.gmailOAuthClient);
      emails.forEach(e => {
        response.push({
          email: e.email,
          messageCount: e.messageCount
        });
      });
    }
    if (isMsg === true) {
      const contacts = await getcontactsinfo(ownerUser._id);
      contacts.forEach(c => {
        response.push({
          contact: c.contact,
          messageCount: c.messageCount
        });
      });
    }
    return response;
    }
  },
};

