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
  type Mutation {
  signUp(input: SignUpInput!): SignUpResponse!
  verifyOtp(input: VerifyOtpInput!): VerifyOtpResponse!
  verifyPhoneOtp(input: VerifyPhoneOtpInput!): VerifyOtpResponse!
  verifyEmailOtp(input: VerifyEmailOtpInput!): VerifyOtpResponse!
  signIn(input: SignInInput!): SignInResponse!
  }
  input SignUpInput {
  email: String!
  phone: String!
  name: String!
  password: String!
}

type SignUpResponse {
  message: String!
}
  input VerifyOtpInput {
  userId: ID!
  otp: String!
}

type VerifyOtpResponse {
  message: String!
}
  input SignInInput {
  identifier: String!  # email OR phone
  password: String!
}

type SignInResponse {
  message: String!
  userId: ID!
  token: String!
}

  input VerifyPhoneOtpInput {
  phone: String!
  otp: String!
}

input VerifyEmailOtpInput {
  email: String!
  otp: String!
}

type VerifyOtpResponse {
  message: String!
}
`;
