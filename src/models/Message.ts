// models/Message.ts
import mercury from "@mercury-js/core";
export const Message = mercury.createModel(
  "Message",
  {
    ownerUserId: {
      type: "relationship",
      ref: "User",
      required: true,
    },
    senderUserId: {
      type: "relationship",
      ref: "User",
      required: false,
    },
    senderEmail: {
      type: "string",
    },
    senderName: {
      type: "string",
    },
    senderPhone: {
      type: "string",
    },
    contactId: {
      type: "relationship",
      ref: "Contact",
    },
    messageId: {
      type: "string",
    },
    threadId: {
      type: "string"
    },
    channel: {
      type: "enum",
      enumType: "string",
      enum: ["EMAIL", "SMS", "MESSENGER"]
    },
    subject: {
      type: "string",
    },
    messageType: {
      type: "enum",
      enumType: "string",
      enum: [
        "PERSONAL",
        "PROFESSIONAL",
        "PROMOTIONAL",
        "TRANSACTIONAL",
        "SYSTEM",
        "OTHER",
      ],
      default: "OTHER",
    },
    hasAttachments: {
      type: "boolean",
      default: false,
    },
    labels: {
      type: "string",
      many: true,
    },
    priorityScore: {
      type: "number",
      default: 0,
    },
    isRead: {
      type: "boolean",
      default: false,
    },
    isArchived: {
      type: "boolean",
      default: false,
    },
    isDeleted: {
      type: "boolean",
      default: false,
    },
    sent_at: {
      type: "date",
      required: true,
    },
    isPublished: {
      type: "boolean",
      default: false,
    },

    isActive: {
      type: "boolean",
      default: true,
    },
  },
  {
    historyTracking: true,

    indexes: [
      {
        fields: {
          ownerUserId: 1,
          channel: 1,
          messageId: 1,
        },
        options: {
          unique: true,
          sparse: true, 
        },
      },
      {
        fields: {
          ownerUserId: 1,
          channel: 1,
          sent_at: -1,
        },
      },
      {
        fields: {
          ownerUserId: 1,
          contactId: 1,
          sent_at: -1,
        },
      },
      {
        fields: {
          ownerUserId: 1,
          isRead: 1,
        },
      },
      {
        fields: {
          ownerUserId: 1,
          priorityScore: -1,
          sent_at: -1,
        },
      },
      {
        fields: {
          ownerUserId: 1,
          threadId: 1,
          sent_at: -1,
        },
      },
    ],
  }
);
