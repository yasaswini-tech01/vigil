import mercury from "@mercury-js/core";
/* ------------------ Recency Score ------------------ */
export const getRecencyScore = (sentAt: Date): number => {
  const hoursOld =
    (Date.now() - sentAt.getTime()) / (1000 * 60 * 60);

  return Math.max(0, 50 - hoursOld * 0.5);
};

/* ------------------ Behavior Score ------------------ */
export const getBehaviorScore = async (
  ownerUserId: string,
  senderUserId: string
): Promise<number> => {

  const MessageModel = mercury.db.Message.mongoModel;

  const total = await MessageModel.countDocuments({
    ownerUserId,
    senderUserId,
  });

  if (total === 0) return 0;

  const readCount = await MessageModel.countDocuments({
    ownerUserId,
    senderUserId,
    isRead: true,
  });

  const openRate = readCount / total;

  return Math.round(openRate * 30);
};

/* ------------------ Noise Penalty ------------------ */
export const getNoisePenalty = async (
  ownerUserId: string,
  senderUserId: string
): Promise<number> => {

  const MessageModel = mercury.db.Message.mongoModel;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentCount = await MessageModel.countDocuments({
    ownerUserId,
    senderUserId,
    sent_at: { $gte: oneHourAgo },
  });

  if (recentCount <= 5) return 0;
  return (recentCount - 5) * 10;
};

/* ------------------ Final Score ------------------ */
export const calculateFinalScore = async ({
  basePriorityScore,
  sentAt,
  ownerUserId,
  senderUserId,
}: {
  basePriorityScore: number;
  sentAt: Date;
  ownerUserId: string;
  senderUserId: string;
}): Promise<number> => {

  const behaviorScore = await getBehaviorScore(
    ownerUserId,
    senderUserId
  );

  const recencyScore = getRecencyScore(sentAt);

  const noisePenalty = await getNoisePenalty(
    ownerUserId,
    senderUserId
  );

  const finalScore =
    basePriorityScore +
    behaviorScore +
    recencyScore -
    noisePenalty;

  return Math.max(0, Math.round(finalScore));
};
