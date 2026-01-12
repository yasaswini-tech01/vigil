import 'dotenv/config'; // Moved to top
import express from "express";
import http from "http";
import cors from "cors";
import bodyParser from "body-parser";
import { makeExecutableSchema } from "graphql-tools";
import { applyMiddleware } from "graphql-middleware";
import mercury from "@mercury-js/core";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import "./models";
import "./profiles";
import "./hooks";
import { typeDefs, resolvers } from "./elastic-search";
import { setContext } from "./helpers/setContext";
export const app = express();

// Middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(bodyParser.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

// Schema Setup
const schema = applyMiddleware(
  makeExecutableSchema({
    typeDefs: [mercury.typeDefs, typeDefs],
    resolvers: [mercury.resolvers, resolvers],
  })
);

// Database Connection
const DB_URL = process.env.DB_URL || process.env.MONGO_URL; 
if (!DB_URL) {
  console.error("❌ DB_URL is missing in .env file");
  process.exit(1);
}
mercury.connect(DB_URL);

(async function startApolloServer() {
  try {
    const httpServer = http.createServer(app);
    const server = new ApolloServer({
      introspection: true,
      schema,
      plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    });

    await server.start();

    app.use(
      "/graphql",
      expressMiddleware(server, {
        context: async ({ req }) => await setContext(req),
      })
    );

    // Add your Auth routes here before starting the server
    app.get("/auth/google", (req, res) => {
      res.send("Redirecting to Google...");
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