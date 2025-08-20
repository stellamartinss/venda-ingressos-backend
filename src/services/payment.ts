// Mock payment gateway for MVP. Replace with Stripe/Pagar.me/Mercado Pago later.
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

export const processPayment = async (
  req: PaymentRequest
): Promise<PaymentResponse> => {
  await new Promise((r) => setTimeout(r, 200));
  return {
    id: `mock_${Date.now()}`,
    status: 'succeeded',
    provider: 'mock',
  };
};


