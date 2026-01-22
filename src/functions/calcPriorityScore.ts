export const getRelationshipScore = (relationship: string): number => {
  switch (relationship) {
    case "FAMILY":
      return 100;
    case "BOSS":
      return 90;
    case "CO_WORKER":
      return 70;
    case "FRIEND":
      return 50;
    default:
      return 20; // STRANGER
  }
};
export const getContentUrgencyScore = (content: string): number => {
  const text = (content || "").toLowerCase();
 let score = 0;

  const rules = [
    { words: ["urgent", "asap", "immediately"], score: 40 },
    { words: ["important", "priority"], score: 25 },
    { words: ["today", "call me", "now"], score: 15 },
    { words: ["please"], score: 10 },
    { words: ["reminder"], score: 10 },
    { words: ["offer", "sale"], score: -10 },
    { words: ["advertisement", "promo"], score: -20 },
  ];

  for (const rule of rules) {
    if (rule.words.some(word => text.includes(word))) {
      score += rule.score;
    }
  }

  return score;
};
export const calculatePriorityScore = (
  relationship: string,
  content: string
): number => {
  const relationshipScore = getRelationshipScore(relationship);
  const contentScore = getContentUrgencyScore(content);

  return relationshipScore + contentScore;
};
