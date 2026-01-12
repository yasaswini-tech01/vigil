import mercury from "@mercury-js/core";
export const UserOAuthTokens = mercury.createModel("UserOAuthTokens", {
    ownerUserId: {
        type:"relationship",
        ref:"User"
    },
    provider:{
        type:"string"
    },
    scope:{
        type:"string"
    },
    tokenType:{
        type:"string"
    },
    accessToken:{
        type:"string",
        required:true
    },
    refreshToken:{
        type:"string"
    },
    expiryDate:{
        type:"date"
    },
},
{
    timeStamps:true,
    historyTracking:true,
    indexes: [
    {
        fields: { provider: 1, ownerUserId: 1 },
        options: { unique: true }
    }
]},);