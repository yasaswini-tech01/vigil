import { Base } from "../../connect";
export default class User {
    [x: string]: any;
    findOne(mobile: string) {
        throw new Error("Method not implemented.");
    }
    base: Base;
    constructor(base: Base) {
        this.base = base;
    }
    async getUserSchema() {
        return this.base.Mercury.db.User;
    }
}
