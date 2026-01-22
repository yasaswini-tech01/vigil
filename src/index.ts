// import express from "express";
// import http from "http";
// import cors from "cors";
// import bodyParser from "body-parser";
// import { makeExecutableSchema } from "@graphql-tools/schema";
// import { applyMiddleware } from "graphql-middleware";
// import mercury from "@mercury-js/core";
// import { ApolloServer } from "@apollo/server";
// import { expressMiddleware } from "@apollo/server/express4";
// import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
// import * as dotenv from "dotenv";
// // import { RedisCache } from "@mercury-js/plugins/redis";
// import "./models";
// import "./profiles";
// import "./hooks";
// import { initSocket } from "./socket/socket";

// import { google } from "googleapis";
// import open from "open";
// import { typeDefs, resolvers } from "./elastic-search";
// import { setContext } from "./helpers/setContext";

// // 2. Initialize the SDK

// // If you want to parse the JSON back into a TS object:

// dotenv.config();
// // mercury.plugins([
// //   new RedisCache({
// //     client: { url: process.env.REDIS_URL, socket: { tls: false } },
// //   }),
// //   new historyTracking.HistoryTracking({ skipModels: ["Action"] }),
// // ]);
// export const app = express();
// app.use(bodyParser.json({ limit: "200mb" }));
// app.use(bodyParser.urlencoded({ limit: "200mb", extended: true }));
// app.use(express.json({ limit: "200mb" }));
// app.use(express.urlencoded({ extended: true, limit: "200mb" }));
// const corsOptions = {
//   origin: "*",
//   credentials: true,
//   optionSuccessStatus: 200,
// };
// app.use(cors(corsOptions));
// const schema = applyMiddleware(
//   makeExecutableSchema({
//     typeDefs: [
//       mercury.typeDefs,
//       typeDefs,         
//     ],
//     resolvers: [
//       mercury.resolvers,
//       resolvers,    
//     ],
//   })
// );

// const DB_URL = process.env.DB_URL!;
// mercury.connect(DB_URL);
// (async function startApolloServer() {
//   try {
//     const httpServer = http.createServer(app);
//     initSocket(httpServer);
//     const server = new ApolloServer({
//       introspection: true,
//       schema,
//       plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
//       rootValue: () => ({
//         mercuryResolvers: mercury.resolvers,
//       }),
//     });
//     await server.start();
//     app.use(
//       "/graphql",
//       cors<cors.CorsRequest>(corsOptions),
//       expressMiddleware(server, {
//         context: async ({ req }) => await setContext(req),
//       })
//     );
//     const PORT = process.env.PORT || 4005;
//     await new Promise<void>((resolve) =>
//       httpServer.listen({ port: PORT }, resolve)
//     );
//     console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);

// // Start server
// app.listen(3000, () => {
//   console.log("Server running at http://localhost:3000");
//   console.log("Visit /auth/google to start login");
// });


































//   } catch (error) {
//     console.error("❌ Error starting server:", error);
//     process.exit(1);
//   }
// })();

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

import "./models";
import "./profiles";
import "./hooks";

import { initSocket } from "./socket/socket";
import { typeDefs, resolvers } from "./elastic-search";
import { setContext } from "./helpers/setContext";
//import { sendMessage } from "./utils/message";

dotenv.config();

/* -------------------- EXPRESS APP -------------------- */

const app = express();

app.use(bodyParser.json({ limit: "200mb" }));
app.use(bodyParser.urlencoded({ limit: "200mb", extended: true }));
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

const corsOptions = {
  origin: "*",
  credentials: true,
};
app.use(cors(corsOptions));

const schema = applyMiddleware(
  makeExecutableSchema({
    typeDefs: [mercury.typeDefs, typeDefs],
    resolvers: [mercury.resolvers, resolvers],
  })
);

/* -------------------- DB -------------------- */

const DB_URL = process.env.DB_URL!;
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
    // app.get("/test-message", (req, res) => {
    //   sendMessage("user_1", "user_123", "Hello from User 1 👋");
    //   res.send("Message sent");
    // });

    // 🔥 START ONLY THIS SERVER
    const PORT = process.env.PORT || 3000;

    await new Promise<void>((resolve) =>
      httpServer.listen(PORT, resolve)
    );

    //console.log(`🚀 Server running at http://localhost:${PORT}`);
     console.log(`🚀 GraphQL ready at http://localhost:${PORT}/graphql`);
    // console.log("🚀 Socket.IO ready on same port");

  } catch (error) {
    console.error("❌ Error starting server:", error);
    process.exit(1);
  }
})();
