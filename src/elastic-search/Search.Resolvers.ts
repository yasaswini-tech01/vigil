import mercury from "@mercury-js/core";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { redis } from "../utils/redis";
import { sendOtpEmail } from "../utils/sendEmail";
import { sendOtpSms, sentMessage } from "../utils/sendSms";
import { ApolloCtx } from "../connect";
import { calculateFinalScore } from "../functions/finalScore";
import {
  getemailsandcount,
  getcontactsinfo,
  calculatePriorityScore,
} from "../functions";
import { runTopPriorityNotification } from "../utils";

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

      const authCtx = {
        id: ctx.user?.id ?? "system",
        profile: ctx.user?.profile ?? "SUPER_ADMIN",
      };
      const ownerUsers = await mercury.db.User.list(
        { _id: ownerUserId },
        authCtx
      );
      if (ownerUsers.length === 0) {
        throw new Error("User not registered");
      }

      const response: any[] = [];

      if (isEmail) {
        if (!ctx.gmailOAuthClient) {
          throw new Error("Email consent not granted");
        }

        const emails = await getemailsandcount(ctx.gmailOAuthClient);
        emails.forEach((e: any) => {
          response.push({
            email: e.email,
            messageCount: e.messageCount,
          });
        });
      }

      if (isMsg) {
        const contacts = await getcontactsinfo(ownerUserId);
        contacts.forEach((c: any) => {
          response.push({
            contact: c.contact,
            messageCount: c.messageCount,
          });
        });
      }

      return response;
    },
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

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPhone = phone.trim();

      const existingUsers = await mercury.db.User.list(
        {
          $or: [
            { email: normalizedEmail },
            { phone: normalizedPhone },
          ],
        },
        authCtx
      );

      if (existingUsers.length > 0) {
        throw new Error("User already exists");
      }

      const newUser = await mercury.db.User.create(
        {
          email: normalizedEmail,
          phone: normalizedPhone,
          name,
          password,
        },
        authCtx
      );

      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      await redis.setex(`otp:email:${normalizedEmail}`, 300, otp);
      await redis.setex(`otp:phone:${normalizedPhone}`, 300, otp);

      try {
        await Promise.all([
          sendOtpEmail(normalizedEmail, otp),
          sendOtpSms(normalizedPhone, otp),
        ]);
      } catch (err) {
        console.error("OTP notification failed", err);
      }

      return {
        message:
          "User registered successfully. Please verify email and phone.",
        userId: newUser.id,
      };
    },
    verifyPhoneOtp: async (
      _: any,
      { input }: { input: { phone: string; otp: string } }
    ) => {
      const authCtx = {
        id: "system",
        profile: "SUPER_ADMIN",
      };
      const phone = input.phone.trim();
      const storedOtp = await redis.get(`otp:phone:${phone}`);

      if (!storedOtp) {
        throw new Error("Phone OTP expired or not found");
      }

      if (storedOtp !== input.otp) {
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

      return { message: "Phone verified successfully" };
    },
    verifyEmailOtp: async (
      _: any,
      { input }: { input: { email: string; otp: string } }
    ) => {
      const authCtx = {
        id: "system",
        profile: "SUPER_ADMIN",
      };
      const email = input.email.trim().toLowerCase();
      const storedOtp = await redis.get(`otp:email:${email}`);

      if (!storedOtp) {
        throw new Error("Email OTP expired or not found");
      }

      if (storedOtp !== input.otp) {
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

      return { message: "Email verified successfully" };
    },
    signIn: async (
      _: any,
      { input }: { input: { identifier: string; password: string } },
      ctx: any // Ensure ctx is available here
    ) => {
      const authCtx = {
        id: "system",
        profile: "SUPER_ADMIN",
      };

      const identifier = input.identifier.trim().toLowerCase();

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

      const isValid = await bcrypt.compare(input.password, user.password);

      if (!isValid) {
        throw new Error("Invalid credentials");
      }
      console.log(user);
      // --- CHANGED SECTION START ---
      // Using Mercury's built-in session management
      const token = ctx.base.Auth.createSession({
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
      });

      console.log(token, "token....");
      // --- CHANGED SECTION END ---

      await mercury.db.User.update(
        { _id: user.id },
        { lastLoginAt: new Date() },
        authCtx
      );

      return {
        message: "Sign in successful",
        userId: user.id,
        token, // Returning the session token generated by Mercury
      };
    },
    creatingContact: async (
      _: any,
      {
        input: { contactUserId, relationship },
      }: {
        input: {
          contactUserId: string;
          relationship?: string;
        };
      },
      ctx: any
    ) => {
      console.log("Creating contacttt:", ctx);
      if (!ctx.user?.id) {
        throw new Error("Unauthorized");
      }
      const authCtx = { id: "system", profile: "SUPER_ADMIN" };
      const users = await mercury.db.User.list(
        { _id: contactUserId },
        authCtx
      );

      if (users.length === 0) {
        throw new Error("Contact user not found");
      }
      const contactUser = users[0];
      if (contactUser.id === ctx.user.id) {
        throw new Error("You cannot add yourself as a contact");
      }
      const existing = await mercury.db.Contact.list(
        {
          ownerUserId: ctx.user.id,
          contactUserId,
        },
        authCtx
      );

      if (existing.length > 0) {
        throw new Error("Contact already exists");
      }
      const contact = await mercury.db.Contact.create(
        {
          ownerUserId: ctx.user.id,
          contactUserId,
          email: contactUser.email,
          phone: contactUser.phone,
          ownerContactRelationship: relationship,
          isActive: true,
        },
        authCtx
      );

      return {
        id: contact.id,
        email: contact.email,
        phone: contact.phone,
        relationship: contact.ownerContactRelationship,
      };
    },
    updateMsgConsent: async (
      _: any,
      { input: { consent } }: { input: { consent: boolean } },
      ctx: ApolloCtx
    ) => {
      // 🔐 Must be logged in
      if (!ctx.user?.id) {
        throw new Error("Unauthorized");
      }

      const authCtx = { id: "system", profile: "SUPER_ADMIN" };

      // ✅ Update consent
      await mercury.db.User.update(
        { _id: ctx.user.id },
        {
          isMsgConsent: consent,
        },
        authCtx
      );

      return {
        message: consent
          ? "Message consent granted"
          : "Message consent revoked",
        isMsgConsent: consent,
      };
    },
    sendMessage: async (
      _: any,
      { input }: { input: any },
      ctx: ApolloCtx
    ) => {
      // 1️⃣ Auth check
      if (!ctx.user?.id) {
        throw new Error("Unauthorized");
      }

      // 2️⃣ System context for DB ops
      const authCtx = {
        id: "system",
        profile: "SUPER_ADMIN",
      };

      const receiverUserId = input.contactId; // rename mentally as receiverUserId

      // 3️⃣ ✅ Validate receiver user exists
      const receiver = await mercury.db.User.get(
        { _id: receiverUserId },
        authCtx
      );
      const phone = receiver?.phone.trim();





      if (!receiver) {
        throw new Error("Receiver user does not exist");
      }

      // 4️⃣ ✅ Find contact scoped to sender
      const contacts = await mercury.db.Contact.list(
        {
          ownerUserId: ctx.user.id,
          contactUserId: receiverUserId,
        },
        authCtx
      );

      let contact;

      // 5️⃣ Create contact if not found
      if (contacts.length === 0) {
        contact = await mercury.db.Contact.create(
          {
            ownerUserId: ctx.user.id,        // sender
            contactUserId: receiverUserId,   // receiver
            ownerContactRelationship: "STRANGER",
          },
          authCtx
        );
      } else {
        contact = contacts[0];
      }

      // 6️⃣ Calculate priority
      const priorityScore = calculatePriorityScore(
        contact.ownerContactRelationship,
        input.content
      );

      // 7️⃣ Create message (owned by receiver)
      const message = await mercury.db.Message.create(
        {
          ownerUserId: receiverUserId, // inbox owner (receiver)
          senderUserId: ctx.user.id,
          senderName: ctx.user.name,
          senderPhone: ctx.user.phone,
          contactId: contact.id,
          channel: input.channel,
          subject: input.subject,
          content: input.content,
          priorityScore,
          isPublished: true,
        },
        authCtx
      );
      sentMessage(phone, input.content);

      // 8️⃣ Return minimal response
      return {
        id: message.id,
        priorityScore,
      };
    },

    //     sendMessage: async (
    //   _: any,
    //   { input }: { input: any },
    //   ctx: ApolloCtx
    // ) => {
    //   // 1️⃣ Guard: Must be logged in
    //   if (!ctx.user?.id) {
    //     throw new Error("Unauthorized");
    //   }

    //   const authCtx = {
    //     id: "system",
    //     profile: "SUPER_ADMIN",
    //   };

    //   // This is the User ID, Email, or Phone of the person we are messaging
    //   const contactUserId = input.contactId.trim(); 
    //   const isMongoId = /^[0-9a-fA-F]{24}$/.test(contactUserId);

    //   // 2️⃣ Find the Recipient User
    //   const userList = await mercury.db.User.list(
    //     isMongoId
    //       ? { _id: contactUserId }
    //       : { $or: [{ email: contactUserId.toLowerCase() }, { phone: contactUserId }] },
    //     authCtx
    //   );

    //   let recipient = userList[0];

    //   // 3️⃣ Shadow User Creation: If recipient doesn't exist, create a placeholder
    //   if (!recipient) {
    //     const isEmail = contactUserId.includes("@");
    //     recipient = await mercury.db.User.create(
    //       {
    //         email: isEmail ? contactUserId.toLowerCase() : `pending_${Date.now()}@temp.com`,
    //         phone: !isEmail ? contactUserId : `pending_${Date.now()}`,
    //         name: "New Contact",
    //         password: "BYPASS_TEMP_PASSWORD", 
    //         isEmailVerified: false,
    //         isPhoneVerified: false,
    //       },
    //       authCtx
    //     );
    //   }

    //   // 4️⃣ Fetch or Create the Contact Relationship
    //   // We look for a contact record linking the sender and the recipient user ID
    //   const contacts = await mercury.db.Contact.list(
    //     { 
    //       ownerUserId: ctx.user.id, 
    //       contactUserId: recipient.id 
    //     },
    //     authCtx
    //   );

    //   let contact;
    //   if (contacts.length === 0) {
    //     contact = await mercury.db.Contact.create(
    //       {
    //         ownerUserId: ctx.user.id,
    //         contactUserId: recipient.id,
    //         ownerContactRelationship: "STRANGER",
    //         email: recipient.email,
    //         phone: recipient.phone,
    //         isActive: true,
    //       },
    //       authCtx
    //     );
    //   } else {
    //     contact = contacts[0];
    //   }

    //   // 5️⃣ Calculate Priority Score
    //   const priorityScore = calculatePriorityScore(
    //     contact.ownerContactRelationship,
    //     input.content
    //   );

    //   // 6️⃣ Create the Message
    //   const message = await mercury.db.Message.create(
    //     {
    //       ownerUserId: recipient.id,     // The recipient's User ID (Inbox owner)
    //       senderUserId: ctx.user.id,     // The sender's User ID
    //       senderName: ctx.user.name,
    //       senderPhone: ctx.user.phone,
    //       contactId: contact.id,         // Reference to the Contact model ID
    //       channel: input.channel,
    //       subject: input.subject,
    //       content: input.content,
    //       priorityScore: priorityScore,
    //       isPublished: true,
    //       sent_at: new Date(),
    //     },
    //     authCtx
    //   );

    //   return {
    //     id: message.id,
    //     priorityScore,
    //   };
    // },
    topPriorityNotifications: async (
      _: any,
      { limit }: { limit: number },
      ctx: ApolloCtx
    ) => {
      // 🔐 Must be logged in
      if (!ctx.user?.id) {
        throw new Error("Unauthorized");
      }

      const authCtx = {
        id: "system",
        profile: "SUPER_ADMIN",
      };
      console.log("Fetching top priority notifications for user:",);
      console.log("User ID:", ctx.user.id);
      // 1️⃣ Check message consent
      const user = await mercury.db.User.get(
        { _id: ctx.user.id },
        authCtx
      );
      console.log("User details:", user);
      //const user = users[0];
      if (!user || !user.isMsgConsent) {
        return [];
      }
      const id = user.id;
      console.log("User has given message consent.", id);
      // 2️⃣ Fetch candidate messages
      // Fetch more than limit so scoring makes sense
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      );


      const messages = await mercury.db.Message.list(
        {
          ownerUserId: id,
          sent_at: { $gte: sevenDaysAgo }, // ✅ only last 7 days
          isRead: false,
          isDeleted: false,
          isArchived: false,
          $or: [
            { notifiedCount: { $lt: 3 } },
            { notifiedCount: { $exists: false } }
          ],
        },
        authCtx,
        {
          limit: 20,
        }
      );

      console.log("Candidate messages:", messages);
      if (messages.length === 0) {
        return [];
      }

      // 3️⃣ Calculate FINAL SCORE for each message
      const scoredMessages = await Promise.all(
        messages.map(async (m: any) => {
          const finalScore = await calculateFinalScore({
            basePriorityScore: m.priorityScore, // stored base score
            sentAt: m.sent_at,
            ownerUserId: id,
            senderUserId: m.senderUserId,
            authCtx,
          });

          return {
            message: m,
            finalScore,
          };
        })
      );
      console.log("Scored messages:", scoredMessages)

      // 4️⃣ Sort by FINAL SCORE (descending)
      scoredMessages.sort(
        (a, b) => b.finalScore - a.finalScore
      );

      // 5️⃣ Pick top 1
      const top = scoredMessages[0];

      await mercury.db.Message.update(
        { _id: top.message.id },
        {
          notifiedCount: (top.message.notifiedCount || 0) + 1,
          lastNotifiedAt: new Date(),
        },
        authCtx
      );

      console.log("Top priority message selected:", top.finalScore, top.message.id);
      return [{
        messageId: top.message.id,
        senderName: top.message.senderName,
        content: top.message.subject || top.message.content,
        basePriorityScore: top.message.priorityScore,
        finalScore: top.finalScore,
        sentAt: top.message.sent_at.toISOString(),
      }];


    },
    //     topPriorityNotifications: async (_: any, __: any, ctx: any) => {
    //   if (!ctx.user?.id) {
    //     throw new Error("Unauthorized");
    //   }

    //   await runTopPriorityNotification(ctx.user.id);

    //   return []; // or return result later
    // },
  },
};