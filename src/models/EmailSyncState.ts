import mercury from "@mercury-js/core";
export const EmailSyncState = mercury.createModel("EmailSyncState", {
  ownerUserId: {
    type: "relationship",
    ref: "User",
    required: true,
  },
  lastHistoryId: {
    type: "string",
  },
  backfillCompleted: {
    type: "boolean",
    default: false,
  },
});
