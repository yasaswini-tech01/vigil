import mercury from "@mercury-js/core";
// export const SenderStats = mercury.createModel(
//   "SenderStats",
//   {
//     ownerUserId: {
//       type: "relationship",
//       model:"User",
//       required: true,
//       index:true
//     },
//     messageId: {
//       type: "relationship",
//       model:"Message",
//     },
//     senderEmail: {
//       type: "string",
//       required: true,
//       lowercase: true,
//       index: true,
//     },
//     senderName: {
//       type: "string",
//       required: false,
//     },
//     subject:{
//         type:"string",
//      },
//     receivedAt: {
//       type: "date",
//       required:true,
//     },
//     emailContact:{
//       type:"number",
//       default:0
//     },
//     isRead:{
//         type:"boolean",
//         default:false
//     }
//   },
//   {
//     historyTracking: true,
//     timestamps: true,
//   }
// );
// models/SenderStats.ts
export const SenderStats = mercury.createModel(
  "SenderStats",
  {
    ownerUserId: {
      type: "relationship",
      ref: "User",
      required: true,
    },
    senderEmail: {
      type: "string",
      required: true,
    },
    senderName: {
      type: "string",
    },
    emailCount: {
      type: "number",
      default: 0,
    },
    firstReceivedAt: {
      type: "date",
    },
    lastReceivedAt: {
      type: "date",
    },
    unreadCount: {
      type: "number",
      default: 0,
    },
    lastSubject: {
      type: "string",
    },
    contactId: {
      type: "relationship",
      ref: "Contact",
      required: false,
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
          senderEmail: 1,
        },
        options: {
          unique: true,
        },
      },
      {
        fields: {
          ownerUserId: 1,
          lastReceivedAt: -1,
        },
      },
      {
        fields: {
          ownerUserId: 1,
          emailCount: -1,
        },
      },
    ],
  }
);
