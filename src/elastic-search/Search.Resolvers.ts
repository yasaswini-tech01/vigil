import mercury from "@mercury-js/core";
export const resolvers = {
  Query: {
    hello: (_: any, { name }: { name: string }) =>
      `Hello ${name || "World"}`,
  },
};

