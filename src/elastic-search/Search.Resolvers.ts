import mercury from "@mercury-js/core";
import bcrypt from "bcryptjs";
import { redis } from "../utils/redis";
import { sendOtpEmail } from "../utils/sendEmail";
import { sendOtpSms } from "../utils/sendSms";
import { ApolloCtx } from "../connect";
import jwt from "jsonwebtoken";

export const resolvers = {
  Query: {
    hello: (_: any, { name }: { name: string }) =>
      `Hello ${name || "World"}`,
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
      }
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
      const token = jwt.sign(
        {
          userId: user.id,
          profile: user.role ?? "USER",
        },
        process.env.JWT_SECRET!,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        }
      );

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



  },
};
