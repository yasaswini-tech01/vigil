// models/Message.ts
import mercury from "@mercury-js/core";
export const Message = mercury.createModel(
  "Message",
  {
    ownerUserId: {
      type: "relationship",
      ref: "User",
      required: true
    },

    senderUserId: {
      type: "relationship",
      ref: "User"
    },

    senderPhone: {
      type: "string"
    },
    notifiedCount: {
      type: "number",
      default: 0
    },
    senderName: {
      type: "string"
    },

    contactId: {
      type: "relationship",
      ref: "Contact"
    },

    channel: {
      type: "enum",
      enumType: "string",
      enum: ["SMS", "EMAIL", "MESSENGER"],
      required: true
    },
    subject: {
      type: "string"
    },
    content: {
      type: "string",
      required: true
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
        "OTHERS"
      ]
    },
    priorityScore: {
      type: "number",
      default: 0
    },

    isRead: {
      type: "boolean",
      default: false
    },

    isArchived: {
      type: "boolean",
      default: false
    },

    isDeleted: {
      type: "boolean",
      default: false
    },

    sent_at: {
      type: "date",
      default: () => new Date()
    },

    createdAt: {
      type: "date",
      default: () => new Date()
    },

    updatedAt: {
      type: "date",
      default: () => new Date()
    },

    isPublished: {
      type: "boolean",
      default: false
    },

    isActive: {
      type: "boolean",
      default: true
    }
  },
  {
    historyTracking: true,
    indexes: [
      {
        fields: {
          ownerUserId: 1,
          channel: 1,
          senderName: 1,
          sent_at: -1
        }
      },
      {
        fields: {
          ownerUserId: 1,
          contactId: 1,
          sent_at: -1
        }
      },
      {
        fields: {
          ownerUserId: 1,
          isRead: 1
        }
      },
      {
        fields: {
          ownerUserId: 1,
          priorityScore: -1,
          sent_at: -1
        }
      }
    ]
  }
);
