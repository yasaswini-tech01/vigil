import { Worker, Queue } from "bullmq";
import mercury from "@mercury-js/core";
import { google } from "googleapis";
import { redisConnection } from "../utils/redis";
import {calculatePriorityScore} from "../elastic-search/functions.ts"
/* ─────────────────────────────────────
   Helper: parse "Name <email@x.com>"
───────────────────────────────────── */
function parseFrom(fromHeader: string): {
  senderEmail: string;
  senderName: string;
} {
  const emailMatch =
    fromHeader.match(/<([^>]+)>/) ||
    fromHeader.match(/([^\s]+@[^\s]+)/);

  const senderEmail = emailMatch
    ? emailMatch[1].toLowerCase().trim()
    : fromHeader.toLowerCase().trim();

  const nameMatch = fromHeader.match(/^([^<]+)/);
  const senderName = nameMatch
    ? nameMatch[1].trim().replace(/"/g, "")
    : "";

  return { senderEmail, senderName };
}

/* ─────────────────────────────────────
   ONE-TIME FULL BACKFILL
───────────────────────────────────── */
// async function fullBackfill({
//   gmail,
//   ownerUserId,
// }: {
//   gmail: any;
//   ownerUserId: string;
// }) {
//   console.log("🔁 Starting one-time Gmail backfill");

//   let pageToken: string | undefined;

//   do {
//     const listRes = await gmail.users.messages.list({
//       userId: "me",
//       maxResults: 100,
//       pageToken,
//     });

//     const messages = listRes.data.messages || [];
//     pageToken = listRes.data.nextPageToken || undefined;

//     for (const m of messages) {
//       const msgRes = await gmail.users.messages.get({
//         userId: "me",
//         id: m.id!,
//         format: "metadata",
//         metadataHeaders: ["From", "Subject"],
//       });

//       const headers = msgRes.data.payload?.headers || [];
//       const fromHeader =
//         headers.find((h) => h.name === "From")?.value;
//       if (!fromHeader) continue;

//       const subject =
//         headers.find((h) => h.name === "Subject")?.value || "";

//       const sentAt = new Date(Number(msgRes.data.internalDate));
//       const isRead =
//         !msgRes.data.labelIds?.includes("UNREAD");

//       const { senderEmail, senderName } = parseFrom(fromHeader);

//       const existingMessage =
//         await mercury.db.Message.mongoModel.findOneAndUpdate(
//           {
//             ownerUserId,
//             channel: "EMAIL",
//             messageId: m.id,
//           },
//           {
//             $setOnInsert: {
//               ownerUserId,
//               channel: "EMAIL",
//               messageId: m.id,
//               threadId: msgRes.data.threadId,
//               senderEmail,
//               senderName,
//               subject,
//               sent_at: sentAt,
//               isRead,
//             },
//           },
//           { upsert: true, new: false }
//         );
//       console.log(existingMessage,"existing")
//       // update SenderStats ONLY when message is new
//       if (!existingMessage) {
        
//         await mercury.db.SenderStats.mongoModel.findOneAndUpdate(
//           { ownerUserId, senderEmail },
//           {
//             $set: {
//               senderName,
//               lastReceivedAt: sentAt,
//               lastSubject: subject,
//             },
//             $setOnInsert: {
//               firstReceivedAt: sentAt,
//             },
//             $inc: {
//               emailCount: 1,
//               unreadCount: isRead ? 0 : 1,
//             },
//           },
//           { upsert: true }
//         );
//       }
//       //     if (!existingMessage) {
//   // // 1️⃣ Resolve Contact (relationship source)
//   // const contact = await mercury.db.Contact.mongoModel.findOne({
//   //   ownerUserId,
//   //   primaryEmail: senderEmail,
//   // }).lean();

//   // const relationship = contact?.relationship ?? "STRANGER";

//   // // 2️⃣ Calculate priority score
//   // const priorityScore = calculatePriorityScore(
//   //   relationship,
//   //   subject // or snippet/body
//   // );

//   // // 3️⃣ Update the JUST-INSERTED message
//   // await mercury.db.Message.mongoModel.updateOne(
//   //   {
//   //     ownerUserId,
//   //     channel: "EMAIL",
//   //     messageId: m.id,
//   //   },
//   //   {
//   //     $set: {
//   //       contactId: contact?._id,
//   //       priorityScore,
//   //     },
//   //   }
//   // );

//   // // 4️⃣ Update SenderStats (count only once)
//   // await mercury.db.SenderStats.mongoModel.findOneAndUpdate(
//   //   { ownerUserId, senderEmail },
//   //   {
//   //     $set: {
//   //       senderName,
//   //       lastReceivedAt: sentAt,
//   //       lastSubject: subject,
//   //       contactId: contact?._id,
//   //     },
//   //     $setOnInsert: {
//   //       firstReceivedAt: sentAt,
//   //     },
//   //     $inc: {
//   //       emailCount: 1,
//   //       unreadCount: isRead ? 0 : 1,
//   //     },
//   //   },
//   //   { upsert: true }
//   // );
//       //     }
//     }
//   } while (pageToken);

//   console.log("✅ One-time backfill completed");
// }
async function fullBackfill({
  gmail,
  ownerUserId,
  months = 6,          // ⏱ default: last 6 months
  maxMessages = 5000,  // 🛑 hard safety cap
}: {
  gmail: any;
  ownerUserId: string;
  months?: number;
  maxMessages?: number;
}) {
  console.log("🔁 Starting one-time Gmail backfill (limited)");

  // 1️⃣ Compute cutoff date (YYYY-MM-DD)
  const afterDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d.toISOString().split("T")[0];
  })();

  console.log(`📅 Backfill cutoff: after:${afterDate}`);

  let pageToken: string | undefined;
  let processed = 0;

  do {
    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults: 100,
      pageToken,
      q: `after:${afterDate}`, // 🔥 KEY FIX
    });

    const messages = listRes.data.messages || [];
    pageToken = listRes.data.nextPageToken || undefined;

    for (const m of messages) {
      if (processed >= maxMessages) {
        console.log("🛑 Backfill stopped: maxMessages reached");
        return;
      }

      processed++;

      const msgRes = await gmail.users.messages.get({
        userId: "me",
        id: m.id!,
        format: "metadata",
        metadataHeaders: ["From", "Subject"],
      });

      const headers = msgRes.data.payload?.headers || [];
      const fromHeader = headers.find(h => h.name === "From")?.value;
      if (!fromHeader) continue;

      const subject =
        headers.find(h => h.name === "Subject")?.value || "";

      const sentAt = new Date(Number(msgRes.data.internalDate));
      const isRead = !msgRes.data.labelIds?.includes("UNREAD");

      const { senderEmail, senderName } = parseFrom(fromHeader);

      // 2️⃣ UPSERT message (insert happens here)
      const existingMessage =
        await mercury.db.Message.mongoModel.findOneAndUpdate(
          {
            ownerUserId,
            channel: "EMAIL",
            messageId: m.id,
          },
          {
            $setOnInsert: {
              ownerUserId,
              channel: "EMAIL",
              messageId: m.id,
              threadId: msgRes.data.threadId,
              senderEmail,
              senderName,
              subject,
              sent_at: sentAt,
              isRead,
            },
          },
          { upsert: true, new: false }
        );

      // 3️⃣ Update SenderStats ONLY if message was newly inserted
      if (!existingMessage) {
        await mercury.db.SenderStats.mongoModel.findOneAndUpdate(
          { ownerUserId, senderEmail },
          {
            $set: {
              senderName,
              lastReceivedAt: sentAt,
              lastSubject: subject,
            },
            $setOnInsert: {
              firstReceivedAt: sentAt,
            },
            $inc: {
              emailCount: 1,
              unreadCount: isRead ? 0 : 1,
            },
          },
          { upsert: true }
        );
      }
    }
  } while (pageToken);
  console.log(`✅ Backfill completed (${processed} messages, last ${months} months only)`);
}


/* ─────────────────────────────────────
   Queue
───────────────────────────────────── */
export const emailQueue = new Queue("email-ingestion", {
  connection: redisConnection,
});

/* ─────────────────────────────────────
   Worker
───────────────────────────────────── */
export const messageWorker = new Worker(
  "email-ingestion",
  async (job) => {
    const { ownerUserId } = job.data;

    /* 1️⃣ Load OAuth tokens */
    const tokenDoc =
      await mercury.db.UserOAuthTokens.mongoModel.findOne({
        ownerUserId,
        provider: "google",
      });

    if (!tokenDoc?.accessToken) {
      throw new Error("No Google OAuth tokens found");
    }

    /* 2️⃣ Gmail client */
    const auth = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URI
    );

    auth.setCredentials({
      access_token: tokenDoc.accessToken,
      refresh_token: tokenDoc.refreshToken,
    });

    const gmail = google.gmail({ version: "v1", auth });

    /* 3️⃣ Load or create EmailSyncState */
    let syncState =
      await mercury.db.EmailSyncState.mongoModel.findOne({
        ownerUserId,
      });

    if (!syncState) {
      syncState =
        await mercury.db.EmailSyncState.mongoModel.create({
          ownerUserId,
          backfillCompleted: false,
        });
    }

    /* 4️⃣ ONE-TIME BACKFILL */
    if (!syncState.backfillCompleted) {
    const backfillMonths = 6;
    await fullBackfill({
      gmail,
      ownerUserId,
      months: backfillMonths,
      maxMessages: 5000,
    });
    const profile = await gmail.users.getProfile({ userId: "me" });

    await mercury.db.EmailSyncState.mongoModel.updateOne(
      { ownerUserId },
      {
        $set: {
          backfillCompleted: true,
          lastHistoryId: profile.data.historyId,
          backfillMonths,
          backfillCompletedAt: new Date(),
        },
      }
    );
    console.log("🟢 Backfill done → switching to incremental sync");
    return;
  }
    /* 5️⃣ Incremental sync using historyId */
    let historyRes;
    try {
      historyRes = await gmail.users.history.list({
        userId: "me",
        startHistoryId: syncState.lastHistoryId,
        historyTypes: ["messageAdded"],
      });
    } catch (err: any) {
      // history expired → re-initialize
      if (err.code === 404) {
        const profile = await gmail.users.getProfile({
          userId: "me",
        });

        await mercury.db.EmailSyncState.mongoModel.updateOne(
          { ownerUserId },
          {
            $set: { lastHistoryId: profile.data.historyId },
          }
        );
        return;
      }
      throw err;
    }
    const history = historyRes.data.history || [];
    let newestHistoryId = syncState.lastHistoryId;

    for (const h of history) {
      if (h.messagesAdded) {
        for (const { message } of h.messagesAdded) {
          const msgId = message.id;
          if (!msgId) continue;

      // 1️⃣ Fetch message metadata
      const msgRes = await gmail.users.messages.get({
        userId: "me",
        id: msgId,
        format: "metadata",
        metadataHeaders: ["From", "Subject"],
      });

      const headers = msgRes.data.payload?.headers || [];
      const fromHeader = headers.find(h => h.name === "From")?.value;
      if (!fromHeader) continue;

      const subject =
      headers.find(h => h.name === "Subject")?.value || "";

      const sentAt = new Date(Number(msgRes.data.internalDate));
      const isRead = !msgRes.data.labelIds?.includes("UNREAD");

      const { senderEmail, senderName } = parseFrom(fromHeader);

      // 2️⃣ UPSERT message (CREATE happens HERE if missing)
      const existingMessage =
        await mercury.db.Message.mongoModel.findOneAndUpdate(
          {
            ownerUserId,
            channel: "EMAIL",
            messageId: msgId,
          },
          {
            $setOnInsert: {
              ownerUserId,
              channel: "EMAIL",
              messageId: msgId,
              threadId: msgRes.data.threadId,
              senderEmail,
              senderName,
              subject,
              sent_at: sentAt,
              isRead,
            },
          },
          { upsert: true, new: false }
        );

      // 3️⃣ ONLY if message was JUST CREATED
      if (!existingMessage) {
        // 🔹 Resolve Contact (relationship source)
        const contact = await mercury.db.Contact.mongoModel.findOne({
          ownerUserId,
          primaryEmail: senderEmail,
        }).lean();

        const relationship = contact?.relationship ?? "STRANGER";
        // 🔹 Calculate priority
        const priorityScore = calculatePriorityScore(
          relationship,
          subject
        );

        // 🔹 Update the just-inserted message
        await mercury.db.Message.mongoModel.updateOne(
          {
            ownerUserId,
            channel: "EMAIL",
            messageId: msgId,
          },
          {
            $set: {
              contactId: contact?._id,
              priorityScore,
            },
          }
        );
        // 🔹 Update SenderStats (aggregate, once per message)
        await mercury.db.SenderStats.mongoModel.findOneAndUpdate(
          { ownerUserId, senderEmail },
          {
            $set: {
              senderName,
              lastReceivedAt: sentAt,
              lastSubject: subject,
              contactId: contact?._id,
            },
            $setOnInsert: {
              firstReceivedAt: sentAt,
            },
            $inc: {
              emailCount: 1,
              unreadCount: isRead ? 0 : 1,
            },
          },
          { upsert: true }
        );
      }
    }
  }

  if (h.id) newestHistoryId = h.id;
}
    /* 6️⃣ Persist new historyId */
await mercury.db.EmailSyncState.mongoModel.updateOne(
  { ownerUserId },
  {
    $set: { lastHistoryId: newestHistoryId },
  }
);
console.log(`✅ Incremental sync complete for user ${ownerUserId}`);
},
{
  connection: redisConnection,
  concurrency: 3,
});

/* ─────────────────────────────────────
   Worker lifecycle logs
───────────────────────────────────── */
messageWorker.on("ready", () => {
  console.log("✅ Email worker ready");
});

messageWorker.on("active", (job) => {
  console.log(`🔄 Sync started for ${job.data.ownerUserId}`);
});

messageWorker.on("completed", (job) => {
  console.log(`✅ Sync finished for ${job.data.ownerUserId}`);
});

messageWorker.on("failed", (job, err) => {
  console.error(
    `❌ Sync failed for ${job?.data?.ownerUserId}`,
    err.message
  );
});
