import mercury from "@mercury-js/core";
import { isUserOnline } from "../socket/socket";
import { runTopPriorityNotification } from "../utils/topPriorityNotification";

mercury.hook.after("CREATE_MESSAGE_RECORD", async function (this: any) {
  const record = this.record;
  const receiverUserId = record.ownerUserId.toString();

  console.log("📩 Message created for:", receiverUserId);

  if (!isUserOnline(receiverUserId)) {
    console.log("📴 User offline → skipping top priority");
    return;
  }

  // 🔥 THIS IS WHAT YOU WANTED
  await runTopPriorityNotification(receiverUserId);
});
