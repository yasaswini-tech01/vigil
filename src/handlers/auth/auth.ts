import _ from "lodash";
import { Base, ctxUser } from "../../connect.js";
import jwt from "jsonwebtoken";

export default class Auth {
  base: Base;
  constructor(base: Base) {
    this.base = base;
  }

  createSession(userData: ctxUser) {
    return jwt.sign(userData, process.env.SECRET_TOKEN_KEY!, { expiresIn: '30d' });
  }

  isValidSession(session: string) {
    try {
      const user = this.getUserBySession(session);
      if (_.isEmpty(user)) throw new Error("User is not present!");
      return user;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
  getUserBySession(session: string): ctxUser {
    try {
      return jwt.verify(session, process.env.SECRET_TOKEN_KEY || "") as ctxUser;
    } catch (error: any) {
      throw new Error('Invalid Session!!');
    }
  }
}