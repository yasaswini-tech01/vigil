// models/User.ts
import mercury from "@mercury-js/core";
export const User = mercury.createModel("User", {
  email: {
    type: "string",
    unique:true
  },
  name: {
    type: "string",
  },
  phone:{
    type:"string",
    unique:true
  },
  createdAt:{
    type:"date",
    default: () => new Date()
  },
  lastLogin:{
    type:"date",
    default: () => new Date()
  },
},
{
    historyTracking:true
},);