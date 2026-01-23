import express from "express";
import http from "http";
import cors from "cors";
import bodyParser from "body-parser";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { applyMiddleware } from "graphql-middleware";
import mercury from "@mercury-js/core";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import * as dotenv from "dotenv";
import { initSocket } from "./socket/socket";
import { google } from "googleapis";
import { typeDefs, resolvers } from "./elastic-search";
import { setContext } from "./helpers/setContext";
import { emailQueue, messageWorker } from "./utils/queue";
import "./models";
import "./profiles";
import "./hooks";
import "./utils";
const app = express();
app.use(bodyParser.json({ limit: "200mb" }));
app.use(bodyParser.urlencoded({ limit: "200mb", extended: true }));
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

// ✅ Ensure worker is listening when server starts
console.log("📢 Initializing message worker...");
if (messageWorker) {
  console.log("✅ Worker instance is ready");
}
dotenv.config();




// Schema Setup
mercury.addGraphqlSchema(typeDefs, resolvers);
const corsOptions = {
  origin: "*",
  credentials: true,
};
app.use(cors(corsOptions));

const schema = applyMiddleware(
  makeExecutableSchema({
    typeDefs,
    resolvers,
  })
);

const DB_URL = process.env.DB_URL || process.env.MONGO_URL; 
if (!DB_URL) {
  console.error("❌ DB_URL is missing in .env file");
  process.exit(1);
}
mercury.connect(DB_URL);

/* -------------------- SERVER BOOTSTRAP -------------------- */

(async function startServer() {
  try {
    // 🔥 CREATE ONE HTTP SERVER
    const httpServer = http.createServer(app);
   // console.log("🚀 HTTP Server created",httpServer);
    initSocket(httpServer);
    const apolloServer = new ApolloServer({
      introspection: true,
      schema,
      plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
      rootValue: () => ({
        mercuryResolvers: mercury.resolvers,
      }),
    });

    await apolloServer.start();

    app.use(
      "/graphql",
      cors<cors.CorsRequest>(corsOptions),
      expressMiddleware(apolloServer, {
        context: async ({ req }) => await setContext(req),
      })
    );
    app.get("/auth/google/callback", async (req, res) => {
  try {
    console.log("hiii");
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).send("Invalid OAuth callback");
    }

    const userId = state as string; // app user id
    console.log(userId,"userID");

    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URI
    );

    // 1️⃣ Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    if (!tokens?.access_token) {
      throw new Error("Google OAuth did not return access_token");
    }

    oauth2Client.setCredentials(tokens);

    // 2️⃣ 🔐 FETCH GOOGLE ACCOUNT EMAIL (CRITICAL)
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });

    const { data } = await oauth2.userinfo.get();
    const googleEmail = data.email;

    if (!googleEmail) {
      throw new Error("Unable to fetch Google account email");
    }

    // 3️⃣ Compare with YOUR app user
    const user = await mercury.db.User.mongoModel.findById(userId);
    if (!user) {
      return res.status(401).send("Invalid user");
    }

    if (user.email !== googleEmail) {
      return res.status(403).send(
        `Account mismatch. Logged in as ${user.email} but selected ${googleEmail}`
      );
    }

    // 4️⃣ Store / update tokens
    const existingToken =
      await mercury.db.UserOAuthTokens.mongoModel.findOne({
        ownerUserId: userId,
        provider: "google",
      });

    if (!existingToken) {
      if (!tokens.refresh_token) {
        throw new Error(
          "First-time Google login must return refresh_token"
        );
      }

      await mercury.db.UserOAuthTokens.create(
        {
          ownerUserId: userId,
          provider: "google",
          googleEmail, // ✅ STORE EMAIL
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          scope: tokens.scope,
          expiryDate: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : undefined,
        },
        { id: "system", profile: "SUPER_ADMIN" }
      );
    } else {
      const updatePayload: any = {
        accessToken: tokens.access_token,
        scope: tokens.scope,
        expiryDate: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : undefined,
        googleEmail, // ✅ keep in sync
      };

      if (tokens.refresh_token) {
        updatePayload.refreshToken = tokens.refresh_token;
      }

      await mercury.db.UserOAuthTokens.mongoModel.updateOne(
        { ownerUserId: userId, provider: "google" },
        { $set: updatePayload }
      );
    }

    // 5️⃣ Start ingestion ONLY after validation
    const emailjob = await emailQueue.add(
      "email-ingestion",
      { ownerUserId: userId },
      {
        jobId: `gmail-sync-${userId}`,
        removeOnComplete: false,
      }
    );
    console.log("emailjob---", emailjob.id);
    res.send("✅ Gmail connected successfully. Sync started.");
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.status(500).send("Google OAuth failed");
  }
    });
    const PORT = process.env.PORT || 4005;
    await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    console.log(`🔗 Auth ready at http://localhost:${PORT}/auth/google`);
  } catch (error) {
    console.error("❌ Error starting server:", error);
    process.exit(1);
  }
})();
