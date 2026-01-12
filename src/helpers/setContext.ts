import { baseApis } from "./baseApi";
import { Base } from "../connect";
import { GraphQLError } from "graphql";

export const setContext = async (req: any) => {
  const base = new Base();
  const requestedApi: string = getRequestedApi(req.body.query);

  const headerProfile = req.headers["profile"] || "SUPER_ADMIN";

  if (headerProfile !== "SUPER_ADMIN") {
    throw new GraphQLError("Access Denied", {
      extensions: { http: { status: 403 } }
    });
  }

  // 🔑 Mercury NEEDS this at top level
  const context = {
    profile: headerProfile,
    user: { profile: headerProfile },
    base,
  };

  return context;
};

const getRequestedApi = (query: string) => {
  return query?.split("(")[0]?.trim().split(" ")[1]?.toLowerCase();
};
