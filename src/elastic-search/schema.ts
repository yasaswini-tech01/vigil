export const typeDefs = `
  type Query {
    hello(name: String): String
    emailsAndContactsDisplay(input: EmailAndContactInput!): [EmailAndContact]
    getGmailConsentUrl(input:token!):url
    getImportantNotifications(input:notificationInput):ImportantNotificationsResponse
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
  creatingEmailContact(input:ContactInput!):ContactInResponse!
  updatingEmailContact(input:UpdateContact!):UpdateContactResponse!
  creatingContact(input: CreateContactInput!): CreateContactResponse!
  updateMsgConsent(input: UpdateMsgConsentInput!): UpdateMsgConsentResponse!
  sendMessage(input: SendMessageInput!): SendMessageResponse!
  topPriorityNotifications(limit: Int = 3): [PriorityNotification!]!
  }
    type PriorityNotification {
  messageId: ID!
  senderName: String
  content: String!
  basePriorityScore: Int!
  finalScore: Int!
  sentAt: String!
}
  input SignUpInput {
  email: String!
  phone: String!
  name: String!
  password: String!
  }
  input UpdateContact{
  senderEmail:String!
  relationship:Relation!
  }
  enum Relation{
    FAMILY
    CO_WORKER
    FRIEND
    BOSS
    BUSINESS
    BANK
    ECOMMERCE
    OTHER
  }
  type UpdateContactResponse{
  message:Boolean
  }
  input ContactInput{
  senderEmail:String!
  }
  type ContactInResponse{
    message:String
  }
  input token{
    token:String!
  }
  type url{
    url:String!
  }
  type SignUpResponse {
    message: String!
  }
input VerifyOtpInput {
  userId: ID!
  otp: String!
}

type ImportantNotificationsResponse {
  count: Int!
  notifications: [Notification!]
}

type Notification{
  senderEmail:String
  senderName:String
  subject:String
  priorityScore:Int
}

input notificationInput{
 limit: Int
  minPriority: Int
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
  input CreateContactInput {
  contactUserId: ID!
  relationship: String
}

type CreateContactResponse {
  id: ID!
  email: String
  phone: String
  relationship: String
}
  input UpdateMsgConsentInput {
  consent: Boolean!
}

type UpdateMsgConsentResponse {
  message: String!
  isMsgConsent: Boolean!
}
  input SendMessageInput {
  contactId: ID!
  channel: String!
  subject: String
  messageType: String
  content: String!
}

type SendMessageResponse {
  id: ID!
  priorityScore: Int!
}
`;
