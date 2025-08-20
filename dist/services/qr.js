"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQrDataUrl = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
const generateQrDataUrl = async (payload) => {
    return qrcode_1.default.toDataURL(payload, { errorCorrectionLevel: 'M' });
};
exports.generateQrDataUrl = generateQrDataUrl;
//# sourceMappingURL=qr.js.map