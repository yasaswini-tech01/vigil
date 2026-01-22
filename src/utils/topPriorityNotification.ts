import mercury from "@mercury-js/core";
import { calculateFinalScore } from "../functions/finalScore";
import { notifyUser } from "../socket/socket";

export async function runTopPriorityNotification(userId: string) {
  const authCtx = {
    id: "system",
    profile: "SUPER_ADMIN",
  };

  const user = await mercury.db.User.get({ _id: userId }, authCtx);
  if (!user || !user.isMsgConsent) return;

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  );

  const messages = await mercury.db.Message.list(
    {
      ownerUserId: userId,
      sent_at: { $gte: sevenDaysAgo },
      isRead: false,
      isDeleted: false,
      isArchived: false,
    $or: [
            { notifiedCount: { $lt: 3 } },
            { notifiedCount: { $exists: false } }
          ],
    },
    authCtx,
    { limit: 20 }
  );

  if (messages.length === 0) return;

  const scored = await Promise.all(
    messages.map(async (m: any) => ({
      message: m,
      finalScore: await calculateFinalScore({
        basePriorityScore: m.priorityScore,
        sentAt: m.sent_at,
        ownerUserId: userId,
        senderUserId: m.senderUserId,
        authCtx,
      }),
    }))
  );

  scored.sort((a, b) => b.finalScore - a.finalScore);
  const top = scored[0];
    await mercury.db.Message.update(
        { _id: top.message._id },
        {
          notifiedCount: (top.message.notifiedCount || 0) + 1,
          lastNotifiedAt: new Date(),
        },
        authCtx
      );

  // 🧠 decision
  console.log("🔥 TOP PRIORITY MESSAGE:", {
    messageId: top.message._id,
    sender: top.message.senderName,
    finalScore: top.finalScore,
  });

  // 🚀 delivery
  notifyUser(userId, {
    type: "TOP_PRIORITY",
    messageId: top.message._id,
    sender: top.message.senderName,
    finalScore: top.finalScore,
  });
}
