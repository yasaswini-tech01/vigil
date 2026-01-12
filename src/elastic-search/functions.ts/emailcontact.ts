import mercury from "@mercury-js/core";;
import mongoose from "mongoose";
import { google } from "googleapis";
export const getemailsandcount = async (oauthClient: any) => {
  const gmail = google.gmail({ version: "v1", auth: oauthClient });
  const senderMap = new Map<string, number>();
  let nextPageToken: string | undefined;
  do {
    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults: 100,
      pageToken: nextPageToken
    });
    nextPageToken = listRes.data.nextPageToken;
    const messages = listRes.data.messages || [];
    for (const msg of messages) {
      const msgRes = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "metadata",
        metadataHeaders: ["From"]
      });
      const headers = msgRes.data.payload?.headers || [];
      const from = headers.find(h => h.name === "From")?.value;
      if (!from) continue;
      senderMap.set(from, (senderMap.get(from) || 0) + 1);
    }
  } while (nextPageToken);
  return Array.from(senderMap.entries()).map(([email, count]) => ({
    email,
    messageCount: count
  }));
};



export const getcontactsinfo=async(ownerUserId:string)=>{


}