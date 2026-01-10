import mercury from "@mercury-js/core";
import Auth from "./handlers/auth/auth";
import User from "./handlers/user/user";
export interface ctxUser {
  id: string;
  name: string;
  blockedUsers: string[];
  state: string;
  district: string;
  constituency: string;
  role: string;
  profile: string;
}

export interface ApolloCtx {
  base: Base;
  connect: Connect;
  headers: any;
}
export class Base {
  public get Mercury(): typeof mercury {
    return mercury;
  }

  public get Auth(): Auth {
    return new Auth(this);
  }

  public get User(): User {
    return new User(this);
  }
}

export class Connect extends Base {
  user: ctxUser | null;
  session: string;
  constructor(session: string) {
    super();
    this.session = session;
    this.user = null;
  }

  validateSession(session: string) {
    try {
      let user = this.Auth.isValidSession(session);
      this.user = user;
    } catch (error: any) {
      this.user = null;
      throw new Error(error.message);
    }
  }
}
