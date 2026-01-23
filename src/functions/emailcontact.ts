import mercury from "@mercury-js/core";;
import mongoose from "mongoose";
import { google } from "googleapis";
import { emailQueue } from "../utils/queue";
export async function ensureContactForSender({
  ownerUserId,
  senderEmail,
  relationship
}: {
  ownerUserId: string;
  senderEmail: string;
  relationship:string
}) {
  const existingContact =
    await mercury.db.Contact.mongoModel.findOne({
      ownerUserId,
      $or: [
        { primaryEmail: senderEmail },
        { emails: senderEmail },
      ],
    });
  if (existingContact) {
    await mercury.db.Contact.mongoModel.updateOne(
      { _id: existingContact._id },
       {relationship:relationship}
    );
    return existingContact._id;
  }
  const contact = await mercury.db.Contact.create({
    ownerUserId,
    primaryEmail: senderEmail,
    emails: [senderEmail],
    displayName:senderEmail,
    createdFrom: "EMAIL",
    relationship:relationship
  },{id:"system",profile:"SUPER_ADMIN"});
 return contact.id;
}
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
    { words: ["today", "now"], score: 15 },
    { words: ["please"], score: 5 },
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