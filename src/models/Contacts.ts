// models/Contact.ts
import mercury from "@mercury-js/core";
export const Contact = mercury.createModel("Contact", {
  ownerUserId: {
    type: "relationship",
    ref: "User",
  },
  contactUserId: {
    type: "relationship",
    ref: "User",
    required: false,
  },
  primaryEmail: {
    type: "string",
    required: true,
  },
  emails: {
    type: "string",
    many:true
  },
  displayName: {
    type: "string",
  },
  createdFrom: {
  type: "enum",
  enumType: "string",
  enum: ["MANUAL", "EMAIL", "IMPORT"],
  default: "EMAIL",
  },
  isBlocked: {
  type: "boolean",
  default: false,
  },
  relationship: {
    type: "enum",
    enumType: "string",
    enum: [
      "FAMILY",
      "CO_WORKER",
      "FRIEND",
      "BOSS",
      "BUSINESS",
      "BANKS",
      "ECOMMERCE",
      "STRANGER",
    ],
    default: "STRANGER",
  },
  firstInteractedAt: {
    type: "date",
  },
  lastInteractedAt: {
    type: "date",
  },
  senderStatsId: {
    type: "relationship",
    ref: "SenderStats",
    required: false,
  },
  basePriorityScore: {
    type: "number",
    default: 20,
  },
  isActive: {
    type: "boolean",
    default: true,
  },
}, {
  historyTracking: true,
  indexes: [
      {
        fields: {
          ownerUserId: 1,
          primaryEmail:1
        },
        options: {
          unique: true,
        },
      },
      {
        fields: {
          ownerUserId: 1,
          emails:1
        }
      },
    ]
});
// export const Contact = mercury.createModel("Contact", {
//   ownerUserId:{
//     type:"relationship",
//     ref:"User"
//   },
//   contactUserId:{
//     type:"relationship",
//     ref:"User",
//     required:false
//   },
//   contactEmail:{
//     type:"string"
//   },
//   contactPhone:{
//     type:"string"
//   },
//   ownerContactRelationship:{
//     type:"enum",
//     enumType:"string",
//     enum:[
//         "FAMILY",
//         "CO_WORKER",
//         "FRIEND",
//         "BOSS",
//         "STRANGER",
//         "BANKS",
//         "BUSINESS",
//         "ECOMMERCE",
//         "OTHERS"
//     ],
//     default:"STRANGER"
//   },
//   contactType:{
//     type:"enum",
//     enumType:"string",
//     enum:[
//       "EMAIL",
//       "SMS",
//       "MESSAGE"
//     ]
//   },
//   basePriorityScore:{
//     type:"number",
//     default:0
//   },
//   isPublished:{
//     type:"boolean",
//     default:false
//   },
//   isActive:{
//     type:"boolean",
//     default:true
//   },
// },
//   {
//     historyTracking:true
//   },
// );