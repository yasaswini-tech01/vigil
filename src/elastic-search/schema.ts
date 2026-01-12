export const typeDefs = `
  type Query {
    hello(name: String): String
    emailsAndContactsDisplay(input: EmailAndContactInput!): [EmailAndContact]
  }
  input EmailAndContactInput {
    ownerUserId:String!
    isMsg:Boolean
    isEmail:Boolean
  }
  type EmailAndContact{
     email:String
     messageCount:Int
  }
`;
