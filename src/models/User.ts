// models/User.ts
import mercury from "@mercury-js/core";
export const User = mercury.createModel(
  "User",
  {
    email: {
      type: "string",
      unique: true,
      required: true,
      index: true,
    },

    phone: {
      type: "string",
      unique: true,
      required: true,
      index: true,
    },

    name: {
      type: "string",
      required: true,
    },

    password: {
      type: "string",
      required: true,
    },

    isEmailVerified: {
      type: "boolean",
      default: false,
    },

    isPhoneVerified: {
      type: "boolean",
      default: false,
    },

    isEmailConsent: {
      type: "boolean",
      default: false,
    },
    isMsgConsent: {
      type: "boolean",
      default: false,
    },

    isSmsConsent: {
      type: "boolean",
      default: false,
    },

    lastLoginAt: {
      type: "date",
      required: false,
    },
  },
  {
    historyTracking: true,
    timestamps: true,
  }
);
