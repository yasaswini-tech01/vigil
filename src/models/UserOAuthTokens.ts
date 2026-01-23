import mercury from "@mercury-js/core";

export const UserOAuthTokens = mercury.createModel(
  "UserOAuthTokens",
  {
    ownerUserId: {
      type: "relationship",
      ref: "User",
      required: true
    },

    provider: {
      type: "string",
      required: true,
      default: "google"
    },

    scope: {
      type: "string" 
    },

    tokenType: {
      type: "string"
    },
    accessToken: {
      type: "string"
    },
    refreshToken: {
      type: "string",
      required: true
    },

    expiryDate: {
      type: "date"
    },

    connectedAt: {
      type: "date",
      default: () => new Date()
    },
    revokedAt: {
      type: "date"
    }
  },
  {
    timeStamps: true,
    historyTracking: true,
    indexes: [
      {
        fields: { provider: 1, ownerUserId: 1 },
        options: { unique: true }
      }
    ]
  }
);
