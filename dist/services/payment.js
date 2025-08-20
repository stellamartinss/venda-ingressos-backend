"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPayment = void 0;
const processPayment = async (req) => {
    await new Promise((r) => setTimeout(r, 200));
    return {
        id: `mock_${Date.now()}`,
        status: 'succeeded',
        provider: 'mock',
    };
};
exports.processPayment = processPayment;
//# sourceMappingURL=payment.js.map