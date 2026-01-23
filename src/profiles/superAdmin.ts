import mercury from "@mercury-js/core";
const rules=[
    {
        modelName:"User",
        access:{
            create:true,
            read:true,
            update:true,
            delete:true
        }
    },
    {
        modelName:"Contact",
        access:{
            create:true,
            read:true,
            update:true,
            delete:true
        }
    },
    {
        modelName:"Message",
        access:{
            create:true,
            read:true,
            update:true,
            delete:true
        }
    },
    {
        modelName:"UserOAuthTokens",
        access:{
            create:true,
            read:true,
            update:true,
            delete:true
        }
    },


]
export const superAdminProfile=mercury.access.createProfile("SUPER_ADMIN",rules);