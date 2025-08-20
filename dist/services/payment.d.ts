export type PaymentRequest = {
    amountCents: number;
    currency: string;
    description: string;
    metadata?: Record<string, string>;
};
export type PaymentResponse = {
    id: string;
    status: 'succeeded' | 'failed';
    provider: 'mock';
};
export declare const processPayment: (req: PaymentRequest) => Promise<PaymentResponse>;
//# sourceMappingURL=payment.d.ts.map