"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const required = (value, name) => {
    if (!value)
        throw new Error(`Missing env var: ${name}`);
    return value;
};
exports.config = {
    port: Number(process.env.PORT || 4000),
    jwtSecret: required(process.env.JWT_SECRET, 'JWT_SECRET'),
    platformFee: Number(process.env.PLATFORM_FEE || 2.0),
    databaseUrl: required(process.env.NETLIFY_DATABASE_URL, 'NETLIFY_DATABASE_URL'),
};
//# sourceMappingURL=env.js.map