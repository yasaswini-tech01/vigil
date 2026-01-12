// models/User.ts
import mercury from "@mercury-js/core";
export const User = mercury.createModel("User", {
  email: {
    type: "string",
    unique:true,
    required:true
  },
  name: {
    type: "string",
    required:true
  },
  phone:{
    type:"string",
    unique:true,
    required:true
  },
  ismsg:{
    type:"boolean",
    default:false
  },
  isemail:{
    type:"boolean",
    default:false
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