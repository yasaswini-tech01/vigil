import mercury from "@mercury-js/core";
import bcrypt from "bcryptjs";
import { redisConnection } from "../utils/redis";
import { sendOtpEmail } from "../utils/sendEmail";
import { sendOtpSms } from "../utils/sendSms";
import { ApolloCtx, ctxUser } from "../connect";
import { setContext } from "../helpers/setContext.ts";
import jwt from "jsonwebtoken";
import { ensureContactForSender } from "../elastic-search/functions.ts"
import { UserOAuthTokens } from "../models/UserOAuthTokens.ts";
import { decrypt } from "dotenv";
import mongoose from "mongoose";
import { google } from "googleapis";
import { GraphQLError } from "graphql";
import dotenv from "dotenv";
dotenv.config();
export const resolvers = {
  Query: {
    hello: (_: any, { name }: { name: string }) =>
      `Hello ${name || "World"}`,
    getGmailConsentUrl: async (_: any,{ input }: { input: { token ?:string } }, ctx: any) => {
    if (!ctx.user?.id) {
      throw new GraphQLError("Unauthorized");
    }
    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URI
    );
    console.log(oauth2Client,"oauth2Client...");
    let gmailOAuthClient=oauth2Client;
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      state: ctx.user.id, // VERY IMPORTANT
    });
    console.log(url,"url...");
    console.log(gmailOAuthClient,"gmailOAuthClient...");
    return {url,gmailOAuthClient};
    },
    getImportantNotifications: async (
    _: any,
    { input }: { input?: { limit?: number; minPriority?: number } },
    ctx: any
    ) => {
    try {
      const ownerUserId = ctx.user.id;
      const limit = input?.limit ?? 20;
      const minPriority = input?.minPriority ?? 80;
      const notifications = await mercury.db.Message.mongoModel.find(
        {
          ownerUserId,
          channel: "EMAIL",
          isRead: false,
          isArchived: false,
          isDeleted: false,
          isActive: true,
          priorityScore: { $gte: minPriority },
        },
        {
          messageId: 1,
          senderEmail: 1,
          senderName: 1,
          subject: 1,
          sent_at: 1,
          priorityScore: 1,
          threadId: 1,
          contactId: 1,
        }
      )
        .sort({
          priorityScore: -1,
          sent_at: -1,
        })
        .limit(limit)
        .lean();
      console.log(notifications,"notifications");
      return {
        count: notifications.length,
        notifications,
      };
    } catch (error) {
      console.error("getImportantNotifications error:", error);
      return {
        count: 0,
        notifications: [],
      };
  };
    }
  },
  Mutation: {
    signUp: async (
      _: any,
      { input }: { input: any },
      ctx: ApolloCtx
      ) => {
      const { email, phone, name, password } = input;
      const authCtx = {
        id: "system",
        profile: "SUPER_ADMIN",
      };
      const existingUser = await mercury.db.User.get(
        { $or: [{ email }, { phone }] },
        authCtx
      );

      if (existingUser) {
        throw new Error("User with this email or phone already exists");
      }
      const newUser = await mercury.db.User.create(
        {
          email,
          phone,
          name,
          password,
        },
        authCtx
      );
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log("Generated OTP:", otp);
      await redis.setex(`otp:${newUser.id}`, 300, otp);
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPhone = phone.trim();
      await redis.setex(`otp:email:${normalizedEmail}`, 300, otp);
      await redis.setex(`otp:phone:${normalizedPhone}`, 300, otp);
      try {
        await Promise.all([
          sendOtpEmail(email, otp),
          sendOtpSms(phone, otp)
        ]);
      } catch (error) {
        console.error("Notification failed:", error);
      }

      return {
        message: "User registered successfully. Please verify your email and phone using the OTP sent.",
        userId: newUser.id
      };
    },
    verifyOtp: async (
      _: any,
      {
        input: { userId, otp },
      }: {
        input: {
          userId: string;
          otp: string;
        };
      },
      ctx: ApolloCtx
    ) => {
      const authCtx = {
        id: "system",
        profile: "SUPER_ADMIN",
      };

      const storedOtp = await redis.get(`otp:${userId}`);

      if (!storedOtp) {
        throw new Error("OTP expired or not found");
      }

      if (storedOtp !== otp) {
        throw new Error("Invalid OTP");
      }

      await mercury.db.User.update(
        { _id: userId },
        {
          isEmailVerified: true,
          isPhoneVerified: true,
        },
        authCtx
      );

      await redis.del(`otp:${userId}`);

      return {
        message: "OTP verified successfully",
      };
    },
    verifyPhoneOtp: async (
      _: any,
      {
        input: { phone, otp },
      }: {
        input: {
          phone: string;
          otp: string;
        };
      }
    ) => {
      const authCtx = {
        id: "system",
        profile: "SUPER_ADMIN",
      };

      const storedOtp = await redis.get(`otp:phone:${phone}`);

      if (!storedOtp) {
        throw new Error("Phone OTP expired or not found");
      }

      if (storedOtp !== otp) {
        throw new Error("Invalid Phone OTP");
      }

      const users = await mercury.db.User.list(
        { phone },
        authCtx
      );

      if (users.length === 0) {
        throw new Error("User not found");
      }

      await mercury.db.User.update(
        { _id: users[0].id },
        { isPhoneVerified: true },
        authCtx
      );

      await redis.del(`otp:phone:${phone}`);

      return {
        message: "Phone number verified successfully",
      };
    },
    verifyEmailOtp: async (
      _: any,
      {
        input: { email, otp },
      }: {
        input: {
          email: string;
          otp: string;
        };
      }
    ) => {
      const authCtx = {
        id: "system",
        profile: "SUPER_ADMIN",
      };
      const normalizedEmail = email.trim().toLowerCase();
      const storedOtp = await redis.get(`otp:email:${normalizedEmail}`);


      if (!storedOtp) {
        throw new Error("Email OTP expired or not found");
      }

      if (storedOtp !== otp) {
        throw new Error("Invalid Email OTP");
      }


      const users = await mercury.db.User.list(
        { email },
        authCtx
      );

      if (users.length === 0) {
        throw new Error("User not found");
      }

      await mercury.db.User.update(
        { _id: users[0].id },
        { isEmailVerified: true },
        authCtx
      );


      await redis.del(`otp:email:${email}`);

      return {
        message: "Email verified successfully",
      };
    },
    signIn: async (
      _: any,
      {
        input: { identifier, password },
      }: {
        input: {
          identifier: string;
          password: string;
        };
      },
      ctx: any
    ) => {
      const authCtx = {
        id: "system",
        profile: "SUPER_ADMIN",
      };

      const users = await mercury.db.User.list(
        {
          $or: [{ email: identifier }, { phone: identifier }],
        },
        authCtx
      );

      if (users.length === 0) {
        throw new Error("Invalid credentials");
      }

      const user = users[0];

      if (!user.isEmailVerified || !user.isPhoneVerified) {
        throw new Error("Please verify email and phone");
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password
      );

      if (!isPasswordValid) {
        throw new Error("Invalid credentials");
      }
      // const token = jwt.sign(
      //   {
      //     userId: user.id,
      //     profile: user.role ?? "USER",
      //   },
      //   process.env.SECRET_TOKEN_KEY!,
      //   {
      //     expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      //   }
      // );
      const token = ctx.base.Auth.createSession({
        id:user.id,
        name:user.name,
        phone:user.phone,
        email:user.email
        });
        console.log(token,"token....");

      await mercury.db.User.update(
        { _id: user.id },
        { lastLoginAt: new Date() },
        authCtx
      );
      return {
        message: "Sign in successful",
        userId: user.id,
        token,
      };
    },
    creatingEmailContact: async (_: any,  { input }: { input: { senderEmail: string } }, ctx:any) => {
    try {
    const ownerUserId = new mongoose.Types.ObjectId(ctx.user.id);

    // 1️⃣ Fetch sender stats
    const senderStats = await mercury.db.SenderStats.mongoModel.findOne({
      ownerUserId,
      senderEmail: input.senderEmail,
    });
    console.log(senderStats,"senderstats");

    if (!senderStats) {
      return { contactId: null };
    }

    // 2️⃣ Already linked → return
    if (senderStats.contactId) {
      return { contactId: senderStats.contactId };
    }

    // 3️⃣ Not enough signal yet
    if (senderStats.emailCount < 3) {
      return { contactId: null };
    }
    // 4️⃣ Create contact (idempotent)
    const contactId = await ensureContactForSender(
      {
        ownerUserId: senderStats.ownerUserId.toString(),
        senderEmail: senderStats.senderEmail,
        relationship:"STRANGER"
      },
    );

    // 5️⃣ Link back atomically
    await mercury.db.SenderStats.mongoModel.updateOne(
      { _id: senderStats._id, contactId: null },
      { $set: { contactId } }
    );
    return { contactId };
  } catch (error) {
    console.error("creatingEmailContact error:", error);
    return { contactId: null };
  }
    },
    updatingEmailContact: async (
      _: any,  
      { input:{senderEmail,relationship} }: { input: { senderEmail: string,relationship:string } }, 
      ctx:any) => {
      try {
         const ownerUserId=ctx.user.id
         const senderStats = await mercury.db.SenderStats.mongoModel.findOne({
            ownerUserId,
            senderEmail:senderEmail,
          });
          console.log(senderStats,"senderstats");
          if (!senderStats.contactId) {
            const contactId = await ensureContactForSender(
              {
                ownerUserId: senderStats.ownerUserId.toString(),
                senderEmail: senderStats.senderEmail,
                relationship:relationship
              },
            );
            console.log(contactId,"contactId");
          }
          else{
            const updated= await mercury.db.Contact.mongoModel.updateOne(
              {
                  primaryEmail:senderEmail,
                  ownerUserId
              },
              {
                $set: {
                  relationship,
                  updatedOn: new Date()
                  }
                }
              );
              console.log(updated,"updatedcontact");
          }
          return true
      } catch (error) {
        console.error("creatingEmailContact error:", error);
        return { contactId: null };
      }
    },
}
};
